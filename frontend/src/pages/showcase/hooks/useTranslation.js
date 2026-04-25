import { useLanguage } from '../context/LanguageContext';

export const useTranslation = () => {
  const { t, lang, toggleLang } = useLanguage();
  return { t, lang, toggleLang };
};
