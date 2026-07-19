"""Feature engineering for AQI and hotspot models."""

from __future__ import annotations

import numpy as np
import pandas as pd


FEATURE_COLUMNS = [
    "aod",
    "hcho",
    "fire_count",
    "fire_intensity",
    "temperature",
    "humidity",
    "wind_speed",
    "urban_index",
    "elevation_proxy",
    "lat_sin",
    "lat_cos",
    "lon_sin",
    "lon_cos",
    "day_sin",
    "day_cos",
    "month_sin",
    "month_cos",
    "aod_lag1",
    "aod_lag7",
    "hcho_lag1",
    "fire_lag3",
    "wind_lag1",
    "stagnation_index",
    "ventilation_index",
    "pollution_load",
]


def build_feature_frame(observations: pd.DataFrame) -> pd.DataFrame:
    """Create model-ready features without using future information."""
    frame = observations.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.sort_values(["lat", "lon", "date"]).reset_index(drop=True)
    day = frame["date"].dt.dayofyear.astype(float)
    month = frame["date"].dt.month.astype(float)

    frame["lat_sin"] = np.sin(np.deg2rad(frame["lat"]))
    frame["lat_cos"] = np.cos(np.deg2rad(frame["lat"]))
    frame["lon_sin"] = np.sin(np.deg2rad(frame["lon"]))
    frame["lon_cos"] = np.cos(np.deg2rad(frame["lon"]))
    frame["day_sin"] = np.sin(2 * np.pi * day / 365.25)
    frame["day_cos"] = np.cos(2 * np.pi * day / 365.25)
    frame["month_sin"] = np.sin(2 * np.pi * month / 12.0)
    frame["month_cos"] = np.cos(2 * np.pi * month / 12.0)

    grouped = frame.groupby(["lat", "lon"], sort=False)
    frame["aod_lag1"] = grouped["aod"].shift(1)
    frame["aod_lag7"] = grouped["aod"].shift(7)
    frame["hcho_lag1"] = grouped["hcho"].shift(1)
    frame["fire_lag3"] = grouped["fire_intensity"].rolling(3, min_periods=1).mean().reset_index(level=[0, 1], drop=True)
    frame["wind_lag1"] = grouped["wind_speed"].shift(1)

    frame["stagnation_index"] = np.clip(4.0 - frame["wind_speed"], 0, None) * (frame["humidity"] / 100)
    frame["ventilation_index"] = frame["wind_speed"] * np.maximum(1.0, 45.0 - frame["humidity"])
    frame["pollution_load"] = frame["aod"] * 120 + frame["hcho"] * 0.045 + frame["fire_intensity"] * 6
    frame[FEATURE_COLUMNS] = frame[FEATURE_COLUMNS].fillna(frame[FEATURE_COLUMNS].median(numeric_only=True))
    return frame


def temporal_split(
    frame: pd.DataFrame, validation_days: int, test_days: int
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Split by date to prevent temporal leakage."""
    unique_dates = np.array(sorted(frame["date"].dt.date.unique()))
    test_start = unique_dates[-test_days]
    val_start = unique_dates[-(test_days + validation_days)]
    train = frame[frame["date"].dt.date < val_start]
    val = frame[(frame["date"].dt.date >= val_start) & (frame["date"].dt.date < test_start)]
    test = frame[frame["date"].dt.date >= test_start]
    return train.copy(), val.copy(), test.copy()

