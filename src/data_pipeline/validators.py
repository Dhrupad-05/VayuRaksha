"""Data quality and leakage validators."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class ValidationReport:
    """Summary of validation checks."""

    rows: int
    min_date: str
    max_date: str
    missing_values: int
    temporal_leakage: bool


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

