"""API response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check payload."""

    status: str = "healthy"
    artifact_ready: bool
    model_version: str


class MetricSummary(BaseModel):
    """Top-level model metrics."""

    test_r2: float = Field(..., ge=-1, le=1)
    hotspot_f1: float = Field(..., ge=0, le=1)
    improvement_over_baseline_pct: float

