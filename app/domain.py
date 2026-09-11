"""The public snapshot contract; unknown fields never leave this boundary."""
from math import isfinite
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainValidator, field_validator


def validate_counter(value: object) -> int | float:
    """Preserve integers without converting them to floating point."""
    if type(value) is int:
        if value >= 0:
            return value
    elif type(value) is float:
        if isfinite(value) and value >= 0:
            return value
    raise ValueError("Counter must be a finite nonnegative number")


Counter = Annotated[int | float, PlainValidator(validate_counter)]


class SnapshotValue(BaseModel):
    model_config = ConfigDict(strict=True, extra="ignore")

    @field_validator("*")
    @classmethod
    def validate_unicode(cls, value: object) -> object:
        """Ensure every public string can be serialized as UTF-8 JSON."""
        if isinstance(value, str):
            try:
                value.encode("utf-8")
            except UnicodeEncodeError:
                raise ValueError("String contains an unpaired surrogate") from None
        return value


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
