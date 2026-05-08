# /session-open

Reloads full project context at the start of a new session so the agent hits the ground running.

**Usage:** `/session-open` (run at the START of every session)

---

## What This Command Does

1. Creates (or returns) the session file for today.
2. Reads the last session report + memory.
3. Prints a structured brief so work starts in under 60 seconds.

---

## Execution Steps

### Step 0 — Create Today's Session File

```bash
TODAY=$(date +%F)
SESSION_FILE=".claudedocs/sessions/${TODAY}.md"

if [ -f "$SESSION_FILE" ]; then
  echo "📄 Session file already exists — returning its content."
  cat "$SESSION_FILE"
else
  cat > "$SESSION_FILE" << 'TEMPLATE'
# Session — REPLACE_DATE

## أهداف اليوم

- [ ] 
- [ ] 
- [ ] 

---

## ✅ منجز

<!-- تملأ تلقائياً عند /session-close -->

## 🔧 قرارات تقنية

<!-- قرارات هامة اتُخذت خلال الجلسة -->

## 🚧 ما لم يكتمل

<!-- carry forward للجلسة القادمة -->
TEMPLATE
  # Fix the date placeholder
  sed -i "s/REPLACE_DATE/$TODAY/" "$SESSION_FILE"
  echo "✅ Session file created: $SESSION_FILE"
fi
```

### Step 1 — Read Context Files

```bash
# Last session report
ls .claudedocs/sessions/ | sort | tail -1  # find most recent

# Current todo list
cat .claudedocs/todo_list.md

# Last 3 memory entries
tail -80 .claude/memory.md

# Git status (any uncommitted changes?)
git status --short
git log --oneline -5
```

### Step 2 — Read Project State Files

Read these quickly (first 30 lines each):
- `.claude/CLAUDE.md` — tech stack reminder
- `prisma/schema.prisma` — current models (grep for model names only)
- `.claudedocs/roadmap_audit_april.md` — current roadmap status

### Step 3 — Run Quick Health Check

```bash
# Is the backend importable? (catch broken imports immediately)
cd [backend dir] && python -c "from app.main import app; print('✅ Backend OK')" 2>&1

# Are there obvious syntax errors in recently modified files?
git diff --name-only HEAD~1 HEAD | grep "\.py$" | xargs python -m py_compile 2>&1
```

### Step 4 — Print Session Brief

Output in chat:

```
╔══════════════════════════════════════════╗
║        SESSION OPEN — [TODAY]            ║
╚══════════════════════════════════════════╝

📅 Last Session: [date] — [1-line summary]
🔧 Backend: [✅ OK | ⚠️ Issues]
📋 Git: [X uncommitted files | ✅ Clean]

━━━ CONTINUE FROM HERE ━━━
🥇 Priority 1: [item from last session]
🥈 Priority 2: [item]
🥉 Priority 3: [item]

━━━ CURRENT PHASE ━━━
Phase [X]: [phase name] — [% complete estimate]

━━━ OPEN ISSUES TO BE AWARE OF ━━━
🔴 [Critical issue if any]
🟠 [High issue if any]

Ready. What do you want to work on?
```

---

## Quick Context Reference (Always Available After /session-open)

| Item | Location |
|------|----------|
| Tech stack | CLAUDE.md |
| Current roadmap | .claudedocs/roadmap_audit_april.md |
| DB schema | prisma/schema.prisma |
| API contract | .claude/memory.md (API Contract section) |
| Last session | .claudedocs/sessions/[latest].md |
| Open todos | .claudedocs/todo_list.md |
| Architecture rules | .claude/rules/ |
