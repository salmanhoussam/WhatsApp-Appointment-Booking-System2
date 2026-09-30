# Restaurant Vertical — the product plan

**Status:** 🔵 Plan · **Track A CLOSED** 2026-09-30/10-01 · production gate 🔴 CLOSED
**Shipped:** `7e208e5` (soft delete) · `e399988` (SKU + the fifth hard delete)
**Measured against:** `HEAD = dcc1bc3`, 2026-09-30. Every repo figure is perishable.
**Supersedes nothing.** `.claudedocs/plans/restaurant-visual-report.md` is **Track C** below, and its
phases 1–2 are already shipped — that file keeps its own execution log.

> Salman, 2026-09-30, on why Phase 3 does not start yet:
> *"ما أعتقد أن المرحلة الثالثة ما فينا نبلش فيها دغري… كله هذا لازم يكون ضمن الخطة."*

---

## 🔴 0. STOP — one finding outranks everything else in this plan

**Re-seeding the catalog destroys order history and every owner edit, silently.**

```
scripts/reseed_caracas_direct.py:41   await db.catalogitem.delete_many(where={"clientId": ...})
scripts/reseed_caracas_direct.py:45   await db.catalogcategory.delete_many(where={"clientId": ...})
                                      …then re-creates every row from JSON with NEW ids
```

And `CatalogItem` is the parent of three cascades (`prisma/schema.prisma`):

```
line 438  GalleryImage    onDelete: Cascade
line 695  StoreCartItem   onDelete: Cascade
line 755  StoreOrderItem  onDelete: Cascade     ← 🔴 the order lines the report reads
```

⇒ Running that seeder again:

| what is lost | consequence |
|---|---|
| every owner price/name edit | the dashboard and Lia both write to `CatalogItem`; the JSON does not know about them |
| **every `StoreOrderItem` row** | "top items" becomes permanently wrong for all history before the reseed |
| every `GalleryImage` tied to an item | item photos vanish |
| live carts | a customer mid-order loses it |

`StoreOrder` (the header) survives with its `totalPrice`, so **revenue would still look right while the
item breakdown silently emptied** — the worst shape of failure, because nothing announces it.

🔴 **This is not hypothetical.** `caracas` holds 97 items seeded from
`scripts/data/caracas/items.json`, Salman has a **new paper menu** to load, and the obvious way to
load it is to re-run that script. **Track A exists to make that safe before anyone does it.**

**Nothing in this plan may run that script, or any `delete_many` on `CatalogItem`, without an
explicit separate authorisation.**

### 🔴 0.1 — and the seeder is the SECOND-worst instance. The worst is a button the owner presses.

Measured 2026-09-30 while preparing Track A's migration:

```
app/repositories/admin_catalog_repo.py:168-173
    async def delete_item_by_filter(...):
        """Hard-delete a single item scoped to tenant, optionally filtered by module_key."""
        return await prisma_client.catalogitem.delete_many(where=where)

reached by TWO LIVE ADMIN ROUTES:
    app/api/v1/admin/store.py:266        deleting a store product
    app/api/v1/admin/restaurant.py:283   deleting a MENU ITEM  ← the restaurant owner's own button
```

⇒ **A restaurant owner removing a dish he no longer sells destroys every order line that ever
referenced it**, through the same `StoreOrderItem` cascade — in ordinary daily use, with no script,
no warning, and no way back.

`REPO` The only reason this has cost nothing yet: `caracas` and `arizona` hold **zero orders**. The
damage begins with the first real order, and the owner has no reason to suspect the button.

`INFER` This reframes A-Q1 entirely. Soft delete is not a tidiness preference for reports — **it is
the fix for a live data-destruction path in the product**. And it outranks the new menu: an owner
who can safely add dishes but not safely remove them is one tap from erasing his own history.

**Consequence for Track A's ordering:** the soft-delete fix (A3) is no longer a step *inside* the
menu-update work. It is the first thing that ships, on its own, ahead of the menu.

---

## 1. What was measured — answers to the eleven questions asked

### 1.1 How is an operation registered? (`REPO`)

`app/services/lia_operations.py` — a five-field frozen record, and the registry is private
(`_REGISTRY`, 7 entries):

```python
OperationDefinition(permission, legacy_roles, service_key, write_fn, mirrors_route)
```

Every value is **read off the real route**, never chosen — `mirrors_route` records which. The
file's own rule: *"nothing the model produces except the operation NAME"*, and **I-7**: *"Lia holds
no permission of her own."*

Counted 2026-09-30: **7 operations, 6 writes + 1 read** (`daily_report`, the only `.read`).

### 1.2 How does the restaurant get permission? (`REPO`)

Two independent gates, and conflating them is the classic error:

```
require_service("restaurant")   app/core/services.py:36   → 403 if client_services row missing/inactive
require_permission(...)         the ACTOR's rights        → 403 if this user may not
_vertical_allows_operation(...) ADR-0008 D-5              → may this VERTICAL ask at all
```

`app/api/v1/public/restaurant.py` gates every endpoint on `require_service("restaurant")` with
`get_current_tenant` — the mandatory order in `rules/backend/api-rules.md` §2.

### 1.3 The guard and what it does (`REPO`)

`require_service(key)` is a dependency factory: resolves the tenant, looks up `client_services` for
`(clientId, serviceKey, isActive=True)`, raises **403** if absent. Wrapped in `with_db_resilience`
since 2026-08-10, because it is the first thing every gated route touches and a transient pooler
hiccup there used to fail the entire request.

### 1.4 🔴 What changes in onboarding — and a real inconsistency (`REPO`)

**Three different maps answer "what is a restaurant", with three different answers:**

| source | services granted |
|---|---|
| `VERTICAL_REGISTRY["restaurant"].default_services` | `catalog` · `restaurant` · `restaurant.menu` · `whatsapp_ordering` (4) |
| `SERVICE_TYPE_MAP["restaurant"]` (`core/services.py`) | `restaurant` · `whatsapp_ordering` · `restaurant.menu` (3 — **no `catalog`**) |
| `_SERVICE_SEED_MAP["restaurant"]` (`registration_service.py:53`) | `restaurant` · `catalog` (2 — **no `whatsapp_ordering`, no `restaurant.menu`**) |

⇒ **Which map runs decides what the tenant can do**, and a tenant onboarded through one path is not
the same product as one onboarded through another. This is the *"restaurant means three things in
three layers"* finding from `work/caracas-vertical-classification/`, now showing up as three
different **seed sets**. `INFER` It must be resolved before another restaurant is onboarded, or the
second tenant will differ from `caracas` in ways nobody chose.

Also measured: `registration_service` accepts `vertical` and **fails loudly** on an unregistered
one (`BusinessLogicError`) — the hard gate already works; it is the service sets that disagree.

### 1.5 How data is called and returned (`REPO`)

`Route → Service → Repository → DB`, enforced by `rules/backend/architecture.md` §2. Public
restaurant reads go through `require_service` then a service; the Report path added in Track C is
`load_report() → store_report_repo → prisma`, with `build_report()` pure so it is testable without
a database. Every query carries `clientId` **at the DB level**.

### 1.6 How the seeder works today (`REPO`)

```
scripts/data/{slug}/   settings.json · page_content.json · categories.json · items.json · style.json
                       (caracas has all five)
seed_catalog.py        the general catalog seeder
seed_page_content.py   page sections → client.config.content.sections
reseed_caracas_direct.py  🔴 delete-then-recreate — see §0
```

`rules/tenant-onboarding.md` §7's Completion Gate already defines "done":
`Client → User → Services → Settings → Page Content → Media → public page renders → dashboard renders`.

---

## 2. External research — what the field does (`SOURCE`)

### 2.1 Grounding an agent against a catalog — and we already do it

The 2026 consensus on stopping an agent inventing prices and dishes converges on exactly the rule
this codebase already enforces:

- *"The shopping agent never retrieves products directly; all calls go through the merchant agent's
  structured API, so the LLM cannot hallucinate catalog contents."*
- Validate tool names **against a registry**, reject anything not in it.
- Constrain output to a schema / an enum / **a set of valid IDs**, so invented values are impossible
  by construction.
- A validation layer between raw model output and the code that acts on it.
- *"When the model needs 'the current price of SKU-1234,' it needs a number, not a paragraph that
  might contain a number."*

`INFER` 🟢 **This is `lia_operations`' contract restated by strangers.** Our registry is the tool
catalogue, `mirrors_route` is the validation anchor, and "the model produces only the operation
NAME" is constrained decoding enforced at the architecture level rather than at the decoding level.
**We do not need to adopt a new pattern; we need to extend the one we have to a second vertical.**

### 2.2 A conversational menu agent — what it is used for

`SOURCE` Real deployments (KFC India, Domino's "Dom") let a customer browse the menu, customise,
and order inside WhatsApp with no app install. Reported capabilities: menu navigation, order
placement, modification without a fixed script, recommendations.

`INFER` **Two different agents are being conflated in that description, and this plan keeps them
apart:**

```
OWNER agent    Lia — edits the menu, asks for reports.  Authenticated by phone. WRITES.
CUSTOMER agent a diner browsing and ordering.           Anonymous. Must NEVER write catalog data.
```

They share a catalog and share nothing else: different identity, different permissions, different
failure cost. `PROP` The customer agent is a **separate capability with its own ADR**, and this
plan does not open it — it only records that the two must not be built as one.

### 2.3 Menu from a photo (`SOURCE`) — relevant, because the new menu is on paper

Benchmarks across 10 OCR providers on 1,000 documents: top accuracy **91.7%**, Gemini 2.0 Flash
86.1%, Azure 85.1%. A specialised restaurant-menu API claims 99%+. Vision-language models
(Qwen2.5-VL, DeepSeek-OCR, olmOCR) handle layout and tables.

`INFER` At 86–92%, roughly **one field in ten is wrong** on a 97-item menu — about 10 wrong prices
or names. ⇒ Extraction is a **drafting aid that must be reviewed**, never a direct write. Which is
the same conclusion Lia's own draft/confirm flow already reached for a single item.

### 2.4 Arabic, Franco and code-switching (`SOURCE`)

Lebanon code-switches constantly — *"hi, كيفك؟, çava?"* is given as a canonical example. Guidance:
detect language **per message**, not per conversation; write system instructions **in Arabic, not
translated**; test with native speakers.

`REPO` Lia already handles Franco in the owner path (`L-10`, `L-18`, `L-19` in the live-test plan,
including the `ndif` trap). `INFER` The customer path would face it far more, from strangers rather
than from one known owner.

---

## 3. The tracks

Ordered so that nothing depends on a track above it. **None is authorised to start.**

### Track A — 🔴 make the menu safely updatable (blocks everything)

**Why first:** §0. A new paper menu is waiting, and the only existing tool to load it destroys
order history and owner edits.

```
A1  Decide the update semantics: UPSERT by a stable key, not delete-then-create
    → what IS the stable key? `CatalogItem` has no SKU/code column (measured). Name is not stable:
      production already holds five duplicate names
A2  A dry-run mode that reports adds / updates / removes BEFORE writing anything
A3  A removal policy that never cascades: deactivate (`isActive=False`), never DELETE a row that
    a StoreOrderItem points at
A4  Guard the destructive script — refuse to run against a tenant with orders, or delete it
A5  Only then: load Salman's new paper menu
```

**Open question A-Q1:** does history matter more than tidiness? Deactivating instead of deleting
leaves retired dishes in the table forever. `INFER` For a report that compares weeks, yes — it must.

### Track B — resolve what a restaurant tenant *is*

```
B1  Reconcile the three service maps (§1.4) into one source of truth
B2  Decide what a new restaurant tenant gets, exactly, and make onboarding produce it
B3  Re-measure caracas and arizona against that definition — they were classified, not provisioned
```

### Track C — the Visual Report  →  `.claudedocs/plans/restaurant-visual-report.md`

Phases 1–2 shipped (`dcc1bc3`). Phase 3 onward **waits for Track A**, because a report whose item
history can be erased by a seeder is a report nobody should trust.

🔴 Phase 3 is two things, not one (LV-7): register the operation **and wire
`_vertical_allows_operation` at the dispatch**.

### Track D — Lia's restaurant prompts

`REPO` `_LIA_VERTICALS` fence is built and `restaurant` is declared empty, so this track is data +
text, not mechanism. Per `rules/text-context-rule.md`: **the text is ratified before the code**, it
lives in `app/prompts/lia.md` under the drift rule, and every new branch is asked *what reaches the
user here?* — silence is a missing text, not neutral behaviour.

```
D1  The vocabulary: a restaurant owner says صنف/طبق, not خدمة. Lia's barber wording does not transfer
D2  "الأسبوع" does not exist in lia.md (measured: zero occurrences)
D3  Franco and code-switching, per §2.4
D4  Every refusal has its own sentence — a restaurant refused a WRITE must not get the barber text
```

### Track E — the customer-facing menu agent

`PROP` **Recorded, not opened.** A separate capability with its own ADR, for the reasons in §2.2.
Its prerequisites are Track A (a trustworthy catalog) and a decision about anonymous identity.
🔴 And it must never hold a catalog write path.

### Track F — templates and marketing copy

```
F1  A restaurant page template — `scripts/data/page_templates/restaurant.json` already exists
F2  Dashboard surface for a restaurant owner (today the dashboard's stats are chalet-shaped)
F3  Marketing copy — deliberately LAST. Nothing is promised that is not measured: the brief written
    for caracas already refuses to promise WhatsApp editing, POS integration and table booking
```

---

## 4. Risks

| # | risk | tag |
|---|---|---|
| 🔴 1 | a reseed silently erases order history and owner edits (§0) | `REPO` |
| 🔴 2 | three onboarding maps ⇒ the next restaurant differs from caracas by accident | `REPO` |
| 🔴 3 | menu OCR at ~86–92% ⇒ ~10 wrong fields in 97 items if written unreviewed | `SOURCE` |
| 🔴 4 | owner agent and customer agent built as one ⇒ an anonymous writer to the catalog | `INFER` |
| 🟡 5 | `CatalogItem` has no stable external key, so "update the menu" has no safe join column | `REPO` |
| 🟡 6 | still zero orders on caracas/arizona — every report reads honestly zero | `REPO` |
| 🟡 7 | order creation still notifies nobody (`public/store.py`) | `REPO` |
| 🟡 8 | Franco/code-switching from strangers is harder than from one known owner | `SOURCE` |

---

## 5. Decisions — ratified by Salman, 2026-09-30

### A-Q2 · a stable key: **add `sku`**, unique per tenant

> *"the internal ID changes with every reseed… add an `sku` (or handle) field to `CatalogItem` as a
> stable, tenant-unique identifier (`@@unique([clientId, sku])`). This is the lifeline for any safe
> future menu update or sync."*

Prepared as `prisma/migrations/add_catalog_item_sku.sql` — **DDL only, not executed.**

### A-Q1 · soft delete: **yes, without hesitation**

> *"Hard delete is completely forbidden for any item linked to an order… a retired item disappears
> from the customer's ordering surface and from Lia's engine, but stays in the database to protect
> the integrity of financial and historical reports."*

🔴 **Correction to the decision as stated, in our favour: `is_active` ALREADY EXISTS.**

```
prisma/schema.prisma, model CatalogItem:
    isActive  Boolean  @default(true)  @map("is_active")
```

So **no DDL is needed for it.** What is missing is not the column — it is that **nothing uses it as
a delete path**: both live routes call `delete_item_by_filter`, whose own docstring says
*"Hard-delete"* (§0.1).

⇒ A-Q1 is therefore a **code change, not a migration**: turn the two DELETE routes into
`isActive = False`, and make every customer-facing read and Lia's engine filter on it. The
public store read already does (`store_repo.list_store_products` filters `isActive: True`), so the
customer-facing half is largely in place — which is measured, not assumed, per route, before any
edit.

### B-Q1 · `VERTICAL_REGISTRY` wins

> *"the `VERTICAL_REGISTRY` map (4 capabilities) is the most complete and expressive… it wins and is
> adopted as the single source of truth. `SERVICE_TYPE_MAP` and `_SERVICE_SEED_MAP` must be unified
> to match it exactly."*

Target for all three: `catalog` · `restaurant` · `restaurant.menu` · `whatsapp_ordering`.
⚠️ Note for execution: changing these maps affects **future provisioning only** — no existing row is
touched, exactly as the `barber` change of 2026-09-06 did. `caracas` and `arizona` were *classified*,
not re-provisioned, so they must be re-measured against the new definition (B3) rather than assumed
to match.

### X-Q1 · the owner's real need reorders the whole product

> *"The owner asked to 'edit prices'. That is the truth that must drive our product now. We drifted
> toward complex reports and a customer agent, while the owner's real pain is that he cannot change
> a price. Our top priority is giving him a safe way to update his prices (and add the new menu)
> without destroying his existing data. Report questions are deferred to a future visit."*

**Consequence, applied to this plan:**

```
Track A  🔴 promoted to the only active track
Track C  the Visual Report — DEFERRED, not cancelled. Phases 1-2 stay shipped and green
Track D  Lia's restaurant prompts — narrowed to what price editing needs, nothing more
Track E  the customer agent — CLOSED for now
Track F  marketing copy — unchanged: last, and only about what is measured
```

`INFER` And §0.1 makes this ordering doubly right by accident: the owner's stated need is to
*change* items, and the path he would use to *remove* one currently destroys history. Serving the
stated need and fixing the unstated hazard are the same piece of work.

### A-Q3 / A-Q4 / A-Q5 · SKU rules, ratified 2026-09-30

```
A-Q3  AUTO-GENERATED by us, during the new-menu upload, from the item name
      e.g. CHICKEN-SHAWARMA-01
A-Q4  CASE-SENSITIVE index, NORMALISED at the write boundary:
      uppercase alphanumeric with dashes, so no hidden collision is possible
A-Q5  NEVER re-used. A SKU belongs to its item for life. Retiring an item deactivates it and
      KEEPS the SKU reserved, so historical financial reports stay sound
```

⚠️ **Execution notes these three imply, recorded now so they are not re-derived:**

- Normalisation belongs in **one function at the write boundary**, the same shape as
  `app/core/phone.py` — a UI rule alone is not a guarantee, because a seed script or an API client
  will eventually send an un-normalised value.
- A-Q5 + the unique index mean a retired item's SKU **blocks re-use by construction**, which is the
  intended behaviour and needs no extra code — but it also means **a typo in a generated SKU is
  permanent** unless an explicit correction path exists. That path is not designed yet.
- Generating from the name needs a collision rule: `caracas` holds five duplicate names in
  production, so `-01`/`-02` suffixing is load-bearing, not cosmetic.

### Still open

```
🚪 E-Q1  a customer-facing agent at all? — closed for now by X-Q1, not answered
🚪 F-Q1  a different dashboard for a restaurant owner, or the same one with different tiles?
🚪 A-Q6  NEW, and on the critical path: `seed_from_template` still HARD-deletes every category
         (SD-8). Loading the new menu goes through exactly that path. Decide before running it.
```

---

## 6. Recommended next step

**Track A, step A1 — a decision, not code.** Everything else is blocked behind a menu that cannot be
updated without losing data, and the new menu is already in hand. It is also the cheapest: A1 and
A-Q2 are answered in a conversation, not in an editor.

And **X-Q1 in the same visit** — one question to the owner, which decides Tracks C, D and E at once.


---

## 7. Execution log

### Track A — 🟢 CLOSED, 2026-09-30 → 2026-10-01

**A3 · soft delete** (`7e208e5`). Four hard-delete paths, not one — three more than the plan
predicted, and all four were owner-facing buttons rather than scripts:

```
admin/restaurant.py:283  menu item      admin/store.py:266   product
admin/restaurant.py:165  menu CATEGORY  admin/store.py:352   store category   ← widest
```

The fix was smaller than the hazard: `soft_delete_item`/`soft_delete_category` already existed
directly above their destructive neighbours, and `catalog_service` already held the correct paths
— `admin/catalog.py` used them. Only the two module routes bypassed the service, which is the
bypass `rules/backend/architecture.md` §9 already names. All four now go through the service, so
§9 holds again; the soft functions gained `module_key` so scoping survived the move.

`is_active` needed no migration — it already existed. The column was never missing; nothing used
it as a delete path.

**A-Q2…A-Q6 · SKU** (`e399988`). Migration run on production via `DIRECT_URL`, `CONCURRENTLY`,
verified with a positive control (a duplicate UPDATE refused inside a rolled-back transaction —
an index that exists but does not reject a duplicate is not a key). `app/core/sku.py` is the one
normalisation boundary, for the same reason `app/core/phone.py` exists. Backfill: **125 live items**
(caracas 97, arizona 28), dry-run reviewed first, zero opaque keys, two duplicate names split by
the counter, zero duplicates and zero normalisation violations after.

**SD-8 closed.** The menu path archives instead of deleting, freeing each retired SKU. The
provisioning path keeps a hard delete — it relies on the cascade to clear `CatalogServices` — but
is renamed `hard_delete_categories_for_provisioning` and **refuses when any order line exists**.

🔴 **A-Q5 vs A-Q6 resolved structurally, not by judgement:** `StoreOrderItem` references
`catalogItemId`, a UUID, and stores no SKU. Archiving cannot move a historical figure. Recorded in
`app/core/sku.py` because if a SKU is ever denormalised onto an order line, A-Q6 must be reopened.

**One declared deviation:** the archive marker is `-ARCHIVED-`, not `_archived_` as sketched in the
decision, so an archived SKU survives re-normalisation — otherwise A-Q4 and A-Q6 contradict each
other the first time anything re-normalises a row.

⇒ **Track A's goal is met: the catalog can now receive the new paper menu without losing data.**

### Tracks B–F — unchanged

`B` unresolved (three service maps) · `C` deferred by X-Q1, phases 1–2 shipped and green ·
`D` narrowed · `E` closed for now · `F` last.
