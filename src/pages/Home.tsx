import { useState } from 'react'
import { Link } from 'react-router-dom'
import { allocate } from '../lib/mandates.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { LoadError, Loading, PartyChip, Title } from '../components/ui.tsx'
import { fmtInt, fmtPct } from '../lib/fmt.ts'
import { loadMeta } from '../lib/data.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

const TOP = 8
type Metric = 'pct' | 'seats' | 'votes'

export function Home() {
  const { t } = useI18n()
  const { towns, party, parties, official, error } = useDataset()
  const [metric, setMetric] = useState<Metric>('seats')
  const meta = useLoad('meta', loadMeta)
  useTitle('')

  // Official national result, every list on the ballot; official votes include the 493,642
  // double-envelope ballots that no town has, so town sums never reach these numbers
  const ranked = towns
    ? parties
        .map((p) => ({ ...party(p.key), pct: p.nationalShare ?? 0, votes: p.nationalVotes ?? 0 }))
        .filter((p) => p.votes > 0)
        .sort((a, b) => b.votes - a.votes)
    : []
  const seatOf = Object.fromEntries((official ? allocate({ votes: official.votes }).seats : []).map((s) => [s.key, s.seats]))
  const maxVotes = ranked[0]?.votes || 1
  const value = (r: (typeof ranked)[number]) =>
    metric === 'seats' ? `${seatOf[r.key] ?? 0}` : metric === 'votes' ? fmtInt(r.votes) : fmtPct(r.pct)
  const width = (r: (typeof ranked)[number]) => (metric === 'seats' ? ((seatOf[r.key] ?? 0) / 120) * 100 : metric === 'votes' ? (r.votes / maxVotes) * 100 : (r.pct / (ranked[0]?.pct || 1)) * 100)
  // Ranked by votes; seats reorder the list, so sort on the shown value
  const sorted = metric === 'pct' ? ranked : [...ranked].sort((a, b) => width(b) - width(a))
  const withVotes = towns?.filter((x) => x.votes?.source === 'kaplan').length ?? 0
  const eligible = towns?.reduce((s, x) => s + (x.votes?.eligible ?? 0), 0) ?? 0
  const voters = towns?.reduce((s, x) => s + (x.votes?.voters ?? 0), 0) ?? 0
  const valid = towns?.reduce((s, x) => s + (x.votes?.valid ?? 0), 0) ?? 0

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
          <section className="card" aria-labelledby="national">
            <div className="row-head">
              <h2 id="national">{t('national')}</h2>
              <div className="seg" role="group" aria-label={t('national')}>
                {(['pct', 'seats', 'votes'] as const).map((m) => (
                  <button key={m} type="button" className={metric === m ? 'on' : undefined} aria-pressed={metric === m} onClick={() => setMetric(m)}>
                    {{ pct: t('byPct'), seats: t('bySeats'), votes: t('byVotes') }[m]}
                  </button>
                ))}
              </div>
            </div>
            <ol className="party-bars">
              {sorted.slice(0, TOP).map((p) => (
                <li key={p.key}>
                  <span className="pb-name">
                    <PartyChip name={p.name} color={p.color} logo={p.logo} />
                  </span>
                  <span className="pb-track">
                    <span className="pb-fill" style={{ inlineSize: `${width(p)}%`, background: p.color }} />
                  </span>
                  <span className="pb-value num">{value(p)}</span>
                </li>
              ))}
            </ol>
            <p className="note">{metric === 'seats' ? t('noteSeats') : metric === 'votes' ? t('votesWord') : t('ofValid')}</p>
          </section>

          <dl className="stats">
            <div>
              <dt>{t('townsWithVotes')}</dt>
              <dd className="num">{fmtInt(withVotes)}</dd>
            </div>
            <div>
              <dt>{t('eligible')}</dt>
              <dd className="num">{fmtInt(eligible)}</dd>
            </div>
            <div>
              <dt>{t('turnoutOverall')}</dt>
              <dd className="num">{fmtPct(eligible ? (voters / eligible) * 100 : 0)}</dd>
            </div>
            <div>
              <dt>{t('validVotes')}</dt>
              <dd className="num">{fmtInt(valid)}</dd>
            </div>
          </dl>

          <div className="row-head">
            <Title sub={t('townsIntro')} h2>{t('townsTitle')}</Title>
            <Link to="/towns" className="button">
              {t('results')} →
            </Link>
          </div>
        </>
      )}
    </section>
  )
}
