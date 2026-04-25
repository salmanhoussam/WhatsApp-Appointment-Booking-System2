import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const Footer = () => {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <footer className="bg-[#090412] pt-12 pb-8 border-t border-purple-900/30 relative z-20">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        
        {/* جملة حقوق الملكية المطلوبة */}
        <div className="text-slate-500 text-sm font-medium">
          {isAr ? 'جميع الحقوق محفوظة لـ SalmanSaaS © 2026.' : 'All rights reserved to SalmanSaaS © 2026.'}
        </div>
        
        {/* روابط السياسات */}
        <div className="flex flex-wrap justify-center gap-6 text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400">
          <a href="/general-privacy" className="hover:text-purple-400 transition">
            {t.footerPrivacy || (isAr ? 'سياسة الخصوصية' : 'General Privacy')}
          </a>
          <a href="/specific-privacy" className="hover:text-purple-400 transition">
            {t.footerSpecific || (isAr ? 'خصوصية البيانات' : 'Data Privacy')}
          </a>
          <a href="/privacy-terms" className="hover:text-purple-400 transition">
            {t.footerTerms || (isAr ? 'شروط الخدمة' : 'Terms of Service')}
          </a>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;