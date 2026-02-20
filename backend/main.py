"""
Tangerang Healthcare WebGIS — FastAPI Backend
Run locally: uvicorn main:app --reload --port 8000
"""
from typing import Optional

import psycopg2.extras
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from database import get_conn, row_to_feature

# ── FastAPI app ───────────────────────────────────────────

app = FastAPI(title="Tangerang Healthcare WebGIS API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://web-gis-bpn-tangerang.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "Tangerang Healthcare WebGIS API",
        "version": "3.0.0",
        "docs": "/docs",
    }


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
