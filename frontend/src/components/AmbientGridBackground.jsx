/**
 * AmbientGridBackground.jsx — shared decorative background (MESSAGE-07, 2026-09-01; richer pass
 * same day after Salman's reference screenshot -- the first version, a subtle diagonal grid sweep,
 * read as too flat/plain compared to what he wanted).
 *
 * Extracted from ProductShowcaseHome.jsx (Alzabt's own homepage, its first real use) so any other
 * page (RK's DynamicPage.jsx, ReservePage.jsx's booking flow) can reuse the exact same visual, not
 * re-derive it -- Salman's explicit instruction was "نفس الشي" (the same thing).
 *
 * Whole-page, position:fixed, behind every section (the mounting page must wrap its real content
 * in its own `position:relative;zIndex:1` wrapper -- this component never does that itself, since
 * it doesn't own the page's layout).
 *
 * Two visual layers, both driven by ONE `accent` color (the tenant's own primary_color — never a
 * hardcoded color, never gold, regardless of caller):
 *   1. Three large, soft, blurred glow blobs (radial gradients) drifting/pulsing slowly and
 *      independently — this is the "more color" layer added 2026-09-01 after the reference
 *      screenshot showed a much more vivid, colorful look than the original flat grid-only
 *      version. Two blobs use `accent` itself, one uses a lightened tint of it, so the glow reads
 *      as layered/rich rather than one flat color.
 *   2. The original fine diagonal grid + one slow light sweep (kept, now secondary/structural
 *      rather than the whole effect).
 * `prefers-reduced-motion` disables all animation (grid, sweep, and blob drift) — reduces to a
 * static, non-animated glow + grid. `aria-hidden` + `pointerEvents:none` — decorative only, never
 * intercepts clicks/taps.
 *
 * Props:
 *   accent       {string}  glow/grid line color — default matches Alzabt's own violetLight (#C084FC)
 *   waveOpacity  {number}  0-1, opacity of the grid's light-sweep layer, default 0.6 (bumped from
 *                          0.32 -- Salman's real-browser feedback 2026-09-01: the sweep read as
 *                          "is something even lighting up?", took too long to notice — also sped
 *                          up 26s->10s and given its own glow filter, same feedback round)
 */

function hexToRgba(hex, alpha) {
  const h = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (h.length !== 6) return `rgba(192, 132, 252, ${alpha})`; // #C084FC as rgba
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenHex(hex, amount) {
  const h = typeof hex === 'string' ? hex.replace('#', '') : '';
  if (h.length !== 6) return '#d9b8ff';
  const chan = (i) => Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * amount));
  return `rgb(${chan(0)}, ${chan(2)}, ${chan(4)})`;
}

export default function AmbientGridBackground({ accent = '#C084FC', waveOpacity = 0.6 }) {
  const accentLight = lightenHex(accent, 0.35);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      <style>{`
        .ambient-glow-a { animation: ambientGlowA 19s ease-in-out infinite; }
        .ambient-glow-b { animation: ambientGlowB 23s ease-in-out infinite; }
        .ambient-glow-c { animation: ambientGlowC 27s ease-in-out infinite; }
        @keyframes ambientGlowA {
          0%, 100% { transform: translate(-6%, -8%) scale(1);    opacity: 0.55; }
          50%      { transform: translate(4%, 6%) scale(1.15);   opacity: 0.85; }
        }
        @keyframes ambientGlowB {
          0%, 100% { transform: translate(8%, 10%) scale(1.1);   opacity: 0.4; }
          50%      { transform: translate(-5%, -6%) scale(0.9);  opacity: 0.7; }
        }
        @keyframes ambientGlowC {
          0%, 100% { transform: translate(0%, 0%) scale(1);      opacity: 0.3; }
          50%      { transform: translate(-8%, 4%) scale(1.2);   opacity: 0.55; }
        }
        .ambient-wave {
          -webkit-mask-image: linear-gradient(135deg, transparent 30%, #000 50%, transparent 70%);
          mask-image: linear-gradient(135deg, transparent 30%, #000 50%, transparent 70%);
          -webkit-mask-size: 300% 300%;
          mask-size: 300% 300%;
          animation: ambientWave 10s ease-in-out infinite;
        }
        @keyframes ambientWave {
          0%   { -webkit-mask-position: -120% -120%; mask-position: -120% -120%; }
          100% { -webkit-mask-position: 120% 120%;   mask-position: 120% 120%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ambient-glow-a, .ambient-glow-b, .ambient-glow-c { animation: none !important; }
          .ambient-wave { animation: none !important; -webkit-mask-image: none !important; mask-image: none !important; }
        }
      `}</style>

      {/* Glow layer -- the "more color" pass */}
      <div className="ambient-glow-a" style={{
        position: 'absolute', top: '-15%', insetInlineStart: '-12%', width: '58vw', height: '58vw',
        maxWidth: 720, maxHeight: 720, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(accent, 0.6)} 0%, transparent 68%)`,
        filter: 'blur(64px)',
      }} />
      <div className="ambient-glow-b" style={{
        position: 'absolute', bottom: '-18%', insetInlineEnd: '-12%', width: '62vw', height: '62vw',
        maxWidth: 780, maxHeight: 780, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(accentLight, 0.5)} 0%, transparent 68%)`,
        filter: 'blur(72px)',
      }} />
      <div className="ambient-glow-c" style={{
        position: 'absolute', top: '28%', insetInlineStart: '38%', width: '42vw', height: '42vw',
        maxWidth: 560, maxHeight: 560, borderRadius: '50%',
        background: `radial-gradient(circle, ${hexToRgba(accent, 0.4)} 0%, transparent 70%)`,
        filter: 'blur(80px)',
      }} />

      {/* Fine grid + light sweep -- secondary structural layer, kept from the original pass.
          strokeWidth 1->1.6 and a real glow filter added on the accent lines (2026-09-01, same
          feedback round as the speed/opacity bump above) -- "بدي الضوء يطلع منها" (I want light to
          actually emanate from it), not just a slightly brighter flat line. */}
      <svg width="100%" height="100%">
        <defs>
          <pattern id="ambient-grid-base" width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M 70 0 L 0 0 0 70" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
          </pattern>
          <pattern id="ambient-grid-accent" width="70" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M 70 0 L 0 0 0 70" fill="none" stroke={accent} strokeWidth="1.6" />
          </pattern>
          <filter id="ambient-grid-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#ambient-grid-base)" />
        <g className="ambient-wave" opacity={waveOpacity} filter="url(#ambient-grid-glow)">
          <rect width="100%" height="100%" fill="url(#ambient-grid-accent)" />
        </g>
      </svg>
    </div>
  )
}
