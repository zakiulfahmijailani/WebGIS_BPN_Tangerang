"""
models.py — Pydantic models for structured LLM output
"""
from pydantic import BaseModel, Field
from typing import Any, Literal


class MapStyle(BaseModel):
    """MapLibre GL style specification."""
    type: Literal["fill", "line", "circle", "symbol"] = "fill"
    paint: dict[str, Any] = Field(default_factory=dict)


class GISResponse(BaseModel):
    """Structured response from the GIS agent."""
    query_type: Literal["spatial", "data", "chat"] = Field(
        description="'spatial' = show on map, 'data' = text/list answer, 'chat' = general conversation"
    )
    sql: str | None = Field(
        default=None,
        description="PostGIS SQL query to execute, or None for chat"
    )
    style: MapStyle | None = Field(
        default=None,
        description="MapLibre style for spatial results"
    )
    answer: str = Field(
        description="Natural language answer in Indonesian"
    )


class ChatRequest(BaseModel):
    """Incoming chat request from frontend."""
    prompt: str
    model: str = "google/gemini-2.5-flash"
    session_id: str | None = None


class ChatResponse(BaseModel):
    """Final response sent to frontend."""
    text: str
    geojson: dict | None = None
    style: dict | None = None
    data_rows: list[dict] | None = None
    feature_count: int = 0
    indicator: Literal["green", "blue", "red"] = "red"
