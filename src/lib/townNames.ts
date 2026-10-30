import { useI18n } from '../i18n/useI18n.ts'

/** A town's name in the page's language; the town tables get theirs through nameRows */
export function useTownName(town: { name: string; nameEn?: string } | undefined) {
  const { lang } = useI18n()
  return town ? (lang === 'en' ? town.nameEn ?? town.name : town.name) : ''
}
