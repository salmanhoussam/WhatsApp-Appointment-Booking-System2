# Phase 1 — Backend Order Pipeline: Root Cause, Fix, Validation

**Trigger:** Phase 0 found that store checkout 500s. Salman's explicit instruction: don't patch it —
find the real root cause, determine if the same broken pattern exists elsewhere, fix properly, and
validate with a real created order. This is that work.

**Correction up front:** Phase 0's report guessed the cause was "mixing a scalar `clientId` with a
nested `items: {create: ...}` relation write." Real bisection testing below **disproves that
theory** — it was a plausible-looking guess from reading a confusing Prisma error message, not a
verified fact. Recorded here so the wrong theory doesn't quietly stand; this is exactly the kind of
correction Investigation Protocol's Claim Precision rule exists for.

## Why Prisma rejected the create — proven empirically, not inferred

Bisected with 6 minimal, isolated `storeorder.create()` calls against the real dev DB (raw output
in this session's transcript; each case cleaned up its own test row immediately):

| Case | Shape | Result |
|---|---|---|
| A | no `items` relation, no `shippingAddress` key | ✅ SUCCESS |
| B | no `items` relation, `shippingAddress: None` | ❌ **FAILS** — same error as production |
| C | `items: {create: [...]}`, no `shippingAddress` key | ✅ SUCCESS |
| D | `items: {create: [...]}` + `shippingAddress: None` | ❌ FAILS (this is the real production shape) |
| E | `items: {create: [...]}`, `shippingAddress` key omitted | ✅ SUCCESS |
| F | `items: {create: [...]}` + `notes: None` (plain `String?`) | ✅ SUCCESS |

Case B alone (no `items` at all) already fails — proving the nested-relation mixing was never the
trigger. Case F proves it's not "any Optional field set to None" either — a plain `String?` field
set to `None` is fine. The one variable that flips success→failure in every case is
`shippingAddress: None` specifically.

**Root cause:** `shippingAddress` is a `Json?` field. Prisma's Python client does not accept a bare
Python `None` as its value in a `create()` call — the key must be **omitted entirely** when there's
no value. This is a Prisma-Python-client-specific quirk of `Json?` fields (distinguishing "field not
provided" from "SQL NULL" from "JSON null" requires more than plain `None` can express), not a
`clientId`/relation issue at all.

**Is it a design flaw or a usage bug?** Usage bug, and a well-known one — the fix is a documented
Prisma-Python pattern, not a schema change. `app/repositories/store_repo.py`'s original code just
didn't follow it for this one field.

## Is the same pattern used elsewhere?

Swept every `Json?` field in `prisma/schema.prisma` (`features`, `config`, `selected_services`,
`location`, `facilities`, `content_blocks`, `amenities`, `rules_policies`, `metadata`,
`shippingAddress`, `workingHours`, `detail`) against every repository/service `.create()`/`.update()`
call passing `.get(...)` for that field name. Only two real hits:

- `store_repo.py`'s `shippingAddress` — the one confirmed, fixed below.
- `app/services/dating_service.py:91` — `"config": payload.get("config", {})`. The `{}` default
  only applies when the *key* is missing, not when `payload["config"]` is explicitly `None` — a
  narrower, unconfirmed version of the same risk. **Not fixed here** — out of scope (different
  module, not reported broken, not independently verified live) — logged as a side finding in
  `todo_list.md`, not silently patched.

**The established correct pattern already exists in this codebase** (`app/services/
catalog_service.py:277`: `if metadata is not None: data["metadata"] = Json(metadata)`,
`app/api/v1/admin/units.py`: `Json(body.content_blocks) if body.content_blocks is not None else
None`) — `store_repo.py` just hadn't used it for this one field. This confirms it's a one-off gap,
not a project-wide missing convention.

## Is restaurant_repo.py broken the same way? — corrected finding

Phase 0 flagged `restaurant_repo.py`'s `create_restaurant_order()` as suspected-identical based on
surface code shape (also mixes a scalar FK with `items: {create: ...}`). Checked the real schema:
`RestaurantOrder` has **zero `Json?` fields** — `tableNumber` and `notes` are both plain `String?`
(confirmed via `prisma/schema.prisma:516-535`), and Case F above already proves plain `String?` =
`None` doesn't trigger this bug. **`restaurant_repo.py` is not broken by this bug.** Phase 0's
suspicion is retracted — it was reasoning from an unconfirmed theory (scalar+relation mixing) that
this investigation has since disproven.

## The fix

`app/repositories/store_repo.py`'s `create_store_order()`: build the `create()` payload dict
without `shippingAddress`, then conditionally add `create_data["shippingAddress"] =
Json(data["shipping_address"])` only when a real address was provided — matching the
`catalog_service.py` precedent exactly, including the `Json()` wrapper (a second, related gap this
bisection surfaced: even once the key is conditionally included, a raw `dict` still fails — Prisma
requires `Json(...)` around it, confirmed by a second live test below).

## Runtime validation — real, not simulated

1. Direct repository call (both branches): "no address" → real order created, `shippingAddress:
   None`. "With address" (`{"address": "123 Test St", "city": "Beirut"}`) → real order created,
   `shippingAddress: {'city': 'Beirut', 'address': '123 Test St'}`, correctly round-tripped.
2. **Full live HTTP path** (backend restarted to load the fix): `POST /store/cart` → `POST
   /store/orders`, twice — once without an address (HTTP 200, real order id `b0455b00-...`), once
   with a real address dict (HTTP 200, real order id `c5ab4d51-...`). A third attempt with a plain
   string instead of a dict correctly got a `422 VALIDATION_ERROR` from Pydantic before ever
   reaching the repository — confirming existing input validation is working as intended, not part
   of this bug.
3. All 3 test rows (plus one orphaned row from an earlier pre-fix bisection attempt that crashed
   before its own cleanup ran) deleted after validation — `storeorder.find_many` for beit-al-fakhar
   confirms 0 test rows remain.

## What's still open

- `POST /restaurant/orders`'s live path was not independently re-tested (no `Json?` field involved,
  so no reason to suspect it — but "no reason to suspect" isn't the same as "tested," stated
  precisely).
- `dating_service.py:91`'s narrower version of the same risk — not fixed, logged in `todo_list.md`.
- WhatsApp message generation is not yet built (that's Phase 3, the checkout redesign) — this phase
  only proves Create Order → DB works; Order → WhatsApp doesn't exist yet to validate.
