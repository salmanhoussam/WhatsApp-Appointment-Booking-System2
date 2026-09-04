# Alzabt Homepage — Hero Rebuild vs. Reference Image (2026-08-27)

Follows: `investigation-protocol.md`. Reference: `new-matirial/alzabt/hero.png` — Salman's exact,
literal design-source-of-truth for the Hero, provided with a very specific instruction: rebuild
content, not just chrome, keep it Hero-only, touch nothing else.

## Approach

Per the brief's own priority order (screen content → proportions → composition → device framing →
perspective → shadows/glow — device framing/perspective/shadows already existed and stay
unchanged), content was rebuilt first, composition adjusted second.

**Kept every other section untouchable by construction, not by promise**: `DashboardControlCenterMockup`
(shared by Master Dashboard, Order→Dashboard Ecosystem, WhatsApp panel) was not modified at all — a
new, separate `HeroDashboardMockup` component was built instead, used only in the Hero's `LaptopFrame`
call site. `CustomerBookingFlowMockup`'s `confirmed` branch (used only by Order→Dashboard Ecosystem)
was left untouched; only its `booking` branch (used only by Hero) was rebuilt. This makes "Hero-only"
a checkable fact (grep shows zero diff in the other components' bodies), not just a claim.

## Content rebuilt

**`HeroDashboardMockup`** (new component, Hero laptop only):
- Labeled sidebar nav (6 items: الرئيسية/الحجوزات/العملاء/الموظفين/التقارير/الإعدادات, first active)
  — replaces the shared component's icon-only rail.
- Welcome header ("مرحباً بك في عالزبط 👋") + a period-toggle chip pair — new, wasn't present before.
- 4 KPI cards with real percentage deltas (حجوزات اليوم 28 +18%, طلبات جديدة 12 +24%, الإيرادات
  اليوم $2,450 +15%, عملاء جدد 36 +11%) — reference showed 4 cards with deltas; shared component had
  3, one without a delta.
- A real SVG line chart ("الحجوزات خلال الأسبوع") with day-of-week labels — reference showed a line
  chart; shared component uses bars.
- An "أحدث الحجوزات" (recent bookings) list with 3 named demo entries + avatar-initials + service +
  time, plus a "عرض الكل" link — richer than the shared component's 2-row activity feed.

**`CustomerBookingFlowMockup`'s `booking` branch** (Hero phone only):
- Completely rebuilt from a date/time-picker flow into a service-selection screen matching the
  reference: step-progress icon row, "اختر الخدمة" title, 4 service rows (avatar-initial circle +
  name + duration + price), one row visibly selected (highlighted background/border + check badge),
  "التالي ←" CTA — the reference's own content shape, own copy/prices, no real staff photos.

**Composition**: the phone moved from a bottom-corner float (`bottom: -14%`) to a vertically
centered position overlapping the laptop's edge (`top: 50%, transform: translateY(-50%)`), widened
slightly (210px → 228px), matching the reference's taller, more centered phone-beside-laptop
relationship instead of a phone floating at the laptop's bottom corner. Iterated on the horizontal
offset twice, checking against a real screenshot each time (first pass overlapped too much of the
dashboard, ~45% coverage; second pass, `insetInlineStart` pushed from -9% to -34%, shows the full
dashboard with only an edge overlap, matching the reference's proportions).

## A real conflict found and handled, same as every reference pass this session

The reference image itself shows "RK Barber Shop" in the dashboard header (same placeholder the
generation tool keeps defaulting to, flagged repeatedly this session). Not reproduced — the header
area was rebuilt with neutral, brand-owned content only ("مرحباً بك في عالزبط 👋"), no business-name
placeholder at all.

## Confirmed Findings (real browser evidence, Playwright MCP tools directly)

1. **0 console errors** at both 1440×900 and 390×844 — confirms the rebuilt components compile and
   render cleanly, not just visually plausible.
2. **No horizontal overflow**: 1425/1425 desktop, 375/375 mobile.
3. **No clipping by the Hero section's own `overflow: hidden`**: checked specifically (section
   bounds vs. laptop position) since this was a known risk class from the earlier 3D-depth pass —
   confirmed clean via a 2x-zoomed crop of the dashboard's left edge, not just eyeballed at full
   scale.
4. **Composition matches the reference's proportions** after iteration: dashboard fully legible
   (sidebar, header, 4 KPI cards, chart, recent-bookings list all visible), phone overlapping only
   the dashboard's edge, not its center — confirmed via direct screenshot comparison against
   `hero.png`, not assumed from code alone.
5. **Mobile composition** reflows cleanly at 390×844 — smaller phone (150px, existing media-query
   rule), no overflow, same relative composition preserved.
6. **Every other section confirmed unchanged** via a full-page screenshot: Capabilities, Master
   Dashboard, Order→Dashboard Ecosystem, Vertical Showcase, WhatsApp Integration, How It Works,
   Trust, Closing CTA, Footer all render identically to before this pass.

## Side Findings

- None new.

## Unknowns

- None — every claim checked by direct measurement or screenshot, including two rounds of visual
  comparison against the reference image itself (not just internal consistency checks).

## Not yet done

- **Not committed.** Standing rule — waiting for Salman's review.
