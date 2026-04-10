import React from 'react';

export default function LanguageSwitcher({ currentLang, onChange }) {
  // دالة لتبديل اللغة بنقرة واحدة
  const toggleLanguage = () => {
    onChange(currentLang === 'ar' ? 'en' : 'ar');
  };

  return (
    <button 
      onClick={toggleLanguage} 
      className="fixed top-6 left-6 z-[100] bg-white/90 backdrop-blur-md border border-gray-200 rounded-full px-6 py-2.5 shadow-lg font-bold text-sm hover:bg-gray-50 transition-all text-gray-800 flex items-center gap-2"
    >
      {/* أيقونة كرة أرضية صغيرة */}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.958 17.958 0 0112 21a17.958 17.958 0 01-8.716-2.247m17.432 0c1.12-1.159 1.96-2.61 2.37-4.227M3 12c0-.778.099-1.533.284-2.253m0 0A17.958 17.958 0 0012 10.5c2.998 0 5.74 1.1 7.843 2.918" />
      </svg>
      {currentLang === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}