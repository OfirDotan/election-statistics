import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n.ts'
import { getDensity, getTheme, setDensity, setTheme, type Density, type Theme } from '../lib/prefs.ts'

/** Settings panel: renders nothing at all until the gear is clicked, so it can never be "stuck open" */
export function Settings() {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [density, setDensityState] = useState<Density>(getDensity)
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
  }
  const themeOption = pick<Theme>(setTheme, setThemeState)
  const densityOption = pick<Density>(setDensity, setDensityState)

  return (
    <div className="settings-wrap" ref={panel}>
      <button type="button" className="lang settings-trigger" aria-haspopup="dialog" aria-expanded={open} aria-controls="settings-panel" onClick={() => setOpen(!open)}>
        {t('settings')}
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
            <legend>{t('size')}</legend>
            <div className="seg" role="group">
              {(['comfortable', 'compact'] as const).map((v) => (
                <button key={v} type="button" className={density === v ? 'on' : undefined} aria-pressed={density === v} onClick={() => densityOption(v)}>
                  {t(v)}
                </button>
              ))}
            </div>
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
