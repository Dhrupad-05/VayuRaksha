"""HCHO/fire hotspot detector."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class HotspotDetector:
    """Detect emission hotspots from HCHO anomalies and fire intensity."""

    hcho_z_threshold: float = 1.55
    fire_intensity_threshold: float = 2.2
    min_cluster_points: int = 2

    def fit(self, frame: pd.DataFrame) -> "HotspotDetector":
        """Learn regional HCHO climatology from training data."""
        self.hcho_mean_ = float(frame["hcho"].mean())
        self.hcho_std_ = float(frame["hcho"].std() or 1.0)
        return self

    def predict(self, frame: pd.DataFrame) -> np.ndarray:
        """Return binary hotspot predictions."""
        z_score = (frame["hcho"] - self.hcho_mean_) / self.hcho_std_
        return ((z_score >= self.hcho_z_threshold) | (frame["fire_intensity"] >= self.fire_intensity_threshold)).astype(int).to_numpy()

    def annotate(self, frame: pd.DataFrame) -> pd.DataFrame:
        """Add hotspot score and severity labels."""
        output = frame.copy()
        z_score = (output["hcho"] - self.hcho_mean_) / self.hcho_std_
        output["hotspot_score"] = z_score + 0.45 * output["fire_intensity"]
        output["hotspot_pred"] = self.predict(output)
        output["severity"] = pd.cut(
            output["hotspot_score"],
            bins=[-999, 1.55, 2.5, 3.6, 999],
            labels=["watch", "minor", "major", "critical"],
        ).astype(str)
        return output
