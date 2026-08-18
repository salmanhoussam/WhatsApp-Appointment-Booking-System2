# Homepage Phase 2.3 — Gallery preview mode (`limit`/`gallery_link`) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3, Gallery row —
the remaining feature-scope item (theme was already done in an earlier pass this session).

## What changed

`frontend/src/components/dynamic-sections/GallerySection.jsx` — `data.limit` (same convention
`featured_items.limit` already establishes: slice the slots array before rendering) and
`data.gallery_link` (optional "عرض الكل ←" link in the header, next to the underline rule).
Unset (every tenant today) behaves exactly as before.

## Live verification

| Check | Result |
|---|---|
| `mr-h`, no `limit` set (real, permanent state) | All 4 real slots render — unaffected, confirmed via SVG count (4 placeholder icons) |
| `mr-h`, temporary test with `limit: 2, gallery_link: "/mr-h/gallery"` | Confirmed exactly 2 tiles render, "See All" link renders with the correct `href` — then reverted, confirmed via a direct config re-read that Mister H is back to its real 4-slot, no-limit state (no `gallery_link` left dangling to a route that doesn't exist yet) |
| Console errors | 0 throughout |
| `rk` | Gallery already returns `null` (`images: []`, pre-existing) regardless of this change — nothing to regress |
