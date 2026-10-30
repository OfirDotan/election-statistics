import { townName, type Board, type TownRow } from '../lib/derive.ts'
import type { PartyLookup } from '../lib/useData.ts'
import { SharePie } from './SharePie.tsx'

const TITLES: Record<Board, 'bMargins' | 'bTurnoutHigh' | 'bClosest' | 'bDivergence'> = {
  all: 'bMargins',
  margins: 'bMargins',
  high: 'bTurnoutHigh',
  low: 'bTurnoutHigh',
  closest: 'bClosest',
  divergence: 'bDivergence',
}

/** The colours the turnout bands take in its donut; the bands are a scale, not parties */
const BAND_COLOR: Record<string, string> = { bLow: '#c62828', bMid: '#e0a100', bHighBand: '#1a7f37' }

/** A party's mean leading share over the towns it leads */
function leaderShares(rows: TownRow[]) {
  const out = new Map<string, { n: number; sum: number }>()
  for (const r of rows) {
    const k = r.stats!.leader!
    const v = out.get(k) ?? { n: 0, sum: 0 }
    out.set(k, { n: v.n + 1, sum: v.sum + r.stats!.leaderShare })
  }
  return [...out].map(([key, v]) => [key, v.sum / v.n] as [string, number]).sort((a, b) => b[1] - a[1])
}

type Titles = Record<'boardsTowns' | 'boardsShare' | 'boardsTurnout' | 'boardsHold' | 'boardsNarrow' | 'bLow' | 'bMid' | 'bHighBand' | 'bMargins' | 'bTurnoutHigh' | 'bClosest' | 'bDivergence', string>

/**
 * The cards above the leaderboards search: three donuts and three bar graphs, all over the rows the selected
 * board ranks, so switching board changes what is below the table's search as well as the table.
 */
export function BoardCharts({ rows, board, party, lang, titles }: { rows: TownRow[]; board: Board; party: PartyLookup; lang: string; titles: Titles }) {
  const measured = rows.filter((r) => r.stats)
  const leaders = new Map<string, number>()
  for (const r of measured) if (r.stats!.leader) leaders.set(r.stats!.leader, (leaders.get(r.stats!.leader) ?? 0) + 1)
  const towns = [...leaders].sort((a, b) => b[1] - a[1]).map(([key, value]) => ({ key, value }))
  const shares = leaderShares(measured)
  const bands = [
    { key: 'bLow', value: measured.filter((r) => r.turnout < 60).length },
    { key: 'bMid', value: measured.filter((r) => r.turnout >= 60 && r.turnout < 75).length },
    { key: 'bHighBand', value: measured.filter((r) => r.turnout >= 75).length },
  ]
  // Ranked the way the board ranks, so the bars are that board's table in miniature
  const ranked = [...measured].sort((a, b) => (a.ranks?.[board === 'all' ? 'margins' : board] ?? Infinity) - (b.ranks?.[board === 'all' ? 'margins' : board] ?? Infinity))
  const col = (r: TownRow) => (board === 'closest' ? r.stats!.margin : board === 'high' || board === 'low' ? r.turnout : r.stats!.leaderShare)
  const bars = ranked.slice(0, 7).map((r) => ({ code: r.code, name: r.name, nameEn: r.nameEn, value: col(r), key: r.stats!.leader ?? '' }))
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="board-charts">
      {/* Donuts: towns per leader, the leaders' shares, and turnout split into bands */}
      <section className="card chart-card" aria-labelledby="chart-leaders">
        <h2 id="chart-leaders">{titles.boardsTowns}</h2>
        <SharePie items={towns} party={party} centre={String(towns.reduce((s, t) => s + t.value, 0))} unit={String} interactive />
      </section>
      <section className="card chart-card" aria-labelledby="chart-share">
        <h2 id="chart-share">{titles.boardsShare}</h2>
        <SharePie items={shares.slice(0, 4).map(([key, share]) => ({ key, value: share, share }))} party={party} centre={String(shares.length)} unit={(v) => `${v.toFixed(1)}%`} />
      </section>
      <section className="card chart-card" aria-labelledby="chart-turnout">
        <h2 id="chart-turnout">{titles.boardsTurnout}</h2>
        <SharePie
          items={bands}
          party={(k) => ({ key: k, name: titles[k as keyof Titles], color: BAND_COLOR[k], logo: undefined, slug: undefined })}
          centre={String(measured.length)}
          unit={String}
        />
      </section>
      {/* Graphs: the board's top seven, every leading party, and how often each leads by a whisker */}
      <section className="card chart-card" aria-labelledby="chart-top">
        <h2 id="chart-top">{titles[TITLES[board]]}</h2>
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
      <section className="card chart-card" aria-labelledby="chart-hold">
        <h2 id="chart-hold">{titles.boardsHold}</h2>
        <ul className="bar-chart">
          {shares.map(([key, share]) => (
            <li key={key}>
              <span className="bar-label">{party(key).name}</span>
              <span className="bar" style={{ inlineSize: `${share}%`, background: party(key).color }} />
              <span className="num">{share.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card chart-card" aria-labelledby="chart-narrow">
        <h2 id="chart-narrow">{titles.boardsNarrow}</h2>
        {/* One bar per leading party: the share of its towns it leads by ten points or less */}
        <ul className="bar-chart">
          {towns.map(({ key, value }) => ({ key, value, narrow: measured.filter((r) => r.stats!.leader === key && r.stats!.margin <= 10).length })).map((b) => (
            <li key={b.key}>
              <span className="bar-label">{party(b.key).name}</span>
              <span className="bar" style={{ inlineSize: `${(b.narrow / b.value) * 100}%`, background: party(b.key).color }} />
              <span className="num">{b.narrow} / {b.value}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
