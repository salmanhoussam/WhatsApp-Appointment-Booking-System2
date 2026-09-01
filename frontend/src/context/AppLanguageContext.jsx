/**
 * AppLanguageContext.jsx — the one real, unified language state for the tenant product
 * (ADR-0006, Phase 1). New, isolated code — not yet mounted anywhere or read by any live page.
 *
 * Reuses the one proven-correct technique from the now-dead `context/LanguageContext.jsx`
 * (writing `document.documentElement.lang`/`.dir` directly — the only place in the codebase that
 * ever did this right, confirmed by the Bilingual/i18n Architecture Audit,
 * .claude/docs/implementation/BILINGUAL_I18N_ARCHITECTURE_AUDIT/evidence.md). Adds real
 * `localStorage` persistence, which that file never had.
 *
 * Deliberately a NEW file, not a rewrite of `context/LanguageContext.jsx` in place — that file
 * stays untouched in this phase (Category E cleanup is later, separately-approved work per the
 * audit's own Migration Plan, not silently folded into Phase 1).
 *
 * `localStorage` key `tenant_lang` — distinct from the marketing site's `appLang` and the
 * showcase/demo-builder's `showcaseLang` (both explicitly out of scope, ADR-0006 §5 Non-Goals).
 *
 * Usage (once wired into App.jsx and consumed by a real component, in a later phase):
 *   <AppLanguageProvider>...</AppLanguageProvider>
 *   const { lang, setLang, toggleLang, isRtl } = useAppLanguage()
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'tenant_lang'
const DEFAULT_LANG = 'ar'

const AppLanguageContext = createContext(null)

function readStoredLang() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
  } catch {
    // localStorage unavailable (private browsing, disabled storage, etc.) -- fall back silently,
    // same defensive convention used elsewhere in this codebase (e.g. useTenantConfig.js).
    return DEFAULT_LANG
  }
}

export function AppLanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

  const setLang = useCallback((next) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Same defensive fallback as readStoredLang above -- state still updates in-memory.
    }
  }, [])

  const toggleLang = useCallback(() => {
    setLangState((current) => {
      const next = current === 'ar' ? 'en' : 'ar'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Same defensive fallback as above.
      }
      return next
    })
  }, [])

  // The one real write to document.documentElement -- closes the audit's Category D2 gap
  // (`<html lang="en">`, no `dir`, never updated at runtime) once this Provider is actually
  // mounted in a later phase.
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const value = { lang, setLang, toggleLang, isRtl: lang === 'ar' }

  return (
    <AppLanguageContext.Provider value={value}>
      {children}
    </AppLanguageContext.Provider>
  )
}

export function useAppLanguage() {
  const ctx = useContext(AppLanguageContext)
  if (!ctx) {
    throw new Error('useAppLanguage() must be called within an AppLanguageProvider')
  }
  return ctx
}
