---
name: browser-verification-capability
description: Real Playwright MCP browser control — launch Chromium, navigate, read console/network/DOM/accessibility, screenshot. Use whenever a frontend claim ("it renders", "the flow works", "the page is broken") needs proof instead of an assumption from code, curl, or a stale screenshot.
user-invocable: true
---

# Browser Verification Capability

## What this is

A standalone Claude Code CLI + the official `@playwright/mcp` server, installed and verified on
this project's dev machine 2026-08-01. Full installation/config record:
`.claudedocs/work/browser-mcp-tool-verification/2026-08-01/evidence.md`. The actual methodology —
how to write the investigation prompt, what evidence to always collect, what never to assume from
console/network/curl alone — lives in `.claude/rules/frontend/browser-verification-protocol.md`;
this file does not repeat that, it names the capability and states what it's proven so far.

## Why "Capability," not "Agent"

This project's own vocabulary reserves "Agent" for something with a lifecycle, a Contract, and
independent track record (`.claude/agent/bo-hussein.md`'s "Team Evolution" section). What's real
today is a proven *method*, not yet that fuller thing. See
`.claudedocs/architecture/ENGINEERING_ORGANIZATION.md` for where this sits on the org chart.

**Promotion criterion, stated explicitly so it's checkable later rather than a felt sense**: this
graduates to a named Agent once it has been the executing method across multiple independent real
missions spanning different parts of the app (e.g. Store, Booking, Restaurant, static public pages,
Dashboard — not just one repeated target). Update this file's status line when that threshold is
met, rather than declaring it early.

**Status as of 2026-08-01**: 2 real missions completed —
1. Capability suite (7 tool categories individually verified, one — interaction — correctly logged
   as untestable rather than assumed working).
2. White-page investigation (found and fixed 3 independent root causes in one pass).

## How to invoke it

Full method in `.claude/rules/frontend/browser-verification-protocol.md`. Short version: it does not
hot-load into an already-running Claude Code session — drive it via a fresh, non-interactive nested
call from the project directory:

```bash
claude -p "<precise, numbered investigation steps>" \
  --allowedTools "mcp__playwright__browser_navigate mcp__playwright__browser_evaluate mcp__playwright__browser_console_messages mcp__playwright__browser_network_requests mcp__playwright__browser_snapshot mcp__playwright__browser_take_screenshot" \
  --output-format text
```

## When to use this skill

Any time a frontend claim needs proof: "does this page render," "did that fix actually work," "is
this flow still functional." Not needed for behavior that genuinely requires a physical device this
can't reach (a camera, a real QR scan, the WhatsApp app opening on a phone) — those stay real,
honest Unknowns per `investigation-protocol.md`.
