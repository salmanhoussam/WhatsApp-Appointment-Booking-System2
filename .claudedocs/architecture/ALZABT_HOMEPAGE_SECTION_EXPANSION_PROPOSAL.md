# Homepage Section Expansion — Proposal (URBANCUT Reference)

**Status: Proposal only. No code, no DB, no Contract file edited.** Analyzes the reference image
(a barber-studio landing page, "URBANCUT") section-by-section, maps each piece to what already
exists in `ALZABT_SECTION_SYSTEM_CONTRACT.md` / `ALZABT_VERTICAL_REPERTOIRE_MATRIX.md`, and proposes
only the genuinely new pieces — following the same Capability/Data-shape/Locked-vs-Customizable
discipline those documents already established, not a new methodology.

**Resolved before anything else**: any imagery used in new decorative sections is **generic/
abstract only** (textures, mood, no specific real place or person) — never a real photo of a
different real barbershop presented as if it were Mister H's own. This was your own explicit call,
not assumed.

---

## 1. Reference, Section by Section

| # | What the reference shows | Maps to | Status |
|---|---|---|---|
| 1 | Top nav: logo + Home/Services/Gallery links + "BOOK NOW" pill | Site chrome (`TenantModuleNav`), not a content section | **Not a new section** — a chrome-level enhancement, see §6 |
| 2 | Hero: bold headline, dual CTA (primary "Book Appointment" + secondary outlined "View Services"), full-bleed real photo | `hero` (exists) | **Small real gap**: current `HeroSection.jsx` only supports one CTA button |
| 3 | "Why Choose Us" — 4 icon cards (Classic & Modern / Quick Booking / Pro Stylists / Walk-ins Welcome) | **Nothing today** | **New section**, §2 |
| 4 | "Book Your Next Cut in 10 Seconds" — full-width colored banner, WhatsApp/SMS CTA buttons | `cta` (exists, but visually plain) | **Visual variant of `cta`**, §2 |
| 5 | "Find Us" — address, hours, real embedded map | `location` (exists) | **Content gap only** — needs a real `maps_url`, no code gap |
| 6 | "What Clients Say" — 3 starred quote cards | `testimonials` (exists) | **Content gap only** — needs real reviews (see §5, honesty note) |
| 7 | "Our Services" — real service action-photography as card backgrounds, "View All Services" | `featured_items` (exists) | **Content gap** — needs real per-service photos; card visual treatment could be richer once photos exist |
| 8 | "Starting from $30" price-teaser strip | — | Minor — fold into `featured_items` as an optional footer line, not worth its own section type |
| 9 | "Latest Cuts" — gallery preview grid + "View Gallery" link | `gallery` (exists) | **Small real gap** — no `limit` field or "see all" link today; gallery always renders everything inline |
| 10 | Footer — brand blurb, quick links, contact, hours, social icons | **Nothing today** | **New, site-wide component** (not a `dynamic-sections` content type), §3 |

**Headline finding**: 6 of 10 reference pieces already map to sections that exist and work today —
this is mostly a **content-completion and visual-polish problem**, not a "we need to invent a
library" problem. Only 2 genuinely new things are needed: `why_choose_us` (§2) and a site-wide
`Footer` (§3).

---

## 2. New Section — `why_choose_us`

| | |
|---|---|
| **Capability** | Communicate trust signals / value propositions before the visitor commits to booking — the same "why should I choose you" job every service business needs, framed generically (not barber-specific wording baked into the mechanism) |
| **Content needed** | A heading + 3-4 short icon+title+body items |
| **Data shape** | `heading_ar`, `items: [{icon_key, title_ar, body_ar}]` — `icon_key` maps to a small fixed set of existing Lucide icons (same pattern `serviceIconFor()` in `ReservePage.jsx` already uses — no new icon system invented) |
| **Reads live data?** | No — pure authored content, same tier as `story` |
| **Verticals & tier** | Barber: Recommended (trust-building, not load-bearing like `hero`/`featured_items`/`cta`) — proposed by analogy to the Matrix's existing reasoning for `story`, not independently re-litigated here |
| **Visual quality rule** | 3-4 items max, consistent icon treatment, no icon left without a title/body (an incomplete card is worse than fewer cards) |
| **Locked** | Grid layout, icon size/treatment | **Customizable** | `heading_ar`, each item's `icon_key`/`title_ar`/`body_ar` |

## `cta` — visual variant, not a new type

The reference's gold banner CTA and the existing plain `cta` section serve the identical
capability (drive the booking action) — per the Vertical Matrix's own established principle
("share what's proven identical, keep separate what's merely predicted to end up similar"), this
should extend `cta`'s existing data shape with an optional visual variant, not fork into a second
section type. Proposed additive field: `data.variant: "banner"` — full-width colored background
treatment when set, current plain treatment otherwise (default, zero change for any tenant not
using it).

## `gallery` — preview mode, not a new type

Proposed additive fields: `data.limit` (same convention `featured_items.limit` already
establishes) + `data.gallery_link` (optional — links to a full gallery view). When `limit` is set,
show only the first N images + a "See All" link; unset behaves exactly as today. **Whether a full,
separate `/gallery` route should exist is a real open question**, not decided here — flagged in §7.

---

## 3. New, Site-Wide Component — `Footer`

Not a `content.sections[]` entry (it's not per-vertical repertoire, every tenant gets one) —
structurally a sibling to `TenantModuleNav`, rendered once by `DynamicPage.jsx` itself, outside the
sections loop.

| Field | Real source today | Gap |
|---|---|---|
| Brand name/blurb | `Client.name_ar`, `config.content.sections[story].heading_ar` (reuse, don't duplicate authoring) | None |
| Quick links | Static (Home/Services/Gallery/Book) — same anchors the nav would use | None, once nav exists |
| Contact (phone) | `Client.whatsapp_number` (already real, already used elsewhere) | None |
| Hours | `Client.config.working_hours` (already real, per the P0.2/Mister H work this session) | None |
| Social (Instagram) | **Confirmed real**: `@mr.salon.h` on Instagram, from the reference screenshot you shared earlier this session | **Real gap**: no `instagram_url`/social-links field exists on `Client` today — would need one small additive DB field, not fabricated |

---

## 4. Recommended Homepage Order (Mister H)

Built from what's already ratified in the Vertical Matrix (`hero`/`featured_items`/`cta` = Required,
independently reasoned) plus this proposal's additions, not reinvented:

```
hero (dual-CTA)
  → featured_items (services)
  → why_choose_us              [NEW]
  → cta (variant: "banner")     [visual variant]
  → staff
  → gallery (limit + "See All") [small addition]
  → location (real map once available)
  → testimonials (stays hidden honestly until real reviews exist)
  → cta (final, plain)
Footer                          [NEW, site-wide, outside the sections loop]
```

---

## 5. Content Gaps — What's Actually Missing vs. What's a Code Gap

Being precise about which of these are real code work vs. waiting on real content, per this
project's own evidence discipline:

| Item | Real gap type |
|---|---|
| Real `maps_url` for Location | **Content** — needs the real GPS pin from you/Ali, not a code change |
| Real testimonials | **Content, and cannot be closed by writing code** — per the explicit "never invent testimonials" rule. Realistic path: the real Instagram account (@mr.salon.h, 22K likes) may already have real customer comments worth asking permission to reuse — a real option, not decided here |
| Real per-service photos for `featured_items` cards | **Content** — needs real photos uploaded (also blocked on the still-open Dashboard image-upload gap from earlier this session) |
| `instagram_url` field | **Small code gap** — one additive `Client` field, trivial once approved |
| Dual-CTA hero, `cta` banner variant, gallery `limit`, `why_choose_us` | **Real code work**, all additive/backward-compatible, none touch existing tenant rendering |

---

## 6. Nav Bar — Separate, Bigger Item, Named Not Solved Here

The reference's desktop nav (visible Home/Services/Gallery links + prominent Book Now button) is a
real, richer chrome pattern than the current `TenantModuleNav` (hamburger-first, minimal desktop
treatment). This is a legitimate future item but is **not** a `dynamic-sections` content section —
it's page chrome, same category as the Footer, and deserves its own scoped proposal rather than
being folded into this one.

---

## 7. Dashboard Editability — Locked vs. Customizable, per new/changed section

Same framework `ALZABT_SECTION_SYSTEM_CONTRACT.md` already establishes, applied to the new pieces:

| Section | System Locked | Tenant Editable | Dashboard editor exists today? |
|---|---|---|---|
| `why_choose_us` | Grid layout, icon rendering | `heading_ar`, up to 4 items' icon/title/body | **No — new editor needed** |
| `cta` banner variant | Banner layout/spacing | Existing `cta` fields (unchanged) + `variant` toggle | Partial — `cta` fields already editable in principle wherever `cta` already is (needs confirming), `variant` toggle is new |
| `gallery` limit/link | — | `limit`, `gallery_link` | **No** — same underlying gap as Gallery's existing missing upload UI (already flagged) |
| `Footer` | Layout | Nothing tenant-specific beyond fields already sourced from real Client data | **N/A** — auto-populated from existing real fields, no new editable surface needed except `instagram_url` |
| `location.maps_url` | — | The field itself | **No** — same already-flagged Location editor gap |

**This reinforces, not replaces, the standing finding from earlier this session**: the real
bottleneck isn't inventing more sections — it's that most sections (old and new) still have no
Dashboard editor at all. Adding `why_choose_us` without also building its editor just adds a
sixth thing only an engineer can update, on top of the four (Story/Gallery/Hours/Location)
already identified.

---

## 8. Component Architecture — Already Satisfied, Confirmed Not Reinvented

Every existing section type is already its own file under
`frontend/src/components/dynamic-sections/*.jsx`, registered once in `DynamicPage.jsx`'s
`SECTION_MAP` — this is already exactly the "everything is a separate component" structure you
asked for. `why_choose_us` and the `cta`/`gallery` extensions would follow the identical pattern,
not a new one.

---

## 9. Priority / Sequencing Recommendation

1. **Close the existing Dashboard-editor gaps first** (Story/Gallery/Hours/Location, already
   identified) — building more sections without fixing this compounds the same debt, per §7.
2. **`why_choose_us`** — cheapest genuinely new section (no live data, no photography dependency),
   real value, low risk.
3. **Hero dual-CTA + `cta` banner variant** — small, additive, no new data model.
4. **`Footer`** — real value, mostly assembled from data that already exists.
5. **Gallery `limit`/preview mode** — small, but raises the open "separate `/gallery` route?"
   question (§2) that's worth answering before building.
6. **Real photography for `featured_items` cards, real `maps_url`, real testimonials** — content
   work, gated on you/Ali providing the material, not sequenced by engineering effort.

## 10. Open Decisions

1. Should Gallery preview link to a real dedicated `/gallery` route, or just show more inline?
2. Is reusing real Instagram comments (with permission) an acceptable path to real testimonials?
3. Priority: close existing Dashboard-editor gaps first (recommended), or build `why_choose_us`/
   Footer first and let the editor gap grow?
4. Desktop nav bar (§6) — worth its own pass now, or deferred?

**Waiting for your direction on sequencing before any implementation begins.**
