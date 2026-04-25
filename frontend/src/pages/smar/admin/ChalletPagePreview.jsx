/**
 * ChalletPagePreview.jsx
 *
 * Lightweight React replica of challet.html sections — used inside VisualBuilder.
 * Accepts a `data` prop and re-renders on every keystroke (live binding).
 * NOT the public-facing page; admin-only preview component.
 *
 * Sections: Hero → Story → Facilities → Location → Footer
 */

// ── Palette (matches challet.html CSS variables) ──────────────────────────────
const W    = '#c9a96e';            // --warm
const INK  = '#1e1710';            // --ink
const SAND = '#f5efe6';            // --sand
const DIM  = 'rgba(245,239,230,';  // alpha prefix

const T = {
  cinzel:     "'Cinzel', 'Georgia', serif",
  cormorant:  "'Cormorant Garamond', 'Georgia', serif",
  jost:       "'Jost', system-ui, sans-serif",
};

// ── Internal atoms ────────────────────────────────────────────────────────────

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '0 8%', margin: '4rem 0 1.5rem' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.2)' }} />
      <div style={{ fontFamily: T.cinzel, fontSize: '0.58rem', letterSpacing: '0.4em', color: W, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.2)' }} />
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ChalletPagePreview({ data }) {
  const { hero = {}, story = {}, facilities = [], location = {}, footer = {} } = data ?? {};

  return (
    <div style={{ background: INK, color: SAND, fontFamily: T.jost, fontWeight: 300, fontSize: 16, lineHeight: 1 }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{
        position:       'relative',
        minHeight:      '58vh',
        padding:        '14vh 8% 10vh',
        background:     `
          radial-gradient(ellipse 80% 60% at 70% 30%, rgba(201,169,110,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 50% 80% at 20% 80%, rgba(181,103,61,0.09) 0%, transparent 55%),
          linear-gradient(160deg, #1e1710 0%, #2a1f14 40%, #1a130c 100%)
        `,
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'flex-end',
        overflow:       'hidden',
      }}>
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(201,169,110,0.035) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(201,169,110,0.035) 60px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Rotating ornament ring */}
        <div style={{
          position: 'absolute', top: '10%', right: '7%',
          width: 180, height: 180,
          border: '1px solid rgba(201,169,110,0.15)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute', inset: 16,
            border: '1px solid rgba(201,169,110,0.07)',
            borderRadius: '50%',
          }} />
          <span style={{ fontFamily: T.cinzel, fontSize: '1.6rem', color: 'rgba(201,169,110,0.28)', letterSpacing: '0.3em' }}>𐤁𐤔</span>
        </div>

        <p style={{ fontFamily: T.cinzel, fontSize: '0.58rem', letterSpacing: '0.38em', color: W, textTransform: 'uppercase', marginBottom: '1.4rem' }}>
          {hero.eyebrow || 'Smar Jbeil · Batroun · Lebanon'}
        </p>
        <h1 style={{ fontFamily: T.cormorant, fontSize: 'clamp(3.2rem, 6.5vw, 6.5rem)', fontWeight: 300, lineHeight: 0.92, letterSpacing: '-0.02em', margin: '0 0 1.8rem' }}>
          {hero.title_line1 || 'Beit'}<br />
          <em style={{ color: W, fontStyle: 'italic' }}>{hero.title_em || 'Smar'}</em>
        </h1>
        <p style={{ fontSize: '0.8rem', letterSpacing: '0.06em', color: `${DIM}0.48)`, maxWidth: 400, lineHeight: 1.85, marginBottom: '2.5rem' }}>
          {hero.subtitle}
        </p>
        <span style={{
          display:       'inline-flex',
          alignItems:    'center',
          gap:           '0.8rem',
          fontFamily:    T.cinzel,
          fontSize:      '0.62rem',
          letterSpacing: '0.28em',
          color:         W,
          textTransform: 'uppercase',
          padding:       '0.85rem 1.8rem',
          border:        '1px solid rgba(201,169,110,0.35)',
          alignSelf:     'flex-start',
          userSelect:    'none',
        }}>
          {hero.cta_text || 'Explore Cottages'} →
        </span>
      </section>

      {/* ── STORY ────────────────────────────────────────────────────────── */}
      <Divider label="The Story" />
      <section style={{ padding: '1rem 8% 4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
        <div>
          <h2 style={{ fontFamily: T.cormorant, fontSize: 'clamp(1.8rem, 3vw, 3rem)', fontWeight: 300, lineHeight: 1.2, marginBottom: '1.5rem' }}>
            {story.heading_line1 || 'A Resort Rooted in'}<br />
            <em style={{ color: W, fontStyle: 'italic' }}>{story.heading_em || 'Ancient Letters'}</em>
          </h2>
          <p style={{ color: `${DIM}0.58)`, lineHeight: 2, fontSize: '0.84rem', marginBottom: '1rem' }}>{story.para1}</p>
          <p style={{ color: `${DIM}0.58)`, lineHeight: 2, fontSize: '0.84rem' }}>{story.para2}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', background: 'rgba(201,169,110,0.1)' }}>
          {(story.stats || []).map((s, i) => (
            <div key={i} style={{ background: INK, padding: '2rem 1.5rem' }}>
              <div style={{ fontFamily: T.cormorant, fontSize: '2.6rem', fontWeight: 300, color: W, lineHeight: 1, marginBottom: '0.4rem' }}>{s.num}</div>
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: `${DIM}0.38)`, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FACILITIES ───────────────────────────────────────────────────── */}
      <Divider label="Resort Facilities" />
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap:                 '2px',
        background:          'rgba(201,169,110,0.06)',
        margin:              '0 0 2rem',
      }}>
        {(facilities || []).map((f, i) => (
          <div key={i} style={{ background: INK, padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.7rem', marginBottom: '0.7rem' }}>{f.icon}</div>
            <div style={{ fontSize: '0.78rem', letterSpacing: '0.08em', color: SAND, marginBottom: '0.4rem', fontWeight: 400 }}>{f.name}</div>
            <div style={{ fontSize: '0.66rem', color: `${DIM}0.34)`, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{f.detail}</div>
          </div>
        ))}
      </div>

      {/* ── LOCATION ─────────────────────────────────────────────────────── */}
      <Divider label="Location" />
      <section style={{ padding: '1rem 8% 4rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
        <div>
          <h2 style={{ fontFamily: T.cormorant, fontSize: 'clamp(1.8rem, 3vw, 3rem)', fontWeight: 300, lineHeight: 1.2, marginBottom: '1.5rem' }}>
            {location.heading_line1 || 'Phoenician'}<br />
            <em style={{ color: W, fontStyle: 'italic' }}>{location.heading_em || 'Territory'}</em>
          </h2>
          <p style={{ color: `${DIM}0.58)`, lineHeight: 2, fontSize: '0.84rem', marginBottom: '1rem' }}>{location.para1}</p>
          <p style={{ color: `${DIM}0.58)`, lineHeight: 2, fontSize: '0.84rem', marginBottom: '1.5rem' }}>{location.para2}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(location.tags || []).map((tag, i) => (
              <span key={i} style={{
                fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: `${DIM}0.38)`, border: '1px solid rgba(201,169,110,0.18)',
                padding: '0.3rem 0.7rem',
              }}>{tag}</span>
            ))}
          </div>
        </div>
        {/* Map placeholder */}
        <div style={{
          background:   'rgba(201,169,110,0.04)',
          border:       '1px solid rgba(201,169,110,0.1)',
          minHeight:    220,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap:          '0.6rem',
        }}>
          <div style={{ fontSize: '2.2rem' }}>📍</div>
          <div style={{ fontFamily: T.cinzel, fontSize: '0.58rem', letterSpacing: '0.2em', color: W }}>Beit Smar · Smar Jbeil</div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ textAlign: 'center', padding: '4rem 8%', borderTop: '1px solid rgba(201,169,110,0.1)' }}>
        <div style={{ fontFamily: T.cormorant, fontSize: '2.2rem', fontWeight: 300, color: W, marginBottom: '0.8rem' }}>
          {footer.brand || 'Beit Smar'}
        </div>
        <div style={{ fontSize: '0.72rem', color: `${DIM}0.38)`, lineHeight: 1.9, marginBottom: '0.8rem', whiteSpace: 'pre-line' }}>
          {footer.note}
        </div>
        <div style={{ fontSize: '0.68rem', color: `${DIM}0.28)`, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
          {footer.contact}
        </div>
      </footer>
    </div>
  );
}
