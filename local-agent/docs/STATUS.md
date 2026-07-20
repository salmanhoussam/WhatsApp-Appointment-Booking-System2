# Status

**Rewritten in place, not appended to** — this file always describes the current state only. History lives in [decisions/](decisions/) and [releases/](releases/).

## Phase

**RC1** (`0.1.0-rc1`) — feature-frozen, in real-usage dogfooding. See [decisions/0004-rc1-declared.md](decisions/0004-rc1-declared.md).

## What's in scope right now

Only isolated bug fixes, prompt wording tweaks, and documentation updates. Everything else goes on [roadmap.md](roadmap.md) instead of being built now. See [releases/rc1-release-notes.md](releases/rc1-release-notes.md)'s Backlog Policy.

## RC1 Exit Criteria — current state

- [x] Ollama verified end-to-end (a real tool-call, not mocked) — 2026-07-16, `qwen2.5:3b`, 3 real requests (`create_customer`, `list_customers`, `create_product`). See `releases/dogfooding-checklist.md`'s Running Log.
- [ ] At least 5 real datasets imported (1 so far, DB-confirmed 2026-07-17 — the original 93-row POS export, `import_batches.id=bc1c9012-...`, still present in `storage/local.db`. Corrected 2026-07-17: an earlier note claimed this was already true from Phase 2.5, but that import used a throwaway database deleted after verification — it never actually persisted. See `dogfooding-session-log.md` Session 2.)
- [ ] At least 100 successful natural-language requests executed (5 so far)
- [ ] No architecture changes required (holding — none needed yet; today's failure was root-caused to the LLM, not the architecture — see below)
- [ ] No critical bugs remaining (1 code bug found and fixed: `OLLAMA_MODEL` mismatch. 1 non-deterministic LLM argument-hallucination found 2026-07-17, not a code bug — see Known Limitations)
- [ ] Prompt quality considered stable (not stable yet: 2026-07-17 found the LLM can hallucinate a tool argument — specifically an Arabic filename — instead of copying it verbatim from the input, non-deterministically. See `dogfooding-checklist.md`'s Decision Log, Open entry.)
- [ ] All discovered issues triaged (1 Open — the Arabic-argument-hallucination finding above, pending a decision on mitigation. Everything else triaged.)

Full checklist with evidence links: [releases/rc1-release-notes.md](releases/rc1-release-notes.md). Detailed per-request session history (date/time, root cause on failure, what was verified on success): [releases/dogfooding-session-log.md](releases/dogfooding-session-log.md).

## Known limitations (still true, carried forward honestly)

- Event-log Job IDs are in-memory only — reset to 1 on every server restart.
- Error handling isn't classified into validation/bug/infrastructure-failure types — everything surfaces as a generic `{"error": "..."}`.
- No automated test suite — every verification so far has been manual.
- The Postgres plugin has full code parity with SQLite but has never been run against a live Postgres server.
- 4 tool types have real (non-mocked) Ollama verification so far (customers, products, catalog preview, catalog import) — invoices and catalog search/list are still untested against a real model.
- First LLM call after Ollama loads/unloads a model is very slow on modest hardware (minutes, observed once) — not a bug, but worth knowing.
- **PII/business data in `logs/events.log` is unredacted and unbounded** — every customer/product/invoice detail ever sent through `/agent/command` stays in plaintext forever, in a file readable by any local OS user (`664` permissions). Found via [architecture/asset-inventory.md](architecture/asset-inventory.md), 2026-07-17.
- **`storage/local.db` is readable by any local OS user** (`644` permissions), not scoped to the service account. Same source as above.
- **The default Postgres DSN embeds a placeholder credential** (`postgres:postgres`) — live risk only if `LOCAL_AGENT_PLUGIN=postgres` is ever set without also overriding `LOCAL_AGENT_POSTGRES_DSN`. Same source as above.
- **The LLM can non-deterministically hallucinate a tool argument instead of copying it verbatim** — observed 2026-07-17 with an Arabic filename (`qwen2.5:3b` generated a different, garbled filename with the wrong extension; the identical input had succeeded correctly minutes earlier). The plugin layer correctly rejected the bad path with no data corruption, but this is an open prompt-reliability question, not yet mitigated — untested whether it also affects Arabic product/customer names passed as arguments. See `releases/dogfooding-session-log.md` Session 3 and `releases/dogfooding-checklist.md`'s Decision Log (Open).

## Next milestone

Continue dogfooding toward the exit criteria above — see [releases/dogfooding-checklist.md](releases/dogfooding-checklist.md) for the daily-use checklist and Decision Log. Phase 3 (WhatsApp/vision/OCR/new plugins, see [roadmap.md](roadmap.md)) does not start until RC1 exit criteria are satisfied.
