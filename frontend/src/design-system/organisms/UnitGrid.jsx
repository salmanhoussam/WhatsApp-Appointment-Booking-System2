/**
 * UnitGrid.jsx  —  Organism  (Phase 33.1)
 *
 * Displays the full unit catalog for the current tenant.
 * Self-contained: calls useUnits() internally — zero unit props accepted.
 *
 * States handled:
 *   isLoading  — 6 animated Skeleton cards (same aspect ratio as a real UnitCard)
 *   error      — GS MAR glass error box + retry Button
 *   empty      — Soft empty-state message
 *   success    — Responsive 1→2→3 column grid of UnitCard molecules
 *
 * Optional props:
 *   lang       — 'ar' | 'en'  (default 'ar')  forwarded to each UnitCard
 *   currency   — string       (default 'USD')  forwarded to each UnitCard
 *   onSelect   — fn(unit)     called when user clicks a card's CTA
 *   className  — merged onto the root <section>
 *
 * Usage:
 *   <UnitGrid lang="ar" onSelect={(u) => navigate(`/${slug}/spatial/property/${u.id}`)} />
 */

import { useState } from 'react';
import { GoldDot, Skeleton, Button } from '../atoms';
import { UnitCard } from '../molecules';
import useUnits from '../../hooks/useUnits';

const FILTERS = [
  { key: 'all',    ar: 'الكل',     en: 'All'     },
  { key: 'chalet', ar: 'شاليهات',  en: 'Chalets' },
  { key: 'villa',  ar: 'فيلات',    en: 'Villas'  },
  { key: 'studio', ar: 'ستوديوهات',en: 'Studios' },
];

// ── Loading skeleton — mimics UnitCard proportions ────────────────────────────
function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      {/* image placeholder */}
      <Skeleton className="aspect-video w-full rounded-none" />
      {/* body */}
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-px w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <div className="flex items-center justify-between mt-1">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-1 w-1 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ── Error box ─────────────────────────────────────────────────────────────────
function ErrorBox({ message, onRetry }) {
  return (
    <div
      className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-8 text-center"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <div className="mb-4 flex justify-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10"
          aria-hidden="true"
        >
          <span className="text-red-400 text-xl">!</span>
        </div>
      </div>
      <p className="mb-1 text-sm font-semibold text-red-400 tracking-wide">
        تعذّر تحميل الوحدات
      </p>
      <p className="mb-6 text-xs text-white/40 leading-relaxed">
        {message}
      </p>
      <Button variant="ghost" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="mx-auto max-w-sm py-24 text-center">
      <div className="mb-6 flex justify-center">
        <GoldDot size="lg" pulse={false} />
      </div>
      <p className="text-sm text-white/30 tracking-[0.12em]">
        لا توجد وحدات متاحة حالياً
      </p>
    </div>
  );
}

// ── Main organism ─────────────────────────────────────────────────────────────
export default function UnitGrid({
  lang      = 'ar',
  currency  = 'USD',
  onSelect,
  className = '',
}) {
  const { units, isLoading, error, fetchUnits } = useUnits();
  const [activeFilter, setActiveFilter] = useState('all');

  const visibleUnits = activeFilter === 'all'
    ? units
    : units.filter(u => u.type === activeFilter);

  return (
    <section
      className={`container mx-auto px-4 py-12 ${className}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >

      {/* ── Category filter pills ── */}
      {!isLoading && !error && (
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key)}
              className="transition-all duration-200 focus-visible:outline-none"
              style={{
                padding: '7px 20px',
                borderRadius: 100,
                fontSize: 13,
                fontWeight: activeFilter === f.key ? 700 : 400,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                border: activeFilter === f.key
                  ? '1px solid rgba(212,168,83,0.6)'
                  : '1px solid rgba(255,255,255,0.10)',
                background: activeFilter === f.key
                  ? 'rgba(212,168,83,0.14)'
                  : 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: activeFilter === f.key ? '#d4a853' : 'rgba(255,255,255,0.55)',
              }}
            >
              {lang === 'ar' ? f.ar : f.en}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {!isLoading && error && (
        <ErrorBox message={error} onRetry={() => fetchUnits()} />
      )}

      {/* ── Empty ── */}
      {!isLoading && !error && visibleUnits.length === 0 && <EmptyState />}

      {/* ── Success ── */}
      {!isLoading && !error && visibleUnits.length > 0 && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {visibleUnits.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              lang={lang}
              currency={currency}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
