# Slice 3 — Store / Customers: Implementation Design

**Date:** 2026-09-04
**Status:** DESIGN ONLY — no code, no migration, no commit, no push, no deploy.
**Decisions:** the four open questions of the first draft were **decided by Salman, 2026-09-04**,
and are recorded inline below (§2.3, §3.1, §4.1, §6.2). This revision incorporates them and adds
the explicit **Dependency / Gate Matrix** (§5) he required before approval. Awaiting his review of
this final version; **implementation approval is a separate, later act.**
**Parents:** `PHASE_2B_DESIGN.md` · `PHASE_2B_2_DESIGN.md` (APPROVED) · `PHASE_2B_3_EVIDENCE.md` ·
`PHASE_2B_4_DESIGN.md` / `_EVIDENCE.md` (CLOSED). Invariants **I1–I7 binding**. This design
**extends** the existing architecture; it does not re-open it.

**Title note:** the first draft was "Store / Catalog / Customers". `catalog` is **out** per §2.3's
decision — the title reflects the real scope.

---

## 1. Evidence — the real routes, read from source

### 1.1 `app/api/v1/admin/store.py` — 11 routes

Every route carries the **identical** legacy tuple `("SUPER_ADMIN", "TENANT_ADMIN",
"MANAGER_RESERVATIONS")` plus `require_service("store")`.

| Proposed | Routes |
|---|---|
| `store.read` | `GET /products` · `GET /categories` · `GET /orders` · `GET /orders/stats` |
| `store.write` | `POST/PATCH/DELETE /products` · `POST/PATCH/DELETE /categories` · `PATCH /orders/{id}/status` |

Uniform tuple ⇒ **no per-route legacy anomaly to preserve** — the cleanest area of the three.

### 1.2 `app/api/v1/admin/catalog.py` — 9 routes *(not migrated this slice, §2.3)*

Legacy tuple `CATALOG_ROLES = ("SUPER_ADMIN","TENANT_ADMIN","MANAGER_RESERVATIONS","MANAGER_UNITS")`
— note `MANAGER_UNITS` is present here and **absent** from store.py. Recorded for Slice 4.

### 1.3 `app/api/v1/admin/customers.py` — **1 route, 28 lines**

```python
@router.get("/")
async def list_customers(user=Depends(require_roles("SUPER_ADMIN", "TENANT_ADMIN"))):
```

**`customers.write` does not exist.** There is no POST, PATCH or DELETE anywhere in this file. The
registry is query-time aggregation over `Reservation` + `StoreOrder` merged by phone — Salman's
2026-08-20 decision, no `Customer` table. There is nothing to write, so nothing to name.

Two further facts that matter below:
- The legacy tuple is **`SUPER_ADMIN` / `TENANT_ADMIN` only** — `MANAGER_RESERVATIONS` is **not**
  permitted today.
- It has **no `require_service()` gate**, deliberately: the registry is meaningful to a
  reservations-only, store-only, or both tenant.

---

## 2. The structural finding, and the decision taken on it

### 2.1 What the code actually does

`store.py` and `catalog.py` write **the same two tables**, `CatalogCategory` / `CatalogItem`,
partitioned only by a `module_key` string:

| File | Write path | Partition |
|---|---|---|
| `store.py` | `admin_catalog_repo` **directly** (bypasses the service layer) | hard-coded `module_key="store"` |
| `catalog.py` | `catalog_service` | **`module_key` supplied by the client** (`CategoryCreate.module_key: str = "catalog"`) |
| `restaurant.py` | `admin_catalog_repo` **directly** | hard-coded `module_key="restaurant"` |

Three write paths into one model — a **third** confirmation of the `rules/backend/architecture.md`
§9 violation ("One Capability. One Service. One Source of Truth."), and the first time
`restaurant.py` is identified as a third path.

### 2.2 Why `store.*` and `catalog.*` are not cleanly separable

Verified in source, not inferred:

- `catalog.py`'s `GET /categories` accepts `module_key` as a query parameter ⇒ a caller with
  `catalog.read` can **read store categories**.
- `CategoryCreate.module_key` is a client-supplied field defaulting to `"catalog"` ⇒ a caller with
  `catalog.write` can **create a category in the store partition**.
- `catalog_service.admin_update_item` / `admin_delete_item` take `(client_id, item_id)` with **no
  `module_key` filter at all** ⇒ a caller with `catalog.write` can **modify or delete a store
  product**.

**`catalog.write` is therefore a strict superset of `store.write`.** Two separate permissions would
promise an isolation the data layer does not enforce.

### 2.3 DECISION — Option A (Salman, 2026-09-04) ✅

> **Migrate `store` only in Slice 3; defer `catalog`.**
> Slice 3 = **store + customers + preset activation mechanics** — *not* a catalog migration.

Salman's stated reasoning, recorded verbatim in substance:
- `store` has clear, uniform boundaries.
- `store.*` needs no invented abstraction.
- The existing permission model is not bent.
- **A migration is not mixed with an architecture fix** (the dual-write-path issue).
- Shop Manager can genuinely run the store **without** `catalog.write` handing it wider access
  than intended.

**Consequence accepted explicitly:** Reservations Manager stays **not unlockable** in Slice 3
because its preset requires `catalog.read`. This is deny-by-default and the migration gates working
as designed — **and it must not be worked around by substituting some other permission.**

The dual-write-path issue (the former "Option C") remains an **independent architectural ticket**,
not part of this or any migration slice.

---

## 3. Permissions this slice defines

| Permission | Routes | Legacy tuple carried |
|---|---|---|
| `store.read` | store.py's 4 GETs | `SA, TA, MANAGER_RESERVATIONS` |
| `store.write` | store.py's 7 mutations | `SA, TA, MANAGER_RESERVATIONS` |
| `customers.read` | `GET /admin/customers/` | `SA, TA` |

**Not defined:** `customers.write` (no route exists, §1.3) · `catalog.read` / `catalog.write`
(deferred, §2.3) · `orders.write` (see §3.1).

### 3.1 DECISION — `store.write` stays whole (Salman, 2026-09-04) ✅

`store.write` covers product mutation **and** category mutation **and** `PATCH /orders/{id}/status`
as one permission.

> **`store.write` is the approved Store-area permission for v1.** Splitting it would introduce
> `orders.write` — a permission absent from the approved vocabulary — which means opening a new
> permission model *inside* Slice 3.

**Framing correction Salman made explicitly, and it changes how the add-on must be described
everywhere:** this is **not** a narrow "inventory" capability. It is the **whole Store area**. The
add-on's label may say inventory; its authority is the Store area, and the design, the Team UI copy
and the evidence must not imply otherwise.

---

## 4. Presets after Slice 3

### 4.1 Reservations Manager (`reservations_manager`) — blocked, and one recorded expansion

```
reservations_manager = [reservations.write, staff.read, services.read,
                        catalog.read, customers.read]        scope = all
```

**Status after Slice 3: NOT unlockable** — it requires `catalog.read`, and `catalog` is not
migrated (§2.3). No substitute permission is granted to work around this.

**`services.write` is confirmed absent** and nothing here adds it. The legacy `MANAGER_RESERVATIONS`
bundle is untouched; **Permission Bundle Correction remains a separate ticket.**

#### ⚠️ DECISION — `customers.read` is an INTENTIONAL PRESET EXPANSION (Salman, 2026-09-04) ✅

Recorded here in the terms Salman required, so it can never be misread later as legacy preservation:

| | |
|---|---|
| **What the evidence shows** | `customers.py`'s real tuple is `("SUPER_ADMIN","TENANT_ADMIN")`. A legacy `MANAGER_RESERVATIONS` account **cannot** read the customer registry today. |
| **What the preset does** | Grants `customers.read`, i.e. **more than the legacy role holds**. |
| **Classification** | **Intentional preset expansion.** *Not* behaviour preservation. *Not* an I3 bundle transcription. |
| **Why it is acceptable** | It applies to a **new preset that no existing account uses**. No live account's authority changes; nothing regresses. |
| **What it is not** | It is **not** Permission Bundle Correction, and must not be folded into it. That ticket narrows the *legacy* bundle; this widens a *new* preset. Opposite directions, separate decisions. |

This is exactly the class of change that must never pass silently during a migration — hence its own
row in the record rather than a footnote.

### 4.2 Shop Manager (`shop_manager`) — unlockable after Slice 3

```
shop_manager = [store.write, customers.read]        scope = all
```

`catalog.write` is **dropped** from the originally-approved row, because §2.2 proves it reaches
restaurant- and catalog-partition data — the opposite of what "Shop Manager" should mean. The preset
becomes **narrower and more accurate**, and loses nothing for its real job: store products, store
categories and store orders all sit behind `store.write`.

No `services.*`. No invented permissions. `customers.read` here raises no §4.1 issue — Shop Manager
has no legacy equivalent, so there is nothing to widen relative to.

**Unchanged and binding:** `role = STAFF` remains an **inert placeholder** for this preset. **No
`SHOP_MANAGER` enum value is added.** The account is governed by its permission array; `role` is
never authoritative for it.

### 4.3 The Store add-on (`inventory`)

```
inventory  →  grants [store.write]        (the whole Store area — §3.1)
```

Semantics, stated so they cannot drift:

- An **add-on layered onto another preset**, never a preset of its own.
- **No `scope` of its own** — it inherits the account's. `staff` + `inventory` stays `scope='self'`,
  and because `store` is **not** in `SCOPABLE_AREAS`, `self` correctly has **no effect** on store
  data: the barber sees his own appointments *and* the full shared inventory. This is invariant I2,
  and the exact case `PHASE_2B_2_DESIGN.md` §3 uses as its proof.
- Offered on `staff` and `reservations_manager`. A no-op on `shop_manager` (already granted) and
  meaningless on `tenant_admin` — hidden in both.
- Becomes assignable the moment `store` is migrated, i.e. **this slice**.

RK's originating case resolves exactly as designed:
```
preset=staff + addon=inventory + scope=self
→ reservations.write (own rows) · staff.read · services.read · store.write
```

---

## 5. Dependency / Gate Matrix — the single authority on "is this preset offerable"

Added at Salman's explicit request: *"we do not want 'preset enabled' scattered across
frontend/backend assumptions."* This table is the one place the answer lives; both the API gate and
the UI read from the same source of truth in code (`ASSIGNABLE_PRESETS` / `ASSIGNABLE_ADDONS` in
`app/core/permissions.py`), and neither computes it independently.

| Preset / add-on | Required migrated areas | Before Slice 3 | **After Slice 3** |
|---|---|---|---|
| `staff` (موظف) | `reservations` + `staff` + `services` | ✅ unlocked (Slice 2) | ✅ unlocked |
| `tenant_admin` (المالك) | *(legacy-shaped — needs none)* | ✅ unlocked | ✅ unchanged |
| **`shop_manager`** (مدير المتجر) | `store` + `customers` | ❌ blocked | ✅ **unlocked** |
| **`inventory`** add-on | `store` | ❌ blocked | ✅ **unlocked** |
| `reservations_manager` (مدير الحجوزات) | `reservations` + `staff` + `services` + **`catalog`** + `customers` | ❌ blocked | ❌ **still blocked — `catalog`** |

**Migrated areas by slice:** Slice 1 → `capabilities` · Slice 2 → `reservations`, `staff`,
`services` · **Slice 3 → `store`, `customers`** · Slice 4 → `catalog` (unblocks
`reservations_manager`) · later → the remainder.

**The rule this matrix encodes:** *a preset may only be offered once **every** area it grants has
been migrated to permission checks.* Offering one earlier produces an account that deny-by-default
(I4) 403s on the very thing its name promises.

### 5.1 The gate is server-side; the UI is not authority

Salman's explicit addition. Enforcement is **at the API**, in `resolve_preset()`:

- A `POST /admin/team` naming an unassignable preset or add-on is **rejected by the backend** with
  a clear reason (422), regardless of what any client shows. This is already how `resolve_preset`
  behaves for `shop_manager` and `inventory` today — Slice 3 flips them to assignable by widening
  the frozensets, and nothing about the enforcement path changes.
- The Team UI's disabled options (§6.2) are a **usability projection of the same data**, never the
  gate itself. A hand-crafted request cannot bypass them.

### 5.2 Route migration order within the slice

1. **`customers.py`** first — one GET, two-role tuple, no service gate, no scoping. The smallest
   possible proof that the pattern holds for a new area.
2. **`store.py`** second — 11 routes, one uniform tuple. `require_service("store")` stays exactly
   where it is: capability gating and permission gating are different questions and remain separate
   dependencies.

`require_roles` is never deleted. Deny-by-default (I4) continues to protect every unmigrated route,
including all of `catalog.py`.

---

## 6. `/admin/me` and navigation

**No change to `/admin/me`'s contract.** It already projects `permissions`, `scope`, `preset` and
`active_services`; new permission strings flow through with zero endpoint changes — a real
validation of 2B-4's projection design.

`PERMISSION_NAV` in `GenericAdminDashboard.jsx` **already declares** the entries this slice
activates:

```js
{ id: 'store',     permission: 'store.read',     service: 'store'   }
{ id: 'customers', permission: 'customers.read' }
```

A Shop Manager's nav therefore becomes `المتجر` + `العملاء` with **no frontend change at all**. The
`catalog` entry stays inert because nobody will hold `catalog.read`.

### 6.1 One real gap to verify, not assume

`activeTab` initialises from the JWT role before identity resolves; `shop_manager` stores
`role=STAFF`, so its initial guess is `'calendar'` — **not in its nav**. 2B-4's out-of-nav safety
net already force-navigates permission-based accounts to `NAV[0]`, but **Shop Manager is the first
preset that actually exercises it**. It must be confirmed in the browser, not assumed from code.

### 6.2 DECISION — disabled with a reason, not hidden (Salman, 2026-09-04) ✅

A preset whose areas are not fully migrated renders **visibly disabled with the reason**, e.g.:

```
مدير الحجوزات — غير متاح: صلاحيات الكتالوج لم تُرحّل بعد
```

Salman's reasoning: it makes the migration state legible instead of mysterious, and turns pattern
**P1** (a surface assuming a capability) into a **design guard** rather than something discovered
after implementation.

The same treatment applies to the capability axis: on a tenant without the `store` capability,
`shop_manager` renders disabled with *that* reason — a Shop Manager there would have an empty nav.

**And per §5.1, the backend rejects it either way.** The UI explains; it does not enforce.

### 6.3 No nav consolidation in this slice

The three nav mechanisms stay as they are. 2B-4 deferred consolidation until a second
permission-based preset exists — that condition is only now being met, so consolidation becomes a
legitimate **candidate for Slice 4**, not work for this one.

---

## 7. Verification plan

**A. Legacy equivalence (I1) — run before and after, results must be identical.** Every legacy role
against every migrated route: `MANAGER_RESERVATIONS` keeps full `store.*` (the I3 anomaly,
preserved verbatim); `MANAGER_RESERVATIONS` stays **denied** on `/admin/customers/`; `MANAGER_UNITS`
keeps its `catalog.py` access untouched.

**B. Unit tests**, extending `scripts/test_phase_2b4_core.py`'s pattern: `shop_manager` resolves to
exactly `[store.write, customers.read]`; the add-on adds exactly `store.write`;
`staff+inventory+self` reproduces RK's case; `reservations_manager` is **still rejected as
unassignable**; `customers.write` is rejected as an unknown permission; the Gate Matrix (§5) is
asserted directly against `ASSIGNABLE_PRESETS`/`ASSIGNABLE_ADDONS` so the table and the code cannot
drift.

**C. Real HTTP, tenant-matched accounts** (standing rule since the 2B-1 incident — never a
cross-tenant SUPER_ADMIN for an allowed-path write): a real `shop_manager` created through
`POST /admin/team` reaches all 11 store routes and `/admin/customers/`, and gets **403** on
`catalog.py`, `reservations.py`, `/admin/team`, `/admin/client-services/`.

**D. Server-side gate (§5.1).** A direct `POST /admin/team` with `preset=reservations_manager` —
bypassing the UI entirely — is **rejected by the backend**, with the reason naming the unmigrated
area. This is the test that proves the UI is not the authority.

**E. Cross-tenant isolation** on every newly migrated mutation: a product/category/order id from
another tenant returns 404/403 and leaves that tenant's rows byte-identical (recorded before/after).

**F. Scope non-effect (I2).** A `staff+inventory` account with `scope='self'` sees **all** store
products — proving `self` invents no filtering on a non-scopable area. The single most important
assertion in the slice, because it is the one an incorrect implementation would most plausibly get
wrong.

**G. Browser acceptance, per newly unlocked preset** (`browser-verification-protocol.md`; a green
200 is not a verified feature — 2B-4's own envelope bug proved it):
- **Shop Manager:** create via Team → log in → nav is exactly `المتجر` + `العملاء` → **lands on a
  tab that exists** (§6.1) → products list and edit work → a forbidden area is unreachable →
  deactivate/reactivate round-trip.
- **Staff + inventory:** log in → nav gains `المتجر` → sees **his own** reservations but **all**
  products (F, visually confirmed) → cannot reach Team or Settings.
- **Team UI:** `مدير الحجوزات` renders **disabled with its reason** (§6.2).

**H. State cleanup**, with before/after counts recorded, as in 2B-4.

---

## 8. Scope

**In:** `store.py` · `customers.py` · the `shop_manager` preset · the Store add-on · the Gate Matrix
and its server-side enforcement · verification.

**Out, explicitly:** `catalog.py` (Slice 4) · `restaurant.py` · the **dual-write-path fix**
(independent architectural ticket) · `MANAGER_UNITS` · custom-permission UI · editing existing
accounts · **Permission Bundle Correction** · nav consolidation · `orders.write` or any new
permission string · JWT changes · **any schema change** (none is needed — 2B-3's three columns still
suffice).

---

## 9. Status of the four decisions

| # | Question | Decision |
|---|---|---|
| 1 | §2.3 — Option A / B / C | **A — store only, defer catalog** ✅ |
| 2 | §3.1 — split `store.write`? | **No — it stays whole; it is the Store-area permission for v1** ✅ |
| 3 | §4.1 — `customers.read` for Reservations Manager | **Keep, recorded as an Intentional Preset Expansion** ✅ |
| 4 | §6.2 — hide or disable an unavailable preset | **Disable with a reason; gate enforced server-side** ✅ |

All four are decided. **This design is now awaiting Salman's review of the final version.
Implementation approval is a separate act — no code, no migration, no commit until it is given.**
