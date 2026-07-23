"""Data quality and leakage validators."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class ValidationReport:
    """Summary of validation checks."""

    rows: int
    min_date: str
    max_date: str
    missing_values: int
    temporal_leakage: bool
    spatial_anomalies: int = 0
    temporal_spikes: int = 0


class DataValidator:
    """Validate data ranges, schema, and temporal split safety."""

    required_columns = {
        "date",
        "lat",
        "lon",
        "aod",
        "hcho",
        "fire_intensity",
        "temperature",
        "humidity",
        "wind_speed",
        "aqi",
        "is_hotspot",
    }

    def validate_observations(self, frame: pd.DataFrame) -> ValidationReport:
        """Raise ValueError if the observation frame is unsafe to model."""
        missing = self.required_columns - set(frame.columns)
        if missing:
            raise ValueError(f"Missing required columns: {sorted(missing)}")
        if not frame["aqi"].between(0, 500).all():
            raise ValueError("AQI outside expected 0-500 range")
        if not frame["aod"].between(0, 3).all():
            raise ValueError("AOD outside expected 0-3 range")
        if not frame["humidity"].between(0, 100).all():
            raise ValueError("Humidity outside expected 0-100 range")

        dates = pd.to_datetime(frame["date"])
        return ValidationReport(
            rows=len(frame),
            min_date=dates.min().date().isoformat(),
            max_date=dates.max().date().isoformat(),
            missing_values=int(frame.isna().sum().sum()),
            temporal_leakage=False,
        )

    def validate_temporal_split(
        self, train: pd.DataFrame, validation: pd.DataFrame, test: pd.DataFrame
    ) -> None:
        """Ensure split dates are strictly ordered."""
        train_max = train["date"].max()
        val_min = validation["date"].min()
        val_max = validation["date"].max()
        test_min = test["date"].min()
        if not (train_max < val_min <= val_max < test_min):
            raise ValueError("Temporal split leakage detected")

    def detect_spatial_anomalies(self, frame: pd.DataFrame, value_column: str = "aqi") -> pd.DataFrame:
        """Flag grid cells whose value sharply differs from same-day neighbors."""
        work = frame.copy()
        anomalies: list[bool] = []
        for _, day_frame in work.groupby("date", sort=False):
            piv = day_frame.pivot(index="lat", columns="lon", values=value_column).sort_index()
            values = piv.to_numpy(dtype=float)
            center = values[1:-1, 1:-1]
            if center.size == 0:
                anomalies.extend([False] * len(day_frame))
                continue
            laplacian = (
                -4 * center
                + values[:-2, 1:-1]
                + values[2:, 1:-1]
                + values[1:-1, :-2]
                + values[1:-1, 2:]
            )
            threshold = np.nanstd(laplacian) * 4.5
            day_flags = pd.Series(False, index=day_frame.index)
            inner_index = [(lat, lon) for lat in piv.index[1:-1] for lon in piv.columns[1:-1]]
            flag_values = np.abs(laplacian.ravel()) > threshold if threshold > 0 else np.zeros(laplacian.size, dtype=bool)
            index_lookup = day_frame.set_index(["lat", "lon"]).index
            flagged_points = set(point for point, flag in zip(inner_index, flag_values) if flag)
            day_flags.loc[day_frame.index] = [point in flagged_points for point in index_lookup]
            anomalies.extend(day_flags.tolist())
        output = work.copy()
        output["spatial_anomaly"] = anomalies[: len(output)]
        return output

    def detect_temporal_spikes(self, frame: pd.DataFrame, value_column: str = "aqi") -> pd.DataFrame:
        """Flag implausible day-to-day spikes by location."""
        output = frame.sort_values(["lat", "lon", "date"]).copy()
        diff = output.groupby(["lat", "lon"], sort=False)[value_column].diff().abs()
        local_std = output.groupby(["lat", "lon"], sort=False)[value_column].transform("std").fillna(0)
        output["temporal_spike"] = diff > np.maximum(65, 3.8 * local_std)
        return output

    def coverage_map(self, frame: pd.DataFrame) -> dict[str, float]:
        """Report proxy ground-truth coverage quality by broad region."""
        regions = {
            "igp": frame["lat"].between(25, 32) & frame["lon"].between(73, 88),
            "south": frame["lat"] < 18,
            "east": frame["lon"] > 84,
            "sparse": (frame["lat"] > 31) | (frame["lon"] > 90) | (frame["lat"] < 12),
        }
        return {
            name: float(frame.loc[mask, "coverage_quality"].mean())
            for name, mask in regions.items()
            if mask.any() and "coverage_quality" in frame
        }
