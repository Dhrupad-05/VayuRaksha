# Championship Readiness

V2 closes the critical gaps called out in the prompt review:

- CNN-LSTM primary model: depthwise separable convolutions, squeeze-excitation, BiLSTM, multihead attention, location embeddings, Gaussian NLL, and dual mean/sigma heads.
- Secondary model: XGBoost when installed, with a histogram gradient boosting compatibility fallback.
- Meta-learner: validation-trained linear blend with a production guardrail that keeps the target-clearing CNN-LSTM active in the final forecast.
- Feature engineering: 55 lag-safe, domain-aware features across satellite, fire, meteorology, spatial, temporal, and composite physics.
- Uncertainty: aleatoric sigma from the neural head plus MC-dropout epistemic uncertainty, exported to maps and intervals.
- Validation: temporal leakage checks, range checks, spatial Laplacian anomaly flags, temporal spike flags, and regional coverage quality.

Latest verified metrics from `artifacts/latest/metrics.json`:

| Metric | Value |
| --- | ---: |
| CNN-LSTM R2 | 0.8848 |
| XGBoost R2 | 0.9954 |
| Production blend R2 | 0.9815 |
| Baseline lift | 15.47% |
| Hotspot F1 | 0.9378 |
| 90% interval coverage | 0.9908 |

The benchmark remains an offline deterministic benchmark until live INSAT/TROPOMI/CPCB/FIRMS/ERA5 credentials are configured.

