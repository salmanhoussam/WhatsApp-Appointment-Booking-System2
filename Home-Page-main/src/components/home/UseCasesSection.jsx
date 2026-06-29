import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const UseCasesSection = () => {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';

  const useCases = [
    {
      icon: '📅',
      titleAr: 'نظام الحجوزات الذكي',
      titleEn: 'Smart Booking System',
      descAr: 'حجز المواعيد تلقائياً عبر واتساب، تأكيدات فورية، إلغاء وإعادة جدولة ذكية',
      descEn: 'Automated booking via WhatsApp, instant confirmations, smart cancellations'
    },
    {
      icon: '🍔',
      titleAr: 'إدارة قائمة الطعام الحية',
      titleEn: 'Live Menu Management',
      descAr: 'تحديث السعر والتوفر في اللحظة، طلبات آلية، تكامل مع نظام الدفع',
      descEn: 'Real-time pricing updates, automated orders, payment integration'
    },
    {
      icon: '📦',
      titleAr: 'أتمتة المخزون والتوصيل',
      titleEn: 'Inventory & Delivery Automation',
      descAr: 'تتبع المنتجات تلقائياً، تحديثات عملاء فورية، عروض ذكية بناءً على التوفر',
      descEn: 'Auto inventory tracking, instant customer updates, smart offers'
    },
    {
      icon: '💬',
      titleAr: 'متابعة العملاء الذكية',
      titleEn: 'Smart Customer Follow-up',
      descAr: 'رسائل تذكير آلية، استطلاع آراء ذكي، برامج ولاء بدون تدخل يدوي',
      descEn: 'Auto reminders, smart surveys, loyalty programs—hands-free'
    },
    {
      icon: '💳',
      titleAr: 'معالجة الدفع الآمنة',
      titleEn: 'Secure Payment Processing',
      descAr: 'دفع آمن محلي، فواتير تلقائية، تسوية المبالغ المعلقة بذكاء',
      descEn: 'Secure local payments, auto invoicing, smart settlements'
    },
    {
      icon: '📊',
      titleAr: 'تقارير وتحليلات فورية',
      titleEn: 'Instant Reports & Analytics',
      descAr: 'لوحة تحكم حية، مبيعات يومية، اتجاهات العملاء، توصيات الأرباح',
      descEn: 'Live dashboard, daily sales, customer trends, profit tips'
    }
  ];

  return (
    <section id="use-cases" className="py-24 border-t border-purple-900/30 bg-gradient-to-b from-[#090412] to-[#0c0618]/50">
      <div className="container mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            {isAr ? 'وصفات الأتمتة' : 'Automation Recipes'}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {isAr
              ? 'اختر الوصفات التي تناسب عملك، أو اطلب وصفة مخصصة'
              : 'Choose recipes for your business, or request a custom one'}
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, idx) => (
            <div
              key={idx}
              className="group p-8 bg-white/[0.03] backdrop-blur-sm border border-emerald-500/10 rounded-2xl hover:border-emerald-500/50 transition-all duration-300 hover:bg-emerald-500/5"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                {useCase.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-300 transition">
                {isAr ? useCase.titleAr : useCase.titleEn}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition">
                {isAr ? useCase.descAr : useCase.descEn}
              </p>
              <div className="mt-4 pt-4 border-t border-emerald-500/10 text-xs text-emerald-500/60 flex items-center gap-1">
                <span>→</span>
                <span>{isAr ? 'اعرف المزيد' : 'Learn more'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-slate-400 mb-6">
            {isAr
              ? 'هل لديك حالة استخدام فريدة؟'
              : 'Have a unique use case?'}
          </p>
          <a
            href="#cta-section"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
          >
            {isAr ? 'اطلب وصفة مخصصة' : 'Request Custom Recipe'}
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
