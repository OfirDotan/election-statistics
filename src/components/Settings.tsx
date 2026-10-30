import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import { getInfo, getTheme, PREFS_EVENT, setInfo, setTheme, type Info, type Theme } from '../lib/prefs.ts'

/** Settings panel: renders nothing at all until the gear is clicked, so it can never be "stuck open" */
export function Settings() {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [info, setInfoState] = useState<Info>(getInfo)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const pick = <T extends string>(set: (v: T) => void, keep: (v: T) => void) => (v: T) => {
    set(v)
    keep(v)
    // Open pages re-read the choice they show, rather than waiting for a reload
    window.dispatchEvent(new Event(PREFS_EVENT))
  }
  const themeOption = pick<Theme>(setTheme, setThemeState)
  const infoOption = pick<Info>(setInfo, setInfoState)

  return (
    <div className="settings-wrap" ref={panel}>
      <button type="button" className="lang settings-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls="settings-panel" aria-label={t('settings')} title={t('settings')} onClick={() => setOpen(!open)}>
        {/* A gear on phones, where the word would cost the links their width */}
        <span className="settings-gear" aria-hidden="true">⚙</span>
        <span className="settings-word">{t('settings')}</span>
      </button>
      {open && (
        <div id="settings-panel" className="settings" role="dialog" aria-labelledby="settings-title">
          <h2 id="settings-title">{t('settings')}</h2>
          <fieldset>
            <legend>{t('theme')}</legend>
            <div className="seg" role="group">
              {(['system', 'light', 'dark'] as const).map((v) => (
                <button key={v} type="button" className={theme === v ? 'on' : undefined} aria-pressed={theme === v} onClick={() => themeOption(v)}>
                  {t(v)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>{t('info')}</legend>
            <div className="seg" role="group">
              {(['default', 'max'] as const).map((v) => (
                <button key={v} type="button" className={info === v ? 'on' : undefined} aria-pressed={info === v} onClick={() => infoOption(v)}>
                  {t(v === 'max' ? 'maxInfo' : 'defaultInfo')}
                </button>
              ))}
            </div>
            <p className="note">{t('infoHint')}</p>
          </fieldset>
          <p className="note">
            {t('language')}: {lang === 'he' ? 'עברית' : 'English'} — {t('languageHint')}
          </p>
          <button type="button" className="button" onClick={() => setOpen(false)}>
            {t('done')}
          </button>
        </div>
      )}
    </div>
  )
}
