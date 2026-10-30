import { townName, type Board, type TownRow } from '../lib/derive.ts'
import type { PartyLookup } from '../lib/useData.ts'
import { SharePie } from './SharePie.tsx'

const TITLES: Record<Board, 'boardsTowns' | 'bMargins' | 'bTurnoutHigh' | 'bClosest' | 'bDivergence'> = {
  all: 'boardsTowns',
  margins: 'bMargins',
  high: 'bTurnoutHigh',
  low: 'bTurnoutHigh',
  closest: 'bClosest',
  divergence: 'bDivergence',
}

/**
 * The cards above the leaderboards search: towns by their leading party as a donut, then the board's top towns as bars, so switching board changes what is below the table's search as well as the table.
 */
export function BoardCharts({ rows, board, party, lang, titles }: { rows: TownRow[]; board: Board; party: PartyLookup; lang: string; titles: Record<'boardsTowns' | 'bMargins' | 'bTurnoutHigh' | 'bClosest' | 'bDivergence', string> }) {
  const measured = rows.filter((r) => r.stats)
  const byLeader = new Map<string, number>()
  for (const r of measured) if (r.stats!.leader) byLeader.set(r.stats!.leader, (byLeader.get(r.stats!.leader) ?? 0) + 1)
  const leaders = [...byLeader].sort((a, b) => b[1] - a[1]).map(([key, value]) => ({ key, value }))
  // Ranked the way the board ranks, so each bar chart is that board's table in miniature
  const ranked = [...measured].sort((a, b) => (a.ranks?.[board === 'all' ? 'margins' : board] ?? Infinity) - (b.ranks?.[board === 'all' ? 'margins' : board] ?? Infinity))
  // Each board's own column: leader share, margin, turnout or the gap from national
  const col = (r: TownRow) => (board === 'closest' ? r.stats!.margin : board === 'high' || board === 'low' ? r.turnout : r.stats!.leaderShare)
  const bars = ranked.slice(0, 7).map((r) => ({ code: r.code, name: r.name, nameEn: r.nameEn, value: col(r), key: r.stats!.leader ?? '' }))
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="board-charts">
      <section className="card chart-card" aria-labelledby="chart-leaders">
        <h2 id="chart-leaders">{titles.boardsTowns}</h2>
        <SharePie slices={leaders} party={party} centre={String(leaders.reduce((s, l) => s + l.value, 0))} unit={String} interactive />
      </section>
      <section className="card chart-card" aria-labelledby="chart-top">
        <h2 id="chart-top">{titles[TITLES[board]]}</h2>
        {/* The share column of the board's top seven; the table below carries the rest of each row */}
        <ul className="bar-chart">
          {bars.map((b) => (
            <li key={b.code}>
              <span className="bar-label">{townName(b.name, b.nameEn, lang)}</span>
              <span className="bar" style={{ inlineSize: `${(b.value / max) * 100}%`, background: party(b.key).color }} />
              <span className="num">{b.value.toFixed(1)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
