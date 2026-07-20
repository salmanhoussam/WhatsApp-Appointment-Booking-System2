# Runtime Fix Addendum — mountedRef StrictMode bug, 2026-07-21

**Trigger:** After `ROOT_CAUSE_REPORT.md` confirmed the backend/data pipeline was sound, Salman
reported the browser still showed only the loading screen — no categories, no items, nothing.
Correctly rejected another backend-only investigation and demanded runtime tracing. When asked
"can't you open Chrome yourself," a real Chrome binary was found on the machine
(`/opt/google/chrome/chrome`, already running as the user's own desktop browser) and a separate,
isolated headless instance was launched (`--headless=new --remote-debugging-port=9333
--remote-allow-origins=* --user-data-dir=/tmp/claude-chrome-profile`) and driven directly via the
Chrome DevTools Protocol (raw websocket, no Playwright/Puppeteer available or needed) — no manual
copy-paste round-trip required from this point on.

## Confirmed Findings

- ✓ Captured the real console output directly (not via the user pasting it). The trace
  consistently stopped dead after `categories fetch resolved {count: 4}` — never any
  `items effect fired` with a real category id, never a `/store/products` network request.
  Same exact cutoff point independently observed twice (once via the user's paste, once via my
  own direct capture) — ruling out "the user just stopped copying."
- ✓ Added one more precise log line and re-captured directly: `categories fetch resolved {count:
  4, mountedRefCurrent: false}` followed by `categories fetch resolved but BAILED — mountedRef.
  current is false`. Definitive proof, not inference.
- ✓ Root cause: `frontend/src/hooks/useCatalog.js`'s `mountedRef` pattern —
  `const mountedRef = useRef(true); useEffect(() => () => { mountedRef.current = false }, [])` —
  never resets `mountedRef.current` back to `true` in the effect's setup phase. Under React 18
  StrictMode's dev-mode mount→cleanup→remount simulation, the cleanup runs once during that
  simulated unmount and permanently latches `mountedRef.current` to `false` for the rest of the
  component's real lifetime (state/refs persist across StrictMode's simulated cycle — only the
  effect setup/cleanup pair re-runs). Every subsequent `if (mountedRef.current)` guard in the
  file then silently no-ops forever: fetches resolve correctly, but `setCategories`,
  `setActiveCatRaw`, and `setCatsLoading(false)` are all skipped — leaving the component stuck
  showing the loading spinner permanently, even though the data was fetched successfully.
- ✓ Fix: reset `mountedRef.current = true` inside the effect's setup function, not just via
  `useRef`'s initializer. Applied in `useCatalog.js`.
- ✓ Verified the fix directly, twice: once via console capture (full sequence now reaches
  `CatalogPage render {... categoriesCount: 4, itemsCount: 25}`), once via a real screenshot
  (`after-fix-screenshot.png`, this folder) showing all 4 category pills and all 25 real
  hand-painted plate photos with their real captions, rendered correctly end to end.
- ✓ Network-level re-confirmation after cleaning up the temporary trace logging: all three real
  requests (`/config`, `/store/categories`, `/store/products`) complete with 200 in sequence —
  the `/store/products` request, which never even fired before the fix, now fires and resolves.

## Side Findings

- This bug is React-18-StrictMode-specific (development only) — it would not reproduce the same
  way in a production build (StrictMode's double-invoke simulation doesn't run there). This
  explains why it manifested as "sometimes stuck, sometimes fine" rather than consistently
  broken — StrictMode's double-invoke timing interacts with whichever request happens to resolve
  first.
- This is unrelated to, and does not replace, the separately-confirmed Supabase pooler flakiness
  (`store-investigation/2026-07-21/`) — both are real, independent issues. The pooler flakiness
  affects the *first* request in the chain (`/config`); this `mountedRef` bug affects whether a
  *successful* response ever gets applied to component state, once StrictMode has run its
  simulated cycle.

## Unknowns

- Whether this same broken `mountedRef` pattern exists in other hooks/components across the
  codebase — not searched for in this investigation (scope was beit-al-fakhar's `/store` page
  specifically). Worth a follow-up grep for the same `useRef(true)` + reset-less cleanup pattern
  elsewhere, if this class of bug is suspected on other tenant pages.

## Recommendation → Decision → Execution

- **Recommendation:** fix `useCatalog.js`'s `mountedRef` pattern (as described above); remove the
  temporary `[RUNTIME-TRACE]` instrumentation once confirmed; grep for the same pattern elsewhere
  as a follow-up, not urgent since no other report of this symptom exists yet.
- **Decision:** proceeded with the fix and instrumentation removal directly, consistent with this
  session's established authorization for well-evidenced, low-risk fixes; the "grep elsewhere"
  follow-up is left open, not decided now.
- **Execution:** `frontend/src/hooks/useCatalog.js` fixed; temporary trace logging removed from
  `useCatalog.js`, `useTenantConfig.js`, `CatalogPage.jsx`, `TenantConfigContext.jsx`; verified
  clean (`grep -r RUNTIME-TRACE` returns nothing); real screenshot and CDP capture logs saved as
  evidence in this folder.
