import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';

function PrivacyTermsPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#090412] text-slate-300 font-sans p-6 md:p-20 selection:bg-purple-500 selection:text-white">

      <div className="max-w-4xl mx-auto mb-10 flex justify-between items-center">
        <button onClick={() => window.history.back()} className="group text-purple-400 hover:text-purple-300 text-sm font-bold flex items-center gap-2 transition-all">
          <span className="transition-transform group-hover:translate-x-1">{isAr ? '→' : '←'}</span>
          {isAr ? 'العودة للموقع' : 'Back to SalmanSaaS'}
        </button>
        <LanguageSwitcher />
      </div>

      <div className="max-w-4xl mx-auto bg-[#130924] p-8 md:p-16 rounded-[2.5rem] border border-purple-500/20 shadow-2xl relative overflow-hidden">
        <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-64 h-64 bg-purple-600/5 blur-[100px] rounded-full pointer-events-none`}></div>

        <header className="border-b border-purple-500/10 pb-8 mb-10">
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">{isAr ? 'شروط الاستخدام وقواعد الخدمة' : 'Terms of Use & Service Rules'}</h1>
          <p className="text-purple-400 text-sm font-medium">{isAr ? 'قواعد واضحة لضمان تجربة حجز سلسة وآمنة.' : 'Clear rules to ensure a smooth and secure booking experience.'}</p>
        </header>

        <div className="space-y-12">

          <section className="bg-white/5 p-6 md:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
               <span className="p-2 bg-purple-500/20 rounded-lg text-xl">📋</span> {isAr ? 'قواعد الخدمة' : 'Service Rules'}
            </h2>
            <div className="grid grid-cols-1 gap-4 text-sm leading-relaxed text-slate-400">
              <div className="flex gap-4 items-start p-4 bg-[#090412]/50 rounded-xl border border-purple-500/10">
                <span className="text-purple-500 font-bold">01.</span>
                <p><b>{isAr ? 'دقة البيانات: ' : 'Data Accuracy: '}</b> {isAr ? 'يجب عليك تقديم معلومات دقيقة وصادقة عند الحجز. لا تتحمل الخدمة مسؤولية الأخطاء الناتجة عن إدخال مستخدم غير صحيح.' : 'You must provide accurate and truthful information when booking. SalmanSaaS is not responsible for errors caused by incorrect user input.'}</p>
              </div>
              <div className="flex gap-4 items-start p-4 bg-[#090412]/50 rounded-xl border border-purple-500/10">
                <span className="text-purple-500 font-bold">02.</span>
                <p><b>{isAr ? 'التوفر: ' : 'Availability: '}</b> {isAr ? 'أنت تدرك أن جميع أوقات المواعيد تعتمد على التوفر الفعلي وتخضع لتأكيد التاجر.' : 'You understand that all appointment times depend on real-time availability and are subject to confirmation by the merchant.'}</p>
              </div>
              <div className="flex gap-4 items-start p-4 bg-[#090412]/50 rounded-xl border border-purple-500/10">
                <span className="text-purple-500 font-bold">03.</span>
                <p><b>{isAr ? 'حدود المسؤولية: ' : 'Limitation of Liability: '}</b> {isAr ? 'نحن لسنا مسؤولين عن التأخيرات، الإلغاءات، أو انقطاع الخدمة الخارج عن سيطرتنا المباشرة.' : 'We are not responsible for delays, cancellations, or service interruptions that are outside our direct control.'}</p>
              </div>
              <div className="flex gap-4 items-start p-4 bg-red-500/5 rounded-xl border border-red-500/20">
                <span className="text-red-500 font-bold">04.</span>
                <p className="text-slate-300"><b>{isAr ? 'عدم التسامح: ' : 'Zero Tolerance: '}</b> {isAr ? 'أي إساءة لاستخدام النظام، نشاط احتيالي، أو رسائل مزعجة سيؤدي إلى حظر وصولك بشكل فوري ودائم.' : 'Any abuse of the system, fraudulent activity, or spamming will result in an immediate and permanent block of your access.'}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
               <span className="p-2 bg-purple-500/20 rounded-lg text-xl">🛡️</span> {isAr ? 'عزل البيانات' : 'Data Isolation'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="p-5 border border-slate-800 rounded-2xl">
                <h3 className="text-purple-400 font-bold mb-2">{isAr ? 'بيانات التاجر' : 'Merchant Data'}</h3>
                <p>{isAr ? 'تعمل كل شركة في بيئة معزولة تماماً. لا يوجد وصول متبادل لبيانات العملاء الآخرين.' : "Each business operates in a strictly isolated environment. No cross-access to other clients' data."}</p>
              </div>
              <div className="p-5 border border-slate-800 rounded-2xl">
                <h3 className="text-purple-400 font-bold mb-2">{isAr ? 'بيانات العميل' : 'Customer Data'}</h3>
                <p>{isAr ? 'يرى المستخدمون سجلهم الخاص فقط. لا يتم مشاركة المعلومات الشخصية أبداً بين الشركات.' : 'Users only see their own history. Personal info is never shared between businesses.'}</p>
              </div>
            </div>
          </section>

          <section className="bg-purple-500/5 p-8 rounded-3xl border border-purple-500/10">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
               <span className="p-2 bg-purple-500/20 rounded-lg text-xl">💬</span> {isAr ? 'رسائل الواتساب' : 'WhatsApp Messaging'}
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2"><span>•</span> {isAr ? 'يتم بدء التواصل من قبلك.' : 'Communication is initiated by you.'}</li>
              <li className="flex gap-2"><span>•</span> {isAr ? 'نحن نستخدم الأزرار الآلية وردود القوائم لتسهيل الخدمة.' : 'We use automated buttons and list responses.'}</li>
              <li className="flex gap-2"><span>•</span> {isAr ? 'يمكنك إلغاء الاشتراك في أي وقت بإرسال "إيقاف" أو "STOP".' : 'You can opt-out at any time by sending "STOP".'}</li>
            </ul>
          </section>

          <div className="pt-8 border-t border-purple-500/10 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
               SalmanSaaS © 2026 | Powered by Meta Platforms, Inc. API
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PrivacyTermsPage;
