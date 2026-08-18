/**
 * Homepage visual-language tokens — Phase 2.2.
 *
 * Scope, per ALZABT_MISTER_H_HOMEPAGE_PHASE2_IMPLEMENTATION_CONTRACT.md §5.3 (resolved
 * 2026-08-18): scoped to the homepage/dynamic-sections rendering system, NOT the whole
 * design-system, NOT the booking flow. `ReservePage.jsx`'s own dark-purple/gold theme (derived
 * from `Client.primary_color`) is deliberately untouched by this file — §5.2's ratified decision
 * is that the homepage uses a fixed black+gold palette while booking keeps its own tenant-accent
 * palette, as two separate visual registers on purpose, not one enforced site-wide color.
 *
 * This file only defines the tokens. No component consumes it yet (Phase 2.3's job) — per the
 * Contract, Phase 2.2 is deliberately scoped to "freeze the values," not "wire them in."
 *
 * Fonts reference the family stack already loaded site-wide (frontend/index.html's Google Fonts
 * link — Cairo/Tajawal/Playfair Display/Space Mono) rather than introducing a new webfont:
 * Playfair Display has no Arabic glyphs, so it's not usable for this tenant's real Arabic content;
 * Tajawal at a heavy weight (already loaded at 800/900) is the closest real match to the
 * reference's "condensed, bold, tall, editorial" display register while still rendering Arabic
 * correctly.
 */

export const homepageTokens = {
  // Base surfaces
  background: '#080808', // near-black, matches the reference images directly (not #000 -- a true
                          // black reads flat on OLED/most displays; #080808 keeps depth)
  surface: '#141414', // one step up -- cards, the promo-strip's "dark charcoal card" treatment

  // Text
  text: '#F3EEE4', // warm off-white, never pure #FFFFFF -- Design Spec §2.1's explicit rule
  mutedText: '#A79E8E', // warm-toned muted gray, for body copy that shouldn't compete with headings

  // Accent — reuses the exact gold already established in ReservePage.jsx (`GOLD = '#D9A441'`),
  // deliberately the same value so the two separate visual registers (§5.2) still share one real
  // brand gold rather than two subtly different "gold"s
  accent: '#D9A441',

  // Structure
  border: 'rgba(217, 164, 65, 0.22)', // thin gold-tinted border -- the reference's frame/mirror-trim
                                       // accent, used sparingly (cards, dividers), never a heavy line
  overlay: 'linear-gradient(180deg, rgba(8,8,8,0) 0%, rgba(8,8,8,0.55) 55%, rgba(8,8,8,0.92) 100%)',
  // ^ the "photo fades into black" treatment named repeatedly in both briefs -- for hero/service
  // card media, not a flat scrim

  // Typography — three registers per Design Spec §2.2, all from the already-loaded font stack
  headingFont: "'Tajawal', 'Cairo', sans-serif", // display register: heavy weight (800/900) at
                                                   // call sites -- closest real match to
                                                   // "condensed, bold, tall, editorial" that still
                                                   // renders Arabic
  bodyFont: "'Cairo', 'Tajawal', sans-serif", // already the site's own default body font
                                                // (DynamicPage.jsx's existing fontFamily) -- reused,
                                                // not replaced
  // No separate "label font": Arabic has no uppercase transform, so the eyebrow/label register
  // (e.g. "قريباً"-style small tags) is `bodyFont` at a smaller size + `accent` color + wider
  // letter-spacing, not a distinct font family -- Space Mono (also loaded) has no Arabic glyphs
  // and would silently fall back for any Arabic label text, so it's not used here.

  // Spacing — the reference's "breathing room", not the current homepage's tighter default
  spacing: {
    sectionGapDesktop: '96px',
    sectionGapMobile: '56px',
    element: '24px',
    tight: '12px',
  },
}
