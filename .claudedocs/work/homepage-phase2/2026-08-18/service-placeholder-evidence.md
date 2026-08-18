# Service card placeholder — richer generic visual — Evidence

Second half of Salman's feedback (first half: the Book Now CTA fix, see
`service-cta-fix-evidence.md`): don't leave empty diamond-icon boxes on service cards without
photos. Asked via `AskUserQuestion` which sourcing approach, given a real tension with this
session's own earlier ratified "generic/abstract images only" rule
(`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md`) — answer: **richer generic visual, no external
photos** (gradient + per-service icon, no network fetch, no licensing/sourcing question).

## What changed

- `frontend/src/utils/serviceIcons.js` (new) — `serviceIconFor(nameAr)`, extracted from
  `ReservePage.jsx`'s previously-private `SERVICE_ICONS`/`serviceIconFor` (real, existing mapping
  already matching Mister H/RK's real service names — not invented). `ReservePage.jsx` now imports
  it instead of keeping its own copy (one canonical function, not two drifting ones).
- `frontend/src/design-system/molecules/CatalogItemCard.jsx` — when a real bookable service
  (`onBookNow` present) has no `image_url`, renders a radial-gradient tint (in the item's own
  `accent` color) + the matched Lucide icon, instead of the old flat "◈" glyph. Scoped to
  `onBookNow` only — store/restaurant items without a photo keep the original plain fallback
  unchanged, since the service-name icon mapping would be wrong for e.g. a food item.

## Why this isn't a new hardcoded-media violation

The fallback is a CSS gradient + a vector icon, not an image asset — no URL, no file, nothing
stored anywhere. The instant a real photo is uploaded via the Dashboard (existing upload flow,
already built per `StaffTab.jsx`), `item.image_url` becomes truthy and this fallback never renders
again — exactly the "changeable from the dashboard" requirement, satisfied by construction rather
than by a second data path.

## Live verification

| Check | Result |
|---|---|
| `mr-h` — "دقن" (Beard) | `UserRound` icon, purple-tinted gradient (still `primary_color` — Services hasn't been migrated to the black+gold `homepageTheme` yet, expected) |
| `mr-h` — "تمشيط أو تسريح" (Styling) | `Wind` icon, correctly distinct from the Beard card |
| `rk` — "حنة أو صبغة" (Henna/Dye) | Same treatment, RK's own teal (`#2F4F4F`) accent flows into the gradient correctly — confirms the fallback stays per-tenant accent-driven, not a hardcoded color |
| Console errors | 0 on both tenants |
| eslint | `motion` false-positive and the pre-existing `static-components` warning (already present on the identical pattern in `ReservePage.jsx`'s own `ServiceCircle`) — both confirmed pre-existing, not introduced here |

## Known, deliberate non-goal

Services section's overall visual theme (dark tokens, black+gold) is still pending — this fix only
touches the image-fallback treatment, not the card's surrounding colors/typography, which is the
next Phase 2.3 sub-step already planned.
