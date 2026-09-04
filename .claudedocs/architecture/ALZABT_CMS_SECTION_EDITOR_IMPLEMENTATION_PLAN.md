# Tenant OS Section Editor — Implementation Plan (Planning Only)

**Status: Plan for review. No code written, no commit made, no DB touched, no UI removed.**
Follows `TOS-005-cms-generic-engine.md` (Decided, all 4 phases implemented and verified) — this
plan is the next real Interface on top of that engine, not a new engine.

Every claim below is grounded in a real file read this session (paths and line references given
throughout) — never assumed. Where documentation and code disagreed, the code won; the
disagreement is named explicitly (§9).

**Reframed 2026-08-19, Salman's own correction**: this is not a Mister H feature. It is the next
real increment of the platform-wide Tenant OS Editing Engine (`TOS-002`) — a generic,
schema-driven Section Editor any current or future tenant gets identically, with zero
`if tenant === ...`/`if slug === ...` branching anywhere in it. Mister H is this work's
**acceptance tenant** (the one it's first proven against, real data, real browser), never its
scope. The acceptance test (§12) is only considered passed once it's run a second time, unmodified,
against a second real tenant (RK) — the same "second independent real case" discipline this
project's own Abstraction Rule already requires everywhere else.

## 0. The governing principle, stated once

> A Section never tells the Dashboard "I am Hero, build me a custom form." A Section declares what
> it owns — its fields, their kinds, their shape — and the Dashboard's one generic engine reads
> that declaration and renders the editor. Adding a new Section type is a schema entry, never a
> new `.jsx` editor file.

This is not a new idea — it is `TOS-005` §4.2 restated as the explicit design law it always was,
now extended with two real field kinds this plan's own analysis surfaced as missing (§8).

---

## 1. Current State Audit

### 1.1 What's real and working today (backend)

- `app/schemas/section_schemas.py` — the single source of truth for 14 real section types
  (`hero`, `story`, `staff`, `gallery`, `featured_items`, `hours`, `location`, `cta`,
  `why_choose_us`, `categories_grid`, `offers`, `testimonials`, `video_story`,
  `story_experience`). 9 of them have real scalar-field schemas; 5 (`categories_grid`, `offers`,
  `testimonials`, `video_story`, `story_experience`) have `label_ar` only, `fields: {}` —
  deliberately left unwired (TOS-005 Phase B's own scope decision, not a bug).
- `app/api/v1/admin/content.py` — `GET /content/sections` (list), `GET /content/sections/schema`
  (the schema itself), `PATCH /content/sections/{type}/enabled`, `PATCH /content/sections/reorder`,
  `PATCH /content/sections/{type}/fields` (scalar, server-validated), and the full repeatable-group
  route family (`GET/POST/PATCH/DELETE .../repeatable/{field}[/...]`, also server-validated).
- `app/services/content_service.py` — validates internally too (TOS-005 Phase D), not only at the
  route layer.
- Media: `app/api/v1/admin/media.py` — `PATCH /hero-image` (singleton replace), `POST/DELETE
  /gallery-images`, `PATCH /gallery-images/reorder` (real collection). `app/api/v1/admin/upload.py`
  — a real, generic, already-multi-context upload endpoint (`FOLDER_MAP`/`IMAGE_TYPE_MAP`:
  `catalog_item`, `page_hero`, `page_logo`, `page_story`, `page_gallery`, `page_demo`,
  `unit_cover`, `unit_gallery`, `barber`, `catalog_service`).
- `app/api/v1/admin/catalog_services.py` — real CRUD for Services (`CatalogService`): `POST`,
  `PATCH` (name_ar/name_en/description_ar/price/currency/duration_min/**is_featured**/is_active/
  sort_order/image_url). **No `DELETE` route exists** — confirmed by grep, only soft `is_active`
  toggle.
- `app/api/v1/admin/barbers.py` — real CRUD for Staff (`Barber`): `POST`, `PATCH`,
  `PATCH .../deactivate` (soft only, **no real `DELETE`**), `PATCH .../services` (assignment).

### 1.2 What's real and working today (frontend)

- `SettingsTab.jsx` — **General Settings** (name_ar/name_en/whatsapp/primary_color/QR — real,
  keep) + **old general fields** (page_type, catalog_layout, font — see §9, real dead-code
  finding) + `HeroMediaSection`/`GalleryMediaSection` (real, dedicated media Renderers, confirmed
  live in your own screenshot: "الحالي: فيديو / استبدال الملف" and "لا توجد صور بعد / إضافة صورة")
  + `SectionSettingsArea`/`SectionRow` (enable/disable, reorder, scalar-field edit, **and, since
  TOS-005 Phase D, repeatable-group edit** — confirmed live in your screenshot: the section list
  with ✓ checkboxes and ↑↓/تعديل per row) + `RepeatableGroupEditor`/`FieldInput` (the generic
  add/edit/delete/reorder engine, schema-driven).
- `StaffTab.jsx` — **a second, separate, already-mature editor** with its own الموظفون/الخدمات
  toggle: real create/edit/hide-show/reorder for both Barbers (staff) and CatalogServices
  (services), including per-item image upload (`useImageUpload`), **entirely independent of the
  Section Settings system** — it calls `/barbers/*` and `/catalog-services/*`, never
  `content_service.py`.
- `GenericAdminDashboard.jsx` — owns the real live-preview `<iframe src="/demo/{slug}">` +
  `postMessage('PREVIEW_UPDATE', ...)` bridge (`:366-375`), already wired for the 3 old general
  fields (`heroType`, `catalogLayout`, `accent`) and, separately, for `EditableRegion`'s 2 Inline
  fields (`hero.title`, `story.heading`) via `saveFieldValue` (`:395-408`).
- `DynamicPage.jsx` — the one real public Renderer, consumed both by every real visitor and by the
  live-preview iframe (same component, same `SECTION_MAP`, confirmed no drift — `TOS-002`'s own
  Admin/Public split holds). Reads `PREVIEW_UPDATE` messages at `:227-236`.

### 1.3 The one real, consequential finding this audit made

**"Services" (this plan's own mandatory example) is not one thing.** `FeaturedItemsSection.jsx`'s
`data` (`heading_ar`, `limit`) is genuinely Content Capability data, already schema-driven and
already editable via `SectionSettingsArea`. But the **items themselves** — name, description,
price, image, featured flag, enabled, order, add, delete — are **not `content.sections[]` data at
all**. They are real `CatalogService`/`CatalogItem` rows, owned by the Catalog Capability, already
fully CRUD-editable via `StaffTab.jsx`'s **already-built, already-mature** "الخدمات" sub-view.

This is not a gap. Building a second "Services item editor" inside the Section Editor would be a
real Duplicate Architecture / dual-write-path (`backend/architecture.md` §9's own named anti-
pattern) — a second Interface writing to the same `CatalogService` table through a different path
than `StaffTab.jsx` already does. **The Section Editor's real job for `featured_items` is: (a) its
own two scalar fields, already done, and (b) a real link/embed into `StaffTab.jsx`'s existing
Services view — reuse, never rebuild.** The same is true for `staff` (Staff/team members = real
`Barber` rows, same `StaffTab.jsx`, "الموظفون" sub-view).

---

## 2. UX Architecture

The screenshots you sent show the real, current UI: a flat `SectionSettingsArea` list inside the
General Settings page, each row expandable in place. Your requested UX (section list on the left,
live preview on the right, section editor below/beside it) is a **real layout change**, not a new
data layer — everything it needs (schema, enable/order/scalar/repeatable routes, the live-preview
iframe + postMessage bridge) already exists; only the arrangement and navigation model are new.

**Recommended shape**, grounded in what's already real:
- A dedicated `Homepage Sections` view (its own Dashboard nav item or a sub-tab of Settings — not
  a design decision this plan makes) replaces `SectionSettingsArea`'s current position inside the
  general Settings scroll.
- Left: the section list (reuses the existing `GET /content/sections` + enable/reorder routes,
  unchanged).
- Right: the real live-preview iframe (reuses `GenericAdminDashboard.jsx`'s existing
  `<iframe src="/demo/{slug}">`, **moved** here, not duplicated — see §5 for why a second iframe
  instance is explicitly rejected).
- Below/beside: the section editor for whichever section is selected — for most sections, this is
  the existing `RepeatableGroupEditor`/`FieldInput`/scalar-field form, **re-skinned into a fuller
  layout**, not re-architected. For `featured_items`/`staff`, this panel's "editor" is a real
  embed/link into `StaffTab.jsx`'s existing Services/Staff view (§1.3), not a new item editor.

---

## 3. Section-by-Section Field Inventory

`Editable?` = today, via the existing generic scalar/repeatable routes. `Missing` = a real, named
gap — not a request to build it here.

| Section | Field | Type | Current source | Editable? | Media? | Repeatable? | Existing route | Missing |
|---|---|---|---|---|---|---|---|---|
| **hero** | title_ar | text | `content.sections[hero].data` | ✅ (unified w/ Inline, TOS-005 A) | — | — | `PATCH .../hero/fields` | — |
| | subtitle_ar | text | same | ✅ | — | — | same | — |
| | cta_text_ar | text | same | ✅ | — | — | same | — |
| | framed_video_caption_ar | text | same | ✅ (declared, not yet surfaced in UI beyond the generic form) | — | — | same | — |
| | bg_image_url / bg_type | image/video | `GalleryImage` (`page_hero`, singleton) | ✅ | ✅ (`HeroMediaSection`) | — | `PATCH /media/hero-image` | — |
| **story** | heading_ar | text | `content.sections[story].data` | ✅ | — | — | scalar route | — |
| | body_ar | textarea | same | ✅ | — | — | same | — |
| | stats[] `{num,label}` | repeatable | same | ✅ (TOS-005 Phase D) | — | ✅ | repeatable route | — |
| | media | — | **none** — `StorySection.jsx` has no media field at all | — | ❌ real gap (no field) | — | — | Would need a new field added to the section's own `data` shape first — not just a route |
| **staff** | heading_ar | text | `content.sections[staff].data` | ✅ | — | — | scalar route | — |
| | member name/phone/description/image/hours | — | real `Barber` rows | ✅ (via `StaffTab.jsx`, NOT Section Editor) | ✅ (`useImageUpload`, `barber` context) | conceptually yes, not via repeatable route | `/barbers/*` | Real `DELETE /barbers/{id}` doesn't exist — deactivate only |
| **gallery** | heading_ar, limit, gallery_link | text/number/url | `content.sections[gallery].data` | ✅ | — | — | scalar route | — |
| | images[] `{url,caption_ar}` | collection | real `GalleryImage` rows (`page_gallery`) | ✅ (`GalleryMediaSection`) | ✅ | ✅ (dedicated Renderer, not the generic repeatable route) | `/media/gallery-images*` | — |
| **featured_items** | heading_ar, limit | text/number | `content.sections[featured_items].data` | ✅ | — | — | scalar route | — |
| | items (name/desc/price/image/featured/active/order) | — | real `CatalogService`/`CatalogItem` rows | ✅ (via `StaffTab.jsx`, NOT Section Editor) | ✅ (`catalog_service` upload context) | reorder via sort_order swap, not the generic route | `/catalog-services/*` | `is_featured` writable on backend, **not exposed in `StaffTab.jsx`'s own form** (real UI gap); no real `DELETE` |
| **hours** | heading_ar | text | `content.sections[hours].data` | ✅ | — | — | scalar route | — |
| | rows[] `{day_ar,open_ar,close_ar,closed}` | repeatable | same, but **dead** whenever `Client.config.working_hours` is set (it always wins) | ✅ (route exists) but editing it has no visible effect for RK/mr-h | — | ✅ | repeatable route | Not a code gap — a real, already-documented UX trap (`ALZABT_HOMEPAGE_SECTION_SETTINGS_CONTRACT.md` §3) |
| | working_hours (open/close) | time | `Client.config.working_hours` | ✅ (already in `SettingsTab.jsx`, general area) | — | — | `PATCH /settings` | — |
| **location** | heading_ar, para_ar, maps_url | text/textarea/url | `content.sections[location].data` | ✅ | — | — | scalar route | — |
| | tags[] | repeatable (bare string) | same | ✅ (TOS-005 Phase D) | — | ✅ | repeatable route | — |
| **cta** | text_ar, subtext_ar, button_ar, link | text/url | `content.sections[cta].data` | ✅ | — | — | scalar route | — |
| | variant | select (`plain`/`banner`/`promo-strip`) | same | ✅ | — | — | scalar route | **Confirmed real**: all 3 variants read the exact same 5 fields (`CtaSection.jsx:1-3,23-29`) — no per-variant field set exists, your caution not to assume this was worth checking but doesn't apply here |
| **why_choose_us** | heading_ar | text | `content.sections[why_choose_us].data` | ✅ | — | — | scalar route | — |
| | items[] `{icon_key,title_ar,body_ar}` | repeatable | same | ✅ (TOS-005 Phase D) | — | ✅ | repeatable route | — |
| **testimonials** | heading_ar, items[] `{text_ar,author,rating}` | — | `content.sections[testimonials].data` (real, `TestimonialsSection.jsx:2-3`) | ❌ **not wired** — `section_schemas.py` gives this section `fields: {}` on purpose (TOS-005 Phase B scope decision, real 5 sections deliberately left label-only) | — | would be, once wired | none yet | Real, scoped work: add a real schema entry (mirrors `why_choose_us` exactly) — not a new mechanism |
| **categories_grid / offers / video_story / story_experience** | — | — | real, RK-live, but `fields: {}` by the same Phase B decision | ❌ not wired | varies | varies | none yet | Same shape of gap as testimonials; `video_story`/`story_experience` are real media-heavy/bespoke (§6) and were never meant for the generic scalar form |
| **Footer** | name_ar, whatsapp_number, instagram_url, working_hours | — | **not `content.sections[]` at all** — reads `Client` fields directly, rendered unconditionally by `DynamicPage.jsx` outside the sections loop (`Footer.jsx:1-16,31-44`) | name_ar/whatsapp already editable (General Settings); **`instagram_url` has no Dashboard field anywhere** (real gap, confirmed by grep) | — | Quick Links are hardcoded (`Footer.jsx:21-25`), not data-driven at all | — | Footer is **not a selectable Section** in today's system — no `enabled`/`order`, doesn't appear in `GET /content/sections`. Treating it as one in the new UI is a real, separate decision (§9/§10) |

---

## 4. Reuse vs New Work

**Reuse existing, unchanged:**
- Section discovery/enabled/reorder routes and their Dashboard calls.
- Scalar-field route + server validation.
- Repeatable-group route family + `RepeatableGroupEditor`/`FieldInput`.
- `HeroMediaSection`/`GalleryMediaSection` and their backend routes.
- `StaffTab.jsx` in full — Services and Staff item CRUD, image upload, reorder.
- The live-preview `<iframe>` + `postMessage` bridge mechanism itself.
- General Settings fields (name/whatsapp/color/QR).

**Modify existing:**
- `SettingsTab.jsx` — extract `SectionSettingsArea` out of the general Settings scroll into its
  own view/layout (§2); the extracted component's own logic (fetch/enable/reorder/edit) does not
  change, only where it's mounted and how much screen it gets.
- The `featured_items`/`staff` section's editor panel — instead of (nothing today beyond the 2
  scalar fields), add a real, explicit link/embed to `StaffTab.jsx`'s matching sub-view.
- `StaffTab.jsx`'s Services form — expose the already-real `is_featured` checkbox (backend already
  accepts it, §1.1).

**New work (small, all built on existing mechanisms):**
- `section_schemas.py` entries for `testimonials` (and, if decided, `offers`/`categories_grid`) —
  same shape as `why_choose_us`, not a new field-kind.
- The section-selection + iframe-preview layout itself (§2) — new arrangement of existing pieces.
- A real Dashboard field for `instagram_url` (currently missing anywhere).

**Delete/deprecate old UI:**
- See §9 — `page_type`/`catalog_layout`/`font` are candidates, not decided here.

---

## 5. Preview Architecture

**Real finding, answers most of your questions directly**: the live-preview mechanism already
exists and is already correct for this purpose — `GenericAdminDashboard.jsx`'s
`<iframe src="/demo/{slug}">` renders the exact same `DynamicPage.jsx` a real visitor gets
(confirmed, `TOS-002`'s Admin/Public split — no second preview renderer exists or should be
built). It reads **live DB state** (`/demo/{slug}` hits the real public config endpoint), with a
`postMessage('PREVIEW_UPDATE', ...)` overlay patched on top for anything not yet saved
(`DynamicPage.jsx:206-236`, already wired for the 3 old fields and the 2 Inline `EditableRegion`
fields).

- **Reuse the same iframe** — one instance, moved into the new Section Editor layout, not a second
  one. Two iframes would be a real duplicate-preview-renderer risk this project has already named
  and avoided once (`TOS-002` §4.7).
- **Draft vs. live DB state**: today's mechanism is **not** a draft/publish system — `PATCH`
  requests write straight to the real `Client.config`, and the postMessage patch is a purely
  client-side visual overlay for the *current editing session*, gone on reload. This is already
  true for every existing scalar/repeatable edit (confirmed live in your screenshot: editing a
  field and clicking حفظ changes real DB state immediately, same as this session's own TOS-005
  verification). **Per your own instruction not to build a new draft/publish system unless
  proven needed — don't build one here.** The real requirement ("don't let an unsaved edit leak to
  the public") is already met differently: nothing is public until حفظ/+إضافة/etc. is clicked,
  because every mutation is already its own explicit, separate network call — there is no
  "unsaved state" sitting client-side that a second visitor could ever see.
- **Save is already per-action, not global** — a scalar field's حفظ, a repeatable item's حفظ, an
  add/delete/reorder click, each is its own real request today. This plan does not propose making
  Save "per-section" or "global" — that would be new work solving a problem the current model
  doesn't have.
- **Switching sections without saving**: since there's no draft state (previous bullet), this is
  not a real risk today — an unsaved *scalar* field's typed-but-not-saved value is simply local
  React state in `SectionRow`, discarded on unmount, same as it already behaves. Worth a real UX
  affordance (a "changes not saved" hint) but not a new persistence layer.

---

## 6. Media Architecture

Per section, using only what's real today (§3's table) — **no new media table, no new upload
mechanism**:

| Section's media | Mechanism | Status |
|---|---|---|
| Hero background | `GalleryImage` (`page_hero`, singleton) + `HeroMediaSection` | ✅ Real, reuse as-is |
| Gallery images | `GalleryImage` (`page_gallery`, collection) + `GalleryMediaSection` | ✅ Real, reuse as-is |
| Service images | `CatalogService.image_url` + `catalog_service` upload context + `StaffTab.jsx`'s own upload UI | ✅ Real, reuse as-is (via StaffTab, not the Section Editor) |
| Staff photos | `Barber.imageUrl` + `barber` upload context + `StaffTab.jsx`'s own upload UI | ✅ Real, reuse as-is |
| Story media | **No field exists** | ❌ Real gap — `page_story` upload *context* exists in `upload.py`/`useImageUpload.js`'s allow-list but has **zero real call sites anywhere** (confirmed by grep) — plumbing without a field, a UI, or a DB relation |
| Logo | Same shape as Story — `page_logo` context exists in the plumbing, zero call sites, and (already established, out of scope per your own prior decision) `Client.logo_url` isn't even a real column | ❌ Out of scope, unchanged |

---

## 7. UX Interaction Model

- **Section selection**: click a row in the left list → the editor panel below/beside loads that
  section's fields, exactly as `SectionRow`'s current expand/collapse already does, just promoted
  to a dedicated panel instead of an inline accordion.
- **Reorder (sections)**: existing ↑/↓, unchanged (`PATCH /content/sections/reorder`).
- **Visibility**: existing checkbox, unchanged (`PATCH /content/sections/{type}/enabled`).
- **Item reorder (repeatable)**: existing ↑/↓ per row, unchanged (`PATCH .../reorder`).
- **Add/remove item**: existing "+ إضافة"/"حذف" per `RepeatableGroupEditor`, unchanged. For
  `featured_items`/`staff`, "add/remove" means opening `StaffTab.jsx`'s own "+ خدمة جديدة"/"+
  موظف جديد", not a new form.
- **Media replacement**: existing per-field Renderer (`HeroMediaSection`/`GalleryMediaSection`/
  `StaffTab`'s own upload), unchanged.
- **Save/cancel**: already per-action (§5) — no global Save/Cancel exists today and this plan
  doesn't add one.
- **Unsaved changes**: no persistence risk exists (§5); a UI hint is a small, optional addition,
  not a new mechanism.

---

## 8. Generic Editor Architecture

Already real, already the right shape — this plan extends it, doesn't replace it:

```
Section Schema (app/schemas/section_schemas.py, the one real source of truth)
    ↓
GET /content/sections/schema  (the Dashboard's only path to learn field shapes — no hand-kept copy)
    ↓
Generic Section Editor  (SectionRow today, promoted to a fuller layout per §2)
    ↓
Field Renderer (FieldInput — already exactly this)
    ├── text / textarea / select / boolean / number   (scalar, done)
    ├── media       → new declared kind (§8.1 — reconciles with TOS-002 §4.5)
    ├── group       → new declared kind (§8.2 — a single nested object, not a list)
    ├── repeatable  → RepeatableGroupEditor (already exactly this)
    └── section-specific settings → mechanically identical to scalar (already exactly this,
                                     TOS-005 §4.1's own explicit point)
```

**No custom per-section renderer is proposed** except the one real, justified case: `featured_items`
and `staff`'s item-level content, which is a *link into a different, already-correct Capability's
editor* (`StaffTab.jsx`), not a custom Content-Capability renderer.

### 8.1 `kind: media` — declared in schema, upload mechanism unchanged

Salman's own correction to this plan's first draft: `media` should be a real, declared `kind` in
`section_schemas.py`, not invisible to the schema the way it is today (`hero.bg_image_url`/
`gallery.images` currently have no entry in `SECTION_SCHEMAS["hero"]["fields"]`/
`["gallery"]["fields"]` at all — the Dashboard only knows about them because `SettingsTab.jsx`
hardcodes `<HeroMediaSection>`/`<GalleryMediaSection>` next to the generic form, not because the
schema said so). **Reconciled, not contradicted**: declaring `kind: media` in the schema is a
different layer than *how* the upload happens. The schema entry says "this section has a media
field, here's its real reference (a `GalleryImage` row, singleton or collection)"; the Dashboard's
generic `MediaField` renderer reads that declaration and mounts the correct existing, unchanged
upload flow (`HeroMediaSection`'s singleton-replace pattern, or `GalleryMediaSection`'s collection
add/remove/reorder pattern) — never a third, generic upload implementation. `TOS-002` §4.5's real
point (media may need a Processing Pipeline the Interface must stay ignorant of) is fully honored:
the schema declares *that* a pipeline exists (`pipeline: "singleton"` / `"collection"`), never
*what* it does.

### 8.2 `kind: group` — a single nested object, new, not yet real anywhere

A real, useful addition for a field that is naturally one object, not a repeatable list — Salman's
own example, Hero's CTA (`{label, url}`), is the right shape for it. **Stated precisely, not
assumed**: Hero's real data model today has no `cta_link`/`cta_url` field at all —
`HeroSection.jsx:41,56` shows the CTA button navigates to a `reserveHref` *computed* by
`DynamicPage.jsx` from the tenant's active capabilities, never an authored URL. `group` as a kind
is real, small, additive schema-format work; using it to add a genuine `cta: {label, url}` field to
Hero specifically is a **separate, further decision** (does Hero's CTA target ever need to be
authored rather than computed?) — not assumed here just because the kind now exists.

---

## 9. Old Settings Cleanup — KEEP / MIGRATE / REMOVE / MERGE, grounded in code

| Setting | Real usage found | Verdict | Why |
|---|---|---|---|
| **Homepage style** (`page_type`, بسيط/واجهة/هبوط) | `DynamicPage.jsx:275,342` — `pageType` is passed into `DefaultFallback` and only affects rendering when `sections: []` (the empty-content fallback). For any tenant with real Section System content (RK, Mister H — every real tenant this plan concerns), it has **zero effect on the rendered Hero**. Its own hint text ("يتغير تصميم قسم الـ Hero") is **false for these tenants today** — confirmed by tracing `pageType`'s only other use, and finding no branch inside `HeroSection.jsx` reading it at all. | **REMOVE** (for Section-System tenants) or, at minimum, hide the misleading hint text | Real, confirmed dead-for-purpose control, not a guess |
| **Catalog display** (`catalog_layout`, شبكة/قائمة/بطاقات) | Grepped every `dynamic-sections/*.jsx` and `design-system/molecules/CatalogItemCard.jsx` — **zero references to `catalog_layout` anywhere in a real Renderer.** Only referenced in the preview-patch construction (`GenericAdminDashboard.jsx:372`) and the `PREVIEW_UPDATE` handler (`DynamicPage.jsx:234-236`), which sets `config.catalog_layout` but nothing downstream reads it. | **REMOVE** | Fully dead — writes a value nothing consumes |
| **Font** (`font`, Cairo/Tajawal/Inter) | Same grep, same result — zero real consumption anywhere. Every section's real font choice is hardcoded per-component (`'Cairo', sans-serif'` or `homepageTokens.headingFont`/`bodyFont` under the separate `homepage_theme` opt-in) — confirmed unrelated to this setting. | **REMOVE** | Fully dead |
| **Color palette** (`primary_color`) | Real and load-bearing — `accent` everywhere in every Renderer, the booking flow, the color preview swatch, `HeroMediaSection`/`Button` theming. | **KEEP** | Confirmed real, everywhere |
| **Hero settings/media** (background image/video via `HeroMediaSection`) | Real, already the correct mechanism (§1.1/§6). | **KEEP** | Already correct, not legacy |

**Real, honest limit on this section**: `page_type`/`catalog_layout`/`font` may still matter for a
different real class of tenant this plan didn't audit — a tenant on the older
`CATALOG_PAGE_TYPES`/`DefaultFallback` path with `sections: []` (no real Section System content
yet). Removing these controls globally would need confirming no such tenant currently depends on
them; this plan flags it as a real pre-removal check, not a blocker to the rest of the work.

---

## 10. Risks / Blockers

- **RESOLVED — Footer becomes a real Section, for position/visibility only, not a new content
  store.** Salman's own lean ("نعم") confirmed against the real code: the correct shape is **join
  `SECTION_MAP` + get a real `enabled`/`order` row in `content.sections[]`**, exactly like every
  other Section — but its actual *content* stays exactly where it already, correctly, lives:
  `Client.name_ar`/`whatsapp_number` (General Settings, real, unchanged) and the new
  `instagram_url` field (§3's already-named real gap). **Not** migrated into a new
  `content.sections[footer].data` block — that would duplicate a Single Source of Truth this
  session's own TOS-005 work just finished consolidating (the same anti-pattern named in `TOS-005`
  §1.1, one level up the stack). This makes Footer's own Section Editor panel a third real instance
  of §1.3's "Content-owned-by-another-capability" pattern, alongside Services/Staff — not an
  exception, a third proof of the same rule.

  **Real, concrete win this unlocks**, named explicitly, not required by this decision alone:
  `Footer.jsx`'s `QUICK_LINKS` (`:21-25`) is currently a hardcoded 3-item array
  (Home/Services/Gallery), independent of which sections are actually enabled. Once Footer is
  Section-aware, Quick Links can be generated from the real enabled-sections list instead —
  correct by construction, never silently pointing at a disabled or nonexistent section. Scoped as
  its own small Phase 1/2 item (§11), not implied to be free.
- **YELLOW — `is_featured` UI gap on Services.** Backend already supports it; `StaffTab.jsx`'s form
  doesn't expose it. Small, safe, but a real decision to schedule.
- **YELLOW — No real DELETE for Services or Staff items**, only soft deactivate/hide. If your
  request's item 13 ("حذف Service") means a real permanent delete, that's new backend work
  (a `DELETE` route + a real decision on what happens to any reservation/order history referencing
  that row) — not merely missing UI.
- **YELLOW — `testimonials` (and the other 4 label-only sections) need a real schema-entry
  decision** before they can be edited — small, but not zero, work, and not yet decided which of
  the 5 actually need it (RK uses `testimonials`/`video_story`/`story_experience` for real today;
  `categories_grid`/`offers` have no confirmed real tenant using them at all — worth checking
  before spending effort wiring an unused section type).
- **GREEN — everything else**: the generic engine, media, preview mechanism, and reuse of
  `StaffTab.jsx` are all real, working, and need no new architecture, only a new arrangement.

---

## 11. Implementation Phases (Salman's own 6-phase structure, each mapped to real files/routes)

### Phase 1 — Section Shell / Layout Manager (recommended starting phase)
The generic abstraction only: section list, enable/disable, reorder, select-a-section, identity,
the generic editor container, and the live preview joining it — **not** Services/Staff rebuilt,
**not** the new `media`/`group` kinds yet.

**Files**: `SettingsTab.jsx` — extract `SectionSettingsArea` into its own view (pure move, zero
logic change) and move the existing `<iframe>`/`postMessage` block from
`GenericAdminDashboard.jsx` alongside it, wired to section selection (scroll/highlight the
selected section in the real iframe — a small, real addition, not a new preview mechanism, §5).
**Backend**: none. **Migration**: none.
**Acceptance test**: `Dashboard → Homepage Sections` shows the exact same section list, same
enable/reorder/edit behavior as today's `Settings → إعدادات الأقسام`, plus the preview now lives
alongside it and highlights the selected section — real browser, real `GET /public/{slug}/config`
reads, zero regression, on **both** `mr-h` and `rk`, with no `if slug === ...` anywhere in the new
code.
**Rollback**: revert the move; `SectionSettingsArea`'s own logic is untouched.

### Phase 2 — Schema-Driven Field Editor
Formalize `FieldInput` into the real `FieldRenderer` switch the schema declares
(`TextField`/`TextareaField`/`SelectField`/`MediaField`/`GroupField`/`RepeatableGroupEditor`) —
adds the two new kinds from §8 (`media`, `group`) to `section_schemas.py`'s vocabulary and
`GET /content/sections/schema`'s response shape, and to the frontend's field-kind switch.
**Files**: `app/schemas/section_schemas.py` (kind vocabulary + validation for the 2 new kinds),
`SettingsTab.jsx`'s `FieldInput` (add `MediaField`/`GroupField` branches).
**Backend**: `validate_fields`/`validate_repeatable_item` extended for `media`/`group` kinds.
**Acceptance test**: existing scalar/repeatable fields render and save identically (zero
regression); a real schema entry declaring `kind: media` for `hero.bg_image_url` renders via the
*existing* `HeroMediaSection` upload flow, not a new one (§8.1) — proves the reconciliation, not
just the declaration.
**Rollback**: revert the 2 new kinds; existing kinds unaffected.

### Phase 3 — Repeatable Groups
**Already done** — `RepeatableGroupEditor` (TOS-005 Phase D) already generically serves
`story.stats`, `location.tags`, `why_choose_us.items`, and any future repeatable field, with
add/edit/delete/reorder/validation. No new work in this plan; named here only to confirm Salman's
own phase list and this session's prior work are the same thing, not two separate efforts.

### Phase 4 — Media Editor
Formalize what `HeroMediaSection`/`GalleryMediaSection` already do into the schema-declared
`MediaField` from Phase 2 — the editor itself stays ignorant of Supabase/storage details, knows
only `kind: media` + a `pipeline` hint (§8.1).
**Files**: `SettingsTab.jsx` — `MediaField` renders the correct existing component (singleton vs.
collection) based on the schema's `pipeline` value, replacing the current hardcoded
`<HeroMediaSection>`/`<GalleryMediaSection>` placement (their own internal logic: **unchanged**).
**Acceptance test**: identical upload/replace/remove/reorder behavior as today, now schema-driven
— a new tenant/section needing a singleton media field gets it from a schema entry, not a new
component file.
**Rollback**: revert to hardcoded placement (Phase 1's state).

### Phase 5 — Capability Integration (the Services/Staff/Footer orchestration)
The Section Editor becomes an **orchestrator** for content owned by other Capabilities — never a
second data store for it (§1.3, §10).
**Files**: the editor panel for `featured_items`/`staff`/`footer` renders (or deep-links to)
`StaffTab.jsx`'s existing sub-views / General Settings' existing fields, per §3/§10 — not a new
item editor for any of them.
**Backend**: `footer` joins `SECTION_MAP` + gets a real `enabled`/`order` row in
`content.sections[]` (§10's resolution) — content stays on `Client` fields, not migrated.
`Footer.jsx`'s hardcoded `QUICK_LINKS` becomes derived from the real enabled-sections list (§10's
named win, its own small commit).
**Acceptance test**: opening "Services" reaches the same real, already-working Services CRUD
(add/edit/hide/reorder/image) — one real add + one real image replace, confirmed on the public
homepage. Opening "Footer" toggles its real visibility via the same `enabled` mechanism every
other section already uses; Quick Links reflect real enabled sections after toggling one off.
**Rollback**: revert to the bare 2-field forms / always-on Footer (pre-Phase-5 state).

### Phase 6 — Remove Legacy Settings
Per §9's grounded verdicts, **after** the pre-removal check named there (no legacy
`sections: []`-fallback tenant depends on `page_type`/`catalog_layout`/`font`).
**Files**: `SettingsTab.jsx` — remove `page_type`/`catalog_layout`/`font` controls; `primary_color`
and Hero media stay, unchanged (§9).
**Backend**: none (fields can stay in `Client.config`, unwritten from the UI — no column removal
implied).
**Acceptance test**: real homepage render for `mr-h`/`rk` unchanged before/after removal, proving
the removed controls were genuinely inert, not merely believed to be.
**Rollback**: re-add the removed controls (no data was deleted).

**Also real, not yet scoped into a phase**: `is_featured` UI on Services, `testimonials`'s real
schema entry, real item `DELETE` for Services/Staff (§10's YELLOW items) — small, independent,
each its own future decision and commit, not bundled into Phases 1-6.

---

## 12. Acceptance Test (the real, end-to-end one — run twice, two tenants)

Per §0's reframing, this test is only considered passed once it has run, **unmodified**, against
**two** real tenants — `mr-h` (the acceptance tenant this plan is first proven against) and `rk`
(the second, independent confirmation that nothing here is Mister-H-specific):

```
Dashboard → Homepage Sections → Hero
  → edit title/subtitle → Save → confirm live preview updates → confirm on real public homepage
Story
  → edit heading/body → Save → confirm on public homepage
  → add a stat → reorder stats → confirm on public homepage
Gallery
  → add an image → reorder images → confirm on public homepage
Services
  → confirm the panel opens StaffTab.jsx's real Services view (not a bare 2-field form)
  → edit a service's name/price/image via that existing view
  → reorder services → confirm the new order on the public homepage
  → edit the SECTION's own heading_ar/limit via the panel's scalar form → confirm
Footer (once Phase 5 lands)
  → toggle enabled off → confirm Footer disappears from the public homepage
  → toggle back on → confirm Quick Links reflect the real enabled sections
```

**Pass condition, stated precisely**: every step above works identically on `rk`, with zero
tenant-specific code anywhere in the new Section Editor — if it does, this is a real Tenant OS
CMS. If any step needs a `slug`/`tenant` branch to work on the second tenant, that branch is
itself a finding to report, not silently patched.

---

## Verdict

- **GREEN — ready to execute now**: Phase 1 (Section Shell). Pure rearrangement of already-real,
  already-verified mechanisms — no open decision blocks it.
- **YELLOW — executable, needs small decisions first**: Phase 2 (confirm the `media`/`group` kind
  design in §8 before touching `section_schemas.py`'s vocabulary), Phase 4 (depends on Phase 2's
  `media` kind), Phase 5 (Services/Staff embed UX + Footer's `enabled` wiring — both designed,
  §10, but not yet built), Phase 6 (confirm no legacy `sections: []` tenant depends on the old
  settings first).
- **Already done**: Phase 3 (repeatable groups — TOS-005 Phase D).
- **RESOLVED, no longer RED**: Footer as a Section (§10) — join `SECTION_MAP` + `enabled`/`order`,
  content stays capability-owned.

### Recommended execution order

**Phase 1 only, to start.** Smallest, purely additive/rearranging, cleanest rollback, cheapest
acceptance test — the same "prove the smallest slice first" discipline TOS-005's A→D sequence
already used successfully. Every phase after it waits for an explicit go-ahead, one at a time,
same as TOS-005 — including re-confirming the `media`/`group` kind design in §8 before Phase 2
starts, since that's real schema-format work, not pure rearrangement.
