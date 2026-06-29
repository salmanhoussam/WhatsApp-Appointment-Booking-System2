import { useLanguage } from '../contexts/LanguageContext';

export const useTranslation = () => {
  const { t, lang, toggleLang } = useLanguage();
  return { t, lang, toggleLang };
};