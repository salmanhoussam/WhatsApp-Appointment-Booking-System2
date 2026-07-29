# /architecture-review

Runs one Architecture (Maturity) Review pass for a Capability, Interface, or cross-cutting System
— the operational instance of `.claude/rules/architecture-review-loop.md` (that file is the
constitution; this command is what actually executes it, the same relationship
`service-execution-constitution.md` has to a real Service Contract).

**Usage:** `/architecture-review <topic> [--window N]`

- `<topic>` — the Capability/Interface/System name, matching a `.claudedocs/maturity/<topic>.md`
  file (create one from the template in `architecture-review-loop.md` if it doesn't exist yet).
- `--window N` — Review Window, how many of the most recent session reports to read. **Default: 14.**
  Not hardcoded — as the project's session history grows, 14 stays a rolling ~2-3 week window
  instead of drifting toward "recent" meaning something else.

---

## What This Command Does

An evidence-only pass over real session history — never a summary from memory. Produces one new
`## Review N` entry in `.claudedocs/maturity/<topic>.md`, an Evolution entry if warranted, and a
targeted (not wholesale) update to the topic's Capability Contract file, if one exists.

---

## Execution Steps

### Step 1 — Investigation (read only, write nothing yet)

```bash
# The N most recent session reports (N = --window, default 14)
ls -t .claudedocs/sessions/ | head -n ${N:-14}
```

Read every one of those session reports **in full**. Then read whatever already exists for this
topic:

- `.claudedocs/evolution/<topic>.md`
- `.claudedocs/maturity/<topic>.md`
- `.claudedocs/architecture/capabilities/<topic>.md` (if `<topic>` is a Capability)
- Any related ADRs, Architecture Reviews, or Principles referenced from the above

Then read `.claude/rules/architecture-review-loop.md` and follow its required structure exactly —
this command does not restate that file's principles, only executes them.

### Step 2 — Analysis (evidence-only)

Based **only** on what Step 1 actually found, identify:

- discoveries
- architectural decisions
- patterns that repeated
- temporary workarounds
- remaining debt
- maturity changes
- questions that are still open

Do not invent anything. Do not summarize from memory. Every conclusion must be traceable to a
specific session report — cite it. Per `investigation-protocol.md`'s Evidence Interrogation
section: be ready to name the exact file/session and the top 3 concrete findings from it — if you
can't, you summarized instead of reviewing, and the claim doesn't count yet.

**Pattern-escalation rule:** if a finding appears for the **second independent time** across what
you just read, explicitly call it out as a candidate for ADR promotion or a full Architecture
Review — per this project's own Abstraction Rule (`rules/team-roles.md`: 2+ independent real cases
justify generalizing). Don't just log it and move on.

### Step 3 — Update Documentation

Update every affected document, only where warranted:

1. **Evolution Log** — if Step 2 surfaced real new insight that hasn't stabilized yet, append a new
   dated entry to `.claudedocs/evolution/<topic>.md` per its existing template.
2. **Maturity Review** — append a new `## Review N` to `.claudedocs/maturity/<topic>.md` following
   the exact template in `architecture-review-loop.md`. Never rewrite or delete a prior entry.
3. **Capability Contract** — if `.claudedocs/architecture/capabilities/<topic>.md` exists, update
   **only** the sections that actually changed (typically `## Maturity`, and whichever of
   `## Open Findings` / `## Related` are affected — see `architecture-review-loop.md`'s note on
   why these are the real section names, not invented ones). Do not rewrite unrelated sections.

### Step 4 — Verification

Before finishing:

- Verify every statement traces back to a real session report you actually read in Step 1.
- Verify there are no duplicated findings (check the topic's existing Evolution/Maturity entries
  first — don't re-log something already on record).
- Verify no historical information was lost (append-only; nothing in `evolution/` or `maturity/`
  should have shrunk).

### Step 5 — Final Report

Print, in order:

- What changed
- Why it changed
- Current maturity
- Remaining architectural debt
- Recommended next investigation

---

## Rules

- Never run this command's Step 3 without having actually done Step 1 and 2 first — no
  documentation update without real evidence behind it.
- If `<topic>` has no existing `maturity/<topic>.md` file, create it from the template in
  `architecture-review-loop.md` before appending `Review 1`.
- This command does not decide cadence — see `repository-hygiene.md`'s "Bo Hussein's Architecture
  Review Responsibility" for when a topic is *due*. This command only runs the pass once invoked.
