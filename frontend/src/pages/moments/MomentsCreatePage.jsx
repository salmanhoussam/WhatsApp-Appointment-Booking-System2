import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { registerCreator, loginCreator, createMomentPage } from './hooks/useMomentPage';
import './moments.css';

const spring = { type: 'spring', stiffness: 70, damping: 20, mass: 1.5 };

const TYPES = [
  { key: 'wedding',     ar: 'زفاف',         icon: '💍', color: '#d4a853' },
  { key: 'anniversary', ar: 'ذكرى سنوية',   icon: '🌹', color: '#e11d48' },
  { key: 'birthday',   ar: 'عيد ميلاد',    icon: '🎂', color: '#8b5cf6' },
  { key: 'engagement', ar: 'خطوبة',         icon: '💐', color: '#f472b6' },
  { key: 'graduation', ar: 'تخرج',          icon: '🎓', color: '#3b82f6' },
  { key: 'other',      ar: 'مناسبة أخرى',  icon: '✨', color: '#ff1a55' },
];

const STEP_LABELS = ['تسجيل الدخول', 'نوع المناسبة', 'تفاصيل المناسبة', 'الرابط جاهز'];

function StepIndicator({ current, total, accent }) {
  return (
    <div style={{ display:'flex', gap:'8px', justifyContent:'center', marginBottom:'3rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height:'3px', borderRadius:'2px',
          width: i === current ? '32px' : '16px',
          background: i <= current ? accent : 'rgba(255,255,255,0.1)',
          transition:'all 0.3s',
        }} />
      ))}
    </div>
  );
}

// ── Step 0: Auth ──────────────────────────────────────────────────────────────

function AuthStep({ onAuth }) {
  const [mode, setMode]     = useState('login'); // 'login' | 'register'
  const [form, setForm]     = useState({ name:'', phone:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (mode === 'register') {
        res = await registerCreator({ name: form.name, phone: form.phone, password: form.password });
      } else {
        res = await loginCreator({ phone: form.phone, password: form.password });
      }
      onAuth(res.data.token, res.data.name);
    } catch (err) {
      setError(err?.response?.data?.detail || 'حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={spring}>
      <div style={{ textAlign:'center', marginBottom:'2rem' }}>
        <h2 style={{ fontFamily:'Cairo', fontWeight:900, fontSize:'1.9rem', color:'#fff', margin:'0 0 8px' }}>
          {mode === 'login' ? 'أهلاً بعودتك' : 'إنشاء حساب'}
        </h2>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.9rem', fontFamily:'Cairo' }}>
          {mode === 'login' ? 'سجّل دخولك لإنشاء صفحة مناسبتك' : 'أنشئ حساباً مجانياً لبدء الاحتفال'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {mode === 'register' && (
          <input className="moments-input" placeholder="اسمك الكريم *" value={form.name}
            onChange={e => set('name', e.target.value)} required />
        )}
        <input className="moments-input" placeholder="رقم الهاتف *" value={form.phone}
          onChange={e => set('phone', e.target.value)} required />
        <input className="moments-input" type="password" placeholder="كلمة المرور *" value={form.password}
          onChange={e => set('password', e.target.value)} required />

        {error && <p style={{ color:'#e11d48', fontSize:'0.85rem', fontFamily:'Cairo', margin:0, textAlign:'center' }}>{error}</p>}

        <motion.button
          whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          type="submit" disabled={loading}
          style={{
            background:'#d4a853', color:'#fff', border:'none', borderRadius:'10px',
            padding:'14px', fontFamily:'Cairo', fontWeight:700, fontSize:'1rem',
            cursor:'pointer', marginTop:'8px', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? '...' : (mode === 'login' ? 'دخول' : 'إنشاء حساب')}
        </motion.button>
      </form>

      <p style={{ textAlign:'center', marginTop:'1.5rem', fontFamily:'Cairo', fontSize:'0.85rem', color:'rgba(255,255,255,0.35)' }}>
        {mode === 'login' ? 'ليس لديك حساب؟ ' : 'لديك حساب؟ '}
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={{ background:'none', border:'none', color:'#d4a853', cursor:'pointer', fontFamily:'Cairo', fontSize:'0.85rem', fontWeight:700 }}>
          {mode === 'login' ? 'أنشئ حساباً' : 'سجّل دخولاً'}
        </button>
      </p>
    </motion.div>
  );
}

// ── Step 1: Choose type ───────────────────────────────────────────────────────

function TypeStep({ selected, onSelect }) {
  return (
    <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={spring}>
      <div style={{ textAlign:'center', marginBottom:'2rem' }}>
        <h2 style={{ fontFamily:'Cairo', fontWeight:900, fontSize:'1.9rem', color:'#fff', margin:'0 0 8px' }}>ما هي مناسبتك؟</h2>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.9rem', fontFamily:'Cairo' }}>اختر النوع لتحديد اللون والثيم</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
        {TYPES.map(t => (
          <motion.button
            key={t.key}
            whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            onClick={() => onSelect(t.key)}
            style={{
              background: selected === t.key ? `rgba(${hexToRgb(t.color)},0.15)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selected === t.key ? t.color : 'rgba(255,255,255,0.08)'}`,
              borderRadius:'12px', padding:'20px 16px',
              cursor:'pointer', textAlign:'center',
              fontFamily:'Cairo', color:'#fff',
              transition:'all 0.2s',
            }}
          >
            <div style={{ fontSize:'1.8rem', marginBottom:'6px' }}>{t.icon}</div>
            <div style={{ fontSize:'0.9rem', fontWeight:700, color: selected === t.key ? t.color : '#fff' }}>{t.ar}</div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Step 2: Details ───────────────────────────────────────────────────────────

function DetailsStep({ form, setForm, accent }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={spring}>
      <div style={{ textAlign:'center', marginBottom:'2rem' }}>
        <h2 style={{ fontFamily:'Cairo', fontWeight:900, fontSize:'1.9rem', color:'#fff', margin:'0 0 8px' }}>تفاصيل المناسبة</h2>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.9rem', fontFamily:'Cairo' }}>هذه المعلومات ستظهر لضيوفك</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        <input className="moments-input" placeholder="عنوان المناسبة *  (مثال: زفاف سلمى وأحمد)" value={form.title_ar}
          onChange={e => set('title_ar', e.target.value)} required />
        <textarea className="moments-input" rows={4}
          placeholder="رسالة للضيوف *  (مثال: نسعد بدعوتكم للمشاركة في فرحتنا)"
          value={form.message_ar} onChange={e => set('message_ar', e.target.value)} required />
        <div>
          <label style={{ fontFamily:'Cairo', fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px' }}>تاريخ المناسبة *</label>
          <input className="moments-input" type="datetime-local" value={form.event_date}
            onChange={e => set('event_date', e.target.value)} required />
        </div>
        <input className="moments-input" placeholder="المكان (اختياري)  (مثال: قصر الكرم، بيروت)" value={form.location_ar}
          onChange={e => set('location_ar', e.target.value)} />
        <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
          <input type="checkbox" id="rsvp" checked={form.rsvp_enabled}
            onChange={e => set('rsvp_enabled', e.target.checked)}
            style={{ width:'18px', height:'18px', accentColor: accent }} />
          <label htmlFor="rsvp" style={{ fontFamily:'Cairo', fontSize:'0.9rem', color:'rgba(255,255,255,0.7)', cursor:'pointer' }}>
            تفعيل خاصية تأكيد الحضور (RSVP)
          </label>
        </div>
      </div>
    </motion.div>
  );
}

// ── Step 3: Done ──────────────────────────────────────────────────────────────

function DoneStep({ pageSlug, pageType, accent }) {
  const navigate = useNavigate();
  const url = `${window.location.origin}/moments/${pageType}/${pageSlug}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
  };

  return (
    <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} transition={spring}
      style={{ textAlign:'center' }}>
      <div style={{ fontSize:'3.5rem', marginBottom:'16px' }}>🎉</div>
      <h2 style={{ fontFamily:'Cairo', fontWeight:900, fontSize:'1.9rem', color:'#fff', margin:'0 0 8px' }}>
        صفحتك جاهزة!
      </h2>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.9rem', fontFamily:'Cairo', marginBottom:'2rem' }}>
        شارك الرابط التالي مع ضيوفك
      </p>

      <div style={{
        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:'12px', padding:'16px', marginBottom:'1.5rem',
        fontFamily:'Space Mono, monospace', fontSize:'0.8rem', color:'rgba(255,255,255,0.7)',
        wordBreak:'break-all', lineHeight:1.6,
      }}>
        {url}
      </div>

      <div style={{ display:'flex', gap:'12px', justifyContent:'center' }}>
        <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
          onClick={copy}
          style={{
            background: accent, color:'#fff', border:'none', borderRadius:'10px',
            padding:'12px 24px', fontFamily:'Cairo', fontWeight:700, fontSize:'0.95rem', cursor:'pointer',
          }}>
          نسخ الرابط
        </motion.button>
        <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
          onClick={() => navigate(`/moments/${pageType}/${pageSlug}`)}
          style={{
            background:'rgba(255,255,255,0.05)', color:'#fff', border:'1px solid rgba(255,255,255,0.15)',
            borderRadius:'10px', padding:'12px 24px', fontFamily:'Cairo', fontWeight:700, fontSize:'0.95rem', cursor:'pointer',
          }}>
          عرض الصفحة
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MomentsCreatePage() {
  const [step, setStep]     = useState(0);
  const [token, setToken]   = useState(null);
  const [creatorName, setCreatorName] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [pageForm, setPageForm] = useState({
    title_ar:'', message_ar:'', event_date:'', location_ar:'', rsvp_enabled:true,
  });
  const [createdSlug, setCreatedSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const accent = TYPES.find(t => t.key === selectedType)?.color || '#d4a853';

  const handleAuth = (tok, name) => {
    setToken(tok);
    setCreatorName(name);
    setStep(1);
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(2);
  };

  const handlePublish = async () => {
    if (!pageForm.title_ar.trim() || !pageForm.message_ar.trim() || !pageForm.event_date) return;
    setLoading(true);
    try {
      const res = await createMomentPage({
        type: selectedType,
        ...pageForm,
        event_date: new Date(pageForm.event_date).toISOString(),
        theme_color: accent,
      }, token);
      setCreatedSlug(res.data.slug);
      setStep(3);
    } catch (err) {
      alert(err?.response?.data?.detail || 'حدث خطأ أثناء النشر');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="moments-page" dir="rtl" style={{ padding:'0 0 4rem' }}>
      <div style={{ position:'relative', overflow:'hidden' }}>
        <div className="moments-orb moments-orb--1" style={{ '--accent-glow':`rgba(${hexToRgb(accent)},0.25)` }} />

        {/* Header */}
        <div style={{ padding:'2rem 2rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:'600px', margin:'0 auto' }}>
          <div style={{ fontFamily:'Space Mono,monospace', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.25)' }}>
            Moments by SalmanSaaS
          </div>
          {creatorName && (
            <div style={{ fontFamily:'Cairo', fontSize:'0.8rem', color:accent }}>مرحباً، {creatorName}</div>
          )}
        </div>

        <div style={{ maxWidth:'500px', margin:'0 auto', padding:'2rem 2rem 0' }}>
          <StepIndicator current={step} total={4} accent={accent} />

          <div style={{
            background:'rgba(255,255,255,0.025)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'20px', padding:'36px 32px',
            backdropFilter:'blur(20px)',
          }}>
            <AnimatePresence mode="wait">
              {step === 0 && <AuthStep key="auth" onAuth={handleAuth} />}
              {step === 1 && <TypeStep key="type" selected={selectedType} onSelect={handleTypeSelect} />}
              {step === 2 && (
                <motion.div key="details" initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={spring}>
                  <DetailsStep form={pageForm} setForm={setPageForm} accent={accent} />
                  <motion.button
                    whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                    onClick={handlePublish} disabled={loading}
                    style={{
                      width:'100%', marginTop:'1.5rem',
                      background: accent, color:'#fff', border:'none', borderRadius:'10px',
                      padding:'14px', fontFamily:'Cairo', fontWeight:700, fontSize:'1rem',
                      cursor:'pointer', boxShadow:`0 0 24px ${accent}44`,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? '...' : '🚀 نشر الصفحة'}
                  </motion.button>
                  <button onClick={() => setStep(1)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontFamily:'Cairo', fontSize:'0.85rem', cursor:'pointer', marginTop:'12px', width:'100%' }}>
                    ← العودة
                  </button>
                </motion.div>
              )}
              {step === 3 && <DoneStep key="done" pageSlug={createdSlug} pageType={selectedType} accent={accent} />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex) {
  if (!hex || hex.length < 7) return '212,168,83';
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
