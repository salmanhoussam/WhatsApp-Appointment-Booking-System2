/**
 * plateAssets.js — swappable plate-layer config, same pattern as heroAssets.js.
 *
 * basePlate is a real Beit Al-Fakhar plate photo with its painted decoration
 * removed (Higgsfield edit, 2026-07-19) — same shape, rim, glaze, reflection,
 * and shadow as the real object. It is the one thing that must stay fixed:
 * decoration variants change on top of it, this photo never regenerates.
 *
 * decorationLayer is intentionally null — the Pattern Library (Blue Floral,
 * Olive Branch, Arabesque, Modern Minimal, ...) doesn't exist yet. Populate
 * this once those assets are generated; PlateHero already knows how to
 * render it, nothing else needs to change.
 */
export const plateAssets = {
  basePlate: {
    src: 'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beit-al-fakhar/pages/home/plates/base-plate.png',
    alt: 'صحن فخار — الشكل الأساسي بلا زخرفة',
  },
  decorationLayer: null,
  optionalShadow: null,
  optionalHighlight: null,
};
