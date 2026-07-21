# Store Experience Review — Beit Al Fakhar

Follows: Investigation Protocol (`.claude/rules/investigation-protocol.md`), Repository Hygiene's
Reference Validation Rule (`.claude/rules/repository-hygiene.md`). Requested explicitly by Salman
as the gate before beit-al-fakhar can be considered for first-reference-Store-Template status:
"هذه المراجعة النهائية ستكون ما يحدد إن كان يستحق أن يصبح المرجع الذي ستبنون عليه المتاجر
القادمة."

This review walks the real journey **بعين المستخدم لا المبرمج** (user eyes, not programmer eyes)
— real screenshots from a clean session (stale cart cleared first — a real first-time visitor
never has leftover cart data), not code reading.

## Journey walked

`Home (Landing) → Collection (/store, filtered to أطباق) → Product Detail → Add to Cart →
Showroom Checkout → (WhatsApp button, verified enabled state)`

All screenshots in `.claudedocs/work/store-flow-validation/2026-07-21/` review_*.png (this
session) — real 1440×900 desktop viewport, real Supabase-backed data, no mocked content.

## What feels excellent

- **The Product Page genuinely reads as a gallery placard, not a product listing.** Breadcrumb
  ("بيت الفخار — أطباق — طبق فخار مرسوم يدوياً رقم 1"), story line above the price, the three
  handmade/hand-painted/one-of-a-kind badges directly under the image, and a visually secondary
  Add to Cart button (outlined, not a loud filled CTA) — all land exactly as designed. This is the
  strongest single screen in the whole journey.
- **The Showroom Checkout does not feel like "leaving the store."** Same dark background, same
  terracotta accent, same typography as the Product Page. The right-panel intro ("أكمل طلبك" +
  "سنرسل طلبك مباشرة عبر واتساب للتأكيد.") makes the form read as the next room, not a detour to a
  generic checkout page — the 9 Phase 3 requirements are all visibly present and correct,
  including the WhatsApp button's real accent color (verified in an enabled state, not just
  disabled-gray) and the exact same "السعر يُحدد حسب الطلب" phrasing reused verbatim from the
  Product Page.
- **The Collection grid's real product photography is good** — actual ceramic pieces on real
  shelves, not stock photos or placeholders, with a working category filter (أطباق / أواني وفازات
  / أكواب / تحف وديكور) that reflects the Phase-1-corrected categories.
- **RTL is handled correctly throughout** — breadcrumbs, form field order, the 60/40 checkout
  grid mirroring correctly (showroom panel right, form left, in RTL reading order) — nothing felt
  mistranslated or mirrored wrong.

## What still feels like "an app," not "a gallery" (real, specific)

- **The Home hero video's subject matter doesn't show the craft itself.** The frame-sequence hero
  (real footage, correctly implemented per the established Scroll-Driven Frame Sequence technique)
  currently shows an alley/doorway exterior shot — evocative of place, but a first-time visitor
  scrolling in doesn't see a single ceramic piece until they reach the Collection page. This is a
  **content** gap, not an architecture one — already flagged in this session's earlier `bo-hussein`
  routing as Salman's own item to solve with better source footage, not something to fix here.
- **Every product title is a generic number** — "طبق فخار مرسوم يدوياً رقم 1" through "رقم 8," etc.
  A premium gallery usually names or briefly individuates pieces ("الطبق الأزرق", a maker's note,
  a size/era) rather than a sequential catalog index. This reads more like inventory SKUs than
  curated pieces, and undercuts the "لا توجد قطعتان متطابقتان" (no two pieces are identical) story
  line sitting right above it — the story copy claims uniqueness that the numbered naming doesn't
  visually reinforce. Also a **content** gap, not a code/architecture one.
- **The Showroom Checkout's reserved image slot is a large, obviously empty gradient rectangle**
  today. It's functioning exactly as designed (an intentional placeholder, per the explicit "no
  image generation this pass" instruction), but seen with real user eyes, an empty ~350px-tall
  panel above real product content reads as "unfinished," not "elegant negative space" — worth a
  smaller reserved slot or a subtler treatment until a real photo fills it, if this page is shipped
  before that photo exists.

## What could improve later without any architecture change

- Replace the numbered product titles and hero footage — pure content work, zero code impact.
- Consider shrinking or restyling the still-empty showroom image slot until a real photo is ready,
  so the placeholder itself doesn't read as a bug to a first-time visitor.
- The "قد يعجبك أيضاً" related-items row on the Product Page reuses the same numbered-title
  problem — will improve automatically once product titles are fixed, no separate work needed.

## Confirmed Findings

- The full architecture (`Collection → Product → Add to Cart → Showroom Checkout → real Order →
  real WhatsApp deep link`) works correctly end-to-end against the real backend, confirmed via
  live CDP walkthrough with a clean cart state, not assumed from code reading.
- All 9 Phase 2 refinements and all 9 Phase 3 requirements are visibly and correctly implemented
  in the running app, not just present in source.
- The two "not yet a gallery" issues found here are both content-quality gaps (hero footage
  subject, generic product naming, an unfilled image placeholder) — none require touching
  `ProductPage.jsx`, `CheckoutPage.jsx`, `ShowroomPanel.jsx`, or `CheckoutForm.jsx`'s structure.

## Side Findings

- Phase 3's earlier "hang" finding (documented in `PHASE3_SHOWROOM_CHECKOUT.md`) recurred once
  more during this review's own testing — traced to multiple stale background Chrome tabs (opened
  across several earlier CDP sessions this day, never closed) sharing the same origin's
  `localStorage` and overwriting each other's cart state. Closed via `Target.closeTarget`; not an
  application defect — a test-harness hygiene issue in this session's own CDP usage, same category
  as Phase 2's earlier false-positive button-detection bug.

## Unknowns

- Real mobile-viewport walkthrough was not repeated in this review (Phase 3's CSS includes a
  `max-width: 860px` stacked fallback for the checkout grid, but this review only exercised the
  1440×900 desktop viewport).
- No real WhatsApp client (mobile app / WhatsApp Web) received the deep link in this review —
  same limitation noted in `PHASE3_SHOWROOM_CHECKOUT.md`.

## Recommendation (not a decision)

Architecturally, this journey holds up as a real, reusable pattern: a generic-catalog page reused
as-is, a tenant-specific Product page and Showroom Checkout built on the same shared cart/config
infrastructure, no duplicated cart logic, no shared-file leakage into other tenants. Per the
Reference Validation Rule, that architecture is a reasonable candidate to explicitly audit and
accept as the Store Template baseline.

The two real gaps found here are both content, not structure — they don't argue against the
architecture being reference-worthy, but they do mean beit-al-fakhar *as currently seen by a real
visitor* isn't fully "gallery-grade" yet. Whether to declare reference-template status now (on the
architecture) while content catches up separately, or wait for the content fixes first, is
Salman's call to make — not made here.
