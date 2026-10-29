import { useContext } from 'react'
import { I18nCtx, type I18n } from './ctx.ts'

export function useI18n(): I18n {
  const v = useContext(I18nCtx)
  if (!v) throw new Error('useI18n outside I18nProvider')
  return v
}
