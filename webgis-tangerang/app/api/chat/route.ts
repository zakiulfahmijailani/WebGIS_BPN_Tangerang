import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embedding';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Helper: Call OpenRouter Chat Completions API ───
async function callOpenRouter(model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://webgis-tangerang.vercel.app',
            'X-Title': 'Tangerang WebGIS',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.1,
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        console.error('[OpenRouter] HTTP Error:', response.status, errBody);
        throw new Error(`OpenRouter returned ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

// ─── ACTUAL DATABASE SCHEMA (verified from information_schema) ───
//
// TABLE: kota_tangerang_kecamatan_boundary
//   id, gid_3, gid_0, country, gid_1, name_1, nl_name_1, gid_2, name_2,
//   nl_name_2, name_3 (= KECAMATAN NAME), varname_3, nl_name_3,
//   type_3, engtype_3, cc_3, hasc_3, geom
//
// TABLE: kota_tangerang_kelurahan_boundary
//   id, geom, kelurahan_name
//
// TABLE: kota_tangerang_city_boundary
//   id, geom
//
// TABLE: tangerang_buildings
//   id, geom, name, building, amenity, landuse, leisure, addr:street,
//   addr:housenumber, addr:city, building:levels, height, area, etc.

// ─── PASS 1 SYSTEM PROMPT: SQL Router ───
const sqlRouterPrompt = `You are a PostGIS SQL Database Router for Kota Tangerang.
YOU MUST RESPOND ONLY WITH VALID MINIFIED JSON. NO EXPLANATIONS. NO MARKDOWN.

EXACT DATABASE SCHEMA:
- kota_tangerang_kecamatan_boundary: id, name_3 (kecamatan name), geom
- kota_tangerang_kelurahan_boundary: id, kelurahan_name, geom
- kota_tangerang_city_boundary: id, geom
- tangerang_buildings: id, geom, name, building, amenity, landuse, "building:levels", height, area

ROUTING DECISION:
1. TYPE "data" — user asks for NAMES, LISTS, COUNTS, or FACTS (e.g. "apa saja kecamatan?", "berapa bangunan?"):
   - Return RAW ROWS. NO GeoJSON. NO ST_AsGeoJSON.
   - Output: {"type":"data","sql":"SELECT DISTINCT name_3 FROM kota_tangerang_kecamatan_boundary ORDER BY name_3","style":null,"response":"..."}

2. TYPE "spatial" — user wants to SEE things on the MAP (e.g. "tampilkan bangunan", "tunjukkan kecamatan Benda"):
   - MUST wrap in GeoJSON: SELECT jsonb_build_object('type','FeatureCollection','features',COALESCE(jsonb_agg(ST_AsGeoJSON(t.*)::jsonb),'[]'::jsonb)) AS geojson FROM ([YOUR QUERY] LIMIT 1000) t;
   - Output: {"type":"spatial","sql":"SELECT jsonb_build_object(...) AS geojson FROM (...) t","style":{"type":"fill","paint":{...}},"response":"..."}

3. TYPE "none" — general chat or out-of-scope:
   - Output: {"type":"none","sql":null,"style":null,"response":"Your Indonesian conversational answer here"}

STYLE RULES (for spatial only):
- "outline only" -> {"type":"line","paint":{"line-color":"#3b82f6","line-width":2}}
- "fill" -> {"type":"fill","paint":{"fill-color":"#3b82f6","fill-opacity":0.5,"fill-outline-color":"#1d4ed8"}}
- Default boundaries -> {"type":"fill","paint":{"fill-color":"#f59e0b","fill-opacity":0.3,"fill-outline-color":"#d97706"}}`;

// ─── PASS 2 SYSTEM PROMPT: Conversational Answerer ───
const conversationalPrompt = `You are Kue, a friendly WebGIS assistant for Kota Tangerang. 
Respond in Indonesian. Be concise and clear.
When given raw database query results, present them as a numbered list or bullet points.
Never mention "database", "SQL", or "query" — just answer naturally.`;

// ─── Helper: Wrap raw SQL into GeoJSON FeatureCollection ───
function wrapAsGeoJSON(rawSql: string): string {
    return `
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
    ) AS geojson
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

export async function POST(req: NextRequest) {
    const { prompt, sessionId, model } = await req.json();
    const selectedModel = model || 'google/gemini-2.5-flash';
    const latestMessage = prompt;

    if (!latestMessage) {
        return NextResponse.json({ error: 'Empty message' }, { status: 400 });
    }

    console.log(`\n[Chat] Model: ${selectedModel}`);
    console.log(`[Chat] Prompt: "${latestMessage}"`);

    let cachedEmbedding: number[] | null = null;

    // ═══════════════════════════════════════════
    // STEP 1: SEMANTIC CACHE CHECK
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

                return NextResponse.json({
                    text: cached.text_response || 'Ini adalah hasil dari cache.',
                    geojson: cached.geojson_result || null,
                    style: null,
                    hasData: !!cached.geojson_result,
                    featureCount: cached.geojson_result?.features?.length || 0,
                    indicator: 'green',
                });
            }
        } catch (dbErr: unknown) {
            const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
            console.log('[Cache] Lookup failed:', msg);
        }
    } catch (embErr: unknown) {
        const msg = embErr instanceof Error ? embErr.message : String(embErr);
        console.log('[Embedding] Failed (using fallback):', msg);
    }

    // ═══════════════════════════════════════════
    // STEP 2: PASS 1 — LLM SQL ROUTING
    // ═══════════════════════════════════════════
    let generatedSQL: string | null = null;
    let generatedStyle: any = null;
    let queryType: 'spatial' | 'data' | 'none' = 'none';
    let textResponse: string = 'Maaf, terjadi kesalahan.';
    let geojsonResult: any = null;
    let dataRows: any[] | null = null;
    let llmRaw = '';

    try {
        console.log('[Pass 1] Routing query...');
        llmRaw = await callOpenRouter(selectedModel, sqlRouterPrompt, latestMessage);
        console.log('[Pass 1] Raw response:', llmRaw);

        let jsonStr = llmRaw.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(jsonStr);
        queryType = parsed.type || 'none';
        generatedSQL = parsed.sql && parsed.sql !== 'null' ? parsed.sql : null;
        generatedStyle = parsed.style && parsed.style !== 'null' ? parsed.style : null;
        textResponse = parsed.response || 'Permintaan telah diproses.';

        console.log(`[Pass 1] Query type: ${queryType}, SQL: ${generatedSQL ? 'YES' : 'NO'}`);
    } catch (parseErr: unknown) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error('[Pass 1] Failed to parse JSON:', msg);
        console.error('[Pass 1] Raw output was:', llmRaw);
        // Fall through - will answer conversationally
        textResponse = 'Maaf, saya tidak dapat memahami permintaan Anda. Bisa coba diulangi?';
    }

    // ═══════════════════════════════════════════
    // STEP 3: EXECUTE SQL
    // ═══════════════════════════════════════════
    if (generatedSQL && queryType !== 'none') {
        try {
            console.log(`[DB] Executing SQL (type: ${queryType})...`);
            const dbRes = await pool.query(generatedSQL);

            if (queryType === 'spatial') {
                geojsonResult = dbRes.rows[0]?.geojson || dbRes.rows[0]?.result || { type: 'FeatureCollection', features: [] };
                if (typeof geojsonResult === 'string') geojsonResult = JSON.parse(geojsonResult);
                console.log(`[DB] Spatial: ${geojsonResult.features?.length || 0} features`);
            } else if (queryType === 'data') {
                dataRows = dbRes.rows;
                console.log(`[DB] Data: ${dataRows.length} rows`);
            }
        } catch (sqlErr: unknown) {
            const msg = sqlErr instanceof Error ? sqlErr.message : String(sqlErr);
            console.error('[DB] Direct SQL failed:', msg);

            if (queryType === 'spatial') {
                try {
                    console.log('[DB] Retrying with wrapAsGeoJSON fallback...');
                    const dbRes = await pool.query(wrapAsGeoJSON(generatedSQL));
                    geojsonResult = dbRes.rows[0]?.geojson || dbRes.rows[0]?.result || { type: 'FeatureCollection', features: [] };
                    console.log(`[DB] Fallback: ${geojsonResult.features?.length || 0} features`);
                } catch (fallbackErr: unknown) {
                    const msg2 = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
                    console.error('[DB] Fallback also failed:', msg2);
                    geojsonResult = null;
                    textResponse = 'Maaf, query database gagal dijalankan.';
                }
            } else {
                textResponse = 'Maaf, gagal mengambil data dari database.';
            }
        }
    }

    // ═══════════════════════════════════════════
    // STEP 4: PASS 2 — GENERATE TEXT FROM DATA ROWS
    // ═══════════════════════════════════════════
    if (queryType === 'data' && dataRows && dataRows.length > 0) {
        try {
            console.log('[Pass 2] Generating text from data rows...');
            const contextPrompt = `User asked: "${latestMessage}"\n\nDatabase returned this data:\n${JSON.stringify(dataRows)}\n\nAnswer the question clearly based ONLY on this data. Use a numbered list. Do not mention SQL, database, or JSON.`;
            textResponse = await callOpenRouter(selectedModel, conversationalPrompt, contextPrompt);
            console.log('[Pass 2] Response generated');
        } catch (pass2Err) {
            // Fallback: format the rows ourselves
            const firstKey = Object.keys(dataRows[0])[0];
            textResponse = `Berikut daftar yang ditemukan:\n${dataRows.map((r, i) => `${i + 1}. ${r[firstKey]}`).join('\n')}`;
        }
    } else if (queryType === 'spatial' && geojsonResult) {
        const count = geojsonResult.features?.length || 0;
        if (!textResponse || textResponse === 'Permintaan telah diproses.') {
            textResponse = `Ditemukan ${count} fitur spasial yang ditampilkan di peta.`;
        }
    }

    const featureCount = geojsonResult?.features?.length || 0;

    // ═══════════════════════════════════════════
    // STEP 5: WRITE TO ai_map_updates (TRIGGERS REALTIME)
    // ═══════════════════════════════════════════
    if (geojsonResult) {
        try {
            await supabase.from('ai_map_updates').insert({
                session_id: sessionId,
                geojson_result: geojsonResult,
                text_response: textResponse,
                feature_count: featureCount,
                query_type: queryType,
            });
        } catch (rtErr: unknown) {
            const msg = rtErr instanceof Error ? rtErr.message : String(rtErr);
            console.error('[Realtime] Insert failed:', msg);
        }
    }

    // ═══════════════════════════════════════════
    // STEP 6: SAVE TO SEMANTIC CACHE
    // ═══════════════════════════════════════════
    if (cachedEmbedding && generatedSQL) {
        pool.query(`
      INSERT INTO semantic_query_cache (user_prompt, embedding, sql_executed, geojson_result, text_response)
      VALUES ($1, $2::vector, $3, $4, $5)
    `, [
            latestMessage,
            `[${cachedEmbedding.join(',')}]`,
            generatedSQL,
            geojsonResult ? JSON.stringify(geojsonResult) : null,
            textResponse,
        ])
            .then(() => console.log('[Cache] Saved new entry'))
            .catch((e: Error) => console.error('[Cache] Insert error:', e.message));
    }

    console.log('[Response] Sending JSON to frontend');
    return NextResponse.json({
        text: textResponse,
        geojson: geojsonResult,
        style: generatedStyle,
        hasData: !!geojsonResult,
        hasStyle: !!generatedStyle,
        featureCount,
        indicator: geojsonResult ? 'green' : (dataRows ? 'blue' : 'red'),
    });
}
