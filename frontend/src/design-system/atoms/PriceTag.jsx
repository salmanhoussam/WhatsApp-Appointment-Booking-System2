/**
 * PriceTag.jsx — Atom
 *
 * ZERO business logic. Pure price display component.
 *
 * Props:
 *   price      — number, the amount to display
 *   currency   — string, currency code (default 'USD')
 *   period     — string, billing period label (default '/ night' | '/ ليلة')
 *   size       — 'sm' | 'md' | 'lg' — controls font scaling
 *   lang       — 'ar' | 'en' — controls period label direction + locale formatting
 *   className  — merged onto wrapper
 *   strikethrough — boolean, renders price with a line-through (for discounts)
 *
 * Usage:
 *   <PriceTag price={250} currency="USD" />
 *   <PriceTag price={850000} currency="LBP" lang="ar" size="lg" />
 *   <PriceTag price={300} strikethrough className="opacity-50" />
 */

const SIZE = {
  sm: { price: 'text-lg',  currency: 'text-[10px]', period: 'text-[9px]'  },
  md: { price: 'text-2xl', currency: 'text-xs',      period: 'text-[10px]' },
  lg: { price: 'text-3xl', currency: 'text-sm',      period: 'text-xs'     },
};

const PERIOD_LABEL = {
  ar: '/ ليلة',
  en: '/ night',
};

export default function PriceTag({
  price,
  currency     = 'USD',
  period,
  size         = 'md',
  lang         = 'en',
  className    = '',
  strikethrough = false,
}) {
  const s = SIZE[size] ?? SIZE.md;

  const periodLabel = period ?? PERIOD_LABEL[lang] ?? PERIOD_LABEL.en;

  // Format number with locale separators
  const formattedPrice = typeof price === 'number'
    ? price.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')
    : price ?? '—';

  return (
    <div
      className={`inline-flex items-baseline gap-1 ${strikethrough ? 'line-through' : ''} ${className}`}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Currency — left of price in LTR, right in RTL (CSS handles via dir) */}
      <span className={`${s.currency} text-white/40 font-medium tracking-wide`}>
        {currency}
      </span>

      {/* Price — gold, large, prominent */}
      <span className={`${s.price} text-[#d4a853] font-bold leading-none tracking-tight`}>
        {formattedPrice}
      </span>

      {/* Period — muted, small */}
      <span className={`${s.period} text-white/30 tracking-wide`}>
        {periodLabel}
      </span>
    </div>
  );
}
