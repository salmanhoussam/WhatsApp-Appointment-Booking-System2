# Investigation — beit-al-fakhar `/store` reported broken, 2026-07-21

**Trigger:** Salman shared a real browser screenshot (Firefox DevTools, `localhost:5173/beit-al-fakhar/store`) showing config-fetch CORS/network errors and an empty "لا توجد عناصر في هذا القسم" page, after an earlier fix (commit `67532db`) was already reported as done. Two claims to check: (1) is the earlier fix actually not working, (2) is this page built with old 2.5D techniques.

**Raw evidence:** `curl-config.txt`, `curl-categories.txt`, `grep-routes.txt`, `grep-catalogpage.txt` (this folder).

## Confirmed Findings

- ✓ The earlier render-loop fix (`67532db`) held. Salman's new screenshot contains no "Maximum update depth exceeded" error at all — only one failed config request plus its one automatic retry. That specific class of bug (infinite loop) is gone.
- ✓ Backend CORS is correctly configured for this origin, checked with a real `Origin: http://localhost:5173` header, not just a bare status code (`curl-config.txt`): `access-control-allow-origin` reflects the real origin, `access-control-allow-credentials: true` present, both on the actual GET and the OPTIONS preflight.
- ✓ Both `/config` and `/catalog/categories` return HTTP 200 with the real Origin header at the time this was checked (`curl-config.txt`, `curl-categories.txt`).
- ✓ `/beit-al-fakhar/store` definitely renders `frontend/src/pages/generic/normal/CatalogPage.jsx` — traced via the actual route registration (`grep-routes.txt`), not assumed. That file contains no parallax/2.5D code; it's a flat grid/list/showcase catalog template.
- ✓ The exact Arabic string shown in the screenshot ("لا توجد عناصر في هذا القسم") exists at line 112 of that same file — direct textual proof the screenshot is this file's empty-state branch, not a different/older page.
- ✓ Causal chain for the empty state, traced through the actual code: a failed config fetch → `moduleKey` stays `null` in the Zustand store → `useCatalog.js`'s category-fetch effect early-returns (`if (!moduleKey || !slug) return`) → categories never fetched → `filteredItems.length === 0` → the empty-state message renders. Not a 2.5D page; a real but different empty state.

## Side Findings

- `frontend/src/pages/catalog/CatalogPage.jsx` is dead code: same creation date as the file actually in use, zero importers anywhere in the codebase (`grep-catalogpage.txt`), superseded architecture (inline `CategoryPill` instead of the shared `design-system/molecules` one). Not the cause of this bug. Logged in `todo_list.md` as tech debt, not deleted (out of scope for this investigation).

## Unknowns

- Whether the page actually renders correctly for Salman right now. All checks above are backend/code-level; no browser tool is available in this environment to load the page and read its live console. This investigation cannot close itself — it requires Salman to hard-refresh and confirm.
- Root cause of the backend's transient failure at the exact moment of Salman's screenshot is not fully diagnosed (no server-side traceback was captured at that moment) — it matches the Prisma cold-start pattern documented repeatedly elsewhere this session, but that specific occurrence wasn't directly proven, only inferred from the pattern and from the fact that repeated checks afterward were clean.

## Recommendation → Decision → Execution

- **Recommendation:** raise the config query's React Query `retry` from 1 to 2 in `useTenantConfig.js`. Reason: absorbs the documented transient-backend-hiccup pattern cheaply on the frontend, since a single failed config fetch cascades into a blank catalog page. Risk: masks a real, persistent backend failure behind one extra retry if the backend is actually down for longer than a couple of request cycles — acceptable given the retry count is still small and bounded, not infinite.
- **Decision:** proceeded without a separate approval step, consistent with this session's established working mode where Salman has repeatedly authorized this class of small, low-risk, well-justified fix during investigation — but recorded here explicitly as its own labeled step, not fused into the finding.
- **Execution:** implemented in `frontend/src/hooks/useTenantConfig.js`, commit `86523dd`.

---

## Addendum, same day — Salman reported a fresh live 500, root cause now confirmed

Previously logged under "Unknowns" (line above): the exact cause of the transient backend
failure was inferred from a pattern, not proven. That gap is now closed with real evidence,
not superseding the earlier honest "unknown" — this is what changed and how.

**New raw evidence:** `burst-test.txt`, `uvicorn-traceback.txt` (this folder).

### Confirmed Findings (new)

- ✓ Reproduced the failure on demand: 20 concurrent requests to `/beit-al-fakhar/config`
  produced 3 real HTTP 500s (`burst-test.txt`). Sequential requests before this were 100% clean —
  the failure is concurrency-dependent, not constant, which is why earlier single-request checks
  kept looking healthy.
- ✓ Found the real server log (`/tmp/baf_migration/uvicorn.log`, located via `readlink
  /proc/<pid>/fd/1`) and captured the actual traceback, not just a client-side status code
  (`uvicorn-traceback.txt`). Root cause: `app/core/tenant.py:184`'s
  `prisma_client.client.find_unique(where={"slug": slug})` intermittently raises
  `prisma.errors.DataError: Can't reach database server at
  aws-1-ap-southeast-2.pooler.supabase.com:6543` — Supabase's pooled connection endpoint,
  under concurrent load, from the same process with zero code changes between a failing request
  and a succeeding one moments later.
- ✓ This confirms the retry bump (commit `86523dd`) was the right kind of mitigation for the
  right kind of problem — a real, external, intermittent connection failure, not a code defect
  in this repository.

### Unknowns (still open, not closed by this addendum)

- Why Supabase's pooler is intermittently unreachable from this environment under burst load —
  that is Supabase/network-side, outside this repository's code, and not diagnosed further here.
- Whether raising `connection_limit` on `DATABASE_URL`, or adding retry/backoff inside the
  backend's own Prisma calls (not just the frontend's React Query retry), would reduce how often
  this surfaces — a real, larger architectural question, not answered or implemented in this
  investigation.
- Whether the retry-of-2 is sufficient under real user traffic patterns (vs. the synthetic
  20-50-request bursts used here) — not tested at production-like concurrency.

### Recommendation → Decision → Execution (new)

- **Recommendation:** treat this as confirmed external infrastructure flakiness for now; no
  further code change beyond the already-applied retry bump. If this keeps surfacing, the next
  real step is backend-side (Prisma `connection_limit` tuning or a retry wrapper around
  `_verify_tenant`'s DB call specifically) — a separate, bigger decision, not a quick fix.
- **Decision:** not implementing the backend-side change now — flagging it as an open
  recommendation for Salman to weigh in on, not proceeding unilaterally, since it touches
  connection-pool configuration shared by every endpoint, not just this one.
- **Execution:** none beyond the evidence-gathering itself; no new commit from this addendum.
