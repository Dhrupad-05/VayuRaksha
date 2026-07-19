"""Deterministic offline data generator for AQI modeling.

The generator is intentionally physics-inspired rather than random noise:
AQI is driven by aerosol optical depth, HCHO, fire activity, stagnant winds,
humidity, seasonal winter penalties, urban baselines, and regional effects.
This lets the full stack run without external credentials while preserving the
relationships expected from the real satellite/CPCB pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class SyntheticSpec:
    """Controls the deterministic demo dataset."""

    start: date = date(2023, 1, 1)
    days: int = 420
    lat_min: float = 8.0
    lat_max: float = 36.0
    lon_min: float = 69.0
    lon_max: float = 96.0
    resolution: float = 1.25
    seed: int = 42


def generate_synthetic_observations(spec: SyntheticSpec | None = None) -> pd.DataFrame:
    """Generate a gridded India-like AQI dataset with satellite and weather features."""
    spec = spec or SyntheticSpec()
    rng = np.random.default_rng(spec.seed)
    lats = np.arange(spec.lat_min, spec.lat_max + 0.001, spec.resolution)
    lons = np.arange(spec.lon_min, spec.lon_max + 0.001, spec.resolution)
    rows: list[dict[str, float | int | str]] = []

    city_centers = np.array(
        [
            [28.6, 77.2, 1.0],
            [19.1, 72.9, 0.75],
            [22.6, 88.4, 0.72],
            [13.0, 80.2, 0.55],
            [17.4, 78.5, 0.58],
            [23.0, 72.6, 0.62],
        ]
    )

    for day_index in range(spec.days):
        current = spec.start + timedelta(days=day_index)
        day_of_year = current.timetuple().tm_yday
        seasonal = np.cos(2 * np.pi * (day_of_year - 15) / 365.25)
        monsoon = max(0.0, np.sin(2 * np.pi * (day_of_year - 155) / 365.25))
        fire_season = max(0.0, np.sin(2 * np.pi * (day_of_year - 285) / 365.25))

        for lat in lats:
            for lon in lons:
                urban = _radial_urban_index(lat, lon, city_centers)
                igp = np.exp(-((lat - 28.0) ** 2) / 16.0) * np.exp(-((lon - 78.0) ** 2) / 110.0)
                coastal = 1.0 if lat < 16.0 or lon > 87.0 else 0.0
                elevation_proxy = max(0.0, (lat - 26.0) / 10.0) * 350.0
                fire_core = np.exp(-((lat - 30.0) ** 2) / 10.0) * np.exp(-((lon - 75.0) ** 2) / 22.0)
                industry = np.exp(-((lat - 23.2) ** 2) / 12.0) * np.exp(-((lon - 83.0) ** 2) / 45.0)

                wind_speed = np.clip(
                    4.8 - 1.8 * seasonal - 0.9 * igp + 1.4 * monsoon + rng.normal(0, 0.25),
                    0.4,
                    9.0,
                )
                humidity = np.clip(52 + 28 * monsoon + 9 * seasonal + rng.normal(0, 2.5), 15, 98)
                temperature = np.clip(28 - 8 * seasonal + 3 * (1 - monsoon) + rng.normal(0, 1.0), 5, 45)
                fire_count = rng.poisson(0.08 + 8.0 * fire_season * fire_core + 1.3 * industry)
                fire_intensity = fire_count * (0.8 + rng.random() * 0.8)
                hcho = (
                    210
                    + 310 * urban
                    + 260 * industry
                    + 180 * fire_intensity
                    + 55 * temperature / 30
                    + rng.normal(0, 18)
                )
                aod = np.clip(
                    0.12
                    + 0.42 * igp
                    + 0.33 * urban
                    + 0.07 * humidity / 70
                    + 0.08 * seasonal
                    + 0.11 * fire_intensity
                    - 0.04 * monsoon
                    + rng.normal(0, 0.025),
                    0.02,
                    2.6,
                )

                stagnant = max(0.0, 3.2 - wind_speed)
                aqi = (
                    31
                    + 142 * aod
                    + 0.052 * hcho
                    + 7.8 * fire_intensity
                    + 13.5 * stagnant
                    + 0.42 * humidity
                    + 32 * igp
                    + 24 * urban
                    + 11 * seasonal
                    - 18 * monsoon
                    - 0.013 * elevation_proxy
                    + rng.normal(0, 4.2)
                )
                aqi = float(np.clip(aqi, 5, 480))
                is_hotspot = int((hcho > 560 and fire_intensity > 1.6) or hcho > 760)

                rows.append(
                    {
                        "date": current.isoformat(),
                        "day_index": day_index,
                        "lat": round(float(lat), 4),
                        "lon": round(float(lon), 4),
                        "aod": float(aod),
                        "hcho": float(hcho),
                        "fire_count": int(fire_count),
                        "fire_intensity": float(fire_intensity),
                        "temperature": float(temperature),
                        "humidity": float(humidity),
                        "wind_speed": float(wind_speed),
                        "urban_index": float(urban),
                        "elevation_proxy": float(elevation_proxy),
                        "aqi": aqi,
                        "is_hotspot": is_hotspot,
                    }
                )

    frame = pd.DataFrame(rows)
    return frame.sort_values(["date", "lat", "lon"]).reset_index(drop=True)


def _radial_urban_index(lat: float, lon: float, centers: np.ndarray) -> float:
    total = 0.0
    for center_lat, center_lon, weight in centers:
        total += weight * np.exp(-(((lat - center_lat) ** 2) + ((lon - center_lon) ** 2)) / 5.0)
    return float(np.clip(total, 0.0, 1.0))

