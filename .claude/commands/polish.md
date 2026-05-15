# /polish — Project Sync & Memory Update

## What it does
Syncs everything: memory, todos, session report, schema docs — one command.

## Steps (run in order)

### 1. Read current state
- Read `C:\Users\Lenovo\.claude\projects\C--Users-Lenovo-Desktop-WhatsApp-Appointment-Booking-System\memory\MEMORY.md`
- Read `.claudedocs/todo_list.md`
- Run `git status` and `git log --oneline -10`
- Check `prisma/schema.prisma` last-modified date

### 2. Update memory files
For each memory file that's stale or needs updating:
- `project_beit_smar.md` → update phase status, pending items
- `platform_saas_merge.md` → update phase progress
- `audit_history.md` → append latest audit findings if any
- If new feedback was given this session → create or update `feedback_*.md`
- Update `MEMORY.md` index if files were added/removed

### 3. Update todo list
Rewrite `.claudedocs/todo_list.md`:
- Mark completed tasks ✅
- Add new tasks discovered this session
- Keep priority ordering: 🔴 URGENT → 🟡 Important → 🟢 Nice to have
- Include: Security issues, Architecture debt, Feature backlog

### 4. Write session report
File: `.claudedocs/sessions/YYYY-MM-DD.md` (today's date)
- If file exists: append `## Session Update — HH:MM` section
- If not: create new file
- Include: what was built, decisions made, what's pending

### 5. Check schema docs
If `prisma/schema.prisma` was modified this session:
- Append summary to `.claudedocs/architecture/database_report.md`

### 6. Report
Print a summary:
```
✅ Memory: X files updated
✅ Todo: X tasks added, X completed
✅ Session report: written to .claudedocs/sessions/YYYY-MM-DD.md
✅ Schema docs: [updated | no changes]
⚠️ Warnings: [any stale memories or missing files]
```

---

## Usage
```
/polish
```
Run at end of session, or whenever memory feels out of sync.

## Notes
- This command does NOT push to git (use /deploy for that)
- Does NOT run impeccable (use /impeccable polish for UI polish)
- Does NOT run security audit (use /audit --quick for that)
- Safe to run multiple times — idempotent
