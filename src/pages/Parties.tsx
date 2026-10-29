import { useI18n } from '../i18n/useI18n.ts'
import { Loading, LoadError, PartyChip } from '../components/ui.tsx'
import { fmtPct } from '../lib/fmt.ts'
import { nationalShares } from '../lib/derive.ts'
import { loadParties } from '../lib/data.ts'
import { readableOn } from '../lib/color.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function Parties() {
  const { t } = useI18n()
  const { towns, party, error } = useDataset()
  const ballot = useLoad('parties', loadParties)
  useTitle(t('partiesTitle'))

  const shares = new Map(towns ? nationalShares(towns) : [])
  // Withdrawn lists still appear in towns' byParty only as stragglers; ranked shares, then every other ballot list at zero
  const unrecorded = new Set((ballot.data ?? []).filter((p) => p.status !== 'approved').map((p) => p.key))
  const withVotes = [...shares]
    .filter(([key]) => !unrecorded.has(key))
    .map(([key, pct]) => ({ ...party(key), pct }))
    .sort((a, b) => b.pct - a.pct)
  const shown = new Set(withVotes.map((p) => p.key))
  const rest = (ballot.data ?? []).filter((p) => !shown.has(p.key)).map((p) => ({ ...party(p.key), pct: 0 }))

  return (
    <section className="page">
      <header className="page-head">
        <h1>{t('partiesTitle')}</h1>
        <p className="lead">{t('partiesIntro')}</p>
      </header>
      {error && <LoadError />}
      {(!towns || !ballot.data) && !error && <Loading />}
      {towns && ballot.data && (
        <div className="card" role="region" aria-label={t('national')}>
          <ol className="party-bars">
            {withVotes.map((p) => (
              <li key={p.key}>
                <span className="pb-name">
                  <PartyChip name={p.name} color={p.color} logo={p.logo} />
                </span>
                <span className="pb-track">
                  <span className="pb-fill" style={{ inlineSize: `${p.pct}%`, background: p.color }} />
                </span>
                <span className="pb-value num">{fmtPct(p.pct)}</span>
              </li>
            ))}
          </ol>
          <p className="note">{t('ofValid')}</p>
          {rest.length > 0 && (
            <details className="section">
              <summary>
                {t('allParties')} ({rest.length})
              </summary>
              <ul className="other-parties">
                {rest.map((p) => (
                  <li key={p.key}>
                    <span className="ballot-slip" style={{ background: p.color, color: readableOn(p.color) }} aria-hidden="true">
                      {p.key}
                    </span>
                    <span>{p.name}</span>
                    <span className="muted num">{t('noVotes')}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
