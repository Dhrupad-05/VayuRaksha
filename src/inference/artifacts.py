"""Artifact loading and demo payload helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DEFAULT_ARTIFACT_DIR = Path("artifacts/latest")


def read_json_artifact(name: str, artifact_dir: str | Path = DEFAULT_ARTIFACT_DIR) -> dict[str, Any]:
    """Read a JSON artifact, returning an empty object if absent."""
    path = Path(artifact_dir) / name
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json_artifact(name: str, payload: dict[str, Any], artifact_dir: str | Path) -> Path:
    """Write a formatted JSON artifact."""
    root = Path(artifact_dir)
    root.mkdir(parents=True, exist_ok=True)
    path = root / name
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path

