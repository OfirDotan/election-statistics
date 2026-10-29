import { useEffect } from 'react'
import { useI18n } from '../i18n/useI18n.ts'

/** Keeps <html lang dir> in sync with the chosen language (mount, toggle, back/forward). */
export function DirSync() {
  const { lang, dir } = useI18n()
  useEffect(() => {
    const el = document.documentElement
    el.lang = lang
    el.dir = dir
  }, [lang, dir])
  return null
}
