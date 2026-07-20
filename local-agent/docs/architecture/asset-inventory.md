# Asset Inventory & Sensitivity Classification

A real asset inventory for the local-agent system — the actual running components verified on this machine (2026-07-17), not a hypothetical scenario. Built for the "Identify" function (NIST CSF terms: know what you have and how sensitive it is before you can protect it) — this doc doesn't fix anything by itself, it makes the real gaps visible so they can be prioritized. Nothing in this file changes code or configuration.

## Inventory

| Asset | Network access | Owner | Location | Notes | Sensitivity |
|---|---|---|---|---|---|
| **FastAPI service** (`main.py`, port 8010) | Local only — bound to `127.0.0.1:8010`, verified via `ss -tlnp` | Business owner / operator running the agent | On-premises, the shop's own machine | No authentication on any endpoint (`/health`, `/plugins`, `/agent/setup`, `/agent/command`). Currently safe only *because* it's localhost-bound — see Sensitivity note. | **Confidential** |
| **SQLite database** (`storage/local.db`) | None directly — reachable only through the FastAPI service above | Business owner | Local filesystem, `local-agent/storage/` | Contains customer PII (name, phone, email), product pricing, and invoice/financial records. Unencrypted at rest. File permissions `644` — readable by **any local OS user**, not just the service account. This is the single richest concentration of business + customer data on the system. | **Restricted** |
| **Ollama LLM service** (port 11434) | Local only — bound to `127.0.0.1:11434`, verified via `ss -tlnp` | Business owner / whoever installed Ollama | On-premises, same machine | A separate process boundary that receives the **full plaintext** of every request (customer names, phone numbers, product data) as part of the prompt sent to it. Not exposed externally — correct today — but worth naming explicitly: "local" still means a second process sees the data, not zero exposure. | **Confidential** |
| **Event log** (`logs/events.log`) | None — local file | Business owner / anyone with filesystem access | Local filesystem, `local-agent/logs/` | Stores the **full input text and full result** of every request in plaintext JSON-lines, unbounded (no rotation, no redaction, never purged). File permissions `664` — group-writable, world-readable. In practice this mirrors the database's sensitive content in an append-only file nobody is pruning. | **Restricted** |
| **Config / environment** (`config/settings.py`, any `.env`) | N/A (loaded into process memory / file on disk) | Whoever deploys the server | On-premises | `LOCAL_AGENT_POSTGRES_DSN`'s default embeds a placeholder credential (`postgres:postgres`); a real deployment setting a real Postgres password puts a live credential here. Currently unused (SQLite is the active plugin) but the risk activates the moment someone switches to Postgres without overriding the default. | **Restricted** (when real credentials are present) |
| **Catalog import source files** (e.g. `.xls` price lists, operator-supplied paths) | N/A — local files, path given by the operator to `import_product_catalog` | Business owner | Wherever the operator stores exports (outside the project directory) | Contains real business pricing data pulled from a POS/ERP export. Not copied or modified by the importer — only read once at import time. | **Internal-only** |

## Reasoning behind each tier

- **Confidential** (service processes): these don't *store* data at rest themselves, but every request flows through them in plaintext, and a misconfiguration (binding to `0.0.0.0` instead of `127.0.0.1`, exposing the port on a shared network) turns "local only" into "anyone on the LAN" instantly, with zero auth to stop them. The tier reflects that the *only* thing currently protecting them is a network-binding default, not a designed control.
- **Restricted** (database, event log, credentials): these persist sensitive data at rest with no encryption and permissive file permissions. This is the highest tier because compromise here doesn't require intercepting live traffic — reading the file is enough, and the file is readable by more than just the service account.
- **Internal-only** (import source files): real business data, but it's pricing information the operator already handles outside this system (e.g., emails it to themselves, keeps it in a folder) — sensitive to competitors, not personally identifying, and not persisted anywhere new by the importer beyond what's already in the database tier above.

## What this exercise actually found (new, not previously tracked)

Three concrete, previously-undocumented gaps surfaced by doing this inventory for real instead of skipping it:

1. **PII/business data sits unredacted and unbounded in `logs/events.log`** — every customer name/phone/email and every product/invoice detail that ever passed through `/agent/command` is in this file forever, with `664` permissions. Not previously called out as a *data-sensitivity* issue in `docs/architecture/logging.md` (which only flagged the file-growth/rotation angle).
2. **Both `storage/local.db` and `logs/events.log` are readable by any local OS user**, not scoped to the service account — a real, checkable fact (`644`/`664` permissions), not a theoretical concern.
3. **The plaintext default Postgres DSN** (`postgres:postgres`) is a live footgun the moment `LOCAL_AGENT_PLUGIN=postgres` is set without also overriding `LOCAL_AGENT_POSTGRES_DSN` — previously noted in the Phase 1 architecture review as a config-hygiene comment, not as a credential-asset risk in its own right.

None of these are fixed here — per the RC1 boundary (documentation only, no architecture/code changes during dogfooding), they're recorded as findings. See [`../STATUS.md`](../STATUS.md)'s Known Limitations for how they're tracked going forward, and [`../roadmap.md`](../roadmap.md) for when hardening this kind of gap would actually be in scope (Phase 3, once RC1 exit criteria are met, or sooner if any of these ever "blocks normal usage" per the Backlog Policy).

## Related

[`../STATUS.md`](../STATUS.md), [`../architecture/logging.md`](../architecture/logging.md), [`../architecture/database.md`](../architecture/database.md), [`../verification/phase1-architecture-review.md`](../verification/phase1-architecture-review.md) §9 (original error-handling/exposure findings this inventory extends)
