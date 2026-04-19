/**
 * UnitCard.jsx — Molecule
 *
 * Displays a single real-estate unit (Villa / Chalet / Studio).
 * Composes Atoms only — ZERO data fetching, ZERO routing.
 *
 * Props:
 *   unit       — { id, name_ar, name_en, description_ar, description_en, capacity, price, image_url, type, available }
 *   lang       — 'ar' | 'en'  (default 'ar')
 *   currency   — string passed to <PriceTag> (default 'USD')
 *   onSelect   — fn(unit) — called when the CTA button is clicked
 *   className  — merged onto the root GlassCard
 *
 * Usage:
 *   <UnitCard unit={unit} lang="ar" onSelect={(u) => openDrawer(u)} />
 */

import { GlassCard, Badge, PriceTag, Button } from '../atoms';

// Fallback image if unit.image_url is missing or broken
const FALLBACK_IMG =
  'https://wefjghagwpkotrrdiqyi.supabase.co/storage/v1/object/public/properties/beitsmar/homepage/beitsmar7.jpg';

// Map unit.type to a display label
const TYPE_LABEL = {
  villa:  { ar: 'فيلا',    en: 'Villa'   },
  chalet: { ar: 'شاليه',   en: 'Chalet'  },
  studio: { ar: 'ستوديو',  en: 'Studio'  },
  suite:  { ar: 'سويت',    en: 'Suite'   },
};

export default function UnitCard({
  unit,
  lang      = 'ar',
  currency  = 'USD',
  onSelect,
  className = '',
}) {
  if (!unit) return null;

  const {
    id,
    name_ar,
    name_en,
    description_ar,
    description_en,
    capacity,
    price,
    image_url,
    type      = 'chalet',
    available = true,
  } = unit;

  const displayName = lang === 'ar' ? (name_ar || name_en) : (name_en || name_ar);
  const displayDesc = lang === 'ar' ? (description_ar || description_en) : (description_en || description_ar);
  const typeLabel   = TYPE_LABEL[type]?.[lang] ?? type;
  const imgSrc      = image_url || FALLBACK_IMG;
  const badgeVariant = available ? 'available' : 'booked';
  const badgeLabel   = available
    ? (lang === 'ar' ? 'متاح'   : 'Available')
    : (lang === 'ar' ? 'محجوز'  : 'Booked');
  const ctaLabel     = lang === 'ar' ? 'عرض التفاصيل' : 'View Details';

  return (
    <GlassCard
      className={`flex flex-col overflow-hidden group cursor-pointer p-0 ${className}`}
    >

      {/* ── Image Section ──────────────────────────────────────────────── */}
      <div className="relative aspect-video w-full overflow-hidden flex-shrink-0">

        <img
          src={imgSrc}
          alt={displayName}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
          className="
            w-full h-full object-cover
            transition-transform duration-700 ease-out
            group-hover:scale-105
          "
        />

        {/* Dark gradient — bottom edge bleeds into the card body */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,10,15,0.10) 0%, transparent 40%, rgba(10,10,15,0.70) 100%)',
          }}
        />

        {/* Availability badge — top right */}
        <div className="absolute top-3 right-3">
          <Badge variant={badgeVariant} dot={available}>
            {badgeLabel}
          </Badge>
        </div>

        {/* Unit type badge — top left */}
        <div className="absolute top-3 left-3">
          <Badge variant="featured">
            {typeLabel}
          </Badge>
        </div>

      </div>

      {/* ── Card Body ──────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 p-4 flex-1"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >

        {/* Gold hairline separator */}
        <div
          className="h-px w-full opacity-30"
          style={{
            background: 'linear-gradient(to right, transparent, #d4a853, transparent)',
          }}
        />

        {/* Unit name */}
        <h3
          className="
            text-sm font-semibold text-white/90
            leading-snug tracking-wide
            line-clamp-2
          "
        >
          {displayName}
        </h3>

        {/* Description */}
        {displayDesc && (
          <p className="text-xs text-white/45 leading-relaxed line-clamp-2">
            {displayDesc}
          </p>
        )}

        {/* Capacity */}
        {capacity && (
          <p className="text-xs text-[#d4a853]/70 tracking-wide">
            {lang === 'ar' ? `يتسع لـ ${capacity} أشخاص` : `Up to ${capacity} guests`}
          </p>
        )}

        {/* Price row */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <PriceTag
            price={price}
            currency={currency}
            lang={lang}
            size="md"
          />

          {/* Decorative dot separator */}
          <div
            className="h-1 w-1 rounded-full bg-[#d4a853]/30 flex-shrink-0"
          />
        </div>

        {/* CTA */}
        <Button
          variant={available ? 'gold' : 'ghost'}
          disabled={!available}
          className="w-full mt-1"
          onClick={() => onSelect?.(unit)}
          aria-label={`${ctaLabel} — ${displayName}`}
        >
          {available
            ? ctaLabel
            : (lang === 'ar' ? 'غير متاح' : 'Unavailable')}
        </Button>

      </div>
    </GlassCard>
  );
}
