# Salman Local AI Agent — RC1 Release Notes

**Version:** `0.1.0-rc1` (see `local-agent/VERSION`)
**Date:** 2026-07-16

---

## Definition of RC1

RC1 is considered feature complete for the current scope. The purpose of this release is to validate usability, stability, prompt quality, and workflow using real business data. Only isolated bug fixes, prompt improvements, and documentation updates are allowed during RC1. New features are deferred until RC1 is completed.

---

## Included in RC1

- **Phase 1 — Core architecture:** `Agent → Tools → Services → Plugin Manager → Plugin` layering, verified by import inspection (the agent never imports a repository or plugin directly). `sqlite` (default) and `postgres` plugins implemented at parity. Full CRUD for customers, products, invoices (by-name lookup + total computation). Event log (`logs/events.log`, JSON-lines, Job # tracing).
- **Phase 2 — Local LLM integration:** Ollama via its OpenAI-compatible endpoint, tool-calling only (the LLM never touches a plugin/repository/DB directly). Failure handling for Ollama-unreachable and malformed tool-call JSON, both logged as `status="llm_error"` instead of crashing.
- **Phase 2.5 — Product catalog import:** real POS price-list Excel import (`.xls`/`.xlsx`) into a decoupled reference table (`product_catalog` + shared `import_batches`), verified end-to-end against a real 93-row file. Never touches the operational `products` table. Duplicate SKUs reported, never auto-removed. Rollback supported (service-level only, not LLM-exposed).

## Explicitly Deferred (Phase 3+)

- WhatsApp integration
- Vision / OCR (`agents/vision_agent.py` is a stub)
- MySQL / SQL Server / POS / Odoo / Square plugins (placeholder folders only)
- Customer, invoice, and inventory import (only product catalog import exists)

## Known Limitations (carried forward honestly, not fixed yet)

- Event-log Job IDs are in-memory only — reset to 1 on every server restart.
- Error handling is not classified into validation/bug/infrastructure-failure types — everything surfaces as a generic `{"error": "..."}`.
- No automated test suite exists — every verification so far has been manual.
- The Postgres plugin has full code parity with the SQLite plugin but has never been run against a live Postgres server.
- Real Ollama tool-selection **has now been verified end-to-end** (2026-07-16, `qwen2.5:3b`) — see Exit Criteria below. Remaining unknowns: only 3 real requests so far (not the ≥100 needed), and only 2 tools exercised (`create_customer`, `list_customers`, `create_product`) — most tools (invoices, catalog import/search) are still untested against a real model.
- **First LLM call after a fresh Ollama/model load is very slow on modest hardware** (observed: 224s cold vs. ~9-14s warm on an NVIDIA MX110 GPU with `qwen2.5:3b`). Not a bug — the model has to load into memory once — but worth knowing before assuming a hang.

---

## RC1 Exit Criteria

Each item should be checked off with real evidence (an event-log Job #, a dataset name/path, a Decision Log entry in `dogfooding-checklist.md`) — not a feeling.

- [x] Ollama verified end-to-end (a real tool-call, not mocked) — 2026-07-16, `qwen2.5:3b`, `logs/events.log` Job #1 (`create_customer`) and Job #2 (`list_customers`) in that server run, plus a further Job #1 (`create_product`) after a restart. See Decision Log in `dogfooding-checklist.md`.
- [ ] At least 5 real datasets imported
- [ ] At least 100 successful natural-language requests executed
- [ ] No architecture changes required
- [ ] No critical bugs remaining
- [ ] Prompt quality considered stable
- [ ] All discovered issues triaged (fixed, or logged as a post-RC1 backlog item)

## RC1 Success Metrics

Observational only — no new implementation or dashboard, just numbers tallied by hand (or read off `logs/events.log`) during the dogfooding period:

- Total natural-language requests
- Successful requests
- Failed requests
- Clarification requests (LLM asked instead of acting)
- Prompt adjustments made
- Average response time
- Import jobs completed
- Rollbacks executed
- Duplicate reports generated

## RC1 Backlog Policy

Any enhancement request discovered during RC1 is recorded only. It is not implemented during RC1 unless: it fixes a critical bug, it blocks normal usage, or it is a prompt/documentation improvement. Everything else is deferred to the Phase 3 planning session.

---

## RC1 Approved

The Local AI Agent is now considered feature-complete for its current scope. Development enters a controlled dogfooding period. The objective is to validate the product through real-world usage, not to expand its functionality. Phase 3 (Vision, WhatsApp, OCR, and external integrations) will begin only after RC1 exit criteria are satisfied.

See [`dogfooding-checklist.md`](dogfooding-checklist.md) for the day-to-day usage plan and Decision Log.
