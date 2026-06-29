# Security Sprint — 2026-05-30
**Triggered by:** `/bo-hussein` → Option A: Security Sprint
**Agent used:** `cyber-sentinel` (built this session)
**Status:** Critical + High FIXED ✅ | Medium flagged ⚠️ | Plan ready for deploy

---

## What We Built First: cyber-sentinel Agent

Before any fixes, we built a reusable security agent permanently added to the platform.

**File:** `.claude/agent/cyber-sentinel.md`
**Registered in:** `.claude/CLAUDE.md` (Agents section) + `.claude/agent/bo-hussein.md` (routing map)
**Capabilities:** 10 threat classes (T1–T10), scan → triage → fix → verify protocol
**Invocation:** `"شغّل cyber-sentinel على المشروع"` or `"security scan before deploy"`

---

## Pre-Scan: Already Secure (confirmed by cyber-sentinel)

| ID | Description | File | Status |
|----|-------------|------|--------|
| SEC-01 | bcrypt-only auth, no plain-text fallback | `app/core/security.py:14` | ✅ Already fixed |
| SEC-02 | Race condition guard in booking creation | `app/services/public_service.py:483` | ✅ Already fixed |
| SEC-04 | Customer.phone unique per-tenant | `prisma/schema.prisma:257` — `@@unique([clientId, phone])` | ✅ Already fixed |
| T3 | require_service() gate on all public module endpoints | `app/api/v1/public/` | ✅ Confirmed clean |
| T5 | No raw SQL with user input | `app/` | ✅ Confirmed clean |
| T6 | No hardcoded secrets in source | `app/` | ✅ Confirmed clean |
| T9 | CORS uses explicit whitelist in production | `app/main.py` | ✅ Confirmed clean |

---

## Fixes Applied This Session

### 🔴 CRITICAL — T1: Multi-Tenant Data Leak

**File:** `app/repositories/booking_repo.py`
**Line:** ~76 (`check_availability` function)
**Vulnerability:** `booking.find_many(where={"unitId": unit_id})` — missing `clientId` filter.
Any authenticated user could probe booking dates of units belonging to other tenants (cross-tenant availability oracle).

**Fix applied:**
```python
# BEFORE — dangerous
return await self.db.booking.find_many(
    where={"unitId": unit_id}
)

# AFTER — tenant-isolated
return await self.db.booking.find_many(
    where={
        "unitId":   unit_id,
        "clientId": client_id,   # ← added
    }
)
```
Caller `app/services/booking_service.py` updated to pass `client_id=client_id`.

---

### 🟠 HIGH — T7-001: Internal Error Leak (public bookings endpoint)

**File:** `app/api/v1/public/bookings.py:49`
**Vulnerability:** `except Exception as e: raise HTTPException(detail=str(e))`
Raw Prisma/DB exception messages (table names, constraint names) leaked to public callers.

**Fix applied:** Narrowed catch to `ValueError` only (intentional domain errors from BookingService).
Generic `Exception` now falls through to the global 500 handler which never leaks internals.
Added `logger.info()` for the ValueError branch.

---

### 🟠 HIGH — T7-002: Internal Error Leak (onboarding endpoint)

**File:** `app/api/v1/onboarding.py:85`
**Vulnerability:** Same `except Exception as e: raise HTTPException(detail=str(e))` pattern.
DB constraint violations during tenant registration leaked raw Prisma error text to the n8n caller.

**Fix applied:** Split into two blocks:
- `ValueError` → log at WARNING, re-raise with safe message
- `Exception` → log at ERROR with `exc_info=True`, return generic 500

---

### 🟠 HIGH — T7-003: DB Error in /health Endpoint

**File:** `app/main.py:82` (`/health` route)
**Vulnerability:** `return {"detail": str(e)}` on DB failure — Prisma connection string fragments and pool error messages visible in response body.

**Fix applied:** Removed `detail` from the 503 response body entirely. DB error goes to server log only.

---

### 🟡 MEDIUM — T6-001: Weak Default WHATSAPP_VERIFY_TOKEN (production guard)

**File:** `app/core/config.py:71`
**Vulnerability:** Default value `"my_secure_token"` — trivially guessable. Someone knowing the webhook URL could register their own Meta app against it in dev environments.

**Fix applied:** Added startup guard — server refuses to start if `WHATSAPP_VERIFY_TOKEN == "my_secure_token"` AND `ENVIRONMENT == "production"`.

```python
# Added alongside existing SECRET_KEY guard
if settings.WHATSAPP_VERIFY_TOKEN == "my_secure_token" and settings.ENVIRONMENT == "production":
    raise RuntimeError("WHATSAPP_VERIFY_TOKEN must be changed from default in production")
```

---

## Flagged (Not Fixed — Next Sprint)

### 🟡 T4-001: Access Token TTL = 24 hours
**File:** `app/core/config.py:28` — `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24`
**Risk:** Compromised admin JWT stays valid for 24h with no refresh-token invalidation.
**Recommended fix:** Reduce to 120 min + implement `POST /auth/refresh` endpoint with rotating refresh tokens.
**Effort:** ~4h (architectural change — requires frontend update too)
**Priority:** Before first enterprise/paid client

### 🟡 T9-001: CORS Wildcard in Dev Mode
**File:** `app/main.py:41` — `allow_origins=["*"]` when `ENVIRONMENT != "production"`
**Risk:** If Railway deploys without `ENVIRONMENT=production` env var, CORS is wide open.
**Recommended fix:** Replace env-based toggle with explicit `ALLOW_ALL_ORIGINS=true` flag. Default to production-safe origins.
**Effort:** 30 min
**Priority:** Before Cloudflare custom domain goes live

---

## Files Changed (this sprint)

| File | Change |
|------|--------|
| `app/repositories/booking_repo.py` | T1: clientId added to check_availability() |
| `app/services/booking_service.py` | T1: pass client_id to check_availability() |
| `app/api/v1/public/bookings.py` | T7-001: narrow catch + logger |
| `app/api/v1/onboarding.py` | T7-002: split ValueError/Exception + logger |
| `app/main.py` | T7-003: remove str(e) from /health 503 body |
| `app/core/config.py` | T6-001: WHATSAPP_VERIFY_TOKEN production guard |
| `.claude/agent/cyber-sentinel.md` | NEW: security agent (10 threat classes) |
| `.claude/CLAUDE.md` | Registered cyber-sentinel in Agents section |
| `.claude/agent/bo-hussein.md` | Added cyber-sentinel to routing map |

---

## Verification

```bash
python -m py_compile \
  app/repositories/booking_repo.py \
  app/services/booking_service.py \
  app/api/v1/public/bookings.py \
  app/api/v1/onboarding.py \
  app/main.py \
  app/core/config.py
# → ✅ All files compile clean (verified 2026-05-30)
```

---

## Deploy Checklist

- [x] T1 Critical fixed
- [x] T7 High (×3) fixed
- [x] T6 Medium (production guard) fixed
- [x] Syntax check passed on all modified files
- [ ] Memory updated (memory-keeper running)
- [ ] Git commit + push → Railway auto-deploy
- [ ] Smoke test: `demo.salmansaas.com/smar/home` + booking flow
- [ ] Verify Railway env has `ENVIRONMENT=production` (T9-001 mitigation)

---

## Verdict

**⚠️ DEPLOY WITH CAUTION → ✅ SAFE AFTER ENV CHECK**

Ensure Railway has: `ENVIRONMENT=production`, `WHATSAPP_VERIFY_TOKEN=<strong random>`, `SECRET_KEY=<strong random>`
