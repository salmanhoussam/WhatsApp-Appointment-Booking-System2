# Staff Scoped Access — Phase C Evidence

Follows: `.claudedocs/implementation/STAFF_SCOPED_ACCESS_CONTRACT.md`. "My clients" derived from the
staff member's own reservations — no new `Customer` entity, per Salman's explicit choice.

## Changes

- `app/repositories/reservation_repo.py` — new `list_customer_identities_for_barber(client_id,
  barber_id)`: every reservation for one barber, no `take` limit (distinct from the paginated
  `list_by_client`), used only to derive client identity.
- `app/services/reservation_service.py` — new `list_my_clients(client_id, barber_id)`: dedups by
  `(customerName, customerPhone)`, returns `{customer_name, customer_phone, customer_email}`.
- `app/api/v1/admin/reservations.py` — new `GET /reservations/my-clients`, registered **before**
  `GET /{reservation_id}` (route-ordering requirement — otherwise FastAPI would match "my-clients"
  as a `reservation_id` path param). Reuses `_require_staff_barber_id` from Phase B: STAFF is always
  forced to their own `barberId` (fails closed, 403, if unlinked); non-STAFF callers may pass an
  optional `barber_id` query param, or get an empty list (not an error) if they don't.

## Real API Test Matrix

Test fixture note: جعفر only had 3 distinct real customer identities across his existing 3
reservations (no natural duplicate) — one additional reservation was created directly (same pattern
as the many other test-fixture rows already in this table from prior sessions, e.g. "Test Staff
1786124916") reusing the exact identity of an existing one ("Jaafar Drag Test" / `70444333`) to
produce a real, verifiable dedup case, rather than assuming the dedup logic works from code alone.

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| C1 | Jaafar `GET /reservations/my-clients` | only his own clients | 3 rows: `Jaafar Drag Test`/`70444333`, `Playwright Edited Name`/`+96170555001`, `Jaafar Drag Retry`/`70444999` | ✅ PASS |
| C2 | Same customer across 2 of Jaafar's reservations | appears once | `count: 3`, `"Jaafar Drag Test" count: 1` (not 2, despite 2 underlying reservations) | ✅ PASS |
| C3 | A Hussein-only customer (`زبون واتساب`, appears 4× under his reservations; `Availability Test Customer`, etc.) | absent from Jaafar's list | both `False` | ✅ PASS |
| C4 | A STAFF account with no `barberId` link | 403 | `{"code":"FORBIDDEN","message":"Staff account is not linked to a barber profile."}`, `HTTP 403` | ✅ PASS |
| C5 | TENANT_ADMIN — full reservation list + catalog access (regression) | unaffected | 38 rows (37 + the 1 test fixture added), catalog `HTTP 200` | ✅ PASS |
| C6 | TENANT_ADMIN `GET /my-clients` with no `barber_id` param | empty list, not an error | `{"success":true,"data":[]}` | ✅ PASS |

6/6 pass. C4 used a real throwaway STAFF user created for exactly this test
(`staff-no-barber-verify@rk.dev.invalid`), same pattern as other verification-only accounts already
in this tenant (`phase1-verify-bot@example.com`, etc.).

## Regression check

Reservations list, single-reservation ownership checks, and catalog access from Phase B all
re-verified unaffected (C5). `Staff↔Service` untouched — this phase only reads `Reservation` rows.
