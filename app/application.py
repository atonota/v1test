"""Read only the configured snapshot, with a bounded read and strict validation."""
import json
import os
import stat

from pydantic import ValidationError

from app.domain import Snapshot

MAX_BYTES = 2 * 1024 * 1024


class SnapshotUnavailable(Exception):
    """Public failure without filesystem or parser details."""


class SnapshotService:
    def read(self) -> Snapshot:
        try:
            path = os.environ.get("FACTORY_STATUS_FILE")
            if not path:
                raise SnapshotUnavailable()
            # Nonblocking open avoids hanging on a FIFO. Validate the actual
            # descriptor before reading, then bound reads even if the file grows.
            fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK)
            with os.fdopen(fd, "rb") as stream:
                info = os.fstat(stream.fileno())
                if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES:
                    raise SnapshotUnavailable()
                raw = stream.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise SnapshotUnavailable()
            return Snapshot.model_validate(json.loads(raw.decode("utf-8")))
        except (OSError, ValueError, ValidationError, RecursionError):
            raise SnapshotUnavailable() from None
