"""Feature engineering for AQI and hotspot models."""

from __future__ import annotations

import numpy as np
import pandas as pd


FEATURE_COLUMNS = [
    "aod_raw",
    "aod_norm",
    "hcho_raw",
    "hcho_norm",
    "fire_count",
    "fire_intensity",
    "fire_recency",
    "temperature",
    "humidity",
    "wind_speed",
    "wind_direction_sin",
    "wind_direction_cos",
    "boundary_layer_height",
    "atmospheric_stability",
    "urban_index",
    "elevation",
    "lulc_type",
    "igp_effect",
    "coastal_proximity",
    "fire_core_proximity",
    "distance_to_nearest_city",
    "lat_sin",
    "lat_cos",
    "lon_sin",
    "lon_cos",
    "day_sin",
    "day_cos",
    "month_sin",
    "month_cos",
    "hour_sin",
    "hour_cos",
    "is_winter",
    "is_monsoon",
    "is_burning_season",
    "aod_lag1",
    "aod_lag7",
    "aod_lag14",
    "hcho_lag1",
    "fire_lag3",
    "wind_lag1",
    "temp_lag3",
    "stagnation_index",
    "ventilation_index",
    "pollution_load",
    "fire_transport_index",
    "hcho_ozone_potential",
    "urban_heat_adjustment",
    "monsoon_dispersion",
    "winter_inversion_risk",
    "satellite_interaction",
    "fire_hcho_interaction",
    "humidity_aod_interaction",
    "coastal_ventilation",
    "sparse_region_flag",
    "coverage_quality",
]

CNN_SPATIAL_CHANNELS = [
    "aod_norm",
    "hcho_norm",
    "fire_intensity",
    "temperature",
    "humidity",
    "wind_speed",
    "boundary_layer_height",
    "urban_index",
    "igp_effect",
    "coastal_proximity",
    "stagnation_index",
    "pollution_load",
    "fire_transport_index",
]


def build_feature_frame(observations: pd.DataFrame) -> pd.DataFrame:
    """Create model-ready features without using future information."""
    frame = observations.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.sort_values(["lat", "lon", "date"]).reset_index(drop=True)
    day = frame["date"].dt.dayofyear.astype(float)
    month = frame["date"].dt.month.astype(float)
    hour = np.full(len(frame), 10.0)

    frame["aod_raw"] = frame["aod"].clip(0, 3)
    frame["hcho_raw"] = frame["hcho"].clip(lower=0)
    frame["aod_norm"] = (frame["aod_raw"] - frame["aod_raw"].mean()) / (frame["aod_raw"].std() or 1.0)
    frame["hcho_norm"] = (frame["hcho_raw"] - frame["hcho_raw"].mean()) / (frame["hcho_raw"].std() or 1.0)

    frame["lat_sin"] = np.sin(np.deg2rad(frame["lat"]))
    frame["lat_cos"] = np.cos(np.deg2rad(frame["lat"]))
    frame["lon_sin"] = np.sin(np.deg2rad(frame["lon"]))
    frame["lon_cos"] = np.cos(np.deg2rad(frame["lon"]))
    frame["day_sin"] = np.sin(2 * np.pi * day / 365.25)
    frame["day_cos"] = np.cos(2 * np.pi * day / 365.25)
    frame["month_sin"] = np.sin(2 * np.pi * month / 12.0)
    frame["month_cos"] = np.cos(2 * np.pi * month / 12.0)
    frame["hour_sin"] = np.sin(2 * np.pi * hour / 24.0)
    frame["hour_cos"] = np.cos(2 * np.pi * hour / 24.0)
    frame["is_winter"] = month.isin([11, 12, 1, 2]).astype(float)
    frame["is_monsoon"] = month.isin([6, 7, 8, 9]).astype(float)
    frame["is_burning_season"] = month.isin([10, 11]).astype(float)

    frame["igp_effect"] = np.exp(-(((frame["lat"] - 28.0) ** 2) + ((frame["lon"] - 77.0) ** 2)) / 50.0)
    frame["coastal_proximity"] = np.clip((18.0 - frame["lat"]) / 10.0, 0, 1) + np.clip((frame["lon"] - 84.0) / 12.0, 0, 1)
    frame["coastal_proximity"] = frame["coastal_proximity"].clip(0, 1)
    frame["fire_core_proximity"] = np.exp(-(((frame["lat"] - 30.0) ** 2) / 10.0 + ((frame["lon"] - 75.0) ** 2) / 22.0))
    frame["elevation"] = frame["elevation_proxy"]
    frame["lulc_type"] = np.select(
        [frame["urban_index"] > 0.45, frame["coastal_proximity"] > 0.65, frame["fire_core_proximity"] > 0.35],
        [3.0, 1.0, 2.0],
        default=0.0,
    )
    city_lat = np.array([28.6, 19.1, 22.6, 13.0, 17.4, 23.0])
    city_lon = np.array([77.2, 72.9, 88.4, 80.2, 78.5, 72.6])
    distances = np.sqrt((frame["lat"].to_numpy()[:, None] - city_lat) ** 2 + (frame["lon"].to_numpy()[:, None] - city_lon) ** 2)
    frame["distance_to_nearest_city"] = distances.min(axis=1)
    frame["wind_direction"] = (225 + 65 * frame["is_monsoon"] - 40 * frame["is_winter"] + frame["lon"] * 1.7) % 360
    frame["wind_direction_sin"] = np.sin(np.deg2rad(frame["wind_direction"]))
    frame["wind_direction_cos"] = np.cos(np.deg2rad(frame["wind_direction"]))
    frame["boundary_layer_height"] = np.clip(1100 + 32 * frame["temperature"] - 7 * frame["humidity"] + 180 * frame["is_monsoon"] - 240 * frame["is_winter"], 180, 2600)
    frame["atmospheric_stability"] = frame["boundary_layer_height"] / (frame["temperature"] + 273.15)

    grouped = frame.groupby(["lat", "lon"], sort=False)
    frame["aod_lag1"] = grouped["aod_raw"].shift(1)
    frame["aod_lag7"] = grouped["aod_raw"].shift(7)
    frame["aod_lag14"] = grouped["aod_raw"].shift(14)
    frame["hcho_lag1"] = grouped["hcho_raw"].shift(1)
    frame["fire_lag3"] = grouped["fire_intensity"].rolling(3, min_periods=1).mean().reset_index(level=[0, 1], drop=True)
    frame["wind_lag1"] = grouped["wind_speed"].shift(1)
    frame["temp_lag3"] = grouped["temperature"].shift(3)
    last_fire_seen = grouped["fire_count"].transform(lambda s: s.gt(0).replace(False, np.nan).ffill())
    frame["fire_recency"] = np.where(last_fire_seen.fillna(False), 1.0 / (1.0 + grouped.cumcount()), 0.0)

    frame["stagnation_index"] = np.clip(4.0 - frame["wind_speed"], 0, None) * (frame["humidity"] / 100)
    frame["ventilation_index"] = frame["wind_speed"] * np.maximum(1.0, 45.0 - frame["humidity"])
    frame["pollution_load"] = frame["aod_raw"] * 120 + frame["hcho_raw"] * 0.045 + frame["fire_intensity"] * 6
    frame["fire_transport_index"] = frame["fire_lag3"] * frame["wind_speed"]
    frame["hcho_ozone_potential"] = frame["hcho_raw"] * np.maximum(frame["temperature"] - 18, 0) / 1000
    frame["urban_heat_adjustment"] = frame["urban_index"] * np.maximum(frame["temperature"] - 25, 0)
    frame["monsoon_dispersion"] = frame["is_monsoon"] * frame["wind_speed"] * (1 - frame["stagnation_index"].clip(0, 1))
    frame["winter_inversion_risk"] = frame["is_winter"] * frame["stagnation_index"] * frame["igp_effect"]
    frame["satellite_interaction"] = frame["aod_norm"] * frame["hcho_norm"]
    frame["fire_hcho_interaction"] = frame["fire_intensity"] * frame["hcho_raw"] / 1000
    frame["humidity_aod_interaction"] = frame["humidity"] * frame["aod_raw"]
    frame["coastal_ventilation"] = frame["coastal_proximity"] * frame["wind_speed"]
    frame["sparse_region_flag"] = ((frame["lat"] > 31) | (frame["lon"] > 90) | (frame["lat"] < 12)).astype(float)
    frame["coverage_quality"] = 1.0 - 0.45 * frame["sparse_region_flag"] - 0.25 * (frame["distance_to_nearest_city"] > 6).astype(float)
    frame["coverage_quality"] = frame["coverage_quality"].clip(0.1, 1.0)

    frame[FEATURE_COLUMNS] = frame.groupby(["lat", "lon"], sort=False)[FEATURE_COLUMNS].ffill()
    frame[FEATURE_COLUMNS] = frame[FEATURE_COLUMNS].fillna(frame[FEATURE_COLUMNS].median(numeric_only=True))
    return frame


def fit_train_scaler(train: pd.DataFrame) -> dict[str, tuple[float, float]]:
    """Fit simple StandardScaler statistics on training rows only."""
    stats: dict[str, tuple[float, float]] = {}
    for column in FEATURE_COLUMNS:
        mean = float(train[column].mean())
        std = float(train[column].std() or 1.0)
        stats[column] = (mean, std)
    return stats


def apply_train_scaler(frame: pd.DataFrame, stats: dict[str, tuple[float, float]]) -> pd.DataFrame:
    """Apply train-only normalization into feature columns used by tabular models."""
    scaled = frame.copy()
    for column, (mean, std) in stats.items():
        scaled[column] = (scaled[column] - mean) / std
    return scaled


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
