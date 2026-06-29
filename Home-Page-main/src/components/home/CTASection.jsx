import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const CTASection = () => {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  // إعدادات الروابط والتمبلت
  const whatsappNumber = "96178727986";
  const personalEmail = "houssam.info101@gmail.com";
  const supportEmail = "support@salmansaas.com";

  // نصوص التمبلت حسب اللغة
  const templates = {
    whatsapp: isAr 
      ? "أريد معرفة المزيد عن هذه الخدمات السحابية" 
      : "I want to know more about these cloud services",
    emailSubject: isAr 
      ? "طلب استشارة - SalmanSaaS" 
      : "Consultation Inquiry - SalmanSaaS",
    emailBody: isAr 
      ? "مرحباً سلمان، أريد الحصول على استشارة حول رقمنة عملي والبدء باستخدام أنظمتكم." 
      : "Hello, I would like to get a consultation on digitizing my business using your systems."
  };

  return (
    <section id="cta-section" className="py-24 bg-gradient-to-t from-[#090412] to-[#130924] border-t border-purple-900/30 text-center relative overflow-hidden">
      {/* تأثير ضوئي خلفي */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-6 max-w-3xl relative z-10">
        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
          {isAr ? 'ابدأ رقمنة عملك اليوم' : 'Digitize Your Business Today'}
        </h2>
        
        <p className="text-lg text-slate-400 mb-12 leading-relaxed">
          {isAr 
            ? 'فريقنا جاهز لمساعدتك في اختيار النظام الأنسب لنمو مشروعك. اختر الطريقة المفضلة للتواصل:' 
            : 'Our team is ready to help you choose the best system for your growth. Choose your preferred contact method:'}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-12">
          {/* خيار الواتساب - لون أخضر زمردي فخم */}
          <a 
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(templates.whatsapp)}`}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 px-8 py-4 rounded-2xl font-bold transition-all hover:scale-[1.05] shadow-[0_0_30px_rgba(16,185,129,0.1)]"
          >
            <span className="text-xl">💬</span>
            {isAr ? 'استشارة عبر واتساب' : 'WhatsApp Inquiry'}
          </a>

          {/* خيار الإيميل - لون بنفسجي متناسق مع الموقع */}
          <a 
            href={`mailto:${personalEmail}?subject=${encodeURIComponent(templates.emailSubject)}&body=${encodeURIComponent(templates.emailBody)}`}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-400 px-8 py-4 rounded-2xl font-bold transition-all hover:scale-[1.05] shadow-[0_0_30px_rgba(168,85,247,0.1)]"
          >
            <span className="text-xl">📧</span>
            {isAr ? 'الطلب عبر الإيميل' : 'Inquiry via Email'}
          </a>
        </div>

        {/* ختم الدعم الرسمي */}
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-slate-800 rounded-2xl backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
          <span className="text-xs text-slate-400 font-medium tracking-wider uppercase flex gap-2">
            {isAr ? 'الدعم الرسمي:' : 'Official Support:'} 
            <span className="text-slate-100 font-bold">{supportEmail}</span>
          </span>
        </div>
      </div>
    </section>
  );
};

export default CTASection;