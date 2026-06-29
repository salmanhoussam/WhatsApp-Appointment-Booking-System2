import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const BackButton = () => {
  const { lang } = useTranslation();
  
  return (
    <button 
      onClick={() => window.history.back()}
      className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition mb-8 font-bold text-sm"
    >
      <span>{lang === 'ar' ? '←' : '→'}</span> 
      {lang === 'ar' ? 'عودة' : 'Back'}
    </button>
  );
};

export default BackButton;