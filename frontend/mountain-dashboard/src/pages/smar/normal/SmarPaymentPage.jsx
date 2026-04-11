/**
 * SmarPaymentPage.jsx  —  /smar/payment
 * Dark GS MAR checkout — order summary + live card preview + services modal.
 *
 * Receives state from SmarBookingDrawer via navigate(location.state):
 *   { formData, unit, totalPrice, availableServices, lang, slug }
 */

import { useState, useEffect }              from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence }          from 'framer-motion';
import publicApi                            from '../../../utils/publicApi';
import SmarWhatsAppButton                   from '../ui/SmarWhatsAppButton';

// ── Tokens — Sunlit Heritage Light Theme ─────────────────────────────────────
const G = {
  bg:          '#faf9f6',
  bgPanel:     '#f4f0ea',
  bgCard:      'rgba(255,255,255,0.75)',
  border:      'rgba(180,158,110,0.22)',
  gold:        '#b8892e',
  goldDim:     'rgba(184,137,46,0.10)',
  text:        '#2d2824',
  textSec:     'rgba(45,40,36,0.60)',
  textMuted:   'rgba(45,40,36,0.38)',
  input:       'rgba(255,255,255,0.90)',
  inputBorder: 'rgba(180,158,110,0.28)',
  shadow:      '0 2px 20px rgba(120,90,40,0.09)',
  spring:      { type: 'spring', stiffness: 70, damping: 20, mass: 1.5 },
  snappy:      { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 },
};

// ── Card flip CSS (inlined — no external stylesheet needed) ─────────────────
const CARD_CSS = `
  .smar-flip-wrap  { perspective: 1200px; }
  .smar-flip-inner { position: relative; transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(.4,0,.2,1); }
  .smar-flip-inner.flipped { transform: rotateY(180deg); }
  .smar-flip-front,
  .smar-flip-back  { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 18px; }
  .smar-flip-back  { transform: rotateY(180deg); }
`;

// ── Formatted helpers ─────────────────────────────────────────────────────────
const fmtCard = (v = '') =>
  v.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
const fmtExp = (v = '') => {
  const c = v.replace(/\D/g, '');
  return c.length >= 3 ? `${c.slice(0, 2)}/${c.slice(2, 4)}` : c;
};

// ── Glass input ───────────────────────────────────────────────────────────────
function DarkInput({ label, type = 'text', name, value, onChange, placeholder, dir, error, onFocus, onBlur }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.7rem', color: G.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        dir={dir}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          width:         '100%',
          background:    G.input,
          border:        `1px solid ${error ? 'rgba(239,68,68,0.5)' : G.inputBorder}`,
          borderRadius:  12,
          padding:       '13px 16px',
          color:         G.text,
          fontSize:      '0.9rem',
          outline:       'none',
          boxSizing:     'border-box',
          transition:    'border-color 0.2s',
          fontFamily:    type === 'text' && name === 'number' ? 'monospace' : 'inherit',
          letterSpacing: type === 'text' && name === 'number' ? '0.12em' : 'normal',
        }}
      />
      {error && <p style={{ color: '#fca5a5', fontSize: '0.73rem', marginTop: 4 }}>{error}</p>}
    </div>
  );
}

// ── Services modal ────────────────────────────────────────────────────────────
function ServicesModal({ services, tempSelected, setTempSelected, onConfirm, onCancel, lang }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(200,185,160,0.50)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width:        '100%',
          maxWidth:     600,
          maxHeight:    '85vh',
          background:   G.bgPanel,
          border:       `1px solid ${G.border}`,
          borderRadius: 20,
          display:      'flex',
          flexDirection:'column',
          overflow:     'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 24px', borderBottom: `1px solid ${G.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: G.text, fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            {lang === 'ar' ? 'الخدمات الإضافية' : 'Additional Services'}
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: G.textSec, fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.length === 0 ? (
            <p style={{ color: G.textSec, textAlign: 'center', padding: '40px 0' }}>
              {lang === 'ar' ? 'لا توجد خدمات إضافية' : 'No additional services'}
            </p>
          ) : services.map((s) => {
            const qty = tempSelected[s.id] || 0;
            const name = lang === 'ar' ? (s.name_ar || s.name_en) : (s.name_en || s.name_ar);
            return (
              <div key={s.id} style={{ background: G.bgCard, border: `1px solid ${G.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                {s.image_url ? (
                  <img src={s.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,0.04)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🛎</div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ color: G.text, fontWeight: 600, fontSize: '0.9rem', margin: '0 0 4px' }}>{name}</p>
                  <p style={{ color: G.gold, fontSize: '0.82rem', margin: 0 }}>{s.basePrice} {s.currency || 'SAR'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '6px 10px' }}>
                  <button onClick={() => setTempSelected((p) => ({ ...p, [s.id]: Math.max(0, qty - 1) }))} disabled={qty === 0}
                    style={{ width: 28, height: 28, borderRadius: 8, background: qty > 0 ? 'rgba(239,68,68,0.15)' : 'transparent', border: 'none', color: qty > 0 ? '#fca5a5' : G.textMuted, cursor: qty > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>−</button>
                  <span style={{ color: G.text, fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: '0.9rem' }}>{qty}</span>
                  <button onClick={() => setTempSelected((p) => ({ ...p, [s.id]: qty + 1 }))}
                    style={{ width: 28, height: 28, borderRadius: 8, background: G.goldDim, border: 'none', color: G.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>+</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${G.border}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{ background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 10, padding: '10px 20px', color: G.textSec, cursor: 'pointer', fontSize: '0.88rem' }}>
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <motion.button onClick={onConfirm} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ background: 'linear-gradient(135deg, #d4a853, #b8892a)', border: 'none', borderRadius: 10, padding: '10px 24px', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
            {lang === 'ar' ? 'تأكيد' : 'Confirm'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Success state ─────────────────────────────────────────────────────────────
function SuccessScreen({ lang, slug, navigate }) {
  useEffect(() => {
    const t = setTimeout(() => navigate(`/${slug}/home`), 3500);
    return () => clearTimeout(t);
  }, [navigate, slug]);

  return (
    <div style={{ minHeight: '100vh', background: G.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '60px 40px', maxWidth: 420 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 }}
          style={{ width: 88, height: 88, borderRadius: '50%', background: G.goldDim, border: `1.5px solid ${G.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', fontSize: '2.2rem', color: G.gold }}
        >
          ✓
        </motion.div>
        <h2 style={{ color: G.text, fontSize: '1.8rem', fontWeight: 700, marginBottom: 12 }}>
          {lang === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
        </h2>
        <p style={{ color: G.textSec, fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 32 }}>
          {lang === 'ar' ? 'تم تأكيد حجزك. سنعود بك للرئيسية...' : 'Your booking is confirmed. Taking you home...'}
        </p>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 3.5, ease: 'linear' }}
            style={{ height: '100%', background: G.gold, borderRadius: 2 }}
          />
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SmarPaymentPage() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { slug }   = useParams();

  const {
    formData         = {},
    unit             = {},
    totalPrice       = 0,
    availableServices= [],
    lang             = 'ar',
  } = location.state || {};

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [errors, setErrors] = useState({});
  const [isFlipped,    setFlipped]     = useState(false);
  const [isSubmitting, setSubmitting]  = useState(false);
  const [isSuccess,    setSuccess]     = useState(false);
  const [selectedServices,  setSel]   = useState({});
  const [tempServices, setTemp]        = useState({});
  const [isServicesOpen, setServOpen]  = useState(false);

  // Guard: no state → back to listings
  useEffect(() => {
    if (!formData?.unit_id && !unit?.id) navigate(`/${slug}/listings`, { replace: true });
  }, []);

  const servicesTotal = availableServices.reduce(
    (s, sv) => s + sv.basePrice * (selectedServices[sv.id] || 0), 0
  );
  const finalTotal = totalPrice + servicesTotal;

  const nights = (() => {
    if (!formData.check_in || !formData.check_out) return 0;
    return Math.max(1, Math.ceil(
      (new Date(formData.check_out) - new Date(formData.check_in)) / 86400000
    ));
  })();

  const unitName = lang === 'ar' ? (unit.name_ar || unit.name_en) : (unit.name_en || unit.name_ar);
  const currency = availableServices[0]?.currency || 'SAR';

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'number') v = fmtCard(value.replace(/\D/g, ''));
    if (name === 'expiry') v = fmtExp(value);
    if (name === 'cvc')    v = value.replace(/\D/g, '').slice(0, 4);
    setCard((p) => ({ ...p, [name]: v }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const validate = () => {
    const e = {};
    if (card.number.replace(/\s/g, '').length !== 16)
      e.number = lang === 'ar' ? 'رقم البطاقة يجب أن يكون 16 رقماً' : 'Card number must be 16 digits';
    if (!card.name.trim())
      e.name = lang === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry))
      e.expiry = lang === 'ar' ? 'صيغة التاريخ غير صحيحة (MM/YY)' : 'Invalid format (MM/YY)';
    if (card.cvc.length < 3)
      e.cvc = lang === 'ar' ? 'رمز CVC غير صالح' : 'Invalid CVC';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const services = Object.entries(selectedServices)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ service_id: id, quantity: qty }));

      await publicApi.post(`/${slug}/bookings`, {
        unit_id:        formData.unit_id || unit.id,
        customer_name:  formData.name || formData.customer_name,
        customer_phone: formData.phone || formData.customer_phone,
        check_in:       formData.check_in,
        check_out:      formData.check_out,
        guests:         formData.guests || 1,
        arrival_time:   formData.arrivalTime,
        payment_method: 'card',
        services,
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setErrors({ submit: lang === 'ar' ? 'حدث خطأ أثناء الدفع. حاول مجدداً.' : 'Payment failed. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isSuccess) return <SuccessScreen lang={lang} slug={slug} navigate={navigate} />;

  return (
    <div data-slug="smar" dir={dir} style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{CARD_CSS + `
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(212,168,83,0.3); border-radius: 4px; }
        input::placeholder { color: rgba(45,40,36,0.3); }
      `}</style>

      {/* ── Top Nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position:       'sticky', top: 0, zIndex: 50,
        background:     'rgba(250,249,246,0.92)', backdropFilter: 'blur(20px)',
        borderBottom:   `1px solid ${G.border}`,
        padding:        '0 32px', height: 64,
        display:        'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <motion.button
          onClick={() => navigate(`/${slug}/listings`)}
          whileHover={{ x: lang === 'ar' ? 3 : -3 }}
          style={{ background: 'none', border: 'none', color: G.textSec, cursor: 'pointer', fontSize: '0.82rem', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ transform: lang === 'ar' ? 'scaleX(-1)' : 'none', display: 'inline-block' }}>←</span>
          {lang === 'ar' ? 'العودة' : 'Back'}
        </motion.button>
        <span style={{ color: G.gold, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.18em' }}>SMAR</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: G.textMuted, fontSize: '0.72rem' }}>
          <svg width="12" height="12" fill="none" stroke={G.gold} strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          {lang === 'ar' ? 'دفع آمن' : 'Secure Payment'}
        </div>
      </nav>

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)', flexWrap: 'wrap' }}>

        {/* ─ LEFT: Order Summary ──────────────────────────────────────── */}
        <div style={{
          width:          'clamp(320px, 38%, 460px)',
          background:     G.bgPanel,
          borderRight:    `1px solid ${G.border}`,
          padding:        '48px 40px',
          display:        'flex',
          flexDirection:  'column',
          gap:            24,
        }}>
          {/* Eyebrow */}
          <div>
            <p style={{ color: G.gold, fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              {lang === 'ar' ? 'ملخص الحجز' : 'Booking Summary'}
            </p>
            <h2 style={{ color: G.text, fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
              {lang === 'ar' ? `إتمام الحجز في ${unitName}` : `Completing booking for ${unitName}`}
            </h2>
          </div>

          <div style={{ height: 1, background: G.border }} />

          {/* Unit row */}
          <SummaryRow label={lang === 'ar' ? 'الوحدة' : 'Unit'} value={unitName} lang={lang} />
          <SummaryRow
            label={lang === 'ar' ? 'تواريخ الإقامة' : 'Stay Dates'}
            value={`${formData.check_in || '—'}  →  ${formData.check_out || '—'}`}
            lang={lang}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SummaryChip label={lang === 'ar' ? 'مدة الإقامة' : 'Duration'} value={`${nights} ${lang === 'ar' ? 'ليالي' : 'nights'}`} />
            <SummaryChip label={lang === 'ar' ? 'الأشخاص' : 'Guests'} value={`${formData.guests || 1}`} />
          </div>

          {/* Services */}
          <div style={{ background: G.bgCard, border: `1px solid ${G.border}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: G.textSec, fontSize: '0.8rem' }}>{lang === 'ar' ? 'الخدمات الإضافية' : 'Add-on Services'}</span>
              <motion.button
                onClick={() => { setTemp({ ...selectedServices }); setServOpen(true); }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{ background: G.goldDim, border: `1px solid rgba(212,168,83,0.25)`, borderRadius: 8, padding: '4px 12px', color: G.gold, fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
              >
                + {lang === 'ar' ? 'أضف خدمة' : 'Add'}
              </motion.button>
            </div>
            {Object.keys(selectedServices).filter((id) => selectedServices[id] > 0).length === 0 ? (
              <p style={{ color: G.textMuted, fontSize: '0.78rem', margin: 0 }}>
                {lang === 'ar' ? 'لم تُضَف خدمات بعد' : 'No services added yet'}
              </p>
            ) : (
              availableServices
                .filter((s) => selectedServices[s.id] > 0)
                .map((s) => (
                  <p key={s.id} style={{ color: G.textSec, fontSize: '0.8rem', margin: '4px 0' }}>
                    {lang === 'ar' ? s.name_ar : s.name_en} × {selectedServices[s.id]}
                    <span style={{ color: G.gold, marginRight: 4, marginLeft: 4 }}>
                      +{(s.basePrice * selectedServices[s.id]).toLocaleString()} {currency}
                    </span>
                  </p>
                ))
            )}
          </div>

          {/* Total */}
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: `1px solid ${G.border}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ color: G.textSec, fontSize: '0.88rem' }}>
              {lang === 'ar' ? 'إجمالي الدفع' : 'Total Amount'}
            </span>
            <span style={{ color: G.gold, fontSize: '2rem', fontWeight: 800 }}>
              {finalTotal.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: G.textMuted }}>{currency}</span>
            </span>
          </div>
        </div>

        {/* ─ RIGHT: Card Form ──────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 320, padding: '48px 40px', overflowY: 'auto' }}>
          <h3 style={{ color: G.text, fontSize: '1.2rem', fontWeight: 700, marginBottom: 36 }}>
            {lang === 'ar' ? 'بيانات البطاقة' : 'Card Details'}
          </h3>

          {/* ─ 3D Card Preview ─ */}
          <div
            className="smar-flip-wrap"
            style={{ width: '100%', height: 200, marginBottom: 36 }}
          >
            <div
              className={`smar-flip-inner${isFlipped ? ' flipped' : ''}`}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Front */}
              <div
                className="smar-flip-front"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                  padding:    '24px 28px',
                  display:    'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border:     `1px solid rgba(212,168,83,0.2)`,
                  boxShadow:  '0 8px 32px rgba(120,90,40,0.14)',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: -6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,168,83,0.5)' }} />
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,168,83,0.3)', marginLeft: -12 }} />
                  </div>
                  <span style={{ color: 'rgba(212,168,83,0.6)', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {lang === 'ar' ? 'دفع' : 'PAY'}
                  </span>
                </div>
                {/* Card number */}
                <div style={{ color: card.number ? G.text : G.textMuted, fontFamily: 'monospace', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', letterSpacing: '0.18em', marginTop: 8 }} dir="ltr">
                  {card.number || '•••• •••• •••• ••••'}
                </div>
                {/* Bottom row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ color: G.textMuted, fontSize: '0.6rem', letterSpacing: '0.1em', margin: '0 0 3px', textTransform: 'uppercase' }}>{lang === 'ar' ? 'اسم الحامل' : 'Cardholder'}</p>
                    <p style={{ color: card.name ? G.text : G.textMuted, fontSize: '0.88rem', textTransform: 'uppercase', fontWeight: 600, margin: 0, letterSpacing: '0.04em' }}>
                      {card.name || (lang === 'ar' ? 'الاسم على البطاقة' : 'YOUR NAME')}
                    </p>
                  </div>
                  <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                    <p style={{ color: G.textMuted, fontSize: '0.6rem', letterSpacing: '0.1em', margin: '0 0 3px', textTransform: 'uppercase' }}>{lang === 'ar' ? 'صالح حتى' : 'Valid Thru'}</p>
                    <p style={{ color: card.expiry ? G.text : G.textMuted, fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600, margin: 0 }} dir="ltr">
                      {card.expiry || 'MM/YY'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div
                className="smar-flip-back"
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
                  display:    'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  border:     `1px solid rgba(212,168,83,0.2)`,
                  boxShadow:  '0 8px 32px rgba(120,90,40,0.14)',
                }}
              >
                <div style={{ height: 44, background: 'rgba(45,40,36,0.55)', marginBottom: 20 }} />
                <div dir="ltr" style={{ padding: '0 28px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{
                    width:        '60%',
                    background:   'rgba(240,230,208,0.9)',
                    borderRadius: 6,
                    padding:      '10px 16px',
                    textAlign:    'right',
                    fontFamily:   'monospace',
                    fontSize:     '1.1rem',
                    color:        '#1a1a2e',
                    fontWeight:   700,
                    letterSpacing: '0.14em',
                  }}>
                    {card.cvc || '•••'}
                  </div>
                </div>
                <p style={{ color: G.textMuted, fontSize: '0.6rem', textAlign: 'center', marginTop: 12, letterSpacing: '0.1em' }}>CVV / CVC</p>
              </div>
            </div>
          </div>

          {/* ─ Form ─ */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <DarkInput
              label={lang === 'ar' ? 'رقم البطاقة' : 'Card Number'}
              name="number"
              value={card.number}
              onChange={handleCardChange}
              placeholder="0000 0000 0000 0000"
              dir="ltr"
              error={errors.number}
            />
            <DarkInput
              label={lang === 'ar' ? 'اسم حامل البطاقة' : 'Cardholder Name'}
              name="name"
              value={card.name}
              onChange={handleCardChange}
              placeholder={lang === 'ar' ? 'الاسم كما يظهر على البطاقة' : 'Name as on card'}
              error={errors.name}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <DarkInput
                label={lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                name="expiry"
                value={card.expiry}
                onChange={handleCardChange}
                placeholder="MM/YY"
                dir="ltr"
                error={errors.expiry}
              />
              <DarkInput
                label={lang === 'ar' ? 'رمز الأمان' : 'Security Code'}
                name="cvc"
                type="password"
                value={card.cvc}
                onChange={handleCardChange}
                placeholder="•••"
                dir="ltr"
                error={errors.cvc}
                onFocus={() => setFlipped(true)}
                onBlur={() => setFlipped(false)}
              />
            </div>

            {errors.submit && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: '0.83rem', margin: 0 }}>
                {errors.submit}
              </motion.p>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isSubmitting || !card.number || !card.name || !card.expiry || !card.cvc}
              whileHover={!isSubmitting ? { scale: 1.02, boxShadow: '0 12px 40px rgba(212,168,83,0.28)' } : {}}
              whileTap={!isSubmitting ? { scale: 0.97 } : {}}
              style={{
                marginTop:     8,
                background:    (isSubmitting || !card.number || !card.name || !card.expiry || !card.cvc)
                  ? 'rgba(212,168,83,0.35)'
                  : 'linear-gradient(135deg, #d4a853 0%, #b8892a 100%)',
                border:        'none',
                borderRadius:  14,
                padding:       '17px 24px',
                color:         '#050508',
                fontWeight:    700,
                fontSize:      '1rem',
                cursor:        isSubmitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                gap:           10,
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#050508', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  {lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                </>
              ) : (
                <>
                  {lang === 'ar' ? 'ادفع' : 'Pay'} {finalTotal.toLocaleString()} {currency}
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </motion.button>

            {/* Security note */}
            <p style={{ color: G.textMuted, fontSize: '0.72rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="10" height="10" fill={G.gold} viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
              </svg>
              {lang === 'ar' ? 'مدفوعات آمنة ومشفرة بالكامل' : 'Secured with 256-bit encryption'}
            </p>
          </form>
        </div>
      </div>

      {/* ── Services Modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isServicesOpen && (
          <ServicesModal
            key="services-modal"
            services={availableServices}
            tempSelected={tempServices}
            setTempSelected={setTemp}
            onConfirm={() => { setSel(tempServices); setServOpen(false); }}
            onCancel={() => setServOpen(false)}
            lang={lang}
          />
        )}
      </AnimatePresence>

      <SmarWhatsAppButton lang={lang} />
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ color: G.textMuted, fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color: G.text, fontSize: '0.9rem', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function SummaryChip({ label, value }) {
  return (
    <div style={{ background: G.bgCard, border: `1px solid ${G.border}`, borderRadius: 12, padding: '12px 14px' }}>
      <p style={{ color: G.textMuted, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: G.text, fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}
