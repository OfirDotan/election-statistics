import { useEffect } from 'react'
import { useI18n } from '../i18n/useI18n.ts'

export function useTitle(part: string) {
  const { t } = useI18n()
  useEffect(() => {
    document.title = part ? `${part} — ${t('app')}` : t('app')
  }, [part, t])
}
