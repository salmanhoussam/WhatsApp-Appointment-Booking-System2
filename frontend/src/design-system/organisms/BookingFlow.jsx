/**
 * BookingFlow.jsx  —  Organism  (Phase 33.2)
 *
 * Self-contained multi-step booking wizard.
 * State machine: dates → details → payment → success
 *
 * Props:
 *   unit      — Unit object ({ id, name_ar, name_en, price, type, ... })
 *   onCancel  — () => void  — called when user dismisses the flow
 *
 * Reads from hooks internally — zero data props required beyond the unit.
 *
 * React 19 / FM12 safety:
 *   AnimatePresence mode="wait" — safe, no MotionValue bindings.
 *   All motion.div props are plain object literals (initial/animate/exit only).
 *   NO layout animations, NO useScroll, NO useTransform.
 *
 * Usage:
 *   const [selected, setSelected] = useState(null);
 *   {selected && <BookingFlow unit={selected} onCancel={() => setSelected(null)} />}
 */

import { useState }              from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, Input, Button, PriceTag, GoldDot } from '../atoms';
import publicApi      from '../../utils/publicApi';
import useTenantSlug  from '../../hooks/useTenantSlug';
import useTenantConfig from '../../hooks/useTenantConfig';

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS        = ['dates', 'details', 'payment'];
const STEP_NUMBERS = { dates: 1, details: 2, payment: 3 };

const STEP_TITLE = {
  dates:   { ar: 'التواريخ والضيوف', en: 'Dates & Guests' },
  details: { ar: 'بيانات الحجز',    en: 'Guest Details'  },
  payment: { ar: 'طريقة الدفع',     en: 'Payment'        },
  success: { ar: 'تم الحجز',        en: 'Booking Sent'   },
};

const PM_META = {
  cash:     { ar: 'نقداً عند الوصول', en: 'Cash on Arrival', icon: '💵' },
  card:     { ar: 'بطاقة ائتمان',    en: 'Credit Card',     icon: '💳' },
  whatsapp: { ar: 'واتساب باي',      en: 'WhatsApp Pay',    icon: '💬' },
  whish:    { ar: 'ويش موني',        en: 'Whish Money',     icon: '🌐' },
  omt:      { ar: 'OMT',             en: 'OMT',             icon: '🏧' },
};

// Safe step transition — plain objects, not MotionValues
const STEP_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -10 },
};

const TRANSITION = { duration: 0.22, ease: 'easeOut' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, Math.round(
    (new Date(checkOut) - new Date(checkIn)) / 86400000,
  ));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ step }) {
  const current = STEP_NUMBERS[step] ?? 4;
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {STEPS.map((s, i) => {
        const n      = i + 1;
        const active = n === current;
        const done   = n < current;
        return (
          <div
            key={s}
            className={[
              'h-1.5 rounded-full transition-all duration-300',
              active ? 'w-5 bg-[#d4a853]' : done ? 'w-1.5 bg-[#d4a853]/50' : 'w-1.5 bg-white/15',
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}

// ── Step 1: Dates & Guests ────────────────────────────────────────────────────

function StepDates({ form, errors, set, lang }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          type="date"
          label={lang === 'ar' ? 'تاريخ الدخول' : 'Check-in'}
          min={today()}
          value={form.check_in}
          onChange={e => set('check_in', e.target.value)}
          error={errors.check_in}
        />
        <Input
          type="date"
          label={lang === 'ar' ? 'تاريخ الخروج' : 'Check-out'}
          min={form.check_in || today()}
          value={form.check_out}
          onChange={e => set('check_out', e.target.value)}
          error={errors.check_out}
        />
      </div>
      <Input
        type="number"
        label={lang === 'ar' ? 'عدد الضيوف' : 'Guests'}
        min={1}
        max={20}
        value={form.guests}
        onChange={e => set('guests', e.target.value)}
        error={errors.guests}
        hint={lang === 'ar' ? 'الحد الأقصى 20 شخصاً' : 'Max 20 guests'}
        className="sm:max-w-[180px]"
      />
    </div>
  );
}

// ── Step 2: Guest Details ─────────────────────────────────────────────────────

function StepDetails({ form, errors, set, lang }) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        type="text"
        label={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}
        placeholder={lang === 'ar' ? 'محمد أحمد...' : 'John Doe...'}
        value={form.name}
        onChange={e => set('name', e.target.value)}
        error={errors.name}
        autoComplete="name"
      />
      <Input
        type="tel"
        label={lang === 'ar' ? 'رقم واتساب' : 'WhatsApp Number'}
        placeholder="+961 70 000 000"
        value={form.phone}
        onChange={e => set('phone', e.target.value)}
        error={errors.phone}
        autoComplete="tel"
        hint={lang === 'ar' ? 'سيُرسل التأكيد على هذا الرقم' : 'Confirmation will be sent here'}
        dir="ltr"
      />
      <Input
        type="email"
        label={lang === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}
        placeholder="example@email.com"
        value={form.email}
        onChange={e => set('email', e.target.value)}
        error={errors.email}
        autoComplete="email"
        dir="ltr"
      />
    </div>
  );
}

// ── Step 3: Payment ───────────────────────────────────────────────────────────

function StepPayment({ form, errors, set, lang, unit, currency, paymentMethods, nights }) {
  const total = nights * (unit?.price || 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Nights summary */}
      {nights > 0 && (
        <div
          className="flex items-center justify-between rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-4 py-3"
          dir="ltr"
        >
          <span className="text-xs text-white/40 tracking-wide">
            {nights} {lang === 'ar' ? `${nights === 1 ? 'ليلة' : 'ليالٍ'} × ${unit?.price ?? '—'} ${currency}` : `night${nights !== 1 ? 's' : ''} × ${unit?.price ?? '—'} ${currency}`}
          </span>
          <PriceTag price={total} currency={currency} lang={lang} size="md" />
        </div>
      )}

      {/* Payment method selection */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] tracking-[0.32em] uppercase text-white/40 font-semibold">
          {lang === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {paymentMethods.map(pm => {
            const meta    = PM_META[pm] ?? { ar: pm, en: pm, icon: '💰' };
            const label   = lang === 'ar' ? meta.ar : meta.en;
            const active  = form.payment_method === pm;
            return (
              <button
                key={pm}
                type="button"
                onClick={() => set('payment_method', pm)}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-[10px] border px-3 py-3',
                  'text-xs font-medium transition-all duration-200 cursor-pointer',
                  active
                    ? 'border-[#d4a853]/60 bg-[#d4a853]/10 text-[#d4a853]'
                    : 'border-white/[0.08] bg-white/[0.02] text-white/50 hover:border-white/20 hover:bg-white/[0.04] hover:text-white/70',
                ].join(' ')}
                aria-pressed={active}
              >
                <span className="text-lg leading-none" aria-hidden="true">{meta.icon}</span>
                <span className="tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
        {errors.payment_method && (
          <p className="text-[10px] text-red-400 tracking-wide mt-0.5">
            {errors.payment_method}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Success ───────────────────────────────────────────────────────────

function StepSuccess({ lang, onCancel }) {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      {/* Glowing gold dot */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute rounded-full bg-[#d4a853]/10"
          style={{ width: 80, height: 80 }}
          aria-hidden="true"
        />
        <GoldDot size="lg" />
      </div>

      {/* Check mark */}
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4a853]/30 bg-[#d4a853]/10"
        aria-hidden="true"
      >
        <span className="text-[#d4a853] text-2xl font-bold">✓</span>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-white/90 tracking-wide">
          {lang === 'ar' ? 'تم استلام طلبك بنجاح!' : 'Booking Request Received!'}
        </h3>
        <p className="text-xs text-white/40 leading-relaxed max-w-xs mx-auto">
          {lang === 'ar'
            ? 'سنتواصل معك عبر واتساب خلال وقت قصير لتأكيد حجزك.'
            : 'We will reach out via WhatsApp shortly to confirm your booking.'}
        </p>
      </div>

      <Button variant="ghost" onClick={onCancel} className="mt-2">
        {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
      </Button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function BookingFlow({ unit, onCancel }) {
  const slug              = useTenantSlug();
  const { config }        = useTenantConfig();
  const currency          = config?.currency        ?? 'USD';
  const paymentMethods    = config?.payment_methods ?? ['cash'];
  const lang              = 'ar'; // TODO: wire to LanguageContext in Phase 35

  const [step,         setStep]         = useState('dates');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError,  setSubmitError]  = useState(null);

  const [form, setForm] = useState({
    check_in:       '',
    check_out:      '',
    guests:         1,
    name:           '',
    phone:          '',
    email:          '',
    payment_method: '',
  });

  const [errors, setErrors] = useState({});

  // Single field updater — clears the error on change
  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const nights = calcNights(form.check_in, form.check_out);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (step === 'dates') {
      if (!form.check_in)  errs.check_in  = 'اختر تاريخ الدخول';
      if (!form.check_out) errs.check_out = 'اختر تاريخ الخروج';
      if (form.check_in && form.check_out && form.check_in >= form.check_out)
        errs.check_out = 'يجب أن يكون تاريخ الخروج بعد تاريخ الدخول';
      if (!form.guests || Number(form.guests) < 1)
        errs.guests = 'أدخل عدد الضيوف';
    }
    if (step === 'details') {
      if (!form.name.trim())  errs.name  = 'أدخل اسمك الكامل';
      if (!form.phone.trim()) errs.phone = 'أدخل رقم واتساب';
    }
    if (step === 'payment') {
      if (!form.payment_method) errs.payment_method = 'اختر طريقة الدفع';
    }
    return errs;
  };

  // ── Submission ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await publicApi.post(`/${slug}/bookings`, {
        unit_id:        unit.id,
        customer_name:  form.name,
        customer_phone: form.phone,
        customer_email: form.email || undefined,
        check_in:       form.check_in,
        check_out:      form.check_out,
        guests:         Number(form.guests),
        payment_method: form.payment_method,
      });
      setStep('success');
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error  ||
        err?.message                ||
        'حدث خطأ، يرجى المحاولة مجدداً';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Advance / back ──────────────────────────────────────────────────────────
  const advance = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (step === 'dates')   { setStep('details');  return; }
    if (step === 'details') { setStep('payment');  return; }
    if (step === 'payment') { handleSubmit();       return; }
  };

  const goBack = () => {
    setErrors({});
    setSubmitError(null);
    if (step === 'details') { setStep('dates');   return; }
    if (step === 'payment') { setStep('details'); return; }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const stepNum    = STEP_NUMBERS[step] ?? null;
  const isSuccess  = step === 'success';
  const canGoBack  = step === 'details' || step === 'payment';
  const unitName   = unit?.name_ar || unit?.name_en || '';

  const ctaLabel = (() => {
    if (isSubmitting)      return lang === 'ar' ? 'جارٍ الإرسال...' : 'Sending...';
    if (step === 'payment') return lang === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking';
    return lang === 'ar' ? 'متابعة' : 'Continue';
  })();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <GlassCard
      goldAccent
      className="max-w-2xl mx-auto p-6 md:p-8"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* ── Header ── */}
      {!isSuccess && (
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            {/* Unit name */}
            <h2 className="text-sm font-semibold text-white/80 tracking-wide leading-snug">
              {unitName}
            </h2>
            {/* Step label + counter */}
            <div className="flex items-center gap-3">
              <StepDots step={step} />
              <span className="text-[10px] text-white/30 tracking-[0.18em]">
                {lang === 'ar'
                  ? `الخطوة ${stepNum} من 3`
                  : `Step ${stepNum} of 3`} — {STEP_TITLE[step]?.[lang]}
              </span>
            </div>
          </div>

          {/* Cancel / back controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canGoBack && (
              <button
                type="button"
                onClick={goBack}
                className="text-[10px] text-white/30 hover:text-white/60 tracking-widest uppercase transition-colors duration-150"
              >
                {lang === 'ar' ? '→ رجوع' : '← Back'}
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/30 hover:bg-white/10 hover:text-white/70 transition-all duration-150"
              aria-label="Close booking flow"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Animated step content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={STEP_VARIANTS.initial}
          animate={STEP_VARIANTS.animate}
          exit={STEP_VARIANTS.exit}
          transition={TRANSITION}
        >
          {step === 'dates' && (
            <StepDates
              form={form}
              errors={errors}
              set={set}
              lang={lang}
            />
          )}
          {step === 'details' && (
            <StepDetails
              form={form}
              errors={errors}
              set={set}
              lang={lang}
            />
          )}
          {step === 'payment' && (
            <StepPayment
              form={form}
              errors={errors}
              set={set}
              lang={lang}
              unit={unit}
              currency={currency}
              paymentMethods={paymentMethods}
              nights={nights}
            />
          )}
          {step === 'success' && (
            <StepSuccess lang={lang} onCancel={onCancel} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Footer: submit error + CTA ── */}
      {!isSuccess && (
        <div className="mt-6 flex flex-col gap-3">
          {/* Gold separator */}
          <div
            className="h-px w-full opacity-20"
            style={{
              background: 'linear-gradient(to right, transparent, #d4a853, transparent)',
            }}
          />

          {/* Submit error */}
          {submitError && (
            <p className="text-[11px] text-red-400 tracking-wide text-center">
              {submitError}
            </p>
          )}

          {/* Advance CTA */}
          <Button
            variant="gold"
            className="w-full"
            onClick={advance}
            disabled={isSubmitting}
          >
            {ctaLabel}
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
