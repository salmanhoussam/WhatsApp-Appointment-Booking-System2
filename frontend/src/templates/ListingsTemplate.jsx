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

import { useState }                                             from 'react';
import { TenantHeader, UnitGrid, BookingDrawer,
         TenantFooter }                                        from '../design-system/organisms';

// ── Template ──────────────────────────────────────────────────────────────────
export default function ListingsTemplate() {
  const [selectedUnit, setSelectedUnit] = useState(null);

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white">

      {/* ── Sticky navigation ── */}
      <TenantHeader />

      {/* ── Unit grid — pt-24 clears the fixed header ── */}
      <main className="pt-24 pb-12">
        <UnitGrid
          lang="ar"
          onSelect={setSelectedUnit}
        />
      </main>

      {/* ── Booking drawer — manages its own AnimatePresence + slide animation ── */}
      <BookingDrawer
        isOpen={!!selectedUnit}
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
      />

      <TenantFooter />
    </div>
  );
}
