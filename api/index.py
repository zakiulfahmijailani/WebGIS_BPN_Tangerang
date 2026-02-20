"""
TangerangLandUse-WebGIS — Vercel Serverless API
Single FastAPI entrypoint connecting to Supabase PostgreSQL.
Run locally: uvicorn api.index:app --reload --port 8000
"""
import json
import os
from typing import Optional

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

# ── Load env ──────────────────────────────────────────────
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")


# ── Database helpers ──────────────────────────────────────

def get_conn():
    """Return a new psycopg2 connection."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def row_to_feature(row: dict) -> dict:
    """Convert a RealDictRow to a GeoJSON Feature (Point)."""
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


# ── FastAPI app ───────────────────────────────────────────

app = FastAPI(title="Tangerang Healthcare WebGIS API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"name": "Tangerang Healthcare WebGIS API", "version": "3.0.0", "docs": "/docs"}


# ── GET /api/healthcare ──────────────────────────────────

@app.get("/api/healthcare")
def list_healthcare(amenity: Optional[str] = Query(None)):
    """Return healthcare points as a GeoJSON FeatureCollection."""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if amenity:
            cur.execute(
                """SELECT id, name, amenity, addr_street, phone,
                          ST_AsGeoJSON(geom)::json AS geom
                   FROM healthcare_tangerang
                   WHERE amenity = %s
                   ORDER BY id""",
                (amenity,),
            )
        else:
            cur.execute(
                """SELECT id, name, amenity, addr_street, phone,
                          ST_AsGeoJSON(geom)::json AS geom
                   FROM healthcare_tangerang
                   ORDER BY id"""
            )
        rows = cur.fetchall()
        return {
            "type": "FeatureCollection",
            "features": [row_to_feature(r) for r in rows],
        }
    finally:
        cur.close()
        conn.close()
