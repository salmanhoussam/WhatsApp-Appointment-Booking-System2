"""
Turns one natural-language message into a database action.

Flow: ai.llm.ask() -> the local model either asks a clarifying question
(plain text) or picks a tool -> we execute that tool via ai.tools.call_tool
(which goes through services/ -> plugin_manager -> the active plugin) -> we
turn the raw tool result into a short human-readable confirmation. Every
call is recorded in the event log with a Job # (see telemetry.py) so a
single request's Input -> Tool -> Plugin -> Result -> Duration can be
traced later.
"""

import time

import telemetry
from ai import llm
from ai.tools import call_tool
from config import settings


def _format_result(tool_name: str, result: dict) -> str:
    if "error" in result:
        return f"Couldn't do that: {result['error']}"

    if "created" in result:
        return f"Done — saved: {result['created']}"

    for key in ("customers", "products", "invoices"):
        if key in result:
            items = result[key]
            if not items:
                return f"No {key} found yet."
            return f"Found {len(items)} {key}:\n" + "\n".join(str(i) for i in items)

    return str(result)


def handle_message(text: str) -> str:
    job_id = telemetry.next_job_id()
    started = time.monotonic()

    decision = llm.ask(text)

    if decision["type"] == "error":
        telemetry.log_event(
            job_id, text, tool=None, plugin=None, status="llm_error",
            duration_ms=round((time.monotonic() - started) * 1000, 1),
            detail=decision["message"],
        )
        return decision["message"]

    if decision["type"] == "text":
        telemetry.log_event(
            job_id, text, tool=None, plugin=None, status="clarification",
            duration_ms=round((time.monotonic() - started) * 1000, 1),
            detail=decision["content"],
        )
        return decision["content"]

    result = call_tool(decision["name"], decision["arguments"])
    telemetry.log_event(
        job_id, text, tool=decision["name"], plugin=settings.ACTIVE_PLUGIN,
        status="error" if "error" in result else "success",
        duration_ms=round((time.monotonic() - started) * 1000, 1),
        detail=result,
    )
    return _format_result(decision["name"], result)
