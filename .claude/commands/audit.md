# /audit

Runs a full system audit, writes a dated report to `.claudedocs/`, and updates memory.

**Usage:** `/audit` or `/audit --pre-deploy`

---

## What This Command Does

Triggers the `system-auditor` agent to scan the entire codebase and produce:
1. A security scan (multi-tenancy leaks, plain-text passwords, hardcoded secrets)
2. An architecture compliance check (4-layer violations)
3. A schema health check (missing indexes, broken tenant isolation)
4. A frontend safety check (React 19 MotionValue crashes)
5. A dated audit report in `.claudedocs/audit_[date].md`
6. A memory update in `.claude/memory.md`

---

## Execution Steps

### Step 1 — Run Security Scan

```bash
echo "🔍 Running security scan..."

# 1a. Plain-text password fallback
echo "\n[SEC-01] Checking for plain-text password comparison..."
grep -n "startswith.*\\\$2\|plain_password ==" app/core/security.py && echo "⚠️ Found!" || echo "✅ Clean"

# 1b. DB queries missing clientId
echo "\n[SEC-02] Checking for queries missing clientId filter..."
grep -rn "find_first\|find_many" app/services/ app/repositories/ \
  | grep -v "clientId\|client_id\|slug" | head -20

# 1c. .env committed to git
echo "\n[SEC-03] Checking if .env is tracked by git..."
git ls-files | grep "^\.env$" && echo "🔴 .env is COMMITTED — REMOVE IMMEDIATELY" || echo "✅ .env not tracked"

# 1d. Race condition in booking creation
echo "\n[SEC-04] Checking for availability re-check in create_public_booking..."
grep -A 5 "create_public_booking" app/services/public_service.py \
  | grep "conflict\|overlap\|availability" && echo "✅ Check exists" || echo "⚠️ No conflict check found"
```

### Step 2 — Run Architecture Check

```bash
echo "\n🏗️ Running architecture compliance check..."

# Routes must not call Prisma directly
echo "\n[ARCH-01] Checking for Prisma calls in Routes..."
grep -rn "await db\.\|prisma\." app/api/ --include="*.py" \
  | grep -v "from app\|#" | head -10 && echo "⚠️ Found!" || echo "✅ Clean"

# React components must not call API directly
echo "\n[ARCH-02] Checking for API calls in design-system..."
grep -rn "axios\|fetch\|publicApi" frontend/src/design-system/ --include="*.jsx" \
  | grep -v "organisms\|#" | head -10 && echo "⚠️ Found in atoms/molecules!" || echo "✅ Clean"
```

### Step 3 — Run Schema Check

```bash
echo "\n🗄️ Running schema health check..."

# Check Customer phone uniqueness
echo "\n[SCHEMA-01] Checking Customer.phone uniqueness scope..."
grep -A 20 "model Customer" prisma/schema.prisma \
  | grep -E "@unique|@@unique" | head -5

# Check all models have clientId index
echo "\n[SCHEMA-02] Checking @@index([clientId]) presence..."
for model in Client Unit Booking Customer Price Service GalleryImage; do
  grep -A 30 "model $model " prisma/schema.prisma | grep "clientId" \
    && echo "  ✅ $model has clientId" || echo "  ⚠️ $model missing clientId filter"
done
```

### Step 4 — Write Report

Create the file `.claudedocs/audit_[TODAY].md` using this template:

```markdown
# System Audit Report — [TODAY]
**Triggered by:** /audit command
**Status:** [CLEAN ✅ | ISSUES FOUND ⚠️ | BLOCKED 🔴]

## Executive Summary
| Check | Result |
|-------|--------|
| SEC-01 Plain-text passwords | ✅/⚠️ |
| SEC-02 Multi-tenant isolation | ✅/⚠️ |
| SEC-03 .env not committed | ✅/⚠️ |
| SEC-04 Race condition guard | ✅/⚠️ |
| ARCH-01 Routes purity | ✅/⚠️ |
| ARCH-02 Component isolation | ✅/⚠️ |
| SCHEMA-01 Phone uniqueness | ✅/⚠️ |
| SCHEMA-02 clientId indexes | ✅/⚠️ |

## Issues Found
[List each issue with: Severity | File:Line | Description | Fix]

## Recommended Actions
[Ordered list — most critical first]

## Deploy Recommendation
[✅ SAFE TO DEPLOY | ⚠️ DEPLOY WITH CAUTION | 🔴 DO NOT DEPLOY]
```

### Step 5 — Update Memory

Append to `.claude/memory.md`:
```markdown
## [TODAY] — Audit Run
- Triggered: /audit command
- Critical: [count] | High: [count] | Clean: [count]
- Report: .claudedocs/audit_[date].md
- Deploy status: [SAFE | BLOCKED]
```

---

## Output

Display a summary table in the chat, then:
```
📋 Full report: .claudedocs/audit_[date].md
🧠 Memory updated: .claude/memory.md
```

---

## Flags

| Flag | Behavior |
|------|----------|
| `/audit` | Full scan |
| `/audit --pre-deploy` | Full scan + stricter checks + blocks deploy if any 🔴 found |
| `/audit --quick` | Security scan only (no architecture/schema checks) |
| `/audit --security` | SEC checks only |
