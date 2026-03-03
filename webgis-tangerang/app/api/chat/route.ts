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

// ─── Dual-Output System Prompt (EXACTLY AS SPECIFIED) ───
const dualOutputSystemPrompt = `You are Kue, an AI assistant for a WebGIS of Kota Tangerang.
You respond to spatial and visual requests by generating a JSON object with
TWO fields: "sql" and "style".

OUTPUT FORMAT — always return this exact JSON structure:
{
"sql": "SELECT ... (PostGIS query or null if no data needed)",
"style": {
"type": "fill | line | circle | symbol",
"paint": { ... MapLibre GL paint properties ... }
},
"response": "2-sentence Indonesian explanation of what was done"
}

DATABASE SCHEMA:

tangerang_buildings

id (int), geom (geometry SRID 4326), type (text), area (numeric)

type values: 'Residential','Commercial','Public','Industrial','Empty'

kota_tangerang_kecamatan_boundary

id (int), geom (geometry SRID 4326), kecamatan_name (text)

kota_tangerang_city_boundary

id (int), geom (geometry SRID 4326)

kota_tangerang_kelurahan_boundary

id (int), geom (geometry SRID 4326), kelurahan_name (text)

SQL RULES:

Always wrap output: SELECT jsonb_build_object('type','FeatureCollection',
'features', COALESCE(jsonb_agg(ST_AsGeoJSON(t.*)::jsonb),'[]'::jsonb))
AS geojson FROM ( [YOUR QUERY HERE] LIMIT 1000 ) t;

Use ST_Intersects for spatial joins with boundary tables

Use NOT ILIKE for exclusion filters

Use ST_DWithin(geom::geography, ref::geography, meters) for distance

If only styling (no data needed), set "sql": null

MAPLIBRE STYLE RULES:

"outline only" = type:"line", fill-opacity: 0

"fill + outline" = type:"fill", fill-opacity: 0.5 + fill-outline-color

"thick" = line-width: 6-8

"not too thick" / "medium" = line-width: 3-4

"thin" = line-width: 1-2

Colors: use hex codes. black="#000000", white="#FFFFFF",
red="#ef4444", blue="#3b82f6", green="#22c55e",
purple="#a855f7", orange="#f97316", yellow="#eab308"

STYLE EXAMPLES:

"thick black outline" →
{"type":"line","paint":{"line-color":"#000000","line-width":7,"line-opacity":1}}

"not too thick purple outline" →
{"type":"line","paint":{"line-color":"#a855f7","line-width":3,"line-opacity":1}}

"show buildings filled red" →
{"type":"fill","paint":{"fill-color":"#ef4444","fill-opacity":0.6,
"fill-outline-color":"#b91c1c"}}

"commercial buildings filled blue with thick outline" →
{"type":"fill","paint":{"fill-color":"#3b82f6","fill-opacity":0.7,
"fill-outline-color":"#1d4ed8"}}

If user asks for something outside Kota Tangerang or unrelated to the database,
set sql: null, style: null, and respond in Indonesian explaining the limitation.`;

// ─── Helper: Wrap raw SQL into GeoJSON FeatureCollection ───
function wrapAsGeoJSON(rawSql: string): string {
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
        SELECT id, user_prompt, sql_executed, geojson_result, text_response, style_result,
               1 - (embedding <=> $1::vector) AS similarity
        FROM semantic_query_cache
        WHERE 1 - (embedding <=> $1::vector) > 0.95
        ORDER BY similarity DESC
        LIMIT 1;
      `, [embeddingStr]);

            if (cacheResult.rows.length > 0) {
                const cached = cacheResult.rows[0];
                console.log(`[Cache HIT] Similarity: ${cached.similarity.toFixed(4)}`);

                // Write to ai_map_updates to trigger Realtime
                await supabase.from('ai_map_updates').insert({
                    session_id: sessionId,
                    geojson_result: cached.geojson_result,
                    text_response: cached.text_response || 'Ini adalah hasil dari cache.',
                    feature_count: cached.geojson_result?.features?.length || 0,
                    query_type: 'cached',
                });

                return NextResponse.json({
                    text: cached.text_response || 'Ini adalah hasil dari cache.',
                    geojson: cached.geojson_result || null,
                    style: cached.style_result || null,
                    hasData: !!cached.geojson_result,
                    hasStyle: !!cached.style_result,
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
    // STEP 2: DUAL-OUTPUT LLM CALL
    // ═══════════════════════════════════════════
    let generatedSQL: string | null = null;
    let generatedStyle: any = null;
    let textResponse: string = 'Maaf, terjadi kesalahan.';
    let geojsonResult: any = null;
    let llmRaw = '';

    try {
        console.log('[LLM] Generating SQL and Style...');
        llmRaw = await callOpenRouter(selectedModel, dualOutputSystemPrompt, latestMessage);
        console.log('[LLM] Raw response:', llmRaw);

        let jsonStr = llmRaw.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(jsonStr);

        generatedSQL = parsed.sql;
        if (generatedSQL === 'null') generatedSQL = null;

        generatedStyle = parsed.style;
        if (generatedStyle === 'null') generatedStyle = null;

        textResponse = parsed.response || 'Permintaan telah diproses.';

    } catch (parseErr: unknown) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        console.error('[LLM] Failed to parse JSON:', msg);
        console.error('[LLM] Raw output was:', llmRaw);
        return NextResponse.json({
            text: "Maaf, format respons dari AI tidak dapat dipahami. Silakan coba lagi.",
            geojson: null,
            style: null,
            hasData: false,
            hasStyle: false,
            indicator: 'red'
        });
    }

    // ═══════════════════════════════════════════
    // STEP 3: EXECUTE SQL ON SUPABASE POSTGIS
    // ═══════════════════════════════════════════
    if (generatedSQL) {
        try {
            console.log('[DB] Executing LLM-generated SQL directly...');
            const dbRes = await pool.query(generatedSQL);
            geojsonResult = dbRes.rows[0]?.geojson || dbRes.rows[0]?.result || { type: 'FeatureCollection', features: [] };
            if (typeof geojsonResult === 'string') geojsonResult = JSON.parse(geojsonResult);
            console.log(`[DB] Returned ${geojsonResult.features?.length || 0} features`);
        } catch (sqlErr: unknown) {
            const msg = sqlErr instanceof Error ? sqlErr.message : String(sqlErr);
            console.error('[DB] Direct SQL failed:', msg);
            // Fallback: try wrapping with server-side helper
            try {
                console.log('[DB] Retrying with wrapAsGeoJSON fallback...');
                const dbRes = await pool.query(wrapAsGeoJSON(generatedSQL));
                geojsonResult = dbRes.rows[0]?.result || { type: 'FeatureCollection', features: [] };
                console.log(`[DB] Fallback returned ${geojsonResult.features?.length || 0} features`);
            } catch (fallbackErr: unknown) {
                const msg2 = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
                console.error('[DB] Fallback also failed:', msg2);
                geojsonResult = null;
            }
        }
    }

    const featureCount = geojsonResult?.features?.length || 0;

    // ═══════════════════════════════════════════
    // STEP 4: WRITE TO ai_map_updates (TRIGGERS REALTIME)
    // ═══════════════════════════════════════════
    try {
        await supabase.from('ai_map_updates').insert({
            session_id: sessionId,
            geojson_result: geojsonResult,
            text_response: textResponse,
            feature_count: featureCount,
            query_type: 'spatial_query',
        });
    } catch (rtErr: unknown) {
        const msg = rtErr instanceof Error ? rtErr.message : String(rtErr);
        console.error('[Realtime] Insert failed:', msg);
    }

    // ═══════════════════════════════════════════
    // STEP 5: SAVE TO SEMANTIC CACHE
    // ═══════════════════════════════════════════
    if (cachedEmbedding && (generatedSQL || generatedStyle)) {
        // Need to gracefully handle adding style_result to semantic_query_cache
        pool.query(`
      INSERT INTO semantic_query_cache (user_prompt, embedding, sql_executed, geojson_result, text_response)
      VALUES ($1, $2::vector, $3, $4, $5)
    `, [
            latestMessage,
            `[${cachedEmbedding.join(',')}]`,
            generatedSQL,
            JSON.stringify(geojsonResult),
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
        indicator: geojsonResult ? 'green' : (generatedStyle ? 'blue' : 'red'),
    });
}
