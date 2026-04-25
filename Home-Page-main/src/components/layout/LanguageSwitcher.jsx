import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const LanguageSwitcher = () => {
  const { lang, toggleLang } = useTranslation();

  return (
    <button 
      onClick={toggleLang}
      className="text-[10px] font-bold text-purple-400 px-3 py-1 border border-purple-500/20 rounded-md hover:bg-purple-500/10 transition w-fit"
    >
      {lang === 'ar' ? 'Switch to English' : 'تحويل للعربية'}
    </button>
  );
};

export default LanguageSwitcher;