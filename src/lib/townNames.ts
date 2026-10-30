import { useI18n } from '../i18n/useI18n.ts'

/** A town's name in the page's language, for the one place that reads a town rather than a row */
export function useTownName(town: { name: string; nameEn?: string } | undefined) {
  const { lang } = useI18n()
  return town ? (lang === 'en' ? town.nameEn ?? town.name : town.name) : ''
}
