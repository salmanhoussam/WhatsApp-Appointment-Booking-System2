# RK Barber Shop — Tenant Verification

Copied from `tenant-verification-template.md`, this project's first real use. Real business name
found via investigation (below), not asked — confirmed **"RK Barber Shop"** (English) from the
logo watermark embedded in one of the tenant's own uploaded videos.

**Tenant:** slug `hr` (confirmed by Salman) — **WhatsApp:** `96176985477` (confirmed) —
**Date:** 2026-07-23 — **Status:** All 5 steps of Salman's onboarding order complete with real
evidence. Hero wired to real Video 3 via the existing Media Capability
(`PATCH /admin/media/hero-image`, no bypass), confirmed via direct DB read and a real headless-
Chrome render. A new `video_story` section type (named after architectural responsibility, not
content or tenant branding — Salman's explicit correction) renders Videos 1 & 2 as a video-led
narrative, not a gallery — confirmed via real DB read (10 sections, correct order) and a real
scrolled screenshot showing both videos with their real captions. This review is now closed.

## 0. Phase 0 — Tenant Discovery (real investigation, per Salman's explicit instruction)

**Correction to this section's own first draft**: an earlier version of this section stated
decisions ("build tenant-specific," "seed services explicitly") as if they were investigation
outcomes. Salman's catch: *"هيدا قرار معماري، وليس نتيجة تحقيق... التحقيق لازم ينتهي عند [الحقائق]،
وبعدين يتوقف."* Investigation stops at facts; deciding what to do about them is a separate step
(Phase 0.5, below). Rewritten to keep that seam visible.

### Confirmed

- RK Barber Shop identified (real business name, found via the logo watermark in one of its own
  uploaded videos — not asked for).
- 3 real videos uploaded to `properties/RK Barbar/` (downloaded and frame-extracted directly, not
  guessed from filenames):
  - Video 1 (24.2s, 464×832): shop entrance + interior/product-shelf pan, casual phone-shot.
  - Video 2 (13.1s, 464×832): close-up product-shelf pan (Elegance-brand sprays/gels).
  - Video 3 (18.1s, 576×1024, higher-res): wide cinematic full-shop interior shots, carries the
    real "RK Barber Shop" logo watermark throughout.
- Video 3 fits the existing Hero mechanism exactly (Sprint 2's `ReplaceMedia`/`hero.bg_image` — one
  video, autoplay background) — confirmed by reading `HeroSection.jsx`'s real `isVideo` handling.
- `GallerySection.jsx`'s real data shape is `{ heading_ar, images: [{url, caption_ar}] }` — images
  only, confirmed by reading the component directly, zero `video`/`mp4`/`isVideo` reference found.
- No existing section or Capability in this codebase handles more than one video, or non-Hero
  video, today. This is the first real case that needs it.
- Booking (`app/api/v1/admin/reservations.py`) and Catalog (`catalog.py`/`catalog_service.py`) both
  work independently and are both real, usable modules.
- `SERVICE_TYPE_MAP` (`app/core/services.py`) has no preset combining `booking` + `catalog` — every
  existing `service_type` seeds one or the other, never both.
- `ReservationsTab.jsx` (552 lines, read directly) is a table/list view with status badges
  (`pending`/`confirmed`/`arrived`/`cancelled`/`no_show`) and pagination — **not** a calendar. No
  calendar rendering of reservations exists anywhere in the admin dashboard today (an earlier draft
  of this section wrongly assumed one existed — caught and corrected before it stood as fact).

### Unknowns

- Arabic business name — no real artifact confirms one; not guessed.
- What happens to Videos 1 & 2 (see Phase 0.5, below — this is a decision, not an unknown fact, but
  listed here because it's not yet resolved).

### Phase 0.5 — Architecture Decisions (Salman, 2026-07-23)

**Decision 1 — Videos 1 & 2: tenant-specific section, confirmed.** Hero = Video 3 (the
professional one). A new section (name TBD — "Our Shop" / "Inside RK") shows Videos 1 & 2.
Salman's reasoning goes beyond the Abstraction Rule: the real question was never "how do we
display videos," it's "how does this Hero tell *this* shop's story" — beit-al-fakhar needed a
frame-sequence Hero because of *its* story; this tenant may need a different section because of
*its* story. UX and architecture agree here, not just architecture alone.

**Decision 2 — a new Tenant Type: Barbershop, confirmed — reframed from how it was first proposed.**
Salman's correction: this is not "add a `SERVICE_TYPE_MAP` key" — that's the *implementation*.
The real decision is that a new Tenant Type ("Barbershop") now exists in this platform's product
taxonomy; `SERVICE_TYPE_MAP` is merely where that decision gets executed. Recorded this way
specifically so implementation details don't end up quietly driving architecture.

**Decision 3 — Reservations calendar: explicitly REJECTED for v1, and the reasoning matters more
than the answer.** My recommendation was wrong, and Salman named exactly why: *"وجود Gap لا يعني
أن نسده"* — a Gap found during Discovery does not automatically become a Requirement. He asked for
"simple booking," full stop; Discovery separately found no calendar view exists; I incorrectly
treated "a gap exists" as "therefore build it." The real question — does the owner even need a
calendar at ~10 bookings/day, or only once volume grows toward ~80/day — was never asked. **First
version ships without a calendar. The Gap stays a named, known Gap — explicitly deferred, not
in v1 scope, not silently dropped either.**

---

## 1. What Made This Tenant Different

A real combination not previously exercised in this codebase: simple appointment **Booking** +
a service/product **Catalog** display + **WhatsApp** contact, all in one tenant, plus 3 real
uploaded videos (only 1 of which is actually a Hero problem — see §0). beit-al-fakhar was a pure
showroom/store (Catalog + WhatsApp, no Booking); this is the first tenant needing Booking and
Catalog together.

## 2. Architecture Questions Raised During the Build

| Question asked | Finding (fact only — decision lives in §0's "Decisions Required" or Phase 0.5) |
|---|---|
| Does `SERVICE_TYPE_MAP` have a preset combining `booking` + `catalog`? | No such preset exists. |
| Is the 3-video Hero Sprint 2's plain `ReplaceMedia`, or something new? | Video 3 alone fits plain `ReplaceMedia`. Videos 1 & 2 fit no existing mechanism. |
| Does a reservations calendar view already exist? | No — confirmed by reading `ReservationsTab.jsx` directly; it's a table/list. |
| Did we need to modify an existing ADR or Principle? | Not observed — everything found so far fits within existing Capability boundaries. |
| Was a file's planned location wrong, or was the Implementation Contract incomplete for this case? | Not yet observed — too early, still Phase 0. Will be re-checked once real development starts. |
| Does the Media Capability have one write path or several? | Two independent, undocumented write paths exist (`bg_image_url` via the generic Editing Engine vs. legacy `hero_video_url` for bespoke tenants only) — real finding, logged in `.claudedocs/evolution/media-capability.md` (2026-07-23 entry), not built around or silently worked past. |
| Should video segments link to categories/products (a "video-led landing page")? | Real Gap, explicitly deferred by Salman: no real category/product data exists for `hr` yet (owner adds these via Dashboard later) — building segment-CTA navigation now would be premature abstraction on a single untested case. The `video_story` section's schema carries the metadata fields (`title`/`description`/`cta`/`target_category_id`) unread, so the door stays open without the logic being built prematurely. |
| What should the new shared `SectionType` be named? | Salman's explicit correction: name it after architectural responsibility, not content or tenant branding. Rejected `our_shop` (ties a shared registry to one tenant) and `video_gallery` (implies "just a gallery," when the intent is a video leading the page's narrative). Chosen: `video_story`. |

## 3. Navigation Check (real, timed)

Per the same discipline added to every ADR-0003 migration phase — not "was the right file
technically reachable," but "how long did it actually take, for real, during this build":

- **Time to find the relevant Capability's Contract**: no dedicated time — it doesn't exist yet.
  ADR-0003's `capabilities/` folder (Phase 1) is still an empty `.gitkeep`; Phases 2-8 (which would
  populate `capabilities/media.md`) haven't executed. The Media Capability's real mechanism was
  found by 2 Explore-agent investigations grepping `app/api/v1/admin/`, `app/services/`,
  `app/repositories/` directly — real, working, but slower than a single-file lookup should be
  once Phase 5 exists.
- **Time to find the relevant Principle (if any applied)**: same situation — `principles/` is
  still empty. The relevant standing rules (Single-Source-of-Truth, Admin/Public Contract) live in
  `.claude/rules/backend/architecture.md §9-10`, found via targeted grep, not a dedicated
  principle file.
- **Any point where the old mega-doc got reached for out of habit?** Yes, honestly — and it's a
  real finding, not a personal failure, exactly per this section's own instruction: the "Media may
  need a Processing Pipeline" insight (now filed properly in
  `.claudedocs/evolution/media-capability.md`) was originally recorded inline in
  `TENANT_OS_PLAN.md §14`, and that's still where it had to be found and read from — because
  ADR-0003's migration hasn't moved that content anywhere else yet. This isn't a navigation failure
  of the new structure; it's the expected, honest state of a migration still in Phase 1 of 8. It
  will be worth re-running this exact check once Phases 2-8 execute, to confirm the new structure
  actually gets faster, not just differently organized.

## 4. Confirmed Findings

**Onboarding was first wrongly reported "succeeded" after only Client+User creation** —
`register_new_tenant()` covers Step 1 of `tenant-onboarding.md`'s own checklist only. This directly
led to adding the Completion Gate to that rule file (2026-07-23) so file-completion is never
conflated with onboarding-completion again.

**Two real, previously-latent bugs found while actually verifying the page renders** (not from
trusting `seed_page_content.py`'s success message alone):

1. `booking.json`'s own `location` section template shipped `"tags": ""` (a string) against
   `LocationSection.jsx`'s own documented contract (`tags: string[]`) — crashed the entire public
   page with a real `TypeError: (data.tags ?? []).filter is not a function`. Confirmed via a real
   headless-Chrome console capture, not guessed from behavior. `smar` (the only other real
   `booking_showcase`-shaped tenant) never exercises this section, so the bug was never caught
   before. Fixed in the template and this tenant's own copy (`"tags": []`).
2. `GenericAdminDashboard.jsx`'s Reservations tab gates on a service key literally named
   `"reservations"` — separate from `"booking"`, and **absent from `service-system.md`'s own Valid
   Service Keys table**. Seeding only `booking`/`catalog`/`whatsapp_ordering` left the Reservations
   tab and its backend route (`require_service("reservations")`) silently unreachable despite
   Booking being fully active. Confirmed real via `pilot-test-20260720`'s own active services
   (which does include `reservations`) as the reference case. Fixed: added to the `barbershop`
   preset, documented in `service-system.md`, activated for the already-created `hr` tenant.

**Real end-to-end verification performed, matching the new Completion Gate exactly:**
- `client.config.content.sections`: 8 real sections, confirmed via direct DB read (not the seed
  script's own "Success" message).
- Public page (`localhost:5173/hr`): real screenshot, Hero renders "RK Barber Shop" + real
  subtitle/CTA, no "الصفحة قيد الإعداد" text present, confirmed via `document.body.innerText`.
- Login: real `POST /auth/users/login` with the Development Tenant credentials → real 200 + JWT,
  correct `role: TENANT_ADMIN`, correct `slug: hr`.
- Dashboard (`localhost:5173/hr/dashboard`): real screenshot, sidebar shows نظرة عامة/الطلبات/
  الحجوزات/الكتالوج/الإعدادات — Reservations tab present only after fixing Finding #2 above.

**Steps 4-5 (Hero → Video 3, "Our Shop"/video_story for Videos 1 & 2) — real evidence:**

- Confirmed the 3 real video files in Supabase Storage (`RK Barbar/`) by exact byte-size match
  against the already-downloaded local copies: Video 1 = `...02.01.14.mp4` (24.16s, 5,074,013
  bytes, casual shop-tour), Video 2 = `...02.01.24.mp4` (13.07s, 2,654,497 bytes, product
  close-up), Video 3 = `...02.01.45.mp4` (18.1s, 3,779,540 bytes, professional/logo). All 3 public
  URLs verified reachable via a real HEAD request (HTTP 200, `Content-Length` matching exactly).
- Hero wiring: real `PATCH /api/v1/admin/media/hero-image` with a real `hr` TENANT_ADMIN JWT,
  `{"image_url": "<Video 3 URL>"}` → `{"success": true}`. Confirmed NOT trusting that message alone
  — a direct DB read immediately after showed `hero.data.bg_image_url` set to the exact Video 3
  URL. Used only the confirmed generic-tenant mechanism (`bg_image_url` via
  `content_sections_repo.update_section_field`) — explicitly did not touch the separate, bespoke-
  tenant-only `hero_video_url` column, per Salman's "no bypasses" instruction.
- New `video_story` SectionType added (`app/schemas/page_content.py`), new
  `VideoStorySection.jsx` component (following `HeroSection.jsx`'s video treatment and
  `GallerySection.jsx`'s RTL heading-block convention), registered in
  `frontend/src/components/dynamic-sections/index.js` and `DynamicPage.jsx`'s `SECTION_MAP`.
  `hr`'s `page_content.json` updated to 10 sections in order: hero → story → video_story(Video 1)
  → gallery → featured_items → video_story(Video 2) → testimonials → hours → location → cta —
  reseeded via `seed_page_content.py hr`, confirmed via a real DB read (exact order, exact video
  URLs, not assumed from the seed script's console output).
- Real headless-Chrome + CDP verification (fresh isolated profile, port 9337, `--remote-allow-
  origins=*`): all 3 real `<video>` elements present with the correct `src` URLs; zero console
  errors/exceptions; body text contains "RK Barber Shop", "من محلنا", "منتجاتنا"; no empty-state
  text. Real screenshots at 3 scroll positions confirm Hero plays Video 3's real footage, `video_
  story #1` shows Video 1 with caption "جولة داخل المحل" ahead of "خدماتنا", `video_story #2` shows
  Video 2 (real Elegance-brand product shelf, matching the original Phase 0 investigation's own
  description) with caption "منتجات العناية بالشعر" ahead of "ساعات العمل"/"الموقع" — exact order
  match with the DB read above.

**Environment concern raised by Salman, closed with evidence, not assumed**: `DATABASE_URL` in
`.env` points to `postgres.wefjghagwpkotrrdiqyi` — the exact same Supabase project used for every
other real DB check this whole session. `FRONTEND_URL` is unset; the `salmansaas.com` value seen in
`register_new_tenant()`'s return payload is only that env var's hardcoded fallback string for the
*returned* `dashboard_url` field, unrelated to which database the write went to. No environment
mixing occurred.

## 5. Side Findings

Real things noticed along the way that aren't the point of this review (dead code, a naming
collision, tech debt) — named as side findings explicitly, not folded into the main narrative.

## 6. Unknowns

- **Arabic business name** — still the only genuinely unresolvable-by-investigation fact. The
  video's logo watermark only confirms the English name ("RK Barber Shop"). Placeholder in use
  (`name_ar = name_en`, per Salman's explicit instruction) until the real client provides one —
  logged as Temporary Business Data in `Client.notes`, editable via the Dashboard.
- Real service list + prices — per Salman, the owner adds these via the Dashboard directly; no
  real data seeded now beyond the empty starter catalog structure.

(Videos 1 & 2's fate and the reservations-calendar decision are resolved in §0's Phase 0.5;
service-seeding is resolved in §4 above — the `barbershop` preset. Videos 1 & 2 are now built —
see §4's "Real end-to-end verification" additions below. Nothing tracked here is still open except
the Arabic name.)

## 7. Verdict — Does the Architecture Need to Change?

- [ ] No — the architecture held, as-is, for this real case.
- [x] Yes — Capability Contract(s) affected: **Media** — once ADR-0003 Phase 5 builds
  `capabilities/media.md`, it must document both real write paths (`bg_image_url` generic /
  `hero_video_url` bespoke) as two distinct mechanisms, not one — evidence:
  `.claudedocs/evolution/media-capability.md`. Also affects the future `capabilities/content.md`
  (or a new one) once `video_story` is documented as a real, shipped section type.
- [ ] Yes — ADR(s) affected: ___ (deliberately not checked — nothing has stabilized through
  multiple implementations yet; correctly logged as Evolution per Salman's own explicit decision,
  not promoted prematurely).
- [ ] Yes — Principle(s) affected: ___
- [ ] Yes — the Implementation Contract's own template/structure needs a change: ___ (not found —
  the gaps observed in §3 are Phases 2-8 not having executed yet, a known deferred state, not a
  flaw in the Contract itself).

The actual Capability Contract edit happens as its own follow-up, once ADR-0003 Phase 5 executes,
referencing this Review and the two Evolution Log entries as evidence — this document itself is
never edited afterward to reflect that fix (same immutability rule as every other Review).

**This review is closed.** Steps 4-5 of Salman's onboarding order are done with real evidence (§4).
Remaining open item across the whole tenant: the real Arabic business name (§6) — not
architecture, a pending business input from the real client.
