import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';

function GeneralPrivacyPage() {
  const { lang } = useTranslation();
  const isAr = lang === 'ar';

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#090412] text-slate-300 font-sans p-6 md:p-20 selection:bg-purple-500 selection:text-white">
      
      {/* زر العودة */}
      <div className="max-w-4xl mx-auto mb-10 flex justify-between items-center">
        <button onClick={() => window.history.back()} className="group text-purple-400 hover:text-purple-300 text-sm font-bold flex items-center gap-2 transition-all">
          <span className="transition-transform group-hover:translate-x-1">{isAr ? '→' : '←'}</span> 
          {isAr ? 'العودة للموقع' : 'Back to SalmanSaaS'}
        </button>
        <LanguageSwitcher />
      </div>

      <div className="max-w-4xl mx-auto bg-[#130924] p-8 md:p-16 rounded-[2.5rem] border border-purple-500/20 shadow-2xl relative overflow-hidden">
        <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-64 h-64 bg-slate-400/5 blur-[100px] rounded-full pointer-events-none`}></div>

        <header className="border-b border-purple-500/10 pb-8 mb-10 text-center md:text-start">
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
          <p className="text-purple-400 text-sm font-medium">{isAr ? 'نحن نحترم خصوصيتك وملتزمون بحماية بياناتك الشخصية.' : 'We respect your privacy and are committed to protecting your personal data.'}</p>
        </header>

        <div className="space-y-10 leading-relaxed text-slate-400">
          
          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
              <span className="text-purple-500">1.</span> {isAr ? 'المعلومات التي نجمعها' : 'Information We Collect'}
            </h2>
            <p className="mb-4">{isAr ? 'قد نجمع المعلومات التالية عند استخدامك لخدماتنا:' : 'We may collect the following information when you use our services:'}</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                isAr ? 'الاسم ورقم الهاتف' : 'Name and phone number',
                isAr ? 'تفاصيل المواعيد والحجوزات' : 'Appointment details',
                isAr ? 'الرسائل المرسلة عبر واتساب' : 'Messages sent through WhatsApp',
                isAr ? 'بيانات الجهاز والمتصفح الأساسية' : 'Basic device and browser data'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-slate-800"><span className="text-purple-500">✦</span> {item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
              <span className="text-purple-500">2.</span> {isAr ? 'كيف نستخدم معلوماتك' : 'How We Use Your Information'}
            </h2>
            <p className="mb-4">{isAr ? 'نحن نستخدم بياناتك فقط من أجل:' : 'We use your data only to:'}</p>
            <div className="space-y-2 mb-6">
              {[
                isAr ? 'إدارة الحجوزات والمواعيد' : 'Manage bookings and appointments',
                isAr ? 'إرسال التأكيدات والتذكيرات' : 'Send confirmations and reminders',
                isAr ? 'تحسين تجربة الخدمة' : 'Improve service experience',
                isAr ? 'تقديم دعم العملاء' : 'Provide customer support'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>{item}
                </div>
              ))}
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-2xl text-purple-300 text-sm font-bold">
              🚫 {isAr ? 'نحن لا نبيع أو نشارك بياناتك مع جهات خارجية لأغراض التسويق.' : 'We do NOT sell or share your data with third parties for marketing.'}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
              <span className="text-purple-500">3.</span> {isAr ? 'التواصل عبر واتساب' : 'WhatsApp Communication'}
            </h2>
            <p>{isAr ? 'من خلال التواصل معنا عبر واتساب، فإنك توافق على تلقي رسائل تتعلق بموعدك أو استفسارك. نحن نستخدم واجهة برمجة تطبيقات واتساب للأعمال المقدمة من شركة ميتا.' : 'By contacting us via WhatsApp, you agree to receive messages related to your appointment or inquiry. We use WhatsApp Business API provided by Meta Platforms Inc.'}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
              <span className="text-purple-500">4.</span> {isAr ? 'تخزين البيانات' : 'Data Storage'}
            </h2>
            <p>{isAr ? 'يتم تخزين بياناتك بشكل آمن باستخدام قواعد بيانات سحابية مشفرة. نحن نحتفظ ببياناتك فقط للمدة اللازمة لأغراض الخدمة.' : 'Your data is securely stored using encrypted cloud databases. We keep your data only as long as needed for service purposes.'}</p>
          </section>

          <section className="bg-slate-400/5 p-6 rounded-2xl border border-slate-700/50">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-3">
              <span className="text-purple-500">5.</span> {isAr ? 'حقوق المستخدم' : 'User Rights'}
            </h2>
            <p className="mb-4 text-sm">{isAr ? 'يمكنك طلب عرض، تعديل، أو حذف بياناتك في أي وقت.' : 'You can request to view, modify, or delete your data at any time.'}</p>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <span className="text-white font-bold">{isAr ? 'تواصل معنا:' : 'Contact us:'}</span>
              <a
              href="mailto:houssam.info101@gmail.com?subject=Support%20Request%20-%20SalmanSaaS&body=Please%20describe%20your%20issue%20or%20complaint%20here."
             class="w-full sm:w-auto flex items-center justify-center gap-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-400 px-8 py-4 rounded-2xl font-bold transition-all hover:scale-[1.05] shadow-[0_0_30px_rgba(168,85,247,0.1)]"
             >
             <span class="text-xl">📧</span>
            support@salmansaas.com
           </a>
            </div>
          </section>

        </div>

        <footer className="mt-16 pt-8 border-t border-purple-500/10 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest">{isAr ? 'آخر تحديث: فبراير 2026' : 'Last updated: February 2026'}</p>
        </footer>
      </div>
    </div>
  );
}

export default GeneralPrivacyPage;