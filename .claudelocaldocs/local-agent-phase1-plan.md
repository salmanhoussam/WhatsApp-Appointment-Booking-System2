# Salman Local AI Agent — Phase 1 Proof of Concept

## Context

This is a standalone product — **not** a replacement for the current Railway/Supabase-hosted SalmanSaaS Cloud. It runs entirely on a client's own machine and talks to their *local* database (SQLite/Postgres/MySQL/SQL Server/POS), so shop data never has to leave their premises. Planned as a 3-phase build:

- **Phase 1 (this doc):** Laptop → Local AI Agent → local DB (SQLite/Postgres). No WhatsApp, no webhook, no cloud — pure proof of concept that the agent can add/edit/read data through a local database via natural language.
- **Phase 2 (later):** Add WhatsApp Cloud API as an input layer in front of the same agent.
- **Phase 3 (later):** Add more DB connectors (MySQL, SQL Server, POS APIs) — the agent code itself never changes, only a new Connector is added.

The core design principle behind all three phases: the agent layer never talks to a database driver directly — it always calls a Repository interface (`CustomerRepository.create()`, etc.), and a per-database **Connector** implements that interface. The AI never needs to know which database is actually in use.

Confirmed decisions:
1. **Location:** top-level `local-agent/` folder in the SalmanSaaS repo (sibling to `app/`, `frontend/`, `prisma/`) — not a separate repo, not nested inside `app/`.
2. **LLM backend:** fully local via **Ollama** — no prompts or data leave the machine, matching the "data stays local" pitch literally.
3. **Phase 1 interface:** a local FastAPI server bound to its **own distinct port** (separate from the main SalmanSaaS backend, e.g. 8010), not a wa.me/WhatsApp flow yet. On first run it reads a short business-context description, proposes/creates the local DB schema, and then accepts natural-language commands to read/write data.

## Folder structure

```
local-agent/
├── app/                    # FastAPI app definition (routes only, no business logic)
├── agents/
│   ├── database_agent.py   # turns a parsed intent + tool call into a repository call
│   ├── command_agent.py    # entrypoint: takes raw text, asks the LLM which tool to call, dispatches
│   └── vision_agent.py     # stub only — Phase 3+ (OCR/invoice images), out of scope now
├── connectors/
│   ├── sqlite/              # Phase 1 — fully implemented
│   ├── postgres/            # Phase 1 — scaffolded
│   ├── mysql/ sqlserver/ pos/  # Phase 3 — empty placeholder dirs only, not implemented yet
├── database/
│   ├── repositories/        # abstract interfaces: CustomerRepository, ProductRepository, InvoiceRepository
│   ├── models/               # Pydantic models: Customer, Product, Invoice
│   └── migrations/           # schema.sql + a small runner that creates tables if missing
├── ai/
│   ├── prompts/system.md    # system prompt describing the agent's role + available tools
│   ├── tools/                # tool-schema definitions mapping 1:1 to repository methods
│   └── llm.py                 # Ollama client wrapper (OpenAI-compatible local endpoint)
├── services/
│   ├── customer_service.py  # thin validation layer in front of the repository
│   ├── product_service.py
│   └── invoice_service.py
├── config/                  # settings.py — active connector, Ollama host/model, storage path
├── logs/
├── storage/                 # local.db lives here (sqlite file)
└── main.py                  # starts uvicorn on its own port, e.g. 8010
```

## Build order

1. `config/settings.py` — active connector name (`sqlite` default), Ollama host/model, storage path, log path.
2. `database/models/` — `Customer`, `Product`, `Invoice` Pydantic models.
3. `database/repositories/` — abstract base classes (Python `Protocol`/`ABC`) defining `create`, `get`, `list`, `update` per entity — the contract the agent codes against and never changes across phases.
4. `connectors/sqlite/` — concrete implementation of all three repositories using stdlib `sqlite3`.
5. `connectors/postgres/` — same interface, concrete implementation using `psycopg`, scaffolded but secondary to SQLite for this pass.
6. `database/migrations/schema.sql` + a small runner — creates `customers`/`products`/`invoices` tables if they don't exist yet, run automatically the first time `/agent/setup` is called.
7. `ai/llm.py` — thin wrapper calling Ollama's OpenAI-compatible `/v1/chat/completions` endpoint (the official `openai` Python client can point at `http://localhost:11434/v1` with no code changes if the user later swaps to a real cloud key). Requires a tool-calling-capable local model (`ollama pull qwen2.5:7b` or `llama3.1:8b` — the actual pull/download is the user's call).
8. `ai/tools/` — JSON tool-schemas: `create_customer`, `get_customer`, `create_product`, `list_products`, `create_invoice`, etc. — each maps 1:1 to a repository method.
9. `ai/prompts/system.md` — system prompt: agent's role, the available tools, and instructions to always respond with a tool call rather than free text when the user is asking to read/write data.
10. `agents/database_agent.py` — takes a user message, calls `ai/llm.py` with the tool schema, executes whatever tool call comes back via the matching `services/*_service.py` → repository → active connector, returns a natural-language confirmation.
11. `agents/command_agent.py` — the single entrypoint `main.py` calls; for Phase 1 it always routes to `database_agent` (no vision use yet).
12. `agents/vision_agent.py` — stub file only (`raise NotImplementedError`), reserved for Phase 3+.
13. `services/*.py` — one thin service per entity doing basic validation before calling the repository.
14. `main.py` — FastAPI app on a **dedicated port (8010)**, distinct from the main SalmanSaaS backend, exposing:
    - `POST /agent/setup` — accepts a short free-text business description, creates/verifies the local schema via the migrations runner, returns the created schema.
    - `POST /agent/command` — accepts any natural-language instruction, runs it through `command_agent` → `database_agent`, returns the result.
    - `GET /health` — trivial liveness check.

## Prerequisite outside Claude's control

Ollama itself must be installed and running locally with a tool-calling model pulled (`ollama pull qwen2.5:7b`, for example) before `ai/llm.py` can succeed.

## Verification

- `python local-agent/main.py` starts uvicorn on port 8010 without errors.
- `POST localhost:8010/agent/setup {"context": "small furniture shop, track customers, products, invoices"}` creates `local-agent/storage/local.db` with the three tables and returns the schema it created.
- `POST localhost:8010/agent/command {"text": "add customer Ahmad, phone 03123456"}` results in a new row in `customers`, confirmed by a follow-up read command through the same endpoint.
- Swapping `config/settings.py`'s active connector from `sqlite` to `postgres` exercises the identical `agents/`/`services/` code with zero changes — the proof that the Repository/Connector split works.

## Status log

- 2026-07-14 — Phase 1 scaffolded and built (see `local-agent/README.md` for run instructions).
- 2026-07-14 — Architecture revised per user code review, before any Phase 2/3 work started:
  - **`connectors/` renamed to `plugins/`**, with a real `plugins/plugin_interface.py` (`Plugin.execute(action, payload) -> dict`) and `plugins/plugin_manager.py` replacing the old typed-repository factory. The reasoning: future integrations (Odoo, SAP, Square, a local POS) aren't databases with CRUD repositories — a generic action-dispatch interface is what actually generalizes, "connector" implied "database" too narrowly.
  - **Layering tightened to `Agent → Tools → Services → Plugin Manager → Plugin`** — confirmed the agent already never imported repositories directly; now `services/` doesn't either, it only calls `plugin_manager.execute()`. `database/repositories/` (the old ABCs) remain as an internal implementation detail used only inside `plugins/sqlite/` and `plugins/postgres/`, no longer the public contract.
  - **Event log added** (`telemetry.py` → `logs/events.log`, JSON-lines) — every `agents/database_agent.py` call gets a sequential Job # tracing Input → LLM tool choice → Plugin → Result → Duration.
  - `.claudelocaldocs/` full subfolder restructure (architecture/roadmap/phases/decisions/research/logs) — explicitly deferred until the project reaches Phase 3-4 and the architecture stabilizes; not worth doing while still changing daily.
  - Repo split (SalmanSaaS vs. a standalone "Salman Local AI Runtime" repo) — explicitly deferred, staying inside this repo for now. Revisit once Phase 1/2 prove out.
- 2026-07-15 — Team-roles process adopted (`.claude/rules/engineering-manager-mode.md`, `.claude/rules/team-roles.md`). ~~Current project focus: local-agent, architecture considered stable — no redesign unless explicitly requested; incremental, verified, production-quality changes only.~~ Superseded 2026-07-16, see below.
- 2026-07-15 — Phase 1 architecture review completed and **frozen** (`.claudelocaldocs/phase1-architecture-review.md`) — verdict: sound, no redesign needed; 3 implementation gaps flagged (in-memory event-log Job IDs, undifferentiated error handling, zero tests), none blocking.
- 2026-07-15 — Phase 2 (Local LLM Integration) — failure handling + logging added to `ai/llm.py`/`agents/database_agent.py` (Ollama-unreachable and malformed-tool-call-JSON now caught and logged as `status="llm_error"` instead of crashing); no other layer touched. See `.claudelocaldocs/phase2-llm-integration.md` for verified scenarios. Real Ollama tool-selection still unverified (not installed in this dev environment).
- 2026-07-15 — Phase 2.5 (Real Data Validation) — analyzed a real POS price-list export (`new-matirial/الأسعار26.81.XLS`, 93 products). Design finalized per user decisions: **imported business data stays a decoupled external reference (`product_catalog`/`import_batches`), never touching the frozen `products` table** — this is now a standing architectural principle, not just a one-file decision: no operational schema changes based on any single import file until full business workflows are understood across future files. No duplicate rows are ever auto-removed (report-only).
- 2026-07-15 — Phase 2.5 **implemented**: `import_batches` (shared, `entity_type` column) + `product_catalog` (concrete) tables; `services/catalog_import_service.py` (concrete Excel importer, not a generic engine); 4 new plugin actions in both `plugins/sqlite/` and `plugins/postgres/` (parity maintained); 4 new LLM tools (`preview_catalog_import`, `import_product_catalog`, `search_product_catalog`, `list_catalog_imports`; rollback deliberately not LLM-exposed). New standing rule documented in `.claude/rules/team-roles.md`: shared abstractions wait for ≥2 real implementations, not predicted future need — `import_batches` was shared immediately because batch metadata is provably identical regardless of entity type; the import *service* stays concrete until a second real import type is built. See `.claudelocaldocs/phase2.5-data-validation-report.md` §12 for files touched and verification.
- 2026-07-16 — **RC1 declared** (`local-agent/VERSION` = `0.1.0-rc1`). Phases 1/2/2.5 are feature-complete for current scope; development enters a controlled dogfooding period — real usage, not new architecture. **Current project focus: dogfooding RC1.** Only isolated bug fixes, prompt improvements, and documentation updates are in scope until RC1 exit criteria are met (see `.claudelocaldocs/rc1-release-notes.md`); everything else is recorded on the post-RC1 backlog, not implemented now (Backlog Policy). Day-to-day tracking + Decision Log in `.claudelocaldocs/dogfooding-checklist.md`. Phase 3 (WhatsApp/vision/OCR/external plugins) begins only after RC1 exit criteria are satisfied.
