/**
 * ListingsTemplate.jsx — Template
 *
 * Assembles the dynamic listings page from atomic organisms.
 * No data fetching here — UnitGrid owns its own data via useUnits().
 *
 * Composition:
 *   TenantHeader   — sticky nav
 *   UnitGrid       — fetches + renders unit cards, calls onSelect when user picks one
 *   BookingFlow    — full-screen overlay, mounts when a unit is selected
 *
 * Overlay pattern:
 *   Selecting a unit mounts BookingFlow in a fixed z-[100] overlay.
 *   No navigation — the booking wizard lives on top of the listings page.
 *
 * FM12 / React 19 safety:
 *   Overlay fade uses animate={{ opacity: 1 }} on a plain motion.div — no MotionValues.
 */

import { useState }    from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TenantHeader, UnitGrid, BookingFlow } from '../design-system/organisms';

// ── Overlay fade variants — plain objects, no MotionValues ────────────────────
const OVERLAY_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};
const OVERLAY_TRANSITION = { duration: 0.2, ease: 'easeOut' };

// ── Template ──────────────────────────────────────────────────────────────────
export default function ListingsTemplate() {
  const [selectedUnit, setSelectedUnit] = useState(null);

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white">

      {/* ── Sticky navigation ────────────────────────────────────────────────── */}
      <TenantHeader />

      {/* ── Unit grid — pt-24 clears the fixed header (h-66 ≈ 66px) ─────────── */}
      <main className="pt-24 pb-12">
        <UnitGrid
          lang="ar"
          onSelect={setSelectedUnit}
        />
      </main>

      {/* ── BookingFlow overlay ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedUnit && (
          <motion.div
            key="booking-overlay"
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#0a0a0f]/80 p-4 pt-10 backdrop-blur-sm"
            variants={OVERLAY_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={OVERLAY_TRANSITION}
            // Clicking the backdrop (not the card) closes the overlay
            onMouseDown={e => {
              if (e.target === e.currentTarget) setSelectedUnit(null);
            }}
          >
            <BookingFlow
              unit={selectedUnit}
              onCancel={() => setSelectedUnit(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
