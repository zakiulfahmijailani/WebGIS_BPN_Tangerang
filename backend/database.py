"""
Tangerang Healthcare WebGIS — Database Module
Connects to Supabase PostgreSQL via DATABASE_URL.
"""
import os
import json

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Load .env for local development
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")


def get_conn():
    """Return a new psycopg2 connection to Supabase PostgreSQL."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def row_to_feature(row: dict) -> dict:
    """Convert a DB row to a GeoJSON Feature (Point)."""
    geom = row.get("geom") or row.get("geometry")
    if isinstance(geom, str):
        geom = json.loads(geom)

    return {
        "type": "Feature",
        "id": row["id"],
        "properties": {
            "id": row["id"],
            "name": row.get("name") or "",
            "amenity": row.get("amenity") or "",
            "addr_street": row.get("addr_street") or "",
            "phone": row.get("phone") or "",
        },
        "geometry": geom,
    }
