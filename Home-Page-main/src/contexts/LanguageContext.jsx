import React, { createContext, useState, useContext } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // 1. استرجاع اللغة من localStorage عند تحميل التطبيق لأول مرة (الافتراضي 'ar')
  const [lang, setLang] = useState(localStorage.getItem('appLang') || 'ar');

  // 2. دالة لتبديل اللغة مع حفظ الخيار في المتصفح
  const switchLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('appLang', newLang);
  };

  // 3. دالة Toggle (للتوافق مع أزرار التبديل السريع)
  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    switchLanguage(nextLang);
  };

  const t = translations[lang];

  return (
    // نمرر switchLanguage و toggleLang لضمان مرونة الاستخدام في المكونات
    <LanguageContext.Provider value={{ lang, t, switchLanguage, toggleLang }}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

// Hook مخصص لسهولة الاستخدام في باقي ملفات المشروع
export const useLanguage = () => useContext(LanguageContext);