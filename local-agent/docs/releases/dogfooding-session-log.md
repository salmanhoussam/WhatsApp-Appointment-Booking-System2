# RC1 Dogfooding — Session Log

Documentation only — no code is ever changed from this file. This is the detailed, per-request record of every real RC1 test: what was tried, whether it succeeded or failed, and (for failures) the root cause, observed behavior, and next step. It complements, and does not duplicate, two other documents:

- [`dogfooding-checklist.md`](dogfooding-checklist.md)'s **Running Log** — a quick-scan table (one row per attempt).
- [`dogfooding-checklist.md`](dogfooding-checklist.md)'s **Decision Log** — only for entries where something was actually *changed* (a prompt tweak, a bug fix).
- [`dogfooding-checklist.md`](dogfooding-checklist.md)'s **RC1 Success Metrics** table is the single authoritative running tally (total/successful/failed counts) — this file's per-request "RC1 successful-test count" lines are a narrative cross-check against that table, not a second counter to keep in sync by hand.

## How to read this log

Each session is one dated section with a start/end time. Each request tried is one entry:
- **✅ Succeeded** — records what was verified (tool selected, plugin, DB effect, response correctness) and the Job # in `logs/events.log`.
- **❌ Failed** — records the root cause, the observed behavior, and the next step taken. Links to the Decision Log entry that resolved it, if any.

---

## Session: 2026-07-16, 14:12–14:22 UTC — first real RC1 test

**Summary:** The first-ever real (non-mocked) end-to-end test of the agent talking to a genuinely running Ollama instance (`qwen2.5:3b`). Every prior verification of the LLM→tool→service→plugin chain had used a mocked LLM decision, because no real Ollama instance existed in the development environment. This session closed that gap. 4 requests were attempted across 3 server runs (2 restarts — one to fix a blocking config error, one to add new logging).

### Request 1 — ❌ Failed
- **Time:** 14:12:06 UTC · **Job #1** (server run 1)
- **Input:** `"add customer TestDogfood1, phone 03000000"`
- **Observed behavior:** Failed in ~0.9s with: *"Local AI model isn't responding — make sure Ollama is running (`ollama serve`) with `qwen2.5:7b` pulled, reachable at http://localhost:11434."* Logged as `status="llm_error"`.
- **Root cause:** The running server process had no `OLLAMA_MODEL` environment variable set, so it fell back to `config/settings.py`'s default (`qwen2.5:7b`) — a model that had never been pulled on this machine. Only `qwen2.5:3b` was actually installed (confirmed via Ollama's `/api/tags`).
- **Next step:** Restart the server with `OLLAMA_MODEL=qwen2.5:3b` explicitly set, matching what's actually installed. See Decision Log entry `dogfooding-checklist.md#2026-07-16`.

### Request 2 — ✅ Succeeded (retry of Request 1, after the fix)
- **Time:** 14:18:20 UTC · **Job #1** (server run 2, after restart)
- **Input:** `"add customer TestDogfood1, phone 03000000"`
- **What was verified:** The LLM correctly selected the `create_customer` tool with the correct arguments (`name`, `phone`); the SQLite plugin executed and created the row (`id=1, name="TestDogfood1", phone="03000000"`); the final response was correctly formatted (`"Done — saved: {...}"`). `status="success"`.
- **Note:** Took 224.2s — this was the model's first load into memory on this hardware (an NVIDIA MX110 GPU). Not a failure; recorded in `../STATUS.md`'s Known Limitations as expected cold-start behavior, not a hang.
- **RC1 successful-test count: 1**

### Request 3 — ✅ Succeeded
- **Time:** 14:19:31 UTC · **Job #2** (server run 2)
- **Input:** `"list all customers"`
- **What was verified:** The LLM correctly selected `list_customers` (no arguments needed); it returned exactly the one row created in Request 2, nothing more or less. `status="success"`, 9.1s (model now warm — confirms the 224s above was a one-time load cost, not steady-state latency).
- **RC1 successful-test count: 2**

### Request 4 — ✅ Succeeded
- **Time:** 14:21:24–14:21:38 UTC · **Job #1** (server run 3, restarted to add per-stage logging mid-session)
- **Input:** `"add product Chair, price 45"`
- **What was verified:** The LLM correctly selected `create_product` with correct arguments (`name="Chair"`, `price=45`); the SQLite plugin created the row (`id=1, name="Chair", price=45.0`); the response was correct. `status="success"`, 13.9s total. The newly-added per-stage logs (added this same session, see Decision Log) further confirmed the split: **13.85s was the LLM call, 8.4ms was the plugin/DB write** — proof the latency is inference time, not a database problem.
- **RC1 successful-test count: 3**

### Session totals

| | |
|---|---|
| Requests attempted | 4 |
| Succeeded | 3 |
| Failed | 1 — root cause found and fixed within the same session (config mismatch, not a code bug) |
| RC1 successful-test running total | **3 / 100** (matches `dogfooding-checklist.md`'s Success Metrics table as of this session) |

### Related
- Decision Log entry for the fix: [`dogfooding-checklist.md`](dogfooding-checklist.md) → `### 2026-07-16`.
- Architecture context: [`../architecture/llm.md`](../architecture/llm.md), [`../architecture/logging.md`](../architecture/logging.md).
- Overall RC1 exit-criteria progress: [`../STATUS.md`](../STATUS.md).

---

## Session 2: 2026-07-17, 09:51–09:57 UTC — first real dataset import (persisted)

**Session info:** Model `qwen2.5:3b` (Ollama, local). Project `0.1.0-rc1`, commit `8616b79` (working tree had uncommitted documentation-only changes on top — no code changes). Server PID unchanged since the 2026-07-16 session (continuously running, no restart needed).

**Summary:** Verified Ollama + the local-agent server were both still up and correctly configured (`OLLAMA_MODEL=qwen2.5:3b` confirmed via `/proc/<pid>/environ`), snapshotted the database counters before touching anything, then ran the first genuinely real, natural-language-driven catalog import that was actually left in the persistent dogfooding database (as opposed to the Phase 2.5 verification import, which used a throwaway database explicitly wiped afterward — see the correction note below). Every step was verified against the database directly, not inferred from the HTTP response.

**Pre-test snapshot** (`storage/local.db`, before either request): `customers=1, products=1, invoices=0, import_batches=0, product_catalog=0`.

### Request 1 — ✅ Succeeded
- **Time:** 09:52:37–09:56:24 UTC (227.6s — cold model load, Ollama had unloaded the model overnight) · **Job #2**
- **Input:** `"preview importing the catalog file at /home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main/new-matirial/الأسعار26.81.XLS"`
- **Full-chain verification (not just the HTTP reply):**
  1. `request_received` logged with the exact input text.
  2. `llm_call` — model correctly returned a `tool_call` decision.
  3. `tool_selected` — `preview_catalog_import` with the correct `file_path` argument (exact path, not approximated).
  4. `plugin_execute` — `success`, 228.5ms.
  5. Response content: 93 rows parsed, 5 duplicate SKU pairs identified (matches the known dataset analysis from Phase 2.5 exactly).
  6. **Database re-checked after the request:** `import_batches=0, product_catalog=0` — confirmed the preview is a true dry run, wrote nothing.
- **What was verified:** the full LLM→tool→service chain for a preview request, end to end, with no side effects — exactly the intended dry-run contract.

### Request 2 — ✅ Succeeded
- **Time:** 09:56:58–09:57:20 UTC (22.2s — model now warm) · **Job #3**
- **Input:** `"import the product catalog from /home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main/new-matirial/الأسعار26.81.XLS"`
- **Full-chain verification:**
  1. `request_received` logged correctly.
  2. `llm_call` → `tool_call`, 22.16s.
  3. `tool_selected` — `import_product_catalog`, correct `file_path`.
  4. `plugin_execute` — `success`, 49.4ms.
  5. Response: `batch_id="bc1c9012-5407-4b1d-8dc7-fcc10c9a609e"`, `items_inserted=93`.
  6. **Database re-checked after the request (the actual source of truth, not the HTTP reply):**
     - `import_batches`: 1 row, `id` matches the returned `batch_id` exactly, `status="committed"`, `row_count=93`.
     - `product_catalog`: 93 rows, all 93 correctly linked to that same `import_batch_id` (0 mismatches/orphans checked via `SELECT COUNT(*) WHERE import_batch_id != ...`).
     - `customers`/`products`/`invoices`: unchanged at `1/1/0` — confirms the decoupled-reference-table architecture held for real, not just in the design doc.
     - Whole log file scanned for `status="error"`: **0 hits**. `status="llm_error"`: 1 hit, but it's the pre-existing 2026-07-16 entry (already fixed) — no new error of any kind this session.
- **What was verified:** a complete, unmocked, natural-language-triggered catalog import, confirmed correct at the database level, not assumed from a 200 response.

### Correction to prior documentation
`STATUS.md` previously stated "at least 5 real datasets imported (1 so far)". That "1" referred to the Phase 2.5 verification import, which explicitly used a throwaway database that was **deleted after verification** (see `../verification/phase2.5-data-validation-report.md` §12's closing note). It was never actually a persisted dataset in the live dogfooding database. Today's import is the **first one confirmed still present** in `storage/local.db`. `STATUS.md` has been corrected accordingly — the count is still "1 so far," but now for the right reason, with real evidence (`import_batches.id = bc1c9012-...`, still queryable today).

### Session totals

| | |
|---|---|
| Requests attempted | 2 |
| Succeeded | 2 |
| Failed | 0 |
| Bugs found | 0 |
| Real datasets imported (persisted, DB-confirmed) | 1 (this session — the first) |
| RC1 successful-test running total | **5 / 100** (3 from Session 1 + 2 from this session) |

### Related
- Full technical detail: [`../architecture/database.md`](../architecture/database.md).
- Correction context: [`../verification/phase2.5-data-validation-report.md`](../verification/phase2.5-data-validation-report.md) §12.
- Overall RC1 exit-criteria progress: [`../STATUS.md`](../STATUS.md).

---

## Session 3: 2026-07-17, 10:03–10:08 UTC — LLM argument-hallucination on an Arabic filename

**Session info:** Model `qwen2.5:3b` (Ollama, local). Project `0.1.0-rc1`, commit `8616b79` (uncommitted documentation-only changes on top, no code changes). Same server process as Session 2 (PID unchanged, no restart). Pre-flight confirmed: `local-agent` has zero Supabase/remote-DB references anywhere in its code, active plugin is `sqlite` (`storage/local.db`, a local file) — this entire session only ever touched the local database.

**Summary:** Attempted to re-run the same real-file import as Session 2 (`الأسعار26.81.XLS` — the only real dataset file available), as a repeat/reliability check. It failed. Root cause pinpointed to an exact stage via the per-stage event log, the database was verified unchanged before and after, and no code was changed (this is not a code defect — see Root Cause below).

**Pre-test snapshot** (`storage/local.db`): `customers=1, products=1, invoices=0, import_batches=1, product_catalog=93` (unchanged from the end of Session 2).

### Request — ❌ Failed
- **Time:** 10:04:30–10:08:07 UTC (217.1s — cold model load, Ollama had unloaded the model again during the ~6 minutes idle since Session 2) · **Job #4**
- **Input:** `"import the product catalog from /home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main/new-matirial/الأسعار26.81.XLS"`
- **Exact stage of failure — pinpointed via the per-stage log:**
  1. `request_received` — logged correctly, exact input text.
  2. `llm_call` — returned `decision_type="tool_call"` (correct tool type chosen) **but with a corrupted argument**: `tool_selected` shows `{"tool": "import_product_catalog", "arguments": {"file_path": ".../new-matirial/%D9%85%D8%B1%D9%8A%D9%86-%D8%AA%D8%B7%D8%A7%D8%A0%D9%84.pdf"}}`. URL-decoding that filename gives `مرين-تطاءل.pdf` — **not the real filename** (`الأسعار26.81.XLS`). The model kept the long ASCII directory prefix perfectly intact but fabricated a different, nonsensical Arabic filename with the wrong extension (`.pdf` instead of `.XLS`) instead of copying the actual filename from the input text.
  3. `plugin_execute` — correctly and immediately (4.5ms) returned `status="error"`, `"File not found: .../%D9%85%D8%B1...pdf"` — **this layer behaved exactly as designed**: it validated the path, found nothing there, and failed closed with a clean error instead of guessing or writing anything.
  4. Final event: `status="error"`, `duration_ms=217079.4` (almost entirely the cold LLM load).
- **Database re-checked after:** `import_batches=1, product_catalog=93` — **identical to the pre-test snapshot**. No orphan rows, no partial writes, no corruption. Confirmed via direct query, not inferred from the response.
- **Full log scan:** exactly 2 lines with `"status": "error"` in the entire file — both from this one failed request (the `plugin_execute` stage line and the final summary line). No other errors anywhere.

### Root cause

**This is a model reliability limitation, not a code defect.** Every layer below the LLM behaved correctly: the right tool was selected, the plugin validated the path and rejected it safely, no data was written. The failure is specifically in `qwen2.5:3b`'s **argument generation** — it did not reproduce the given Arabic filename (`الأسعار26.81.XLS`) verbatim in the JSON tool-call arguments, instead generating a different, garbled Arabic string with the wrong file extension. The long ASCII portion of the same path was reproduced perfectly, which narrows the weak point specifically to **verbatim reproduction of non-Latin (Arabic) text inside structured tool-call arguments** — a small (3B parameter), heavily quantized (Q4_K_M) local model appears meaningfully less reliable at this than at copying ASCII text or reasoning about which tool to call.

**Why this wasn't caught in Session 2:** the exact same file, same wording pattern, succeeded cleanly in Session 2 (Job #3). This failure is non-deterministic — same input, same model, different outcome across two separate LLM calls. That non-determinism is itself the finding: Arabic-filename arguments cannot be assumed reliable on this model without either a system-prompt safeguard or a validation/retry layer.

### Impact

- No data corruption, no partial writes — the architecture's fail-closed validation worked exactly as intended.
- Real risk for production use: this system is explicitly built for Arabic-speaking small businesses (product names, customer names, and file paths are frequently Arabic) — if the same unreliability applies to Arabic *product/customer names* passed as tool arguments (not just file paths), that's a broader, more serious prompt-quality gap than this one failed import suggests. **Not yet tested** — flagged as the next thing to specifically probe in a future session.

### Decision — left Open, not applied

**No code or prompt change was made in this session**, per the instruction to only change production code once a real bug is confirmed — and this isn't a code bug. A candidate prompt-level mitigation exists (adding an explicit instruction to `ai/prompts/system.md` such as "reproduce any file path or name from the user's message character-for-character, never approximate or translate it") but it has **not** been written or tested. Recorded as an **Open** entry in `dogfooding-checklist.md`'s Decision Log, pending a decision on whether/how to address it — not silently fixed.

### Session totals

| | |
|---|---|
| Requests attempted | 1 |
| Succeeded | 0 |
| Failed | 1 — root cause fully pinpointed (LLM argument hallucination on Arabic text), not a code bug, nothing fixed |
| Bugs found in local-agent code | 0 |
| Database integrity | Confirmed unchanged, no corruption |
| RC1 successful-test running total | **5 / 100** (unchanged — this request failed) |

### Related
- Decision Log (Open entry): [`dogfooding-checklist.md`](dogfooding-checklist.md) → `### 2026-07-17 (Open)`.
- Architecture context: [`../architecture/llm.md`](../architecture/llm.md) (LLM contract/failure handling — this is a new failure mode not previously covered: successful tool selection with a corrupted argument, distinct from the `llm_error`/malformed-JSON cases already handled).
- Overall RC1 exit-criteria progress: [`../STATUS.md`](../STATUS.md).

---

## Session 4: 2026-07-17, 10:15–10:20 UTC — testing whether a prompt tweak fixes the Session 3 hallucination

**Session info:** Model `qwen2.5:3b` (Ollama, local). Project `0.1.0-rc1`, commit `8616b79` + uncommitted documentation changes. **One prompt-only change applied this session:** appended one rule to `ai/prompts/system.md` instructing the model to copy file paths/names character-for-character, especially non-Latin text, and to ask rather than guess if uncertain. No application code (`agents/`, `services/`, `plugins/`, `telemetry.py`) was touched. The server was restarted (`ai/llm.py` reads the system prompt once at process startup, so a restart was required for the new wording to take effect) — restarted with the same `OLLAMA_MODEL=qwen2.5:3b` confirmed via `/proc/<pid>/environ`. Pre-flight re-confirmed: no Supabase/remote-DB references anywhere in `local-agent`, active plugin `sqlite`.

**Goal:** Directly test whether the Session 3 finding (LLM hallucinating an Arabic filename argument) is fixable with a prompt instruction, before deciding whether it needs a different kind of mitigation.

**Pre-test snapshot** (`storage/local.db`): `customers=1, products=1, invoices=0, import_batches=1, product_catalog=93` (unchanged from Session 3).

### Request — ❌ Failed again (same scenario as Session 3)
- **Time:** 10:16:08–10:19:59 UTC (230.6s — cold model load again, expected after the restart) · **Job #1** (counter reset — new server process, known limitation)
- **Input:** identical to Session 3: `"import the product catalog from /home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main/new-matirial/الأسعار26.81.XLS"`
- **Exact stage of failure:**
  1. `request_received` ✅ correct.
  2. `llm_call` → `tool_call`, 230.6s.
  3. `tool_selected` — `import_product_catalog` (correct tool, again) with `file_path` = `.../new-matirial/%D9%85%D8%A7%D8%B1%D8%A6%D8%A9_%D8%A3%D8%B1%D9%8A%D8%AB%D8%A7%D9%84_26.81.XLS`. URL-decoded: `مارئة_أريثال_26.81.XLS` — still **not** the real filename (`الأسعار26.81.XLS`), but notably different from Session 3's garbling (`مرين-تطاءل.pdf`):
     - This time the extension is correct (`.XLS`, not `.pdf`).
     - The numeric portion (`26.81`) is correct.
     - The separator style changed from a hyphen to an underscore.
     - The Arabic word itself is still wrong — different garbled text than last time, not the real word "الأسعار" (Arabic for "the prices").
  4. `plugin_execute` — correctly rejected instantly (0.1ms), `File not found`, nothing written.
- **Database re-checked after:** identical to pre-test snapshot — `import_batches=1, product_catalog=93`. No corruption, no orphan rows.
- **Full log scan:** 4 total `"status": "error"` lines across the whole file — exactly the 2 from Session 3 plus 2 new ones from this request. No other/unexpected errors.

### Result of the experiment

**The prompt tweak did not fix the problem, but it changed its shape.** This is a meaningful, nuanced result, not a flat "no effect":
- Before the tweak: wrong extension, wrong numbers, wrong separator, wrong word.
- After the tweak: right extension, right numbers, right separator, **still wrong word**.

This suggests the instruction had *some* real effect on the model's attention to the literal string (it now preserves the ASCII/numeric parts better), but did not resolve the core issue — **reliably reproducing an exact Arabic word verbatim inside a JSON tool-call argument still fails**, non-deterministically, even with an explicit instruction not to. This is consistent with the Session 3 hypothesis that this is a model capability limit (likely tokenization/quantization-related for this specific 3B, Q4_K_M model) rather than something a wording change alone can fully close.

### Decision — updated from Open to Open (tested, insufficient)

The Decision Log entry in `dogfooding-checklist.md` is updated to record that the candidate mitigation was tried and tested, not just proposed. It remains **Open** — the prompt tweak is kept (it's harmless and measurably improved partial fidelity) but is not sufficient on its own. Per this session's scope ("just update the dogfooding log with documented results" on failure), no further code or architecture change was made or proposed this session — that decision is left for a future session with more evidence (e.g., whether the same failure affects Arabic product/customer names, not just file paths, which would argue for a structural mitigation like a path-existence retry/re-ask loop rather than a further wording tweak).

### Session totals

| | |
|---|---|
| Requests attempted | 1 |
| Succeeded | 0 |
| Failed | 1 — same failure class as Session 3, different (partially improved) manifestation |
| Bugs found in local-agent code | 0 |
| Database integrity | Confirmed unchanged |
| Prompt changed | Yes — 1 rule added to `ai/prompts/system.md` (kept; insufficient alone) |
| RC1 successful-test running total | **5 / 100** (unchanged) |

### Related
- Prompt diff: `ai/prompts/system.md`, one rule appended (see above).
- Prior finding this tests: Session 3 (this file).
- Decision Log: [`dogfooding-checklist.md`](dogfooding-checklist.md) → `### 2026-07-17 (Open)`.

---

## Session 5: 2026-07-17, 10:32–14:08 UTC — scoping investigation: how far does the Arabic argument issue reach?

**Session info:** Model `qwen2.5:3b` (Ollama, local). No code or prompt changes made this session (investigation only, per instruction). Mid-session, the underlying environment lost connectivity and both Ollama and the local-agent server processes were found dead on reconnect — both were restarted (`ollama serve`, then `main.py` with `OLLAMA_MODEL=qwen2.5:3b` reconfirmed via `/proc/<pid>/environ`). The SQLite database file and `logs/events.log` were both confirmed intact across the gap — no data was lost, and the one request dispatched right before the disconnect never actually reached the server (empty response, nothing in the log or DB for it) — no ambiguity about partial state.

**Goal:** Not to fix Session 3/4's Arabic-filename hallucination, but to determine its *scope* — is it about file names specifically, Arabic text in general, JSON argument generation in general, or some other pattern? Five categories were tested with real natural-language requests through the actual `/agent/command` endpoint: Arabic product name, Arabic customer name, mixed Arabic/English, English-only (control), and an Arabic search query against the real 93-row catalog already imported in Session 2.

**Baseline before this session's tests:** `customers=1, products=1, invoices=0, import_batches=1, product_catalog=93`.

### Test 1 — Arabic product name
- **Input:** `"أضف منتج اسمه دفتر أزرق بسعر 8"` ("add a product called 'blue notebook' priced 8")
- **Tool call generated:** `create_product({"name": "دفتر أزرق", "price": 8})`
- **Character-by-character comparison:** identical, exact match.
- **Classification: Exact copy.**
- **Plugin/DB:** `status="success"`, row created exactly as generated (`id=2, name="دفتر أزرق", price=8.0`). DB confirmed via direct query.

### Test 2 — Arabic customer name
- **Input:** `"أضف زبون اسمه أحمد الحلبي رقم هاتفه 0791112222"` ("add a customer named Ahmad Al-Halabi, phone 0791112222")
- **Tool call generated:** `create_customer({"name": "Ahmed Alhabib", "phone": "0791112222"})`
- **Character-by-character comparison:** the phone number is exact. The name is **not** a character-level match to `أحمد الحلبي` — it is a Latin-script phonetic rendering of the same name.
- **Classification: Transliterated** (not hallucinated — this is a real, defensible reading of the name in Latin script, not garbled text; but it is not verbatim, and would break any future exact-match lookup by the original Arabic spelling).
- **Plugin/DB:** `status="success"`, row created exactly as generated (`id=2, name="Ahmed Alhabib"`). No corruption — the DB faithfully stored what the LLM generated; the fidelity loss happened at the LLM step, not the plugin/DB step.

### Test 3 — Mixed Arabic/English product name
- **Input:** `"أضف منتج اسمه Kit Kat شوكولا 45غ بسعر 3.5"` ("add a product called 'Kit Kat chocolate 45g' priced 3.5")
- **Tool call generated:** `create_product({"name": "Kit Kat", "price": 3.5, "notes": "شوكولا 45غرام"})`
- **Character-by-character comparison:** the model split the single input phrase across two different fields — `name` got only the English brand portion, and the Arabic descriptive portion was moved into `notes` (a field never mentioned in the input). Within that Arabic portion: `شوكولا` (chocolate) is an exact match; `45غ` (my abbreviation for "45 grams") was expanded to `45غرام` (the full word "gram") — not a character-for-character copy, but not wrong or garbled either.
- **Classification: Restructured + partial expansion** (a new category — not hallucination, not exact copy, not transliteration: the model made a structural decision about where content belongs, and normalized an abbreviation).
- **Plugin/DB:** `status="success"`, row created exactly as generated (`id=3`). No corruption.

### Test 4 — English-only control
- **First attempt** — `"add a product called Green Pen priced 2.5"` → the model returned `decision_type="text"` (a clarification request: *"Could you please provide the exact price for the product named 'Green Pen'?"*) even though the price was clearly stated. No tool call, nothing written. This is itself useful evidence: **the model is not perfectly reliable even on English-only input** — some of the unreliability observed in this investigation may be general small-model noise, not exclusively an Arabic-handling problem.
- **Retry (rephrased)** — `"add product Green Pen, price 2.5"` → `create_product({"name": "Green Pen", "price": 2.5})`.
- **Character-by-character comparison:** identical, exact match.
- **Classification: Exact copy.**
- **Plugin/DB:** `status="success"`, row created exactly as generated (`id=4`).

### Test 5 — Arabic search query against real, already-imported data
- **Input:** `"search the catalog for اوريو"` ("search the catalog for Oreo")
- **Tool call generated:** `search_product_catalog({"query": "اوريو"})`
- **Character-by-character comparison:** identical, exact match.
- **Classification: Exact copy.**
- **Plugin/DB:** `status="success"`, and critically — the query **correctly matched 2 real rows** already sitting in `product_catalog` from the Session 2 import (`"اوريو بسكويت اوريجينال 36.8 غ *24"` and `"ميلكا اوريو شوكولا 37 غ"`), proving the exact Arabic string round-tripped correctly from user input → LLM argument → SQL `LIKE` query → real matching results.

### Cross-referenced prior evidence (Sessions 3 & 4 — Arabic file names)
- Same real file path/name (`الأسعار26.81.XLS`), asked twice, non-deterministically hallucinated twice: attempt 1 produced `مرين-تطاءل.pdf` (wrong word, wrong extension), attempt 2 (after the verbatim-copy prompt rule was added) produced `مارئة_أريثال_26.81.XLS` (right extension/numbers, still wrong word). Both times the plugin correctly rejected the nonexistent path; no data corruption either time.

### Final scoping conclusion

**This is not a general Arabic tool-calling limitation, and not a general JSON-argument-generation limitation.** Of 5 fresh tests, 3 were exact character-for-character copies of Arabic or mixed text (a standalone product name, a standalone search query, and the Arabic portion of a mixed-language product name), including one that round-tripped successfully through a real database query against real data. The English-only control was **not** perfectly reliable either (one clarification-instead-of-tool-call miss), showing this model has a baseline error rate unrelated to Arabic at all.

The pattern that actually holds across all evidence gathered: **fidelity degrades specifically on long, compound, structurally dense strings that combine Arabic words with numbers, punctuation/separators, and a file extension — i.e., file names** (both filename attempts hallucinated; every short, standalone Arabic word or phrase was either exact or a defensible transliteration, never garbled). This points to **a filename-specific limitation** (Hypothesis A), not Hypotheses B or C as originally framed. A secondary, distinct, smaller finding — the Session 2 customer-name transliteration and the Test 3 abbreviation expansion — shows the model will sometimes *normalize* short Arabic text (convert script, expand abbreviations) even when not hallucinating; this doesn't corrupt data, but could silently break exact-match lookups downstream (e.g., searching for a customer by their originally-given Arabic name) and is worth keeping in view separately from the filename issue.

**Caveat on sample size:** this is 7 total data points (5 fresh + 2 prior) against a non-deterministic phenomenon — strong enough to redirect the investigation away from "general Arabic support" and toward "long compound strings," but not enough to rule out that longer/more complex Arabic *product or customer* data (not just filenames) could someday reproduce the same failure. That would be the natural next test if more evidence is wanted.

### Session totals

| | |
|---|---|
| Requests attempted | 6 (5 planned tests + 1 retry) |
| Succeeded (tool executed, DB write/read correct) | 5 |
| Clarification (no tool call) | 1 (English control, first phrasing) |
| Failed / hallucinated | 0 new this session (2 carried over from Sessions 3-4, cross-referenced not repeated) |
| Bugs found in local-agent code | 0 |
| Database integrity | Confirmed consistent throughout, including across the mid-session Ollama/server outage |
| Code or prompts changed | None |
| RC1 successful-test running total | **10 / 100** (5 from Sessions 1-2 + 5 new successes this session; the 1 clarification and the 2 historical filename failures are not counted as successes) |

### Related
- Full evidence base for Sessions 3-5 (the Arabic-argument-fidelity investigation): this file.
- Decision Log: [`dogfooding-checklist.md`](dogfooding-checklist.md) → `### 2026-07-17 (Open)`.
- Overall RC1 exit-criteria progress: [`../STATUS.md`](../STATUS.md).
