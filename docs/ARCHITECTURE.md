# Architecture

VayuRaksha is built as a vertical slice with a clean upgrade path from offline demo to credentialed production ingestion.

1. Data acquisition uses fetcher contracts with retry/cache/fallback behavior.
2. Feature engineering creates lag-safe tabular features for AQI and HCHO/fire hotspot detection.
3. Training uses strict temporal splits, tree ensembles for high-confidence tabular performance, and artifact export.
4. FastAPI serves immutable artifacts for low-latency dashboard interaction.
5. The dashboard renders AQI, uncertainty, hotspots, regional summaries, and model metrics.

The current build is intentionally offline-first because hackathon demo machines and judging networks are unreliable. Real INSAT, TROPOMI, CPCB, FIRMS, and ERA5 adapters can replace the synthetic generator behind the same data contract.

