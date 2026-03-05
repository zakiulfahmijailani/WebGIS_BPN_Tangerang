-- ====================================================
-- WebGIS Tangerang — Supabase Migration
-- Run this in Supabase SQL Editor
-- ====================================================

-- Enable pgvector for semantic caching
CREATE EXTENSION IF NOT EXISTS vector;

-- Semantic query cache table
CREATE TABLE IF NOT EXISTS semantic_query_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_prompt text NOT NULL,
  embedding vector(384),
  sql_executed text,
  geojson_result jsonb,
  text_response text,
  created_at timestamptz DEFAULT now()
);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS semantic_cache_embedding_idx 
ON semantic_query_cache USING hnsw (embedding vector_cosine_ops);

-- Semantic cache match function
CREATE OR REPLACE FUNCTION match_semantic_query(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  user_prompt text,
  sql_executed text,
  geojson_result jsonb,
  text_response text,
  similarity float
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

-- ====================================================
-- Real-time map update channel table (NEW)
-- This is the Supabase Realtime "WebSocket" bridge
-- ====================================================
CREATE TABLE IF NOT EXISTS ai_map_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  geojson_result jsonb,
  text_response text,
  query_type text,
  feature_count integer,
  created_at timestamptz DEFAULT now()
);

-- Enable Realtime on the map updates table
ALTER TABLE ai_map_updates REPLICA IDENTITY FULL;

-- NOTE: After running this migration, go to:
-- Supabase Dashboard → Database → Replication → 
-- Enable Realtime for the "ai_map_updates" table

-- ====================================================
-- User Uploaded Layers Table (NEW)
-- ====================================================
CREATE TABLE IF NOT EXISTS uploaded_layers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  layer_name text NOT NULL,
  feature_index integer,
  properties jsonb,
  geom jsonb, -- Storing as JSONB since it's uploaded GeoJSON
  created_at timestamptz DEFAULT now()
);

-- Index for performance when loading/deleting layers by name
CREATE INDEX IF NOT EXISTS uploaded_layers_name_idx ON uploaded_layers (layer_name);
