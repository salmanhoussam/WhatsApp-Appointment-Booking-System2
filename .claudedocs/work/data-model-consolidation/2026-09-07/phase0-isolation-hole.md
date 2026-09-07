# Phase 0 — cross-tenant service pricing on the public booking endpoint

**Status:** CLOSED in code · deployed + HTTP-probed = pending
**Scope:** one defect, shipped on its own. Not part of the consolidation work that follows.

## The defect

`app/services/public_service.py:546` (before the fix):

```python
svc = await db.service.find_unique(where={"id": s_req.get("service_id")})
if svc and getattr(svc, 'isActive', True):
    price = float(svc.basePrice)
    total_service_price += price * qty
    valid_services.append({"serviceId": svc.id, ...})
```

`service_id` arrives inside a **public, unauthenticated** booking payload
(`POST /api/v1/public/.../book`). The lookup carries **no `clientId`**, so any service id from any
tenant resolved, was priced from *its own* `basePrice`, and was written onto this tenant's booking
as a real `BookingService` row.

Every other query in the same function is tenant-scoped — `booking.find_first` at `:583` and the
`booking.create` at `:598` both carry `clientId`. This one line was the exception.

## Evidence — read-only, mutated nothing

Ran against production (Frankfurt) via `scripts/_db_target.py`. Took a real `smar` service and
asked whether it resolves for `rk`:

```
victim service : 'مناشف شاطئ'  (5.00)  owner=smar
attacker tenant: rk

OLD  find_unique(id)                  -> ('مناشف شاطئ', Decimal('5.00'))   ❌ FOREIGN ROW PRICED
NEW  find_first(id AND clientId=rk)   -> None                              ✅ None -> 404
NEW  find_first(id AND clientId=smar) -> ('مناشف شاطئ',)                    ✅ owner still resolves
```

Third line matters as much as the second: the fix closes the foreign path **without** breaking the
legitimate one.

## The fix

`find_unique(id)` → `find_first(id AND clientId)`, plus an explicit 404 when nothing resolves.

The 404 is a deliberate second change, and it is not cosmetic: previously an unknown id was
**silently skipped**, so a customer whose selected add-on failed to resolve was quietly charged less
than they chose. Inactive services are still skipped rather than rejected — that case was already
legitimate (a real service the tenant has since turned off), so exactly one behaviour changes here:
cross-tenant reachability.

Ordering note: the raise sits **before** `booking.create` at `:598`, so a rejected probe writes
nothing.

## Three adjacent reports that were checked and are NOT defects

Flagged during the sweep as "id-only, unscoped". Each was read to its call site; all three are
sound, and none was changed — an unnecessary edit here would have added risk and no security.

| Site | Why it is safe |
|---|---|
| `customer_repo.py:37` `set_password` | Its only caller (`public/__init__.py:138`) obtains the id from `get_by_phone(phone, tenant["id"])`, which **is** clientId-scoped. The id is proven to belong to the tenant before the write. |
| `customer_service.py:41` update / `:50` delete | Both open with `get_customer(db, customer_id, client_id)` — clientId-scoped — and bail on `None`/`False`. Read-then-write, correctly guarded. Prisma's `update` needs a unique `where`, and `{id, clientId}` is not one, so the pre-check is also the idiomatic fix here, not a workaround. |
| `user_repo.py:109` `find_user_by_barber_id` | Its docstring states the reason it is global on purpose: `User.barberId` is `@unique` platform-wide, and scoping would report "free" for a barber linked under another tenant and then fail at the DB anyway. |

## Unknowns

- **Not verified over real HTTP yet.** The proof above is at the query-semantics layer plus a code
  read. The end-to-end probe (POST a booking to `smar` carrying an `rk` `service_id`, expect 404 and
  zero new rows) requires the fix to be deployed first — running it against the *current* production
  build would create a real booking carrying a foreign service, which is the very thing being fixed.
  Per `investigation-protocol.md`'s Runtime Before Assumption: one link is verified, the chain is not.
- **Exploitation was not investigated.** No audit trail exists that would answer whether a foreign
  `service_id` was ever submitted. Recorded as unknown, not as "did not happen".
