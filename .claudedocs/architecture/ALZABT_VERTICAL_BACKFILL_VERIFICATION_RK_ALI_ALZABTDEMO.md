# Backfill Verification — RK, Ali, alzabt-demo → `vertical = 'barber'`

**Status:** Pre-write verification only. **`Client.vertical` NOT yet written for any of the three.**
Scope locked per Salman's decision: exactly `rk`, `ali`, `alzabt-demo` — the 5 `demo-barber-*` load-
test artifacts stay `NULL` permanently, treated as test data, not tenants.

---

## Per-tenant evidence, live-checked this round

| Check | `rk` | `ali` | `alzabt-demo` |
|---|---|---|---|
| Real `Barber` rows | 2 (`حسين`, `جعفر`) — both `isActive`, both have real `workingHours` | 1 (`Ali`) — `isActive`, real `workingHours` | 2 (`كريم`, `طارق`) — both `isActive`, both have real `workingHours` |
| Real `CatalogService` rows | 6, real Barber-shaped names (شعر, دقن, شعر ودقن, كرياتين, تمشيط أو تسريح, حنة أو صبغة) | 6, same real shape, real market-researched prices ($8–$40) | 6, same real shape, real prices |
| **Actual booking capability** (`reservations` active) | ✅ True | ✅ True | ✅ True |
| **Real bookable link** (`BarberService` rows — a service with zero assignments can't actually be booked) | **2** — thin relative to 2 barbers × 6 services (12 possible); most service/barber combinations are *not* actually bookable today | 6 — all 6 services assigned to the 1 barber, fully bookable | 12 — full 2×6 cross-assignment, fully bookable |
| Real page/template shape | 10 real sections (`hero, story, story_experience, gallery, featured_items, video_story, testimonials, hours, location, cta`), `templateKey=None` (informal hotel/chalet template, already-known issue) | 4 real sections (`hero, story, featured_items, cta`) | **0 sections** — confirmed empty, matches this session's earlier Home Pages Review finding ("bare page-under-construction placeholder") |
| `config.working_hours` (tenant-wide fallback) | SET | **NONE** — relies entirely on the Barber's own `workingHours` (correctly still functional, since per-barber hours take priority) | SET |
| `service_type` today | `barbershop` | `services` | `barbershop` |
| `vertical` today | `None` | `None` | `None` |
| **Conflict between `service_type` and proposed `vertical`?** | None — `barbershop` already agrees in spirit with `barber`, different vocabulary only | **Yes, and this *is* the conflict** — `'services'` is the confirmed, live artifact of the self-registration bug this whole arc traced; `vertical='barber'` is the correcting classification, not a second guess | None |

**One real, separate finding surfaced by this check, not previously named**: RK's real bookable
surface is thinner than its 6-service catalog suggests — only 2 of a possible 12 barber↔service
links exist. This does not block or relate to the vertical backfill (vertical never reads
`BarberService`), but it's a real gap in RK's own Staff↔Service configuration worth a future,
separate look — named here so it isn't lost, not something this document proposes fixing.

---

## Before / After projection — what writing `vertical='barber'` actually changes

**Checked directly against the real code, not assumed**: nothing at runtime reads `Client.vertical`
anywhere yet. It is written only by `demo_service.py`/`registration_service.py` at provisioning
time (per the architecture ratified in `ALZABT_VERTICAL_REGISTRY_ARCHITECTURE.md`) and read by
nothing else in this codebase today — not `DynamicPage.jsx`, not `SECTION_MAP`, not the Dashboard,
not `reservation_service.py`, not any Capability. A backfill write is a **raw column UPDATE**, not
a re-run of provisioning logic.

| | Will change | Will NOT change |
|---|---|---|
| **The write itself** | `Client.vertical`: `None` → `'barber'`, for exactly these 3 rows | Everything else on the `Client` row |
| **Capabilities** | Nothing | `client_services` — no re-seed triggered; RK/Ali/alzabt-demo's real active services stay exactly what they are today |
| **Domain objects** | Nothing | `Barber`, `CatalogService`, `BarberService` rows — untouched |
| **Legacy field** | Nothing | `service_type` stays exactly as-is (`barbershop`/`services`/`barbershop`) — retirement is a separate, still-deferred decision (Migration Plan Step 6) |
| **Public pages** | Nothing observable | `DynamicPage.jsx` renders exactly the same sections as today (10 / 4 / 0) — nothing reads `vertical` to change this |
| **Booking flow** | Nothing | `ReservePage.jsx`/`reservation_service.py` behavior is 100% governed by `client_services`/`Barber`/`CatalogService`/`BarberService` state, none of which this write touches |
| **Dashboard** | Nothing | No tab, no view reads `Client.vertical` |
| **Future code** | These 3 tenants become a correct, real data point | — (this is the entire point: a future `staff` section, a future Section Repertoire seed, a future unified provisioning contract all get a true fact to read instead of `None`) |

**Plain statement of the actual risk**: there isn't one, in the running-product sense. This is an
inert label write — its only effect is on code that doesn't exist yet. The real thing this backfill
protects against is a *future* one: if `staff`/Section-Repertoire work ships before this backfill,
it would see `vertical=None` for RK/Ali/alzabt-demo and either skip them or need its own inference —
this write is what keeps that future work simple and correct from day one.

---

## Ready state

All three pass the evidence bar (real Barber + real CatalogService + real booking capability
confirmed). **Awaiting Salman's final go to execute exactly this SQL-equivalent, nothing more:**

```
UPDATE clients SET vertical = 'barber' WHERE slug IN ('rk', 'ali', 'alzabt-demo');
```

No other field touched. No other tenant touched. `demo-barber-*` (5 rows) intentionally excluded,
treated as test data per Salman's explicit decision.

---

## Recorded, not acted on: the provisioning-gap finding is now P1

Per Salman's own words: *"Demo Builder ينشئ Tenant كامل تقريبًا، بينما Self-registration يحدد
الـVertical والCapabilities لكن لا ينشئ الـdomain objects الخاصة بالـVertical."* Elevated from a
side note to a real architectural priority — **next after this backfill's verification, before
P0.1**, per the locked sequence:

```
3-tenant backfill → verify → Unified Provisioning Contract → P0.1 → Section System
```

No UI polish opens before this foundation is clean. Not designed in this document — named as the
committed next step once the backfill itself is confirmed.
