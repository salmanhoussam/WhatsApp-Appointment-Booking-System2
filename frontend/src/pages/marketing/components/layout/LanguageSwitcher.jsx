// LanguageSwitcher is now embedded directly inside Navbar.jsx
// This file is kept for backwards compatibility only
import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export default function LanguageSwitcher() {
  const { lang, toggleLang } = useTranslation();
  return (
    <button
      onClick={toggleLang}
      style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '5px 11px', cursor: 'pointer' }}
    >
      {lang === 'ar' ? 'EN' : 'ع'}
    </button>
  );
}
