# Alzabt Landing Page — Premium Redesign (reference-image brief)

Follows: `service-execution-constitution.md` (evidence discipline), `investigation-protocol.md`
(Confirmed/Side Findings/Unknowns).

## Request

Salman attached two reference images (a premium dark-SaaS Alzabt mockup, and a second image that
turned out to be the literal AI prompt/asset-recipe used to generate the first one) and asked for a
full visual redesign of `/alzabt` in that direction: premium dark SaaS, violet accent, RTL-first,
laptop+phone hero mockup, 4-5 strong feature sections (not a long feature list), a strong WhatsApp
section, a trust section with no fabricated numbers, a strong closing CTA, mobile-first responsive.
His own brief included an explicit "Section 12" rule: don't fake missing assets — name exactly
what's missing, in a fixed template, if any real asset can't be produced in this environment.

## Investigation before building

Read both reference images directly. The second one is itself a documentation artifact — a
"PROMPT for Alzabt page" sheet listing 8 required asset files (`hero-dashboard.png`,
`hero-mobile.png`, `barber-chair.png`, `calendar-3d.png`, `whatsapp-3d.png`, `chart-3d.png`,
`scissors-comb.png`, `logo-alzabt.png`), their intended dimensions, and an explicit note: "لا
تستخدم صوراً حقيقية (screenshots) — استخدم عناصر رسوم توضيحية ثلاثية الأبعاد" (don't use real
screenshots — use 3D-illustration elements). Confirmed via an Explore pass that none of these
assets, nor any laptop/phone-mockup component, nor any chat-bubble component, exist anywhere in
this repo (`.claudedocs/work/alzabt-landing-premium-redesign/` — see the Explore report folded into
this task's chat transcript). No image-generation tool is available in this environment (checked
the full tool list; the untracked `.claude/skills/higgsfield-*` skills are explicitly excluded from
this project's committed skill set per `CLAUDE.md`'s own note, so not used here).

## What was built

Full rewrite of `frontend/src/pages/alzabt/AlzabtLandingPage.jsx` (structure, not the brand palette
— Violet Confidence itself is unchanged):

1. **`LogoMark`** — a small CSS/SVG mark (violet-gradient rounded square + a `CalendarCheck2`
   Lucide icon) added to the nav next to the existing "عالزبط" wordmark. Substitutes for
   `logo-alzabt.png`.
2. **Two-column hero** (RTL-mirrored: copy on the right, product visual on the left) replacing the
   old centered-hero pattern. Headline "كل حجز، بوقته. كل زبون، راضي." (adapted from the reference's
   own suggested copy, kept in this file's existing colloquial-Lebanese register — "زبون" not
   MSA "عميل", matching `اختر الخدمة`/`زبونك` elsewhere in the file). A 4-badge grid (smart
   booking / staff management / WhatsApp booking / clear reports) under the CTA row, matching the
   reference's own hero badge row almost exactly, each claim checked against something this
   product actually does (booking-conflict prevention = the real DB-level unique index from Phase
   C; WhatsApp booking = Phase B/C; staff/permissions = the real STAFF role).
3. **`LaptopMockup`/`PhoneMockup`** — pure-CSS device bezels (no image assets) wrapping the two
   REAL screenshots already captured for this project (`dashboard.png`, `booking-page.png`),
   floating/overlapping with a violet glow blob behind them. Substitutes for `hero-dashboard.png` +
   `hero-mobile.png` — and arguably improves on them: the reference's own hero images are generic
   AI-rendered mockup UI, these are Alzabt's real, working product.
4. **4 feature cards** (WhatsApp / smart calendar / staff & services / reports) — replaces the old
   `OFFERINGS` (4 text cards) and `BENEFITS` (bullet list) sections, which were redundant with this
   richer treatment. Each card has a real CSS/SVG illustration built from scratch: a chat-bubble
   mockup (WhatsApp), a mini calendar grid + checkmark badge (calendar), overlapping avatar
   initials + service-name chips (staff), a bar chart + trend arrow (reports). These substitute for
   `whatsapp-3d.png` / `calendar-3d.png` / `barber-chair.png` + `scissors-comb.png` / `chart-3d.png`
   — see Unknowns below for why they're CSS, not literal 3D renders.
5. **Roadmap pill strip** — the Barber-first / online-shop-add-on / future-verticals content from
   the previous task, condensed from 3 large cards into a single compact pill row so it doesn't
   compete with the new feature cards for visual weight.
6. **Trust pillars** — 4 generic, supportable claims (security, support, continuous updates, ease
   of use) — no invented customer counts, reviews, or logos, per the brief's own explicit rule
   (the reference image's "+200 محل" / avatar-stack customer claim was deliberately NOT copied —
   this project has no real number to support it).
7. **Closing CTA** — restyled to match the hero's glow-wash treatment, same real `tryDemo` handler,
   copy "جاهز تضبط شغلك؟" per the reference's own direction.

The 3-step proof section (`STEPS`) was kept as-is — already solid, already accurate to the real
booking flow.

## Confirmed Findings

1. **Real browser pass, desktop** (`/alzabt`): 0 console errors/warnings, both real screenshots
   load (`GET /assets/alzabt/dashboard.png` → 200, `GET /assets/alzabt/booking-page.png` → 200),
   headline/WhatsApp-card/roadmap-strip copy all present in the real DOM.
2. **Real mobile check** (390×844): `scrollWidth === clientWidth` (375 = 375) — no horizontal
   overflow. Hero stacks to text-then-visual single column; device mockup scales down via a
   targeted `@media (max-width: 720px)` rule shrinking the phone mockup and its float offset so it
   doesn't spill past the laptop at narrow widths.
3. **Real tablet check** (820×1180): no overflow (805 = 805). Feature-card grid wraps 3-then-1 at
   this width (`auto-fit, minmax(240px, 1fr)`) — a normal, acceptable responsive-grid wrap, not a
   bug.
4. Visually compared the final desktop screenshot against both reference images side by side:
   same dark-violet-glow visual language, same two-column hero composition (mirrored for RTL), same
   device-mockup-plus-floating-phone hero treatment, same 4-card feature-grid density, same pill-
   badge trust strip idea — translated into this product's own real content and real screenshots,
   not a literal copy of the reference's text or exact layout measurements.

## Side Findings

- None beyond what's already logged as Unknowns below.

## Unknowns / explicitly flagged per the brief's own "Section 12" rule

**Missing assets — none were faked; every visual in the shipped page is real code (CSS/SVG/Lucide
icons + the two real product screenshots), not a placeholder that pretends to be a finished asset.**
If Salman wants to commission the literal 3D-illustration renders the reference images show, here
is the exact spec for each, so they can be dropped in as a straight `<img>` swap later:

| Asset name | Purpose | Dimensions | Format | Transparent bg | Visual description | Where it appears today (CSS substitute) |
|---|---|---|---|---|---|---|
| `whatsapp-3d.png` | WhatsApp card illustration | ~800×800px, square | PNG | Yes | 3D-style WhatsApp bubble/phone icon, violet-and-green lit | Feature card 1 — currently a CSS chat-bubble mockup |
| `calendar-3d.png` | Smart-calendar card illustration | ~800×800px, square | PNG | Yes | 3D desk calendar with a glowing violet checkmark badge | Feature card 2 — currently a CSS mini calendar grid + checkmark |
| `barber-chair.png` + `scissors-comb.png` | Staff/services card illustration | ~800×800px each, square | PNG | Yes | 3D barber chair; 3D scissors+comb | Feature card 3 — currently overlapping avatar initials + service chips |
| `chart-3d.png` | Reports card illustration | ~800×800px, square | PNG | Yes | 3D bar chart with an upward violet arrow | Feature card 4 — currently a CSS bar chart + trend-arrow icon |
| `logo-alzabt.png` | Nav wordmark icon | ~256×256px, square | PNG/SVG | Yes | Violet-gradient "A" or abstract booking-confirmed mark | Nav — currently a CSS gradient square + `CalendarCheck2` icon |

The hero's own `hero-dashboard.png`/`hero-mobile.png` were deliberately **not** treated as missing
— real RK screenshots framed in CSS laptop/phone bezels were used instead, which the brief's own
Section 4 explicitly prefers ("Use realistic UI mockups based on the existing Alzabt product where
possible... Prefer laptop/desktop dashboard mockup, mobile booking experience").

**One thing worth Salman's explicit awareness, not a blocker**: the hero's laptop-mockup screenshot
shows RK Barber Shop's real name (visible in the dashboard's header/breadcrumb). RK is this
project's own reference/pilot tenant, not an unrelated third party, and every real-screenshot
decision this session has used RK's data the same way — but a public marketing page is a different
audience than an internal dashboard, so this is flagged rather than assumed fine. If Salman would
rather it not show RK's name, the fix is a fresh, more tightly-cropped screenshot (or a generic
tenant name) — a small follow-up, not a redesign.

- No explicit visual sign-off yet from Salman on the exact new copy/wording — drafted directly from
  his reference-image brief, adapted to this file's existing voice; he can redirect specific
  phrasing.

## Verification checklist

- [x] Both reference images read and analyzed before any code was written.
- [x] Existing architecture/components investigated first — confirmed no reusable device-mockup or
      chat-bubble component existed, so new ones were built page-local, matching this file's own
      existing pattern (page-local `PrimaryCTA`/`GhostCTA`, not a new shared component library).
- [x] No backend/database logic touched. No existing tenant/public booking routes touched.
- [x] Real browser verification: desktop, mobile (390×844), tablet (820×1180) — 0 console errors,
      0 horizontal overflow at any breakpoint.
- [x] Missing 3D-illustration assets named explicitly, in the requested table format — no fake
      placeholders shipped in their place.
