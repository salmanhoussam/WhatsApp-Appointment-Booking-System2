# Module Resolution Review — Is `moduleKey` Still a Valid Domain Concept?

**Date:** 2026-07-28 — Investigation only, per Salman's explicit instruction: *"لن أصلحها بسرعة.
أريد أولًا أفهم: هل moduleKey نفسه صار مفهومًا خاطئًا؟"* (I won't fix this quickly. First I want to
understand: has `moduleKey` itself become a wrong concept?). No code changed in this review. Follows
`investigation-protocol.md`'s evidence discipline. This is Sprint C's "Module Resolution Review,"
front-loaded ahead of Sprint A's item 2 (Service Visibility) precisely because Salman asked the
domain question before authorizing any fix.

## The Question

Today's Acceptance Review found RK Barber's real haircut services invisible on its own public
homepage, replaced by newly-added store products under the same heading. The proximate cause was a
single global `moduleKey` per tenant, derived with a hardcoded priority (`restaurant > store >
catalog`) and threaded through the frontend as if it were the tenant's one true "type." Salman's
question is sharper than "is there a bug here": is the *concept* of one `moduleKey` per tenant
itself now wrong, now that a real tenant (`hr`) has Catalog, Store, and Booking/Reservations all
active at once?

## Confirmed Findings

1. **There are three independent implementations that derive this single value, and they disagree
   with each other** — not one derivation function reused everywhere:
   - `frontend/src/pages/generic/store/useGenericStore.js:5-10` — the canonical `deriveModuleKey()`,
     returns `null` if none of restaurant/store/catalog are active.
   - `frontend/src/pages/generic/normal/DynamicPage.jsx:272-275` — a **separate, duplicated inline
     ternary**, same priority order, does not call the store's own function.
   - `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx:108-112` — a **third**, differently
     named-but-identical `deriveModuleKey()`, which — unlike the other two — **always** falls back
     to `'catalog'` even when `'catalog'` isn't actually in `activeServices` at all.
   This is itself a **Duplicate Architecture** finding independent of the domain question: three
   copies of "pick one moduleKey," silently diverging on the edge case that matters most (what
   happens when none of the three match).

2. **The backend was never built around a single value — it is already a proper, unbounded set.**
   `client_services` (`.claude/rules/backend/service-system.md` §1) is explicitly documented as "one
   row per activated feature," `@@unique([clientId, serviceKey])` — structurally, a tenant can have
   any number of simultaneously-active `serviceKey` rows; there is no cap of one, and `hr`'s real
   rows (`catalog`, `booking`, `whatsapp_ordering`, `reservations`, `store`) already prove this in
   production. `require_service()` (`app/core/services.py:31-46`) — the actual runtime gate every
   endpoint calls — only ever asks "is *this specific* key active," never "what is *the* key."
   `GET /{slug}/config` (`app/services/public_service.py:211-231`) already hands the frontend the
   correct plural array: `"active_services": [s.serviceKey for s in client_services if s.isActive]`.
   The one nominally-single-value backend field, `Client.service_type`, is confirmed **dead as a
   runtime gate** — used only at registration time to seed the initial `client_services` rows and
   for cosmetic display, never checked by any endpoint. **The single-value assumption exists
   nowhere in the backend.** It is purely a frontend simplification layered on top of an
   already-correct plural model.

3. **`CatalogCategory.moduleKey` (the field this morning's fix exposed) is itself already the
   right granularity — per-category, not per-tenant.** `prisma/schema.prisma`'s own category model
   already allows one tenant to own categories of different `moduleKey`s simultaneously (confirmed:
   `hr` has one `catalog`-moduleKey category and one `store`-moduleKey category, both under the same
   `clientId`, right now). The backend's repositories (`admin_catalog_repo.py`, `catalog_repository.py`)
   already accept `module_key` as an **optional** filter — omit it, and every category across every
   type comes back. **The domain-correct information already exists at the correct granularity in
   the database. The frontend collapses it before ever using it.**

4. **Concrete, already-shipped code proves the single-value assumption is actively load-bearing,
   not just latent:**
   - `CartPage.jsx:271-272` — `if (moduleKey && moduleKey !== 'restaurant' && moduleKey !== 'store') return null` — the entire Cart page renders **nothing at all** for a tenant whose derived moduleKey is `'catalog'`, even though that same tenant may have real, purchasable `store`-moduleKey items in the same catalog (exactly `hr`'s real situation before today's store activation, and arguably still relevant for any catalog-only tenant that later adds Store).
   - `KanbanBoard.jsx` hardcodes: `if (moduleKey === 'catalog') return <div>الكاتالوج لا يحتوي على طلبات</div>` — an explicit, written-down belief that "a catalog-type tenant never has orders," which is now simply false for any tenant, like `hr`, that has both.
   - `useCatalog.js` / `FeaturedItemsSection.jsx` — both fetch categories/items for **only the single derived moduleKey**, which is the exact mechanism behind this morning's "services became invisible" bug.
   None of these are typos — each is a deliberate branch written by someone who reasonably believed, at the time, that a tenant has exactly one shape. `hr` is the first real case that disproves it.

5. **Independent corroboration this is a structural gap, not a one-off fluke:**
   - `frontend/src/config/template-registry.js`'s dormant `'health-gym'` template (lines 322-337)
     already combines `services: ['store', 'reservations']` — and its author already had to **hand-override**
     `module_key: 'catalog'` (line 329) rather than trust the derivation logic, because the naive
     `restaurant > store > catalog` priority would have silently picked `'store'` and broken the
     template the same way it broke `hr` today. This is a human already patching around the same
     wrong assumption, at the template-authoring layer, before any real tenant hit it.
   - `.claude/rules/backend/service-system.md`'s own `reservations` vs `booking` entry documents
     that `hr` — "first real Barbershop-type tenant on the generic dashboard" — already broke a
     different single-value assumption once before (2026-07-23, missing the `reservations` key).
     Same tenant, same root pattern (a generic-path assumption built for one archetype, broken by
     the first tenant that doesn't fit it), different specific symptom.
   - No other *live* tenant currently combines catalog-bearing services the way `hr` does — but the
     combination of one confirmed live case, one dormant template independently needing the same
     escape hatch, and a backend model that was never singular to begin with, argues this will
     recur, not that `hr` is a fluke to special-case around.

## Answer to the Domain Question

**Yes — `moduleKey`, as currently used (a single tenant-wide value, derived once, threaded through
components as "the tenant's type"), is a wrong concept. It is not merely under-scoped or missing a
case; the thing it claims to represent — "the tenant's one module" — does not correspond to reality
for any tenant with more than one simultaneously-active catalog-bearing capability, and the backend
was never designed around that claim being true.**

To be precise about *what* is wrong, since the underlying need `moduleKey` was invented to serve is
real: something has to tell each piece of UI what kind of data/actions apply to what it's rendering
(is this category's checkout button a restaurant order or a store order? does this section's items
come from the booking flow or the shop?). That need doesn't go away. What's wrong is *collapsing it
to one global answer before use*, instead of asking the question **at the granularity the data
already carries it** — per category (`CatalogCategory.moduleKey`, already real), per section, per
cart line item — against the tenant's actual **set** of active capabilities
(`client_services`/`active_services`, already real and already plural). The backend already models
this correctly. The frontend's `moduleKey` derivation is a simplification that was reasonable when
every tenant genuinely had one shape, and has now been outgrown by the first tenant that doesn't.

## What a Corrected Model Would Look Like (concept only — not a plan, not scoped, not estimated)

Not a proposal to implement — Salman asked for understanding, not a fix. At the concept level, the
shift is: stop asking "what is this tenant's moduleKey" once, globally, near the top of the
component tree, and instead ask "what capability does *this specific thing* belong to" wherever a
capability-specific decision is actually being made — using data that's already there
(`CatalogCategory.moduleKey` for a category/its items; the plural `active_services` array for
whether to *show* a capability's UI at all, e.g. whether a Cart affordance exists anywhere on the
page). This would touch every consumer listed in Confirmed Finding 4 and the ~10 more found during
the underlying investigation (`useCatalog.js`, `catalogApi.js`, `CategoriesGridSection.jsx`,
`CatalogPage.jsx`, `ReservePage.jsx`, `OverviewTab.jsx`, `OrdersTab.jsx`, `KanbanBoard.jsx`, plus the
three derivation sites themselves) — real blast radius, not a one-file fix.

## Recommendation (not a Decision, not Execution)

This is a real, multi-file, cross-cutting domain-model change — not a bug with a one-line fix like
this morning's Booking 404. It touches how "what is this tenant" is answered in roughly a dozen
places across both the public-facing and admin frontends. Given its size and the fact that it
touches a genuinely load-bearing assumption throughout the generic tenant path, this warrants its
own proper Architecture Plan and Implementation Contract (per `documentation-policy.md`'s standard
workflow), not an ad-hoc patch — the same discipline this project already applied to comparable
cross-cutting changes (e.g. ADR-0003). Given Sprint C's Capability Ownership Review asks a closely
related question ("does each Capability have one Write Path" — Media's already-confirmed Duplicate
Architecture is one instance of a broader pattern; this Module Resolution finding is arguably
another instance of the *same* underlying habit, collapsing a plural real-world model into a single
convenient value), it may be worth scoping both reviews' findings into one Architecture Plan rather
than two separate efforts — a call for Salman to make, not decided here.

## Related

- `.claudedocs/reviews/rk-barber-acceptance-review-2026-07-28.md` — Finding #5, the original
  observation this review investigates.
- `.claudedocs/evolution/catalog-module-taxonomy.md` — a related but distinct watch-point (whether
  `CatalogCategory.moduleKey`'s 4-value string needs a typed registry) — that entry is about the
  *category*-level field staying a plain string; this review is about the *tenant*-level derivation
  built on top of it being conceptually wrong. Worth reading together, not merging.
- `.claude/rules/backend/service-system.md` — the `client_services` model this review confirms is
  already correct and unaffected by this finding.
