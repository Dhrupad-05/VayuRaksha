from datetime import date

from src.data_pipeline.features import build_feature_frame, temporal_split
from src.data_pipeline.synthetic import SyntheticSpec, generate_synthetic_observations
from src.data_pipeline.validators import DataValidator


def test_synthetic_data_validates_and_splits_without_leakage():
    frame = generate_synthetic_observations(SyntheticSpec(start=date(2024, 1, 1), days=40, resolution=7.0))
    report = DataValidator().validate_observations(frame)
    assert report.rows > 0
    features = build_feature_frame(frame)
    train, validation, test = temporal_split(features, validation_days=8, test_days=8)
    DataValidator().validate_temporal_split(train, validation, test)
    assert train["date"].max() < validation["date"].min() < test["date"].min()

