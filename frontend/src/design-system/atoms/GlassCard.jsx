/**
 * GlassCard.jsx — Atom
 *
 * ZERO business logic. Pure GS MAR glassmorphism wrapper.
 *
 * The canonical "glass panel" for the entire design system.
 * Wrap any content in this to get the dark frosted-glass look.
 *
 * Props:
 *   children  — any React node
 *   className — merged with default glass styles (controls padding, width, etc.)
 *   goldAccent — boolean, adds a gold hairline at the top border
 *   as        — element tag to render as (default 'div')
 *   ...props  — forwarded to the root element
 *
 * Usage:
 *   <GlassCard className="p-6 max-w-sm" goldAccent>
 *     <h2>Content</h2>
 *   </GlassCard>
 *
 *   <GlassCard as="section" className="p-8">
 *     <UnitCard ... />
 *   </GlassCard>
 */

const BASE = [
  'relative',
  'bg-white/[0.02]',
  'backdrop-blur-lg',
  'border border-white/[0.08]',
  'rounded-[18px]',
].join(' ');

export default function GlassCard({
  children,
  className    = 'p-6',
  goldAccent   = false,
  as: Tag      = 'div',
  ...props
}) {
  return (
    <Tag className={`${BASE} ${className}`} {...props}>

      {/* Gold hairline top accent — optional */}
      {goldAccent && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px"
          style={{
            background: 'linear-gradient(to right, transparent, #d4a853 40%, #d4a853 60%, transparent)',
          }}
        />
      )}

      {children}
    </Tag>
  );
}
