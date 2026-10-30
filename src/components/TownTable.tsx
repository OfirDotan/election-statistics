import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n.ts'
import { townName, type Board, type SortKey, type TownRow } from '../lib/derive.ts'
import type { PartyLookup } from '../lib/useData.ts'
import { ColHelp, PartyChip } from './ui.tsx'
import { fmtInt, fmtPct } from '../lib/fmt.ts'

const RANK_LABEL = { margins: 'bMargins', high: 'bTurnoutHigh', low: 'bTurnoutLow', closest: 'bClosest', divergence: 'bDivergence' } as const
const RANKED = Object.keys(RANK_LABEL) as Exclude<Board, 'all'>[]
/** What each rank column ranks by, in words that don't need the board's name */
const RANK_HELP = { margins: 'rankMargins', high: 'rankHigh', low: 'rankLow', closest: 'rankClosest', divergence: 'rankDivergence' } as const

export function TownTable({
  rows,
  party,
  sort,
  dir,
  onSort,
  showTurnout = true,
  board,
  onOpen,
}: {
  rows: TownRow[]
  party: PartyLookup
  sort: SortKey
  dir: 1 | -1
  onSort: (k: string) => void
  /** Towns without ballots still have a turnout figure; the detail page hides it */
  showTurnout?: boolean
  /** Leaderboards: every board's rank at the end of the row, and a header to open each board from its column */
  board?: Board
  onOpen?: (b: Exclude<Board, 'all'>) => void
}) {
  const { t, lang } = useI18n()
  const ranked = board !== undefined
  const th = (k: SortKey, label: string, numeric = true, help?: string) => (
    <th scope="col" className={numeric ? 'num' : undefined} aria-sort={sort === k ? (dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort" onClick={() => onSort(k)}>
        {label}
        <span className="sort-arrow" aria-hidden="true">{sort === k ? (dir === 1 ? '▲' : '▼') : ''}</span>
      </button>
      {help && <ColHelp text={help} />}
    </th>
  )
  return (
    <div className="table-wrap">
      <table className={`towns${ranked ? ' towns-ranked' : ''}`}>
        <thead>
          <tr>
            {th('name', t('colTown'), false)}
            {th('leader', t('colLeader'), false)}
            {th('share', t('colShare'), true, t('colShareHelp'))}
            {th('margin', t('colMargin'), true, t('colMarginHelp'))}
            {showTurnout && th('turnout', t('colTurnout'), true, t('colTurnoutHelp'))}
            {th('valid', t('colValid'), true, t('colValidHelp'))}
            {ranked && RANKED.map((b) => (
              <th key={b} scope="col" className="num board-rank">
                <button type="button" className="sort" onClick={() => onOpen?.(b)}>{t(RANK_LABEL[b])}</button>
                <ColHelp text={t(RANK_HELP[b])} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const s = r.stats
            const p = s?.leader ? party(s.leader) : null
            return (
              <tr key={r.code}>
                <th scope="row">
                  <Link to={`/town/${r.code}`}>{townName(r.name, r.nameEn, lang)}</Link>
                </th>
                <td>{p ? <PartyChip name={p.name} color={p.color} logo={p.logo} partyKey={p.key} slug={p.slug} /> : <span className="muted">{t('noVotes')}</span>}</td>
                <td className="num">{p ? fmtPct(s!.leaderShare) : '—'}</td>
                <td className="num">{p ? fmtPct(s!.margin) : '—'}</td>
                {showTurnout && <td className="num">{r.turnout ? fmtPct(r.turnout) : '—'}</td>}
                <td className="num">{r.source === 'kaplan' ? fmtInt(r.valid) : '—'}</td>
                {ranked && RANKED.map((b) => <td key={b} className="num board-rank">{r.ranks?.[b] ?? '—'}</td>)}
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="state">{t('empty')}</p>}
    </div>
  )
}
