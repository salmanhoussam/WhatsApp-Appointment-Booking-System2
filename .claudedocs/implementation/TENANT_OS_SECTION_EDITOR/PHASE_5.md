# Tenant OS Section Editor — Phase 5 (Capability Integration) — Evidence (2026-08-20)

Scope per Salman's explicit Phase 5 order (2026-08-20): Services/Staff deep-link orchestration
into `StaffTab.jsx`, no new CRUD, no new source of truth; Footer becoming a real, toggleable
Section. **Partial completion, by design** — Services/Staff done and verified; Footer stopped on,
per instruction #6 ("إذا ظهر أي mismatch بين الخطة والكود الحقيقي، توقف عنده وبلّغ عنه"), not
executed. Reported below, not silently resolved.

---

## Part A — Services / Staff orchestration (DONE)

### Pre-implementation check (real code, not assumed)

- `app/schemas/section_schemas.py`: `staff`/`featured_items` declare only meta fields
  (`heading_ar`, `limit`) — no `items`/`members` array. `staff`'s own comment: `# members[] are
  live Barber API data, not authored 'data' -- never part of this schema.` Confirmed unchanged.
- `StaffTab.jsx`: real, complete CRUD for `Barber` (Staff) and `CatalogService` (Services) —
  `GET/POST/PATCH /barbers/`, image upload, deactivate; `GET/POST/PATCH /catalog-services/`, image
  upload, `is_active` toggle, sort-order reorder. Already has its own internal "الموظفون"/"الخدمات"
  toggle (`subView` state, `StaffTab.jsx:103`).
- `GenericAdminDashboard.jsx`: `StaffTab` is a real, independent tab (`id: 'staff'`), tab identity
  is URL-synced via a single entry point, `changeTab(id)` (`basePath` computed generically for
  both real route patterns).

Conclusion (stated to Salman before executing, confirmed correct): reuse-only is not just the
design intent, it's the only structurally correct option — the Section Editor's schema has no
shape to hold item-level Service/Staff data at all.

### Implementation

- **`GenericAdminDashboard.jsx`**: `changeTab` extended to accept an optional `query` string
  (`changeTab(id, query)`) — still the single real entry point for tab changes (URL + React state
  together), not a second navigation path. Both `<SettingsTab>` call sites now pass `changeTab`
  down instead of nothing.
- **`SettingsTab.jsx`**: new `CAPABILITY_LINKS` map (`featured_items` → `staff?view=services`,
  `staff` → `staff?view=employees`) and `CapabilityLink` component — renders a real button inside
  `SectionEditorPanel` for these two section types only, calling `changeTab('staff', 'view=...')`.
  The existing `heading_ar`/`limit` scalar fields are **unchanged**, still rendered exactly as
  before, directly below the new link — no field was removed or hidden.
- **`StaffTab.jsx`**: reads `?view=services|employees` via `useSearchParams()` to set its initial
  `subView` (same pattern `SmarListingsPage`'s own `?type` filter already uses, per
  `rules/smar-tenant.md`) — its own internal toggle logic, CRUD, and API calls are **completely
  untouched**.

### Real bug found and fixed mid-implementation (not a design choice)

First test attempt used `navigate()`/`basePath` directly (bypassing `changeTab`) — the URL changed
(`/mr-h/dashboard/staff?view=services`) but the rendered tab did not, because `activeTab` React
state only updates through `changeTab`. Caught via real browser evidence (URL vs. rendered content
mismatch), not assumed correct from the URL alone. Fixed by routing the deep-link through the
existing `changeTab` single entry point instead of introducing a second one.

### Real verification — both tenants, real browser, real navigation

**mr-h**: clicked "الخدمات" (featured_items) in the section list → `CapabilityLink` button
("إدارة الخدمات ←") present → clicked it → URL became exactly
`/mr-h/dashboard/staff?view=services` → breadcrumb read "صالون مستر إتش›الموظفون" → real service
list rendered (شعر/شعر ودقن/كرياتين/دقن/تمشيط أو تسريح/حنة أو صبغة, real prices) on the "الخدمات"
sub-view, not "الموظفون". Separately, clicked "فريقنا" (staff) → "إدارة الموظفين ←" → landed on
`/mr-h/dashboard/staff?view=employees` → real staff list ("Ali") on "الموظفون". 0 console errors
both times.

**rk**: same "الخدمات" flow → `/rk/dashboard/staff?view=services` → real RK service list (شعر,
**5 USD** — a different real price than mr-h's 15 USD, confirming real per-tenant data, not a
cached/copied view). 0 console errors, identical code path, no slug branching.

**rk's real section list has no `staff` entry** — confirmed via `content.sections` (10 entries:
hero/story/story_experience/gallery/featured_items/video_story/testimonials/hours/location/cta) —
a real, pre-existing fact about RK's own homepage content, not a Phase 5 gap: RK's real Staff data
(Barber rows) exists and is fully editable via the Staff tab directly; RK's *homepage* just never
had a "فريقنا" section added to it. The Staff deep-link code is present and correct regardless
(same map entry, same component) — simply has nothing to click for `rk` today.

### Real, pre-existing bug found during this testing (NOT caused by Phase 5, NOT fixed)

Typing into `featured_items.heading_ar` (empty on mr-h) produced a real React console error:
`Warning: A component is changing an uncontrolled input to be controlled.` Investigated before
assuming anything: reproduced the *identical* error typing into Gallery's empty `gallery_link`
field, on a completely vanilla flow that never touches Phase 5's new code (no CapabilityLink, no
staff deep-link). Root cause: `SectionEditorPanel` (`SettingsTab.jsx`) has never had a
`key={section.type}` prop on its call site — confirmed via `git show a36abfc`, present since Phase
1's very first commit. Without a `key`, switching the selected section reuses the same component
instance; its `values` state (seeded once, on first mount, from whichever section was selected
first) never resets for the newly-selected section's own field set, so any field with no real
value in the *new* section renders `undefined` (uncontrolled) until typed into (defined,
controlled) — the exact transition React warns about. **Real, pre-existing, unrelated to Phase 5's
own diff — logged here as a separate finding, not fixed**, per this project's standing rule (a bug
found mid-work that predates the current phase gets named, not silently patched). No real data was
saved during either reproduction (typed only, `حفظ` never clicked).

### Acceptance, Part A — checked explicitly

- ✅ No new CRUD built for Services/Staff — `CapabilityLink` is a navigation button, nothing else.
- ✅ No new schema for `CatalogService`/`Barber` inside `content.sections` — `section_schemas.py`
  untouched for `staff`/`featured_items`.
- ✅ Section Editor → Services opens the real existing "الخدمات" editor — verified, both tenants.
- ✅ Section Editor → Staff opens the real existing "الموظفون" editor — verified on mr-h (rk has
  no staff section to click, a real pre-existing data fact, not a code gap).
- ✅ Zero `if slug === ...` — `CAPABILITY_LINKS` is a type→view map, no tenant branching anywhere.
- ✅ `StaffTab.jsx`/`CatalogService`/`Barber` CRUD not redesigned — confirmed via diff, only an
  import + one `useState` initializer changed in `StaffTab.jsx`.
- ✅ Real API requests verified, not just UI — real login tokens, real navigation, real rendered
  data (differing real prices per tenant) checked via `document.body`/snapshot content.
- ⚠️ 0 console errors — true for Phase 5's own code paths; the pre-existing `SectionEditorPanel`
  key bug above is a separate, named, unfixed finding, not part of this diff.

---

## Part B — Footer (STOPPED, not executed)

### Real conflict found, not guessed

`Footer.jsx`'s own header comment (lines 1-7, real, currently in the codebase):

> Per `ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §3: **NOT** a `content.sections[]` entry
> (not per-vertical repertoire -- every tenant gets one), rendered once by `DynamicPage.jsx` itself,
> outside the sections loop, a sibling to `TenantModuleNav`.

`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md:71-73` (quoted directly, not paraphrased):

> Not a `content.sections[]` entry (it's not per-vertical repertoire, every tenant gets one) —
> structurally a sibling to `TenantModuleNav`, rendered once by `DynamicPage.jsx` itself, outside
> the sections loop.

This is a real, already-**implemented** architectural decision (`DynamicPage.jsx:347` renders
`<Footer .../>` unconditionally, outside `SECTION_MAP`/the sections loop, on both real tenants
today) — not a stale proposal that was never acted on. Today's Phase 5 instruction ("أضف Footer
إلى SECTION_MAP / section discovery بحيث يصبح Section حقيقياً من ناحية enabled + order") directly
reverses it.

### A second, independent structural gap found (would block Footer either way)

Even setting the architecture question aside: `content_sections_repo.py`'s `set_section_enabled`
and `reorder_sections` both `raise ValueError` when the target section type isn't already present
in the tenant's stored `content.sections[]` array (`"This tenant's page has no {type} section to
update"`) — and `list_sections` only ever returns what's already stored, never synthesizes an
entry for a schema-known-but-missing type. Neither `mr-h` nor `rk` has a `footer` entry in their
real stored sections today (confirmed live, `GET /content/sections` earlier this session showed
9/10 entries, no `footer` in either). Making "Footer يظهر كـ selectable section ويمكن
enable/disable/reorder" real for both tenants would require either a real DB backfill or a new
"materialize on first touch" capability in the repository layer — genuine backend behavior change,
not pure Dashboard-side orchestration/deep-linking, and specifically the kind of thing instruction
#6 says to stop and report rather than invent past.

### What was NOT done, and why

- `footer` was **not** added to `SECTION_MAP` in `DynamicPage.jsx`.
- `footer` was **not** added to `section_schemas.py`'s `SECTION_SCHEMAS`.
- The old unconditional `<Footer .../>` render in `DynamicPage.jsx` was **not** touched.
- `Footer.jsx`'s hardcoded `QUICK_LINKS` was **not** touched (depends on Footer being
  Section-aware first — no independent path to do this piece alone without the above).

Zero risk taken on two real, financially-live production tenants' public-page footers.

### Question back to Salman

Two real options, not proposed as a recommendation, just named:

1. **Override the prior decision** — confirm Footer should become a real `content.sections[]`
   entry after all, explicitly superseding `ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md §3`
   (and accept the small, real, additive repository change needed to make first-touch
   enable/reorder work without a manual backfill).
2. **Keep the prior decision** — Footer stays a site-wide, always-on component; if some *other*
   real need prompted "Footer as a section" today, name it, so the right narrower fix can be
   scoped instead of the broad SECTION_MAP change.

Not executed either way without your explicit call.

---

## Files changed (Part A only — Part B touched nothing)

- `frontend/src/pages/generic-admin/GenericAdminDashboard.jsx` — `changeTab` gains an optional
  `query` param; both `<SettingsTab>` call sites pass `changeTab` down.
- `frontend/src/pages/generic-admin/tabs/SettingsTab.jsx` — `CAPABILITY_LINKS` map,
  `CapabilityLink` component, threaded through `SectionEditorPanel`/`SectionSettingsArea`/
  `SettingsTab`.
- `frontend/src/pages/generic-admin/tabs/StaffTab.jsx` — reads `?view=` via `useSearchParams()`
  for its initial `subView`.

No backend files changed for Part A — confirmed by design (pure frontend orchestration, zero new
routes/schema/validation needed since `StaffTab.jsx`'s real endpoints already existed).

## Result

Part A (Services/Staff) complete and verified on both tenants. Part B (Footer) stopped per a real,
evidenced architectural conflict — awaiting Salman's explicit decision before any further work.
Phase 6 not started, per standing instruction. Products/Catalog, Clients, Notifications untouched,
reserved for the separate Capability-to-Section Audit track named for after this phase.
