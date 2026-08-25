# عالزبط (Alzabt) — Master Product Plan

> **STATUS: ✅ APPROVED, Section P FULLY RESOLVED — ready for execution, 2026-08-12.** This is not
> a one-time planning artifact — it is the reference consulted during execution, kept updated as
> real decisions land (per this project's own documentation discipline). Do not reopen it from
> scratch. Section K names the resolved, ready-to-execute order (13 steps, starting with the visual
> system, ending at LIVE). Implementation proceeds directly from here.
>
> History: Revision 1 wrongly framed Alzabt as a post-2026-08-31 initiative — rejected. Revision 2
> corrected that (Alzabt IS the product launching 2026-08-31, RK is the reference tenant), added the
> Visual Reconstruction Specification (Section C) and the Reference→Component mapping (Section D).
> This version (Revision 3) adds the explicit rollout priority Salman set on top of Revision 2:
> **Barber/Reservations now, Clinic next (gated), Real Estate not now.**

---

## A. Product Definition

**عالزبط (Alzabt) is the product being launched by 2026-08-31.** It is this platform's Reservations
capability, built and packaged as one coherent, reusable booking-SaaS product — not a side project
for afterward.

**RK Barber Shop (`rk`) is the first real customer and reference tenant** — the concrete
implementation through which Alzabt gets built, proven, and verified. Not "finish RK, then build
Alzabt" — the two happen together, RK validating each real piece of Alzabt as it's built.

```
عالزبط — PRODUCT (target: 2026-08-31)
│
├── Core Reservation Product        (booking engine, calendar, availability — already real)
├── RK Reference Tenant             (first real, production implementation — proves reusability)
├── Demo Tenant / Provisioning      (product readiness gap — see Section J, NOT deferred)
├── Customer Experience             (Booking Page)
├── Admin Experience                (Dashboard / Calendar / Reservations / Staff / Store)
├── Onboarding                      (TenantRegisterPage.jsx + config flow)
└── Marketing Entry Point           (new Alzabt landing — greenfield, built in the product's own
                                      visual system, not a redesign of unrelated showcase pages)
```

Every finding is classified as: (1) Product-level/reusable, (2) RK-specific configuration, (3) a
real bug found via RK, or (4) genuinely post-launch.

### Two Distinct Brand Layers — resolved 2026-08-12, load-bearing for everything below

**عالزبط (Alzabt) the product-brand** and **each tenant's own configured identity** are two
different colors, on purpose:

- **Tenant-rendered surfaces** (Booking Page, Admin Dashboard, Calendar, Reservations, Staff) stay
  driven by `Client.primary_color`, exactly as today — RK's real color (green, `#16A34A` family)
  is **unchanged**. "Visual system" work on these 5 surfaces (Section H/K) is about **UX patterns**
  (price display, calendar block treatment, personalized greeting, chevron affordances, token
  sharing) — **not a recolor**. A future clinic tenant keeps its own `primary_color` too; nothing
  here hardcodes green or violet into tenant-facing product code.
- **The Alzabt product/marketing brand** — the new landing page, demo entry point, "جرّب عالزبط"
  positioning — gets its own fixed identity, decided 2026-08-12: **"Violet Confidence"**:
  ```
  Primary accent:   #7C3AED  (violet)
  Neutral base:     #0A0A0F  (near-black)
  Surface:          #FFFFFF / #FAFAFF
  Semantic success: #16A34A  (kept deliberately separate from the brand accent — Image 3's own
                              principle, Section C: brand color and success/status color should
                              never be the same color)
  ```
  This applies **only** to the new marketing/demo-entry layer (Section K step 7) — never to
  tenant-rendered pages.

### Rollout Priority — explicit and standing (Salman, 2026-08-12)

```
1. Barber / Reservations  →  CURRENT, SOLE PRIORITY. RK is the real reference implementation.
2. Clinic                 →  NEXT PHASE, GATED. Starts only once the barber model is proven
                              reusable — the real test: a clinic tenant onboards via configuration
                              alone, zero new product code.
3. Real Estate             →  NOT A PRIORITY NOW. `smar`'s existing villa/chalet booking flow is
                              NOT tuned or touched during this work. Revisit only once the barber
                              product is proven and the product model genuinely needs to expand to
                              this vertical.
```

> **Note, 2026-08-25 (appended, does not change the rule above)**: `AlzabtLandingPage.jsx` was
> extended with an honest "شو بنقدملك" (what we offer) section, real RK screenshots, and a small
> roadmap strip naming three things: (1) Barber is what's actively being built today — matches this
> Rollout Priority exactly; (2) an online shop/store add-on "على نفس الصفحة" — this is **not**
> forward-pulled work, `store`/Catalog is an already-live capability RK itself already has active
> (confirmed live in the real screenshot used on the page); (3) Clinic/Beauty named as "قريباً"
> (coming soon) — marketing copy naming the roadmap, not a build-order change; no Clinic code was
> touched, this rule's gate (`onboards via configuration alone, zero new product code`) still
> applies unchanged before Clinic actually starts. Evidence:
> `.claudedocs/work/alzabt-landing-content-expansion/2026-08-25/summary.md`.

**Binding rule going forward**: every new decision in this plan gets asked against this order —
"is this reusable for the Barber/Reservations product, or is it Clinic/Real-Estate-specific work
being pulled forward before it's needed?" Per this project's own Abstraction Rule
(`rules/team-roles.md`), no multi-vertical abstraction gets built ahead of a second proven case —
Clinic hasn't started, so nothing in Sections C-K below should be read as "build for 3 business
types" — it is scoped to Barber/Reservations only, full stop, unless a section says otherwise.

### Sequencing

Visual direction must be established *before* any further UI polish — otherwise Calendar/Dashboard/
Booking/Onboarding risk being polished once now, then redone once the visual system is defined.

```
1. Product / Alzabt visual direction
2. Reference images analysis          ← Section C
3. Define visual system               ← Section D, decided in Section P
4. Apply system to Barber surfaces:   Booking Page, Calendar, Dashboard, Reservations,
                                       Staff/Services, Onboarding
5. RK verification
6. Full UX polish
7. Final regression
8. LIVE
```

**Reconciling with `RESERVATION_PRODUCTION_ROADMAP.md`** (a follow-up update to that file is still
owed, not yet made): its steps 1-4 (Availability Reliability, Production Data Hygiene, STAFF roster
scoping, Overview functional fixes) are functional/backend/security work, independent of visual
identity, already done — untouched by this plan. Its step 5 ("Calendar/Reservations/Staff/Store
polish") is what this plan's steps 1-6 above replace/refine. Steps 6-8 (Ali onboarding — note: Ali
is a *store/restaurant* tenant per existing project history, not Reservations, so unaffected by the
Barber-only scoping above — final regression, LIVE) stay the same milestones.

**Honest scope note**: a real visual system + applying it across 6 surfaces + fixing the demo gap +
a new marketing entry point is real, additional work inside the same ~19-day window as Ali's
onboarding and the STAFF nav-click bug. Narrowing to Barber-only (this revision) reduces that scope
versus a multi-vertical version, but it is still real work — Section P closes the remaining
questions needed to start it.

---

## B. Current Repository State

### B1. Customer Booking Page — `frontend/src/pages/generic/normal/ReservePage.jsx` (883 lines) +
`frontend/src/hooks/useReservationBooking.js` (309 lines)

Light-themed (redesigned 2026-08-03, deliberately "not a dark dashboard"), numbered 1-3 flow:
1. **اختر الخدمة** — `ServiceCircle` horizontal carousel: circular avatar/icon, name, duration —
   **no price shown anywhere** (confirmed: `price` never rendered in `ServiceCircle`, `SummaryCard`,
   or `ConfirmPanel`).
2. **اختر الحلاق** — `StaffCarousel`, single-card paginated, remounts on service change (real bug
   fix, `ReservePage.jsx:623-631`).
3. **اختر اليوم والوقت** — `CalendarPanel`: real month grid (not a day-strip,
   `useReservationBooking.js:22-23`) + time-slot pill grid, with distinct loading/real-error-with-
   retry/real-empty-day states (`ReservePage.jsx:352-377`, a 2026-08-10 bug fix).

`SummaryCard` + `ConfirmPanel` — **WhatsApp is the primary confirm path** (explicit product
decision, `useReservationBooking.js:53-57`, dated 2026-08-02 — do not silently reverse), secondary
local name/phone form collapsed by default. `mode` ∈ `loading | booking | legacy | error`.

**Design tokens**: file-local `const T` (`ReservePage.jsx:21-34`), not imported from admin
`theme.js` — but the accent green (`#16A34A`) is numerically identical to the admin dashboard's
`T.green`/`T.greenSoft`. Color already agrees; token *definitions* are duplicated across files.

### B2. Admin Dashboard — `frontend/src/pages/generic-admin/`

`GenericAdminDashboard.jsx` (sidebar/mobile-nav shell, URL↔tab sync), `ReservationsTab.jsx`
(shared List/Today/Week component), `Dropdown.jsx`/`DatePicker.jsx` (custom trigger+panel pattern,
established precedent), `StaffTab.jsx` (Employee↔Service two-panel, built 2026-08-11), `OrdersTab.jsx`
(status chevron, built 2026-08-11), `theme.js` (the one real shared admin token file — light theme,
same green family as the booking page).

### B3. Routing — canonical `/{slug}/dashboard`. Real, confirmed, still-open bug: STAFF's first nav
click after login intermittently (~50%, reproduces on dev AND a real production build) never
reaches React's click handler — root cause not isolated after 5 real-browser test rounds
(`.claudedocs/work/dashboard-ux-corrections/2026-08-10/item-11-evidence.md`). Not visual — unaffected
by anything in this plan; tracked separately in the roadmap's Phase 4.

### B4. Backend Reservation Model — `Reservation.status` ∈ `pending|confirmed|arrived|cancelled|
no_show`, `Barber.working_hours`/`image_url`/`is_active`, `CatalogService.duration_min`/`price`/
`currency`/`category_id`, `BarberService` join table (real, working). Public endpoints:
`GET /reservations/barbers` (`?service_id=` filterable), `GET /reservations/catalog-services`,
`GET /reservations/availability`, `POST /reservations/`.

### B5. Demo Infrastructure — confirmed Product Readiness Gap, scoped to Barber-type (see Section J)

`app/services/demo_service.py` (305 lines, read in full):
```python
_VENUE_TYPE_MAP = {"restaurant": "restaurant", "store": "ecommerce", "booking": "real_estate"}
_SERVICE_MAP    = {"restaurant": [...], "store": [...], "booking": ["booking", "gallery", "whatsapp_ordering", "catalog"]}
```
Picking **"🏠 حجوزات / Booking"** in `DemoLandingPage.jsx`'s existing hero form today provisions a
**real-estate/villa-type** tenant (matching `smar`'s property model — the exact vertical this
revision explicitly deprioritizes, Section A), seeds **zero** `Barber`/`CatalogService` rows
(`_seed_demo_catalog` returns early — line 178-181's own comment: *"booking (and any unknown type)
— catalog not relevant"*), and never activates the `reservations` client-service key (only
`booking` is seeded — the exact `booking`-vs-`reservations` gotcha `service-system.md` already
documents). Result: a visitor picking "booking" lands a demo tenant whose `ReservePage.jsx` renders
in `mode: 'legacy'`, and whose admin dashboard never shows Reservations at all. **"جرّب عالزبط"
cannot work against the existing demo mechanism as-is, at all — and what it WOULD provision today is
the wrong (Real Estate) vertical anyway.**

### B6. Marketing/Showcase Site — two separate, unrelated existing experiences

`HomePage.jsx` (369 lines) — React Three Fiber 3D scene + GSAP ScrollTrigger + Lenis, cinematic
spectacle. `DemoLandingPage.jsx` (1635 lines) — dark (`#050508`) + gold (`#d4a853`) glassmorphism,
plain inline-style CSS + IntersectionObserver reveals. Neither shares a token, component, or
technical approach with the actual product (light, green, plain functional components) or with each
other. At least **three** unrelated visual languages exist in this codebase today.

### B7. Onboarding — `frontend/src/pages/auth/TenantRegisterPage.jsx` is the real, canonically-
linked registration page (confirmed via real inbound-link check). Not deeply visually audited yet
(Section H/P).

---

## C. Visual Reconstruction Specification — `new-matirial/alzabt/` (7 images, deep pass)

Per-image breakdown: layout/grid, header/nav, typography, buttons, colors, radius/shadows, mobile
transformation (marked *inferred* where the image itself doesn't show a mobile view), and an
explicit Reuse/Reject verdict — all read through the Barber/Reservations-only lens (Section A);
anything that would only matter for a directory/marketplace or multi-location model is rejected as
out of scope, not just "less relevant."

### Image 1 — Generic barbershop template (laptop + mobile mockup, teal accent)

- **Layout/Grid**: two-column hero inside device mockups (MacBook Air + iPhone side-by-side). Left
  ~45% text column, right ~55% photo column with a smaller second photo peeking from behind
  (stacked-photo effect) + a decorative hand-drawn arrow between them.
- **Header/Nav**: horizontal bar — logo, center-weighted nav (Home/About Us/Our Services/Our Team/
  Portfolio/Blog), a solid pill "Contact Us" CTA.
- **Typography**: large bold all-caps 2-line headline; small gray 2-line body paragraph; a 3-column
  stat row (bold large number + small label under each) beneath the CTA row.
- **Buttons**: primary = solid teal pill ("Book Appointment"); secondary = a circular ghost play-
  icon + plain text label ("Watch Video") — an icon+label pairing, not a bordered button.
- **Colors**: white background, near-black text, one accent (teal/mint, ~#2BB89D range), warm-toned
  interior photography.
- **Radius/Shadow**: large soft radius on photos (~16-24px), fully-pill buttons, soft drop shadow
  under the stacked-photo element.
- **Distinctive element**: a full-width teal band directly below the hero — a horizontal,
  overflowing row of circular avatar/photo crops (staff or service thumbnails).
- **Mobile transformation (shown, not inferred)**: nav collapses to 2 icon buttons (phone +
  hamburger) top-right; hero content stacks (text above a single photo, stacked-photo effect
  dropped); the 3-stat row stays horizontal, compressed; a visible RTL toggle switch confirms this
  exact template was being evaluated for RTL fitness.
- **Reuse**: the circular avatar/photo band — **already built** (`ServiceCircle`/`StaffCarousel`);
  the icon+label ghost-CTA pairing (candidate for a future "شوف كيف بيشتغل" secondary hero CTA);
  single-accent-color discipline.
- **Reject**: the 6-item corporate nav — Alzabt's marketing entry point stays single-purpose; the
  stacked-photo hero treatment (real engineering cost, decorative only).

### Image 2 — Setmore-style Week calendar (admin)

- **Layout/Grid**: fixed left sidebar (~220-240px, dark green) + white main content.
- **Sidebar structure**: workspace/location switcher pill, search input, labeled section groups
  (WORKSPACE/CATALOG/COMPANY, 11 items total) — active item on a white rounded-pill highlight.
- **Header**: page title left; right-aligned utility cluster (revenue total, elapsed-time+pause
  icon — a shift-clock feature, not applicable — avatar).
- **Sub-header controls**: Today button, month/year + prev/next chevrons, Day/Week/Month/Staff
  segmented control, status-filter dropdown, staff-filter dropdown, solid primary "Add appointment"
  button.
- **Stat row**: 4 equal cards — label+info-icon, period dropdown, large bold number, small
  green/red delta badge with an arrow.
- **Calendar grid**: 7 day columns (date+count header), hourly time-axis rows, color-coded
  appointment blocks (soft pastel fill + a **slightly darker left-edge border stripe**, distinct
  from a full solid badge treatment).
- **Floating popover** (create/edit): service search input, Service/Package tab toggle, a checklist
  of services (icon+name+duration+price+checkbox), "+ Add New Service" link, customer info row,
  date/time range, note field, primary "Save appointment" button + expand-to-fullscreen icon.
- **Colors**: white background, dark-green sidebar, pastel appointment-block fills with a darker
  left border accent.
- **Radius/Shadow**: small-medium radius (~6-10px); moderate card elevation; stronger shadow on the
  floating popover.
- **Mobile**: not shown — no evidence to extract.
- **Reuse**: stat-row-with-delta-badge (Overview already has a version); the floating create/edit
  popover with inline price+duration checklist — **already built**; the colored-left-border block
  treatment is a real "polish, not rebuild" candidate for `ReservationsWeekCalendar.jsx` (Open
  Decision, §P).
- **Reject**: the AI-assistant floating action cluster; the revenue+timer+pause utility cluster
  (unrelated shift-clock feature); the 11-item, 3-group sidebar taxonomy — Alzabt's real nav is
  ~5-6 flat items.

### Image 3 — Dark "LocAppoint" hero ("Get Discovered. Get Booked. Grow Your Business.")

- **Layout/Grid**: full-viewport dark hero, top nav, then a loosely left-text/right-floating-card
  composition with small decorative icon badges scattered at varying depths (implied parallax).
- **Header/Nav**: logo, Features/For Whom/Benefits/Partnership, language pill + solid "Join
  Waitlist" CTA.
- **Typography hierarchy**: eyebrow pill ("🚀 LAUNCHING SOON"), a 3-line headline with **line 2
  alone** in a blue→purple gradient (a "tension across 3 short lines" technique), ~18px gray
  subtext, a 3-phrase middot trust line under the CTAs.
- **Buttons**: primary = gradient-fill pill; secondary = outlined ghost pill.
- **Floating product card**: business-identity row, 3 stat mini-cards (Today/Revenue/Rating),
  "Today's Schedule" list (muted "Available" rows interleaved with booked ones), a small "Activity"
  panel, a "This Week" mini bar-chart, and a **floating toast breaking past the card's own edge**
  ("✅ New Booking! Sofia M. booked for 18:00").
- **Colors**: near-black background, reduced-opacity gray text, ONE accent (purple/blue gradient)
  used sparingly; **green used exclusively for the live-notification toast** — a semantically
  distinct success color, never mixed with the brand accent.
- **Radius/Shadow**: medium-large radius (~14-20px); strong ambient glow/shadow under the floating
  card.
- **Fixed corners**: WhatsApp bubble bottom-left, AI-chatbot bubble bottom-right.
- **Mobile transformation**: *not shown — inferred only*: stacked full-width fallback, card as its
  own block below, not overlapping text.
- **Reuse**: 3-line tension-building headline; gradient-on-one-line device; trust-line-under-CTAs;
  the live-toast-notification device (real candidate for an animated "new booking" toast); the
  WhatsApp-bubble placement (directly relevant — Alzabt's real confirm path IS WhatsApp); strict
  separation of brand-accent color from semantic success color.
- **Reject**: the AI chatbot bubble; the literal "GDPR compliant" phrase (unverified claim —
  substitute e.g. "بدون بطاقة ائتمانية", already used in this codebase's `DemoLandingPage.jsx`).

### Image 4 — Light "Trafft"-style dashboard ("Hello, John")

- **Layout/Grid**: narrow icon-only dark-green sidebar rail (collapsed/mini, distinct from image
  2's full labeled sidebar) + white main content.
- **Header**: "Booking Website" dropdown (implies multi-location — not applicable to Alzabt's
  single-location-per-tenant model, note only); "Share Booking" solid pill, help icon, notification
  bell, avatar+name+chevron.
- **Personalization**: "Hello, John. Welcome to your dashboard." — a real greeting, not a generic
  label.
- **Stat row**: 3 cards (New Customers/Revenue/Occupancy) — label+period-dropdown, large bold
  number, a small trend **sparkline**, a delta line ("↗ 14% Increase" green, or "— Stable" gray).
- **Secondary row**: 2 smaller cards (booked/canceled), month-picker + count + delta.
- **Distinctive widget**: a "Daily occupancy" heatmap calendar — genuinely novel, not present today.
- **Floating detail card**: avatar+name, 2 stat columns, a labeled progress bar.
- **Table**: "Last booked appointments" — a **thin (~3-4px) colored left-border stripe per row**,
  service name, customer name, duration, a **status pill with a visible dropdown chevron**, avatar,
  numbered pagination footer.
- **Typography**: geometric sans-serif, generous line-height, numbers notably larger/bolder than
  labels.
- **Colors**: white background, dark-green sidebar (**second, independent** dark-green-sidebar
  instance across these 7 images — a twice-confirmed convention), purple primary accent, green/red
  deltas.
- **Radius/Shadow**: medium radius (~10-12px); minimal shadow — flatter than image 3's dark-glow
  style.
- **Mobile**: not shown.
- **Reuse**: personalized greeting; sparkline-in-stat-card; thin colored-left-border row treatment
  (as an *addition*, not a replacement for the status badge); status-pill-with-chevron — **already
  shipped**; pagination style already matches ours.
- **Reject**: the "Daily occupancy" heatmap (real build cost, not proven necessary at RK's current
  scale); the multi-location "Booking Website" switcher.

### Image 5 — Dark "Barbershop Frisor World" + mobile discovery app

- **Layout**: desktop dark hero (single solid "Book Now" CTA, no secondary) beside a **separate,
  different product**: a multi-location barbershop-discovery mobile app.
- **Listing card anatomy**: full-width photo, distance badge, status badge, shop name, address,
  next-availability line, "Find on map" pill, bottom tab bar.
- **Colors**: dark teal/near-black, teal accent, photography-heavy.
- **Radius/Shadow**: medium card radius (~10-14px), pill buttons/badges throughout.
- **Mobile**: this whole image IS the mobile reference, but for a structurally different product.
- **Reuse**: none applicable to RK's single-tenant flow today.
- **Reject**: the entire multi-location marketplace concept — wrong product shape for Alzabt as
  scoped (one tenant, one booking page — and doubly out of scope given the Barber-only priority,
  Section A).

### Image 6 — "Calendr.com" light-blue hero with full calendar widget

- **Layout/Grid**: fully **centered** hero (unlike 3/7's left-text/right-card split) — eyebrow,
  headline, subtext, CTAs centered; product proof sits centered **below**, full-width.
- **Header/Nav**: logo, About/Features/How it Works/Pricing, solid "Sign Up" CTA.
- **Typography**: eyebrow pill; 2-line headline with a **partial phrase** in blue (more surgical
  than image 3's whole-line treatment); 2-line centered gray subtext.
- **Buttons**: primary solid blue pill, secondary outlined pill — the primary/ghost pairing
  confirmed a **4th time** across this set.
- **Product proof**: a large, full-width real calendar app screenshot directly in the fold — its
  own sidebar (profile card, booking-link display, To-do/Services/Customers nav) + a real month
  grid with color-coded event chips.
- **Colors**: light blue-gray wash background, blue accent, pastel multi-color event chips.
- **Radius/Shadow**: large radius on the calendar container (~20px), small-medium on chips, soft
  ambient shadow.
- **Mobile**: not shown.
- **Reuse**: a genuine **alternative hero structure** (centered + full-width proof below) — a real
  choice alongside the floating-card pattern, not an assumed default; the partial-phrase color-
  emphasis technique; confirms a full `CalendarPanel`-style month grid is hero-worthy proof
  content — **already built**.
- **Reject**: nothing strongly rejected — the most directly adaptable reference of the 7.

### Image 7 — "Bookly" — "Bookings that run themselves."

- **Layout/Grid**: left-text/right-floating-card split, generous whitespace, very light lavender-
  white background wash.
- **Header/Nav**: logo, Features/Pricing/About, ghost "Log In" + solid gradient "Start Free".
- **Typography**: lightweight eyebrow (dot+text, no pill background); 2-line headline, second
  line's key phrase in a purple gradient (bolder than image 6's partial-phrase treatment); 2-line
  gray subtext.
- **Buttons**: primary = solid gradient pill + trailing arrow; secondary = plain-text ghost with a
  chevron — lighter-weight than a bordered button.
- **Social proof row**: overlapping avatar stack (5) + star rating (4.9/5) + review count.
- **Floating product card** (the single most directly relevant reference for the Booking Page): a
  small green **"Your branded page"** tag breaking past the card's top edge; business-identity
  header; "SELECT SERVICE" label; 3 service rows, each **name + price (bold, right-aligned) +
  duration (small gray, right-aligned under price)**, first row selected (border+tint);
  "AVAILABLE TIMES — TODAY" label; a 5-slot time-pill grid, one selected (**solid** fill — a
  *different* treatment than the service row); full-width solid "Confirm Booking" button.
- **Colors**: white/very-light-lavender background, purple/violet accent; two intentionally
  different selected-state treatments per control type.
- **Radius/Shadow**: large radius (~16-20px) on the card, medium (~10px) on rows/pills, soft
  moderate shadow.
- **Mobile**: not shown.
- **Reuse**: **price+duration-per-service-row — the single actionable content gap this whole
  reference set surfaces**; the "Your branded page" trust-tag device; the differentiated
  selected-state-per-control-type pattern — **already independently matched** by `ServiceCircle`
  (ring+check-badge) and the slot grid (solid-fill) — a strong confidence signal the existing
  component design is already sound.
- **Reject**: nothing significant — the most directly portable reference for the Booking Page.

---

## D. Reference → Pattern → Component Mapping (executable, not inspirational)

| Reference | Visual Pattern | Alzabt Surface | Existing Component | Required Change |
|---|---|---|---|---|
| Img 7 (Bookly) | Service row: name + price + duration | Booking service selector | `ServiceCircle` (`ReservePage.jsx`) | **Add price display** — currently duration-only |
| Img 7 | "Your branded page" trust tag | Marketing hero proof card | — (new) | New small trust-tag component, for the future landing hero |
| Img 7 / Img 1 | Border+tint for list-item selection; solid-fill for discrete-pill selection | Service/slot selection states | `ServiceCircle` + `CalendarPanel` slot grid | **None** — already matches independently |
| Img 2 (Setmore) | Color-coded appointment blocks, pastel fill + darker left-border stripe | Week Calendar blocks | `ReservationsWeekCalendar.jsx` | Polish candidate — compare current block treatment against this stripe pattern (Open Decision, §P) |
| Img 2 | Floating create/edit popover, service checklist w/ price+duration | Reservation create/edit | `CreatePopover` / `ReservationPopover` | **None** — already matches |
| Img 2 / Img 4 | Stat card row + trend delta badge | Dashboard Overview | `StatCard` (`OverviewTab.jsx`) | Minor — confirm delta styling is consistent everywhere it appears |
| Img 4 (Trafft) | Status pill with dropdown chevron | Order/Reservation status control | `StatusBadge` (`OrdersTab.jsx`) | **None** — shipped 2026-08-11, commit `73e8107` |
| Img 4 | Personalized "Hello, [Name]" greeting | Dashboard Overview header | `OverviewTab.jsx` | New, small — real greeting instead of a generic heading |
| Img 4 | Thin colored left-border stripe per table row | Reservations/Orders list rows | `ReservationsTab.jsx` list view | Candidate addition alongside (not replacing) the existing status badge |
| Img 3 / Img 6 / Img 7 | Multi-line headline, one phrase in accent gradient, dual CTA (solid + ghost), trust line | Marketing hero | — (new) | New: Alzabt landing hero, greenfield |
| Img 3 | Floating live "New Booking!" toast | Marketing hero proof-of-life | — (new) | New: small animated toast, cycling on a timer |
| Img 3 | WhatsApp bubble placement | Marketing hero | — (new) | Directly relevant — Alzabt's real confirm path IS WhatsApp |
| Img 6 | Centered hero + full-width calendar proof below (alt. structure) | Marketing hero (alternative shape) | `CalendarPanel` (reusable as-is) | New hero wrapper only — `CalendarPanel` itself needs no change |
| Img 1 | Circular avatar/photo carousel band | Staff/Service selector | `ServiceCircle` / `StaffCarousel` | **None** — already matches |
| Img 2 / Img 4 | Dark sidebar + light content (confirmed twice, independently) | Admin Dashboard shell | `GenericAdminDashboard.jsx` | Confirms current light-content approach is right; sidebar *color* is a real but non-urgent open choice |
| Img 5 | Multi-location discovery cards | — | — | **Reject** — wrong product shape, doubly out of scope (Real Estate/multi-location deprioritized, Section A) |

---

## E. Surface-by-Surface Gap Analysis

| Surface | Product-level | RK-specific | Already good | Needs redesign | Needs polish (AFTER visual system, §A) |
|---|---|---|---|---|---|
| Booking Page | Yes | Service/staff data only | Flow shape, states, WhatsApp-first, month calendar, selection-state patterns | No | **Show price per service** (confirmed gap) |
| Calendar (admin) | Yes | — | Week/Today grid, popover pattern | No | Evaluate colored-left-border block treatment (§D) |
| Reservations (admin) | Yes | — | List view, status chevron, DatePicker | No | STAFF nav-click bug (functional, tracked separately) |
| Dashboard/Overview | Yes | Branding/color only | Stat cards | No | Personalized greeting; sparkline-in-stat-card |
| Staff/Services | Yes | Roster/services data | Two-panel widget (shipped) | No | None identified |
| Onboarding | Yes | — | `TenantRegisterPage.jsx` exists, canonically linked; a real "حلاقة رجالي" (Men's Barbershop) template already exists in `template-registry.js` | **Confirmed broken for self-registration** (audited 2026-08-12, see below) — visual layer not touched, not the real gap | Deferred, not required for this launch (RK/alzabt-demo both manually seeded) |
| Demo | Yes | — | The `/demo/create` mechanism itself works for restaurant/store | **Yes, for Barber/`booking` type — confirmed Product Readiness Gap, §J** | — |
| Marketing/Landing | Yes — this is the new work | — | Nothing exists under this name yet | **Greenfield**, not a redesign of `HomePage.jsx`/`DemoLandingPage.jsx` | — |

---

## F. RK as Reference-Tenant Strategy

For every RK-surfaced issue: **"Is this a problem with RK, or a product problem?"** Product-level
fixes benefit every future Barber/Reservations tenant; RK-specific config never leaks into product
code. **Success criterion, updated per the rollout order**: the *next* real tenant is a clinic
(Section A) — it must onboard through `TenantRegisterPage.jsx` + dashboard configuration alone, zero
new product code, and that attempt is what actually proves the Barber-built product generalizes.
Until a clinic is actually being onboarded, nothing in this plan should be built as if Clinic
support already needs to exist.

**Known blocker for this criterion, confirmed 2026-08-12 (Section K step 9's onboarding audit)**:
self-registration through `TenantRegisterPage.jsx` does not currently produce a working
Reservations tenant for ANY business type, including the barbershop template that already exists
in the registry — full evidence in `.claudedocs/work/onboarding-audit/2026-08-12/summary.md`.
Deliberately not fixed as part of this launch (RK/alzabt-demo both manually seeded, proving the
product itself works) — but a real Clinic onboarding attempt will hit this exact gap and needs it
fixed first, whenever that happens.

---

## G. What "Alzabt Ready for 2026-08-31" Requires (Barber/Reservations scope only)

1. **Visual system definition** (Section D is the executable input; Section P has the actual open
   choices).
2. **Apply the system** to Booking Page (price display + token-sharing), Calendar, Dashboard,
   Reservations, Staff/Services — all additive/refining per Section E, none require a rebuild.
3. **Fix the demo-provisioning gap for Barber/`booking` type specifically** (Section J) — required
   for "جرّب عالزبط" to be real.
4. **Build the Alzabt marketing entry point** — greenfield, Barber-framed (per the rollout order,
   not a generic multi-vertical launch page).
5. **RK verification** — the whole system proven against the real reference tenant.
6. **Full UX polish pass** — only after 1-5.
7. **Final regression.**
8. **LIVE.**

Explicitly **not** part of this scope: any Clinic-specific work, any Real-Estate/`smar` tuning
(Section A).

---

## H. Visual Reconstruction Plan — Per Surface

- **Booking Page**: Reuse the entire component tree. Refactor: add price to `ServiceCircle`/
  `SummaryCard` (data already exists — `CatalogService.price`/`currency`). Rebuild: nothing.
  Don't touch: `mode` state machine, WhatsApp-first sequencing, month-grid mechanics.
- **Calendar (admin)**: Reuse `ReservationsWeekCalendar.jsx`, `ReservationsTodayView.jsx`,
  `CreatePopover`/`ReservationPopover`, `Dropdown.jsx`, `DatePicker.jsx`. Possible polish: block
  color treatment (§D, Open Decision). Don't touch anything else.
- **Dashboard**: Reuse everything from Phase 3.7/3.8. Refactor: personalized greeting, token-sharing
  with the Booking Page once §P's token decision lands. Don't touch beyond that.
- **Onboarding**: Genuinely open — needs its own real audit pass before a redesign/refactor verdict
  can be given honestly (§P).

---

## I. Responsive/Mobile Strategy

Inherits the exact standing discipline already proven this session
(`DASHBOARD_UX_CORRECTIONS_CONTRACT.md` §B.12): real `getBoundingClientRect()` checks at real scroll
positions via nested Playwright sessions, not screenshots alone. Every image in Section C that
didn't show a mobile view is marked *not shown*, never silently assumed.

---

## J. Demo Strategy — RESOLVED 2026-08-12: static pre-seeded reference tenant

**Decided**: "جرّب عالزبط" points directly at a **stable, pre-seeded reference demo tenant** for
barber reservations — real backend data, proven, not mock marketing data (RK itself, in a
sandboxed/read-only-appropriate mode, or a dedicated `alzabt-demo` barber tenant seeded once with
the same real Barber/CatalogService/working_hours shape RK already has).

**Explicitly not built now**: a new `/demo/create` provisioning path for Barber/`booking` type.
Fixing the auto-provisioner (Section B5's confirmed gap: wrong `_VENUE_TYPE_MAP` entry, zero seeded
data, missing `reservations` client-service key) is **not a requirement for the Alzabt barber
launch** — no new backend/seed work opens now. The idea itself isn't cancelled: if a later stage
wants every visitor to get their own independent tenant, the correct real fix (Barber + Services +
working hours + `reservations` client-service key + canonical `admin_url`) gets built then, exactly
as already documented in Section B5 — not reinvented. For now, this keeps effort on what's actually
being shipped: a real, reusable Barber/Reservations product.

> **Superseded note, 2026-08-24** (appended, original text above left as-is per this project's
> evolution/plan-doc immutability convention): the "explicitly not built now" call above was
> reversed the same day, later, by Salman's own explicit decision — commit `ff38f89` (2026-08-12,
> 17:41) built a real, working self-service demo/tenant-creation path,
> `frontend/src/pages/home/DemoBuilderPage.jsx`, POSTing to the existing `/demo/create` endpoint
> with `business_type: "barbershop"`. It creates a real trial `Client` + personalized `Barber` + 6
> real `CatalogService` rows, activates `booking`+`reservations`, and its success screen shows both
> a `/{slug}/reserve` CTA and a real dashboard link. Verified end-to-end via real Playwright:
> `.claudedocs/work/alzabt-demo-builder/2026-08-12/summary.md`. This coexists with, and does not
> replace, the static `alzabt-demo` reference tenant this section describes — `/alzabt` and
> `demo.salmansaas.com/alzabt` still point at that static tenant unchanged. See
> `.claudedocs/work/alzabt-demo-builder-whatsapp-link/2026-08-24/summary.md` for the one real
> follow-on gap this section's "not built now" language obscured until this note (a WhatsApp link
> on the success screen, added 2026-08-24 once Central WABA — Phase B — existed to support it).

---

## K. Implementation Phases — RESOLVED order, 2026-08-12, ready to execute

All of Section P is now closed (see §P). Salman's explicit execution order:

1. **Visual system** — lock the pattern-level decisions (price display, calendar block treatment,
   greeting, etc. — Section D/H), no tenant-color changes (Section A's Two Brand Layers).
2. **Booking Page (Barber)** — apply the resolved patterns; add price display (the one confirmed
   content gap).
3. **Calendar** — apply resolved patterns (block-color treatment, if adopted).
4. **Dashboard** — apply resolved patterns (personalized greeting, sparkline, token sharing).
5. **Reservations** — apply resolved patterns.
6. **Staff / Services** — apply resolved patterns.
7. **Demo linking + Alzabt marketing entry point** — point "جرّب عالزبط" at the static pre-seeded
   reference tenant (§J); build the new landing page in the Violet Confidence product-brand
   (Section A), centered-hero structure (§P/Section C, Image 6 pattern).
8. **RK verification** — the whole system proven end-to-end against the real reference tenant.
9. **Onboarding Audit** — ✅ DONE 2026-08-12,
   `.claudedocs/work/onboarding-audit/2026-08-12/summary.md`. Found a real, confirmed functional
   gap (not visual): a real "حلاقة رجالي" barbershop template already exists in
   `template-registry.js`, but self-registering through it activates **zero**
   `booking`/`reservations` client-services (`TenantRegisterPage.jsx`'s `MODULE_TO_VENUE` maps its
   `module_key: 'catalog'` to a `venueType: 'services'` that isn't a real key in
   `registration_service.py`'s `_SERVICE_SEED_MAP`, silently falling through to `["catalog"]`
   only) — and even if that were fixed, the registration flow's seed step only ever creates
   `CatalogCategory` rows, never real `Barber`/`CatalogService` rows. Two independent root causes.
   **Decision: not fixed now** — same reasoning already applied to the `/demo/create` gap (§J):
   RK and `alzabt-demo` both already prove the product works without this path; self-service
   registration was never part of what Section G requires for 2026-08-31. Left open, named, for
   whenever a real Clinic (or any genuinely new Barber tenant) needs to self-register.
10. **Apply/adjust the visual system to onboarding** — not needed; the real gap found was
    functional, not visual (see step 9).
11. **Full UX polish** — anything not already covered by steps 1-10.
12. **Final regression.**
13. **LIVE.**

**Explicitly deferred, not part of these phases**: Clinic onboarding/verification (Section F —
starts only once phase 13 above is real and Salman signals Clinic work should begin); any Real-
Estate/`smar` visual or functional work (Section A); a new `/demo/create` provisioning path (§J).

---

## L. Dependencies

Visual system decision (K1) blocks K2-K4. Demo fix (K3) blocks a *real* "جرّب عالزبط" in K4 — K4's
static/copy content can be drafted in parallel, but the interactive demo specifically needs K3 done
first.

---

## M. Risks

- **Scope creep back into multi-vertical work** — mitigated by Section A's explicit Barber-only
  priority; any Clinic/Real-Estate work proposed before phase K8 should be flagged, not silently
  absorbed.
- **Re-deriving the demo gap incorrectly** — mitigated by Section B5/J's explicit, evidenced
  description.
- **Losing the WhatsApp-first decision** during Booking Page changes — flagged explicitly, do not
  reverse.
- **Real timeline pressure** — narrowed by Barber-only scoping, but still real; Section P's answers
  are what actually unlock a realistic estimate.

---

## N. Verification Strategy

Real accounts, real browser (Playwright MCP via nested sessions), desktop+mobile geometry checks,
Confirmed/Side Findings/Unknowns reporting, evidence files per item under `.claudedocs/work/`,
separate commits per change — the same discipline already proven this session.

---

## O. Explicitly NOT Changing

- `HomePage.jsx` and `DemoLandingPage.jsx` as files — a future Alzabt landing is a **new, separate**
  page/route; `DemoLandingPage.jsx` keeps serving restaurant/store demo signups unchanged.
- The Booking Page's flow shape, state machine, WhatsApp-first sequencing.
- The admin Dashboard's already-shipped Phase 3.7/3.8 work — confirmed compatible with any visual
  system decision since it fixed *behavior*, not *identity* (no color/typography/spacing choices
  were made in that work — it reused existing `theme.js` tokens throughout).
- The STAFF nav-click bug fix — functional, unrelated to visual work, stays tracked separately.
- `smar`'s real-estate booking flow — not touched, tuned, or visually revisited (Section A).
- Any Clinic-specific product work — not started until the Barber product (through phase K8) is
  proven (Section F).

---

## P. Open Decisions — ALL RESOLVED, 2026-08-12

1. **Visual system foundation** — ✅ **Two distinct brand layers** (Section A): tenant-rendered
   surfaces stay `Client.primary_color`-driven (RK's green unchanged); the Alzabt product/marketing
   brand gets its own fixed "Violet Confidence" palette (`#7C3AED` primary), used only on the new
   marketing/demo-entry layer.
2. **Calendar block color treatment** — not explicitly re-confirmed after the palette decision;
   treated as a small, low-risk polish item to evaluate during Section K step 3, not a blocker.
3. **Marketing hero structure** — ✅ **Centered content + full-width proof below** (Image 6 /
   Calendr.com pattern), not the left-text/right-floating-card family (Images 3/7).
4. **Demo infrastructure** — ✅ **Static pre-seeded reference tenant** (Section J, fully resolved).
   `/demo/create`'s Barber-type gap stays documented (Section B5) but is explicitly not fixed now.
   **Superseded same day, later (2026-08-12, `ff38f89`) — see the note appended to Section J.**
5. **Onboarding audit** — ✅ **Deferred**, with an explicit resolved order (Section K steps 1-10).

---

## Q. Definition of Done (for this Master Plan)

This document is the standing architecture reference for Alzabt (Barber/Reservations scope) — kept
updated in place as implementation (Section K) proceeds, never reopened from scratch, per Salman's
explicit instruction (2026-08-12). Section P is fully resolved; execution starts at Section K step 1.
