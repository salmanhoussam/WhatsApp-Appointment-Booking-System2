/**
 * MountainBackground.jsx  —  Sunlit Mediterranean Heritage (Light Mode)
 *
 * Warm sky-to-forest gradient backdrop.
 * position: absolute inside the sticky 100vh stage.
 */

export default function MountainBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset:    0,
        zIndex:   0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* ── Base: warm sky → forest green → stone earth ── */}
      <div style={{
        position: 'absolute',
        inset:    0,
        background: `
          linear-gradient(
            175deg,
            #c9e4f0 0%,
            #a8d4e8 12%,
            #7ab8a0 30%,
            #5a9470 48%,
            #7a8c5a 62%,
            #c4a97a 78%,
            #e8d9be 92%,
            #f4f0ea 100%
          )
        `,
      }} />

      {/* ── Soft sunlight bloom — upper right, morning haze ── */}
      <div style={{
        position:   'absolute',
        top:        '-10%',
        right:      '-5%',
        width:      '55%',
        height:     '55%',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255,240,200,0.38) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* ── Sea shimmer — upper left band (references the photo) ── */}
      <div style={{
        position:   'absolute',
        top:        '8%',
        left:       0,
        right:      0,
        height:     '6%',
        background: 'linear-gradient(to bottom, rgba(160,210,240,0.35), transparent)',
        pointerEvents: 'none',
      }} />

      {/* ── Warm bottom fog — blends into the cream page background ── */}
      <div style={{
        position:   'absolute',
        bottom:     0,
        left:       0,
        right:      0,
        height:     '22vh',
        background: 'linear-gradient(to top, #faf9f6 0%, rgba(250,249,246,0.75) 45%, transparent 100%)',
        zIndex:     5,
      }} />

      {/* ── Top vignette — keeps hero text readable ── */}
      <div style={{
        position:   'absolute',
        top:        0,
        left:       0,
        right:      0,
        height:     '16vh',
        background: 'linear-gradient(to bottom, rgba(250,249,246,0.55) 0%, transparent 100%)',
        zIndex:     5,
      }} />
    </div>
  );
}
