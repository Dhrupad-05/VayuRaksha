"""Fetcher abstractions with retry/cache/offline fallback behavior."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Generic, TypeVar

from src.data_pipeline.synthetic import SyntheticSpec, generate_synthetic_observations

T = TypeVar("T")
LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class DataSpec:
    """Serializable request identity for caching."""

    source: str
    payload: dict[str, str | int | float]

    @property
    def key(self) -> str:
        raw = json.dumps({"source": self.source, "payload": self.payload}, sort_keys=True)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


class DiskCache(Generic[T]):
    """Small JSON metadata cache marker used by fetchers."""

    def __init__(self, root: Path = Path("data/cache")) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def marker(self, spec: DataSpec) -> Path:
        return self.root / f"{spec.key}.json"

    def write_marker(self, spec: DataSpec, status: str) -> None:
        self.marker(spec).write_text(json.dumps({"source": spec.source, "status": status}), encoding="utf-8")


class BaseFetcher(Generic[T]):
    """Base fetcher implementing retry with offline fallback."""

    def __init__(self, source: str, fallback: Callable[[], T], retries: int = 3) -> None:
        self.source = source
        self.fallback = fallback
        self.retries = retries
        self.cache: DiskCache[T] = DiskCache()

    async def fetch(self, spec: DataSpec, primary: Callable[[], Awaitable[T]] | None = None) -> tuple[T, str]:
        """Fetch from primary if provided, otherwise use deterministic fallback."""
        if primary is not None:
            for attempt in range(1, self.retries + 1):
                try:
                    data = await primary()
                    self.cache.write_marker(spec, "primary")
                    return data, "primary"
                except Exception as exc:  # pragma: no cover - exercised by real integrations
                    wait = min(2**attempt, 10)
                    LOGGER.warning("%s primary attempt %s failed: %s", self.source, attempt, exc)
                    await asyncio.sleep(wait)

        data = self.fallback()
        self.cache.write_marker(spec, "offline_fallback")
        return data, "offline_fallback"


async def fetch_offline_observations(spec: SyntheticSpec | None = None):
    """Fetch the canonical offline dataset through the same contract as real sources."""
    request = DataSpec(source="offline_fused_observations", payload={"version": 1})
    fetcher = BaseFetcher("offline_fused_observations", lambda: generate_synthetic_observations(spec))
    return await fetcher.fetch(request)

