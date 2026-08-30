# Production Functional Sweep — 2026-08-30

Follows: `investigation-protocol.md` (evidence discipline), `browser-verification-protocol.md`
(real Playwright MCP evidence before any frontend conclusion).

Trigger: Salman's explicit decision (2026-08-30) — Production Readiness sequencing is now
Functional Sweep → Security Sweep → Production configuration/integrations → UI Polish (Material
Pack v2 + Message 07 + Mr H real footage, all deferred, documented) → Final smoke test → Final
readiness report. This file tracks the first stage: Functional Sweep.

Format per item, per Salman's own instruction: **PASS / FAIL / UNKNOWN → evidence → bug if found →
fix → re-test.**

Primary test tenant: `rk` (RK Barber Shop) on `alzabt.salmansaas.com` — the platform's reference
tenant, real known-working admin credentials on file from this session's earlier work. A second,
independent tenant is spot-checked per item where isolation/cross-tenant behavior matters, per
`browser-verification-protocol.md`'s "a working page on one tenant does not mean the app-wide chain
is confirmed" rule.

---

## Checklist

| # | Flow | Status | Notes |
|---|---|---|---|
| 1 | Public tenant resolution | ✅ PASS | rk public page, real content, 0 console errors, config 200 |
| 2 | Menu/catalog | ✅ PASS | services + products render with real DB data, categories/items 200 |
| 3 | Cart/order (mechanics) | ✅ PASS (submission untested) | add-to-cart, qty, total, checkout form all work; actual order creation not submitted — awaiting scope decision on test writes |
| 4 | Reservation (direct/website) | ✅ PASS | full flow verified end-to-end, cleaned up |
| 5 | WhatsApp booking (bot conversation) | ✅ FIXED + re-verified | DB-backed session store shipped (`49e0a18`); full 7-step conversation re-run against live production, real Reservation + Customer rows created — see `.claudedocs/implementation/WHATSAPP_DB_SESSIONS_FIX/evidence.md` |
| 6 | Dashboard | ✅ PASS | login persisted, Calendar loaded, 0 console errors |
| 7 | Staff | ⚠️ PASS + finding | tab works; leftover hidden test staff record still in prod DB |
| 8 | Calendar | ✅ PASS | جعفر fix holds — only حسين (active) shows as a live column |
| 9 | Services | ⚠️ PASS + finding | tab works; leftover hidden test service record still in prod DB |
| 10 | Units/resources | ⏳ pending | |
| 11 | Images/uploads | ⏳ pending | |
| 12 | Email/Resend | ⏳ pending | |
| 13 | Tenant status / Hard-Soft Block | ⏳ pending | |
| 14 | Admin authorization | ⏳ pending | |
| 15 | Bilingual/public pages | ⏳ pending | |

---

## Evidence Log

### #1 Public tenant resolution — PASS
- Navigated real Playwright browser to `https://alzabt.salmansaas.com/rk`.
- `document.getElementById('root').innerHTML.length` = 39,665 — real content rendered, not blank.
- `document.body.innerText` shows correct real RK Barber Shop Arabic content (hero, about, hours,
  footer WhatsApp link `+96176985477`).
- Console: 0 messages at warning level or above.
- Network: `GET /api/v1/public/rk/config` → 200, `GET /api/v1/public/rk/catalog/categories` → 200.
- **Side finding (not a functional failure):** `document.title` stays the generic
  `"SalmanSaaS — Cloud Business Solutions"` — never set to the tenant's own name. Cosmetic
  (browser tab / SEO), not a broken flow. Not fixed in this sweep — noted for the UI Polish phase.

### #2 Menu/catalog — PASS
- Same page load as #1. Services section (`خدماتنا`) renders 6 real services (شعر $5, شعر ودقن $5,
  كرياتين $5, دقن $5, تمشيط أو تسريح $5, حنة أو صبغة $5) each with a real "احجز الآن" CTA.
- Products section (`منتجاتنا`) renders 4 real products (سبراي تثبيت الشعر $8, واكس تصفيف الشعر
  $10, جل تصفيف الشعر $7, عطر ريحة رجالي $22) with images and "+ أضف للسلة" CTAs.
- Network: `GET /api/v1/public/store/categories`, `GET /api/v1/public/store/products`,
  `GET /api/v1/public/rk/catalog/categories/{id}/items` — all 200.

### #3 Cart/order (mechanics) — PASS, submission deliberately not tested
- Clicked a real "+ أضف للسلة" button (سبراي تثبيت الشعر, $8) → floating cart button appeared
  ("1 عرض السلة") → opened → drawer shows item, qty controls (−/+/×), correct total (٨USD).
- Clicked "إتمام الطلب" → navigated to `/rk/cart`, full checkout form present: الاسم*, رقم الهاتف*,
  عنوان التوصيل (optional), طريقة الدفع (dropdown), ملاحظات, "تأكيد الطلب" button — correctly
  **disabled** until required fields (name/phone) are filled. A second path also exists:
  "متابعة الطلب عبر واتساب" (continue via WhatsApp) button, separate from the direct-order form.
- **Side finding:** the طريقة الدفع dropdown shows raw literal option values `cash`/`card`
  (English), not translated Arabic labels (e.g. `نقدًا`/`بطاقة`) — a real i18n gap, not a functional
  break.
- **Deliberately stopped here** — did not fill in real name/phone or click "تأكيد الطلب"/submit via
  WhatsApp, to avoid creating a real fake order in RK's live production data (same caution as the
  earlier accidental-hero-overwrite lesson this session). Actual order-creation submission is
  therefore **UNKNOWN**, not PASS, pending Salman's decision on test-write scope for this sweep.

### #6 Dashboard — PASS
- `https://alzabt.salmansaas.com/rk/dashboard` (existing persisted session, real RK TENANT_ADMIN)
  auto-loaded straight into `/rk/dashboard/calendar` — full sidebar nav present (نظرة عامة, التقويم,
  الحجوزات, الموظفون, المتجر, العملاء, الإشعارات, الإعدادات, خروج). Console: 0 warnings/errors.

### #8 Calendar — PASS (confirms yesterday's fix still holds)
- Only **حسين** (active barber) renders as a live Calendar column — جعفر (deactivated 2026-08-29)
  correctly does not appear. Real counts render (0 حجز اليوم — genuinely 0 for 2026-08-30, not a
  loading artifact — filters/stat cards all consistently show 0). "+ حجز جديد" button present.

### #7 Staff — PASS, with a real finding
- Staff list (`/rk/dashboard/staff`) shows 3 records: حسين (active, 09:00–21:00), جعفر (hidden,
  correct), and **"Test Staff QA"** (phone `96170000001`, hidden, 09:00–18:00).
- **Finding:** "Test Staff QA" is real leftover test data still sitting in RK's live production DB
  from an earlier debugging/verification pass this session. It's correctly hidden (doesn't appear
  publicly or on the Calendar — same mechanism verified in #8), so it's not currently visible to
  real customers, but it is clutter in a real production tenant's data that was never deleted.

### #9 Services — PASS, with a real finding
- Services list (`/rk/dashboard/staff` → الخدمات tab) shows the 6 real RK services (matches #2's
  public-page numbers exactly) **plus "خدمة تجريبية QA"** (25 min, $9), also hidden but still a real
  leftover row in the production `CatalogCategory`/`CatalogItem` tables.
- Edit/hide/reorder controls present and appear functional (not exercised further to avoid
  unrelated writes).

### Test-data cleanup — investigated, no hard-delete capability exists
- Traced 3 backend routers: `admin/catalog.py`'s `DELETE /items/{id}` → `soft_delete_item()` →
  `isActive=False` (same as "hide"); `admin/services.py`'s `DELETE /{id}` → confirmed not even the
  right router for RK (its own docstring: exclusively the legacy property/unit add-on path, never
  used by Clinic/Barber tenants); `admin/catalog_services.py` (the router RK's Dashboard Staff→
  Services tab actually calls, `/catalog-services/`) has no DELETE route at all — GET/POST/PATCH
  only.
- Confirmed via `GET /admin/barbers/` and `GET /admin/reservations/?barber_id=...`: "Test Staff QA"
  (id `84fefe44-74fe-4c3d-a388-c095dc76b82e`) has **0 reservations** referencing it — safe to
  remove if a hard-delete path existed. It doesn't.
- Confirmed via `GET /admin/catalog-services/?include_inactive=true`: "QA Test Service" (id
  `4d23c866-3706-47ec-8a9a-0779f095adb0`) is already `is_active: false`.
- No direct DB access available from this environment (local Prisma client → Supabase pooler:
  `P1001 Can't reach database server`) and no Railway CLI session to run a script inside Railway's
  network. Conclusion: **deactivated is the actual, permanent cleanup this platform supports for
  these entity types** — matches the same design already applied to جعفر (barbers/services are
  soft-delete-only by design, presumably to preserve historical FK references). Not a gap to code
  around from here.

### #3 Cart/order (submission) — completed, PASS
- Filled real checkout form with clearly-marked test data (`QA Sweep Test — DELETE ME`,
  `96170000099`, notes: "Functional sweep test order 2026-08-30 — safe to cancel/ignore").
- `POST /api/v1/public/store/orders?client_slug=rk` → 200. Success screen rendered
  ("✓ تم استلام طلبك!", order `4df71f46`), WhatsApp share tab opened correctly with matching order
  details in the pre-filled text.
- Verified via `GET /admin/store/orders` (admin API): order present, every field matches exactly
  (customer_name, phone, notes, item, price).
- Cleaned up: `PATCH /admin/store/orders/4df71f46.../status {"status":"cancelled"}` → 200.
- **Side finding (already logged under #3 above):** طريقة الدفع dropdown shows raw `cash`/`card`
  literals, not translated Arabic labels.

### #4 Reservation (direct/website path) — PASS
- Full public flow at `/rk/reserve`: اختر الخدمة (شعر) → اختر الحلاق (حسين — جعفر correctly absent,
  consistent with #7/#8) → اختر الموعد (30 أغسطس 15:00) → "أكمل الحجز من الموقع" → filled
  name/phone → `POST /api/v1/public/reservations/?client_slug=rk` → 200.
- Success screen: "تم إنشاء حجزك", reservation ref `9a2e762c`.
- Verified via `GET /admin/reservations/?barber_id=...`: reservation present, every field correct
  (customer_name, phone, reserved_at, duration, barber_id, service_id).
- Cleaned up: `PATCH /admin/reservations/9a2e762c.../status {"status":"cancelled"}` → 200.

### #5 WhatsApp booking (bot conversation) — CONFIRMED FAIL, root cause identified

**Security note surfaced first, relevant to this test's feasibility:** `POST /api/v1/webhook/whatsapp`
(`app/api/v1/webhook.py:39`) has **zero request authentication** — no `X-Hub-Signature-256`
verification, no shared-secret check. Only the one-time `GET` verification handshake checks
`WHATSAPP_VERIFY_TOKEN`. Anyone on the internet can POST a forged Meta-shaped payload and it will
be processed exactly like a real inbound message. **Flagging for the Security Sweep phase — not
fixed in this pass**, per Salman's own sequencing (Functional Sweep now, Security Sweep next).

**This gap is also what made a real functional test possible**, since it meant a synthetic,
correctly-shaped payload would be accepted and processed for real. Read
`app/services/whatsapp_reservation_flow.py` and `whatsapp_service.py` in full first — confirmed
`WhatsAppService._send_request()` catches its own failure (`if not phone_number_id or not
access_token: return None`) rather than raising, so a missing `WHATSAPP_ACCESS_TOKEN` (known,
already-pending G5b) does **not** block state-machine progression — the code proceeds as if the
message had sent. This made a full 7-message synthetic conversation a valid test of the real logic,
not just the missing-token gap.

**Test executed** — 7 sequential `POST /api/v1/webhook/whatsapp` calls (real Meta-shaped payloads,
`phone_number_id="TEST_PNI_QA_SWEEP"`, `from="96170000099"`), all returned `200 {"status":"received"}`:
1. text "rk" (tenant slug resolution)
2. list_reply → service id (شعر)
3. list_reply → barber id (حسين)
4. text "2026-09-01" (date)
5. list_reply → real available slot `2026-09-01T09:00:00+00:00` (fetched live from
   `GET /public/reservations/availability` first, to use a genuinely bookable slot)
6. text "QA WhatsApp Sweep Test — DELETE ME" (name)
7. button_reply id="confirm"

**Result:** `GET /admin/reservations/?barber_id=f64ce71e-...` afterward shows **no new reservation**
for 2026-09-01 — only the already-cancelled #4 test reservation from the direct-website test. The
conversation did not reach `_step_confirming`'s `reservation_service.create_reservation()` call, or
if it did, something upstream in the chain silently dropped state before then.

**Root cause, evidenced, not guessed:**
1. `app/services/whatsapp_flow.py:125` — `_sessions: dict[tuple[str, str], ConversationSession] = {}`
   is a **plain in-process Python dict**, module-level, no Redis/DB backing.
2. `Dockerfile:24` — `CMD gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 ...` — the
   backend runs **2 separate worker processes**, each with its own independent Python memory space
   (already directly confirmed earlier this same session, from the public-config-cache MISS/HIT
   investigation — `790e892`'s own commit message documents this exact fact).
3. There is no session-affinity/sticky-routing mechanism anywhere in this HTTP-based webhook path
   (no cookie, no consistent hashing) — each of the 7 POSTs above could independently land on
   either worker.
4. **Conclusion: a real WhatsApp conversation has an architectural chance, on every single message,
   of landing on a gunicorn worker that has never seen this conversation before** — which has no
   session state for `(phone_number_id, customer_phone)`, silently restarts the customer at `start()`
   (service list) instead of continuing wherever they actually were. To a real customer this looks
   like the bot randomly "forgetting" their answer, repeating a step, or never completing a booking
   — intermittent and hard to reproduce manually, which is exactly why it was never caught before
   this synthetic multi-step test (this project had no prior way to script an unattended, repeated,
   fast multi-turn WhatsApp conversation against production).
5. This is **independent of and more severe than** the already-known G5b (missing
   `WHATSAPP_ACCESS_TOKEN`) — G5b only blocks the customer from *seeing* the bot's replies; this bug
   blocks the *booking itself* from ever completing reliably, even once G5b is resolved.

**Not fixed in this pass** — this is an architecture-level decision (reduce to 1 worker as a quick
mitigation vs. move session state to a shared store like Redis/DB, each with real tradeoffs on
performance/complexity), not a scoped one-line fix, so it needs Salman's decision before touching
it, per this project's Engineering Manager Mode rule.
