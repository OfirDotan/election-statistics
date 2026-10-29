import { useI18n } from '../i18n/useI18n.ts'
import { useTitle } from '../lib/useTitle.ts'
import type { RouteKey } from '../components/Nav.tsx'

/** TODO placeholder for screens built by other workstreams. */
export function ComingSoon({ titleKey }: { titleKey: RouteKey }) {
  const { t } = useI18n()
  useTitle(t(titleKey))
  return (
    <section className="page">
      <header className="page-head">
        <h1>{t(titleKey)}</h1>
        <p className="lead">{t('placeholder')}</p>
      </header>
    </section>
  )
}
