# Project Health Monitoring Skill
# Salman SaaS — Beit Smar Platform

## Purpose

This skill teaches the agent how to assess and report on the health of the Salman SaaS platform across 5 dimensions. Read this before answering any question about "is the project ready?", "what's the status?", or "should we deploy?"

---

## The 5 Health Dimensions

### 1. 🔴 Security Health
**Check these files:**
- `app/core/security.py` — password hashing, JWT
- `app/core/config.py` — CORS origins, SECRET_KEY
- `app/services/public_service.py` — multi-tenant isolation

**Red flags (report immediately):**
```python
# Flag 1: Plain text password bypass
if not hashed_password.startswith("$2"):
    return plain_password == hashed_password  # ← CRITICAL

# Flag 2: Missing clientId in any DB query
await db.unit.find_many(where={"isActive": True})  # ← missing clientId!

# Flag 3: .env committed
git ls-files | grep "^\.env$"  # ← CRITICAL if returns anything
```

**Healthy state:**
- All passwords go through bcrypt (no plain text fallback)
- Every DB query has `clientId` filter
- `.env` is in `.gitignore` and NOT tracked
- CORS origins are restricted in production
- SECRET_KEY is not the default value

---

### 2. 🏗️ Architecture Health
**The 4-Layer Rule (IMMUTABLE):**
```
Routes (app/api/)         → HTTP only, zero DB calls
Services (app/services/)  → Business logic
Repositories (app/repo/)  → Prisma queries ONLY here
DB (Supabase)             → via Prisma
```

**Check for violations:**
```bash
# Should return nothing
grep -rn "await db\." app/api/ --include="*.py"
grep -rn "from prisma" app/api/ --include="*.py"
```

**Healthy state:** Routes never touch DB. Services orchestrate. Repos query.

---

### 3. 🗄️ Database Health
**Key invariants that must always be true:**

| Rule | Check |
|------|-------|
| Every booking has a clientId | `SELECT count(*) FROM bookings WHERE client_id IS NULL` should be 0 |
| No duplicate bookings | Check `@@unique([unitId, date])` on Price model |
| No orphaned units | Every unit has a valid `clientId` → `Client` row |
| Customer phone scoped | `@@unique([clientId, phone])` not global `@unique` |

**Schema drift detection:**
```bash
# Is schema out of sync with DB?
npx prisma db pull --print 2>&1 | grep "drift\|difference" || echo "✅ In sync"
```

---

### 4. 🖥️ Frontend Health
**React 19 + Framer Motion rules:**

```jsx
// ❌ CRASH — never do this
<div style={{ y: scrollYProgress }} />

// ✅ CORRECT
const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
<motion.div style={{ y }} />
```

**Routing health:**
- All pages using `useScroll`/WebGL must be lazy-loaded
- `IS_SUBDOMAIN_MODE` detection must be at module scope (not in render)
- Every tenant must be registered in `src/router/tenants/index.js`

**Healthy state:**
- No `MotionValue` in `style={{}}`
- No direct imports of WebGL components in templates
- Language toggle persists to localStorage

---

### 5. 📊 Feature Health (Launch Readiness)

Read `roadmap_audit_april.md` Section 1 for ✅ status.

**Launch Blockers (must be ✅ before going live):**
- [ ] `Unit.price` field in schema + surfaced in API
- [ ] Gallery admin tab (upload/reorder/delete)
- [ ] Unit image upload UI (file picker, not URL input)
- [ ] Global `<ErrorBoundary>` in App.jsx
- [ ] SEO meta tags in `index.html`

**Nice-to-have (can launch without):**
- Language persistence
- Booking CSV export
- Analytics (Posthog)
- Housekeeping/Maintenance tabs

---

## Health Score Formula

When asked "is the project healthy?", calculate:

```
Security:     [0/5 critical issues] × 40 = ___ / 40
Architecture: [0/3 violations]     × 20 = ___ / 20
Database:     [0/4 invariants]     × 20 = ___ / 20
Frontend:     [0/3 rules broken]   × 10 = ___ / 10
Features:     [X/5 blockers done]  × 10 = ___ / 10
                                  TOTAL = ___ / 100
```

**Score interpretation:**
- 90-100: ✅ Deploy
- 70-89: ⚠️ Deploy with caution
- 50-69: 🟡 Fix high issues first
- < 50: 🔴 Not ready

---

## How to Report Health

When the user asks "what's the project status?", output:

```
📊 Project Health Report — [date]
Overall: [score]/100 — [status]

Security:     [score]/40  [⚠️ issue if any]
Architecture: [score]/20  ✅
Database:     [score]/20  ✅
Frontend:     [score]/10  [⚠️ issue if any]
Features:     [score]/10  [X/5 blockers complete]

Top 3 Actions:
1. [Most critical]
2. [Second]
3. [Third]
```
