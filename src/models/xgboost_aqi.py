"""XGBoost baseline with a compatible fallback for local environments."""

from __future__ import annotations

import importlib.util

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class XGBoostAQIModel:
    """Fast AQI baseline using XGBoost when available."""

    def __init__(self, seed: int = 42) -> None:
        self.seed = seed
        self.using_xgboost = importlib.util.find_spec("xgboost") is not None
        if self.using_xgboost:
            from xgboost import XGBRegressor

            estimator = XGBRegressor(
                n_estimators=420,
                max_depth=5,
                learning_rate=0.045,
                subsample=0.86,
                colsample_bytree=0.9,
                objective="reg:squarederror",
                random_state=seed,
                n_jobs=-1,
            )
            self.model = Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", estimator)])
        else:
            self.model = Pipeline(
                [
                    ("imputer", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                    (
                        "model",
                        HistGradientBoostingRegressor(
                            max_iter=360,
                            learning_rate=0.05,
                            l2_regularization=0.015,
                            random_state=seed,
                        ),
                    ),
                ]
            )

    def fit(self, x: pd.DataFrame, y: pd.Series) -> "XGBoostAQIModel":
        """Fit baseline model."""
        self.model.fit(x, y)
        return self

    def predict(self, x: pd.DataFrame):
        """Predict AQI."""
        return self.model.predict(x)

    def save(self, path: str) -> None:
        """Persist model."""
        joblib.dump(self, path)

