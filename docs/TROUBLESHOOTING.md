# Troubleshooting

- `Artifact not found`: run `python -m src.training.pipeline --output artifacts/latest`.
- Dashboard says API unavailable: start `uvicorn src.api.main:app --reload --port 8000`.
- CDN assets blocked: the dashboard still loads HTML/CSS, but Leaflet/Plotly require network unless vendored.
- Slow training: reduce `SyntheticSpec.days` for local experiments or lower ensemble estimators.
- `ValueError: need at least one array to concatenate`: this was caused by the latest prediction window containing exactly `sequence_length` days while the sequence dataset skipped `len(group) == sequence_length`. The dataset now accepts exact-length windows and `predict_loader` raises a diagnostic if a loader is empty.

