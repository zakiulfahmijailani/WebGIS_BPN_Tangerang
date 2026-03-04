"""
database.py — Async PostgreSQL connection pool for Supabase PostGIS
"""
import asyncpg
import os
import json
from typing import Any

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the connection pool."""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=os.environ["DATABASE_URL"],
            min_size=2,
            max_size=10,
        )
    return _pool


async def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def execute_query(sql: str) -> list[dict[str, Any]]:
    """
    Execute a read-only SQL query and return rows as list of dicts.
    Used for data queries (lists, counts, facts).
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql)
        return [dict(row) for row in rows]


async def execute_spatial_query(sql: str) -> dict:
    """
    Execute a spatial SQL query that returns a GeoJSON FeatureCollection.
    The SQL must return a single row with a 'geojson' or 'result' column.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql)
        if row is None:
            return {"type": "FeatureCollection", "features": []}

        # Try common column names
        for col in ["geojson", "result"]:
            if col in row:
                result = row[col]
                if isinstance(result, str):
                    return json.loads(result)
                return result

        return {"type": "FeatureCollection", "features": []}


async def get_table_columns(table_name: str) -> list[str]:
    """Get column names for a table (for agent introspection)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = $1 ORDER BY ordinal_position",
            table_name,
        )
        return [row["column_name"] for row in rows]
