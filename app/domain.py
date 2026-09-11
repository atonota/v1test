"""The public snapshot contract; unknown fields never leave this boundary."""
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

Counter = Annotated[int | float, Field(ge=0, allow_inf_nan=False)]


class SnapshotValue(BaseModel):
    model_config = ConfigDict(strict=True, extra="ignore")


class Project(SnapshotValue):
    id: str
    name: str
    enabled: bool


class Job(SnapshotValue):
    id: str
    project_key: str
    name: str
    status: str
    stage: str | None
    agent_calls: Counter
    uncached_input_tokens: Counter
    output_tokens: Counter


class Snapshot(SnapshotValue):
    updated_at: str
    projects: list[Project]
    jobs: list[Job]
    paused: bool
    credit_note: str
