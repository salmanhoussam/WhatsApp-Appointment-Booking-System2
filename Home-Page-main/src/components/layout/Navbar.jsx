import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../../contexts/LanguageContext';

const Navbar = () => {
  const { lang } = useLanguage();
  const whatsappNumber = "96178727986";

  return (
    <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-20 sticky top-0 bg-[#090412]/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex flex-col gap-2">
        <div className="text-2xl font-black flex items-center gap-2 text-white uppercase tracking-tighter hover:text-emerald-400 transition">
          <span className="text-3xl animate-pulse">⚡</span> 
          <span>SalmanSaaS</span>
        </div>
        <LanguageSwitcher />
      </div>
      
      <div className="flex gap-8 items-center text-sm font-medium">
        <a 
          href="#workflow-demo" 
          className="hover:text-emerald-400 transition hidden md:block cursor-pointer text-slate-300"
        >
          {lang === 'ar' ? 'كيف يعمل' : 'How It Works'}
        </a>

        <a 
          href="#use-cases"
          className="hover:text-emerald-400 transition hidden md:block cursor-pointer text-slate-300"
        >
          {lang === 'ar' ? 'الحالات الاستخدامية' : 'Use Cases'}
        </a>
  
        <a 
          href={`https://wa.me/${whatsappNumber}`} 
          target="_blank" 
          rel="noreferrer" 
          className="px-5 py-2.5 border border-emerald-500/40 text-emerald-400 rounded-xl hover:bg-emerald-500/10 transition shadow-[0_0_15px_rgba(16,185,129,0.1)] font-bold"
        >
          {lang === 'ar' ? 'تواصل' : 'Contact'}
        </a>
      </div>
    </nav>
  );
};

export default Navbar;