"""VayuRaksha FastAPI service."""

from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

from src.api.schemas import HealthResponse, MetricSummary
from src.inference.artifacts import read_json_artifact

ARTIFACT_DIR = Path(os.getenv("VAYURAKSHA_ARTIFACT_DIR", "artifacts/latest"))
REQUESTS = Counter("vayuraksha_requests_total", "Total VayuRaksha API requests", ["endpoint"])
LATENCY = Histogram("vayuraksha_endpoint_latency_seconds", "Endpoint latency", ["endpoint"])

app = FastAPI(
    title="VayuRaksha API",
    description="AQI prediction, uncertainty, and emissions hotspot intelligence.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return service health and artifact readiness."""
    REQUESTS.labels("health").inc()
    model_card = read_json_artifact("model_card.json", ARTIFACT_DIR)
    return HealthResponse(
        artifact_ready=bool(model_card),
        model_version=str(model_card.get("version", "untrained")),
    )


@app.get("/metrics/summary", response_model=MetricSummary)
async def metrics_summary() -> MetricSummary:
    """Return judge-facing benchmark summary."""
    REQUESTS.labels("metrics_summary").inc()
    metrics = _artifact_or_404("metrics.json")
    return MetricSummary(
        test_r2=metrics["aqi_model"]["test"]["r2"],
        hotspot_f1=metrics["hotspot_detector"]["f1"],
        improvement_over_baseline_pct=metrics["improvement_over_baseline_pct"],
    )


@app.get("/aqi/grid")
async def aqi_grid() -> dict[str, Any]:
    """Return latest AQI grid as GeoJSON points."""
    REQUESTS.labels("aqi_grid").inc()
    with LATENCY.labels("aqi_grid").time():
        return _artifact_or_404("predictions.geojson")


@app.get("/hotspots/geojson")
async def hotspots_geojson(min_severity: str = "minor") -> dict[str, Any]:
    """Return latest HCHO/fire hotspots as GeoJSON."""
    REQUESTS.labels("hotspots").inc()
    payload = _artifact_or_404("hotspots.geojson")
    severity_rank = {"watch": 0, "minor": 1, "major": 2, "critical": 3}
    threshold = severity_rank.get(min_severity, 1)
    payload["features"] = [
        feature
        for feature in payload.get("features", [])
        if severity_rank.get(feature.get("properties", {}).get("severity", "watch"), 0) >= threshold
    ]
    return payload


@app.get("/regions/summary")
async def regional_summary() -> dict[str, Any]:
    """Return region-level AQI summary statistics."""
    REQUESTS.labels("regional_summary").inc()
    return _artifact_or_404("regional_summary.json")


@app.get("/model/card")
async def model_card() -> dict[str, Any]:
    """Return model card and lineage details."""
    REQUESTS.labels("model_card").inc()
    return _artifact_or_404("model_card.json")


@app.get("/prometheus")
async def prometheus() -> Response:
    """Prometheus scrape endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.websocket("/ws")
async def websocket_updates(websocket: WebSocket) -> None:
    """Push periodic latest metric updates to connected dashboards."""
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(15)
            payload = read_json_artifact("metrics.json", ARTIFACT_DIR)
            await websocket.send_json({"type": "metrics", "payload": payload})
    except WebSocketDisconnect:
        return


def _artifact_or_404(name: str) -> dict[str, Any]:
    payload = read_json_artifact(name, ARTIFACT_DIR)
    if not payload:
        raise HTTPException(
            status_code=404,
            detail=f"Artifact {name} not found. Run `python -m src.training.pipeline --output {ARTIFACT_DIR}`.",
        )
    return payload

