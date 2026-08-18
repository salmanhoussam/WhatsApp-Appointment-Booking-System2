# Mister H Homepage — Design Specification (Visual Language + Section Data Model)

**Status: Design Specification / Proposal. No code, no DB, no Contract file edited.** This document
converts a visual reference (a barber-studio landing page — "URBANCUT") into a binding brief for
implementation, per Salman's explicit instruction: *"نحوّل الصورة إلى Design Specification واضحة
لأبو حسين، بحيث لما تستدعيه مع الـ context ما يفسّرها على طريقته."* The reference is a **visual
system to extract grammar from**, not a screenshot to clone. Extends, and does not replace,
`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` (2026-08-18, section-by-section mapping) and
`ALZABT_MEDIA_CONTENT_FOUNDATION_PROPOSAL.md` (2026-08-18, ratified, Phase 1 implemented in commit
`29c92cc`). Neither of those documents is rewritten here — this one adds what neither covered:
**a binding Visual Language System** and **the Section-as-Data architectural gap** that must close
before Phase 2 content work starts.

**Governing rule, restated and binding (unchanged from the Media Foundation Proposal)**: no
hardcoded media URLs, no tenant-conditional code (`if slug == "mister-h"`), no per-tenant hardcoded
homepage composition. Every section is a component; every section's content — text, media,
buttons, and (new, per this document) its very presence and position on the page — is tenant data,
editable from the Dashboard with zero code/deploy.

---

## 1. Purpose

Salman's own framing, preserved verbatim as the governing intent: *"الهدف ليس أن ننسخ الصورة. الهدف
أن نأخذ منها الـ design grammar: الأسود + الذهب، الـ editorial typography، الـ low-key photography،
الـ spacing، الـ hierarchy، الـ conversion CTA، وتوزيع الصور، ثم نبنيها كـ reusable Tenant OS
system."* This document exists so that whoever executes Phase 2 (bo-hussein, or any agent it
routes to) inherits that framing directly, instead of independently re-interpreting a screenshot —
the exact failure mode this document was requested to prevent.

**This document does not decide "start Phase 2 now."** It is the design authority Phase 2 must
build against, once approved.

---

## 2. Visual Language System — binding design tokens

Not present in any prior document — this is genuinely new content.

### 2.1 Color

| Token | Role | Rule |
|---|---|---|
| Near-black | Primary background | Dominant surface, ~90% of page area |
| Off-white / warm white | Primary text | Never pure `#FFFFFF` — warm-tinted for the "premium," not "clinical," read |
| Champagne gold (existing `#D9A441`, already in use post-rebrand) | **Accent only** — buttons, borders, highlights, labels, CTA backgrounds, select icon/typography details | **Binding restraint rule**: gold is a connective accent, not a base color. If gold starts covering large surface areas outside the one intentional full-bleed CTA banner (§3.6), the page has drifted from "premium" to "flashy" — this is a design regression, not a style preference |
| Photography tone | All imagery | Dark/desaturated by art direction (§7), never competing with text for attention |

### 2.2 Typography — two-register system

| Register | Used for | Character |
|---|---|---|
| **Display** | Large headings (hero title, section headings) | Condensed, bold, tall, editorial — e.g. `CUT. TRIM. DEFINE.` |
| **Body** | Paragraphs, descriptions | Simple, smaller, readable, light letter-spacing |
| **Label** | Eyebrows (`PREMIUM GROOMING SINCE 2023`), small tags | Uppercase, small, clear letter-spacing, gold |

**Binding rule**: these three registers must be visually distinct from each other — the current
homepage's flat, single-weight typography (confirmed real gap, not assumed) does not yet make this
distinction anywhere. This is a real CSS/typography-scale gap Phase 2 must close, not a copy change.

### 2.3 Photography / Art Direction Criteria

Salman's own point, preserved because it is easy to lose in implementation: *"المشكلة ليست فقط 'جيب
صور'. الصور لازم يكون بينها art direction واحدة."* A component can be built correctly and the page
will still read as amateur if the photos disagree with each other. Binding criteria for any real
photo accepted into this homepage (services, gallery, staff, hero):

- Low-key lighting, dark backgrounds, high contrast
- Close-up / action grooming photography (not posed studio shots)
- Black/grey dominant tones, warm skin tones
- Gold accents come from the UI layer, not required from the photo itself
- **Rejection rule**: a bright white-background photo, a neon-lit photo, or an outdoor-daylight
  photo must not be accepted alongside dark low-key photos, even if individually well-composed —
  consistency across the set matters more than any single photo's quality

This is a content-acceptance criterion for whoever curates Mister H's real material (§6), not a
new code requirement.

---

## 3. Section-by-Section — additions to the existing Expansion Proposal mapping

`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §1 already maps all 10 reference pieces to
existing/new sections — not repeated here. This section adds what that document didn't cover:
composition detail inside each section, taken from a closer visual read.

### 3.1 Hero — composition, not just fields

The Expansion Proposal already flags the real gap (single-CTA today, reference has dual-CTA). This
adds the composition requirement that gap-fix alone doesn't cover: **the hero image/video is a
background/composition element, not a `<img>` dropped next to text.** Specifically:
- Subject (barber hands, scissors, etc.) weighted toward one side, not centered
- Dark gradient/overlay fades the media into the black background — never a hard edge
- Text must never sit on top of the subject's most important detail
- Component contract needed: `backgroundMedia`, `overlay`, `contentPosition`, `eyebrow`, `title`,
  `description`, `primaryCTA`, `secondaryCTA` — **all tenant-configured values**, not hardcoded
  per-tenant markup. `HeroSection.jsx`'s existing `framed_video_url` treatment (built earlier this
  session, commit `24b5d77`/`4f3984d`) is a *different, deliberate* pattern (small framed card, per
  Salman's own explicit Dribbble-driven correction) — this full-bleed composition mode is an
  **additional variant**, not a replacement of that decision. Which mode Mister H's real homepage
  uses is an Open Decision (§8), not resolved here.

### 3.2 Services (`featured_items`) — the photo is the hero of the card

Real service photography, uniform aspect-ratio crop, dark overlay gradient, name overlaid at the
bottom. **Binding rule, restated from Salman's brief**: icon+text+empty-background cards are
explicitly rejected for this section once real photos exist — the current placeholder-icon
treatment is a temporary state, not the target.

### 3.3 Why Choose Us — confirmed, no new content beyond the Expansion Proposal

Already fully specified in `ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §2. One addition: this
is explicitly the one section in this set that needs **no photography at all** — icon + title +
body only, black background. Worth stating plainly since every other section in this document
leans on real photos; this one doesn't, and shouldn't be forced to.

### 3.4 CTA (banner variant) — the intentional gold break

Confirms the Expansion Proposal's `data.variant: "banner"` proposal (§2 there). Adds the *why*:
this is the one deliberate full-bleed gold surface on the page — its purpose is to interrupt the
black dominance once, for conversion emphasis. This is the only place §2.1's "gold is accent only"
rule is intentionally suspended, and only here.

### 3.5 Location — hierarchy, not just a maps_url gap

The Expansion Proposal already flags the real `maps_url` content gap. Adds composition: information
column (small, quiet type) vs. map (large visual weight) — an explicit two-column asymmetry, not a
stacked list. Hours must keep reading from `Client.config.working_hours` (already real, unchanged).

### 3.6 Testimonials, Gallery, Footer

No new content beyond the Expansion Proposal (§1 items 6/9/10) and the Media Foundation's existing
`page_gallery` Phase 2 plan — cited, not restated.

---

## 4. The Section-as-Data Architectural Requirement — new, real gap confirmed in code

This is the most consequential part of this document and the part most likely to be silently
skipped if Phase 2 starts from the visual brief alone.

**Confirmed by reading the real code** (`frontend/src/pages/generic/normal/DynamicPage.jsx:276-278`):

```js
const sections = (tenantConfig.config?.content?.sections ?? [])
  .filter(s => s?.type)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
```

**What already exists**: each section object already carries a real `order` field, and rendering
is already fully data-driven off `content.sections[]` — the "everything is a separate component"
requirement (Salman's own words) is **already true today**, confirmed via `SECTION_MAP` in the
same file. This is not a gap.

**What does not exist**: there is no explicit `enabled` boolean anywhere in this shape. Today,
"disabling" a section means either (a) removing it from the `sections[]` array entirely (a data
operation with no Dashboard UI to do it), or (b) relying on a section component's own internal
empty-state heuristic (the P2 work this session — `LocationSection.jsx`, `StorySection.jsx` —
`return null` when content looks like a placeholder). These are two different, uncoordinated
mechanisms for "not shown," not one real `enabled` concept a Dashboard toggle could drive.

**Binding requirement for Phase 2**: before or alongside any new section (`why_choose_us`, `Footer`,
or visual variants of existing ones), the section data shape gains a real `enabled` field, and the
Dashboard (once its own settings surface reaches this) can read/write it — matching the conceptual
model Salman specified:

```
Homepage
├── Hero        { enabled, media, title, description, CTAs }
├── Services    { enabled, items[] }
├── Why Choose Us { enabled, items[] }
├── CTA         { enabled, title, actions }
├── Location    { enabled, address, hours }
├── Testimonials { enabled, items[] }
├── Gallery     { enabled, media[] }
└── Footer      { enabled, contact/social }
```

**This is the conceptual target, not a schema to implement literally today** — Salman's own
qualifier, preserved. The binding part is narrower and immediately actionable: **`enabled` as a
real field, checked at render time in `DynamicPage.jsx` alongside the existing `order` sort**, so
future Dashboard work has something real to write to instead of inventing its own ad-hoc mechanism
per section.

---

## 5. Media Binding Rule — Phase 2 gate, not a new rule

Restated because it is the one rule most likely to be silently violated by an agent optimizing for
visual speed: **no image/video for this homepage enters the codebase as an imported asset or a
hardcoded URL.** The path is:

```
Storage (Supabase, properties/{slug}/...)
  → GalleryImage row (imageType, mediaType, url)
  → Public config injection (public_service.py, per Phase 1 pattern)
  → Section component (reads from props, already tenant-data-shaped)
```

`page_hero` already works end-to-end (Phase 1, commit `29c92cc`, browser-verified). `page_gallery`
and `page_logo` are named in the ratified Media Foundation Proposal but not yet built — **any new
homepage section requiring real photography (Services cards, Gallery, Staff portraits) is blocked
on this, not on component styling.** This is a sequencing fact, not a new proposal — restated here
because it directly gates §3.2/§3.6 above.

---

## 6. Client Asset Checklist — from Salman's brief, preserved as-is

The real list to request from Mister H, unchanged from the original brief (no invention added):

| Category | Assets needed |
|---|---|
| Hero | 1 primary video (already have it, live), optional fallback image |
| Services | 1 real photo per service (~6, matching current service count) |
| Gallery | 6–12 real photos to start |
| Brand | Transparent logo, light/dark variant if available, favicon if available |
| Staff | 1 portrait per barber, if/when a Staff section is added |
| Testimonials | 3–6 real reviews — **never fabricated**, per the existing empty-state honesty rule (`.claudedocs/architecture/ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §5 already names the real Instagram-reuse option, undecided) |
| Social | Instagram URL (`@mr.salon.h`, already known), WhatsApp (already known), any others |

All must pass the §2.3 art-direction consistency criteria before acceptance — a technically fine
photo that breaks the visual set should not be used just because it exists.

---

## 7. Reconciliation with Existing Priority/Sequencing

`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §9 already recommends: close existing Dashboard-
editor gaps first, then `why_choose_us`, then Hero dual-CTA/`cta` banner variant, then `Footer`,
then Gallery preview mode, with real photography/content last (gated on material, not engineering
effort). **This document does not change that order.** It adds one precondition ahead of all of it:
§4's `enabled` field should land as part of whichever section-touching work happens first, since
every item in that sequence is exactly the kind of "section shape change" where retrofitting
`enabled` later is more expensive than including it now.

---

## 8. Open Decisions

1. Hero composition: full-bleed background-media mode (§3.1, this reference) vs. the existing
   small-framed-video-card mode (built this session, per Salman's own Dribbble-driven correction)
   — which does Mister H's real homepage use? These are not mutually exclusive as component
   capabilities, but the homepage needs one chosen default.
2. All open items already listed in `ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §10 remain open
   and are not re-litigated here (gallery route, testimonial sourcing, nav bar timing).
3. Exact shape of the `enabled` field (§4) — a boolean on each section object is the minimal form;
   whether it needs anything richer (draft/scheduled, etc.) is deliberately not decided here, since
   `rules/backend/architecture.md §10`'s Admin/Public contract split would apply once this becomes
   real Dashboard-writable data — worth a short Implementation Contract of its own when Phase 2
   actually starts, not decided in this design document.

---

## 9. What This Document Is For — explicit instruction, preserved from the brief

Salman's own closing instruction, kept verbatim as the binding summary for whoever picks up Phase 2:

> لا تبدأ بتجميل الـ components الحالية واحداً واحداً. ابدأ بتحويل الـ homepage إلى Section system
> حقيقي: حلّل الصورة كـ visual system، استخرج الـ sections الموجودة فعلياً، اعمل كل Section كـ
> component مستقل، لا تضع tenant content داخل الـ component، كل media يمر عبر Media Foundation، كل
> Section له `enabled`، كل Section له content schema واضح، كل media له DB reference، الصور الحقيقية
> تأتي من material العميل — والـ homepage تتحول من hardcoded composition إلى data-driven
> composition.

**Waiting for your review/approval before any implementation begins.** Nothing in this document
authorizes starting Phase 2 — it is the design authority Phase 2 will be executed against, once
approved.
