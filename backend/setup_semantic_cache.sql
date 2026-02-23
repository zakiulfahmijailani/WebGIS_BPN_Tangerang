-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the semantic_query_cache table
CREATE TABLE IF NOT EXISTS semantic_query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_prompt TEXT NOT NULL,
    embedding VECTOR(384) NOT NULL, -- Assuming 384 dimensions (e.g., all-MiniLM-L6-v2)
    sql_executed TEXT,
    geojson_result JSONB,
    text_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommended: Create an index for faster similarity searches via HNSW or IVFFlat
-- Using HNSW for better recall/performance trade-off
CREATE INDEX IF NOT EXISTS semantic_query_cache_embedding_idx ON semantic_query_cache USING hnsw (embedding vector_cosine_ops);

-- Create a Supabase Edge Function matching utility (or we can just query directly from Node)
-- This function allows direct similarity search returning the best match above a threshold
CREATE OR REPLACE FUNCTION match_semantic_query(
    query_embedding VECTOR(384),
    match_threshold FLOAT,
    match_count INT
)
RETURNS TABLE (
    id UUID,
    user_prompt TEXT,
    sql_executed TEXT,
    geojson_result JSONB,
    text_response TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        semantic_query_cache.id,
        semantic_query_cache.user_prompt,
        semantic_query_cache.sql_executed,
        semantic_query_cache.geojson_result,
        semantic_query_cache.text_response,
        1 - (semantic_query_cache.embedding <=> query_embedding) AS similarity
    FROM semantic_query_cache
    WHERE 1 - (semantic_query_cache.embedding <=> query_embedding) > match_threshold
    ORDER BY semantic_query_cache.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
