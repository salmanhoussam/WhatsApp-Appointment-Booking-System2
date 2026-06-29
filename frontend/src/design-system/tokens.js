/**
 * tokens.js — Design System Tokens
 *
 * Single source of truth for all GS MAR design values.
 * Import from here instead of hardcoding values in components.
 *
 * Usage:
 *   import { colors, radius } from '../tokens';
 *   style={{ background: colors.gold }}
 */

export const colors = {
  gold:        '#d4a853',
  goldDim:     'rgba(212,168,83,0.12)',
  goldGlow:    'rgba(212,168,83,0.50)',
  dark:        '#0a0a0f',
  darkSurface: '#12121a',
  surface:     'rgba(255,255,255,0.03)',
  border:      'rgba(255,255,255,0.08)',
  borderGold:  'rgba(212,168,83,0.30)',
  textPrimary: '#f0ebe3',
  textMuted:   'rgba(255,255,255,0.45)',
  textDim:     'rgba(255,255,255,0.22)',
};

export const spacing = {
  1:  '0.25rem',   //  4px
  2:  '0.5rem',    //  8px
  3:  '0.75rem',   // 12px
  4:  '1rem',      // 16px
  6:  '1.5rem',    // 24px
  8:  '2rem',      // 32px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
};

export const radius = {
  sm:   '4px',
  md:   '8px',
  lg:   '14px',
  xl:   '18px',
  full: '50px',
};

export const blur = {
  sm: 'blur(8px)',
  md: 'blur(20px)',
  lg: 'blur(24px)',
};

export const typography = {
  eyebrow: {
    fontSize:      '0.6rem',
    letterSpacing: '0.46em',
    textTransform: 'uppercase',
    fontWeight:    700,
  },
  label: {
    fontSize:      '0.72rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    fontWeight:    600,
  },
  body: {
    fontSize:   '0.875rem',
    lineHeight: 1.75,
  },
};

export const glass = {
  background:           'rgba(255,255,255,0.03)',
  border:               '1px solid rgba(255,255,255,0.08)',
  backdropFilter:       'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};

export const shadow = {
  gold:   '0 4px 24px rgba(212,168,83,0.25)',
  goldHover: '0 8px 32px rgba(212,168,83,0.42)',
  panel:  '0 8px 48px rgba(0,0,0,0.40)',
};

export const transition = {
  fast:   'all 0.15s ease',
  normal: 'all 0.22s ease',
  slow:   'all 0.42s ease',
};

// Framer Motion spring presets (safe for React 19 — no MotionValue bindings)
export const spring = {
  premium: { type: 'spring', stiffness: 70,  damping: 20, mass: 1.5 },
  snappy:  { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 },
  smooth:  { type: 'spring', stiffness: 60,  damping: 20, mass: 1   },
};
