# Frontend Verification Capability — Evolution Log

## 2026-08-01

### Context

A long Store Pilot session (`hr` / RK Barber Shop) hit a "white page" bug that took hours to
diagnose the wrong way: a human (Salman) manually opening Chrome DevTools, taking screenshots of
Console/Network/Sources tabs, and pasting them back for interpretation — one round-trip per
question, each one slow, and dependent on Salman knowing which tab and which button to click.
Mid-investigation, Salman asked a sharper question than "fix the bug": *why can't the agent just do
this itself?* That question is what this entry is really about.

### Discovery

The answer turned out to be a real, fixable gap, not a hard limitation: this project had a
standalone Claude CLI available on the same machine (Ubuntu, Node 20 via nvm) that had never been
installed, and Anthropic's own MCP ecosystem has an official Playwright browser-automation server
(`@playwright/mcp`) that had never been configured. Both were installed and verified this same
session:

- `npm install -g @anthropic-ai/claude-code` — installed clean, already authenticated as the same
  account/org as this VS Code session (shared credential store, no separate login needed).
- `claude mcp add playwright --scope local -- npx -y @playwright/mcp@latest` — registered, Chromium
  + headless shell + ffmpeg binaries downloaded (~394MB, none existed before).
- Verified for real, twice: once as a general capability suite (launch/navigate/DOM/console/network/
  screenshot/interact — 6 of 7 individually proven, 1 legitimately still unverified pending a
  renderable page), and once as an actual investigation (reproducing the white-page bug on two
  independent tenants with real DOM/console/network/screenshot evidence).
- Full evidence: `.claudedocs/work/browser-mcp-tool-verification/2026-08-01/evidence.md` and
  `.claudedocs/work/white-page-investigation/2026-08-01/summary.md`.

**One real, load-bearing technical constraint discovered along the way**: a newly-registered MCP
server does not hot-load into an already-running Claude Code session — it only becomes available in
a fresh session. Practically, this means driving the browser from this exact running conversation
requires launching a separate, non-interactive `claude -p` invocation from the project directory
each time, not gaining the tool directly mid-conversation. This is now the documented, standing way
to use it (`.claude/rules/frontend/browser-verification-protocol.md`).

### Current Understanding

This is a genuine capability-tier change, not a convenience feature — worth stating in Salman's own
framing: before today, the Frontend Agent "read code and guessed." As of today it can behave like a
real frontend developer — run the site, open the equivalent of DevTools, watch Console, see Network,
repeat a user's exact steps, and get ground-truth evidence back, all without a human relaying
screenshots. The white-page investigation itself is the proof: driving a real browser directly
overturned a wrong working assumption (that the bug was `hr`/Store-specific) within one investigation
pass, and pointed at a specific, concrete, evidence-backed root cause (a stale Vite dependency cache,
confirmed via file timestamps, not guessed) — something the screenshot-relay method spent hours
circling without pinning down precisely.

This also produced a real, reusable lesson worth calling out on its own: `browser_console_messages`
did **not** catch an exception a human's manual DevTools "pause on exceptions" breakpoint caught
minutes earlier for the identical bug. Two different capture mechanisms, two different results, same
underlying failure. Folded directly into the new protocol's "what should never be assumed" section —
this is exactly the kind of real, second-instance-confirmed gotcha this project's documentation
discipline exists to preserve rather than relearn.

### Confirmed by outcome, same day — Browser MCP is an Investigation Tool, not a UI testing tool

Written after the white-page bug was actually resolved (same 2026-08-01 session, follow-up mission
"Frontend White Page Resolution"), because the outcome itself is the strongest evidence for the claim
this entry opened with. Salman's own framing, worth keeping verbatim: before Playwright MCP, this
project's frontend toolkit was screenshots, `curl`, and reading code — each one answers a narrow
question, one at a time, only as far as a human relays the next screenshot. What actually happened
once a real browser was available: **one investigation, run under a strict one-change-per-step,
re-verify-every-time methodology, surfaced three independent root causes in a single pass** — two
in `App.jsx`/`TenantResolver.jsx`'s LAN-IP subdomain detection (the second an exact repeat of a
gap dismissed as "doesn't matter for `hr`" hours earlier, in this same session, before the tooling
existed to actually check it against a *registered* tenant), and one in `useGenericStore.js`'s
unconditional `crypto.randomUUID()` call — the one that would have crashed the real physical Pilot
on the real barber's real phone, undiscovered until a real non-secure-context browser hit it.

That is the concrete, load-bearing difference between a UI *testing* tool (confirms one already-
suspected behavior) and an *investigation* tool (finds causes nobody was specifically looking for,
because each verified step's real evidence — not a guess — is what pointed at the next one). None of
the three causes were hypothesized up front; each was found because the previous fix's real
Playwright evidence didn't fully match "fixed," and that gap was chased rather than accepted. Under
the old screenshot-relay method, root cause #2 (`TenantResolver.jsx`) would likely have gone
unnoticed for another session — `hr` alone would have looked fixed after root cause #1, and `smar`'s
failure would have surfaced later as a separate, unrelated-looking bug report.

### Open Questions

- Whether the Playwright MCP's interaction tools (`browser_click`, `browser_type`, form-filling)
  work reliably against this app in practice — genuinely untested so far, since neither page tested
  today rendered anything clickable. First real click-through test is still pending.
- Whether `claude mcp add --scope local` (this machine + this project only) is the right scope
  long-term, or whether `--scope user` (available to this account across every project) would serve
  better once this pattern proves itself past a single incident — deferred, not decided.
- Whether the workspace-trust warning seen on every nested `claude -p` call (ignoring
  `.claude/settings.json`'s 547 permission entries) should be resolved by running `claude`
  interactively once to accept the trust dialog — low priority, hasn't blocked anything yet since
  `--allowedTools` is passed explicitly per call.

### Promoted?

**Yes — promoted directly to a standing rule the same day**, not deferred pending a second instance.
This is a deliberate, explicit exception to this project's usual promotion bar (multiple independent
proven cases before promoting an Evolution entry to a Principle/ADR) — justified because this isn't
a design pattern being proposed, it's a capability that was proven working twice in the same session
(the tool-verification suite, then the real investigation that used it) before being written down;
the risk a premature promotion usually guards against (locking in an unproven shape) doesn't apply to
"this tool exists and works," only to *how* it should always be used — which is exactly what
`.claude/rules/frontend/browser-verification-protocol.md` captures, kept revisable the normal way if
real use surfaces something the first day's evidence didn't show. Registered in `CLAUDE.md`'s rules
index alongside the project's other standing frontend rules.
