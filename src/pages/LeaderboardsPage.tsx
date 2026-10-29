import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading, LoadError } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { nationalShares, townRows, type TownRow } from '../lib/derive.ts'
import { fmtPct } from '../lib/fmt.ts'
import { divergences } from '../lib/mapLogic.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

type Key = 'sweep' | 'majority' | 'margins' | 'high' | 'low' | 'closest' | 'divergence'

/** Turnout and divergence lists skip towns with fewer valid votes than this, where shares are noise */
const MIN_VALID = 50
const LIST = 10
const LABEL = { sweep: 'bSweep', majority: 'bMajority', margins: 'bMargins', high: 'bTurnoutHigh', low: 'bTurnoutLow', closest: 'bClosest', divergence: 'bDivergence' } as const

type StatRow = TownRow & { stats: NonNullable<TownRow['stats']> }
const hasStats = (r: TownRow): r is StatRow => r.stats !== null
const byName = (a: TownRow, b: TownRow, locale: string) => a.name.localeCompare(b.name, locale)

export function LeaderboardsPage() {
  const { t, locale } = useI18n()
  const { towns, party, error } = useDataset()
  const [threshold, setThreshold] = useState(90)
  const { rows, national } = useMemo(() => ({ rows: townRows(towns ?? []).filter(hasStats), national: nationalShares(towns ?? []) }), [towns])
  const diverge = useMemo(() => divergences(towns ?? [], Object.fromEntries(national), MIN_VALID), [towns, national])
  const big = rows.filter((r) => r.valid >= MIN_VALID)
  const sweep = [...rows].sort((a, b) => b.stats.leaderShare - a.stats.leaderShare || byName(a, b, locale)).filter((r) => r.stats.leaderShare >= threshold)
  useTitle(t('boardsTitle'))

  const lists: Record<Exclude<Key, 'sweep' | 'divergence'>, StatRow[]> = {
    majority: rows.filter((r) => r.stats.majority),
    margins: rows.filter((r) => r.stats.margin > 0).sort((a, b) => b.stats.margin - a.stats.margin || byName(a, b, locale)).slice(0, LIST),
    high: [...big].sort((a, b) => b.turnout - a.turnout || byName(a, b, locale)).slice(0, LIST),
    low: [...big].sort((a, b) => a.turnout - b.turnout || byName(a, b, locale)).slice(0, LIST),
    closest: [...big].sort((a, b) => a.stats.margin - b.stats.margin || byName(a, b, locale)).slice(0, LIST),
  }
  const value = (key: Key, r: StatRow) => {
    if (key === 'high' || key === 'low') return fmtPct(r.turnout)
    if (key === 'closest' || key === 'margins') return fmtPct(r.stats.margin)
    return fmtPct(r.stats.leaderShare)
  }

  return (
    <section className="page">
      <header className="page-head">
        <h1>{t('boardsTitle')}</h1>
        <p className="lead">{t('boardsIntro')}</p>
      </header>
      {error && <LoadError />}
      {!towns && !error && <Loading />}
      {towns && (
        <div className="boards">
          <section className="card board" aria-labelledby="h-sweep">
            <div className="board-head">
              <h2 id="h-sweep">{t('bSweep')}</h2>
              <span className="board-count">{sweep.length}</span>
            </div>
            <p className="board-note">{t('bSweepNote')}</p>
            <label className="field">
              <span>{t('threshold')}</span>
              <input type="range" min={50} max={100} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} aria-valuetext={`${threshold}%`} />
              <output>{threshold}%</output>
            </label>
            {/* Each board is its own scroll area, so a long list never stretches the page */}
            <ol className="board-list board-scroll" tabIndex={0}>
              {sweep.map((r, i) => (
                <li key={r.code}>
                  <span className="rank" aria-hidden="true">{i + 1}</span>
                  <Link to={`/town/${r.code}`} className="town-link">
                    {r.name}
                  </Link>
                  <span className="chip">
                    <span className="dot" style={{ background: party(r.stats.leader).color }} aria-hidden="true" />
                    {party(r.stats.leader).name}
                  </span>
                  <span className="value">{fmtPct(r.stats.leaderShare)}</span>
                </li>
              ))}
            </ol>
          </section>

          {(['majority', 'margins', 'high', 'low', 'closest'] as const).map((key) => (
            <section className="card board" key={key} aria-labelledby={`h-${key}`}>
              <div className="board-head">
                <h2 id={`h-${key}`}>{t(LABEL[key])}</h2>
                <span className="board-count">{lists[key].length}</span>
              </div>
              <p className="board-note">{key === 'majority' ? t('bMajorityNote') : key === 'margins' ? t('bMarginsNote') : key === 'closest' ? t('bClosestNote') : t('bTurnoutNote')}</p>
              <ol className="board-list board-scroll" tabIndex={0}>
                {lists[key].map((r, i) => (
                  <li key={r.code}>
                    <span className="rank" aria-hidden="true">{i + 1}</span>
                    <Link to={`/town/${r.code}`} className="town-link">
                      {r.name}
                    </Link>
                    <span className="chip">
                      <span className="dot" style={{ background: party(r.stats.leader).color }} aria-hidden="true" />
                      {party(r.stats.leader).name}
                    </span>
                    <span className="value">{value(key, r)}</span>
                  </li>
                ))}
              </ol>
              {lists[key].length === 0 && <p className="state">{t('empty')}</p>}
            </section>
          ))}

          <section className="card board" aria-labelledby="h-divergence">
            <div className="board-head">
              <h2 id="h-divergence">{t('bDivergence')}</h2>
              <span className="board-count">{diverge.length}</span>
            </div>
            <p className="board-note">{t('bDivergenceNote')}</p>
            <ol className="board-list board-scroll" tabIndex={0}>
              {[...diverge]
                .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
                .slice(0, LIST)
                .map((d, i) => (
                  <li key={d.code}>
                    <span className="rank" aria-hidden="true">{i + 1}</span>
                    <Link to={`/town/${d.code}`} className="town-link">
                      {towns.find((tw) => tw.code === d.code)?.name}
                    </Link>
                    <span className="chip">
                      <span className="dot" style={{ background: party(d.party).color }} aria-hidden="true" />
                      {party(d.party).name}
                    </span>
                    <span className="value">
                      {d.diff > 0 ? '+' : '−'}
                      {fmtPct(Math.abs(d.diff))}
                    </span>
                  </li>
                ))}
            </ol>
          </section>
        </div>
      )}
    </section>
  )
}
