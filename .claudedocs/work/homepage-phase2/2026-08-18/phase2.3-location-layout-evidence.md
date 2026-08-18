# Homepage Phase 2.3 — Location two-column info-vs-map layout — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3, Location row —
the last remaining item, closing out Phase 2.3 entirely.

## What changed

`frontend/src/components/dynamic-sections/LocationSection.jsx` — restructured the paragraph/tags/
map from a stacked single-column layout into a flex row: info block (`flex: '1 1 260px'`) next to
the map (`flex: '2 1 320px'`, roughly double the growth weight — the "small quiet info column next
to a visually larger map" asymmetry named in the Design Spec §3.5). No fixed-breakpoint media query
— same responsive-without-breakpoints convention already used elsewhere (flex naturally stacks once
the two blocks no longer fit side by side). Info-only (no `maps_url`) still takes the full width,
unchanged from before.

## Live verification

Neither real tenant (`mr-h`, `rk`) has a real `maps_url` set yet, so a temporary test value was
used to actually exercise the layout (same approach as the Gallery preview test), then reverted:

| Check | Result |
|---|---|
| Desktop geometry | Info column `406.67px`, map column `613.33px` — confirmed via `getBoundingClientRect()`, roughly the intended 40/60 asymmetry |
| Mobile (390px) stacking | Both blocks measured `327px` wide (full available width) at different vertical `top` positions — confirmed they stack, not squeeze side-by-side. `scrollWidth === clientWidth` (375/375) — no horizontal overflow regression |
| Console error during the test | One real `400` network error from the test's own invalid/fabricated `pb=` embed parameter (Google rejected the fake URL) — not an application bug; the iframe box itself rendered at the correct size regardless. Not present after reverting |
| Revert confirmed | Direct config re-read: `maps_url` removed, Mister H back to its real current state (no map, info-only) |
| `rk` | Location section still returns `null` entirely (its `para_ar` is a known, pre-existing placeholder value, per the earlier P2 honesty rule) — nothing to regress, 0 console errors |

## Phase 2.3 — closed

All items from the Contract's Phase 2.3 table are now done: Hero, Services, Staff/Team, Gallery
(theme + preview mode), Story, Hours, Location (theme + layout), Why Choose Us, CTA (variants),
Footer. Real content for Location's map itself remains a genuine content gap (needs the real Google
Maps embed URL from Salman/Ali) — not a code gap, same distinction already drawn for this section
in the Expansion Proposal.
