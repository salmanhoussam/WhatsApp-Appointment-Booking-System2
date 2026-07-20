# Logging & Monitoring (Event Log)

## Where

`logs/events.log` — JSON-lines, one event per line, written by `telemetry.py`. Thread-safe (a `threading.Lock` guards the file append, correct given FastAPI's default threaded execution of sync route handlers). This is the only monitoring surface today — no external dashboard, no metrics exporter, `tail -f logs/events.log` is the whole story.

## Two kinds of line

**1. Final summary event** (`telemetry.log_event()`) — one per request, written by `agents/database_agent.handle_message()` at the end:

```json
{"job_id": 1, "timestamp": "...", "input": "...", "tool": "create_customer",
 "plugin": "sqlite", "status": "success", "duration_ms": 13861.8, "detail": {...}}
```

`status` is one of `success` / `error` / `llm_error` / `clarification`. This shape is stable and has not changed since Phase 1 — anything grepping `logs/events.log` for `status=` still works.

**2. Per-stage trace lines** (`telemetry.log_stage()`, added during RC1 dogfooding) — zero or more per request, same `job_id`, written from `database_agent.handle_message()` at each step:

```json
{"job_id": 1, "timestamp": "...", "stage": "request_received", "detail": {"input": "..."}, "duration_ms": null}
{"job_id": 1, "timestamp": "...", "stage": "llm_call", "detail": {"decision_type": "tool_call", "model": "qwen2.5:3b"}, "duration_ms": 13852.1}
{"job_id": 1, "timestamp": "...", "stage": "tool_selected", "detail": {"tool": "create_product", "arguments": {...}}, "duration_ms": null}
{"job_id": 1, "timestamp": "...", "stage": "plugin_execute", "detail": {"tool": "create_product", "plugin": "sqlite", "status": "success"}, "duration_ms": 8.4}
```

Stage lines are purely additive — they carry a `stage` key instead of `tool`/`plugin`/`status`/`input`, so anything reading the final-summary shape is unaffected. Their value: isolating **where time actually went**. In the example above, 13852.1ms was the LLM call and 8.4ms was the plugin/DB write — proof that slowness is inference time, not a database or plugin problem.

## Job # tracing

`telemetry.next_job_id()` — `itertools.count(1)`, **in-memory only**. Known limitation: resets to 1 on every server restart, so "Job #1" is only unique within one uninterrupted process lifetime, not across restarts. Not yet fixed — see `STATUS.md`'s Known Limitations. Two different server sessions on the same day will both contain a "Job #1"; use the timestamp alongside it to disambiguate.

## What's NOT built yet

- No log rotation — `events.log` grows forever.
- No query interface beyond `tail`/`grep`/`cat`.
- No error classification (validation vs. bug vs. infrastructure failure) — everything is `status="error"` with `detail={"error": str(exc)}`, no stack traces retained.
- No alerting/monitoring hook for infrastructure-class failures (Ollama down, DB unreachable).

None of these block RC1 dogfooding — they're documented gaps, not silent ones. See [verification/phase1-architecture-review.md](../verification/phase1-architecture-review.md) §8-9 for the original analysis.
