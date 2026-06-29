import React, { createContext, useState, useContext } from 'react';
import { translations } from '../translations';

const ShowcaseLanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('showcaseLang') || 'ar');

  const switchLanguage = (newLang) => {
    setLang(newLang);
    localStorage.setItem('showcaseLang', newLang);
  };

  const toggleLang = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    switchLanguage(nextLang);
  };

  const t = translations[lang];

  return (
    <ShowcaseLanguageContext.Provider value={{ lang, t, switchLanguage, toggleLang }}>
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </ShowcaseLanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(ShowcaseLanguageContext);
