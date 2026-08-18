# Homepage Phase 2.3 — Services (black+gold theme) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3, Services row.
Same real, per-tenant `homepageTheme` opt-in mechanism established for Hero — `FeaturedItemsSection.jsx`
and `CatalogItemCard.jsx` (the latter shared by store/restaurant/catalog too) now branch on
`homepageTheme === 'black_gold'`, absent for every tenant except Mister H.

## What changed

- `frontend/src/design-system/molecules/CatalogItemCard.jsx` — new `homepageTheme` prop; when
  `'black_gold'`: card surface/border, service-icon placeholder gradient, "مميز" badge, price,
  item name/description, and the Book-Now/Add-to-Cart button all use `homepageTokens`/`themeAccent`
  instead of the raw `colors`/`accent` tenant values. Text-on-gold contrast fixed (near-black text
  on the gold badge/button, not white).
- `frontend/src/components/dynamic-sections/FeaturedItemsSection.jsx` — accepts `homepageTheme`,
  themes its own heading + underline rule, passes `homepageTheme` through to every
  `CatalogItemCard`.

## Live verification

| Check | Result |
|---|---|
| `mr-h` heading | `color: rgb(243,238,228)` (`homepageTokens.text`), `fontFamily: Tajawal, Cairo, sans-serif` (`homepageTokens.headingFont`) — confirmed via DOM, not visual guess |
| `mr-h` cards | Gold-tinted gradients, gold "مميز" badge, gold price, gold icons (Sparkles for كرياتين, Paintbrush for حنة أو صبغة, Wind for تمشيط) — screenshot-confirmed |
| `mr-h` section boundary | Confirmed visually: Services section is fully gold, the very next section (Hours) still shows the old purple underline/text — expected, Hours hasn't been migrated yet, not a bug |
| `rk` heading | `color: rgb(240,240,245)`, `fontFamily: Cairo, sans-serif` — the original pre-existing values, unchanged | 
| Console errors | 0 on both tenants |
| eslint | Same 2 pre-existing error classes (`motion` false-positive, `static-components` on the `ServiceIcon` pattern already accepted in the prior commit) — no new error types |

## Remaining Phase 2.3 sections

`WhyChooseUsSection` (new), `CtaSection` (2 variants), `GallerySection` (preview mode),
`LocationSection`, `Footer` (new, site-wide) — not started.
