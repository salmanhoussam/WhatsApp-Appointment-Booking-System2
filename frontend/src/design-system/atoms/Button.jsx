/**
 * Button.jsx — Atom
 *
 * ZERO business logic. ZERO routing. ZERO data fetching.
 * Pure UI — accepts props, emits onClick.
 *
 * Variants:
 *   gold    — Gold gradient background, dark text. Primary CTA.
 *   primary — Same as gold (alias for semantic clarity).
 *   ghost   — Transparent bg, white/10 border, white text.
 *   danger  — Red tint, for destructive actions.
 *
 * React 19 + FM12 safe:
 *   Only whileHover / whileTap gesture props — no MotionValue style bindings.
 *
 * Usage:
 *   <Button variant="gold" onClick={handleBook}>احجز الآن</Button>
 *   <Button variant="ghost" disabled>...</Button>
 */

import { forwardRef } from 'react';
import { motion }     from 'framer-motion';

const VARIANTS = {
  gold: [
    'bg-gradient-to-br from-[#d4a853] to-[#b8892e]',
    'text-[#0a0a0f]',
    'border border-transparent',
    'shadow-[0_4px_24px_rgba(212,168,83,0.25)]',
    'hover:shadow-[0_8px_32px_rgba(212,168,83,0.42)]',
    'font-semibold',
  ].join(' '),

  primary: [
    'bg-gradient-to-br from-[#d4a853] to-[#b8892e]',
    'text-[#0a0a0f]',
    'border border-transparent',
    'shadow-[0_4px_24px_rgba(212,168,83,0.25)]',
    'hover:shadow-[0_8px_32px_rgba(212,168,83,0.42)]',
    'font-semibold',
  ].join(' '),

  ghost: [
    'bg-white/5',
    'text-white/70',
    'border border-white/10',
    'hover:bg-white/10',
    'hover:border-white/20',
    'hover:text-white',
    'font-medium',
  ].join(' '),

  danger: [
    'bg-red-500/10',
    'text-red-400',
    'border border-red-500/20',
    'hover:bg-red-500/20',
    'hover:border-red-500/40',
    'font-medium',
  ].join(' '),
};

const BASE = [
  'inline-flex items-center justify-center gap-2',
  'px-5 py-2.5',
  'rounded-[8px]',
  'text-xs tracking-[0.18em] uppercase',
  'cursor-pointer',
  'select-none',
  'transition-all duration-200',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
  'outline-none',
  'focus-visible:ring-2 focus-visible:ring-[#d4a853]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]',
].join(' ');

const Button = forwardRef(function Button(
  { variant = 'gold', children, className = '', disabled, ...props },
  ref,
) {
  const variantClasses = VARIANTS[variant] ?? VARIANTS.ghost;

  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled  ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}
      className={`${BASE} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
});

export default Button;
