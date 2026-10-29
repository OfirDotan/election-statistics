import { createContext } from 'react'
import type { he } from './he.ts'

export type Lang = 'he' | 'en'

export interface I18n {
  lang: Lang
  dir: 'rtl' | 'ltr'
  locale: string
  /** UI string by key */
  t: (k: keyof typeof he) => string
  /** Pick a data-language string */
  ln: (heText: string, enText: string) => string
  toggle: () => void
}

export const I18nCtx = createContext<I18n | null>(null)
