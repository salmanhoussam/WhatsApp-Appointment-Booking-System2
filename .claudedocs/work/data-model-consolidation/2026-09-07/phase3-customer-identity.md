# Phase 3 — unifying customer identity

## 3a — `StoreOrder` now points at the real `Customer` (CLOSED)

`store_orders.customer_id` referenced `store_customers`: **0 rows, and 0 code references anywhere
in the repository** — grep across `app/`, `scripts/`, `frontend/src/` found only Prisma schema
declarations. So the column was NULL on all 15 real orders, which is precisely why the Customer
Registry merges Reservation + StoreOrder **by phone string at query time** instead of by a key.

Three changes:

1. **FK repointed** to `customers`, `ON DELETE SET NULL` — matching `Reservation.customer_id`, so
   deleting a customer never takes the order with it and the order keeps its own name/phone
   snapshot regardless.
2. **Checkout now links.** `POST /store/orders` runs the same find-or-create-by-(phone, clientId)
   that `reservation_service.py` already runs for every reservation. One person buying *and*
   booking at the same shop is now one `Customer` row, not two identities to reconcile later.
   Phone is optional on a store order; with no phone there is nothing to identify, so the order
   stays honestly unlinked rather than inventing a row.
3. **Backfilled 7 of 15** existing orders, strictly within the same `client_id` — a phone is only
   unique per tenant (`@@unique([clientId, phone])`), so matching across tenants would attach one
   shop's order to another shop's customer. **Verified 0 cross-tenant links afterwards.**

> Caveat stated plainly: Salman has separately decided to empty `customers`
> (`reset_customer_registry.py`, still pending a manual run). Links to rows that purge deletes
> revert to NULL by the FK rule. Correct today, harmless afterwards.

**`store_customers` dropped** — and deliberately *after* the reader change shipped. Three run-time
preconditions, any fatal: still empty · `store_orders.customer_id` points at `customers` · no other
FK references it. **This did not repeat the Phase 2d mistake**, and the reason is measurable rather
than hopeful: no deployed build, at any version, ever queried this table.

## 3b — the registry: no change needed, and why

The plan said "replace the phone merge with the FK join." **Reading the real code, it already does
this.** `list_customer_registry()` starts from `customer_repo.list_with_reservations(client_id)` —
real `Customer` rows joined to their reservations through the FK — and uses phone only as the
*fallback* for rows that join can't cover (`list_orphan_for_client_with_service`). Its own comments
say so.

Rewriting it to key on `customer_id` would break the deliberate `__no_phone__` bucket and orders
that legitimately have no customer, for no gain. **What Phase 3a actually improved is the data
underneath it**, not the aggregation. Not touched — same judgment as the Phase 1c stop.

## 3c — WhatsApp: a deep link now outranks a stale session (CLOSED)

On the shared Central WABA number every tenant has the same `display_phone`, so the session binding
was the only thing selecting a tenant — and `_resolve_client` short-circuited on it at step 1.

**The bug:** a customer mid-booking with `rk` who then opened `mr-h`'s deep link **stayed bound to
`rk`** for the full 30-minute TTL. Their messages routed to the wrong shop, silently.

**The fix is narrow on purpose.** Not "any slug appearing anywhere in the text" — slugs are short
(`rk`), and a customer typing one as an answer must never switch shops. Only a message matching the
real deep-link shape counts: `build_central_booking_link()` emits exactly `حجز {slug}`, so the
opener must start with that keyword, now a shared constant so producer and consumer cannot drift.

When the resolved tenant differs from the bound one, the stale session is **cleared**, not reused —
otherwise shop B gets answered with shop A's half-finished booking.

Verified against 9 cases, including the false positives that matter:

```
✅ 'حجز rk'          -> rk       real deep link
✅ 'حجز mr-h'        -> mr-h     hyphenated slug
✅ '  حجز smar  '    -> smar     whitespace tolerated
✅ 'rk'              -> None     bare slug typed mid-conversation, NO override
✅ 'اسمي rk'         -> None     slug inside a sentence, NO override
✅ 'بدي احجز عندكم'  -> None     keyword not at start
✅ 'أحمد' / 'حجز' / ''-> None
```

Cost control: the extra client lookup runs **only** when the message carries text. Button and list
replies — most of a live conversation — skip it and keep the original single-lookup path.

## State

```
tables: 41 -> 39      (`services`, `store_customers` both gone)
production: db=ok · smar/listings 200 · caracas 200 · rk services 6 · store products 200
```
