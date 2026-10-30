import { useMemo, useState, type ReactNode } from 'react'
import { en } from './en.ts'
import { he } from './he.ts'
import { I18nCtx, type I18n } from './ctx.ts'

export type Lang = 'he' | 'en'
const dict = { he, en }
const KEY = 'lang'

function stored(): Lang {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'he'
  } catch {
    return 'he'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(stored)
  const [switching, setSwitching] = useState(false)
  const choose = (l: Lang) => {
    // Re-rendering every page in the other language takes a beat: show the spinner until it paints
    setSwitching(true)
    setLang(l)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setSwitching(false)
        ;(document.activeElement as HTMLElement | null)?.blur()
      }),
    )
    try {
      localStorage.setItem(KEY, l)
    } catch {
      // storage blocked (private mode): the choice just won't persist
    }
  }
  const value = useMemo<I18n>(
    () => ({
      lang,
      dir: lang === 'he' ? 'rtl' : 'ltr',
      locale: lang,
      t: (k) => dict[lang][k],
      ln: (heText, enText) => (lang === 'he' ? heText : enText),
      toggle: () => choose(lang === 'he' ? 'en' : 'he'),
    }),
    [lang],
  )
  return (
    <I18nCtx.Provider value={value}>
      {children}
      {switching && <LangOverlay />}
    </I18nCtx.Provider>
  )
}

/** Covers the page while the language changes, so the half-switched render is never seen */
function LangOverlay() {
  return (
    <div className="lang-overlay" role="status">
      <span className="spinner" aria-hidden="true" />
    </div>
  )
}
