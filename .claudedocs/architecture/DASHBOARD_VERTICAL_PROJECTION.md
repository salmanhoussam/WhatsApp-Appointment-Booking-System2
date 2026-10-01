# Dashboard — the projection of one Interface onto each Vertical

**What this answers:** *what does a restaurant owner see, versus a barber, versus a clinic?*

**What it is not:** a second dashboard per vertical. The Dashboard is an **Interface**, not a
Capability (`rules/backend/architecture.md` §10) — one `GenericAdminDashboard` that branches
internally. This document records **how it branches**, so the branching is a decision we can read
rather than a behaviour we rediscover each time an owner complains.

**Why it exists.** Salman, 2026-10-01, after a real case: the owner of `caracas` opened his
dashboard and reported that there was no way to edit items, only categories. The instinct behind
the request was to file the dashboard documentation *under the vertical*. That was declined and the
reason is recorded in §5 — but the gap the instinct pointed at is real, and this is it.

**Measured** 2026-10-01 against `HEAD = e9bfda2`, in two ways: by reading the code, and by driving
a real browser into the live `caracas` dashboard as its owner. Every table below cites one or both.
Figures are perishable.

---

## 1. The switch is **not** the vertical

This is the finding that reorders everything else.

```js
// frontend/src/pages/generic-admin/GenericAdminDashboard.jsx:177
function buildNav(hasReservations, activeServices, isOwner = false) { ... }

// :597
const hasReservations = activeServices.includes('reservations')
```

`buildNav` never receives the vertical. It sees **`activeServices` and one boolean derived from
it**. So in code there is no "restaurant dashboard" — there is **the non-reservations dashboard**,
and any future non-reservations vertical (a shop, a bakery) lands in the identical UI without a
single line being written for it.

That is a strength (nothing to fork) and a hazard (nothing announces that a new vertical inherited
a layout nobody chose for it). **Both are true and both belong on the record.**

---

## 2. The two real shapes

```
hasReservations = false        نظرة عامة · الطلبات · الكتالوج · [الفريق] · الإعدادات
  (GenericAdminDashboard.jsx:186-194)                                          5 entries

hasReservations = true         نظرة عامة · التقويم · الحجوزات · الخدمات · [المتجر] ·
  (:207-219)                   العملاء · [الفريق] · الإشعارات · الإعدادات      9 entries
```

`[الفريق]` is owner-only (`isOwner`, :183) — a `MANAGER_*` account would 403 under it, which the
Dashboard Review recorded twice as a real defect class. `[المتجر]` is gated on the `store` service
(:207), added 2026-08-21 after `mr-h` showed a nav entry that 403'd on every request beneath it.

---

## 3. The projection, per vertical

`default_services` from `app/core/verticals.py`'s `VERTICAL_REGISTRY` — the one source of truth per
`B-Q1`.

| Vertical | `default_services` | Branch | What the owner gets |
|---|---|---|---|
| **restaurant** | `catalog` · `restaurant` · `restaurant.menu` · `whatsapp_ordering` | **false** — no `reservations` | نظرة عامة · الطلبات · الكتالوج · الفريق · الإعدادات |
| **barber** | `reservations` · `catalog` · `whatsapp_ordering` | **true** | نظرة عامة · التقويم · الحجوزات · الخدمات · العملاء · الفريق · الإشعارات · الإعدادات |
| **clinic** | `reservations` | **true** | the same nine, minus المتجر |

**Verified live**, not inferred: logging into `alzabt.salmansaas.com/caracas/dashboard` as
`admin@caracas.com` rendered exactly `نظرة عامة · الطلبات · الكتالوج · الفريق · الإعدادات`, and its
Overview read `١٠ الأقسام · ٩٧ المنتجات` — the real counts.

---

## 4. Open Findings — the asymmetries this projection exposes

Each is measured. None is fixed by this document; it exists so none is rediscovered.

### 🔴 F-1 · A restaurant owner cannot reach his own items without an invisible tap

The Catalog tab lists categories. Every control the eye can see — `تعديل · إخفاء · ↑ · ↓` —
belongs to the **category**. The item editor exists in full (create, edit, **price**, image,
reorder, soft-delete: `CatalogTab.jsx:245 · 275 · 491`) and is reachable **only** by tapping the
category card body:

```js
// CatalogTab.jsx:324
onClick={() => setSelectedCat(selected ? null : cat)}
```

The card is a plain `div` with no affordance. Proven in a real browser: tapping the card made
`+ منتج جديد` appear; tapping anything visible edits the category instead. **The owner was right,
and the feature was there.** This is the single highest-value fix in the file.

### 🔴 F-2 · The restaurant's «الطلبات» tab is structurally empty

`caracas` orders through `wa.me`, not through our API — measured in a real browser: the green
button calls `window.open("https://wa.me/...?text=<the order>")` and the whole journey issues
**zero POST**. So `StoreOrder` stays at 0 forever, and «طلبات اليوم»، «الإيرادات»، «الأكثر مبيعاً»
and «توزيع الطلبات» can never fill for a `whatsapp_ordering` tenant.

⇒ The nav gives a restaurant a tab whose data source its own ordering model never writes. Whether
that changes is a product decision (central relay vs. direct), **not a dashboard fix**.

### 🟡 F-3 · A barber holds `catalog` and has no Catalog tab

`barber.default_services` includes `catalog`, and the `hasReservations` branch has no `catalog`
entry — services moved inside `الخدمات` by the Staff/Store IA Separation (2026-08-09). The service
is active and the tab is absent **by design**, which is fine; it is recorded because the pair reads
like a bug to anyone checking services against tabs.

### 🟡 F-4 · A restaurant owner has no «العملاء» and no «الإشعارات»

Both live in the `hasReservations` branch only. `Customer` rows exist platform-wide and the
Customer Registry merges reservations and store orders by phone — so the data exists and the
restaurant branch simply does not surface it.

### 🟡 F-5 · Currency disagrees with itself

The dashboard Overview renders `٠ LBP` while the public menu renders `$4.50`, for the same tenant,
on the same day. `Client.currency` defaults to `SAR` in `prisma/schema.prisma`, which is a third
value again. Nothing here is decided; the disagreement is the finding.

---

## 5. Why the documentation is NOT re-filed per vertical

Salman's instinct (2026-10-01) was that the dashboard documents may need sorting under the vertical
classification. Measured: **377 files under `.claudedocs/` mention the dashboard** (`work` 119 ·
`sessions` 70 · `architecture` 51 · `implementation` 46 · `plans` 19).

Re-filing those per vertical would fork one Interface into four accounts that drift — the same
duplication disease already paid for twice in this repository (`.agents/` and the symlinked
`skills/` tree, both found and removed 2026-09-27). The Interface is one; §1 proves the code agrees.

**What the instinct correctly identified is the gap this file fills**: there was nowhere that said
what each vertical actually sees. That is one document, not a re-filing of 377.

---

## 6. Relationship to the rest

- `maturity/dashboard.md` — the recurring Review ledger. This file is current state; that file is
  dated history. A Review may revise §3 or close a finding in §4.
- `rules/backend/architecture.md` §10 — the Admin/Public split this Interface sits on.
- `app/core/verticals.py` — `VERTICAL_REGISTRY` is the source of §3's left column, never restated.
- `.claudedocs/plans/restaurant-vertical-product.md` — Track F2 already records that the stats are
  chalet-shaped; F-2 above is the measured instance of it.

**This document decides nothing.** It records what is, with evidence, so that a decision about the
dashboard can be made against reality rather than against memory.
