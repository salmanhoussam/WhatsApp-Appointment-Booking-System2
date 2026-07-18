# RC1 Dogfooding Checklist

See [`rc1-release-notes.md`](rc1-release-notes.md) for the Definition of RC1, Exit Criteria, Success Metrics, and Backlog Policy this checklist operationalizes. **Boundary for this whole period: no new features, no architecture changes.** Only prompt wording tweaks and clearly-isolated bug fixes are in scope, and each one gets a Decision Log entry below — everything bigger goes on the post-RC1 backlog, not into RC1 itself.

---

## One-Time Setup

1. Install [Ollama](https://ollama.com), then `ollama serve`
2. `ollama pull qwen2.5:7b` (or `llama3.1:8b` — set `OLLAMA_MODEL` if different)
3. `cd local-agent && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. `python main.py` (serves on `http://127.0.0.1:8010`)
5. `curl -X POST localhost:8010/agent/setup -H "Content-Type: application/json" -d '{}'`

## Daily-Use Checklist (repeat each session)

- [ ] Import at least one real catalog file (`"import the product catalog from <path>"`)
- [ ] Search product prices (`"search the catalog for <product>"`)
- [ ] Add new data via natural language (a customer, a product, an invoice)
- [ ] Deliberately try awkward/varied phrasings — not just the clean README examples (misspellings, indirect requests, mixed Arabic/English, incomplete info)
- [ ] Read through `logs/events.log` for anything from this session — look for `status="error"` or `status="llm_error"`, and for tool choices that don't match what was actually meant
- [ ] Note anything the model got wrong or misunderstood, even if it recovered

## Running Log

One row per session. `Job #` references the corresponding entry in `logs/events.log`. For the detailed per-request narrative (root cause on failure, what was verified on success) see [`dogfooding-session-log.md`](dogfooding-session-log.md).

| Date | Input tried | Expected | Actual | Job # | Prompt tweak needed? |
|------|-------------|----------|--------|-------|----------------------|
| 2026-07-16 | "add customer TestDogfood1, phone 03000000" | create_customer tool call | ✅ Correct tool, correct args, row created. 224.2s (cold model load) | 1 | No |
| 2026-07-16 | "list all customers" | list_customers tool call | ✅ Correct, returned the row just created. 9.1s (warm) | 2 | No |
| 2026-07-16 | "add product Chair, price 45" | create_product tool call | ✅ Correct tool, correct args, row created. 13.9s (warm); stage logs show 13.85s LLM / 8ms plugin | 1 (after restart) | No |
| 2026-07-17 | "preview importing the catalog file at .../الأسعار26.81.XLS" | preview_catalog_import, dry run | ✅ Correct tool/args, 93 rows parsed, 5 duplicates found, DB confirmed unchanged after. 227.6s (cold — model unloaded overnight) | 2 | No |
| 2026-07-17 | "import the product catalog from .../الأسعار26.81.XLS" | import_product_catalog, commit | ✅ Correct tool/args. DB-verified: 1 batch (`status="committed"`), 93 product_catalog rows all correctly linked, customers/products/invoices untouched. 22.2s (warm) | 3 | No |
| 2026-07-17 | Same input repeated: "import the product catalog from .../الأسعار26.81.XLS" | Same import_product_catalog call, same correct file_path | ❌ Correct tool selected, but the LLM hallucinated a different, garbled Arabic filename with wrong extension instead of copying the real one. Plugin correctly rejected it (`File not found`), DB confirmed unchanged. Non-deterministic — same input succeeded in the row above. | 4 | Under review — see Decision Log (Open) |
| 2026-07-17 | Same input, after adding a verbatim-copy prompt rule + server restart | Same import, testing if the prompt tweak fixes the hallucination | ❌ Still failed — different hallucinated filename (right extension/numbers this time, still wrong Arabic word). Plugin correctly rejected it, DB confirmed unchanged. Tweak partially helped but didn't fix it. | 1 (new server, counter reset) | Tried — see Decision Log (Open, tested, insufficient) |
| 2026-07-17 | "أضف منتج اسمه دفتر أزرق بسعر 8" (Arabic product name) | create_product tool call | ✅ Exact character-for-character copy: `name="دفتر أزرق"`. Row created correctly. | 2 | No |
| 2026-07-17 | "أضف زبون اسمه أحمد الحلبي رقم هاتفه 0791112222" (Arabic customer name) | create_customer tool call | ⚠️ Tool/phone correct, but name transliterated to Latin script: `name="Ahmed Alhabib"` — not the Arabic original. Not hallucination, not corruption, but not verbatim either. | 1 (new server after mid-session outage) | Noted, not yet decided — see scoping conclusion below |
| 2026-07-17 | "أضف منتج اسمه Kit Kat شوكولا 45غ بسعر 3.5" (mixed Arabic/English) | create_product tool call | ⚠️ Split into `name="Kit Kat"` + `notes="شوكولا 45غرام"`. Arabic word exact; abbreviation "45غ" expanded to "45غرام". Reasonable restructuring, not hallucination. | 2 | No |
| 2026-07-17 | "add a product called Green Pen priced 2.5" (English control) | create_product tool call | ⚠️ Model asked a clarifying question instead of calling the tool, despite price being clearly stated — a non-Arabic-related reliability miss. | 3 | Noted as baseline model reliability, not Arabic-specific |
| 2026-07-17 | "add product Green Pen, price 2.5" (English control, retry) | create_product tool call | ✅ Exact copy: `name="Green Pen", price=2.5`. | 4 | No |
| 2026-07-17 | "search the catalog for اوريو" (Arabic search vs. real imported data) | search_product_catalog tool call | ✅ Exact copy: `query="اوريو"`, correctly matched 2 real rows from the Session 2 import. | 5 | No |

## Decision Log

One entry per real change made during RC1 (prompt tweak or isolated bug fix only, per the Backlog Policy). This is the evidence trail for the "all discovered issues triaged" exit criterion.

```
### YYYY-MM-DD
**Observation:** <what was actually seen>
**Decision:** <what was changed>
**Reason:** <why>
**Status:** <Open | Completed>
```

### 2026-07-16
**Observation:** First real (non-mocked) `/agent/command` requests all failed instantly with `status="llm_error"`. Root cause: the server process had no `OLLAMA_MODEL` env var set, so it defaulted to `qwen2.5:7b` (per `config/settings.py`), but only `qwen2.5:3b` had actually been pulled with `ollama pull`. Confirmed via `logs/events.log` Job #1: `"Local AI model isn't responding... make sure Ollama is running... with qwen2.5:7b pulled..."`.
**Decision:** Restarted the server with `OLLAMA_MODEL=qwen2.5:3b` to match the model actually installed. Also added structured per-stage JSON log lines (`telemetry.log_stage()`, called from `agents/database_agent.py`) for `request_received`, `llm_call`, `tool_selected`, and `plugin_execute` — additive only, written to the same `logs/events.log` file; the existing final-event schema (`log_event()`) is unchanged, so nothing that reads it breaks.
**Reason:** This blocked all real usage (Backlog Policy's "blocks normal usage" carve-out) — not an architecture issue, a setup/env mismatch. The added stage logging was needed to see that a slow response was LLM inference time, not a hang or a plugin/DB problem — directly serves the "note anything the model got wrong or misunderstood" and performance-tracking goals of this checklist.
**Status:** Completed. Confirmed with 3 real end-to-end requests after the fix — see Running Log above. First request after any fresh server start / model unload will be slow (~3-4 min observed once, cold model load into the local GPU); subsequent warm requests were 9-14s.

### 2026-07-17 (Open — tested, insufficient)
**Observation:** Re-importing the exact same file/wording that succeeded cleanly in the row above (`الأسعار26.81.XLS`) failed on a later attempt (Job #4). The LLM correctly chose `import_product_catalog` but generated a corrupted `file_path` argument — a different, garbled Arabic filename with the wrong extension (`.pdf` instead of `.XLS`) instead of copying the real one from the input text. The plugin layer correctly rejected the nonexistent path (`File not found`, 4.5ms, no data written) — confirmed via direct DB query that `import_batches`/`product_catalog` counts were identical before and after. This is non-deterministic: same model, same input pattern, different outcome across two calls (see `dogfooding-session-log.md` Session 2 vs. Session 3).
**Decision:** Tested the candidate mitigation: added one rule to `ai/prompts/system.md` instructing the model to copy file paths/names character-for-character, especially non-Latin text, and to ask rather than guess. Restarted the server (required — the system prompt loads once at startup) and re-ran the identical failing scenario (Session 4).
**Result:** Still failed, but the failure changed shape — the second hallucinated filename got the extension, numbers, and separator style right, but the Arabic word itself was still wrong (a different garbled string than the first failure). Partial improvement, not a fix. DB confirmed unchanged again, no corruption either time.
**Reason:** This appears to be a genuine capability limit of the specific model (`qwen2.5:3b`, Q4_K_M quantization) reproducing exact Arabic text inside structured tool-call arguments, not something a wording change alone fully resolves — consistent with a tokenization/quantization-related weak point rather than an instruction-following gap.
**Status:** Open. The prompt rule is kept (harmless, measurably improved partial fidelity) but is not sufficient alone. Next step: test whether the same failure affects Arabic *product/customer names* (not just file paths) — if so, a structural mitigation (e.g., a path-existence check with a re-ask-the-user loop, not just a wording tweak) would need to be proposed and reviewed before implementing anything.

### 2026-07-17 (Scoping investigation — no changes made)
**Observation:** Ran 6 real natural-language requests across 5 categories (Arabic product name, Arabic customer name, mixed Arabic/English, English control ×2, Arabic search against real data) to determine the *scope* of the filename-hallucination finding above — investigation only, no code or prompt changes, per explicit instruction. Full detail: `dogfooding-session-log.md` Session 5.
**Result:** 3 of 5 fresh categories were exact character-for-character matches (Arabic product name, Arabic search query — which also correctly matched real DB rows — and the English control on retry). One (Arabic customer name) was transliterated to Latin script, not hallucinated. One (mixed Arabic/English) was restructured across two fields with one abbreviation expanded, Arabic word itself exact. The English control also produced one non-tool-call miss (asked a clarifying question when the price was already given), showing baseline unreliability unrelated to Arabic.
**Conclusion:** This is **not** a general Arabic tool-calling limitation or a general JSON-argument limitation — short, standalone Arabic strings (product names, search terms) were reliably exact across every test. The failure is specifically correlated with **long, compound, structurally dense strings that combine Arabic text with numbers, punctuation, and a file extension** — i.e., file names specifically — both of the 2 filename attempts hallucinated, 0 of 5 non-filename tests did. A separate, smaller finding: short Arabic text can still be silently *normalized* (transliterated, abbreviations expanded) even without hallucinating — this doesn't corrupt data but could break exact-match lookups later (e.g., searching for a customer by the Arabic name originally given).
**Status:** Open — reclassified from a general concern to a scoped one. No mitigation implemented this session (investigation only). Caveat: 7 total data points against a non-deterministic phenomenon is enough to redirect the investigation, not enough to fully rule out longer Arabic product/customer strings someday reproducing the same failure.

## RC1 Success Metrics — running tally

Update as you go; final numbers get copied into `rc1-release-notes.md` when RC1 exit criteria are evaluated.

| Metric | Count |
|---|---|
| Total natural-language requests | 14 (4 failures/misses + 10 real successes) |
| Successful requests | 10 |
| Failed requests | 3 (1 `llm_error` config mismatch — fixed; 2 LLM argument-hallucination on Arabic filename, same root cause — open, see Decision Log) |
| Clarification requests | 1 (English control, first phrasing — asked instead of using given info) |
| Prompt adjustments made | 1 (2026-07-17 — verbatim file-path/name copy rule; tested, partial improvement only, issue still open) |
| Average response time | ~8-23s warm; several cold-load outliers (200-230s, all after the model unloaded from idle or a server/Ollama restart, see Known Limitations) |
| Import jobs completed | 1 (2026-07-17, 93 items, DB-verified — see `dogfooding-session-log.md` Session 2) |
| Rollbacks executed | 0 |
| Duplicate reports generated | 2 (1 preview + 1 commit, same 5 duplicate pairs both times, as expected) |
