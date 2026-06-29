/**
 * GoldDot.jsx — Atom
 *
 * ZERO business logic. The canonical Beit Smar loading / fallback indicator.
 * A glowing gold circle used in loading states, empty states, and error fallbacks.
 *
 * Props:
 *   size      — 'sm' | 'md' | 'lg' — controls diameter
 *   pulse     — boolean (default true), enables the pulse animation
 *   className — merged onto wrapper
 *
 * Usage:
 *   <GoldDot />                          default pulsing dot
 *   <GoldDot size="lg" />                large dot
 *   <GoldDot pulse={false} />            static, no animation
 *
 *   Full loading screen:
 *   <div className="flex flex-col items-center gap-4">
 *     <GoldDot size="lg" />
 *     <span className="text-white/25 text-[10px] tracking-[0.3em] uppercase">
 *       Loading…
 *     </span>
 *   </div>
 */

const SIZES = {
  sm: { dot: 'h-1.5 w-1.5', ping: 'h-1.5 w-1.5', glow: '0 0 10px rgba(212,168,83,0.45)' },
  md: { dot: 'h-2.5 w-2.5', ping: 'h-2.5 w-2.5', glow: '0 0 18px 4px rgba(212,168,83,0.50)' },
  lg: { dot: 'h-4 w-4',     ping: 'h-4 w-4',     glow: '0 0 28px 8px rgba(212,168,83,0.55)' },
};

export default function GoldDot({ size = 'md', pulse = true, className = '' }) {
  const s = SIZES[size] ?? SIZES.md;

  return (
    <span
      className={`relative inline-flex flex-shrink-0 ${s.dot} ${className}`}
      aria-hidden="true"
    >
      {/* Outer ping — subtle scale animation for "live" feel */}
      {pulse && (
        <span
          className={`absolute inline-flex ${s.ping} animate-ping rounded-full bg-[#d4a853] opacity-40`}
        />
      )}

      {/* Core dot */}
      <span
        className={`relative inline-flex ${s.dot} rounded-full bg-[#d4a853]`}
        style={{ boxShadow: s.glow }}
      />
    </span>
  );
}
