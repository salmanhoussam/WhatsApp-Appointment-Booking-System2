/**
 * VisualBuilder.jsx
 *
 * Split-screen live Page Builder for the Beit Smar homepage.
 *
 * Layout (full-bleed, breaks out of dashboard padding):
 *   Left 400px  — scrollable form editor (Hero, Story, Facilities, Location, Footer)
 *   Right flex  — live preview of <ChalletPagePreview> — updates on every keystroke
 *
 * Data flow:
 *   GET /admin/settings → res.data.config.content → form state
 *   any keystroke        → local state update → previewData recomputed
 *   "Publish" click      → PATCH /admin/settings { config: { ...existing, content: formState } }
 *
 * Mounted as tab 'pagebuilder' inside SmarAdminDashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }           from 'framer-motion';
import adminApi                              from '../../../utils/admin.config';
import ChalletPagePreview                    from './ChalletPagePreview';

// ── Admin palette ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0a0f',
  surface:   '#12121a',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',
  textPri:   '#f0f0f5',
  textMuted: '#6b6b80',
  gold:      '#d4a853',
  goldDim:   'rgba(212,168,83,0.10)',
  green:     '#3ecf8e',
  red:       '#f87171',
};

// ── Default content — mirrors challet.html copy exactly ──────────────────────
const DEFAULT_CONTENT = {
  hero: {
    eyebrow:     'Smar Jbeil · Batroun · Lebanon',
    title_line1: 'Beit',
    title_em:    'Smar',
    subtitle:    'Where Phoenician heritage meets contemporary luxury — eleven private cottages nestled in the midlands of Batroun, between ancient citadels and the Mediterranean horizon.',
    cta_text:    'Explore Cottages',
  },
  story: {
    heading_line1: 'A Resort Rooted in',
    heading_em:    'Ancient Letters',
    para1: 'Each cottage at Beit Smar carries the name of a Phoenician letter — the very alphabet born on this Levantine coast, the ancestor of all Western writing. From Alep to Zayin, eleven dwellings, eleven characters, one story.',
    para2: 'Set among the vineyards of Batroun, minutes from the Old Souk and the Smar Jbeil Citadel, this boutique resort offers a rare convergence of heritage, nature, and refined hospitality.',
    stats: [
      { num: '11',     label: 'Private Cottages'    },
      { num: '3',      label: 'Cottage Types'        },
      { num: '15min',  label: 'From Batroun Souk'    },
      { num: '∞',      label: 'Sea & Valley Views'   },
    ],
  },
  facilities: [
    { icon: '🏊', name: 'Swimming Pool',    detail: 'May 15 – Oct 5 · 9:00 AM – 7:00 PM' },
    { icon: '🍹', name: 'Pool Bar',          detail: 'Refreshments & cocktails poolside'    },
    { icon: '🍽️', name: 'Dining Clubhouse', detail: 'Breakfast served · 9:30 – 11:30 AM'  },
    { icon: '🛎️', name: 'Concierge',        detail: 'Guest support · 9:00 AM – 10:00 PM'  },
    { icon: '🚗', name: 'Airport Transfer',  detail: 'Pick-up & drop-off on request'        },
    { icon: '🐾', name: 'Pet Friendly',      detail: 'Pets welcome in all cottages'         },
  ],
  location: {
    heading_line1: 'Phoenician',
    heading_em:    'Territory',
    para1: "Beit Smar sits in the heart of Smar Jbeil, Batroun — a region where civilisation wrote itself into stone thousands of years ago. The Citadel stands a stone's throw away. The vineyards surround you. The sea glimmers on the horizon.",
    para2: "15 minutes to Batroun's Old Souk. 5 minutes to the famous wineries. An eternity from the noise of the city.",
    tags:  ['Smar Jbeil', 'Batroun, Lebanon', 'Near Citadel', 'Vineyard Views', 'Sea Views'],
  },
  footer: {
    brand:   'Beit Smar',
    note:    'Boutique Resort · Smar Jbeil, Batroun · Lebanon\nNamed after the Phoenician alphabet — born on this shore',
    contact: 'Check-in: 5:00 PM\nCheck-out: 2:00 PM\nConcierge: 9 AM – 10 PM',
  },
};

// ── Shared form atoms ─────────────────────────────────────────────────────────

const baseInput = {
  width:        '100%',
  background:   'rgba(255,255,255,0.04)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: 7,
  padding:      '8px 11px',
  color:        '#f0f0f5',
  fontSize:     13,
  outline:      'none',
  fontFamily:   'inherit',
  resize:       'vertical',
  lineHeight:   1.5,
};

function Field({ label, value, onChange, multiline = false, rows = 3, placeholder = '' }) {
  const shared = {
    value:       value ?? '',
    onChange:    e => onChange(e.target.value),
    placeholder,
    style:       baseInput,
  };
  return (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5, fontWeight: 600 }}>
        {label}
      </label>
      {multiline
        ? <textarea {...shared} rows={rows} />
        : <input type="text" {...shared} />
      }
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          9,
      padding:      '13px 18px',
      borderBottom: `1px solid ${C.border}`,
      borderTop:    `1px solid ${C.border}`,
      background:   C.bg,
      position:     'sticky',
      top:          0,
      zIndex:       2,
    }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMuted }}>
        {title}
      </span>
    </div>
  );
}

function SectionBody({ children }) {
  return <div style={{ padding: '16px 18px 6px' }}>{children}</div>;
}

// ── VisualBuilder ─────────────────────────────────────────────────────────────

export default function VisualBuilder() {
  const [storedConfig, setStoredConfig] = useState({});
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [toast,        setToast]        = useState(null);
  const [zoom,         setZoom]         = useState(0.85);

  const [hero,       setHero]       = useState(DEFAULT_CONTENT.hero);
  const [story,      setStory]      = useState(DEFAULT_CONTENT.story);
  const [facilities, setFacilities] = useState(DEFAULT_CONTENT.facilities);
  const [location,   setLocation]   = useState(DEFAULT_CONTENT.location);
  const [footer,     setFooter]     = useState(DEFAULT_CONTENT.footer);

  // Load Google Fonts used by the preview
  useEffect(() => {
    if (document.getElementById('vb-preview-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'vb-preview-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Cinzel:wght@400;500&family=Jost:wght@300;400;500&display=swap';
    document.head.appendChild(link);
  }, []);

  // Fetch current config.content from DB
  useEffect(() => {
    adminApi.get('/settings')
      .then(res => {
        const cfg = res.data?.config ?? {};
        setStoredConfig(cfg);
        const c = cfg.content ?? {};
        if (c.hero)       setHero(s => ({ ...s, ...c.hero }));
        if (c.story)      setStory(s => ({ ...s, ...c.story, stats: c.story.stats ?? s.stats }));
        if (c.facilities?.length) setFacilities(c.facilities);
        if (c.location)   setLocation(s => ({ ...s, ...c.location }));
        if (c.footer)     setFooter(s => ({ ...s, ...c.footer }));
      })
      .catch(() => {/* network off — just use defaults, still editable */})
      .finally(() => setIsLoading(false));
  }, []);

  // Live preview data — recomputed on every render
  const previewData = { hero, story, facilities, location, footer };

  // Publish
  const handlePublish = async () => {
    setIsSaving(true);
    try {
      await adminApi.patch('/settings', {
        config: { ...storedConfig, content: previewData },
      });
      setStoredConfig(s => ({ ...s, content: previewData }));
      showToast(true, '✅  Page content published successfully.');
    } catch {
      showToast(false, '❌  Publish failed — check connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const showToast = (ok, msg) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Facility helpers
  const updateFacility = useCallback((i, key, val) =>
    setFacilities(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: val } : f)), []);
  const addFacility    = () => setFacilities(prev => [...prev, { icon: '⭐', name: '', detail: '' }]);
  const removeFacility = i  => setFacilities(prev => prev.filter((_, idx) => idx !== i));

  // Story stat helpers
  const updateStat = useCallback((i, key, val) =>
    setStory(s => ({ ...s, stats: s.stats.map((st, idx) => idx === i ? { ...st, [key]: val } : st) })), []);

  // Location tag helper
  const updateTags = val =>
    setLocation(s => ({ ...s, tags: val.split(',').map(t => t.trim()).filter(Boolean) }));

  // ── Loading spinner ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, gap: 14, color: C.textMuted, fontSize: 13 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, boxShadow: '0 0 18px 4px rgba(212,168,83,0.5)', animation: 'pulse 1.4s ease-in-out infinite' }} />
        <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.6)}}`}</style>
        Loading page content…
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      margin:              '-40px -48px',
      height:              'calc(100dvh - 164px)',
      display:             'grid',
      gridTemplateColumns: '400px 1fr',
      overflow:            'hidden',
      fontFamily:          "'Inter', 'Segoe UI', sans-serif",
      color:               C.textPri,
    }}>

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT — Form Editor
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${C.border}`, background: C.surface, overflow: 'hidden' }}>

        {/* Sticky publish bar */}
        <div style={{
          padding:        '14px 18px',
          borderBottom:   `1px solid ${C.border}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flexShrink:     0,
          background:     C.bg,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri, letterSpacing: '-0.01em' }}>🎨 Page Builder</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>Preview updates on every keystroke</div>
          </div>
          <motion.button
            onClick={handlePublish}
            disabled={isSaving}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              background:   isSaving ? C.goldDim : 'linear-gradient(135deg, #d4a853 0%, #b8892a 100%)',
              border:       'none',
              borderRadius: 9,
              padding:      '9px 18px',
              color:        isSaving ? C.gold : '#0a0a0f',
              fontSize:     12,
              fontWeight:   700,
              cursor:       isSaving ? 'not-allowed' : 'pointer',
              letterSpacing: '0.03em',
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              flexShrink:   0,
            }}
          >
            {isSaving ? '⏳' : '🚀'} {isSaving ? 'Publishing…' : 'Publish'}
          </motion.button>
        </div>

        {/* Scrollable form body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── HERO ───────────────────────────────────────────────────── */}
          <SectionHeader icon="🌄" title="Hero Section" />
          <SectionBody>
            <Field label="Eyebrow"              value={hero.eyebrow}     onChange={v => setHero(s => ({ ...s, eyebrow: v }))} />
            <Field label="Title Line 1"         value={hero.title_line1} onChange={v => setHero(s => ({ ...s, title_line1: v }))} />
            <Field label="Title — Italic Accent" value={hero.title_em}   onChange={v => setHero(s => ({ ...s, title_em: v }))} />
            <Field label="Subtitle Paragraph"   value={hero.subtitle}    onChange={v => setHero(s => ({ ...s, subtitle: v }))} multiline rows={3} />
            <Field label="CTA Button Text"      value={hero.cta_text}    onChange={v => setHero(s => ({ ...s, cta_text: v }))} />
          </SectionBody>

          {/* ── STORY ──────────────────────────────────────────────────── */}
          <SectionHeader icon="📖" title="Story Section" />
          <SectionBody>
            <Field label="Heading Line 1"        value={story.heading_line1} onChange={v => setStory(s => ({ ...s, heading_line1: v }))} />
            <Field label="Heading — Italic Part" value={story.heading_em}    onChange={v => setStory(s => ({ ...s, heading_em: v }))} />
            <Field label="Paragraph 1" value={story.para1} onChange={v => setStory(s => ({ ...s, para1: v }))} multiline rows={4} />
            <Field label="Paragraph 2" value={story.para2} onChange={v => setStory(s => ({ ...s, para2: v }))} multiline rows={3} />
            {/* Stats 2×2 grid */}
            <div style={{ marginBottom: 13 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>
                Stats — 4 figures
              </label>
              {(story.stats || []).map((st, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginBottom: 6 }}>
                  <input value={st.num}   onChange={e => updateStat(i, 'num',   e.target.value)} placeholder="11"   style={{ ...baseInput, textAlign: 'center', marginBottom: 0 }} />
                  <input value={st.label} onChange={e => updateStat(i, 'label', e.target.value)} placeholder="Label" style={{ ...baseInput, marginBottom: 0 }} />
                </div>
              ))}
            </div>
          </SectionBody>

          {/* ── FACILITIES ─────────────────────────────────────────────── */}
          <SectionHeader icon="🏊" title="Facilities" />
          <SectionBody>
            {facilities.map((f, i) => (
              <div key={i} style={{
                background:   'rgba(255,255,255,0.025)',
                border:       `1px solid ${C.border}`,
                borderRadius: 8,
                padding:      '11px 13px',
                marginBottom: 9,
                position:     'relative',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 8, marginBottom: 7 }}>
                  <input value={f.icon} onChange={e => updateFacility(i, 'icon', e.target.value)} placeholder="🏊" style={{ ...baseInput, textAlign: 'center', fontSize: 17, marginBottom: 0 }} />
                  <input value={f.name} onChange={e => updateFacility(i, 'name', e.target.value)} placeholder="Facility Name" style={{ ...baseInput, marginBottom: 0 }} />
                </div>
                <input value={f.detail} onChange={e => updateFacility(i, 'detail', e.target.value)} placeholder="Detail / hours" style={{ ...baseInput, width: '100%', marginBottom: 0 }} />
                <button
                  onClick={() => removeFacility(i)}
                  style={{ position: 'absolute', top: 7, right: 9, background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '2px 4px', opacity: 0.7 }}
                  title="Remove facility"
                >✕</button>
              </div>
            ))}
            <button
              onClick={addFacility}
              style={{
                width: '100%', padding: '8px 0',
                background: C.goldDim,
                border: '1px dashed rgba(212,168,83,0.28)',
                borderRadius: 8,
                color: C.gold, fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}
            >+ Add Facility</button>
          </SectionBody>

          {/* ── LOCATION ───────────────────────────────────────────────── */}
          <SectionHeader icon="📍" title="Location Section" />
          <SectionBody>
            <Field label="Heading Line 1"        value={location.heading_line1} onChange={v => setLocation(s => ({ ...s, heading_line1: v }))} />
            <Field label="Heading — Italic Part" value={location.heading_em}    onChange={v => setLocation(s => ({ ...s, heading_em: v }))} />
            <Field label="Paragraph 1" value={location.para1} onChange={v => setLocation(s => ({ ...s, para1: v }))} multiline rows={3} />
            <Field label="Paragraph 2" value={location.para2} onChange={v => setLocation(s => ({ ...s, para2: v }))} multiline rows={2} />
            <Field label="Location Tags (comma-separated)" value={(location.tags || []).join(', ')} onChange={updateTags} />
          </SectionBody>

          {/* ── FOOTER ─────────────────────────────────────────────────── */}
          <SectionHeader icon="🔖" title="Footer" />
          <SectionBody>
            <Field label="Brand Name"   value={footer.brand}   onChange={v => setFooter(s => ({ ...s, brand: v }))} />
            <Field label="Footer Note"  value={footer.note}    onChange={v => setFooter(s => ({ ...s, note: v }))}  multiline rows={3} />
            <Field label="Contact Info" value={footer.contact} onChange={v => setFooter(s => ({ ...s, contact: v }))} multiline rows={3} />
          </SectionBody>

          <div style={{ height: 40 }} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT — Live Preview
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#111118', overflowY: 'auto', position: 'relative', display: 'flex', flexDirection: 'column' }}>

        {/* Preview toolbar */}
        <div style={{
          position:       'sticky',
          top:            0,
          zIndex:         10,
          background:     'rgba(10,10,15,0.94)',
          backdropFilter: 'blur(14px)',
          borderBottom:   `1px solid ${C.border}`,
          padding:        '8px 16px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flexShrink:     0,
        }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: '0.06em' }}>
            🖥️ LIVE PREVIEW — every keystroke reflects instantly
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: C.textMuted, marginRight: 2 }}>ZOOM</span>
            {[0.7, 0.85, 1].map(s => (
              <button key={s} onClick={() => setZoom(s)} style={{
                padding:      '3px 9px',
                background:   zoom === s ? C.goldDim : 'transparent',
                border:       `1px solid ${zoom === s ? C.gold : C.border}`,
                borderRadius: 4,
                color:        zoom === s ? C.gold : C.textMuted,
                fontSize:     11,
                cursor:       'pointer',
                fontWeight:   zoom === s ? 700 : 400,
              }}>
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>
        </div>

        {/* Zoomed preview — CSS zoom affects layout (unlike transform:scale) */}
        <div style={{ zoom }}>
          <ChalletPagePreview data={previewData} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Toast notification
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="vb-toast"
            initial={{ opacity: 0, y: 48, x: '-50%' }}
            animate={{ opacity: 1, y: 0,  x: '-50%' }}
            exit={{    opacity: 0, y: 48, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              position:       'fixed',
              bottom:         32,
              left:           '50%',
              zIndex:         9999,
              background:     toast.ok ? 'rgba(62,207,142,0.10)' : 'rgba(248,113,113,0.10)',
              border:         `1px solid ${toast.ok ? '#3ecf8e' : '#f87171'}44`,
              borderRadius:   12,
              padding:        '11px 24px',
              color:          toast.ok ? '#3ecf8e' : '#f87171',
              fontSize:       13,
              fontWeight:     600,
              backdropFilter: 'blur(20px)',
              boxShadow:      '0 8px 32px rgba(0,0,0,0.5)',
              whiteSpace:     'nowrap',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
