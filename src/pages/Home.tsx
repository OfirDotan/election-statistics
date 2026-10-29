import { allocate } from '../lib/mandates.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { LoadError, Loading, PartyChip } from '../components/ui.tsx'
import { fmtInt } from '../lib/fmt.ts'
import { loadMeta } from '../lib/data.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

export function Home() {
  const { t } = useI18n()
  const { towns, party, parties, official, error } = useDataset()
  const meta = useLoad('meta', loadMeta)
  useTitle('')

  // Official national result, every list on the ballot; official votes include the double-envelope
  // ballots that no town has, so town sums never reach these numbers
  const ranked = towns
    ? parties
        .map((p) => ({ ...party(p.key), votes: p.nationalVotes ?? 0 }))
        .filter((p) => p.votes > 0)
        .sort((a, b) => b.votes - a.votes)
    : []
  const seatOf = Object.fromEntries((official ? allocate({ votes: official.votes }).seats : []).map((s) => [s.key, s.seats]))
  // Home shows seats only; the parties page has the seats/votes/percent breakdown. Ties on seats
  // keep the vote order, so seats alone decide
  const seated = ranked.filter((p) => (seatOf[p.key] ?? 0) > 0).sort((a, b) => (seatOf[b.key] ?? 0) - (seatOf[a.key] ?? 0))
  const maxSeats = Math.max(1, ...seated.map((p) => seatOf[p.key] ?? 0))
  // Every figure is the results file's own national header (meta.json), never a party-vote or town
  // sum: a party sum is the valid count, and voters includes the double envelopes no town has
  const eligible = meta.data?.eligible ?? 0
  const voters = meta.data?.voters ?? 0
  const turnout = meta.data?.turnout ?? 0
  const valid = meta.data?.valid ?? 0
  const invalid = meta.data?.invalid ?? 0

  return (
    <section className="page">
      <header className="hero">
        <p className="eyebrow">{t('app')}</p>
        <h1>{t('title')}</h1>
        <p className="lead">{t('subtitle')}</p>
        <div className="hero-meta">
          {meta.data && (
            <span className="asof">
              {t('asOf')} {meta.data.date} · {meta.data.time}
              {meta.data.counted != null && ` · ${t('boxesCounted')} ${meta.data.counted}%`}
            </span>
          )}
        </div>
      </header>

      <p className="banner" role="status">
        <span className="pulse" aria-hidden="true" />
        {t('unverified')}
      </p>

      {error && <LoadError />}
      {!towns && !error && <Loading />}

      {towns && (
        <>
          <dl className="stats">
            <div>
              <dt>{t('eligible')}</dt>
              <dd className="num">{fmtInt(eligible)}</dd>
            </div>
            <div>
              <dt>{t('voters')}</dt>
              <dd className="num">{fmtInt(voters)}</dd>
            </div>
            <div>
              <dt>{t('turnoutOverall')}</dt>
              <dd className="num">{turnout.toFixed(2)}%</dd>
            </div>
            <div>
              <dt>{t('validVotes')}</dt>
              <dd className="num">{fmtInt(valid)}</dd>
            </div>
            <div>
              <dt>{t('invalidVotes')}</dt>
              <dd className="num">{fmtInt(invalid)}</dd>
            </div>
          </dl>
          <section className="card" aria-labelledby="national">
            <h2 id="national">{t('national')}</h2>
            <ol className="party-bars">
              {seated.map((p) => (
                <li key={p.key}>
                  <span className="pb-name">
                    <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={p.key} slug={p.slug} />
                  </span>
                  <span className="pb-track">
                    <span className="pb-fill" style={{ inlineSize: `${((seatOf[p.key] ?? 0) / maxSeats) * 100}%`, background: p.color }} />
                  </span>
                  <span className="pb-value num">{seatOf[p.key] ?? 0}</span>
                </li>
              ))}
            </ol>
            <p className="note">{t('noteSeats')}</p>
          </section>
        </>
      )}
    </section>
  )
}
