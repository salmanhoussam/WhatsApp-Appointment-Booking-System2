# DemoLauncher Modal — Centering Bug Fix + Full Flow Verification

Follows: `investigation-protocol.md` (Confirmed/Side Findings/Unknowns).

## Trigger

Salman tested the just-delivered unified homepage himself and sent a real screenshot of the global
"جرّب مجاناً" floating CTA's modal (`frontend/src/components/DemoLauncher.jsx` — pre-existing,
not built by me, part of `ShowcaseLayout`, visible on every showcase page) sitting shifted toward
the bottom-right of the screen, cut off. Asked for its status, and for it to be centered and
tested end-to-end.

## Real, important side discovery (corrects yesterday's study)

Reading this component in full revealed something the `three-products-website-study/2026-08-26`
report got wrong: it claimed no frontend demo-creation page exists for restaurant/store, only
booking. That was true of `DemoBuilderPage.jsx` (hardcoded `business_type: 'barbershop'`) but
**`DemoLauncher.jsx` already has a real, working `BusinessTypeSelector` offering all three**
(`restaurant`/`store`/`booking`) and already posts to the same real `/demo/create` endpoint with
whichever type is selected. A real, working self-serve demo flow for all 3 verticals **already
exists** — it was just never surfaced in the earlier study because that investigation only checked
`DemoBuilderPage.jsx`, not this separate, always-mounted global component. Corrected in memory.

## Confirmed Findings

1. **Root cause, confirmed via real computed-style check, not assumed**: the modal `motion.div`
   had both a static `style.transform: 'translate(-50%, -50%)'` (for centering) AND Framer
   Motion's own `animate={{ opacity, scale, y }}` (which drives the `transform` CSS property
   directly). `getComputedStyle(modal).transform` returned `"none"` — Framer Motion's own
   transform handling silently discarded the manual centering value. With `top: 50%; left: 50%`
   and no compensating offset, the panel's *top-left corner* sat at the viewport's exact center,
   pushing its body down-and-right and off the bottom edge — real measured overflow of ~113.6px
   below the viewport at 1600×900, matching Salman's screenshot exactly.
2. **Fix**: separated concerns — a new, plain (non-`motion`) outer wrapper does the centering via
   flexbox (`position: fixed; inset: 0; display: flex; align-items: center; justify-content:
   center`), which needs no `transform` at all and so can never conflict with Framer Motion's own
   transform on the inner `motion.div` (which now only carries the entrance animation).
   `pointerEvents: 'none'` on the outer wrapper + `'auto'` on the inner panel keeps backdrop-click-
   to-close working exactly as before.
3. **Real re-verification after the fix**: `fitsInViewport: true` (was `false`), vertical centering
   within 30px tolerance (was off by ~282px), horizontal centering within ~7.5px (was off by
   ~240px) — the residual 7.5px is consistent with half a scrollbar's width, not a real layout bug.
4. **Full end-to-end flow tested for real**, not just visually: opened the modal, switched business
   type to "حجز" (booking), filled both name fields, submitted, waited for the real `/demo/create`
   API call, confirmed the success view rendered with a real slug (`demo-code-verify-test-fd92`)
   and a real temp password — the actual creation flow works, not just its appearance.
5. **0 console errors** throughout every step (open, type-switch, fill, submit, success render).

## Side Findings

- The business-type selector defaults to `restaurant` (`useState('restaurant')`) and uses raw
  emoji icons (🏠🛍️🍽️) rather than this project's now-standard Lucide icon set — a real visual-
  language mismatch with every other page built this session, not touched here since it's outside
  what was asked (centering + verification only).
- A real trial tenant (`demo-code-verify-test-fd92`) now exists in the database from this
  verification pass — same category as every other verification-created demo tenant this session;
  no cleanup convention exists for these (a known, already-documented, pre-existing gap — no cron
  consumes `trial_ends_at` yet), not addressed here as it's out of this task's scope.

## Unknowns

- Not tested at mobile/tablet viewports in this pass — the fix (flexbox centering with viewport-
  relative padding) is the same responsive pattern already used elsewhere in this project and
  should hold, but wasn't independently re-verified at those breakpoints.

## Verification checklist

- [x] Real computed-style evidence for the root cause, not a guess.
- [x] Real re-measurement after the fix confirming the panel fits in viewport and is centered.
- [x] Full real end-to-end flow test (open → switch type → fill → submit → real API → success).
- [x] 0 console errors throughout.
