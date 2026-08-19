# Context Recovery Protocol — Always Active

Established 2026-08-04, Salman's explicit standing instruction. Governs how every session begins
after a Compact, a "Continue", a new chat session, or a long pause — before any implementation work
starts.

## Trigger

Any of:
- Context was compacted (auto or manual `/compact`)
- The user's message is effectively "continue" / resumes a prior session with no fresh task framing
- A new session starts mid-mission
- A long pause since the last real exchange

## The Protocol (in order)

1. Read all active planning documents for the current project.
2. Read the latest work/evidence documents relevant to the current mission.
3. Read the latest capability references relevant to the current task.
4. Read the current implementation plan.
5. Read the latest project memory documents that affect today's work.
6. Check: current git branch, latest commit, working tree status (`git status --short`, real diff
   stat on any uncommitted files touching the current mission).
7. Produce a short recovery report (under one screen) containing only:
   - Current mission
   - Current phase
   - Last completed phase
   - Current implementation status
   - Active blockers
   - Next planned step
   - Any inconsistencies discovered while rebuilding context

## Rules

- Never assume the previous conversation's stated state is still correct — verify against real
  files/git, every time.
- **Repository over memory.** If a doc (capability reference, evolution log, etc.) disagrees with
  what the real code/git history shows, the repository wins — report the conflict explicitly rather
  than silently trusting either side.
- Never continue implementation until recovery is complete.
- Keep the recovery report under one screen — this is a status check, not a re-narration of the
  whole session.
- Scope the read to the current mission only — do not re-read unrelated documents just because they
  exist.
- After the recovery report, wait for explicit approval before resuming implementation.

## Relationship to existing rules

This governs the *start* of a session/turn after a context break. It doesn't replace
`investigation-protocol.md` (which governs how a specific technical investigation is run and
reported) or the Session Closure Checklist in `CLAUDE.md`'s Auto-Reporting section (which governs
the *end* of a session). Three different moments, three different rules.
