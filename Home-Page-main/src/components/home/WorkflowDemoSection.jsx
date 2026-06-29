import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const WorkflowDemoSection = () => {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: '📱',
      titleAr: 'عميل يرسل رسالة واتساب',
      titleEn: 'Customer Sends WhatsApp',
      descAr: 'العميل يطلب حجز موعد أو يسأل عن الخدمات',
      descEn: 'Customer requests booking or asks about services'
    },
    {
      icon: '🤖',
      titleAr: 'الوكيل الذكي يستقبل الطلب',
      titleEn: 'AI Agent Receives Request',
      descAr: 'يقرأ الرسالة ويفهم الطلب في الحال',
      descEn: 'Instantly understands the request in context'
    },
    {
      icon: '⚡',
      titleAr: 'معالجة وتحديث البيانات',
      titleEn: 'Process & Update Data',
      descAr: 'يتحقق من التوفر، يحدث الحجز، يرسل تأكيد',
      descEn: 'Checks availability, books appointment, sends confirmation'
    },
    {
      icon: '✅',
      titleAr: 'تنفيذ آني آمن',
      titleEn: 'Instant Safe Execution',
      descAr: 'كل شيء مخزّن محلياً وآمناً على خادمك',
      descEn: 'Everything stored locally and securely on your server'
    }
  ];

  return (
    <section id="workflow-demo" className="py-24 border-t border-purple-900/30">
      <div className="container mx-auto px-6">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            {isAr ? 'كيف يعمل الوكيل الذكي' : 'How Your AI Agent Works'}
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            {isAr
              ? 'في ثوان، يقوم الوكيل بمهام تستغرق منك ساعات'
              : 'In seconds, your agent completes tasks that take you hours'}
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {steps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer text-left group ${
                activeStep === idx
                  ? 'bg-purple-600/30 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                  : 'bg-white/5 border-white/10 hover:border-purple-500/50'
              }`}
            >
              <div className="text-4xl mb-3">{step.icon}</div>
              <h3 className="font-bold text-white mb-2 group-hover:text-purple-300 transition">
                {isAr ? step.titleAr : step.titleEn}
              </h3>
              <p className="text-sm text-slate-400">
                {isAr ? step.descAr : step.descEn}
              </p>
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 text-purple-500/30 text-2xl">
                  →
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Detail View */}
        <div className="max-w-4xl mx-auto">
          <div className="p-12 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl backdrop-blur-md">
            <div className="flex gap-6">
              <div className="text-6xl">{steps[activeStep].icon}</div>
              <div>
                <h3 className="text-3xl font-black text-white mb-4">
                  {isAr ? steps[activeStep].titleAr : steps[activeStep].titleEn}
                </h3>
                <p className="text-lg text-slate-300 leading-relaxed mb-6">
                  {isAr ? steps[activeStep].descAr : steps[activeStep].descEn}
                </p>
                <div className="text-sm text-slate-400 italic">
                  {isAr
                    ? '⏱️ الوقت المتوقع: أقل من ثانية'
                    : '⏱️ Expected time: Less than 1 second'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkflowDemoSection;
