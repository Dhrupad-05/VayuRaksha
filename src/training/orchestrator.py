"""Airflow-lite orchestration for VayuRaksha."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Awaitable, Callable

from src.training.pipeline import run_pipeline

LOGGER = logging.getLogger(__name__)


@dataclass
class DagTask:
    """A single async DAG task."""

    name: str
    run: Callable[[], Awaitable[object]]
    dependencies: list[str] = field(default_factory=list)


class TrainingDag:
    """Minimal dependency-aware async DAG executor."""

    def __init__(self, tasks: list[DagTask]) -> None:
        self.tasks = {task.name: task for task in tasks}
        self.completed: set[str] = set()

    async def execute(self) -> dict[str, object]:
        """Execute tasks once all dependencies have completed."""
        results: dict[str, object] = {}
        while len(self.completed) < len(self.tasks):
            ready = [
                task
                for task in self.tasks.values()
                if task.name not in self.completed and all(dep in self.completed for dep in task.dependencies)
            ]
            if not ready:
                raise RuntimeError("DAG has a cycle or missing dependency")
            for task in ready:
                LOGGER.info("Running DAG task: %s", task.name)
                results[task.name] = await task.run()
                self.completed.add(task.name)
        return results


async def run_default_dag(output: str = "artifacts/latest") -> dict[str, object]:
    """Run the production-shaped training DAG."""
    dag = TrainingDag(
        [
            DagTask("train_and_export", lambda: run_pipeline(output)),
            DagTask("notify_ready", _notify_ready, dependencies=["train_and_export"]),
        ]
    )
    return await dag.execute()


async def _notify_ready() -> dict[str, str]:
    await asyncio.sleep(0)
    return {"status": "ready", "message": "Artifacts exported and dashboard can refresh."}

