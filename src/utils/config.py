"""Configuration loading helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import yaml


ROOT = Path(__file__).resolve().parents[2]


def load_yaml(path: str | Path) -> dict[str, Any]:
    """Load a YAML document relative to the repository root."""
    resolved = _resolve(path)
    with resolved.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def load_json(path: str | Path) -> dict[str, Any]:
    """Load a JSON document relative to the repository root."""
    resolved = _resolve(path)
    with resolved.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _resolve(path: str | Path) -> Path:
    candidate = Path(path)
    return candidate if candidate.is_absolute() else ROOT / candidate

