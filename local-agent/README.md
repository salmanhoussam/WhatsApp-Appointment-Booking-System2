# Salman Local AI Agent

**Status: RC1 (`0.1.0-rc1`)** — feature frozen, dogfooding in progress. See
[`docs/STATUS.md`](docs/STATUS.md) (current state, exit criteria) and
[`docs/releases/dogfooding-checklist.md`](docs/releases/dogfooding-checklist.md)
(daily usage + Decision Log). No new features until RC1 exit criteria are met.

A standalone product: a local AI agent that runs entirely on your own machine
and talks to your *local* database (SQLite by default, Postgres also
supported) through a **plugin system**. No data or prompts leave the
machine — the LLM itself runs locally via [Ollama](https://ollama.com).

This is **not** part of the main SalmanSaaS backend and doesn't touch
`app/`, `frontend/`, or `prisma/` in the parent repo.

**Full documentation:** start at [`docs/llms.txt`](docs/llms.txt) for a linked
index of everything — architecture, guides, decisions, releases. AI coding
agents working in this folder should also read [`AGENTS.md`](AGENTS.md).

## Architecture (short version)

```
Agent  →  Tools (ai/tools)  →  Services  →  Plugin Manager  →  Plugin (sqlite / postgres / ...)
```

The agent only ever knows tool names (`create_customer`, `list_products`, ...)
— it never imports a database driver directly. See
[`docs/architecture/overview.md`](docs/architecture/overview.md) for the full
breakdown, and [`docs/architecture/logging.md`](docs/architecture/logging.md)
for how every command is traced through `logs/events.log`.

## Prerequisites

1. Python 3.11+
2. [Ollama](https://ollama.com) installed and running (`ollama serve`), with a
   tool-calling-capable model pulled (`ollama pull qwen2.5:7b`, or set
   `OLLAMA_MODEL` to whatever you pulled instead — it MUST match, or every
   request fails with `status="llm_error"`).

See [`docs/guides/getting-started.md`](docs/guides/getting-started.md) for the full walkthrough.

## Setup & Run

```bash
cd local-agent
python -m venv .venv && source .venv/bin/activate   # .venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py   # serves http://127.0.0.1:8010
```

## Try it

```bash
curl -X POST localhost:8010/agent/setup -H "Content-Type: application/json" -d '{}'

curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "add customer Ahmad, phone 03123456"}'

curl -X POST localhost:8010/agent/command \
  -H "Content-Type: application/json" \
  -d '{"text": "list all customers"}'

# See which plugin is active
curl localhost:8010/plugins

# See every command traced (Job #, tool, plugin, duration, result)
tail -f logs/events.log
```

More examples (products, invoices, catalog import/search) in
[`docs/guides/getting-started.md`](docs/guides/getting-started.md) and
[`docs/guides/importing-a-catalog.md`](docs/guides/importing-a-catalog.md).

## More

- [Switching database engine (sqlite ↔ postgres)](docs/guides/switching-database.md)
- [Adding a new plugin (Phase 3+)](docs/guides/adding-a-plugin.md)
- [What's NOT built yet](docs/roadmap.md)
- [Known limitations](docs/STATUS.md)
