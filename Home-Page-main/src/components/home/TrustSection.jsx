import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const TrustSection = () => {
  const { t, lang } = useTranslation();
  const isAr = lang === 'ar';

  const trustPoints = [
    {
      icon: '🔒',
      titleAr: 'بيانات محلية آمنة',
      titleEn: 'Secure Local Data',
      descAr: 'بيانات عملائك مخزنة على خادمك، لا تذهب أي معلومات لجهات خارجية'
    },
    {
      icon: '🛡️',
      titleAr: 'الامتثال الكامل',
      titleEn: 'Full Compliance',
      descAr: 'نلتزم بقوانين الخصوصية والحماية في منطقة الشرق الأوسط'
    },
    {
      icon: '⚡',
      titleAr: 'سرعة عالية جداً',
      titleEn: 'Lightning Fast',
      descAr: 'استجابة الخادم أقل من 100ms، وقت التحميل قياسي'
    },
    {
      icon: '🔄',
      titleAr: 'تحديثات آمنة',
      titleEn: 'Safe Updates',
      descAr: 'نسخ احتياطية تلقائية، استرجاع البيانات بخطوة واحدة'
    }
  ];

  const socialProof = [
    { textAr: '+500 شركة محلية', textEn: '+500 Local Businesses', valueAr: '500+', valueEn: '500+' },
    { textAr: '+10K معاملة يومية', textEn: '+10K Daily Transactions', valueAr: '10K+', valueEn: '10K+' },
    { textAr: '99.9% الموثوقية', textEn: '99.9% Uptime', valueAr: '99.9%', valueEn: '99.9%' },
    { textAr: '+10M رسالة واتساب', textEn: '+10M WhatsApp Messages', valueAr: '10M+', valueEn: '10M+' }
  ];

  return (
    <section id="trust" className="py-24 border-t border-purple-900/30">
      <div className="container mx-auto px-6">
        {/* Social Proof Numbers */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
              {isAr ? 'موثوقية مختبرة' : 'Battle-Tested Trust'}
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {socialProof.map((item, idx) => (
              <div
                key={idx}
                className="p-8 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-2xl text-center hover:border-purple-500/50 transition-all"
              >
                <div className="text-5xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {isAr ? item.valueAr : item.valueEn}
                </div>
                <p className="text-slate-300 font-semibold">
                  {isAr ? item.textAr : item.textEn}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Trust */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-black text-white mb-4">
              {isAr ? 'الأمان التقني' : 'Technical Security'}
            </h3>
            <p className="text-slate-400 max-w-2xl mx-auto">
              {isAr
                ? 'نحن نستخدم أحدث معايير التشفير والحماية لضمان أمان بيانات عملك'
                : 'We use the latest encryption and security standards to protect your business data'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-6 bg-white/[0.02] border border-blue-500/20 rounded-xl hover:border-blue-500/50 transition-all group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {point.icon}
                </div>
                <h4 className="font-bold text-white mb-2">
                  {isAr ? point.titleAr : point.titleEn}
                </h4>
                <p className="text-xs text-slate-400">
                  {isAr ? point.descAr : point.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications & Badges */}
        <div className="max-w-4xl mx-auto">
          <div className="p-12 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-3xl text-center backdrop-blur-sm">
            <h3 className="text-2xl font-bold text-white mb-8">
              {isAr ? 'شركاء موثوقون ومعايير عالية' : 'Trusted Partners & Standards'}
            </h3>
            <div className="flex flex-wrap gap-6 justify-center items-center">
              <div className="px-6 py-3 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold text-sm">
                {isAr ? '🔐 تشفير AES-256' : '🔐 AES-256 Encryption'}
              </div>
              <div className="px-6 py-3 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold text-sm">
                {isAr ? '✅ GDPR ممتثل' : '✅ GDPR Compliant'}
              </div>
              <div className="px-6 py-3 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold text-sm">
                {isAr ? '🛡️ اختبارات أمان منتظمة' : '🛡️ Regular Security Audits'}
              </div>
              <div className="px-6 py-3 bg-white/5 border border-emerald-500/30 rounded-lg text-emerald-400 font-bold text-sm">
                {isAr ? '📡 نسخ احتياطية تلقائية' : '📡 Auto Backups'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
