import { useMemo, useState } from 'react'
import { TownTable } from '../components/TownTable.tsx'
import { Loading, LoadError } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { boardRows, filterStats, nationalShares, sortRows, townRows, type BoardRow, type SortKey, type TownFilters } from '../lib/derive.ts'
import { divergences } from '../lib/mapLogic.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

type Board = 'all' | 'sweep' | 'majority' | 'margins' | 'high' | 'low' | 'closest' | 'divergence'

const BOARDS: Board[] = ['all', 'sweep', 'majority', 'margins', 'high', 'low', 'closest', 'divergence']
const LABEL = { all: 'bAll', sweep: 'bSweep', majority: 'bMajority', margins: 'bMargins', high: 'bTurnoutHigh', low: 'bTurnoutLow', closest: 'bClosest', divergence: 'bDivergence' } as const
const NOTE = { sweep: 'bSweepNote', majority: 'bMajorityNote', margins: 'bMarginsNote', high: 'bTurnoutNote', low: 'bTurnoutNote', closest: 'bClosestNote', divergence: 'bDivergenceNote' } as const
/** Turnout and divergence skip towns with fewer valid votes than this, where shares are noise */
const MIN_VALID = 50
const NONE_FILTERS: TownFilters = { query: '', leader: '', minShare: 0, minTurnout: 0, majorityOnly: false, pluralityOnly: false }

export function LeaderboardsPage() {
  const { t, locale } = useI18n()
  const { towns, party, error } = useDataset()
  const [board, setBoard] = useState<Board>('all')
  const [threshold, setThreshold] = useState(90)
  const [f, setF] = useState<TownFilters>(NONE_FILTERS)
  const [sort, setSort] = useState<SortKey>('share')
  const [dir, setDir] = useState<1 | -1>(-1)
  const { rows, national } = useMemo(() => ({ rows: townRows(towns ?? []), national: nationalShares(towns ?? []) }), [towns])
  const diverge = useMemo(() => divergences(towns ?? [], Object.fromEntries(national), MIN_VALID), [towns, national])
  const all = useMemo(() => boardRows(rows, towns ?? [], diverge, MIN_VALID), [rows, towns, diverge])
  useTitle(t('boardsTitle'))

  // Divergence ranks by its own gap; every other board by the leader's share. Turnout turns it into a turnout ranking
  const ranked = useMemo(
    () => all.map((r) => (board === 'divergence' || sort === 'share' || r.stats === null ? r : { ...r, value: r.turnout ?? r.value })),
    [all, board, sort],
  )
  const keep = (r: BoardRow) => {
    const s = r.stats
    const b: Record<Board, boolean> = {
      all: true,
      sweep: s !== null && r.party === s.leader && s.leaderShare >= threshold,
      majority: s !== null && s.majority,
      margins: s !== null && s.margin > 0,
      high: r.board,
      low: r.board,
      closest: r.board && s !== null,
      divergence: r.board,
    }
    return b[board]
  }
  const boardLeaders = useMemo(() => [...new Set(all.filter(keep).map((r) => r.stats?.leader).filter((k): k is string => !!k))], [all, board, threshold])
  const leaders = board === 'all' ? boardLeaders : boardLeaders.filter((k) => k === f.leader || f.leader === '')
  const rowsShown = useMemo(
    () => sortRows(filterStats(ranked.filter(keep).filter((r) => board === 'divergence' || f.leader === '' || r.stats?.leader === f.leader), f), sort, dir, locale),
    [ranked, board, threshold, f, sort, dir, locale],
  )
  const set = <K extends keyof TownFilters>(k: K) => (v: TownFilters[K]) => setF((s) => ({ ...s, [k]: v }))
  const reset = () => {
    setF(NONE_FILTERS)
    setThreshold(90)
  }
  const onSort = (k: string) => {
    const key = k as SortKey
    if (key === sort) setDir((d) => (d === 1 ? -1 : 1))
    else {
      setSort(key)
      setDir(key === 'name' || key === 'leader' ? 1 : -1)
    }
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
        <>
          <div className="seg board-seg" role="group" aria-label={t('boardsTitle')}>
            {BOARDS.map((b) => (
              <button key={b} type="button" aria-pressed={board === b} className={board === b ? 'on' : undefined} onClick={() => setBoard(b)}>
                {b === 'all' ? t(LABEL[b]) : `${t('bRank')} ${t(LABEL[b])}`}
              </button>
            ))}
          </div>
          <div className="board-bar">
            <input className="towns-search" type="search" value={f.query} onChange={(e) => set('query')(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
            <select value={f.leader} onChange={(e) => set('leader')(e.target.value)} aria-label={t('leaderParty')}>
              <option value="">{t('allParties')}</option>
              {leaders.map((k) => (
                <option key={k} value={k}>
                  {t('townTally')} {party(k).name}
                </option>
              ))}
            </select>
            {board === 'sweep' && (
              <label className="field">
                <span>{t('rankFrom')}</span>
                <input type="number" min={0} max={100} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} aria-label={t('threshold')} />
              </label>
            )}
            <p className="muted" aria-live="polite">
              <span className="num">{rowsShown.length}</span> / <span className="num">{all.length}</span>
            </p>
            <details className="towns-more">
              <summary className="button subtle">{t('filters')}</summary>
              <div className="card towns-more-body">
                <label className="field">
                  <span>
                    {t('minShare')} <output className="num">{f.minShare}%</output>
                  </span>
                  <input type="range" min={0} max={100} step={1} value={f.minShare} onChange={(e) => set('minShare')(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>
                    {t('minTurnout')} <output className="num">{f.minTurnout}%</output>
                  </span>
                  <input type="range" min={0} max={100} step={1} value={f.minTurnout} onChange={(e) => set('minTurnout')(Number(e.target.value))} />
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={f.majorityOnly} onChange={(e) => set('majorityOnly')(e.target.checked)} />
                  {t('majorityOnly')}
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={f.pluralityOnly} onChange={(e) => set('pluralityOnly')(e.target.checked)} />
                  {t('pluralityOnly')}
                </label>
                <button type="button" className="button subtle" onClick={reset}>
                  {t('reset')}
                </button>
              </div>
            </details>
          </div>
          {board !== 'all' && (
            <p className="muted board-note">
              {t(NOTE[board])}
              {board === 'divergence' && ` ${t('divergenceHint')}`}
            </p>
          )}
          <TownTable rows={rowsShown} party={party} sort={sort} dir={dir} onSort={onSort} />
        </>
      )}
    </section>
  )
}
