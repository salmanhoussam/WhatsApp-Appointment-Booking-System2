import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : 'http://127.0.0.1:8000/api/v1';

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const InputField = ({ label, error, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
      {label}
    </label>
    <input
      {...props}
      className="w-full bg-white/5 border border-slate-700/60 focus:border-purple-500/50 focus:bg-white/8 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder:text-slate-700"
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const RegistrationPage = () => {
  // In production, registration lives on auth.salmansaas.com/register
  // This component stays alive only for local dev testing
  if (import.meta.env.PROD) {
    window.location.replace('https://auth.salmansaas.com/register');
    return null;
  }

  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  const [form, setForm] = useState({
    business_name: '',
    email: '',
    password: '',
    whatsapp_number: '',
  });
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    setSlug(generateSlug(form.business_name));
  }, [form.business_name]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!slug || slug.length < 3) {
      setError(
        isAr
          ? 'اسم المنشأة قصير جداً لتوليد رابط صالح. جرب اسماً أطول.'
          : 'Business name is too short to generate a valid slug. Try a longer name.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_BASE}/public/register`, {
        business_name:   form.business_name.trim(),
        slug,
        email:           form.email.trim(),
        password:        form.password,
        whatsapp_number: form.whatsapp_number.trim(),
      });

      showToast(
        'success',
        isAr
          ? `🎉 تم إنشاء مساحتك! جاري التوجيه إلى ${data.data.slug}.salmansaas.com…`
          : `🎉 Your space is live! Redirecting to ${data.data.slug}.salmansaas.com…`
      );

      setTimeout(() => {
        const isProd = window.location.hostname !== 'localhost'
          && !window.location.hostname.startsWith('127.');

        window.location.href = isProd
          ? `https://${data.data.slug}.salmansaas.com/dashboard`
          : `/${data.data.slug}/admin`;
      }, 1800);

    } catch (err) {
      const serverMsg = err.response?.data?.error?.message;
      setError(
        serverMsg
          || (isAr ? 'حدث خطأ ما، يرجى المحاولة لاحقاً.' : 'Something went wrong. Please try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const slugIsReady = slug.length >= 3;

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#090412] text-slate-300 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-purple-500 selection:text-white"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-[32rem] h-[32rem] bg-purple-700/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600/8 blur-[100px] rounded-full pointer-events-none" />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl backdrop-blur-md border font-bold text-sm shadow-2xl whitespace-nowrap ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/20 border-red-500/40 text-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Top bar */}
      <div className="w-full max-w-lg mb-8 flex justify-between items-center">
        <a
          href="/"
          className="text-xl font-bold flex items-center gap-2 text-slate-100 uppercase tracking-tighter hover:text-purple-300 transition"
        >
          <span className="text-purple-500 text-2xl">✦</span> SalmanSaaS
        </a>
        <LanguageSwitcher />
      </div>

      {/* Registration card */}
      <div className="w-full max-w-lg bg-[#130924]/80 backdrop-blur-xl rounded-[2.5rem] border border-purple-500/20 shadow-2xl p-8 md:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/8 blur-[80px] rounded-full pointer-events-none" />

        {/* Card header */}
        <header className="mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
              {isAr ? 'مجاناً — لا تحتاج بطاقة بنكية' : 'Free — No card required'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            {isAr ? 'أنشئ مساحتك الآن' : 'Launch Your Space'}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {isAr
              ? 'ادخل بيانات منشأتك وستجد لوحة تحكمك جاهزة في ثوانٍ.'
              : 'Enter your business details and your dashboard will be ready in seconds.'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {isAr ? 'اسم المنشأة أو الشركة' : 'Business / Venue Name'}
            </label>
            <input
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              required
              autoFocus
              placeholder={isAr ? 'مثال: جبل لبنان ريزورت' : 'e.g. Mountain View Resort'}
              className="w-full bg-white/5 border border-slate-700/60 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-all placeholder:text-slate-700"
            />

            {/* Slug preview badge */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                slugIsReady
                  ? 'bg-purple-500/8 border-purple-500/25'
                  : 'bg-white/3 border-slate-800/60'
              }`}
            >
              <span className="text-xs">🔗</span>
              <span className="text-xs font-mono tracking-tight">
                <span className={slugIsReady ? 'text-purple-300' : 'text-slate-600'}>
                  {slug || 'your-business'}
                </span>
                <span className="text-slate-500">.salmansaas.com</span>
              </span>
              {slugIsReady && (
                <span className="ms-auto text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                  {isAr ? 'متاح للفحص' : 'checking...'}
                </span>
              )}
            </div>
          </div>

          {/* Email */}
          <InputField
            label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="you@business.com"
          />

          {/* WhatsApp */}
          <InputField
            label={isAr ? 'رقم الواتساب' : 'WhatsApp Number'}
            name="whatsapp_number"
            type="tel"
            value={form.whatsapp_number}
            onChange={handleChange}
            required
            placeholder="+961 70 000 000"
          />

          {/* Password */}
          <InputField
            label={isAr ? 'كلمة المرور (8 أحرف على الأقل)' : 'Password (min 8 characters)'}
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            placeholder={isAr ? '••••••••' : '••••••••'}
          />

          {/* Inline error */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <span className="text-red-400 text-base leading-none mt-0.5">⚠</span>
              <p className="text-red-400 text-sm font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.99] shadow-[0_0_30px_rgba(147,51,234,0.3)] text-sm mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isAr ? 'جاري إنشاء مساحتك…' : 'Creating your space…'}
              </>
            ) : (
              isAr ? 'ابدأ مجاناً ←' : '→ Start for Free'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-700 mt-8 relative z-10">
          {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
          <a href="/login" className="text-purple-400 hover:text-purple-300 transition font-bold">
            {isAr ? 'تسجيل الدخول' : 'Log in'}
          </a>
        </p>
      </div>

      <p className="mt-8 text-[10px] text-slate-800 uppercase tracking-widest">
        SalmanSaaS © 2026 — All rights reserved
      </p>
    </div>
  );
};

export default RegistrationPage;
