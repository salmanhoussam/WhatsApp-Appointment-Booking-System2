# R1 live — the first reservation Lia ever created from a sentence · 2026-09-19 · build f64bdce

**Verdict: PASS** (write path) · WALK_IN customer = **Confirmed behavior / Product risk** (by definition, not PASS).

## Input (Salman, from 96178727986)
1. «سجل موعد لأحمد مبارح الساعة 4 شعر مع سامي» → 2. «زبون طيار» → 3. ✅ (one tap)

## Evidence
Railway (`r1-live-railway-backend.txt`, fetched directly):
- 14:52:38Z model 200 → 1 message (the phone question) → Meta accepted, delivered, read
- 14:53:09Z 2 messages (preview + buttons) → accepted, delivered, read
- 14:53:49Z `✅ Lia: create_reservation 86efa834-… created for b9034129-… by owner e0d016c7-…` → 1 message
- Every send's recipient = 96178727986. **No merchant alert** (no 4th message, no merchant-alert log line) — correct
  for a past appointment (`notify_merchant=False`).

DB (`r1-live-db.txt`, sealed read, 275 methods, proven; one retry after a transient local P1001 — no claim was made
from the failed attempt):
| Field | Value | Expected |
|---|---|---|
| id | 86efa834-76a7-4a89-8400-e948b34010d9 | one row |
| clientId | b9034129-… (barberlab-test) | ✓ |
| customer / phone | أحمد / WALK_IN | ✓ |
| reservedAt RAW | 2026-09-18 16:00:00+00:00 | yesterday 16:00, **not converted** ✓ |
| duration | 20 | from the service row «شعر» (20) ✓ |
| status | pending | ✓ |
| source / module | lia / barber | ✓ |
| barberId | 7a702d87-… = **سامي** | ✓ (mapped by a second sealed read) |
| serviceId | 7638e48b-… = **شعر** | ✓ |
| metadata | barber_id + service_id, same ids | ✓ |
| customerId | dade1bdd-… → Customer phone=WALK_IN name=أحمد (new) | Confirmed behavior / Product risk |

Audit: `lia_draft_opened` 14:52:36 carrying **confidence=low** (R1 working: low no longer blocks) ·
`lia_owner_create_reservation` 14:53:46, historical=True, permission reservations.write.
Negative boundary: rk 0 · mr-h 0. Catalog: 0 new rows.

## Side findings
- The audit detail says `duration_min: None` while the row has 20. The audit reads the validated draft, where the
  duration lives outside `data`. The audit is inaccurate, the row is correct.
- The WALK_IN customer row is named «أحمد»: the next walk-in with another name will find-or-create by phone
  `WALK_IN` and point at THIS row (the merge L-22 measures). One reservation points at it today.
- Pre-existing: «مشط خشب» ×2.
