# Auto-Reporting Skill
# When and How the Agent Generates Reports Automatically

## Purpose

This skill tells the agent WHEN to auto-generate a report without being asked, and HOW to format it for this project.

---

## Triggers — Auto-Report Without Being Asked

The agent MUST generate a report automatically when:

| Trigger | Report Type | Destination |
|---------|-------------|-------------|
| User says "done" / "finished" / "خلصنا" | Session close report | `.claudedocs/sessions/[date].md` |
| Schema change detected (`prisma/schema.prisma` modified) | Schema change log | Append to `.claudedocs/database_report.md` |
| New file created in `app/services/` or `app/api/` | Architecture check | Print inline (no file) |
| User says "deploy" / "push" / "ارفع" | Pre-deploy audit | `.claudedocs/audit_[date].md` |
| User asks "what's left?" / "شو باقي" | Roadmap status | Print inline |
| Error discovered in code review | Security/bug alert | Print inline + append to memory |
| Session > 20 messages without `/session-close` | Reminder | Print inline reminder only |

---

## Report Templates

### Template A: Inline Status Report (short, no file)
Use for quick questions like "what's the status?"

```
📊 [TITLE] — [DATE]
─────────────────
✅ Done: [item], [item]
🚧 In progress: [item]
🔴 Blocked by: [issue]
⏭️ Next: [action]
```

### Template B: Session Report (save to .claudedocs/sessions/)
Use at end of session or when user says "done".

```markdown
# Session — [DATE]
## Done ✅
- [item + file]
## Decisions 🔧
- [decision + rationale]
## Bugs Fixed 🐛
- [bug + file + fix]
## Carry Forward 🚧
- [item]
## Next Session: Start With
1. [priority 1]
```

### Template C: Audit Report (save to .claudedocs/audit_[date].md)
Use before deploy or when `/audit` is run.

```markdown
# Audit Report — [DATE]
## Status: [SAFE | BLOCKED]
## Critical Issues: [count]
[List each with fix]
## Passed: [list]
## Recommendation: [deploy / fix first]
```

### Template D: Schema Change Log
Append to `.claudedocs/database_report.md` after any schema change.

```markdown
## [DATE] — Schema Change
- Model: [name]
- Change: Added [field] ([type]) / Removed [field] / Modified [field]
- Migration: `npx prisma db push` — [run? pending?]
- Reason: [why this was needed]
- Impact: [what breaks if not migrated]
```

---

## Memory Update Rules

After writing ANY report, always append a 1-line summary to `.claude/memory.md`:

```markdown
## [DATE] — [Report Type]
- [1-line summary of what changed/was found]
- Report: [path if saved to file]
```

---

## Language Rules for Reports

- **Arabic content** (business decisions, user-facing features) → write in Arabic
- **Technical content** (file paths, code, commands) → write in English
- **Mixed** → use the same language the user is writing in for prose, English for all code/paths

---

## What NOT to Report

- Don't auto-report trivial changes (fixing a typo, updating a comment)
- Don't report the same issue twice in the same session
- Don't create files for inline-only reports
- Don't block the user's work to write a report — write it after the task is done
