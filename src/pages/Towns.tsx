import { useMemo, useState } from 'react'
import { TownTable } from '../components/TownTable.tsx'
import { Loading, LoadError } from '../components/ui.tsx'
import { useI18n } from '../i18n/useI18n.ts'
import { filterStats, sortRows, townRows, type SortKey, type TownFilters } from '../lib/derive.ts'
import { useDataset } from '../lib/useData.ts'
import { useTitle } from '../lib/useTitle.ts'

const initial: TownFilters = { query: '', leader: '', minShare: 0, minTurnout: 0, majorityOnly: false, pluralityOnly: false }

export function Towns() {
  const { t, locale } = useI18n()
  const { towns, party, error } = useDataset()
  const rowsAll = townRows(towns ?? [])
  useTitle(t('townsTitle'))
  const [f, setF] = useState<TownFilters>(initial)
  const [sort, setSort] = useState<SortKey>('name')
  const [dir, setDir] = useState<1 | -1>(1)

  // Leader keys aren't sorted (they're ballot letters); the <option>s render party names, which browsers order by script
  const leaders = useMemo(() => [...new Set(rowsAll.map((r) => r.stats?.leader).filter((k): k is string => !!k))], [rowsAll])
  const rows = useMemo(() => sortRows(filterStats(rowsAll, f), sort, dir, locale), [rowsAll, f, sort, dir, locale])
  const set = <K extends keyof TownFilters>(k: K) => (v: TownFilters[K]) => setF((s) => ({ ...s, [k]: v }))
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
        <h1>{t('townsTitle')}</h1>
        <p className="lead">{t('townsIntro')}</p>
      </header>
      {error && <LoadError />}
      {!towns && !error && <Loading />}
      {towns && (
        <>
          {/* One search line, then the filters folded away until wanted */}
          <div className="towns-bar">
            <input
              className="towns-search"
              type="search"
              value={f.query}
              onChange={(e) => set('query')(e.target.value)}
              placeholder={t('search')}
              aria-label={t('search')}
            />
            <select value={f.leader} onChange={(e) => set('leader')(e.target.value)} aria-label={t('leaderParty')}>
              <option value="">{t('allParties')}</option>
              {leaders.map((k) => (
                <option key={k} value={k}>
                  {party(k).name}
                </option>
              ))}
            </select>
            <p className="muted" aria-live="polite">
              <span className="num">{rows.length}</span> / <span className="num">{rowsAll.length}</span>
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
                <button type="button" className="button subtle" onClick={() => setF(initial)}>
                  {t('reset')}
                </button>
              </div>
            </details>
          </div>
          <TownTable rows={rows} party={party} sort={sort} dir={dir} onSort={onSort} />
        </>
      )}
    </section>
  )
}
