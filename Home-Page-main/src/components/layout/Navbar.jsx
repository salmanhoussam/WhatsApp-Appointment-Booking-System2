import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from '../../hooks/useTranslation';

const Navbar = () => {
  const { t } = useTranslation();
  const whatsappNumber = "96178727986";

  return (
    <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-20">
      <div className="flex flex-col gap-2">
        <div className="text-2xl font-bold flex items-center gap-2 text-slate-100 uppercase tracking-tighter">
          <span className="text-purple-500 text-3xl">✦</span> SalmanSaaS
        </div>
        <LanguageSwitcher />
      </div>
      
      <div className="flex gap-8 items-center text-sm font-medium">
  {/* قمنا بتغيير المسار ليتطابق مع معرف قسم الحجوزات */}
  <a 
    href="#bookings-section" 
    className="hover:text-purple-400 transition hidden md:block cursor-pointer"
  >
    {t.navServices}
  </a>
  
  <a 
    href={`https://wa.me/${whatsappNumber}`} 
    target="_blank" 
    rel="noreferrer" 
    className="px-5 py-2.5 border border-purple-500/40 text-purple-400 rounded-xl hover:bg-purple-500/10 transition shadow-[0_0_15px_rgba(168,85,247,0.1)] font-bold"
  >
    {t.navContact}
  </a>
</div>
    </nav>
  );
};

export default Navbar;