# Troubleshooting

- `Artifact not found`: run `python -m src.training.pipeline --output artifacts/latest`.
- Dashboard says API unavailable: start `uvicorn src.api.main:app --reload --port 8000`.
- CDN assets blocked: the dashboard still loads HTML/CSS, but Leaflet/Plotly require network unless vendored.
- Slow training: reduce `SyntheticSpec.days` for local experiments or lower ensemble estimators.

