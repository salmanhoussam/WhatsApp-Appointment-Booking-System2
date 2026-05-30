# Cyber-Sentinel Skill Reference
# FastAPI + Prisma + Supabase — Security Patterns 2025
# اقرأ هذا كاملاً قبل أي عملية فحص أو إصلاح

---

## Stack Context — SalmanSaaS

```
Backend:  FastAPI (Python) + Prisma ORM + Supabase PostgreSQL
Auth:     PyJWT 2.11.0 — HS256 — access tokens only (no refresh yet)
Hashing:  bcrypt (direct import — no passlib)
Multi-tenant: clientId on EVERY Prisma query — enforced in repositories/
4-Layer:  Routes → Services → Repositories → DB (strict)
```

---

## PART 1 — The 10 Threat Classes (T1–T10)

### T1 — Multi-Tenant Data Leak (الأولوية القصوى)
Any Prisma query on a shared table without `clientId`/`client_id` in the `where` clause
leaks data across tenants.

**Scan:**
```bash
grep -rn "find_many\|find_first\|find_unique\|update_many\|delete_many" app/repositories/ app/services/
# Flag: any result where clientId or client_id NOT in the same where={...} block
```

**Pattern to reject:**
```python
# ❌
await db.booking.find_many(where={"status": "confirmed"})
# ✅
await db.booking.find_many(where={"clientId": client_id, "status": "confirmed"})
```

---

### T2 — ARCH-01: Prisma Calls in Routes Layer
Direct `prisma_client.*` usage inside `app/api/` files violates the 4-Layer rule.
Not an immediate security hole, but bypasses the clientId enforcement layer.

**Scan:**
```bash
grep -rn "prisma_client\." app/api/
grep -rn "from app.db" app/api/
```

---

### T3 — Missing require_service() Gate
Every public module endpoint (restaurant, store, booking, reservations) must call
`require_service()` as the first FastAPI Depends. No gate = any tenant accesses any module.

**Scan:**
```bash
grep -rn "^@router\." app/api/v1/public/ -A 10 | grep -B5 "async def" | grep -v "require_service"
```

---

### T4 — Auth & JWT Issues

**Known issues in this codebase:**
- `ACCESS_TOKEN_EXPIRE_MINUTES = 1440` (24h) — should be ≤ 120 min
- No token revocation / logout blocklist
- JWT claims: always include `exp` + `type` + `slug`

**CVE Watch — python-jose:**
- CVE-2024-33663: ECDSA algorithm confusion → signature forgery
- CVE-2025-61152: `alg=none` bypass → forged admin token accepted
- **Status in SalmanSaaS: python-jose must be REMOVED. Use PyJWT (already in requirements).**

**PyJWT migration pattern:**
```python
# REMOVE THIS:
from jose import JWTError, jwt

# USE THIS (PyJWT — already installed):
import jwt
from jwt.exceptions import InvalidTokenError

def create_access_token(data: dict, expires_delta=None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except InvalidTokenError:
        return None
```

---

### T5 — Input Validation / SQL Injection
Prisma ORM prevents most SQL injection automatically. Risk only in raw queries.

**Scan:**
```bash
grep -rn "execute_raw\|query_raw" app/
# Flag: any execute_raw with f-string or + string concatenation
```

---

### T6 — Secret / Credential Exposure

**Scan:**
```bash
grep -rn "eyJ\|sk_live\|sk_test" app/ --include="*.py"
grep -rn "= ['\"].*secret\|= ['\"].*password\|= ['\"].*key" app/core/config.py
git ls-files | grep "\.env"
```

**Production guards already in config.py:**
- SECRET_KEY must not be default
- WHATSAPP_VERIFY_TOKEN must not be default (added 2026-05-30)

---

### T7 — Error Messages Leaking Internal State
Never return `str(e)` from generic `Exception` handlers to API callers.
Only `ValueError` (intentional domain errors) may be surfaced.

**Scan:**
```bash
grep -rn "detail=str(e)\|detail.*str(e)" app/api/
# Flag: any except Exception (not ValueError) that returns str(e)
```

**Fixed locations (2026-05-30):** bookings.py, onboarding.py, main.py /health

---

### T8 — Race Conditions
Double-booking / double-order: must have a final `find_first` overlap check
immediately before the `create` call (no other DB operations between them).

**Fixed (2026-05-26):** `public_service.py:483` — race condition guard confirmed present.

---

### T9 — CORS Misconfiguration

**Critical pattern to NEVER use:**
```python
# ❌ wildcard + credentials = exploitable CSRF chain (CVE-2025-34291 Langflow pattern)
CORSMiddleware(allow_origins=["*"], allow_credentials=True)
```

**Current status:** Production uses explicit whitelist ✅. Dev mode uses `["*"]` — acceptable
only if `ENVIRONMENT=production` is always set on Railway.

**Recommended fix:** Replace env-based toggle with explicit `ALLOW_ALL_ORIGINS=true` flag.

---

### T10 — Silent Exception Swallowing
```python
# ❌ swallows errors, masks bugs
except Exception:
    pass

# ✅ log it, don't swallow
except Exception as e:
    logger.error("Unexpected error: %s", e, exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")
```

---

## PART 2 — New Checks (from 2025 Security Research)

### CHECK-SEC-01: python-jose Import Detection 🔴 CRITICAL
```
Pattern: from jose import | import jose
Action: BLOCK deploy — CVE-2024-33663 + CVE-2025-61152
Fix: Remove python-jose from requirements.txt, use PyJWT (already installed)
```

### CHECK-SEC-02: CORS Wildcard + Credentials 🔴 CRITICAL
```
Pattern: allow_origins=["*"] AND allow_credentials=True in same block
Action: BLOCK — CSRF data-theft chain possible
Fix: Use explicit origins list always
```

### CHECK-SEC-03: No Rate Limiting on Auth Routes 🟠 HIGH
```
Pattern: @router.post on /login, /auth, /register, /token without @limiter.limit
Action: WARN — brute force / credential stuffing
Fix: slowapi @limiter.limit("5/minute")
```

### CHECK-SEC-04: Starlette BadHost Version 🟠 HIGH
```
Pattern: starlette < 1.0.1
CVE: CVE-2026-48710 — malformed Host header bypasses tenant slug extraction
Action: BLOCK — upgrade starlette via fastapi upgrade
```

### CHECK-SEC-05: JWT Lifetime > 4 Hours 🟡 MEDIUM
```
Pattern: ACCESS_TOKEN_EXPIRE_MINUTES > 240
Action: WARN — no revocation means stolen tokens last too long
Fix: Reduce to 120min + add refresh token endpoint
```

### CHECK-SEC-06: Raw SQL with String Interpolation 🔴 CRITICAL
```
Pattern: execute_raw(f"..." or execute_raw("..." + variable)
Action: BLOCK — SQL injection
Fix: Use Prisma parameterized raw queries only
```

### CHECK-SEC-07: API Docs Exposed in Production 🟡 MEDIUM
```
Pattern: FastAPI() with no docs_url=None when ENVIRONMENT=production
Action: WARN — full API reconnaissance surface
Fix: FastAPI(docs_url=None, redoc_url=None) in production
```

### CHECK-SEC-08: Missing clientId in Repository Queries 🔴 CRITICAL
```
Pattern: prisma_client.*.find_many/find_first without clientId in where={}
Action: BLOCK — cross-tenant BOLA vulnerability (same as T1)
```

### CHECK-SEC-09: bcrypt Password Truncation Risk 🟡 MEDIUM
```
Pattern: bcrypt.hashpw without prior len(password) <= 72 check
Action: WARN — passwords > 72 bytes silently truncated, weakens security
Fix: Add guard or migrate to argon2-cffi
```

### CHECK-SEC-10: Host Header Tenant Resolution Without Patch 🟠 HIGH
```
Pattern: request.headers.get("host") used for slug extraction + starlette < 1.0.1
Action: BLOCK — BadHost CVE exploitable on this code path
Fix: Upgrade starlette first
```

---

## PART 3 — Library Reference (2025 Status)

| Package | Safe Version | CVEs in Old | Action |
|---------|-------------|-------------|--------|
| `PyJWT` | ✅ 2.11.0 | None | Keep — sole JWT library |
| `python-jose` | ❌ ALL versions | CVE-2024-33663, CVE-2025-61152 | **REMOVE** |
| `fastapi` | ✅ 0.115.x+ | — | Upgrade from 0.132.0 → check latest |
| `starlette` | ✅ ≥ 1.0.1 | CVE-2026-48710 (BadHost), CVE-2025-54121, CVE-2025-62727 | Upgrade via fastapi |
| `bcrypt` | ✅ 4.2.1 | 5.0.x API instability | Pin to 4.2.1 or migrate to argon2-cffi |
| `slowapi` | ✅ 0.1.9 | None | ADD for rate limiting |
| `secure` | ✅ 0.3.0 | None | ADD for security headers |
| `passlib` | ❌ unmaintained | — | Do NOT add |

---

## PART 4 — Rate Limiting Pattern (slowapi)

```python
# app/main.py — add after app = FastAPI(...)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# In route files — add decorator ABOVE @router.post:
@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginSchema, db=Depends(get_db)):
    # request: Request MUST be the first param for slowapi to work
    ...
```

**Apply to:**
- POST `/api/v1/auth/login` (or wherever the login route is)
- POST `/api/v1/public/*/register`
- POST `/api/v1/public/*/book` (prevent booking spam)
- POST `/api/v1/public/ai/chat` (already has in-memory limiter — replace with slowapi)

---

## PART 5 — Security Headers (secure middleware)

```python
# app/main.py
import secure

secure_headers = secure.Secure.with_default_headers()

@app.middleware("http")
async def set_secure_headers(request: Request, call_next):
    response = await call_next(request)
    secure_headers.framework.fastapi(response)
    return response
```

Adds automatically: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`.

---

## PART 6 — Pre-Deploy Security Checklist

Run before every deploy:

```bash
# 1. No python-jose imports
grep -rn "from jose\|import jose" app/ && echo "❌ python-jose found" || echo "✅ jose clean"

# 2. No raw SQL string interpolation
grep -rn "execute_raw.*f['\"\|execute_raw.*+" app/ && echo "❌ raw SQL risk" || echo "✅ raw SQL clean"

# 3. No hardcoded secrets
grep -rn "eyJ\|sk_live" app/ --include="*.py" && echo "❌ secrets in code" || echo "✅ no hardcoded secrets"

# 4. clientId check in repositories (spot check)
grep -rn "find_many\|find_first" app/repositories/ | grep -v "clientId\|client_id\|slug" | head -5

# 5. Check starlette version
python -c "import starlette; print('starlette:', starlette.__version__)"

# 6. Syntax check all modified py files
git diff --name-only HEAD | grep "\.py$" | xargs python -m py_compile
```
