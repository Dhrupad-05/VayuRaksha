# Deployment

Local:

```powershell
python -m src.training.pipeline --output artifacts/latest
uvicorn src.api.main:app --host 0.0.0.0 --port 8000
```

Docker:

```powershell
python -m src.training.pipeline --output artifacts/latest
docker build -f docker/Dockerfile -t vayuraksha:latest .
docker run -p 8000:8000 vayuraksha:latest
```

Kubernetes:

```powershell
kubectl apply -f deployment/kubernetes/deployment.yaml
```

