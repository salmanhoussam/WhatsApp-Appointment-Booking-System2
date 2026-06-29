import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';

function SpecificPrivacyPage() {
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
        <div className={`absolute bottom-0 ${isAr ? 'right-0' : 'left-0'} w-64 h-64 bg-purple-600/5 blur-[100px] rounded-full pointer-events-none`}></div>

        <header className="border-b border-purple-500/10 pb-8 mb-10 text-center md:text-start">
          <h1 className="text-4xl font-black text-white mb-4 tracking-tight">{isAr ? 'شروط الخدمة وخصوصية البيانات' : 'Terms of Service & Data Privacy'}</h1>
          <p className="text-purple-400 text-sm font-medium">{isAr ? 'كيف ندير عزل بيانات العملاء المتعددين والمراسلات.' : 'How we manage multi-client data isolation and messaging.'}</p>
        </header>

        <div className="space-y-12">

          <section className="bg-white/5 p-6 md:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
               <span className="p-2 bg-purple-500/20 rounded-lg">🛡️</span> {isAr ? 'سياسة عزل البيانات' : 'Data Isolation Policy'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm leading-relaxed">
              <div className="p-4 bg-[#090412]/50 rounded-2xl border border-purple-500/10">
                <h3 className="text-purple-400 font-bold mb-2">{isAr ? 'للشركات (عملائنا)' : 'For Businesses (Our Clients)'}</h3>
                <p>{isAr ? 'تعمل كل شركة في بيئة معزولة تماماً. يمكن للعملاء رؤية وإدارة عملائهم وحجوزاتهم وبياناتهم فقط. لا يوجد أي تواصل متبادل أو مشاركة للبيانات بين حسابات الأعمال المختلفة.' : 'Each business operates in a strictly isolated environment. Clients can only see and manage their own customers, bookings, and data. There is no cross-communication or data sharing between different business accounts.'}</p>
              </div>
              <div className="p-4 bg-[#090412]/50 rounded-2xl border border-purple-500/10">
                <h3 className="text-purple-400 font-bold mb-2">{isAr ? 'للعملاء (المستخدمين النهائيين)' : 'For Customers (End Users)'}</h3>
                <p>{isAr ? 'يمكن للمستخدمين النهائيين رؤية سجل الحجوزات الخاص بهم فقط داخل الشركة المحددة التي يتفاعلون معها. بيانات المستخدم خاصة ولن تكون مرئية أبداً للعملاء الآخرين.' : 'End users can only see their own booking history within the specific business they are interacting with. User data is private and never visible to other customers of the same or different businesses.'}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-3">
               <span className="p-2 bg-purple-500/20 rounded-lg">💬</span> {isAr ? 'خصوصية رسائل واتساب' : 'WhatsApp Messaging Privacy'}
            </h2>
            <div className="space-y-4 text-slate-400">
              <p>{isAr ? 'تستخدم خدمتنا واجهة برمجة تطبيقات واتساب للأعمال للتواصل مع المستخدمين. بمراسلتك لرقم الواتساب الخاص بنا، فإنك توافق على:' : 'Our service uses WhatsApp Business API to communicate with users. By messaging our WhatsApp number, you agree that:'}</p>
              <ul className="space-y-3">
                {[
                  isAr ? 'أنك بدأت التواصل معنا من خلال رسالة أو النقر على زر.' : 'You initiate communication with us through a message or button click.',
                  isAr ? 'قد نرسل ردوداً آلية تتضمن أزراراً، قوائم، وتأكيدات للطلبات.' : 'We may send automated responses including buttons, lists, and order confirmations.',
                  isAr ? 'قد نقوم بتخزين بيانات الدردشة لمعالجة وإدارة حجوزاتك المحددة.' : 'We may store chat data to process and manage your specific bookings.',
                  isAr ? 'نحن لا نرسل رسائل مزعجة أو ترويجية دون موافقتك الصريحة.' : 'We do not send spam or promotional messages without your explicit consent.',
                  isAr ? 'يمكنك إلغاء الاشتراك في أي وقت بإرسال كلمة "STOP".' : 'You can opt out anytime by sending the word "STOP".'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-purple-500 mt-1">✔</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div className="p-4 bg-slate-400/5 rounded-xl border border-slate-700/50 text-center">
            <p className="text-xs text-slate-500">
              {isAr ? 'يتم تشغيل هذه الخدمة بواسطة واجهة برمجة تطبيقات شركة Meta Platforms, Inc. الرسمية. نحن نتبع سياسة التجارة الخاصة بواتساب للأعمال بصرامة.' : 'This service is powered by the official Meta Platforms, Inc. API. We strictly follow the WhatsApp Business Commerce Policy.'}
            </p>
          </div>

        </div>

        <footer className="mt-16 pt-8 border-t border-purple-500/10 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Version 1.2 | Last updated: 2026</p>
        </footer>
      </div>
    </div>
  );
}

export default SpecificPrivacyPage;
