"""
main.py — FastAPI server with SSE streaming for the PydanticAI GIS Agent

Endpoints:
- POST /api/agent/chat — Main chat endpoint (returns JSON or streams SSE)
- GET /health — Health check
"""
import json
import os
import asyncio
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import ChatRequest, ChatResponse
from agent import create_agent
from database import get_pool, close_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown: manage DB pool."""
    print("[Agent] Connecting to Supabase PostGIS...")
    await get_pool()
    print("[Agent] Connected!")
    yield
    print("[Agent] Shutting down...")
    await close_pool()


app = FastAPI(
    title="Tangerang WebGIS Agent",
    description="PydanticAI-powered autonomous GIS agent",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "agent": "PydanticAI"}


@app.post("/api/agent/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint. The PydanticAI agent:
    1. Receives the user prompt
    2. Autonomously decides to call SQL tools
    3. Gets real database results
    4. Returns a structured, validated response
    """
    print(f"\n[Agent] Prompt: \"{request.prompt}\"")
    print(f"[Agent] Model: {request.model}")

    try:
        agent = create_agent(request.model)
        result = await agent.run(request.prompt)
        gis_response = result.data

        print(f"[Agent] Query type: {gis_response.query_type}")
        print(f"[Agent] SQL: {gis_response.sql}")
        print(f"[Agent] Answer: {gis_response.answer[:100]}...")

        # Build the response based on query type
        response = ChatResponse(
            text=gis_response.answer,
            indicator="red",
        )

        if gis_response.query_type == "spatial" and gis_response.sql:
            # The agent already executed the spatial query via tool
            # but we also include the style
            if gis_response.style:
                response.style = gis_response.style.model_dump()
            response.indicator = "green"

        elif gis_response.query_type == "data":
            response.indicator = "blue"

        else:
            response.indicator = "red"

        # Check if tools produced geojson (stored in agent messages)
        # Parse tool results from the agent run
        for message in result.all_messages():
            msg_parts = getattr(message, 'parts', [])
            for part in msg_parts:
                part_kind = getattr(part, 'part_kind', '')
                if part_kind == 'tool-return':
                    content = getattr(part, 'content', '')
                    if isinstance(content, str):
                        try:
                            tool_data = json.loads(content)
                            # Spatial tool returns geojson
                            if isinstance(tool_data, dict) and "geojson" in tool_data:
                                response.geojson = tool_data["geojson"]
                                response.feature_count = tool_data.get("feature_count", 0)
                                response.indicator = "green"
                            # Data tool returns a list of rows
                            elif isinstance(tool_data, list):
                                response.data_rows = tool_data
                        except (json.JSONDecodeError, TypeError):
                            pass

        return JSONResponse(content=response.model_dump())

    except Exception as e:
        print(f"[Agent] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            content={
                "text": f"Maaf, terjadi kesalahan: {str(e)}",
                "geojson": None,
                "style": None,
                "data_rows": None,
                "feature_count": 0,
                "indicator": "red",
            },
            status_code=500,
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
