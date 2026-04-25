import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

// In prod: route to auth subdomain; in dev: stay on showcase /register
const REGISTER_URL = window.location.hostname.includes('salmansaas.com')
  ? 'https://auth.salmansaas.com/register'
  : '/register';

const HeroSection = () => {
  const { t, lang } = useTranslation();

  const [activeService, setActiveService] = useState("bookings");
  const [emailInput, setEmailInput] = useState("");

  const whatsappNumber = "96178727986";

  const handleEmailSend = () => {
    if (!emailInput) {
      alert(lang === 'ar' ? "يرجى إدخال بريدك الإلكتروني" : "Please enter your email");
      return;
    }
    window.location.href = `mailto:salman.houssam@gmail.com?subject=Inquiry&body=Email: ${emailInput}`;
  };

  const getActiveImage = () => {
    switch(activeService) {
      case 'menu':  return '/menu-mockup.png';
      case 'store': return '/store-mockup.png';
      case 'bookings':
      default:      return '/booking-mockup.png';
    }
  };

  return (
    <header className="container mx-auto px-6 py-12 md:py-20 flex flex-col-reverse md:flex-row items-center justify-between relative z-10">

      {/* Text & CTA */}
      <div className="md:w-1/2 mt-12 md:mt-0">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight text-white">
          {t.heroTitle1} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-slate-200">
            {t.heroTitle2}
          </span>
        </h1>

        <p className="text-xl text-slate-400 mb-10 max-w-lg leading-relaxed">
          {t.heroSubDesc || t.heroDesc}
        </p>

        <div className="flex flex-col gap-4 max-w-md">
          {/* Primary CTA — self-onboarding */}
          <a
            href={REGISTER_URL}
            className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-4 rounded-xl font-bold text-center flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:from-purple-500 hover:to-purple-400 shadow-[0_0_24px_rgba(147,51,234,0.35)]"
          >
            {lang === 'ar' ? '← ابدأ مجاناً الآن' : 'Start for Free →'}
          </a>

          {/* Secondary — email updates */}
          <div className="bg-white/5 p-1.5 rounded-xl flex items-center border border-slate-700/50 focus-within:border-purple-500/50 backdrop-blur-md">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="bg-transparent px-4 py-3 outline-none text-white w-full text-sm"
            />
            <button
              onClick={handleEmailSend}
              className="bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white px-5 py-2 rounded-lg text-xs font-bold transition-all"
            >
              {lang === 'ar' ? 'إرسال' : 'Send'}
            </button>
          </div>

          {/* Tertiary — WhatsApp contact */}
          <p className="text-center text-xs text-slate-600">
            {lang === 'ar' ? 'أو تواصل معنا عبر ' : 'Or reach us via '}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(t.whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-bold transition"
            >
              WhatsApp
            </a>
          </p>
        </div>
      </div>

      {/* Interactive mockup */}
      <div className="md:w-1/2 relative w-full flex justify-center items-center perspective-1000">
        <div className="w-[100%] md:w-[115%] aspect-[4/3.2] bg-[#0d0718]/90 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative z-10 group">

          <div className="h-14 bg-white/5 border-b border-white/5 flex items-center px-6 justify-between">
            <div className="flex gap-2">
              {['bookings', 'menu', 'store'].map((service) => (
                <button
                  key={service}
                  onClick={() => setActiveService(service)}
                  className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all duration-300 ${
                    activeService === service
                      ? "bg-purple-600 text-white border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.4)]"
                      : "bg-white/5 text-slate-400 border-white/5 hover:text-white"
                  }`}
                >
                  {t[`dash${service.charAt(0).toUpperCase() + service.slice(1)}`]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">
                {t.dashStatus || 'Online'}
              </span>
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col justify-center items-center bg-black/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none"></div>
            <img
              key={activeService}
              src={getActiveImage()}
              alt={`${activeService} preview`}
              className="w-full h-full object-contain max-h-[300px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] showcase-fade-in transition-all duration-500 hover:scale-[1.02]"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23130924'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='40' font-weight='bold' fill='%23a855f7'%3EImage Not Found%3C/text%3E%3C/svg%3E";
              }}
            />
          </div>

        </div>
      </div>
    </header>
  );
};

export default HeroSection;
