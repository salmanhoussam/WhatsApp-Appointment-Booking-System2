"""
Event log — every command the agent handles gets one JSON-lines entry in
local-agent/logs/events.log, with a sequential Job # for tracing a single
request through Input -> LLM tool choice -> Plugin -> Result -> Duration.
This is what makes debugging real usage (and later, WhatsApp traffic)
tractable instead of guessing from scratch every time.
"""

import itertools
import json
import threading
from datetime import datetime, timezone

from config import settings

_lock = threading.Lock()
_counter = itertools.count(1)


def next_job_id() -> int:
    return next(_counter)


def log_event(job_id: int, input_text: str, tool: str | None, plugin: str | None,
              status: str, duration_ms: float, detail=None) -> dict:
    event = {
        "job_id": job_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "input": input_text,
        "tool": tool,
        "plugin": plugin,
        "status": status,
        "duration_ms": duration_ms,
        "detail": detail,
    }
    _write(event)
    return event


def log_stage(job_id: int, stage: str, detail=None, duration_ms: float | None = None) -> dict:
    """
    Additional trace line for one step of a request's lifecycle (request
    received, LLM call, tool selection, plugin execution, ...). Written to
    the same events.log file as log_event()'s final summary line, but with
    a distinct `stage` key so existing consumers filtering on `status`/`tool`
    (the final-event fields) are unaffected — this is purely additive detail
    for tracing where time went and what happened at each step.
    """
    event = {
        "job_id": job_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "stage": stage,
        "detail": detail,
        "duration_ms": duration_ms,
    }
    _write(event)
    return event


def _write(event: dict) -> None:
    log_path = settings.LOGS_DIR / "events.log"
    line = json.dumps(event, ensure_ascii=False, default=str)
    with _lock:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
