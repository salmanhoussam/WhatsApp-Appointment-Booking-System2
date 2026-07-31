paths: "frontend/src/**,frontend/public/**"

# Browser Investigation Protocol — Always Active

Established 2026-08-01, the day a real Playwright MCP browser became a verified, working capability
for this project (`.claudedocs/work/browser-mcp-tool-verification/2026-08-01/evidence.md`) —
proven, not assumed, against this exact codebase (`.claudedocs/work/white-page-investigation/2026-08-01/summary.md`
is the first real investigation run under this protocol). Before this date, a frontend
investigation meant reading code and reasoning about what a browser would probably do. That is no
longer the standard — real browser evidence is now available and is required.

## Why this exists

The night before this file was written, hours were spent debugging a "white page" report using
screenshots a human had to manually take, describe, and paste back — slow, lossy, and dependent on
Salman being available and knowing which DevTools tab to click. The actual root cause (a stale Vite
dependency cache, see the investigation summary above) was only found once a real browser could be
driven directly and asked precise, structured questions. This file exists so that lesson doesn't
have to be relearned per incident.

## How an investigation begins

**Real browser evidence first, code inspection second — never the reverse.** Before forming a
hypothesis by reading source files, drive a real browser to the affected URL and collect the
evidence checklist below. Code inspection is for understanding *why* the evidence looks the way it
does, not for guessing *what* the evidence would show.

Practically, in this environment: the Playwright MCP does not hot-load into an already-running
Claude Code session (confirmed 2026-08-01 — it only registers at session start). Drive it via a
fresh, non-interactive nested session from the same project directory:

```bash
claude -p "<precise, numbered investigation steps>" \
  --allowedTools "mcp__playwright__browser_navigate mcp__playwright__browser_wait_for mcp__playwright__browser_evaluate mcp__playwright__browser_console_messages mcp__playwright__browser_network_requests mcp__playwright__browser_take_screenshot mcp__playwright__browser_click" \
  --output-format text
```

Scope `--allowedTools` to exactly the tools the investigation needs — not a blanket
`--dangerously-skip-permissions`/`--permission-mode bypassPermissions`, which this project's own
outer harness has been observed to block as a suspicious pattern. A narrow, explicit tool list is
both safer and has not been blocked.

Write the prompt as a **numbered, explicit sequence** ("1. navigate. 2. wait 2s. 3. evaluate this
exact JS: ... 4. read console. 5. read network filtered to X. 6. screenshot.") — a vague prompt like
"check if the page works" produces a vague, unverifiable report. Ask for raw data (exact JSON from
`browser_evaluate`, the full console message list, not just a count) so the evidence is checkable,
not just a paraphrase — same Evidence Interrogation standard `investigation-protocol.md` already
requires everywhere else in this project.

## Evidence that must always be collected

For any "page doesn't work" / "blank page" / "button doesn't do anything" class of report, collect
all of these before forming a conclusion — not a subset chosen because it seemed sufficient:

1. **Direct DOM state**, via `browser_evaluate`, not just `browser_snapshot`. An accessibility
   snapshot can return empty for reasons other than "nothing rendered" (see the Never Assume section
   below); a direct read of `document.getElementById('root').innerHTML.length` (or the app's actual
   root selector) is the unambiguous ground truth.
2. **Full console messages, all levels**, not just a count and not just `error`-level. Debug/info
   messages (e.g. Vite HMR connecting/connected) prove the transport layer is healthy even when
   nothing else is happening yet — that's a real, useful negative result, not noise to filter out.
3. **Full network request list**, including status codes, filtered to the paths relevant to the
   question (e.g. `/api/`, the entry JS files) — but also glance at the *unfiltered* full list at
   least once, since "zero matching requests" can only be trusted once you've confirmed the filter
   itself isn't hiding something unexpected.
4. **A screenshot**, even when `browser_evaluate`/console/network already answer the question — it
   is often the fastest way to sanity-check the other evidence isn't self-contradictory (e.g. DOM
   says empty, screenshot should agree).
5. **The exact URL after navigation** (`window.location.href`), not just the URL requested — proves
   or disproves an unexpected redirect independent of whatever the router library claims to do.

## What should never be assumed without browser evidence

- **"No console errors" does not mean "nothing is wrong."** Confirmed 2026-08-01: a real thrown
  exception (`React.lazy`'s "Expected the result of a dynamic import()...") was caught by a human
  manually pausing on exceptions in DevTools, but never appeared in `browser_console_messages`'s
  capture — because a debugger exception breakpoint intercepts at the JS engine level, independent
  of whatever the app or React itself chooses to log via `console.*`. If DOM evidence says something
  failed but console evidence says nothing did, that is a real, reportable gap — not evidence the
  page is fine. Say so explicitly as an Unknown rather than resolving the contradiction in the
  optimistic direction.
- **200 status codes do not mean the app rendered.** A stale Vite dependency cache serves 200s for
  every request while silently serving the *wrong* content — confirmed as the actual root cause
  2026-08-01. Network health and application health are two different claims; verify both
  independently, never infer one from the other.
- **An API-level check (`curl`) is never a substitute for a real DOM check.** Confirmed repeatedly
  this same night, before the Playwright MCP existed: `curl` returning 200 with correct JSON proved
  the backend worked and said nothing about whether React ever mounted anything with it. Anything
  claimed "verified" from `curl` alone about a *frontend* behavior is not verified — it's one link
  of the Data → Transformation → State update → Render → Visible UI chain
  (`investigation-protocol.md`'s "Runtime Before Assumption" section), not the whole chain.
- **A working page on one tenant does not mean the app-wide chain is confirmed.** Confirmed
  2026-08-01: the white-page failure reproduced identically on both `hr` (dashless module-driven
  tenant) and `smar` (this project's own documented "Live ✅" flagship) — testing only the tenant
  named in the bug report would have wrongly scoped this as `hr`-specific / Store-specific, when it
  was an app-wide dev-server state issue. When a frontend bug is reported against one tenant, test
  at least one independent, unrelated tenant too before concluding the bug is scoped to the one
  reported.
- **A tool succeeding at *some* things does not mean every capability is verified.** The Playwright
  MCP's `browser_click`/interaction capability was never actually exercised against a real element
  in this project's first real use (2026-08-01) because both test pages rendered nothing clickable —
  logged explicitly as an unverified capability, not silently assumed to work because navigation and
  console/network capture did. Re-verify a specific capability the first time it's actually load-bearing
  for a real investigation's conclusion, don't carry forward "the tool basically works" as proof of
  every individual capability.

## Success criterion

Any future frontend issue should be diagnosable independently, end-to-end, without asking Salman for
screenshots or manual browser interaction — unless the issue genuinely requires physical-device
behavior this environment cannot simulate (a camera, a real QR scan, the WhatsApp app itself opening
on a phone, a second physical device on the same LAN). Those remain real, honest Unknowns per
`investigation-protocol.md`'s own discipline — not something to fake past with a browser tool that
cannot reach a phone's camera.
