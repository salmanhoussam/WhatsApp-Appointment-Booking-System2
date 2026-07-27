# Store Template Pilot — Implementation Contract

**Follows:** Service Execution Constitution (`.claude/rules/service-execution-constitution.md`).
Reuses `.claude/agent/tenant-seeder.md`'s existing 6-step Demo Flow **verbatim** — this Contract
does not invent a new Service or a new Flow. It scopes that existing Service to one pilot tenant,
under the "Pragmatic Baseline" decision recorded in `STORE_TEMPLATE_PLAN.md` §5.

**Status:** Contract only as of this commit. Execution (fixture creation, tenant seeding, Cart/
Checkout exercise) is separate follow-up work, evidenced in
`.claudedocs/work/tenant-seeder/store-pilot-test-20260727/`.

---

## 1. Mission

Seed one real, live Store-module pilot tenant (`store-pilot-test-20260727`) using **Simple
Products only**, and prove — with real API calls, not just a config read — that a shopper can add
a real product to a real cart and complete a real cash checkout. This is Store's own bar for
"reference quality," parallel to how Restaurant's pilot needed its buttons to actually fire, not
merely render: Restaurant's verification stopped at `GET /config`; Store's must go one link further
in the chain (Data → Transformation → State → Render → **actual purchase**), per
`investigation-protocol.md`'s "Runtime Before Assumption" rule.

## 2. Scope

**In scope**: one pilot tenant, Simple Products (name/description/price/currency/is_featured/
image only), real Cart add + real Cash Checkout, using the existing `fashion-grid` registry
template (`module_key: "store"`).

**Explicitly out of scope** (per `STORE_TEMPLATE_PLAN.md` §5 — inherited tech debt, not fixed
here):
1. Product Variants (`metadata.variants`) — not built, not seeded, not tested.
2. Catalog's Duplicate Architecture finding (`store.py` bypassing `catalog_service.py`) — inherited
   as-is.
3. Orders' Missing Architecture finding (no `store_order_service.py`) — inherited as-is; this pilot
   proves the checkout *works*, not that it's architecturally clean.

## 3. Context Investigation (already performed, see `STORE_TEMPLATE_PLAN.md`)

- Real precedent read: `scripts/data/pilot-test-20260720.json` (fixture shape),
  `scripts/data/footlab/{categories,items}.json` (real seed-data shape `seed_catalog.py` expects),
  `scripts/data/page_templates/store.json` (already section-complete — all 6 section types already
  have confirmed `SECTION_MAP` renderers per `tenant-seeder.md`'s own dated Frontend Handoff
  Checklist finding — no missing-component surprise expected here, unlike Restaurant's first run).
- Real backend read: `app/api/v1/public/store.py` (Cart/Checkout routes, real request/response
  shapes), `prisma/schema.prisma`'s `StoreCart`/`StoreCartItem`/`StoreOrder`/`StoreOrderItem`
  models.
- `frontend/src/config/template-registry.js`'s `fashion-grid` entry: `module_key: "store"`,
  `services: ["store"]`, `seedCategories` (5 real category names, used as the source for Step 4's
  category seed).

## 4. Inputs

`scripts/data/store-pilot-test-20260727.json` — schema v2.1, `_description` marked **SYNTHETIC
TEST FIXTURE**, fake owner contact details, `client.slug: "store-pilot-test-20260727"`,
`design.template_key: "fashion-grid"`, `design.module_key: "store"`,
`services_config.active_services: ["store"]`. Mirrors `pilot-test-20260720.json`'s exact shape.

## 5. Outputs

- Registered `Client` + owner `User`, JWT obtained.
- Applied settings (`PATCH /admin/settings`) — primary color, currency.
- Seeded `CatalogCategory` rows (`POST /admin/catalog/seed-from-template`).
- Seeded real `CatalogItem` rows (`seed_catalog.py --tenant store-pilot-test-20260727`) — Simple
  Products only, no `metadata.variants`.
- `scripts/data/store-pilot-test-20260727/{settings,page_content,categories,items}.json` (Step 4.5,
  mandatory per `.claude/rules/tenant-onboarding.md`).
- A real `StoreCart` + `StoreCartItem` row (via `POST /public/store/cart`).
- A real `StoreOrder` + `StoreOrderItem` row (via `POST /public/store/orders`,
  `payment_method: "cash"`).
- Live demo link: `http://localhost:5173/demo/store-pilot-test-20260727`.

## 6. Dependencies

Upstream: none — this is a manually-authored synthetic fixture, not extracted by المحقق كونان
(same convention as `pilot-test-20260720.json`). Downstream: none scoped in this Contract — no
Frontend Architect handoff needed (per `tenant-seeder.md`'s own rule: template-based, non-custom
tenants need no `routes.jsx`, `DynamicTenantResolver.jsx` handles it automatically).

**Known real risk, named up front**: Supabase pooler connectivity was confirmed intermittent
earlier this session (`.claudedocs/reviews/pilot-test-20260720-verification.md`). Execution may
require a retry if the same instability recurs.

## 7. Evidence

`.claudedocs/work/tenant-seeder/store-pilot-test-20260727/execution-context.md` (Context
Investigation, written before Step 1 of the Demo Flow begins) +
`.claudedocs/work/tenant-seeder/store-pilot-test-20260727/evidence.md` (real HTTP status codes,
real UUIDs, real category/item counts, the real cart contents, the real order total) — same
convention `tenant-seeder.md` already specifies for every run.

## 8. Completion Checklist

- [ ] All 6 Demo Flow steps succeeded in order, none skipped
- [ ] `scripts/data/store-pilot-test-20260727/` files created (Step 4.5)
- [ ] Real `CatalogItem` rows seeded via `seed_catalog.py`, Simple Products only (no variants)
- [ ] `GET /api/v1/public/store-pilot-test-20260727/config` confirms `active_services` includes
      `store` and all 6 sections resolve
- [ ] A real Cart add (`POST /public/store/cart`) succeeds against a real seeded `catalog_item_id`
- [ ] A real Checkout (`POST /public/store/orders`, cash) succeeds and its `total_price` is
      cross-checked by hand against the real seeded price(s) × quantity
- [ ] `execution-context.md` written before execution began
- [ ] `evidence.md` written with real values, not "done" alone
- [ ] Tech-debt exclusions (§2) restated in the evidence file so the pilot's real scope is never
      confused with "Store is fully reference-quality"
