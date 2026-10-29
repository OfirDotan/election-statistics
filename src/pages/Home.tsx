import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.ts'
import { LoadError, Loading, PartyChip, Title } from '../components/ui.tsx'
import { fmtInt, fmtPct } from '../lib/fmt.ts'
import { nationalShares } from '../lib/derive.ts'
import { loadMeta } from '../lib/data.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

const TOP = 8

export function Home() {
  const { t } = useI18n()
  const { towns, party, error } = useDataset()
  const meta = useLoad('meta', loadMeta)
  useTitle('')

  const ranked = towns
    ? [...nationalShares(towns)]
        .map(([key, pct]) => ({ ...party(key), pct }))
        .sort((a, b) => b.pct - a.pct)
    : []
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
            <h2 id="national">{t('national')}</h2>
            <ol className="party-bars">
              {ranked.slice(0, TOP).map((p) => (
                <li key={p.key}>
                  <span className="pb-name">
                    <PartyChip name={p.name} color={p.color} />
                  </span>
                  <span className="pb-track">
                    <span className="pb-fill" style={{ inlineSize: `${p.pct}%`, background: p.color }} />
                  </span>
                  <span className="pb-value num">{fmtPct(p.pct)}</span>
                </li>
              ))}
            </ol>
            <p className="note">{t('ofValid')}</p>
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
