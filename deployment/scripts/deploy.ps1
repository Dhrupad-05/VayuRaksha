param(
  [string]$ImageName = "vayuraksha:latest"
)

python -m src.training.pipeline --output artifacts/latest
docker build -f docker/Dockerfile -t $ImageName .
kubectl apply -f deployment/kubernetes/deployment.yaml

