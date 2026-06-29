# /session-close

Closes the current working session: writes a session report, updates memory, and prepares the context for the next session.

**Usage:** `/session-close` (run at the END of every session)

---

## What This Command Does

1. Reads what was done in this session (git log + conversation context)
2. Writes a session report to `.claudedocs/sessions/[TODAY].md`
3. Updates `.claude/memory.md` with new decisions/changes
4. Updates `.claudedocs/todo_list.md` (marks done items, adds new ones)
5. Prints a "Next Session Brief" so the next session starts instantly

---

## Execution Steps

### Step 1 — Collect Session Data

```bash
# What changed today?
git log --oneline --since="6 hours ago"
git diff --stat HEAD~3 HEAD 2>/dev/null | tail -20

# What files were touched?
git status --short
```

Also read from context:
- What did the user ask for in this session?
- What was built/fixed/decided?
- What was NOT finished?

---

### Step 2 — Write Session Report

Create `.claudedocs/sessions/[TODAY].md`:

```markdown
# Session Report — [TODAY]
**Duration:** [estimated from conversation length]
**Phase(s):** [e.g., Phase 35, Phase 36]

---

## ✅ Completed This Session

| Item | File(s) | Notes |
|------|---------|-------|
| [Feature/fix] | [path] | [brief note] |

---

## 🔧 Technical Decisions Made

- **[Decision]:** [Rationale in 1 sentence]
- Example: Adopted DB table for GalleryImage instead of Storage listing — enables ordering and soft-delete

---

## 🐛 Bugs Fixed

| Bug | File | Root Cause | Fix Applied |
|-----|------|------------|-------------|
| [description] | [file:line] | [what caused it] | [what was changed] |

---

## 🗄️ Schema Changes

| Model | Change | Migration Needed? |
|-------|--------|------------------|
| [Model] | Added [field] ([type]) | ✅ Run `npx prisma db push` |

---

## 🚧 Unfinished / Carry Forward

- [ ] [Item 1 — why not done]
- [ ] [Item 2]

---

## 📋 Next Session — Start Here

**Priority 1:** [Most important item with file path]
**Priority 2:** [Second item]
**Priority 3:** [Third item]

**Context to re-read before starting:**
- `.claude/memory.md` (last 2 entries)
- `.claudedocs/sessions/[TODAY].md` (this file)
- [specific file if relevant]

---

## 📊 Session Stats

| Metric | Value |
|--------|-------|
| Files modified | [count] |
| Lines added | [estimate] |
| Lines removed | [estimate] |
| Tests run | ✅/❌/N/A |
| Deployed to staging | ✅/❌ |
```

---

### Step 3 — Update Memory

Trigger the `memory-keeper` agent to append today's entry to `.claude/memory.md`.

---

### Step 4 — Update Todo List

Read `.claudedocs/todo_list.md` and:
- Mark completed items as `✅ Done — [date]`
- Add any new items discovered in this session
- Reorder by priority

---

### Step 5 — Print Next Session Brief

Output in chat:

```
╔══════════════════════════════════════════╗
║        SESSION CLOSED — [TODAY]          ║
╚══════════════════════════════════════════╝

✅ Completed: [count] items
🚧 Carried forward: [count] items
📋 Report: .claudedocs/sessions/[today].md
🧠 Memory: updated

━━━ NEXT SESSION: START HERE ━━━
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

Run `/session-open` to reload context instantly.
```

---

## Rules

- NEVER skip this command at end of session
- If session was only reading/planning (no code), still write a short report
- Date format: `YYYY-MM-DD`
