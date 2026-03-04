"""
agent.py — PydanticAI Autonomous GIS Agent

This agent uses PydanticAI with tool-based architecture:
1. LLM receives user question + database schema
2. LLM decides to call `run_sql_query` tool with appropriate SQL
3. Agent executes the SQL, gets real results
4. LLM interprets the results and generates a natural answer
"""
from pydantic_ai import Agent, RunContext
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.models.openai import OpenAIModel
from models import GISResponse, MapStyle
from database import execute_query, execute_spatial_query
import json
import os

# ─── Database Schema (verified from information_schema) ───
SYSTEM_PROMPT = """You are Kue, an autonomous GIS AI agent for Kota Tangerang, Indonesia.
You answer questions by querying a PostGIS database using the tools provided.

## YOUR CAPABILITIES
1. You can execute SQL queries on the database using the `run_sql_query` tool
2. You can execute spatial queries that return GeoJSON using the `run_spatial_query` tool
3. You answer in Indonesian (Bahasa Indonesia)

## DATABASE SCHEMA

### kota_tangerang_kecamatan_boundary (Kecamatan/District boundaries)
- id (integer)
- name_3 (varchar) — **THIS IS THE KECAMATAN NAME** (e.g., "Batuceper", "Benda", "Cipondoh")
- name_2 (varchar) — city name ("Tangerang")
- name_1 (varchar) — province name ("Banten")
- geom (geometry, SRID 4326)

### kota_tangerang_kelurahan_boundary (Kelurahan/Village boundaries)
- id (integer)
- name_4 (varchar) — **THIS IS THE KELURAHAN NAME**
- name_3 (varchar) — parent kecamatan name
- geom (geometry, SRID 4326)

### kota_tangerang_city_boundary (City boundary)
- id (integer)
- name_2 (varchar) — city name
- geom (geometry, SRID 4326)

### tangerang_buildings (Building footprints from OSM, 175 columns)
Key columns:
- id (bigint)
- name (varchar) — building name
- building (varchar) — building type ("yes", "mosque", "school", etc.)
- amenity (varchar) — amenity type ("school", "hospital", "bank", etc.)
- landuse (varchar)
- height (varchar)
- "building:levels" (varchar)
- area (varchar)
- geom (geometry, SRID 4326)

## RULES
1. For DATA questions (lists, counts, names): Use `run_sql_query` with plain SELECT
2. For MAP/SPATIAL questions (show on map): Use `run_spatial_query` with GeoJSON-wrapped SQL
3. ALWAYS use the correct column names from the schema above
4. Column for kecamatan name is `name_3`, NOT `kecamatan_name`
5. Column for kelurahan name is `name_4`, NOT `kelurahan_name`
6. For spatial queries, wrap like: SELECT jsonb_build_object('type','FeatureCollection','features',COALESCE(jsonb_agg(ST_AsGeoJSON(t.*)::jsonb),'[]'::jsonb)) AS geojson FROM (...) t
7. Use ILIKE for text matching (case-insensitive)
8. If a question is outside Tangerang GIS scope, just answer conversationally
"""


def create_agent(model_name: str = "google/gemini-2.5-flash") -> Agent[None, GISResponse]:
    """Create a PydanticAI agent with the GIS system prompt and tools."""

    provider = OpenAIProvider(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.environ.get("OPENROUTER_API_KEY", ""),
    )

    model = OpenAIModel(
        model_name,
        provider=provider,
    )

    agent = Agent(
        model,
        result_type=GISResponse,
        system_prompt=SYSTEM_PROMPT,
    )

    @agent.tool
    async def run_sql_query(ctx: RunContext[None], sql: str) -> str:
        """
        Execute a READ-ONLY SQL query on the PostGIS database.
        Use this for data questions: lists, counts, aggregations.
        Returns the query results as JSON string.

        Args:
            sql: A valid PostgreSQL/PostGIS SELECT query.
                 IMPORTANT: Use correct column names from the schema.
                 Kecamatan name = name_3, Kelurahan name = name_4.
        """
        try:
            # Safety: only allow SELECT
            stripped = sql.strip().upper()
            if not stripped.startswith("SELECT"):
                return json.dumps({"error": "Only SELECT queries are allowed"})

            rows = await execute_query(sql)

            # Convert any non-serializable types
            clean_rows = []
            for row in rows:
                clean = {}
                for k, v in row.items():
                    if isinstance(v, (int, float, str, bool, type(None))):
                        clean[k] = v
                    else:
                        clean[k] = str(v)
                clean_rows.append(clean)

            return json.dumps(clean_rows, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"error": str(e)})

    @agent.tool
    async def run_spatial_query(ctx: RunContext[None], sql: str) -> str:
        """
        Execute a spatial SQL query that returns a GeoJSON FeatureCollection for map display.
        The SQL MUST be wrapped in the GeoJSON builder pattern:
        SELECT jsonb_build_object('type','FeatureCollection','features',
               COALESCE(jsonb_agg(ST_AsGeoJSON(t.*)::jsonb),'[]'::jsonb)) AS geojson
        FROM (...your query...) t

        Args:
            sql: A GeoJSON-wrapped PostGIS SELECT query.
        """
        try:
            stripped = sql.strip().upper()
            if not stripped.startswith("SELECT"):
                return json.dumps({"error": "Only SELECT queries are allowed"})

            result = await execute_spatial_query(sql)
            feature_count = len(result.get("features", []))
            return json.dumps({
                "success": True,
                "feature_count": feature_count,
                "geojson": result
            }, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"error": str(e)})

    return agent
