import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/postgres';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embedding';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Helper: Call OpenRouter Chat Completions API (Legacy/Fallback) ───
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

// ─── TOOL DEFINITIONS ───
const TOOL_DEFINITIONS = [
    {
        type: "function",
        function: {
            name: "get_db_schema",
            description: "Get list of all tables and columns in the database. Call this when unsure about table names or column names.",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function",
        function: {
            name: "execute_sql",
            description: "Execute a SQL SELECT query to get tabular data (counts, lists, facts). Do NOT use for spatial/map display.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Valid PostgreSQL SELECT query. Must include LIMIT max 200." }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "execute_spatial_sql",
            description: "Execute a spatial SQL query to display data on the map. Returns GeoJSON FeatureCollection.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Raw SELECT query WITH geom column. Do NOT wrap in GeoJSON yourself - the system will do it. Example: SELECT id, name, geom FROM tangerang_buildings LIMIT 500"
                    },
                    style: {
                        type: "object",
                        description: "Mapbox GL style for rendering. Use fill for polygons, circle for points, line for lines.",
                        properties: {
                            type: { type: "string", enum: ["fill", "circle", "line"] },
                            paint: { type: "object" }
                        }
                    }
                },
                required: ["query", "style"]
            }
        }
    }
];

// ─── NEW SYSTEM PROMPT ───
const SYSTEM_PROMPT = `You are Kue, a WebGIS assistant for Kota Tangerang, Indonesia.
You have tools to query a PostGIS database. Always use tools to answer accurately.

STRICT RULES:
- Always respond in Indonesian
- NEVER mention SQL, database, query, or table names to the user
- NEVER make up data - always use tools to verify
- If unsure about table/column names, call get_db_schema first
- For questions about names, counts, or lists → use execute_sql
- For "tampilkan", "tunjukkan", "dimana", "peta" → use execute_spatial_sql
- Keep answers concise, use bullet points for lists

KNOWN SCHEMA (use get_db_schema if you need more detail):
- kota_tangerang_kecamatan_boundary: id, name_3 (nama kecamatan), geom
- kota_tangerang_kelurahan_boundary: id, kelurahan_name, geom
- kota_tangerang_city_boundary: id, geom
- tangerang_buildings: id, name, building, amenity, landuse, area, geom

DEFAULT STYLES:
- Boundaries/wilayah: fill, fill-color #f59e0b, fill-opacity 0.3, fill-outline-color #d97706
- Buildings/bangunan: fill, fill-color #3b82f6, fill-opacity 0.5, fill-outline-color #1d4ed8
- Lines/jalan: line, line-color #10b981, line-width 2`;

// ─── FALLBACK PROMPTS (Legacy) ───
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

const conversationalPrompt = `You are Kue, a friendly WebGIS assistant for Kota Tangerang. 
Respond in Indonesian. Be concise and clear.
When given raw database query results, present them as a numbered list or bullet points.
Never mention "database", "SQL", or "query" — just answer naturally.`;


// ─── NEW: Call OpenRouter with Tools ───
async function callOpenRouterWithTools(
    model: string,
    systemPrompt: string,
    userMessage: string
): Promise<{ text: string; geojson: any | null; style: any | null }> {
    let geojsonResult: any = null;
    let styleResult: any = null;

    const messages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    for (let iter = 0; iter < 5; iter++) {
        console.log(`[Tool Calling] Iteration ${iter + 1}/5`);
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
                messages,
                temperature: 0.1,
                max_tokens: 2048,
                tools: TOOL_DEFINITIONS,
                tool_choice: 'auto'
            }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`OpenRouter returned ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const message = choice?.message;

        if (!message) throw new Error("No message returned from OpenRouter.");

        messages.push(message); // append assistant response

        if (choice.finish_reason === "stop" || choice.finish_reason === "end_turn" || !message.tool_calls) {
            return {
                text: message.content || "",
                geojson: geojsonResult,
                style: styleResult
            };
        }

        // Handle tool calls
        if (message.tool_calls) {
            for (const tc of message.tool_calls) {
                console.log(`[Tool Calling] Executing tool: ${tc.function.name}`);
                let resultObj: any = {};
                let resultStr = "";

                try {
                    const args = JSON.parse(tc.function.arguments || "{}");

                    if (tc.function.name === "get_db_schema") {
                        const schemaQuery = `
                            SELECT table_name, column_name, data_type
                            FROM information_schema.columns
                            WHERE table_schema = 'public'
                            ORDER BY table_name, ordinal_position;
                        `;
                        const res = await pool.query(schemaQuery);
                        let schemaText = "";
                        let currentTable = "";
                        for (const row of res.rows) {
                            if (row.table_name !== currentTable) {
                                currentTable = row.table_name;
                                schemaText += `\nTable: ${currentTable}\n`;
                            }
                            schemaText += `  - ${row.column_name} (${row.data_type})\n`;
                        }
                        resultStr = schemaText.trim();
                    }
                    else if (tc.function.name === "execute_sql") {
                        let query = args.query as string;
                        if (!query.trim().toUpperCase().startsWith("SELECT")) {
                            resultStr = "SQL Error: Query must start with SELECT.";
                        } else {
                            if (!query.toUpperCase().includes("LIMIT")) {
                                query += " LIMIT 200";
                            }
                            const res = await pool.query(query);
                            resultStr = JSON.stringify(res.rows);
                        }
                    }
                    else if (tc.function.name === "execute_spatial_sql") {
                        const query = args.query as string;
                        if (!query.trim().toUpperCase().startsWith("SELECT")) {
                            resultStr = "SQL Error: Query must start with SELECT.";
                        } else {
                            const wrappedQuery = wrapAsGeoJSON(query);
                            const res = await pool.query(wrappedQuery);
                            const gj = res.rows[0]?.geojson || res.rows[0]?.result || { type: 'FeatureCollection', features: [] };
                            geojsonResult = typeof gj === 'string' ? JSON.parse(gj) : gj;
                            styleResult = args.style;
                            const count = geojsonResult.features?.length || 0;
                            resultStr = "GeoJSON berhasil diambil. Features: " + count;
                        }
                    }
                } catch (err: any) {
                    resultStr = "Error executing tool: " + err.message;
                }

                messages.push({
                    role: "tool",
                    tool_call_id: tc.id,
                    content: resultStr
                });
            }
        }
    }

    // Default return if loop completes without stopping
    return {
        text: messages[messages.length - 1]?.content || "Selesai (iterasi maksimum).",
        geojson: geojsonResult,
        style: styleResult
    };
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
        const isFallback = cachedEmbedding.every(v => v === 0);

        if (!isFallback) {
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
        } else {
            console.log('[Cache] Skipping lookup (zero-filled embedding fallback)');
        }
    } catch (embErr: unknown) {
        const msg = embErr instanceof Error ? embErr.message : String(embErr);
        console.log('[Embedding] Failed (using fallback):', msg);
    }

    // ═══════════════════════════════════════════
    // STEP 2-4: TOOL CALLING
    // ═══════════════════════════════════════════
    let textResponse = 'Maaf, terjadi kesalahan.';
    let geojsonResult: any = null;
    let generatedStyle: any = null;
    let generatedSQL: string | null = null;
    let dataRows: any[] | null = null;

    const MODELS_WITH_TOOL_SUPPORT = [
        'google/gemini-2.5-flash',
        'google/gemini-2.0-flash-001',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3.7-sonnet',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'openai/gpt-4.1',
        'openai/gpt-4.1-mini',
    ];

    try {
        if (MODELS_WITH_TOOL_SUPPORT.includes(selectedModel)) {
            console.log('[Tool Calling] Starting...');
            const result = await callOpenRouterWithTools(selectedModel, SYSTEM_PROMPT, latestMessage);
            textResponse = result.text;
            geojsonResult = result.geojson;
            generatedStyle = result.style;
            if (geojsonResult) generatedSQL = '[tool_calling_spatial]';
        } else {
            // Fallback ke sistem lama untuk model yang tidak support tools
            console.log('[Fallback] Model tidak support tools, gunakan 2-pass');
            let queryType: 'spatial' | 'data' | 'none' = 'none';
            let llmRaw = '';

            try {
                console.log('[Pass 1] Routing query...');
                llmRaw = await callOpenRouter(selectedModel, sqlRouterPrompt, latestMessage);
                console.log('[Pass 1] Raw response:', llmRaw);

                let jsonStr = llmRaw.trim();
                if (jsonStr.startsWith('\`\`\`')) {
                    jsonStr = jsonStr.replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
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
                textResponse = 'Maaf, saya tidak dapat memahami permintaan Anda. Bisa coba diulangi?';
            }

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

            if (queryType === 'data' && dataRows && dataRows.length > 0) {
                try {
                    console.log('[Pass 2] Generating text from data rows...');
                    const contextPrompt = `User asked: "${latestMessage}"\n\nDatabase returned this data:\n${JSON.stringify(dataRows)}\n\nAnswer the question clearly based ONLY on this data. Use a numbered list. Do not mention SQL, database, or JSON.`;
                    textResponse = await callOpenRouter(selectedModel, conversationalPrompt, contextPrompt);
                    console.log('[Pass 2] Response generated');
                } catch (pass2Err) {
                    const firstKey = Object.keys(dataRows[0])[0];
                    textResponse = `Berikut daftar yang ditemukan:\n${dataRows.map((r, i) => `${i + 1}. ${r[firstKey]}`).join('\n')}`;
                }
            } else if (queryType === 'spatial' && geojsonResult) {
                const count = geojsonResult.features?.length || 0;
                if (!textResponse || textResponse === 'Permintaan telah diproses.') {
                    textResponse = `Ditemukan ${count} fitur spasial yang ditampilkan di peta.`;
                }
            }
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Tool Calling] Error:', msg);
        textResponse = 'Maaf, terjadi kesalahan saat memproses permintaan.';
    }

    const queryType = geojsonResult ? 'spatial' : (textResponse ? 'data' : 'none');
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
