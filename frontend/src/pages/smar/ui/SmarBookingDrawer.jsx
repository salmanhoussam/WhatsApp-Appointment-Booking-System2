/**
 * SmarBookingDrawer.jsx
 * Side drawer (slides from right) — booking form + payment method selector.
 *
 * Flow:
 *   Cash / Whish / OMT  →  POST /client/{slug}/book  →  success state
 *   Card                →  navigate(/{slug}/payment, { state: {...} })
 *
 * Props:
 *   unit          — unit object
 *   searchDates   — { checkIn: string, checkOut: string }
 *   slug          — tenant slug ('smar')
 *   onClose       — fn
 *   lang          — 'ar' | 'en'
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect }     from 'react';
import { useNavigate }             from 'react-router-dom';
import { useTenantBase }           from '../../../utils/useTenantSlug';
import publicApi                   from '../../../utils/publicApi';
import UnitCalendar                from '../../../components/UnitCalendar';

// ── Tokens — Sunlit Heritage Light Theme ─────────────────────────────────────
const G = {
  bg:          '#faf9f6',
  bgDeep:      '#f4f0ea',
  card:        'rgba(255,255,255,0.75)',
  border:      'rgba(180,158,110,0.22)',
  gold:        '#b8892e',
  goldDim:     'rgba(184,137,46,0.10)',
  text:        '#2d2824',
  textSec:     'rgba(45,40,36,0.60)',
  textMuted:   'rgba(45,40,36,0.38)',
  input:       'rgba(255,255,255,0.90)',
  inputBorder: 'rgba(180,158,110,0.28)',
  spring:      { type: 'spring', stiffness: 70, damping: 20, mass: 1.5 },
  snappy:      { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 },
};

// ── Dark glass input ──────────────────────────────────────────────────────────
function GlassInput({ label, type = 'text', name, value, onChange, placeholder, dir, min, max }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.72rem', color: G.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        max={max}
        dir={dir}
        style={{
          width:           '100%',
          background:      G.input,
          border:          `1px solid ${G.inputBorder}`,
          borderRadius:    12,
          padding:         '13px 16px',
          color:           G.text,
          fontSize:        '0.9rem',
          outline:         'none',
          boxSizing:       'border-box',
          transition:      'border-color 0.2s',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(212,168,83,0.5)'; }}
        onBlur={(e)  => { e.target.style.borderColor = G.inputBorder; }}
      />
    </div>
  );
}

// ── Payment method card ───────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'cash',  icon: '💵', ar: 'نقداً عند الوصول', en: 'Cash on Arrival' },
  { id: 'whish', icon: '📱', ar: 'Whish Money',      en: 'Whish Money'     },
  { id: 'omt',   icon: '💸', ar: 'OMT Pay',          en: 'OMT Pay'         },
  { id: 'card',  icon: '💳', ar: 'بطاقة ائتمانية',   en: 'Credit Card'     },
];

function PayMethodCard({ method, selected, onSelect, lang }) {
  return (
    <motion.div
      onClick={() => onSelect(method.id)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        cursor:     'pointer',
        border:     `1.5px solid ${selected ? G.gold : G.border}`,
        background: selected ? G.goldDim : G.card,
        borderRadius: 12,
        padding:    '14px 10px',
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap:        6,
        transition: 'border-color 0.2s, background 0.2s',
        boxShadow:  selected ? `0 0 16px rgba(212,168,83,0.15)` : 'none',
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>{method.icon}</span>
      <span style={{
        fontSize:   '0.7rem',
        color:      selected ? G.gold : G.textSec,
        fontWeight: selected ? 600 : 400,
        textAlign:  'center',
        lineHeight: 1.3,
      }}>
        {lang === 'ar' ? method.ar : method.en}
      </span>
    </motion.div>
  );
}

// ── Success Banner ────────────────────────────────────────────────────────────
function SuccessBanner({ lang, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        height:         '100%',
        gap:            20,
        padding:        '40px 32px',
        textAlign:      'center',
      }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
        style={{
          width:          72,
          height:         72,
          borderRadius:   '50%',
          background:     'rgba(212,168,83,0.15)',
          border:         `1.5px solid ${G.gold}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       '2rem',
        }}
      >
        ✓
      </motion.div>

      <h3 style={{ color: G.text, fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
        {lang === 'ar' ? 'تم الحجز بنجاح!' : 'Booking Confirmed!'}
      </h3>
      <p style={{ color: G.textSec, fontSize: '0.88rem', lineHeight: 1.7, maxWidth: 260, margin: 0 }}>
        {lang === 'ar'
          ? 'تم إرسال طلب حجزك. سيتواصل معك فريقنا عبر واتساب قريباً لتأكيد الحجز.'
          : 'Your booking request has been sent. Our team will contact you via WhatsApp shortly to confirm.'}
      </p>
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{
          marginTop:     8,
          background:    'linear-gradient(135deg, #d4a853, #b8892a)',
          border:        'none',
          borderRadius:  12,
          padding:       '14px 32px',
          color:         '#fff',
          fontWeight:    700,
          fontSize:      '0.9rem',
          cursor:        'pointer',
          letterSpacing: '0.04em',
        }}
      >
        {lang === 'ar' ? 'إغلاق' : 'Close'}
      </motion.button>
    </motion.div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nightsBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function SmarBookingDrawer({ unit, searchDates, slug, onClose, lang = 'ar' }) {
  const navigate = useNavigate();
  const base     = useTenantBase();

  // Date state — seeded from searchDates prop if provided, otherwise user picks via calendar
  const [dates, setDates] = useState({
    checkIn:  searchDates?.checkIn  ? new Date(searchDates.checkIn)  : null,
    checkOut: searchDates?.checkOut ? new Date(searchDates.checkOut) : null,
  });

  // Live price state
  const [livePrice,    setLivePrice]    = useState(null);   // null = not yet loaded
  const [priceLoading, setPriceLoading] = useState(false);

  const [form, setForm] = useState({
    name:          '',
    phone:         '',
    guests:        unit?.capacity || 1,
    arrivalTime:   '14:00',
    paymentMethod: '',
    paymentReference: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess,    setIsSuccess]    = useState(false);
  const [error,        setError]        = useState('');

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Recalculate price whenever dates or guests change
  useEffect(() => {
    const { checkIn, checkOut } = dates;
    if (!checkIn || !checkOut || !unit?.id) return;
    const ci = fmtDate(checkIn);
    const co = fmtDate(checkOut);
    setPriceLoading(true);
    setLivePrice(null);
    publicApi.get(`/${slug}/price`, {
      params: { unit_id: unit.id, check_in: ci, check_out: co, guests: form.guests || 1 },
    })
      .then(r => setLivePrice(r.data))
      .catch(() => setLivePrice(null))
      .finally(() => setPriceLoading(false));
  }, [dates.checkIn, dates.checkOut, form.guests, unit?.id, slug]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleCalendarChange = ({ checkIn, checkOut }) => {
    setDates({ checkIn, checkOut });
    setError('');
  };

  const validate = () => {
    if (!dates.checkIn || !dates.checkOut)
      return lang === 'ar' ? 'يرجى تحديد تواريخ الإقامة من التقويم' : 'Please select your dates from the calendar';
    if (!form.name.trim()) return lang === 'ar' ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name';
    if (!form.phone.trim()) return lang === 'ar' ? 'يرجى إدخال رقم الواتساب' : 'Please enter your WhatsApp number';
    if (!form.paymentMethod) return lang === 'ar' ? 'يرجى اختيار طريقة الدفع' : 'Please select a payment method';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    const ci = fmtDate(dates.checkIn);
    const co = fmtDate(dates.checkOut);

    // Card → navigate to payment page
    if (form.paymentMethod === 'card') {
      try {
        setIsSubmitting(true);
        const [priceResp, servicesResp] = await Promise.all([
          livePrice
            ? Promise.resolve({ data: livePrice })
            : publicApi.get(`/${slug}/price`, { params: { unit_id: unit.id, check_in: ci, check_out: co, guests: form.guests || 1 } }),
          publicApi.get(`/${slug}/services`, { params: { unit_id: unit.id } }),
        ]);

        onClose();
        navigate(`${base}/payment`, {
          state: {
            formData:          { ...form, check_in: ci, check_out: co, unit_id: unit.id },
            unit,
            totalPrice:        priceResp.data.total_price,
            availableServices: servicesResp.data,
            lang,
            slug,
          },
        });
      } catch {
        setError(lang === 'ar' ? 'حدث خطأ في جلب بيانات الدفع' : 'Error fetching payment data');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Cash / Whish / OMT → POST booking directly
    try {
      setIsSubmitting(true);
      await publicApi.post(`/${slug}/bookings`, {
        unit_id:           unit.id,
        customer_name:     form.name,
        customer_phone:    form.phone,
        guests:            form.guests,
        arrival_time:      form.arrivalTime,
        payment_method:    form.paymentMethod,
        payment_reference: form.paymentReference,
        check_in:          ci,
        check_out:         co,
      });
      setIsSuccess(true);
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ أثناء الحجز. حاول مجدداً.' : 'Booking failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unitName = lang === 'ar' ? (unit?.name_ar || unit?.name_en) : (unit?.name_en || unit?.name_ar);
  const nights   = nightsBetween(dates.checkIn, dates.checkOut);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position:       'fixed',
          inset:          0,
          zIndex:         102,
          background:     'rgba(200,185,160,0.38)',
          backdropFilter: 'blur(5px)',
        }}
      />

      {/* Drawer panel */}
      <motion.div
        key="drawer-panel"
        dir={dir}
        initial={{ x: lang === 'ar' ? '-100%' : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: lang === 'ar' ? '-100%' : '100%' }}
        transition={G.spring}
        onClick={(e) => e.stopPropagation()}
        style={{
          position:   'fixed',
          top:        0,
          [lang === 'ar' ? 'left' : 'right']: 0,
          zIndex:     103,
          width:      'min(480px, 100vw)',
          height:     '100dvh',
          background: G.bg,
          borderLeft:  lang === 'ar' ? 'none' : `1px solid ${G.border}`,
          borderRight: lang === 'ar' ? `1px solid ${G.border}` : 'none',
          boxShadow:   lang === 'ar'
            ? '4px 0 40px rgba(120,90,40,0.12)'
            : '-4px 0 40px rgba(120,90,40,0.12)',
          display:    'flex',
          flexDirection: 'column',
          overflow:   'hidden',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          padding:       '24px 28px 20px',
          borderBottom:  `1px solid ${G.border}`,
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          flexShrink:    0,
        }}>
          <div>
            <p style={{ color: G.textMuted, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
              {lang === 'ar' ? 'إتمام الحجز' : 'Complete Booking'}
            </p>
            <h3 style={{ color: G.text, fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              {unitName}
            </h3>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width:          36,
              height:         36,
              borderRadius:   '50%',
              background:     G.card,
              border:         `1px solid ${G.border}`,
              color:          G.textSec,
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '0.9rem',
              flexShrink:     0,
            }}
          >
            ✕
          </motion.button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
          {isSuccess ? (
            <SuccessBanner lang={lang} onClose={onClose} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* ── Visual Calendar date picker ── */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: G.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
                  {lang === 'ar' ? 'اختر تواريخ الإقامة' : 'Select Your Dates'}
                </label>
                <UnitCalendar
                  unitId={unit?.id}
                  slug={slug}
                  onChange={handleCalendarChange}
                  value={dates}
                />
              </div>

              {/* ── Nights + price summary strip (shown after date selection) ── */}
              <AnimatePresence>
                {nights > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    style={{
                      background:   G.goldDim,
                      border:       `1px solid rgba(212,168,83,0.2)`,
                      borderRadius: 12,
                      padding:      '12px 16px',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          16,
                      flexWrap:     'wrap',
                    }}
                  >
                    <div>
                      <span style={{ color: G.textMuted, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                        {lang === 'ar' ? 'الدخول' : 'Check-in'}
                      </span>
                      <span style={{ color: G.gold, fontSize: '0.88rem', fontWeight: 600 }}>{fmtDate(dates.checkIn)}</span>
                    </div>
                    <div style={{ width: 1, background: G.border, alignSelf: 'stretch' }} />
                    <div>
                      <span style={{ color: G.textMuted, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                        {lang === 'ar' ? 'الخروج' : 'Check-out'}
                      </span>
                      <span style={{ color: G.gold, fontSize: '0.88rem', fontWeight: 600 }}>{fmtDate(dates.checkOut)}</span>
                    </div>
                    <div style={{ width: 1, background: G.border, alignSelf: 'stretch' }} />
                    <div>
                      <span style={{ color: G.textMuted, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                        {lang === 'ar' ? 'الليالي' : 'Nights'}
                      </span>
                      <span style={{ color: G.text, fontSize: '0.88rem', fontWeight: 700 }}>{nights}</span>
                    </div>
                    <div style={{ marginRight: 'auto' }}>
                      <span style={{ color: G.textMuted, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                        {lang === 'ar' ? 'الإجمالي' : 'Total'}
                      </span>
                      <span style={{ color: G.gold, fontSize: '0.95rem', fontWeight: 700 }}>
                        {priceLoading ? '...' : livePrice ? `${livePrice.total_price} ${livePrice.currency}` : '—'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Personal info */}
              <GlassInput label={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} name="name" value={form.name} onChange={handleChange} placeholder={lang === 'ar' ? 'سلمان...' : 'Your name...'} />
              <GlassInput label={lang === 'ar' ? 'رقم الواتساب' : 'WhatsApp Number'} name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+961 70 000 000" dir="ltr" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <GlassInput label={lang === 'ar' ? 'عدد الأشخاص' : 'Guests'} name="guests" type="number" value={form.guests} onChange={handleChange} min={1} max={unit?.capacity || 20} />
                <GlassInput label={lang === 'ar' ? 'وقت الوصول' : 'Arrival Time'} name="arrivalTime" type="time" value={form.arrivalTime} onChange={handleChange} />
              </div>

              {/* Payment method */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: G.textMuted, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                  {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {PAYMENT_METHODS.map((m) => (
                    <PayMethodCard
                      key={m.id}
                      method={m}
                      selected={form.paymentMethod === m.id}
                      onSelect={(id) => setForm((p) => ({ ...p, paymentMethod: id }))}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>

              {/* Reference (Whish / OMT) */}
              {(form.paymentMethod === 'whish' || form.paymentMethod === 'omt') && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background:   'rgba(212,168,83,0.08)',
                    border:       `1px solid rgba(212,168,83,0.2)`,
                    borderRadius: 12,
                    padding:      '16px',
                  }}
                >
                  <p style={{ color: G.textSec, fontSize: '0.82rem', marginBottom: 12 }}>
                    {lang === 'ar'
                      ? `حوّل المبلغ إلى: +961 70 000 000 عبر ${form.paymentMethod.toUpperCase()} ثم أدخل رقم الإيصال أدناه.`
                      : `Transfer the amount to +961 70 000 000 via ${form.paymentMethod.toUpperCase()} then enter the receipt number below.`}
                  </p>
                  <GlassInput label={lang === 'ar' ? 'رقم الإيصال' : 'Receipt Reference'} name="paymentReference" value={form.paymentReference} onChange={handleChange} placeholder="e.g. 123456789" dir="ltr" />
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background:   'rgba(239,68,68,0.1)',
                    border:       '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 10,
                    padding:      '10px 14px',
                    color:        '#fca5a5',
                    fontSize:     '0.83rem',
                    margin:       0,
                  }}
                >
                  {error}
                </motion.p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer CTA ─────────────────────────────────────────────── */}
        {!isSuccess && (
          <div style={{
            padding:      '20px 28px',
            borderTop:    `1px solid ${G.border}`,
            flexShrink:   0,
            background:   G.bgDeep,
          }}>
            <motion.button
              onClick={handleSubmit}
              disabled={isSubmitting}
              whileHover={!isSubmitting ? { scale: 1.02, boxShadow: '0 10px 36px rgba(212,168,83,0.28)' } : {}}
              whileTap={!isSubmitting ? { scale: 0.97 } : {}}
              style={{
                width:         '100%',
                background:    isSubmitting ? 'rgba(212,168,83,0.4)' : 'linear-gradient(135deg, #d4a853 0%, #b8892a 100%)',
                border:        'none',
                borderRadius:  14,
                padding:       '16px 24px',
                color:         '#fff',
                fontWeight:    700,
                fontSize:      '0.95rem',
                cursor:        isSubmitting ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                gap:           8,
                transition:    'background 0.2s',
              }}
            >
              {isSubmitting ? (
                <>
                  <span style={{
                    width:        16,
                    height:       16,
                    border:       '2px solid rgba(0,0,0,0.3)',
                    borderTopColor:'#fff',
                    borderRadius: '50%',
                    animation:    'spin 0.7s linear infinite',
                    display:      'inline-block',
                  }} />
                  {lang === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                </>
              ) : form.paymentMethod === 'card' ? (
                <>{lang === 'ar' ? 'متابعة للدفع بالبطاقة' : 'Continue to Card Payment'} →</>
              ) : (
                <>{lang === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'} ✓</>
              )}
            </motion.button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </AnimatePresence>
  );
}
