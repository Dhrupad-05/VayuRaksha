"""End-to-end offline training pipeline."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from src.data_pipeline.features import FEATURE_COLUMNS, build_feature_frame, temporal_split
from src.data_pipeline.fetchers import fetch_offline_observations
from src.data_pipeline.validators import DataValidator
from src.models.aqi_ensemble import AQIEnsemble
from src.models.hotspot_detector import HotspotDetector
from src.models.metrics import classification_metrics, regression_metrics
from src.utils.config import load_json
from src.utils.logging_config import configure_logging

LOGGER = logging.getLogger(__name__)


async def run_pipeline(output: str | Path = "artifacts/latest") -> dict[str, object]:
    """Run data generation, validation, training, evaluation, and artifact export."""
    configure_logging()
    output_path = Path(output)
    output_path.mkdir(parents=True, exist_ok=True)
    model_config = load_json("config/model_config.json")

    observations, source_mode = await fetch_offline_observations()
    validator = DataValidator()
    validation_report = validator.validate_observations(observations)
    features = build_feature_frame(observations)
    train, validation, test = temporal_split(
        features,
        validation_days=int(model_config["validation_days"]),
        test_days=int(model_config["test_days"]),
    )
    validator.validate_temporal_split(train, validation, test)

    # Bounded sample keeps local hackathon laptops responsive while preserving geography/time diversity.
    train_model = train.sample(n=min(len(train), 85000), random_state=int(model_config["random_seed"]))
    model = AQIEnsemble(seed=int(model_config["random_seed"])).fit(
        train_model[FEATURE_COLUMNS], train_model["aqi"]
    )
    val_predictions = model.predict(validation[FEATURE_COLUMNS])
    test_predictions = model.predict(test[FEATURE_COLUMNS])
    val_metrics = regression_metrics(validation["aqi"].to_numpy(), val_predictions.mean)
    test_metrics = regression_metrics(test["aqi"].to_numpy(), test_predictions.mean)

    hotspot = HotspotDetector(**model_config["hotspot"]).fit(train)
    hotspot_pred = hotspot.predict(test)
    hotspot_metrics = classification_metrics(test["is_hotspot"].to_numpy(), hotspot_pred)

    model_path = output_path / "aqi_ensemble.joblib"
    model.save(str(model_path))

    latest_date = test["date"].max()
    latest = test[test["date"] == latest_date].copy()
    latest_bundle = model.predict(latest[FEATURE_COLUMNS])
    latest_hotspots = hotspot.annotate(latest)
    predictions_geojson = _predictions_geojson(latest, latest_bundle)
    hotspots_geojson = _hotspots_geojson(latest_hotspots)
    regional_summary = _regional_summary(latest, latest_bundle.mean)

    metrics = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_mode": source_mode,
        "data_validation": validation_report.__dict__,
        "rows": {"train": len(train), "validation": len(validation), "test": len(test)},
        "aqi_model": {"validation": val_metrics, "test": test_metrics},
        "hotspot_detector": hotspot_metrics,
        "targets": {"baseline_r2": 0.85, "target_r2": 0.88, "target_hotspot_f1": 0.82},
        "improvement_over_baseline_pct": (test_metrics["r2"] - 0.85) / 0.85 * 100,
    }

    model_card = {
        "model_name": "VayuRaksha AQI Ensemble",
        "version": "0.1.0-offline-demo",
        "features": FEATURE_COLUMNS,
        "artifact": str(model_path),
        "metrics": metrics,
        "leakage_control": "Strict date-based train/validation/test split; lag features use past values only.",
        "limitations": "Offline benchmark uses deterministic synthetic observations until external credentials are configured.",
    }

    _write_json(output_path / "metrics.json", metrics)
    _write_json(output_path / "model_card.json", model_card)
    _write_json(output_path / "predictions.geojson", predictions_geojson)
    _write_json(output_path / "hotspots.geojson", hotspots_geojson)
    _write_json(output_path / "regional_summary.json", regional_summary)
    _write_json(output_path / "latest_payload.json", {
        "metrics": metrics,
        "model_card": model_card,
        "predictions": predictions_geojson,
        "hotspots": hotspots_geojson,
        "regional_summary": regional_summary,
    })

    LOGGER.info("Test R2 %.4f | Hotspot F1 %.4f", test_metrics["r2"], hotspot_metrics["f1"])
    return metrics


def _predictions_geojson(frame, bundle) -> dict[str, object]:
    features = []
    for row, mean, sigma, lower, upper in zip(
        frame.itertuples(index=False), bundle.mean, bundle.sigma, bundle.lower, bundle.upper
    ):
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [row.lon, row.lat]},
                "properties": {
                    "date": row.date.date().isoformat(),
                    "aqi": round(float(mean), 1),
                    "actual_aqi": round(float(row.aqi), 1),
                    "uncertainty": round(float(sigma), 1),
                    "lower": round(float(lower), 1),
                    "upper": round(float(upper), 1),
                    "aod": round(float(row.aod), 3),
                    "hcho": round(float(row.hcho), 1),
                    "fire_intensity": round(float(row.fire_intensity), 2),
                    "category": _aqi_category(float(mean)),
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def _hotspots_geojson(frame) -> dict[str, object]:
    selected = frame[frame["hotspot_pred"] == 1].nlargest(120, "hotspot_score")
    features = []
    for row in selected.itertuples(index=False):
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [row.lon, row.lat]},
                "properties": {
                    "date": row.date.date().isoformat(),
                    "hcho": round(float(row.hcho), 1),
                    "fire_intensity": round(float(row.fire_intensity), 2),
                    "score": round(float(row.hotspot_score), 2),
                    "severity": row.severity,
                    "source_type": "biomass/industrial anomaly",
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def _regional_summary(frame, prediction: np.ndarray) -> dict[str, object]:
    regions = {
        "Indo-Gangetic Plain": (frame["lat"].between(25, 32)) & (frame["lon"].between(73, 88)),
        "Coastal South": frame["lat"] < 16,
        "Western Corridor": (frame["lon"] < 75) & (frame["lat"].between(18, 30)),
        "Eastern Belt": frame["lon"] > 84,
    }
    output = []
    for name, mask in regions.items():
        values = prediction[mask.to_numpy()]
        if len(values) == 0:
            continue
        output.append(
            {
                "region": name,
                "mean_aqi": round(float(np.mean(values)), 1),
                "p90_aqi": round(float(np.percentile(values, 90)), 1),
                "cells": int(len(values)),
                "dominant_category": _aqi_category(float(np.mean(values))),
            }
        )
    return {"regions": output}


def _aqi_category(value: float) -> str:
    if value <= 50:
        return "Good"
    if value <= 100:
        return "Satisfactory"
    if value <= 200:
        return "Moderate"
    if value <= 300:
        return "Poor"
    if value <= 400:
        return "Very Poor"
    return "Severe"


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Run VayuRaksha training pipeline")
    parser.add_argument("--output", default="artifacts/latest", help="Artifact output directory")
    args = parser.parse_args()
    asyncio.run(run_pipeline(args.output))


if __name__ == "__main__":
    main()

