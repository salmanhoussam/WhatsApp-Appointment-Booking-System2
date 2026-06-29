# /memory-sync

Manually triggers the memory-keeper agent to diff the current state against memory.md and append only new entries.

**Usage:** `/memory-sync` or `/memory-sync --full`

---

## When to Use

- After a long coding session without `/session-close`
- When memory.md feels stale or incomplete
- After a major architectural decision
- After a schema migration

---

## Execution Steps

### Step 1 — Find the Gap

```bash
# When was memory last updated?
grep "^## 20" .claude/memory.md | tail -5

# What happened since then?
git log --oneline --since="$(grep '^## 20' .claude/memory.md | tail -1 | awk '{print $2}')" 2>/dev/null \
  || git log --oneline -10
```

### Step 2 — Read Recent Session Files

```bash
# Find all sessions newer than last memory entry
ls .claudedocs/sessions/ | sort
```

Read each unrecorded session file.

### Step 3 — Diff and Write

Trigger `memory-keeper` agent with instructions:
- Only write entries dated AFTER the last entry in memory.md
- Cross-reference git log with session files
- Deduplicate: never write the same fix/feature twice

### Step 4 — Verify

After writing, print:
```
🧠 Memory synced
├── Last entry was: [old date]
├── New entries added: [count]
├── Date range covered: [old date] → [today]
└── .claude/memory.md is now current
```

---

## Flags

| Flag | Behavior |
|------|----------|
| `/memory-sync` | Append new entries only |
| `/memory-sync --full` | Re-read all sessions and rebuild memory from scratch (keeps old entries) |
| `/memory-sync --schema` | Schema changes only — useful after prisma migrations |
| `/memory-sync --decisions` | Architecture decisions only |
