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
