# RK Barber — Full End-to-End Acceptance Review

**Tenant:** `hr` (RK Barber Shop) — **Date:** 2026-07-28 — Follows `investigation-protocol.md`'s
evidence discipline and `bo-hussein.md`'s End-to-End Verification Routine. Screenshots referenced
below were captured this session via headless Chrome (real JWT injection for admin views, no
injection for the cold-visitor pass) and are saved under the session scratchpad — shown inline in
conversation, not committed to the repo, per this project's existing evidence convention.

## 0. Why This Review, Not the Store Template Pilot

Earlier the same day, a real bug was fixed in RK Barber's Catalog admin UI (services and store
products were visually flattened together because `CatalogCategory.moduleKey` — already the
correct separation mechanism — was never exposed in the category-creation form). Reviewing that
fix, Salman explicitly asked to slow down rather than move to the next roadmap item (the parked
Store Template Pilot): RK Barber is the platform's first real tenant combining Booking +
Reservations + Catalog + Store + Media + Content at once, and deserves one full session answering
a concrete question — **is this Tenant actually ready for a real client to use?** — before any new
Capability work continues. This document is that answer, built around explicit Acceptance Criteria
rather than a free-form list of observations.

## 1. Acceptance Criteria

| # | Criterion | Verdict | Evidence pointer |
|---|---|---|---|
| 1 | Visitor can discover booking naturally (no URL-guessing) | ❌ | §2.A — no working click-path from the homepage into `/reserve` anywhere |
| 2 | Visitor can complete a reservation end-to-end | ❌ | §2.A — real form submission fails with a 404 on every attempt |
| 3 | Catalog is browsable (correctly typed service vs. product) | ❌ | §2.A — real haircut services are invisible on the public site today |
| 4 | Dashboard editing feels consistent | ⚠️ | §2.B, §2.D — works but inconsistent (prompt() dialogs, unreliable tab loading) |
| 5 | No critical console/backend errors during the walkthrough | ⚠️ | §2.A/§2.B — a real 404, a real CORS-blocked request, and one unresolved stuck-loading state were all captured |
| 6 | Mobile/narrow-viewport experience is acceptable | ✅ | §2.C — public home and admin Settings both degrade gracefully on mobile |

**Net: 3 of 6 criteria fail outright, 2 are partial, 1 passes.** This tenant is **not yet ready**
for a real client to run on unassisted — see §7 for the prioritized path to close the gap.

## 2. Scope Walked

- **Phase A (cold visitor, no admin token):** `/hr` full scroll + every visible click target
  tested; `/hr/reserve` direct visit + real submission attempt; `/hr/catalog` (+ its
  "الخدمات"/"الوحدات"/"المتجر" tabs) and `/hr/store`; `/hr/cart`.
- **Phase B (admin, real JWT):** `/hr/dashboard` — Overview, Orders, Reservations (list + calendar
  toggle), Catalog (list + category-creation modal), Settings (desktop split-view + a live
  click-to-edit attempt), repeated across multiple independent fresh page loads to check
  consistency.
- **Phase C (structural/code, no browser):** dead-code greps, `feature-structure.md` scope check,
  `ReservationsWeekCalendar.jsx` import check, media write-path re-confirmation,
  `page_content.json` direct read for `story_experience`'s real current state.
- **Phase D (Capability Pass):** Content / Media / Booking / Catalog (Public, Admin, Cart) each
  given a direct per-Capability verdict — see §6.

## 3. Confirmed Findings

Numbered; each cites what was actually checked and how, per `investigation-protocol.md`. Classified
per §"Classification Method": backend write-path issues get one of `TENANT_OS.md`'s three labels
(Broken/Missing/Duplicate Architecture); frontend issues get a UX-finding label, checked against a
named Principle where relevant.

1. **Hero CTA button doesn't navigate — only scrolls.** Real click test on "احجز موعدك": URL stayed
   at `/hr`, page scrolled to the Story section. **UX finding.**
2. **Bottom CTA section's button never renders.** `s_cta.data.link` is `""` in `hr`'s real seed
   data; `CtaSection.jsx` only renders the button when `data.link` is truthy. Screenshot confirms
   only the heading text appears, no button. **UX finding, expected-shape per existing code, but
   still a real dead end for a visitor who scrolls this far.**
3. **The real booking form is completely broken — every submission fails.** `ReservePage.jsx:150`
   posts to `` `/${slug}/reservations/` `` (i.e. `/api/v1/public/hr/reservations/`), but the actual
   registered route has no slug path segment at all (`prefix="/reservations"`, tenant resolved via
   `client_slug` query param). Confirmed directly: `curl POST .../public/hr/reservations/?client_slug=hr`
   → **404**; the correct path, `curl POST .../public/reservations/?client_slug=hr` → **200**. Live
   in the browser: filled and submitted the real form as a visitor would (name/phone/date/time) →
   real error message shown ("حدث خطأ أثناء إرسال الحجز") with a console `404` captured. **UX
   finding, Critical.** This is a hard, total failure of the platform's core Booking journey for
   this tenant, and — since `ReservePage.jsx` is the shared generic booking page — very likely
   affects every other tenant using the Generic Admin Dashboard's booking flow, not just `hr` (not
   independently verified for other tenants this session — see Unknowns).
4. **No service/item selector on the real booking form**, despite the reservation data model
   clearly supporting one (`metadata.service_name`/`catalog_item_id`/`price`, proven real in the
   prior Reservations Calendar verification). Confirmed via direct DOM field enumeration on
   `/hr/reserve`: only name/phone/email/date/time/notes exist. **UX finding — borderline Missing
   Architecture** (no real Interface exists for a visitor to pick a service, even though the
   reservation write-path can carry one).
5. **RK Barber's actual haircut services are invisible on the live public homepage — replaced by
   today's newly-added store products, under the same "خدماتنا" (Our Services) heading.**
   Root-caused precisely: `DynamicPage.jsx:272-275` (mirroring `GenericAdminDashboard.jsx`'s
   identical pattern) derives **one global `moduleKey` for the whole tenant page**, prioritizing
   `store` over `catalog`. Since `hr` now has both active simultaneously (the first tenant to do
   so), `store` wins. `FeaturedItemsSection.jsx:51` then fetches items from **only the first
   category of that one moduleKey** — so the "خدماتنا" section, seeded to showcase the barbershop's
   actual services, now shows the 4 retail products (سبراي/واكس/جل/عطر) instead. Confirmed visually
   (screenshot: `أ5/أ6`) and via DOM inspection (exact product names + "أضف للسلة" cart buttons
   under the "خدماتنا" heading). **Missing Architecture** — no mechanism exists for a tenant with
   more than one simultaneously-active catalog-bearing capability; the single-`moduleKey` model was
   built assuming exactly one, and RK Barber is the first real case to break that assumption.
6. **The public Catalog page's own nav tabs ("الخدمات"/"الوحدات"/"المتجر") are non-functional.**
   Clicking "الخدمات" while store products are showing does not change the displayed content at
   all (confirmed: identical product list before/after click). Clicking "الوحدات" produces a
   **fully blank white page** (confirmed via screenshot — no error text, no content, nothing).
   **UX finding, Critical** — a real navigation dead-end and, for "الوحدات", a hard break, both
   downstream of the same single-moduleKey root cause as #5.
7. **Gallery section is invisible on the live page.** `hr`'s real seed data has `images: []`; no
   admin upload path exists for this section anywhere (already a documented `media.md` Gap, not a
   new regression). Confirmed via scroll-through screenshot — section renders `null`. **UX finding,
   Minor** (known, pre-existing gap).
8. **"Working Hours" section shows a literal "قريباً" (coming soon) placeholder** — hardcoded in
   `hr`'s real `page_content.json` (`open_ar`/`close_ar: "قريباً"`), not a rendering bug. This is
   independent of the *real*, working `Client.config.working_hours` data used by the Reservations
   Calendar — the public page's Hours section and the backend's actual enforced hours are two
   entirely separate, unsynced pieces of data for the same real-world fact. **UX finding.**
9. **"Location" section shows the same "قريباً" placeholder.** Confirmed via direct JSON read + screenshot. Pre-existing, known gap (no admin editing path for this field either).
10. **`story_experience` is currently LIVE for `hr` today — contradicting an earlier session's own
    documented claim that it had been reverted.** Direct read of `scripts/data/hr/page_content.json`
    shows `s_video_story_1.type: "story_experience"` with real chapter data (frame sequence, 4
    chapters, `cta_target` values), not the simpler `video_story` type an earlier research pass
    (and this review's own initial plan) assumed based on stale prior documentation. **Side Finding
    — a factual correction to this project's own record**, not a new bug; the section itself
    renders and its chapter CTAs (`#s_featured`, `#s_cta`) function as designed (scroll-anchors),
    though `#s_cta` targets the same non-rendering CTA button from Finding #2.
11. **The Admin Dashboard's Reservations, Orders, and Catalog tabs intermittently show
    empty/zero-results or get permanently stuck on "جاري التحميل..." (loading) despite real,
    verified backend data existing.** This was the single most time-consuming investigation of this
    review, and produced two distinct, honestly-separated findings:
    - **11a — Root-caused (Missing Architecture / silent degradation):**
      `frontend/src/hooks/useTenantConfig.js`'s own code comment explicitly documents that a
      transient `GET /{slug}/config` failure (this project's already-known, already-documented
      intermittent Supabase-pooler cold-start issue) causes the hook to fall back to
      `DEFAULT_CONFIG` (`active_services: []`). Directly observed live: one full dashboard load
      rendered with the generic fallback name "لوحة التحكم" instead of "RK Barber Shop", the
      "الحجوزات" (Reservations) nav item missing entirely, and the module badge reading "CATALOG"
      instead of "STORE" — exactly `DEFAULT_CONFIG`'s shape. Because `GenericAdminDashboard.jsx`
      derives `moduleKey` from this same config and passes it down as a prop, every tab whose data
      fetch is gated by `moduleKey` (Orders, Catalog's store-aware behavior) silently no-ops for
      the rest of that session — with **no visible error to the tenant admin and no automatic
      recovery** short of a full page reload. This is a real, previously-undocumented consequence
      of an already-known root cause — **Missing Architecture** (no detection/recovery/user-facing
      signal exists for "this session's config silently degraded to defaults").
    - **11b — Confirmed, root cause NOT fully pinned (Unknown):** Independently of 11a, the Catalog
      tab was observed stuck on "جاري التحميل..." **permanently, 3 out of 3 times**, in clean,
      isolated, freshly-restarted-browser sessions where the config *had* resolved correctly
      (`moduleKey` correctly showed "STORE", "الحجوزات" was present). Direct Network-domain
      inspection during one of these runs confirmed the underlying `catalog/categories` and
      `catalog/items` requests **did complete with 200 OK** and real data — yet the component never
      rendered it. Ruled out during investigation: backend health (confirmed `/health` OK every
      time), the data itself (confirmed present via direct `curl` every time), JWT expiry (retested
      with a freshly-issued token, same result). Not conclusively pinned to an exact line — a
      plausible but unproven hypothesis is that `CatalogTab.jsx`'s `loadCategories`/`loadItems`
      lack the `mountedRef` guard pattern present in sibling tabs (`OrdersTab.jsx`,
      `ReservationsTab.jsx`, both of which carry an explicit comment referencing a past StrictMode
      double-invoke bug) — reported as a hypothesis, not a proven root cause, per this project's
      own "never state a stronger conclusion than the evidence supports" rule.
    - A related, real (though separately-caused) console error was also captured during this
      investigation: a request to `/api/v1/admin/reservations` (no trailing slash) triggers a 307
      redirect to `/reservations/`; on at least one occasion the browser reported this exact
      request as CORS-blocked. Direct `curl` reproduction of both the redirect and its target
      showed correct `access-control-allow-origin` headers on both hops in isolation, so this
      specific error is most plausibly another manifestation of the same known intermittent
      backend flakiness (a transient 500 skips FastAPI/Starlette's CORS header injection on the
      error response, which the browser then reports as a CORS failure rather than surfacing the
      real 500) rather than a distinct, separately-caused bug — logged as a **Side Finding**, not a
      fourth independent Confirmed Finding.
12. **Dead code, confirmed via `grep`:** `frontend/src/pages/generic-admin/components/KanbanBoard.jsx`
    (464 lines, a fully-built dnd-kit order-status board) has zero real imports anywhere.
    `GenericAdminDashboard.jsx`'s own `ComingSoonTab` (line 151) is defined but never rendered in
    that file — confirmed distinct from `SmarAdminDashboard.jsx`'s own, actually-used,
    differently-signatured component of the same name. **Side Finding.**
13. **Two independent write paths for "the tenant's hero media" still both exist**, exactly as
    `.claudedocs/evolution/media-capability.md` already documents: `PATCH /admin/media/hero-image`
    (the real Editing-Engine path, confirmed at `app/api/v1/admin/media.py:39`) vs. `upload.py`'s
    `page_hero_video` context (confirmed at `app/api/v1/admin/upload.py:100-103`, writes directly to
    `Client.hero_video_url`, bypassing the Media Capability's service entirely) — and
    `SettingsTab.jsx:52` still uses this second, bespoke-only path for its "فيديو الصفحة الرئيسية"
    field. **Duplicate Architecture** — the cleanest fit of any finding in this review against the
    three-label taxonomy. Tracing `hr`'s real data: its actual live Hero background is set via
    `page_content.json`'s own `s_hero.data.bg_image_url` field (populated through the *first*,
    correct Editing-Engine path per that file's own meta note), meaning `SettingsTab`'s video-upload
    field writes to a `Client.hero_video_url` column that does not appear to be what actually
    renders for this tenant — a tenant admin using that Settings field today would very plausibly
    see no visible change on their real public page. This reasoning was not empirically executed
    (no real file was uploaded through that field this session — see Unknowns), but it is
    reasoned directly and precisely from the real code and real seed data, not speculation.
    **This satisfies `media-capability.md`'s own explicit Escalation Watch criterion (c) — "reveals
    a real bug caused by the two paths disagreeing" — for the first time since that entry was
    written; recommend escalating per that entry's own stated instruction (a real Architecture
    Review or ADR), rather than adding a fourth Evolution entry.**
14. **Content editing for the two real Engine-editable fields (`hero.title`, `story.heading`) uses
    a raw browser `window.prompt()` dialog, confirmed directly in source**
    (`GenericAdminDashboard.jsx:318`, `window.prompt(field.promptLabel, currentValue)`). By
    contrast, the Media Capability's own equivalent (`field.type === 'image'`) correctly opens a
    real file picker (line 310) — matching direct-manipulation intent. **P-004
    (`Direct Manipulation, Not Forms`) Principle violation** — specifically and only for the
    text-field path, not the image path. Notable precisely because Content is the one Capability
    already marked **Stable** in `capabilities/content.md` — this is a real interaction-quality gap
    on the platform's most mature Capability, not an expected rough edge on something still
    Developing. (A live click-triggered reproduction was attempted but did not successfully trigger
    the dialog in this session's automation — see Unknowns; the finding itself rests on the cited
    source code, which is unambiguous.)
15. **Settings tab degrades gracefully on mobile** — confirmed via a real 390×844 viewport
    screenshot: the live-iframe-preview/click-to-edit split view (desktop-only by design) is
    replaced by a clean, fully functional single-column form. No layout breakage, no crash. **Not a
    finding against the product** — recorded because the plan explicitly asked this be checked, not
    assumed.
16. **`feature-structure.md`'s hooks-layer mandate does not clearly extend to the shared
    `generic-admin/` dashboard.** Direct read of the rule file confirms its scope is the per-tenant
    `frontend/src/pages/{slug}/` folder structure (which explicitly includes `{slug}/admin/` as one
    of its own sibling folders) — `generic-admin/` is a separate, cross-tenant shared component, not
    a `{slug}/` folder. Classifying the admin tabs' inline `adminApi` calls (no hooks/service layer,
    unlike the public-facing side's real `hooks/useCatalog.js` → `services/catalogApi.js` pattern)
    as a rule violation would over-read the rule's stated scope. **Reclassified from the plan's
    tentative "possible Broken Architecture" to a UX/consistency observation** — a real asymmetry
    worth someone deciding on, but not a confirmed rule breach.
17. **`ReservationsWeekCalendar.jsx` imports `StatusBadge`/`StatusCell` directly from
    `ReservationsTab.jsx`** — confirmed via direct import-line read. A real coupling smell (a "tab"
    file being treated as a shared module) — **Side Finding**, not a data-integrity issue.
18. **Duplicated, independently-implemented skeleton-loading styles** across `OrdersTab.jsx`,
    `ReservationsTab.jsx`, `ActivityFeed.jsx`, `TopItemsWidget.jsx` (each its own hand-rolled
    `@keyframes`), while `CatalogTab.jsx` has no skeleton at all (plain "جاري التحميل..." text) —
    confirmed via code read in an earlier pass this session, visually consistent with this
    session's own screenshots. **Side Finding.**
19. **Today's own `moduleKey` type selector (added earlier this same session) offers only 2 of the
    4 types its own badge-color map (`MODULE_KEY_META`) defines.** Confirmed directly by opening the
    real category-creation modal in the Admin Catalog tab: the `<select>` lists exactly `catalog`
    and `store` (`السلع منها... عام / خدمات`, `متجر — منتجات حقيقية للبيع`); `booking` and
    `restaurant` — both present in `MODULE_KEY_META`'s color/label map — can never actually be
    chosen through this UI. **UX/functional gap** — an incompleteness of a very recent fix, not a
    regression from anything older; expected shape for `catalog.md`'s "Developing" maturity rating,
    named explicitly here rather than left implicit since this review's own plan called for
    checking it directly.

## 4. Side Findings

- The known, already-documented intermittent Supabase-pooler cold-start flakiness recurred multiple
  times this session (confirmed each time via a quick `/health` retry, consistent with this
  project's established handling) — not logged as a fresh issue, but this review is the first to
  trace its **downstream blast radius** through `useTenantConfig.js`'s fallback (Finding #11a).
- Dead code: `KanbanBoard.jsx`, `GenericAdminDashboard.jsx`'s own unused `ComingSoonTab` (#12).
- Duplicated skeleton-loading and icon-SVG implementations across admin tabs (#18, and icon
  duplication noted in an earlier research pass this session, not independently re-verified here).
- `ReservationsWeekCalendar.jsx` importing from a sibling "tab" file rather than a shared module
  (#17).
- This review's own testing harness accumulated 20 open headless-Chrome tabs partway through,
  which was suspected as a possible contributor to some of the flakiness investigated in Finding
  #11 — a fresh browser instance was started and used to re-confirm every load-bearing finding
  above, so no reported finding rests on evidence from the degraded-tooling state.

## 5. Unknowns

- Whether `ReservePage.jsx`'s wrong-API-path bug (#3) affects other Generic-Admin-Dashboard
  tenants beyond `hr` — very likely given it's shared code, but not independently tested this
  session (out of this review's `hr`-specific scope).
- The exact root cause of Finding #11b (Catalog tab's permanent stuck-loading state despite
  confirmed 200 OK responses) — a plausible hypothesis is offered, not a proven line-level cause.
- Whether uploading a real video through `SettingsTab`'s legacy hero-video field genuinely has zero
  visible effect on `hr`'s live Hero (Finding #13's escalation claim) — reasoned precisely from real
  code and real seed data, but not empirically executed with a real file upload this session.
- A live, click-triggered reproduction of the `window.prompt()` dialog (Finding #14) did not
  succeed in this session's headless-Chrome automation (most likely a target-element mismatch
  against an animated Hero title, not evidence the dialog doesn't fire) — the finding itself is not
  weakened, since it rests on unambiguous source code, but the *interactive* reproduction specifically
  remains unconfirmed live.
- Real UI-driven Cart add-to-cart/checkout (clicking through the actual page, not calling the API
  directly) was not independently re-walked this session — the underlying API path was already
  proven end-to-end in `rk-barber-store-products-verification.md`, and this review's own Phase A
  visit to `/hr/catalog` confirmed the "أضف للسلة" buttons render and are clickable, but a full
  click-through to a completed checkout was not repeated here.

## 6. Capability Pass

| Capability | Verdict | Basis |
|---|---|---|
| **Content** | Working, with a real interaction-quality gap | The 2 real Engine-editable fields (hero.title, story.heading) genuinely work end-to-end (Admin write → Public reflects it — the whole point of the Editing Engine's real proof) and have exactly one Service/Contract (`content_service.py`, no duplicate path found). But the edit *interaction* itself (Finding #14) is a raw `window.prompt()`, a confirmed P-004 violation on a Stable-maturity Capability. |
| **Media** | Working for its one real path; carries an unresolved architectural risk | Hero image replace (file-picker based, Finding #14's contrast case) genuinely matches direct-manipulation intent and works. But Finding #13's Duplicate Architecture (two independent hero-media write paths) is real, confirmed still present, and — per code+data tracing — plausibly already producing a silent, real disagreement for `hr` specifically. Escalation recommended. |
| **Booking** | Broken, end-to-end, Critical | Does not start from the public page (no working click-path in, Finding #1/#2/#6) and does not end in a successful reservation either (Finding #3's confirmed 404 on every real submission). Both halves of "does the journey work" fail independently — this is not one bug, it's two, compounding. |
| **Catalog — Public** | Not working correctly for this (first) multi-moduleKey tenant | Browsable in the narrow sense (products render, are clickable), but the tenant's actual core service listing is invisible (Finding #5), the page's own nav tabs are decorative-to-broken (Finding #6). A real regression introduced by combining Catalog+Store for the first time, not a pre-existing gap. |
| **Catalog — Admin** | Backend solid, UI unreliable | Every backend read/write confirmed correct via direct API calls throughout this review. The Dashboard's own rendering of that data is where it breaks (Finding #11), intermittently but repeatedly, undermining the tenant admin's ability to trust their own tools. |
| **Catalog — Cart** | Presumed working, partially re-verified | Full API-level Cart+Checkout was already proven in the prior verification review; this session re-confirmed the Add-to-Cart buttons render and are clickable on the real public Catalog page, but did not repeat a full UI-driven checkout click-through (see Unknowns). |

## 7. Prioritized Punch List

**Ordered by impact on the customer, not ease of fix**, per Salman's explicit instruction:

1. **Fix the real booking form's 404 (#3).** Every single real booking attempt through the actual
   product fails today. This is the platform's core value proposition for a `services`-type tenant,
   completely broken, and — per Unknowns — very possibly not unique to `hr`.
2. **Restore visibility of RK Barber's real services on the public site (#5, #6).** The tenant's
   actual haircut offerings are currently invisible, hidden by a single-moduleKey assumption that
   RK Barber is the first tenant to break. A real client cannot sell what customers can't find.
3. **Replace `window.prompt()`-based content editing with a real inline field (#14).** Works
   today, but it visibly and specifically breaks the "no forms, direct manipulation" promise this
   whole platform is built around — on the one Capability already declared Stable.
4. **Give the homepage a real, working click-path into booking (#1, #2).** Even after #1 is fixed,
   a visitor still has no way to discover booking without already knowing the `/reserve` URL.
5. **Investigate and fix the Admin Dashboard's unreliable tab-loading (#11a, #11b).** Doesn't block
   a real customer directly, but repeatedly undermines the tenant admin's own confidence in the
   tool they're expected to run their business through daily.

**Genuinely minor / defer:** dead code (#12), duplicated skeleton/icon styles (#18), the
`feature-structure.md` scope question (#16, reclassified as an open question rather than a
violation), `ReservationsWeekCalendar`'s cross-file import (#17), Gallery/Hours/Location
placeholders (#7, #8, #9 — expected pre-launch content gaps, not code defects), `story_experience`'s
current live status (#10 — a documentation correction, not a bug), Settings' mobile degradation
(#15 — working as intended), today's own module-key selector only offering 2 of 4 types (#19 — a
quick, self-contained follow-up whenever the Catalog tab is next touched).

## 8. Recommendation vs Decision vs Execution

- **Recommendation:** Close items 1-4 of §7's Prioritized Punch List before this tenant is
  considered client-ready, and before the Store Template Pilot resumes — in that order, since #1
  and #2 are both complete failures of core, customer-facing journeys, while #3 and #4 compound
  them. Separately, escalate Finding #13 (the hero-media Duplicate Architecture) per
  `media-capability.md`'s own stated Escalation Watch criteria, independent of this punch list's
  ordering. Investigate Finding #11's Admin Dashboard reliability issue as its own follow-up, since
  its root cause (§11a) is understood but its fix (a visible error state + retry affordance for a
  degraded config, at minimum) has not been designed.
- **Decision:** Pending Salman's review of this document — not self-approved here.
- **Execution:** None. Per this review's explicit scope (Salman's own instruction), nothing found
  above was fixed during this session — this document is the report, not the patch.

## Related

- `.claudedocs/evolution/catalog-module-taxonomy.md` — written as this session's Step Zero,
  the `moduleKey`-as-a-growing-string watch-point Salman flagged separately from this review.
- `.claudedocs/reviews/rk-barber-store-products-verification.md`,
  `rk-barber-reservations-calendar-verification.md`, `rk-barbar-story-experience-verification.md`,
  `rk-barbar-verification.md` — prior real work on this tenant that this review re-confirms (and,
  for Finding #10, corrects) rather than repeats.
- `.claudedocs/evolution/media-capability.md` — this review's Finding #13 is the escalation trigger
  that entry's own Escalation Watch section anticipated.
- `.claudedocs/architecture/principles/P-004-direct-manipulation.md` — the Principle Finding #14
  is checked against.
- `.claudedocs/architecture/capabilities/{content,media,catalog,orders}.md` — the Capability
  Contract files whose Maturity ratings this review's Capability Pass (§6) is measured against.
