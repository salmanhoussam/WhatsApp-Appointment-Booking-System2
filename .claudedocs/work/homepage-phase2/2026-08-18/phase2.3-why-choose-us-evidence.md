# Homepage Phase 2.3 — Why Choose Us (new section) — Evidence

Contract: `ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md`, Phase 2.3, Why Choose Us
row. First genuinely new section built this phase (per
`ALZABT_HOMEPAGE_SECTION_EXPANSION_PROPOSAL.md` §2 — pure authored content, no live data, no
photography needed, the cheapest new section named in that proposal).

## What changed

- `frontend/src/components/dynamic-sections/WhyChooseUsSection.jsx` (new) — `data: {heading_ar,
  items: [{icon_key, title_ar, body_ar}]}`, up to 4 cards, `icon_key` maps to a small fixed
  lucide-react set (`classic`→Sparkles, `quick_booking`→Zap, `pro_stylists`→Award, `luxury`→Gem,
  `trusted`→ShieldCheck) — same lookup-table pattern `utils/serviceIcons.js` already established,
  not a free-form icon field. Same `homepageTheme` opt-in as every other section this phase.
- `frontend/src/components/dynamic-sections/index.js`, `DynamicPage.jsx` — registered
  `why_choose_us` in the section export list and `SECTION_MAP`.
- `scripts/add_why_choose_us_mrh.py` (one-off, real content seed) — added a real
  `why_choose_us` section to Mister H's `content.sections[]` with 4 real, non-fabricated Arabic
  items (generic value-prop taglines — precision/classic-modern cuts, WhatsApp quick booking,
  professional stylists, luxury dark+gold atmosphere — no specific factual/operational claims like
  "walk-ins welcome" that couldn't be verified).
- Real reorder (via the Phase 2.1 endpoint) placing it right after Services:
  `hero → featured_items → why_choose_us → staff → gallery → story → hours → location → cta`.
  Placement is my own judgment call (matching the Expansion Proposal's original recommendation of
  a trust-building bridge right after Services), not explicitly specified by Salman — flagged here
  rather than silently assumed as "the" answer; trivially changeable via the same reorder endpoint.

## Live verification

| Check | Result |
|---|---|
| `mr-h` render | All 4 cards render with correct gold icons/text: أجواء فاخرة (Gem), حلاقين محترفين (Award), حجز سريع (Zap), قص عصري وكلاسيكي (Sparkles) — screenshot-confirmed |
| DOM section order | `s_hero, s_featured, s_why_choose_us, s_staff, s_gallery, s_story, s_hours, s_location, s_cta` — exact match to the reorder call |
| Console errors | 0 |
| `rk` | `s_why_choose_us` does not exist in the DOM at all — RK's config was never touched, confirmed via curl before/after and browser after. 0 console errors |

## Note on tooling interruption

This section's implementation was split across two turns because of a real, external Bash-tool
overload (the safety classifier was unavailable for several consecutive attempts) — the component
was built and registered first, then the DB seed/reorder/verification happened once the tool
recovered. No half-applied state occurred: every attempt that failed, failed before executing (per
the tool's own error), so nothing was silently partial.
