# Legacy `page_type`/`catalog_layout`/`font` Dependency Audit — Evidence (2026-08-20)

Read-only investigation, per `investigation-protocol.md`. No code, no DB, no commits. Requested
before executing Tenant OS Section Editor Phase 6 ("Remove Legacy Settings"), which that plan's
own §9 named as needing a real pre-removal check that was never done.

## Headline correction, upfront

My own prior finding (surfaced to Salman just before this investigation) that `footlab`/`arizona`
were unverified `sections=0` risks was **wrong in its framing**, and separately, my raw DB check
of these fields used the **wrong field path** for `page_type`. Both errors are corrected below with
real evidence — this is exactly why the gate wasn't safe to skip.

---

## Confirmed Findings

### 1. `footlab` and `arizona` are structurally exempt — not a Phase 6 risk at all

Both are registered in `frontend/src/router/tenants/index.js`'s `tenantRegistry` (confirmed: full
file read), each with its own bespoke, hand-built route tree (`footlab.routes.jsx` →
`SpatialHomePage`; `arizona.routes.jsx` → `ArizonaHomePage`/`ArizonaMenuPage`). Neither file
imports `DynamicPage.jsx` or `SECTION_MAP` anywhere. A direct grep of both tenants' real page
component trees (`frontend/src/pages/footlab/`, `frontend/src/pages/arizona/`) for
`page_type`/`catalog_layout`/`font` returned **zero matches**.

**Real browser verification** (not just code tracing): `/footlab` renders its real, distinct,
branded landing page directly ("FOOTLAB... PREMIUM SNEAKER CULTURE"), no redirect, no "coming
soon". `/arizona` redirects to `/arizona/home` and renders its real Arabic restaurant menu content
directly. Both 0 console errors.

**Conclusion**: `page_type`/`catalog_layout`/`font` are 100% irrelevant to `footlab` and `arizona`
specifically — not because the fields are dead everywhere, but because these two tenants never
reach the code that reads them.

### 2. `Client.pageType` is a real, dedicated Prisma column — separate from `Client.config.page_type`

`prisma/schema.prisma:89` — `pageType String @default("normal") @map("page_type")` — a first-class
column, not a JSON key. My first DB check read `config.get("page_type")` (the JSON blob), which is
never used for this — every real client had `None` there, which is why my first pass wrongly
suggested everyone was on the default. The corrected check (reading the real `pageType` attribute)
shows real, non-default, meaningfully-set values across multiple tenants.

`catalog_layout`/`font` are **not** dedicated columns — confirmed via the same schema grep, zero
matches — they only ever live inside the JSON `config` blob, exactly as originally assumed.

### 3. `page_type` is real, designed, load-bearing infrastructure — not legacy cruft

`frontend/src/router/DynamicTenantResolver.jsx:26-33` (the router's own authoritative comment,
not my inference):

> page_type ("showcase", "catalog", "restaurant", "store", "normal") is a config field, not a
> route segment. DynamicPage reads it and decides what to show when sections: [] (no sections
> built yet): showcase → ConfigurableHero ... catalog/restaurant/store → redirect to ./catalog ...
> normal/anything else → "coming soon" message. When sections are configured, page_type is
> ignored — sections drive the page.

This is real, matches `DynamicPage.jsx`'s actual `DefaultFallback` code exactly, and is the
**designed onboarding mechanism** for the "auto-onboarded, not-yet-built-Section-content" tenant
class (`/demo/{slug}` for any slug not in `tenantRegistry`) — not a leftover.

**Real, live, currently-active example**: `assi` (`sections=0`, not in `tenantRegistry`,
`pageType='showcase'`). Verified in a real browser: `/assi` renders a real `ConfigurableHero`-style
page ("مرحباً بكم / احجز مكانك الآن"), real Footer with a real WhatsApp number
(`+76086128`), 0 console errors. **This is a real tenant's real page depending on `page_type`
today.** Removing the field/control would regress it.

### 4. `catalog_layout` is real and load-bearing too — the earlier "zero references" claim was incomplete

A fresh grep (deliberately not reusing the earlier Section Editor plan's §9 claim from memory)
found real consumers outside the Section System renderers it checked:
`frontend/src/pages/demo/DemoCatalogPage.jsx` and `DemoPublicPage.jsx` — a **third, separate real
rendering system** (the "auto-onboarded generic demo" tenant path, `/demo/{slug}/catalog`) that the
earlier audit's grep scope (`dynamic-sections/*.jsx`, `CatalogItemCard.jsx`) never covered.
`DemoCatalogPage.jsx:445-447` genuinely branches real rendering on it:
```js
{catalogLayout === 'list'     && <ListView     items={items} accent={accent} />}
{catalogLayout === 'showcase' && <ShowcaseView items={items} accent={accent} />}
{(catalogLayout === 'grid' || !catalogLayout) && <GridView items={items} accent={accent} />}
```
This is reachable exactly via the `page_type ∈ {catalog, restaurant, store}` → redirect-to-catalog
path named in Finding 3 — the two fields are chained, not independent. **The earlier "catalog_layout
has zero real consumers" verdict was wrong** — it was scoped only to the Section System's own
renderers, not this parallel Demo system.

### 5. `font` is the one field confirmed genuinely dead

A fresh, focused grep for real consumption (`config?.font`, `tenantConfig.font`, `.font ===`)
across `frontend/src`, excluding `SettingsTab.jsx`'s own write path, returned **zero matches**
anywhere — including inside `DemoCatalogPage.jsx`/`DemoPublicPage.jsx`, which do read
`catalog_layout` but never `font`. No real column, no real Renderer branch, no chained usage found.

### 6. A real, pre-existing, unrelated bug found along the way

`SettingsTab.jsx:74-76` offers 3 real page_type choices in the Dashboard: `normal` (بسيط),
`showcase` (واجهة), `landing` (هبوط). But `DynamicPage.jsx`'s `DefaultFallback` only recognizes 4
real values total: `showcase`, `catalog`, `restaurant`, `store` — **`landing` is not one of them**.
Selecting "هبوط" produces the exact same "coming soon" result as doing nothing. `roz`
(`pageType='landing'`, a real, deliberately-set non-default value — someone really clicked this)
is real, live proof a real admin hit this exact dead-end. Not part of this audit's original scope,
named here since it surfaced directly from the same evidence; not fixed (read-only investigation).

---

## Full tenant survey (34 real `Client` rows, `sections=0` filtered against `tenantRegistry`)

| Category | Slugs | Phase 6 relevance |
|---|---|---|
| In `tenantRegistry` (bespoke routes, always exempt) | `smar`, `caracas`, `arizona`, `footlab`, `sneakers-lb`, `sneakers-beirut`, `olivello`, `moments`, `beit-al-fakhar`, `store-pilot-20260731` | None — never reach `DefaultFallback` regardless of field values |
| Not in registry, real `sections` content (≥6) | `rk`, `mr-h`, `pilot-test-20260720`, `store-pilot-test-20260727` | None — `sections.length > 0` takes priority, `page_type` ignored per DynamicTenantResolver's own comment |
| Not in registry, `sections=0`, `pageType='showcase'`, real-looking tenant | **`assi`** | **Real, currently-live dependency — verified in browser** |
| Not in registry, `sections=0`, `pageType='landing'` (dead value, real bug) | `roz` | `page_type` itself moot for it (dead value → same as default); `catalog_layout='list'`/`font='Tajawal'` are also moot since the page never gets past the generic "coming soon" state — but the *fields' mechanism* is still real elsewhere (Finding 3/4) |
| Not in registry, `sections=0`, `pageType='showcase'`, named test artifacts | `bohussein-redirecttest-1786113608`, `bohussein-test-1786114296` | Presumptively test tenants by naming convention (matches this project's own `bo-hussein` persona + timestamp-suffixed test slugs) — not individually browser-verified, named as an Unknown below |
| Not in registry, `sections=0`, `pageType='normal'` (default, no dependency) | `magic-test`, `barberlab-test`, `cafe`, `alzabt-demo`, `test-fashion`, `test-catalog-fix`, `demo-barber-a484/c57f/5513/82d5/f93b`, `tastybites`, `demo-verticalregistrytest-f87f/restaurant-6433`, `demo-phase2extractiontest-5282/0b4a/61f2` | None currently depend on a non-default value — but see "gate," below: this is about the *mechanism*, not just today's snapshot |

---

## Side Findings

- `alzabt-demo` (`sections=0`, `pageType='normal'`) is the project's own real, actively-used sales
  demo (per `CLAUDE.md`: "alzabt-demo remains demo-only") — currently on the default, not
  dependent, but worth naming since it's a real, intentional, still-referenced tenant, not a
  throwaway.
- `caracas` (in registry, `sections=8`) and `olivello` (in registry, `sections=6`) both still carry
  real `pageType`/`catalog_layout`/`font` values in `Client.config` despite being fully exempt via
  the registry — dead *data*, not dead *mechanism*, for these two specifically.

## Unknowns

- `bohussein-redirecttest-1786113608`/`bohussein-test-1786114296` were not individually
  browser-verified — classified as test tenants by naming convention only (matches this project's
  own established `bo-hussein`-persona + timestamp-suffix test-tenant pattern used elsewhere), not
  with direct evidence the way `assi`/`footlab`/`arizona` were.
- `cafe`, `assi`'s own sibling `test-fashion`/`test-catalog-fix`, and the `demo-*test*` slugs were
  not individually browser-verified beyond the config-level check — all currently show
  `pageType='normal'` (the default), so they carry no *current* dependency regardless, but this
  audit did not confirm whether any of them are real onboarded prospects vs. abandoned tests.
- Whether any tenant is *actively mid-onboarding* right now (a real prospect who will set
  `page_type` to a non-default value before their first Section gets built) is not knowable from a
  static DB snapshot — this is exactly the ongoing-use case the mechanism exists to serve.

---

## Migration/Removal Gate — evidence-based, per field

| Field | Verdict | Why |
|---|---|---|
| `font` | **Safe to remove now** | Zero real consumers found anywhere, including the previously-missed Demo rendering path. No further check needed. |
| `catalog_layout` | **NOT safe to remove as originally scoped** | Real, live consumer in `DemoCatalogPage.jsx`/`DemoPublicPage.jsx` (a rendering path the original Phase 6 audit never covered). Removing the Dashboard control would break real layout choice for any non-registry, `catalog`/`restaurant`/`store`-page_type tenant. |
| `page_type` | **NOT safe to remove** | Real, designed onboarding mechanism, confirmed via the router's own authoritative comment and one real, currently-live tenant (`assi`) actually depending on it today, verified in a real browser. |

**Phase 6, as originally scoped ("remove `page_type`/`catalog_layout`/`font` controls together"),
is not safe to execute.** Only `font` is genuinely, fully dead. `page_type` and `catalog_layout`
are real, live, designed infrastructure for a tenant class (`/demo/{slug}`, non-registry,
pre-Section-content) that the Tenant OS Section Editor plan never scoped or audited — it only ever
looked at `mr-h`/`rk`, both of which are already past this stage.

**Real, named options, not decided here:**
1. Narrow Phase 6 to `font` only — the one field with a clean, fully-evidenced removal case.
2. Leave `page_type`/`catalog_layout` alone entirely — they belong to a different, still-real
   system (the auto-onboarding/Demo path), not something Phase 6 was ever really about.
3. Separately, fix the real `landing`/`هبوط` dead-value bug (Finding 6) — unrelated to the
   removal question, a real correctness fix either way.

Not executed — read-only, per instruction. Awaiting your decision on which option (or none) to
proceed with.
