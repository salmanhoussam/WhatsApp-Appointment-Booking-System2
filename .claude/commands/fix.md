# /fix

Looks up a known issue by ID and directs the appropriate agent to fix it immediately.

**Usage:** `/fix [ISSUE-ID]`  
**Example:** `/fix SEC-01` or `/fix ARCH-02` or `/fix BUG-03`

---

## What This Command Does

1. Reads the issue ID from the argument.
2. Searches roadmap and audit files for the issue definition.
3. Determines severity and the correct specialist agent.
4. Provides the agent with full context and instructs it to fix immediately.

---

## Execution Steps

### Step 1 — Validate Argument

```bash
ISSUE_ID="$1"

if [ -z "$ISSUE_ID" ]; then
  echo "❌ Usage: /fix [ISSUE-ID]"
  echo "   Examples: /fix SEC-01 | /fix ARCH-02 | /fix BUG-03 | /fix PERF-01"
  exit 1
fi

echo "🔍 Looking up issue: $ISSUE_ID"
```

### Step 2 — Search Known Issue Files

Search these files (in order) for the issue ID:

```bash
FILES=(
  ".claudedocs/roadmap_audit_may.md"
  ".claudedocs/roadmap/upcoming.yaml"
  ".claudedocs/architecture/database_report.md"
  ".claudedocs/sessions/"  # last 3 session files
  ".claude/memory/MEMORY.md"
)

# Grep for the issue ID across all these locations
grep -rn "$ISSUE_ID" "${FILES[@]}" 2>/dev/null | head -30
```

If not found in any file, tell the user:
> "Issue `{ISSUE_ID}` not found in roadmap or audit files. Run `/audit` first to catalogue open issues, or describe the issue manually."

### Step 3 — Classify the Issue

Based on the prefix:

| Prefix | Domain | Assigned Agent |
|--------|--------|----------------|
| `SEC-*` | Security | `backend-architect` |
| `ARCH-*` | Architecture | `backend-architect` |
| `BUG-*` | Bug / Runtime | Domain-specific (see below) |
| `PERF-*` | Performance | `backend-architect` |
| `UI-*` | Frontend UI | `Frontend-Architect-Agent` |
| `FM-*` | Framer Motion / React | `Frontend-Architect-Agent` |
| `SCHEMA-*` | DB Schema | `backend-architect` |
| `ROUTE-*` | Routing | `Frontend-Architect-Agent` |

For `BUG-*`, determine agent from the file path in the issue description:
- `app/` or `prisma/` → `backend-architect`
- `frontend/src/` → `Frontend-Architect-Agent`

### Step 4 — Build Fix Brief

Compose a fix brief for the agent:

```
ISSUE:    {ISSUE_ID}
PRIORITY: [🔴 Critical | 🟠 High | 🟡 Medium] — inferred from issue text
LOCATION: [file:line from search results]
CONTEXT:  [description from roadmap/audit]

INSTRUCTIONS:
1. Read the file(s) mentioned above.
2. Apply the minimal fix that resolves the issue.
3. Do not refactor surrounding code.
4. Confirm the fix is applied and explain what changed.
```

### Step 5 — Execute Fix

Invoke the assigned agent with the brief from Step 4.

After the fix is applied:
```
╔══════════════════════════════════════════╗
║        FIX APPLIED ✅                    ║
╚══════════════════════════════════════════╝

Issue:    {ISSUE_ID}
Agent:    {agent-name}
Files:    [modified files]
Status:   Fixed — ready to commit

Run /deploy to push the fix.
```

---

## Severity Reference

| Level | Meaning | Action |
|-------|---------|--------|
| 🔴 Critical | Security breach, data loss, crash | Fix before any other work |
| 🟠 High | Feature broken, wrong data returned | Fix this session |
| 🟡 Medium | Degraded UX, edge case | Schedule for next session |
| 🟢 Low | Code quality, style | Batch with next refactor |

---

## Notes

- If the issue requires a DB migration (`npx prisma db push`), the agent will include that step.
- If the fix touches `prisma/schema.prisma`, the agent will automatically append to `.claudedocs/architecture/database_report.md`.
- Never skip the issue lookup — always read the context before fixing to avoid misidentifying the problem.
