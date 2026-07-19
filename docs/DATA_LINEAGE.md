# Data Lineage

Current mode: `offline_fallback`.

The deterministic generator models:

- Satellite aerosol optical depth (`aod`)
- TROPOMI-like formaldehyde column (`hcho`)
- FIRMS-like fire count and intensity
- ERA5-like temperature, humidity, and wind speed
- Spatial urban baselines and Indo-Gangetic Plain effects
- Seasonal winter, monsoon, and biomass burning effects

Leakage controls:

- Features are sorted by location and date.
- Lag columns use `shift` and rolling historical windows only.
- Train, validation, and test splits are date-based.
- `DataValidator.validate_temporal_split` fails if date windows overlap.

