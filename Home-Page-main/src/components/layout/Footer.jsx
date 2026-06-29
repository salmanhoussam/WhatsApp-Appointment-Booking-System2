import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const Footer = () => {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <footer className="bg-[#090412] pt-16 pb-8 border-t border-emerald-900/30 relative z-20">
      <div className="container mx-auto px-6">
        
        {/* Top Section */}
        <div className="grid md:grid-cols-3 gap-12 mb-12 pb-12 border-b border-emerald-900/20">
          
          {/* Branding */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚡</span>
              <span className="text-white font-black text-lg">SalmanSaaS</span>
            </div>
            <p className="text-slate-500 text-sm">
              {isAr
                ? 'وكلاء ذكيين لعملك المحلي'
                : 'Intelligent Agents for Your Local Business'}
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">
              {isAr ? 'المنتج' : 'Product'}
            </h4>
            <ul className="space-y-2 text-slate-500 text-sm">
              <li><a href="#use-cases" className="hover:text-emerald-400 transition">{isAr ? 'الحالات الاستخدامية' : 'Use Cases'}</a></li>
              <li><a href="#workflow-demo" className="hover:text-emerald-400 transition">{isAr ? 'كيف يعمل' : 'How It Works'}</a></li>
              <li><a href="#trust" className="hover:text-emerald-400 transition">{isAr ? 'الأمان' : 'Security'}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-4 text-sm">
              {isAr ? 'تواصل' : 'Contact'}
            </h4>
            <ul className="space-y-2 text-slate-500 text-sm">
              <li><a href="mailto:support@salmansaas.com" className="hover:text-emerald-400 transition">support@salmansaas.com</a></li>
              <li><a href="https://wa.me/96178727986" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition">💬 WhatsApp</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="text-slate-500 text-sm font-medium">
            {isAr ? 'جميع الحقوق محفوظة لـ SalmanSaaS © 2026.' : 'All rights reserved to SalmanSaaS © 2026.'}
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-xs md:text-sm font-bold uppercase tracking-widest text-slate-400">
            <a href="/general-privacy" className="hover:text-emerald-400 transition">
              {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </a>
            <a href="/specific-privacy" className="hover:text-emerald-400 transition">
              {isAr ? 'خصوصية البيانات' : 'Data Privacy'}
            </a>
            <a href="/privacy-terms" className="hover:text-emerald-400 transition">
              {isAr ? 'شروط الخدمة' : 'Terms of Service'}
            </a>
          </div>
          
        </div>

      </div>
    </footer>
  );
};

export default Footer;