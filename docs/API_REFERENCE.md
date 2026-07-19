# API Reference

Run:

```powershell
python -m src.training.pipeline --output artifacts/latest
uvicorn src.api.main:app --reload --port 8000
```

Endpoints:

- `GET /health`: service status and artifact readiness.
- `GET /metrics/summary`: R2, hotspot F1, and baseline lift.
- `GET /aqi/grid`: latest AQI grid as GeoJSON point features.
- `GET /hotspots/geojson?min_severity=minor`: hotspot GeoJSON.
- `GET /regions/summary`: regional aggregate AQI statistics.
- `GET /model/card`: model card, features, metrics, and limitations.
- `GET /prometheus`: Prometheus metrics.
- `WS /ws`: periodic metric updates.

