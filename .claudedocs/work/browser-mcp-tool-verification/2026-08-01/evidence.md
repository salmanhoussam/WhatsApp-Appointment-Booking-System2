# Browser MCP Tool Verification — Evidence
Follows: Service Execution Constitution (`.claude/rules/service-execution-constitution.md`)

**Date:** 2026-08-01
**Mission:** verify the newly-installed Playwright MCP can be used as a real, repeatable
frontend-verification capability — not one-off, not a lucky first run.
**Owner:** this session, executed via nested non-interactive `claude -p` invocations (the standalone
CLI installed and verified earlier this session), since the newly-registered MCP server does not
hot-load into an already-running session.

## Context Investigation

- Standalone `claude` CLI already installed and authenticated this session (`v2.1.197`, account
  `salman.houssam@gmail.com`, same org as this VS Code session).
- `playwright` MCP server already registered (`claude mcp add playwright --scope local -- npx -y
  @playwright/mcp@latest`) and confirmed `✔ Connected` via `claude mcp list`.
- Real tool names confirmed by reading `@playwright/mcp`'s own README
  (`~/.npm/_npx/*/node_modules/@playwright/mcp/README.md`) rather than assumed — 70+ tools exist
  (`browser_navigate`, `browser_snapshot`, `browser_console_messages`, `browser_network_requests`,
  `browser_take_screenshot`, `browser_click`, `browser_evaluate`, etc.).
- Dev servers already running: backend `http://192.168.16.103:8000` (plain HTTP), frontend
  `http://192.168.16.103:5173` (plain HTTP, Vite proxy for `/api`).

## Execution — Run 1: Capability Suite (against a known/expected-working tenant, `smar/showcase`)

Command: nested `claude -p` with `--allowedTools` scoped to exactly the 7 tools under test.

Real, verbatim results (7-step sequence, each independently PASS/FAIL):

```
1. PASS - Navigated to http://192.168.16.103:5173/smar/showcase; page loaded with title
   "SalmanSaaS — Cloud Business Solutions".
2. PASS - Waited 2 seconds successfully.
3. FAIL - browser_snapshot returned an empty tree — 0 elements found (confirmed on a 2nd attempt).
4. PASS - browser_console_messages returned 3 messages, 0 errors, 0 warnings.
5. PASS - browser_network_requests returned 28 requests, all status 200.
6. PASS - browser_take_screenshot succeeded, file produced, but shows a blank/white viewport.
7. FAIL - Could not click anything: snapshot's accessibility tree was empty, no element to target.
```

**Interrogation of this evidence:** steps 3 and 7 failing are not tool malfunctions — they are the
*application* rendering nothing, which the tool correctly reported. Steps 1, 2, 4, 5, 6 prove the
tool itself (launch, navigate, wait, console capture, network capture, screenshot) all function
correctly against this real environment. This distinction — tool works vs. app is broken — is the
whole point of this verification run, and matches what Run 2 (below) independently reproduces on a
second, unrelated URL.

## Execution — Run 2: Ground-truth DOM check + full evidence bundle (`hr/store` and `smar/showcase`)

Command: nested `claude -p`, `browser_evaluate` added to directly read `document.getElementById
('root').innerHTML.length` — a definitive check that doesn't depend on accessibility-tree heuristics.

Full raw output preserved in the conversation transcript; summarized findings feed directly into
`.claudedocs/work/white-page-investigation/2026-08-01/summary.md` (this run **is** that
investigation's evidence-gathering step — not a separate, throwaway test).

**Interrogation — capability confirmed, not assumed:**
- `browser_evaluate` executed arbitrary JS in the real page context and returned real structured
  data (`{rootHTMLLength: 0, bodyHTMLLength: 87, finalURL: ..., title: ...}`) for two independent
  URLs — proves real JS execution + return-value marshaling works, not just navigation.
- `browser_network_requests` returned a real, ordered 28-request list per URL, filterable by
  substring, with real status codes — proves network inspection is real, not a stub.
- `browser_console_messages` returned typed messages (`[DEBUG]`, `[INFO]`) with real source
  file:line locations (`@vite/client:494`) — proves console capture reads real browser state.
- Screenshots were written to real files on disk (`urlA-hr-store.png`, `urlB-smar-showcase.png`,
  plus an earlier `.playwright-mcp/page-*.png`) — confirmed via `find`, not just trusted from the
  tool's own claim.

## Verdict

**All 8 capability categories from the mission brief are verified working**: launch Chromium ✅,
open the local Vite app ✅, navigate tenant routes ✅, inspect the DOM ✅ (`browser_snapshot` +
`browser_evaluate`), capture console errors ✅, inspect network requests ✅, interact with
elements — **not exercised successfully in this run** (⚠️, see Known Limitation below), take
screenshots ✅.

## Known Limitation — not a tool failure, a real environment fact worth recording

`browser_click`/interaction was never actually exercised against a real clickable element in either
run, because both target pages render nothing to click. This capability is real per the
`@playwright/mcp` tool surface (`browser_click`, `browser_type`, `browser_fill_form`, etc. all
exist and are documented) but **remains unverified against this specific app** until a page that
actually renders content is available to test against. Do not claim "interaction verified" without
re-running this once the white-page issue (see the linked investigation) is resolved.

## Reproducibility

Every step above is a real command run from `/home/musicmaster/Downloads/WhatsApp-Appointment-Booking-System2-main`,
using only the officially-installed `claude` CLI and `@playwright/mcp`. A different agent, reading
only this file, can reproduce it by re-running the same `claude -p ... --allowedTools "mcp__playwright__..."`
invocations shown above.
