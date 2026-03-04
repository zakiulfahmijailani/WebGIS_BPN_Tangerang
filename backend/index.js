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

// ─── AI Insights Endpoint ───
app.post('/api/ai/insights', async (req, res) => {
  try {
    const summaryData = req.body.data;
    const prompt = `Act as a Lead Spatial Analyst. Based on this JSON summary of building data in Tangerang City, provide a 3-bullet point analysis of the most notable patterns, and suggest one actionable recommendation for urban planning.\n\nData: ${JSON.stringify(summaryData)}`;

    const systemPrompt = 'You are a senior urban planning analyst. Provide concise, data-driven insights. Use bullet points. Be specific with numbers.';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://webgis-tangerang.vercel.app',
        'X-Title': 'Tangerang WebGIS'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[AI Insights] Error:', response.status, errBody);
      return res.status(500).json({ text: 'AI service unavailable.' });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No insights generated.';
    res.json({ text });
  } catch (err) {
    console.error('[AI Insights] Error:', err.message);
    res.status(500).json({ text: 'Failed to generate insights.' });
  }
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
  const sqlSystemPrompt = `You are a PostGIS SQL Database Engine for Tangerang City.
YOU MUST RESPOND ONLY WITH A MINIFIED JSON OBJECT. NO EXPLANATIONS. NO MARKDOWN.

SCHEMA:
- tangerang_buildings (id, geom, type, area)
- kota_tangerang_kecamatan_boundary (id, geom, kecamatan_name)

ROUTING RULES:
1. QUERY TYPE "data":
   - Use if user asks for FACTS, LISTS, NAMES, or NUMBERS (e.g., "Apa saja kecamatan di Tangerang?", "Berapa jumlah bangunan?").
   - Action: Write RAW SQL to get the data (NO GeoJSON, NO ST_AsGeoJSON).
   - Example output: {"type": "data", "sql": "SELECT DISTINCT kecamatan_name FROM kota_tangerang_kecamatan_boundary ORDER BY kecamatan_name"}

2. QUERY TYPE "spatial":
   - Use if user asks to SEE features ON THE MAP (e.g., "Tampilkan seluruh bangunan", "Tampilkan kecamatan Benda").
   - Action: You MUST wrap the query in GeoJSON like this:
     SELECT jsonb_build_object('type', 'FeatureCollection', 'features', COALESCE(jsonb_agg(ST_AsGeoJSON(t.*)::jsonb), '[]'::jsonb)) AS result FROM ( YOUR SPATIAL QUERY ) t;
   - Example output: {"type": "spatial", "sql": "SELECT jsonb_build_object(...) AS result FROM (SELECT * FROM tangerang_buildings LIMIT 10) t"}

3. OUT OF BOUNDS:
   - Return {"error": "Hanya menjawab topik Tangerang."} if unrelated.`;

  let generatedSQL = null;
  let queryType = 'spatial';
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
      queryType = parsed.type || 'spatial';
      if (!generatedSQL || generatedSQL === 'null' || generatedSQL === null) {
        console.log('[Pass 1] No SQL needed');
        generatedSQL = null;
      } else {
        console.log(`[Pass 1] Generated SQL (${queryType}):`, generatedSQL);
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
  // STEP C: Execute SQL (LLM generates full GeoJSON-wrapped query)
  // ═══════════════════════════════════════════
  let dataResult = null;

  if (generatedSQL) {
    try {
      console.log(`[DB] Executing LLM-generated SQL directly (${queryType})...`);
      const dbRes = await pool.query(generatedSQL);

      if (queryType === 'spatial') {
        geojsonResult = dbRes.rows[0]?.geojson || dbRes.rows[0]?.result || { type: 'FeatureCollection', features: [] };
        if (typeof geojsonResult === 'string') geojsonResult = JSON.parse(geojsonResult);
        console.log(`[DB] Returned ${geojsonResult.features?.length || 0} spatial features`);
      } else {
        dataResult = dbRes.rows;
        console.log(`[DB] Returned ${dataResult.length} data rows`);
      }
    } catch (sqlErr) {
      console.error('[DB] Direct SQL failed:', sqlErr.message);
      if (queryType === 'spatial') {
        // Fallback: try wrapping with server-side helper if it forgot
        try {
          console.log('[DB] Retrying with wrapAsGeoJSON fallback...');
          const dbRes = await pool.query(wrapAsGeoJSON(generatedSQL));
          geojsonResult = dbRes.rows[0]?.result || { type: 'FeatureCollection', features: [] };
          console.log(`[DB] Fallback returned ${geojsonResult.features?.length || 0} features`);
        } catch (fallbackErr) {
          console.error('[DB] Fallback also failed:', fallbackErr.message);
          geojsonResult = null;
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // STEP D: Pass 2 — Conversational Summary
  // ═══════════════════════════════════════════
  let chatText = '';
  try {
    const featureCount = geojsonResult?.features?.length || 0;
    let contextForPass2;

    if (queryType === 'spatial' && geojsonResult && featureCount > 0) {
      contextForPass2 = `User asked: "${latestMessage}". Database query returned ${featureCount} building features on the map. Write a helpful 1-2 sentence response explaining what was found. Please write in Indonesian.`;
    } else if (queryType === 'data' && dataResult) {
      contextForPass2 = `User asked: "${latestMessage}". Database query returned this raw JSON data: ${JSON.stringify(dataResult)}. Answer the user's question clearly and accurately based ONLY on this data. Use bullet points or a numbered list. DO NOT mention JSON or SQL, just focus on the answer. Please write in Indonesian.`;
    } else if (generatedSQL && !geojsonResult && !dataResult) {
      contextForPass2 = `User asked: "${latestMessage}". The database SQL query failed to run. Write a helpful 1-2 sentence response apologizing in Indonesian.`;
    } else if (queryType === 'spatial' && featureCount === 0) {
      contextForPass2 = `User asked: "${latestMessage}". Database spatial query returned 0 results. Write a helpful 1-2 sentence response explaining no matching buildings were found. Please write in Indonesian.`;
    } else {
      contextForPass2 = `User asked: "${latestMessage}". This is a general question or conversational. Answer helpfully and warmly in 1-2 sentences in Indonesian.`;
    }

    console.log('[Pass 2] Generating conversational response...');
    chatText = await callOpenRouter(selectedModel, 'You are a helpful WebGIS assistant for Tangerang City. Write friendly, professional responses in Indonesian.', contextForPass2);
    console.log('[Pass 2] Response:', chatText);
  } catch (pass2Err) {
    console.error('[Pass 2] Failed:', pass2Err.message);
    chatText = 'Maaf, saya mengalami kesalahan saat mencoba memberikan balasan.';
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
