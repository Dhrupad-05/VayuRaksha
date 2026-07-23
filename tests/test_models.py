from datetime import date

from src.data_pipeline.features import FEATURE_COLUMNS, build_feature_frame, temporal_split
from src.data_pipeline.synthetic import SyntheticSpec, generate_synthetic_observations
from src.models.aqi_ensemble import AQIEnsemble
from src.models.cnn_lstm import CNNLSTMAQIModel, gaussian_nll_loss
from src.models.hotspot_detector import HotspotDetector
from src.models.metrics import classification_metrics, regression_metrics
import torch


def test_models_recover_synthetic_signal():
    raw = generate_synthetic_observations(SyntheticSpec(start=date(2024, 1, 1), days=85, resolution=5.0))
    frame = build_feature_frame(raw)
    train, _, test = temporal_split(frame, validation_days=12, test_days=12)
    model = AQIEnsemble(seed=7).fit(train[FEATURE_COLUMNS], train["aqi"])
    predictions = model.predict(test[FEATURE_COLUMNS])
    metrics = regression_metrics(test["aqi"].to_numpy(), predictions.mean)
    assert metrics["r2"] > 0.82
    hotspot = HotspotDetector().fit(train)
    scores = classification_metrics(test["is_hotspot"].to_numpy(), hotspot.predict(test))
    assert scores["f1"] >= 0.65


def test_cnn_lstm_forward_dual_heads_and_loss():
    model = CNNLSTMAQIModel()
    spatial = torch.randn(4, 30, 13, 13, 13)
    lat = torch.tensor([40, 42, 44, 46], dtype=torch.long)
    lon = torch.tensor([25, 27, 29, 31], dtype=torch.long)
    pred, sigma = model(spatial, lat, lon)
    loss = gaussian_nll_loss(pred, sigma, torch.randn(4))
    assert pred.shape == (4,)
    assert sigma.shape == (4,)
    assert torch.all(sigma > 0)
    assert torch.isfinite(loss)
