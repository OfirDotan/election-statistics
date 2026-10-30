import { Link, useParams } from 'react-router-dom'
import { Loading, LoadError, PartyChip } from '../components/ui.tsx'
import { fmtInt, fmtPct } from '../lib/fmt.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { townRows, townVotes } from '../lib/derive.ts'
import { loadKalpi } from '../lib/data.ts'
import { rankedShares } from '../lib/stats.ts'
import { useDataset, useLoad } from '../lib/useData.ts'
import { useTownName } from '../lib/townNames.ts'
import { useTitle } from '../lib/useTitle.ts'

export function TownPage() {
  const { code } = useParams()
  const { t } = useI18n()
  const { towns, party, nationalShare, error } = useDataset()
  const kalpi = useLoad('kalpi', loadKalpi)
  const town = towns?.find((x) => String(x.code) === code)
  const name = useTownName(town)
  useTitle(name)

  if (error) return <LoadError />
  if (!towns || !town) return town ? <Loading /> : <p className="state">{t('notFound')}</p>

  const votes = townVotes(town)
  const ranked = rankedShares(votes)
  const stations = [...(kalpi.data?.[String(town.code)] ?? [])].sort((a, b) => a.kalpi.localeCompare(b.kalpi, undefined, { numeric: true }))
  const row = townRows([town], kalpi.data ?? {})[0]
  const destinationTurnout = row.turnout

  return (
    <section className="page">
      <header className="page-head">
        <nav className="crumb" aria-label={t('townsTitle')}>
          <Link to="/towns">← {t('townsTitle')}</Link>
        </nav>
        <h1>{name}</h1>
        {votes.voters > 0 && (
          <dl className="stats">
            <div>
              <dt>{t('colTurnout')}</dt>
              <dd className="num">{fmtPct(destinationTurnout)}</dd>
            </div>
            <div>
              <dt>{t('validVotes')}</dt>
              <dd className="num">{votes.valid > 0 ? fmtInt(votes.valid) : '—'}</dd>
            </div>
            <div>
              <dt>{t('voters')}</dt>
              <dd className="num">{fmtInt(votes.voters)}</dd>
            </div>
            <div>
              <dt>{t('eligible')}</dt>
              <dd className="num">{fmtInt(votes.eligible)}</dd>
            </div>
          </dl>
        )}
      </header>

      {ranked.length === 0 ? (
        <p className="state">{t('noVotes')}</p>
      ) : (
        <section className="card" aria-labelledby="breakdown">
          <h2 id="breakdown">{t('townBreakdown')}</h2>
          <div className="table-wrap">
            <table className="breakdown">
              <thead>
                <tr>
                  <th scope="col">{t('leaderParty')}</th>
                  <th scope="col" className="bar-col">
                    <span className="visually-hidden">{t('colShare')}</span>
                  </th>
                  <th scope="col" className="num">{t('votes')}</th>
                  <th scope="col" className="num">{t('share')}</th>
                  <th scope="col" className="num">{t('townVsNational')}</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(([key, pct]) => {
                  const p = party(key)
                  const delta = pct - (nationalShare.get(key) ?? 0)
                  return (
                    <tr key={key}>
                      <th scope="row">
                        <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={p.key} slug={p.slug} />
                      </th>
                      <td className="bar-col">
                        <span className="bar" aria-hidden="true">
                          <span style={{ inlineSize: `${pct}%`, background: p.color }} />
                        </span>
                      </td>
                      <td className="num">{fmtInt(votes.byParty[key])}</td>
                      <td className="num">{fmtPct(pct)}</td>
                      <td className={`num delta ${delta >= 0 ? 'pos' : 'neg'}`}>
                        <span aria-hidden="true">{delta >= 0 ? '▲ +' : '▼ −'}</span>
                        {fmtPct(Math.abs(delta))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="kalpi">
        <h2 id="kalpi">{t('kalpiTitle')}</h2>
        <p className="note">{t('kalpiNote')}</p>
        {!kalpi.data ? (
          <Loading />
        ) : stations.length === 0 ? (
          <p className="muted">—</p>
        ) : (
          <div className="table-wrap">
            <table className="kalpi">
              <thead>
                <tr>
                  <th scope="col">{t('kalpiNum')}</th>
                  <th scope="col" className="num">{t('eligible')}</th>
                  <th scope="col" className="num">{t('voters')}</th>
                  <th scope="col" className="num">{t('voterShare')}</th>
                  <th scope="col" className="bar-col">
                    <span className="visually-hidden">
                      {t('voterShare')} · {t('aboveAvg')} / {t('belowAvg')}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {stations.map((k) => {
                  const above = k.percent >= destinationTurnout
                  return (
                    <tr key={k.code}>
                        <th scope="row" className="num">
                          {k.kalpi}
                        </th>
                        <td className="num">{fmtInt(k.eligible)}</td>
                        <td className="num">{fmtInt(k.voters)}</td>
                        <td className="num">{fmtPct(k.percent)}</td>
                        <td className="bar-col">
                          <span className="bar" title={above ? t('aboveAvg') : t('belowAvg')}>
                            <span
                              className={above ? 'above' : 'below'}
                              style={{ inlineSize: `${Math.min(k.percent, 100)}%` }}
                            />
                          </span>
                          <span className="visually-hidden">{above ? t('aboveAvg') : t('belowAvg')}</span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
        <p className="note">
          {t('townTurnout')}: {fmtPct(destinationTurnout)}
        </p>
      </section>
    </section>
  )
}
