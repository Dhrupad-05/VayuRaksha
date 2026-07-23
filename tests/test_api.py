from fastapi.testclient import TestClient

from src.api.main import app


def test_health_endpoint_responds():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_required_artifact_endpoints_are_registered():
    paths = {route.path for route in app.routes}
    assert "/aqi/timeseries" in paths
    assert "/uncertainty/map" in paths
    assert "/prometheus" in paths
