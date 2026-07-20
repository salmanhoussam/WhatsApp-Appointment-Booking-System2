# Switching Database Engine

Default is SQLite (`storage/local.db`), no extra setup needed.

To use Postgres instead:

```bash
LOCAL_AGENT_PLUGIN=postgres \
LOCAL_AGENT_POSTGRES_DSN=postgresql://user:pass@localhost:5432/local_agent \
python main.py
```

The exact same `agents/`, `services/`, and `ai/` code runs unchanged — only `plugins/plugin_manager.py` loads a different concrete `Plugin`. `psycopg` (in `requirements.txt`) is only imported when `postgres` is actually active.

**Known limitation:** the Postgres plugin has full code parity with SQLite (reviewed for correctness) but has never been run against a live Postgres server — see `../STATUS.md`. If you're the first to try it for real, that's genuinely useful RC1 dogfooding evidence — log the result in `../releases/dogfooding-checklist.md`.
