"""AQI ensemble model with empirical uncertainty."""

from __future__ import annotations

from dataclasses import dataclass

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


@dataclass
class PredictionBundle:
    """AQI mean and uncertainty predictions."""

    mean: np.ndarray
    sigma: np.ndarray
    lower: np.ndarray
    upper: np.ndarray


class AQIEnsemble:
    """Stacked tree ensemble for robust tabular geospatial AQI prediction."""

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
        self.models = [
            (
                "rf",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        (
                            "model",
                            RandomForestRegressor(
                                n_estimators=90,
                                max_depth=22,
                                min_samples_leaf=2,
                                random_state=seed,
                                n_jobs=-1,
                            ),
                        ),
                    ]
                ),
            ),
            (
                "extra",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        (
                            "model",
                            ExtraTreesRegressor(
                                n_estimators=130,
                                max_depth=24,
                                min_samples_leaf=2,
                                random_state=seed + 1,
                                n_jobs=-1,
                            ),
                        ),
                    ]
                ),
            ),
            (
                "hgb",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                        (
                            "model",
                            HistGradientBoostingRegressor(
                                max_iter=240,
                                learning_rate=0.055,
                                l2_regularization=0.02,
                                random_state=seed + 2,
                            ),
                        ),
                    ]
                ),
            ),
        ]

    def fit(self, x: pd.DataFrame, y: pd.Series) -> "AQIEnsemble":
        """Fit all base estimators."""
        for _, model in self.models:
            model.fit(x, y)
        return self

    def predict(self, x: pd.DataFrame) -> PredictionBundle:
        """Predict mean AQI and model-spread uncertainty."""
        matrix = np.vstack([model.predict(x) for _, model in self.models])
        mean = matrix.mean(axis=0)
        spread = matrix.std(axis=0)
        sigma = np.maximum(5.0, spread * 1.65 + 3.0)
        return PredictionBundle(
            mean=mean,
            sigma=sigma,
            lower=np.clip(mean - 1.64 * sigma, 0, 500),
            upper=np.clip(mean + 1.64 * sigma, 0, 500),
        )

    def save(self, path: str) -> None:
        """Persist model with joblib."""
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> "AQIEnsemble":
        """Load a persisted model."""
        return joblib.load(path)

