import { useMemo, useState } from 'react'
import { TownTable } from '../components/TownTable.tsx'
import { Loading, LoadError } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { boardRows, filterStats, MIN_VALID, nationalShares, RANK_COLUMN, sortRows, townRows, type Board, type SortKey, type TownFilters } from '../lib/derive.ts'
import { divergences } from '../lib/mapLogic.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

const LABEL = { sweep: 'bSweep', majority: 'bMajority', margins: 'bMargins', high: 'bTurnoutHigh', low: 'bTurnoutLow', closest: 'bClosest', divergence: 'bDivergence' } as const
const NOTE = { sweep: 'bSweepNote', majority: 'bMajorityNote', margins: 'bMarginsNote', high: 'bTurnoutNote', low: 'bTurnoutNote', closest: 'bClosestNote', divergence: 'bDivergenceNote' } as const
/** Sweeps start at this share; the box in the bar changes it */
const SWEEP_FROM = 90
const NONE_FILTERS: TownFilters = { query: '', leader: '', minShare: 0, minTurnout: 0, majorityOnly: false, pluralityOnly: false }

export function LeaderboardsPage() {
  const { t, locale } = useI18n()
  const { towns, party, error } = useDataset()
  const [board, setBoard] = useState<Board>('all')
  const [threshold, setThreshold] = useState(SWEEP_FROM)
  const [f, setF] = useState<TownFilters>(NONE_FILTERS)
  const [sort, setSort] = useState<SortKey>('share')
  const [dir, setDir] = useState<1 | -1>(-1)
  const all = useMemo(() => {
    const national = nationalShares(towns ?? [])
    return boardRows(townRows(towns ?? []), towns ?? [], national, divergences(towns ?? [], Object.fromEntries(national)))
  }, [towns])
  useTitle(t('boardsTitle'))

  const leaders = useMemo(() => [...new Set(all.map((r) => r.stats?.leader).filter((k): k is string => !!k))], [all])
  const shown = useMemo(() => {
    const need = board === 'high' || board === 'low' || board === 'divergence' ? MIN_VALID : 0
    const kept = all.filter((r) => board === 'all' || (r.ranks![board] !== null && r.valid >= need && (board !== 'sweep' || (r.stats?.leaderShare ?? 0) >= threshold)))
    return sortRows(filterStats(kept, f), sort, dir, locale)
  }, [all, board, threshold, f, sort, dir, locale])
  const set = <K extends keyof TownFilters>(k: K) => (v: TownFilters[K]) => setF((s) => ({ ...s, [k]: v }))
  // A board opens at its top: its own column, big first (closest races and low turnout small first)
  const open = (b: Board) => {
    setBoard(b)
    if (b === 'all') return
    setSort(RANK_COLUMN[b])
    setDir(b === 'closest' || b === 'low' ? 1 : -1)
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
          <div className="towns-bar">
            <input className="towns-search" type="search" value={f.query} onChange={(e) => set('query')(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
            <select value={f.leader} onChange={(e) => set('leader')(e.target.value)} aria-label={t('leaderParty')}>
              <option value="">{t('allParties')}</option>
              {leaders.map((k) => (
                <option key={k} value={k}>
                  {party(k).name}
                </option>
              ))}
            </select>
            {board === 'sweep' && (
              <label className="field">
                <span>{t('threshold')}</span>
                <input type="number" min={0} max={100} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              </label>
            )}
            <p className="muted" aria-live="polite">
              <span className="num">{shown.length}</span> / <span className="num">{all.length}</span>
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
                <button type="button" className="button subtle" onClick={() => setF(NONE_FILTERS)}>
                  {t('reset')}
                </button>
              </div>
            </details>
          </div>
          {board !== 'all' && (
            <p className="board-note">
              <strong>{t(LABEL[board])}</strong> · {t(NOTE[board])}
              <button type="button" className="button subtle" onClick={() => open('all')}>
                {t('bAll')}
              </button>
            </p>
          )}
          <TownTable rows={shown} party={party} sort={sort} dir={dir} onSort={onSort} board={board} />
        </>
      )}
    </section>
  )
}
