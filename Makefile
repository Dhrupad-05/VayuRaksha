.PHONY: train api test

train:
	python -m src.training.pipeline --output artifacts/latest

api:
	uvicorn src.api.main:app --reload --port 8000

test:
	pytest

