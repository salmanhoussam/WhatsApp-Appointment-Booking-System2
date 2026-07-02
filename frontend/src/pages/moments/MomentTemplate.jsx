import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useMomentPage, useCountdown, submitRSVP } from './hooks/useMomentPage';
import './moments.css';

const TYPE_LABELS = {
  wedding:     { ar: 'زفاف', en: 'Wedding', icon: '💍' },
  anniversary: { ar: 'ذكرى سنوية', en: 'Anniversary', icon: '🌹' },
  birthday:    { ar: 'عيد ميلاد', en: 'Birthday', icon: '🎂' },
  engagement:  { ar: 'خطوبة', en: 'Engagement', icon: '💐' },
  graduation:  { ar: 'تخرج', en: 'Graduation', icon: '🎓' },
  other:       { ar: 'مناسبة', en: 'Occasion', icon: '✨' },
};

const spring = { type: 'spring', stiffness: 70, damping: 20, mass: 1.5 };

function CountdownDisplay({ eventDate }) {
  const diff = useCountdown(eventDate);
  if (!diff) return null;
  const units = [
    { num: diff.days,    ar: 'يوم',    en: 'Days' },
    { num: diff.hours,   ar: 'ساعة',   en: 'Hours' },
    { num: diff.minutes, ar: 'دقيقة',  en: 'Mins' },
    { num: diff.seconds, ar: 'ثانية',  en: 'Secs' },
  ];
  return (
    <div className="countdown-box">
      {units.map(u => (
        <div key={u.en} className="countdown-unit">
          <div className="countdown-num">{String(u.num).padStart(2,'0')}</div>
          <div className="countdown-label">{u.ar}</div>
        </div>
      ))}
    </div>
  );
}

function RSVPForm({ slug, accent, onDone }) {
  const [form, setForm]   = useState({ guest_name:'', guest_phone:'', guest_count:1, message:'', attending:true });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.guest_name.trim()) return;
    setLoading(true);
    try {
      await submitRSVP(slug, { ...form, guest_count: Number(form.guest_count) });
      onDone();
    } catch {
      alert('حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={spring}
      onSubmit={handleSubmit}
      style={{ display:'flex', flexDirection:'column', gap:'12px' }}
    >
      <input className="moments-input" placeholder="اسمك الكريم *" value={form.guest_name}
        onChange={e => set('guest_name', e.target.value)} required />
      <input className="moments-input" placeholder="رقم هاتفك (اختياري)" value={form.guest_phone}
        onChange={e => set('guest_phone', e.target.value)} />
      <div style={{ display:'flex', gap:'10px' }}>
        <input className="moments-input" type="number" min="1" max="20" placeholder="عدد الحضور"
          value={form.guest_count} onChange={e => set('guest_count', e.target.value)}
          style={{ flex:'0 0 140px' }} />
        <select className="moments-input" value={form.attending}
          onChange={e => set('attending', e.target.value === 'true')}>
          <option value="true">✅ سأحضر</option>
          <option value="false">❌ أعتذر</option>
        </select>
      </div>
      <textarea className="moments-input" rows={3} placeholder="رسالة للمحتفلين (اختياري)"
        value={form.message} onChange={e => set('message', e.target.value)} />
      <motion.button
        whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
        transition={{ type:'spring', stiffness:300, damping:25 }}
        type="submit" disabled={loading}
        style={{
          background: accent, color:'#fff', border:'none', borderRadius:'10px',
          padding:'14px', fontFamily:'Cairo, sans-serif', fontWeight:700,
          fontSize:'1rem', cursor:'pointer', boxShadow:`0 0 24px ${accent}55`,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? '...' : 'تأكيد الحضور'}
      </motion.button>
    </motion.form>
  );
}

export default function MomentTemplate() {
  const { type, slug } = useParams();
  const { page, loading, error } = useMomentPage(type, slug);
  const [rsvpDone, setRsvpDone] = useState(false);
  const typeInfo = TYPE_LABELS[type] || TYPE_LABELS.other;
  const accent   = page?.theme_color || '#d4a853';

  if (loading) return (
    <div className="moments-page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <motion.div animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:1.5, repeat:Infinity }}
        style={{ width:'14px', height:'14px', borderRadius:'50%', background:'#d4a853' }} />
    </div>
  );

  if (error || !page) return (
    <div className="moments-page" data-type={type} style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:'16px' }}>
      <div style={{ fontSize:'3rem' }}>🌸</div>
      <p style={{ color:'rgba(255,255,255,0.4)', fontFamily:'Cairo', fontSize:'1rem' }}>هذه الصفحة غير متاحة</p>
    </div>
  );

  const eventDateFormatted = new Date(page.event_date).toLocaleDateString('ar-SA', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  return (
    <div className="moments-page" data-type={page.type} dir="rtl">
      {/* Hero */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:'4rem 2rem' }}>
        <div className="moments-orb moments-orb--1" />
        <div className="moments-orb moments-orb--2" />

        {/* Cover image bg */}
        {page.cover_image && (
          <div style={{
            position:'absolute', inset:0, zIndex:0,
            backgroundImage:`url(${page.cover_image})`,
            backgroundSize:'cover', backgroundPosition:'center',
            opacity:0.15,
          }} />
        )}

        <div style={{ position:'relative', zIndex:1, maxWidth:'680px', textAlign:'center', width:'100%' }}>
          {/* Type badge */}
          <motion.div
            initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ ...spring, delay:0.1 }}
            style={{
              display:'inline-flex', alignItems:'center', gap:'8px',
              padding:'6px 18px', borderRadius:'30px',
              background:`rgba(${hexToRgb(accent)},0.12)`,
              border:`1px solid rgba(${hexToRgb(accent)},0.3)`,
              fontFamily:'Space Mono, monospace', fontSize:'0.65rem',
              textTransform:'uppercase', letterSpacing:'0.18em', color:accent,
              marginBottom:'2rem',
            }}
          >
            <span>{typeInfo.icon}</span>
            {typeInfo.ar}
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ ...spring, delay:0.2 }}
            style={{
              fontFamily:'Cairo, sans-serif', fontWeight:900,
              fontSize:'clamp(2.2rem,7vw,4.5rem)', color:'#fff',
              margin:'0 0 1rem', letterSpacing:'-0.02em', lineHeight:1.15,
            }}
          >
            {page.title_ar}
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ ...spring, delay:0.35 }}
            style={{
              fontSize:'1rem', color:'rgba(255,255,255,0.65)', lineHeight:1.8,
              maxWidth:'52ch', margin:'0 auto 2rem',
            }}
          >
            {page.message_ar}
          </motion.p>

          {/* Event date */}
          <motion.div
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ ...spring, delay:0.45 }}
            style={{
              display:'inline-flex', flexDirection:'column', gap:'4px',
              padding:'16px 28px', borderRadius:'14px',
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              marginBottom:'2rem',
            }}
          >
            <span style={{ fontFamily:'Space Mono,monospace', fontSize:'0.6rem', color:accent, textTransform:'uppercase', letterSpacing:'0.14em' }}>◆ موعد المناسبة</span>
            <span style={{ fontFamily:'Cairo, sans-serif', fontSize:'1.05rem', color:'#fff', fontWeight:700 }}>{eventDateFormatted}</span>
            {page.location_ar && (
              <span style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.45)' }}>📍 {page.location_ar}</span>
            )}
          </motion.div>

          {/* Countdown */}
          <CountdownDisplay eventDate={page.event_date} />
        </div>
      </section>

      {/* RSVP Section */}
      {page.rsvp_enabled && (
        <section style={{ padding:'5rem 2rem', position:'relative' }}>
          <div style={{ height:'1px', background:`linear-gradient(90deg,transparent,rgba(${hexToRgb(accent)},0.3),transparent)`, marginBottom:'4rem' }} />
          <div style={{ maxWidth:'520px', margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
              <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.62rem', textTransform:'uppercase', letterSpacing:'0.18em', color:accent, marginBottom:'12px' }}>
                ◆ تأكيد الحضور
              </div>
              <h2 style={{ fontFamily:'Cairo, sans-serif', fontSize:'clamp(1.5rem,3.5vw,2.2rem)', fontWeight:900, color:'#fff', margin:0 }}>
                هل ستشاركنا الفرحة؟
              </h2>
            </div>

            <AnimatePresence mode="wait">
              {rsvpDone ? (
                <motion.div
                  key="done"
                  initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={spring}
                  style={{
                    textAlign:'center', padding:'3rem',
                    background:`rgba(${hexToRgb(accent)},0.06)`,
                    border:`1px solid rgba(${hexToRgb(accent)},0.2)`,
                    borderRadius:'16px',
                  }}
                >
                  <div style={{ fontSize:'3rem', marginBottom:'12px' }}>✅</div>
                  <h3 style={{ fontFamily:'Cairo', fontWeight:700, color:'#fff', fontSize:'1.3rem', margin:'0 0 8px' }}>شكراً لتأكيدك!</h3>
                  <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.9rem', margin:0 }}>سيصلك تذكير قريباً</p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  style={{
                    background:'rgba(255,255,255,0.025)',
                    border:'1px solid rgba(255,255,255,0.07)',
                    borderRadius:'16px', padding:'28px',
                    backdropFilter:'blur(20px)',
                  }}
                >
                  <RSVPForm slug={slug} accent={accent} onDone={() => setRsvpDone(true)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ padding:'2rem', textAlign:'center', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontFamily:'Space Mono,monospace', fontSize:'0.58rem', color:'rgba(255,255,255,0.18)', textTransform:'uppercase', letterSpacing:'0.14em', margin:0 }}>
          Made with ♥ by SalmanSaaS — Moments
        </p>
      </footer>
    </div>
  );
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
