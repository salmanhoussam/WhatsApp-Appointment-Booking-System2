/**
 * OlivelloShowcase.jsx — Main showcase page for Olivello tenant
 *
 * "رحلة زيتونة" — 7 sections, scroll-driven narrative.
 *
 *   1. TreeSection        ✅ Phase C — 2.5D parallax hero
 *   2. HarvestSection     ✅ Phase C — stagger cards
 *   3. MillSection        ✅ Phase C — spotlight reveal
 *   4. DonkeySection      ✅ Phase D — scroll-speed rotation
 *   5. PasteSection       ✅ Phase D — splash ripple + char reveal
 *   6. PressSection       ✅ Phase D — 5 mat layers stagger
 *   7. GoldenDropSection  ✅ Phase D — SVG fill + confetti + CTA
 *   8. ProductsSection    ✅ Phase E — store grid + cart FAB
 */

import { useEffect } from 'react';
import '../olivello.css';
import TreeSection        from './TreeSection';
import HarvestSection     from './HarvestSection';
import MillSection        from './MillSection';
import DonkeySection      from './DonkeySection';
import PasteSection       from './PasteSection';
import PressSection       from './PressSection';
import GoldenDropSection  from './GoldenDropSection';
import ProductsSection    from './ProductsSection';

export default function OlivelloShowcase() {
  useEffect(() => {
    document.body.setAttribute('data-slug', 'olivello');
    return () => document.body.removeAttribute('data-slug');
  }, []);

  return (
    <main style={{ background: 'oklch(22% 0.05 100)', overflowX: 'hidden' }}>
      <TreeSection />
      <HarvestSection />
      <MillSection />
      <DonkeySection />
      <PasteSection />
      <PressSection />
      <GoldenDropSection />
      <ProductsSection />
    </main>
  );
}
