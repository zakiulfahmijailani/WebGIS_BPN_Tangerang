const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Ensure it loads from root

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS allowing all origins and JSON parsing
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Supabase Connection using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 1. GET endpoint for buildings
app.get('/api/buildings', async (req, res) => {
  try {
    const geojsonQuery = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(feature)
      ) 
      FROM (
        SELECT jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature 
        FROM (SELECT * FROM tangerang_buildings LIMIT 1000) inputs
      ) features;
    `;

    const result = await pool.query(geojsonQuery);
    res.json(result.rows[0].jsonb_build_object || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error('Error fetching buildings:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 1.5 GET endpoint for boundaries
app.get('/api/boundaries/:layer', async (req, res) => {
  const layer = req.params.layer;
  let tableName = '';

  if (layer === 'city') tableName = 'kota_tangerang_city_boundary';
  else if (layer === 'kecamatan') tableName = 'kota_tangerang_kecamatan_boundary';
  else if (layer === 'kelurahan') tableName = 'kota_tangerang_kelurahan_boundary';
  else return res.status(400).json({ error: 'Invalid boundary layer type' });

  try {
    const geojsonQuery = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(feature)
      ) 
      FROM (
        SELECT jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature 
        FROM (SELECT * FROM ${tableName}) inputs
      ) features;
    `;
    const result = await pool.query(geojsonQuery);
    res.json(result.rows[0].jsonb_build_object || { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error(`Error fetching boundary ${layer}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. GET endpoint for metrics (Mock Data for Step 1)
app.get('/api/metrics', (req, res) => {
  res.json({
    totalBuildings: 5000,
    totalArea: "1500 sq km"
  });
});

const { generateEmbedding } = require('./ai_utils');

// ─── Helper: Call OpenRouter Chat Completions API ───
async function callOpenRouter(model, systemPrompt, userPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://webgis-tangerang.vercel.app',
      'X-Title': 'Tangerang WebGIS'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error('[OpenRouter] HTTP Error:', response.status, errBody);
    throw new Error(`OpenRouter returned ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Helper: Wrap raw SQL into GeoJSON FeatureCollection query ───
function wrapAsGeoJSON(rawSql) {
  return `
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
    ) AS result
    FROM (
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom)::jsonb,
        'properties', to_jsonb(inputs) - 'geom'
      ) AS feature 
      FROM (${rawSql}) inputs
    ) features;
  `;
}

// 3. POST endpoint for chat — Explicit Two-Pass Architecture
app.post('/api/chat', async (req, res) => {
  const { messages, model } = req.body;
  if (!messages || messages.length === 0) return res.status(400).json({ error: 'No messages provided' });

  const selectedModel = model || 'openai/gpt-4o-mini';
  const latestMessage = messages[messages.length - 1]?.content;
  if (!latestMessage) return res.status(400).json({ error: 'Empty message' });

  console.log(`\n[Chat] Model: ${selectedModel}`);
  console.log(`[Chat] Prompt: "${latestMessage}"`);

  let cachedEmbedding = null;

  // ═══════════════════════════════════════════
  // STEP A: Semantic Cache Check
  // ═══════════════════════════════════════════
  try {
    cachedEmbedding = await generateEmbedding(latestMessage);
    const embeddingStr = `[${cachedEmbedding.join(',')}]`;

    try {
      const cacheResult = await pool.query(`
        SELECT id, user_prompt, sql_executed, geojson_result, text_response,
               1 - (embedding <=> $1::vector) AS similarity
        FROM semantic_query_cache
        WHERE 1 - (embedding <=> $1::vector) > 0.95
        ORDER BY similarity DESC
        LIMIT 1;
      `, [embeddingStr]);

      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0];
        console.log(`[Cache HIT] Similarity: ${cached.similarity.toFixed(4)}`);
        return res.json({
          text: cached.text_response || 'Ini adalah hasil dari cache.',
          geojson: cached.geojson_result || null,
          indicator: 'green'
        });
      }
    } catch (dbErr) {
      console.log('[Cache] Lookup failed:', dbErr.message);
    }
  } catch (embErr) {
    console.log('[Embedding] Failed (using fallback):', embErr.message);
  }

  // ═══════════════════════════════════════════
  // STEP B: Pass 1 — SQL Generation
  // ═══════════════════════════════════════════
  const sqlSystemPrompt = `You are a specialized PostGIS SQL generator for Tangerang City. You only output valid JSON: {"sql": "SELECT ... "}. Do not use markdown.

STRICT RULES:
1. You only have access to one table: tangerang_buildings.
2. Schema: id (integer), geom (geometry, polygon), type (text), area (numeric).
3. If the user asks for data outside Tangerang City, or asks for tables/data not in the schema (like weather, streets, etc.), DO NOT generate SQL. Instead, output: {"error": "Maaf, saya hanya memiliki akses ke data bangunan di Kota Tangerang."}
4. Always wrap the final geometry in ST_AsGeoJSON and use jsonb_build_object to return a valid GeoJSON FeatureCollection.`;

  let generatedSQL = null;
  let errorResponse = null;
  let geojsonResult = null;
  let pass1Raw = '';

  try {
    console.log('[Pass 1] Generating SQL...');
    pass1Raw = await callOpenRouter(selectedModel, sqlSystemPrompt, latestMessage);
    console.log('[Pass 1] Raw response:', pass1Raw);

    // Extract JSON from the response (handle models that wrap in backticks)
    let jsonStr = pass1Raw.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    if (parsed.error) {
      errorResponse = parsed.error;
      console.log('[Pass 1] LLM returned error:', errorResponse);
    } else {
      generatedSQL = parsed.sql;
      if (!generatedSQL || generatedSQL === 'null' || generatedSQL === null) {
        console.log('[Pass 1] No SQL needed');
        generatedSQL = null;
      } else {
        console.log('[Pass 1] Generated SQL:', generatedSQL);
      }
    }
  } catch (parseErr) {
    console.error('[Pass 1] Failed to parse SQL JSON:', parseErr.message);
    console.error('[Pass 1] Raw output was:', pass1Raw);
    // Fall through — will respond conversationally without GeoJSON
  }

  // If the LLM returned a custom "error" JSON, return immediately
  if (errorResponse) {
    return res.json({
      text: errorResponse,
      geojson: null,
      indicator: 'red'
    });
  }

  // ═══════════════════════════════════════════
  // STEP C: Execute SQL in Supabase/PostGIS
  // ═══════════════════════════════════════════
  if (generatedSQL) {
    try {
      const wrappedQuery = wrapAsGeoJSON(generatedSQL);
      console.log('[DB] Executing wrapped query...');
      const dbRes = await pool.query(wrappedQuery);
      geojsonResult = dbRes.rows[0]?.result || { type: 'FeatureCollection', features: [] };
      console.log(`[DB] Returned ${geojsonResult.features?.length || 0} features`);
    } catch (sqlErr) {
      console.error('[DB] SQL execution error:', sqlErr.message);
      geojsonResult = null;
    }
  }

  // ═══════════════════════════════════════════
  // STEP D: Pass 2 — Conversational Summary
  // ═══════════════════════════════════════════
  let chatText = '';
  try {
    const featureCount = geojsonResult?.features?.length || 0;
    let contextForPass2;

    if (geojsonResult && featureCount > 0) {
      contextForPass2 = `User asked: "${latestMessage}". Database query returned ${featureCount} building features. Write a helpful 1-2 sentence response explaining what was found. Please write in Indonesian.`;
    } else if (generatedSQL && !geojsonResult) {
      contextForPass2 = `User asked: "${latestMessage}". The SQL query failed. Write a helpful 1-2 sentence response apologizing in Indonesian.`;
    } else if (generatedSQL && featureCount === 0) {
      contextForPass2 = `User asked: "${latestMessage}". Database query returned 0 results. Write a helpful 1-2 sentence response explaining no matching buildings were found. Please write in Indonesian.`;
    } else {
      contextForPass2 = `User asked: "${latestMessage}". This is a general question. Answer helpfully and warmly in 1-2 sentences in Indonesian.`;
    }

    console.log('[Pass 2] Generating conversational response...');
    chatText = await callOpenRouter(selectedModel, 'You are a helpful WebGIS assistant for Tangerang City. Write friendly, 1-2 sentence responses in Indonesian.', contextForPass2);
    console.log('[Pass 2] Response:', chatText);
  } catch (pass2Err) {
    console.error('[Pass 2] Failed:', pass2Err.message);
    chatText = geojsonResult
      ? `Ditemukan ${geojsonResult.features?.length || 0} bangunan yang cocok dengan kueri Anda.`
      : 'Maaf, saya mengalami kesalahan saat mencoba memberikan balasan.';
  }

  // ═══════════════════════════════════════════
  // STEP E: Cache Insert + JSON Response
  // ═══════════════════════════════════════════
  if (cachedEmbedding && generatedSQL && geojsonResult && geojsonResult.features?.length > 0) {
    pool.query(`
      INSERT INTO semantic_query_cache (user_prompt, embedding, sql_executed, geojson_result, text_response)
      VALUES ($1, $2::vector, $3, $4, $5)
    `, [
      latestMessage,
      `[${cachedEmbedding.join(',')}]`,
      generatedSQL,
      geojsonResult,
      chatText
    ]).then(() => console.log('[Cache] Saved new entry'))
      .catch(e => console.error('[Cache] Insert error:', e.message));
  }

  console.log('[Response] Sending JSON to frontend');
  return res.json({
    text: chatText,
    geojson: geojsonResult,
    indicator: 'red'
  });
});

app.get('/', (req, res) => {
  res.send('WebGIS Backend is running');
});

// Listen on port
app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
