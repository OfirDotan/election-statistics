import { SeatStrip } from '../components/SeatStrip.tsx'
import { LoadError, Loading } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { fmtInt, fmtPct } from '../lib/fmt.ts'
import { allocate, SEATS } from '../lib/mandates.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function Seats() {
  const { t } = useI18n()
  const { party, official, error } = useDataset()
  useTitle(t('seatsTitle'))

  const result = official ? allocate({ votes: official.votes }) : null
  const rows = result ? [...result.seats].sort((a, b) => b.seats - a.seats || b.votes - a.votes) : []
  const blocks = rows.map((r) => ({ ...r, label: party(r.key).name, color: party(r.key).color }))

  return (
    <section className="page">
      <header className="page-head">
        <h1>{t('seatsTitle')}</h1>
        <p className="lead">{t('seatsIntro')}</p>
      </header>
      <p className="banner" role="status">
        {t('unverified')}
      </p>
      {error && <LoadError />}
      {!result && !error && <Loading />}
      {result && (
        <>
          <section className="card">
            <SeatStrip blocks={blocks} label={t('seatsTitle')} />
            <p className="note">{t('noteSeats')}</p>
          </section>
          <section className="card">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t('leaderParty')}</th>
                  <th scope="col" className="num">{t('votes')}</th>
                  <th scope="col" className="num">{t('byPct')}</th>
                  <th scope="col" className="num">{t('seatsTitle')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={r.seats === 0 ? 'muted' : undefined}>
                    <td>
                      <span className="seat-dot" style={{ background: party(r.key).color }} aria-hidden="true" /> {party(r.key).name}
                    </td>
                    <td className="num">{fmtInt(r.votes)}</td>
                    <td className="num">{fmtPct((r.votes / Math.max(1, result.validVotes)) * 100)}</td>
                    <td className="num">{r.seats || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="stats">
              <div>
                <dt>{t('officialVotes')}</dt>
                <dd className="num">{fmtInt(result.validVotes)}</dd>
              </div>
              <div>
                <dt>{t('seatsTitle')}</dt>
                <dd className="num">{SEATS}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </section>
  )
}
