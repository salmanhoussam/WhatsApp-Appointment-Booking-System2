/**
 * Badge.jsx — Atom
 *
 * ZERO business logic. ZERO routing. ZERO data fetching.
 * Status indicator pill with semantic color variants.
 *
 * Props:
 *   variant   — 'available' | 'booked' | 'pending' | 'featured' | 'new'
 *   children  — label text
 *   dot       — boolean, shows a pulsing indicator dot before text
 *   className — merged onto wrapper
 *
 * Usage:
 *   <Badge variant="available">متاح</Badge>
 *   <Badge variant="booked" dot>محجوز</Badge>
 */

const VARIANTS = {
  available: {
    wrapper: 'bg-green-500/10 border-green-500/20 text-green-400',
    dot:     'bg-green-400',
  },
  booked: {
    wrapper: 'bg-red-500/10 border-red-500/20 text-red-400',
    dot:     'bg-red-400',
  },
  pending: {
    wrapper: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    dot:     'bg-amber-400',
  },
  featured: {
    wrapper: 'bg-[#d4a853]/10 border-[#d4a853]/25 text-[#d4a853]',
    dot:     'bg-[#d4a853]',
  },
  new: {
    wrapper: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
    dot:     'bg-sky-400',
  },
};

const BASE = [
  'inline-flex items-center gap-1.5',
  'px-2.5 py-1',
  'rounded-full',
  'border',
  'text-[9px] font-semibold tracking-[0.28em] uppercase',
  'select-none',
].join(' ');

export default function Badge({ variant = 'available', children, dot = false, className = '' }) {
  const v = VARIANTS[variant] ?? VARIANTS.available;

  return (
    <span className={`${BASE} ${v.wrapper} ${className}`}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          {/* Ping animation for "available" live indicator feel */}
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${v.dot}`}
          />
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${v.dot}`} />
        </span>
      )}
      {children}
    </span>
  );
}
