# VayuRaksha

VayuRaksha is an ML-geospatial intelligence stack for AQI prediction and emission hotspot discovery across India. It is designed for hackathon judging and production evolution: deterministic offline demos, typed Python modules, an async FastAPI backend, a dense operational dashboard, and a reproducible training/evaluation pipeline.

## What Runs Today

- Offline-resilient synthetic data generator that mimics AOD, HCHO, fires, meteorology, spatial/seasonal effects, AQI, and hotspots.
- Leakage-aware feature pipeline with temporal train/validation/test splits.
- Ensemble AQI model with uncertainty intervals and benchmark output targeting R2 >= 0.88 on the deterministic demo dataset.
- Hotspot detector with precision/recall/F1 metrics.
- FastAPI service for grids, hotspots, regional summaries, model cards, health, metrics, and WebSocket updates.
- Static dashboard using Leaflet and Plotly from CDNs with local API fallback data.
- Docker, CI, docs, and tests.

## Quick Start

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m src.training.pipeline --output artifacts/latest
uvicorn src.api.main:app --reload --port 8000
```

Open [frontend/dashboard/index.html](frontend/dashboard/index.html) in a browser. If the API is running, it uses live endpoints; otherwise it falls back to embedded demo data.

## Benchmark Target

The offline benchmark is deterministic and intended to prove the full engineering path without requiring external credentials. Real satellite/CPCB integrations are represented by production-ready fetcher interfaces with cache/retry/fallback behavior. Run:

```powershell
python -m src.training.pipeline --output artifacts/latest
```

The run writes `artifacts/latest/metrics.json`, `predictions.geojson`, `hotspots.geojson`, and `model_card.json`.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA_LINEAGE.md](docs/DATA_LINEAGE.md), and [docs/API_REFERENCE.md](docs/API_REFERENCE.md).

