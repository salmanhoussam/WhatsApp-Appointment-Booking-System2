import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const ProblemSolutionSection = () => {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';

  const problems = [
    {
      icon: '⏰',
      titleAr: 'ضياع الوقت في المعاملات اليدوية',
      titleEn: 'Manual Processes Waste Time',
      descAr: 'إدارة حجوزات ورسائل عملاء بدون أتمتة',
      descEn: 'Managing bookings and customer messages manually costs hours daily'
    },
    {
      icon: '📱',
      titleAr: 'عدم استخدام قنوات التواصل المتاحة',
      titleEn: 'Missed Customer Channels',
      descAr: 'العملاء يبحثون عنك على واتساب، لكنك لا تُجيب في الوقت المناسب',
      descEn: 'Customers seek you on WhatsApp, but delayed responses lose sales'
    },
    {
      icon: '💼',
      titleAr: 'عدم القدرة على التوسع',
      titleEn: 'Growth Becomes Impossible',
      descAr: 'كل موظف جديد يعني تكاليف إضافية وتدريب مكثف',
      descEn: 'Scaling requires hiring more staff—expensive and complex'
    }
  ];

  return (
    <section className="py-24 border-t border-purple-900/30 bg-gradient-to-b from-[#0c0618]/50 to-[#090412]">
      <div className="container mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight leading-tight">
            {isAr ? 'التحديات التي تواجه عملك' : 'The Challenges Your Business Faces'}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? 'ملايين الشركات المحلية تخسر الأرباح بسبب غياب الأتمتة. هل أنت منهم؟'
              : 'Millions of local businesses lose revenue due to lack of automation. Are you one of them?'}
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {problems.map((problem, idx) => (
            <div
              key={idx}
              className="p-8 bg-white/[0.03] backdrop-blur-md border border-red-500/20 rounded-2xl hover:border-red-500/50 transition-all group"
            >
              <div className="text-5xl mb-4">{problem.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">
                {isAr ? problem.titleAr : problem.titleEn}
              </h3>
              <p className="text-slate-400">
                {isAr ? problem.descAr : problem.descEn}
              </p>
            </div>
          ))}
        </div>

        {/* Solution Arrow */}
        <div className="flex justify-center mb-16">
          <div className="text-4xl text-purple-500 animate-bounce">↓</div>
        </div>

        {/* Solution Highlight */}
        <div className="max-w-3xl mx-auto p-12 bg-gradient-to-br from-purple-600/20 to-emerald-600/20 border border-purple-500/30 rounded-3xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-purple-600/5 blur-[80px] pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-black text-white mb-6">
              {isAr ? 'SalmanSaaS — حل شامل للأتمتة' : 'SalmanSaaS — Complete Automation Solution'}
            </h3>
            <p className="text-xl text-slate-200 mb-8 leading-relaxed">
              {isAr
                ? 'وكلاء ذكيين يعملون على مدار الساعة، يدير حجوزاتك، يجيب على العملاء، ويزامن بياناتك—كله آلياً وآمناً.'
                : 'Intelligent agents work 24/7, managing bookings, answering customers, and syncing your data—all automatically and securely.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
                <span className="text-2xl">✓</span> {isAr ? 'بيانات محلية آمنة' : 'Secure Local Data'}
              </div>
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
                <span className="text-2xl">✓</span> {isAr ? 'أتمتة واتساب فورية' : 'Instant WhatsApp Automation'}
              </div>
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
                <span className="text-2xl">✓</span> {isAr ? 'لا حاجة للكود' : 'No Code Required'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolutionSection;
