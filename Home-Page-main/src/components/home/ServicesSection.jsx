import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const ServicesSection = () => {
  const { t, lang } = useTranslation();

  return (
    <section id="menu-section" className="py-24 border-t border-purple-900/30">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-black text-white mb-6 tracking-tight">{t.service2Title}</h2>
        <p className="text-slate-400 mb-12 max-w-2xl mx-auto">{t.service2Desc}</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[1,2,3].map(i => (
            <div key={i} className="bg-[#130924] p-8 rounded-[2rem] border border-purple-500/10 hover:border-purple-400/50 transition-all group">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl mb-6 mx-auto flex items-center justify-center text-purple-400 group-hover:rotate-12 transition-transform">✦</div>
              <h3 className="text-white font-bold text-xl mb-3">{lang === 'ar' ? `ميزة ${i}` : `Feature ${i}`}</h3>
              <p className="text-slate-500 text-sm">
                {lang === 'ar' ? 'تقنيات سحابية تضمن استقرار وسرعة الخدمة للعملاء.' : 'Cloud technologies ensuring stability and speed.'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;