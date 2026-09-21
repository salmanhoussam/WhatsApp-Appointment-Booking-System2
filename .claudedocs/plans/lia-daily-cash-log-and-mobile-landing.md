# Lia Daily Completed Log + mobile dashboard landing — plan v2

**Status (latest):** IMPLEMENTED LOCALLY 2026-09-21, all decisions approved; tests green; NOT committed,
NOT deployed — awaiting Salman's approval of the implementation result.
**Status:** v2, 2026-09-21. Rewritten after Salman's 13-point correction. **STOP — no code, no commit, no
deploy, no production write, no user-facing text until he approves each item verbatim.**
**Evidence:** `.claudedocs/work/lia-live/2026-09-21/summary.md` (Hussein's live round on `rk`, read from
Railway logs + a sealed production read).
v1 (same file, earlier today) proposed patching the reservation flow and `metadata.amount_paid`; both are
withdrawn by this version.

---

## 0. The separation this plan exists for

| | **Reservation** | **Daily Completed Log** |
|---|---|---|
| Example | «احجز لعلي بكرا الساعة 4» · «سجل موعد لأحمد مبارح الساعة 4» | «علي 10، محمد 7، أحمد 5» · «اليوم حلقت لعلي بـ10» |
| Meaning | a slot on the calendar | work already done + cash already taken |
| Phone | asked (or «زبون طيار») | **never asked** |
| Time | required | **not asked** — server places it (§3) |
| Working hours | enforced (future) | **never** |
| Merchant «حجز جديد» alert | yes (future) | **never** |
| Status | `pending` (past «سجل موعد» too) | `arrived` |
| Amount | none | **required per item, never invented** |
| Service | required | optional |
| Cap per message | 3 (T5, unchanged) | **`MAX_DAILY_LOG_ITEMS = 15`** |

---

## 1. Operation contract (proposed)

**New operation `log_daily_visits`** in `app/services/lia_operations.py`, same shape as the other five:

```
name          = "log_daily_visits"
permission    = "reservations.write"        # same as create_reservation
legacy_roles  = RESERVATION_LEGACY_ROLES
service_key   = "reservations"
write_fn      = reservation_service.create_reservation   # the ONE write path, no second one
mirrors_route = "app/api/v1/admin/reservations.py:302"
```

**New read operation `daily_report`**: permission `reservations.read`, `service_key="reservations"`,
reader `reservation_service.list_reservations` (exists, `reservation_service.py:907`). A barber-scoped
account sees only its own barber's rows; an owner sees the tenant's.

**Entry — how Lia knows it's a daily log, without adding words to the reservation flow:**
- **Shape A (structural, no dictionary):** the message splits on `، , ⏎ و` into ≥1 segments, and **every**
  segment is `<name words> [<service words>] <number>`. «علي 10، محمد 7» qualifies; «احجز لعلي بكرا
  الساعة 4» does not (it has a date word and a verb segment).
- **Shape B:** the existing visit verbs (`_VISIT_VERBS`, already in the code since T5) — **moved** from
  the reservation flow to this operation (see D-A).
- A sender who is not a resolved owner/admin/barber: Shape A falls through untouched, exactly as today.
  Cost: one owner lookup for a customer who happens to type «علي 10».

**Per-item validated shape (new pydantic model in `app/schemas/lia_drafts.py`):**
```
LiaDailyLogItem:      customer_name: str (1..100) · amount: Decimal > 0 · service_said: str | None
LiaDailyLogExtraction: items: list[LiaDailyLogItem] (1..15) · confidence
```

**Guards enforced by the SERVER, not the model:**
1. `len(items) > MAX_DAILY_LOG_ITEMS` ⇒ stop **before** any write, ask to split. Never "first 15".
2. **Anti-invention:** each `amount` must appear as a number in the owner's original text. Otherwise
   the item is treated as having no amount.
3. Missing amount ⇒ one question naming the items missing one. No write until answered. No price-list
   fallback (service price ≠ paid amount — Salman §6).
4. `service_said` resolves against the tenant's `CatalogService` via the existing folding matcher
   (`_match_by_name`). Match ⇒ `service_id` set. **No match ⇒ the item is still valid**: `serviceId`
   null, the said text kept under the contract key, no question, no new service created.
5. Barber = the talking account's own linked barber (rk: Hussein, linked 2026-09-20). Account with no
   linked barber ⇒ the existing barber question (existing text `reservation_ask_barber`).

**Write, per item (explicit keywords, none derived from time):**
```
create_reservation(..., customer_phone="WALK_IN", source="lia",
                   metadata={"barber_id", "service_id"?, "daily_log": {...}},
                   allow_past=True, notify_merchant=False,
                   enforce_working_hours=False, status="arrived")
```
All four keywords exist today (T3-b, T3-c, T5). **`reservation_service.py` is not modified.**
One preview, one ✅, per-item result, no rollback (D-6 as ratified).

---

## 2. Data mapping — current, measured

| Need | Where it lands today | Evidence |
|---|---|---|
| customer name | `Reservation.customerName` (snapshot) | `reservation_service.py:546-556` |
| no phone | `customerPhone="WALK_IN"` → **one shared `Customer` row** per tenant | find-or-create by phone `:534-541`; Finding 12 |
| barber | `Reservation.barberId` (FK) + `metadata.barber_id` | `_resolve_barber :309`, `:564` |
| service | `Reservation.serviceId` (FK) + `metadata.service_id` | `_resolve_catalog_service :330`, `:566` |
| completed | `status="arrived"` | keyword since T5; `OverviewTab.jsx:512` counts it as completed |
| time | `reservedAt` **NOT NULL** | schema — no time-less row possible |
| amount | **nothing** | no column on `Reservation`; no Payment/Revenue model in the schema (searched) |

🔴 **Two structural constraints a daily log inherits from `Reservation`, found in the investigation:**
- **The overlap check has no off switch** (`reservation_service.py:484-494`), and the DB partial unique
  index `reservations_active_barber_slot_uidx (client_id, barber_id, reserved_at) WHERE status IN
  (pending, confirmed, arrived)` covers `arrived`. A barber's daily log therefore **cannot share a start
  time or overlap** his real bookings that day.
- Daily-log rows **appear on the calendar** (time grid) at whatever time they are placed.

## 3. Time placement (consequence of §2)

Server-only, never asked: start at the period the owner named (existing T5 rule: الصبح 09:00 ·
بعد الضهر 14:00 · المسا 18:00), else 09:00; each item takes the **next free slot** for that barber
that day, reading his existing rows first via `list_reservations(barber_id, date range)`. Duration =
the service's duration, else 30. **No new keyword, no index change, no conflict bypass** — it respects both
constraints instead of disabling them. The preview says the times are placeholders.
(Alternative D-C below.)

---

## 4. Amount storage — decision with evidence

**Proposal:** a **named, versioned, namespaced** key inside `Reservation.metadata`, documented as a
temporary bridge in `capabilities/lia.md` (new Finding 14) until a payment domain exists:

```json
"daily_log": { "v": 1, "amount": "10", "currency": "<Client.currency>", "service_said": "حلاقة" | null }
```

**Why it is safe — measured:**
1. **Create** writes `metadata` verbatim via `Json(metadata)` (`reservation_service.py:560-561`).
2. **Update** is the only other writer and **merges**, never replaces: `meta = dict(existing.metadata)`
   then sets only `service_id`/`barber_id` (`:1083-1092`). A `daily_log` key survives every edit.
3. **Readers** read only `barber_id`, `service_id`, `resource_id`, `table_label`, `staff_id`, `unit_id`
   (backend `:297,318,337,499-516`; frontend `ReservationsTab.jsx:483`, `ReservationsTodayView.jsx:437`,
   `ReservationsWeekCalendar.jsx:87,310`, `reservationInteractions.jsx:240,262`). None iterates or
   validates the object, so an extra key breaks nothing.
4. **Forgery:** the public and admin POST routes accept any `metadata` dict
   (`public/reservations.py:44,92`, `admin/reservations.py:88,333`), so the key could be written from
   outside. **But `source` is set by the server per caller** — `website` (`public:93`), `admin`
   (`admin:334`), `whatsapp` (`flow:893`), `lia` only by Lia. The report counts **only
   `source="lia"` AND `daily_log.v == 1` AND `status="arrived"`** — a forged key from the website or the
   dashboard is never counted.
5. `amount` is a string decimal (no float); `currency` is copied from `Client.currency` at write time.

**If Salman rejects the metadata bridge:** STOP. The only other honest home is a migration (column or
table), which is out of scope for today by his decision.

---

## 5. Mobile landing — current behaviour and exact cause

**What the code does (measured, not assumed):**
- `GenericAdminDashboard.jsx:624-630` — for every `hasReservations` tenant, once config loads, it
  navigates to `'calendar'` unless the URL already named a tab. **No mobile/desktop distinction.**
- Staff accounts start at `'calendar'` synchronously (`:438`).
- The `'calendar'` tab is `ReservationsTab defaultView="today"` (`:666-667`) →
  `ReservationsTodayView`, the hour-by-hour time grid.
- The `'reservations'` tab is the same component with `defaultView="list"` (`:668-669`); its date filter
  **already defaults to today** (`ReservationsTab.jsx:351`), and on mobile it already renders cards
  (`:894`).

**So the premise "today's summary exists on desktop and is missing on mobile" does not match the code:
desktop and mobile land on the SAME thing — the time grid.** The "today" list already exists, on both,
as the «الحجوزات» tab. Nothing is missing; the landing choice is the cause.

**Minimal change (reuses the same query, `GET /reservations/?date=today`, no duplicate):**
1. The landing effect (`:628`): `changeTab(isMobile ? 'reservations' : 'calendar')`.
2. Staff initializer (`:438`): same rule — see D-E.
3. `ReservationsTab` gets one optional prop `onOpenCalendar`; when set and `isMobile` and
   `viewMode === 'list'`, a button «التقويم» in the header calls `changeTab('calendar')`.
   Desktop: unchanged. The bottom-nav «التقويم» entry stays as it is.

---

## 6. Affected files

| File | Change |
|---|---|
| `app/services/lia_operations.py` | register `log_daily_visits` (write) + `daily_report` (read) |
| `app/schemas/lia_drafts.py` | `LiaDailyLogItem`, `LiaDailyLogExtraction` |
| `app/services/lia_owner_entry.py` | Shape A/B entry → daily log; draft/preview/commit for it; placement; report; `MAX_DAILY_LOG_ITEMS` |
| `app/prompts/lia.md` | extraction block for the daily log (commit states intent) + the approved texts only |
| `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` | landing rule + pass `onOpenCalendar` |
| `frontend/src/pages/generic-admin/tabs/ReservationsTab.jsx` | the mobile «التقويم» button |
| `scripts/test_lia_daily_log.py` | new suite (§8) |
| `.claudedocs/architecture/capabilities/lia.md` | operations 6–7, Finding 14 (the metadata bridge) |
| **Not touched** | `reservation_service.py` · `prisma/schema.prisma` · any route · Customer model |

---

## 7. New user-facing texts — proposed, NOT approved (none enters `lia.md` before his word)

| ID | Where | Text |
|---|---|---|
| DL-1 | preview header | «هيك فهمت، زباين اليوم:» |
| DL-2 | preview/report line | «*{n}.* {customer} · {service} · {amount}» — `· {service}` dropped when there is none |
| DL-3 | unmatched service, inside DL-2 | «{service_said} (مش من خدماتك)» |
| DL-4 | preview total | «المجموع: {total}» |
| DL-5 | placeholder times | «الساعات بالتقويم تقريبيّة.» |
| DL-6 | confirm question | «سجّلهن هلق؟» — **reuse of `reservation_confirm_multi`**, neutral wording |
| DL-7 | success | «تم تسجيل زباين اليوم.» |
| DL-8 | partial | **reuse of `reservation_created_partial`** («سجّلت: {done}.\nما زبط: {failed}. {reason}») |
| DL-9 | missing amount | «قديش دفع {names}؟» |
| DL-10 | over cap | «هيدول {count} اسم، والحدّ {max} بالرسالة الوحدة. قسّمهن على أكتر من رسالة.» |
| DL-11 | cancel | «تمام، ما سجّلت شي.» |
| DL-12 | expired | «انتهت صلاحية التسجيل. ابعتلي الأسماء من جديد.» — **not** `reservation_expired_multi`, which says «المواعيد» |
| DL-13 | report header | «تقرير اليوم، {date}:» |
| DL-14 | report total | «المجموع: {total} · {count} زبون» |
| DL-15 | empty report | «ما في شي مسجّل اليوم.» |
| DL-16 | mobile button (dashboard) | «التقويم» — the tab's existing label |

No emoji. Buttons reuse «✅ سجّلهم» / «❌ إلغاء» (T5-9).

---

## 8. Test matrix

| # | Input / state | Expected |
|---|---|---|
| 1 | «علي 10، محمد 7، أحمد 5» | family `log_daily_visits`, 3 items, **0 phone questions**, one preview, one ✅, 3 rows `arrived` |
| 2 | «علي شعر 10، محمد دقن 7» | `serviceId` set per item, `daily_log.service_said` null |
| 3 | «علي حلاقة 10» | written; `serviceId` null; `service_said="حلاقة"`; DL-3 in preview; no question, no failure |
| 4 | daily log on a Monday, `closed_days=["monday"]` | written; `_check_working_hours` never called (recorder) |
| 5 | 16 names | **0 write calls**; DL-10 |
| 5b | exactly 15 | accepted (boundary, `MAX_DAILY_LOG_ITEMS` imported, not a literal) |
| 6 | «علي 10، محمد» | DL-9 for محمد; 0 writes until answered; no amount taken from the price list |
| 6b | model returns amount 12 not present in the text | treated as missing (anti-invention) |
| 7 | «سجل موعد لأحمد مبارح الساعة 4» | stays `create_reservation`, `pending`, phone asked — **T1:18 invariant unchanged** |
| 8 | «اليوم حلقت لعلي بـ10» | daily log, `arrived`, no extra confirmation beyond the field preview |
| 9 | «تقرير اليوم» | only today's `source=lia`+`daily_log.v1`+`arrived` rows: name · service · amount + total |
| 9b | a website reservation carrying a forged `metadata.daily_log` | **excluded** from the report |
| 9c | barber-scoped account | report shows its own barber only |
| 10 | dashboard at 390px, owner, no tab in URL | lands on «الحجوزات» (today list); «التقويم» button opens the time grid; desktop 1440px still lands on calendar; deep link `/rk/dashboard/calendar` still honoured — **real Playwright browser, not curl** |
| 11 | barber already booked 09:00–09:30, daily log of 2 | placed at 09:30 and 10:00; no UniqueViolation |
| 12 | non-owner sends «علي 10» | falls through to the customer flow, 0 Lia writes |
| R | T1/T4/T5/S7/contract suites | still green (731 today) |

---

## 9. Decisions required from Salman

- **D-A — visit verbs move.** «حلقت/قصيت…» currently route to `create_reservation` with a `visit_reported`
  flag (T5, shipped 2026-09-20). Proposal: move them to `log_daily_visits` and **remove** the
  `visit_reported` branch from the reservation flow — the "word patch" §2 rejects. A visit message with
  no amounts then gets DL-9. *Recommendation: yes.*
- **D-B — the metadata bridge in §4.** *Recommendation: approve as a documented temporary bridge.*
- **D-C — time placement.** (a) next free slot from the period start (§3) · (b) write with no barber FK
  (keep barber inside `daily_log`) — no collisions, but per-barber views and reports lose the row.
  *Recommendation: (a).*
- **D-D — customer linking.** (a) every daily-log row on the shared `WALK_IN` customer, name as snapshot
  (existing path) · (b) link when a folded name matches exactly one real customer
  (`_known_customer_phone`, existing) — silent attribution of a bare first name. *Recommendation: (a)
  for this real test.*
- **D-E — mobile landing for staff accounts too, or owners/admins only?** *Recommendation: all
  roles on mobile.*
- **D-F — the 16 texts in §7**, one by one.

### Decision log — 2026-09-21 (Salman)
| | Status |
|---|---|
| D-A visit actions → `log_daily_visits`; visit branch removed from the reservation flow | ✅ |
| D-B `metadata.daily_log` v1 — `source=lia` only, report is its only consumer, no migration, Finding 14 = temporary bridge, metadata NOT generalised as domain storage | ✅ |
| D-C first free slot | ⚠️ principle approved; blocked on the duration when no service (discovery below) |
| D-D shared `WALK_IN`, no name-based linking | ✅ temporary; Finding 12 stays open |
| D-E mobile landing = today's reservations for every role that already has `reservations.read`; no authorization widened; no new query | ✅ |
| D-F DL-1…DL-16 | ⏸️ pending verbatim review |
| Code | ❌ not approved |

### D-C discovery — duration when there is no service (measured)
- `create_reservation` with `duration_min=None` → `MODULE_DEFAULTS["barber"]["duration_min"] = 30`
  (`reservation_service.py:65-72`, applied at `:445`). An existing default in the existing write path.
- `Reservation.durationMin` DB default is **60** (`schema.prisma:754`) but is never reached: the service
  always writes `effective_duration`.
- `CatalogService.durationMin` default 30 (`schema.prisma:556`).
- Lia already carries two private `or 30` literals (`lia_owner_entry.py:1546`, `:1856`) duplicating the
  module default instead of reading it.
- "No time distribution" is not available: `reservedAt` is NOT NULL and the partial unique index would
  refuse two `arrived` rows of the same barber at the same start.

## 10. Out of scope

Automatic end-of-day report · scheduler/cron · WhatsApp template · Meta approval · any payment
column/table/migration · Customer model · `reservation_service.py` · the reservation flow's generic
«ما فهمت الموعد» after a refusal (11th instance of the text-in-the-wrong-context pattern — logged,
separate fix) · asking service-before-phone in the reservation flow (separate) · recording Lia's
conversation text (Side Finding 1 — separate privacy decision) · Phase B/T · U-01 · Findings 12/13 ·
the customer path's `_normalise_ar` · desktop redesign.
