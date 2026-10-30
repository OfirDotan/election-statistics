import type { TownRow } from '../lib/derive.ts'
import type { PartyLookup } from '../lib/useData.ts'
import { SharePie, type ShareItem } from './SharePie.tsx'

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

/** The legend's next slices rolled into one, so a few small parties share a single grey slice instead of a hairline each */
const REST = 'other'
function merge(items: ShareItem[], keep: number): ShareItem[] {
  if (items.length <= keep + 1) return items
  return [...items.slice(0, keep), { key: REST, value: items.slice(keep).reduce((s, p) => s + p.value, 0) }]
}

/** Turnout bands, cut at the board's 50-vote floor and at 60% and 75%: most Israeli towns turn out above half */
const TURNOUT_BANDS = [
  { key: 'bUnder50', color: '#c62828', test: (r: TownRow) => r.turnout < 50 },
  { key: 'b50to60', color: '#e0a100', test: (r: TownRow) => r.turnout >= 50 && r.turnout < 60 },
  { key: 'b60to75', color: '#3d7fd6', test: (r: TownRow) => r.turnout >= 60 && r.turnout < 75 },
  { key: 'bOver75', color: '#1a7f37', test: (r: TownRow) => r.turnout >= 75 },
] as const

type Titles = Record<'boardsTowns' | 'boardsTurnout' | 'bUnder50' | 'b50to60' | 'b60to75' | 'bOver75' | 'boardsLead' | 'boardsOther', string>

/**
 * The three donuts above the leaderboards search: towns by leader, average lead share, turnout by band, all over
 * the rows the selected board ranks, so switching board changes the charts as well as the table.
 */
export function BoardCharts({ rows, party, titles }: { rows: TownRow[]; party: PartyLookup; titles: Titles }) {
  const measured = rows.filter((r) => r.stats)
  const leaders = new Map<string, number>()
  for (const r of measured) if (r.stats!.leader) leaders.set(r.stats!.leader, (leaders.get(r.stats!.leader) ?? 0) + 1)
  const towns = [...leaders].sort((a, b) => b[1] - a[1]).map(([key, value]) => ({ key, value }))
  const shares = leaderShares(measured)
  // Every party past the fifth is one grey "other" slice: a hairline each is unreadable
  const pieParty: PartyLookup = (k) => (k === REST ? { key: k, name: titles.boardsOther, color: 'var(--text-3)', logo: undefined, slug: undefined } : party(k))
  const bands = TURNOUT_BANDS.map((b) => ({ key: b.key, value: measured.filter(b.test).length }))
  const bandParty: PartyLookup = (k) => {
    const b = TURNOUT_BANDS.find((x) => x.key === k)!
    return { key: k, name: titles[k as keyof Titles], color: b.color, logo: undefined, slug: undefined }
  }
  return (
    <div className="board-charts">
      {/* Towns per leader, the leaders' average shares, and where turnout sits */}
      <section className="card chart-card" aria-labelledby="chart-leaders">
        <h2 id="chart-leaders">{titles.boardsTowns}</h2>
        <SharePie items={merge(towns, 5)} party={pieParty} centre={String(towns.reduce((s, t) => s + t.value, 0))} unit={String} interactive />
      </section>
      <section className="card chart-card" aria-labelledby="chart-share">
        <h2 id="chart-share">{titles.boardsLead}</h2>
        <SharePie items={shares.slice(0, 4).map(([key, share]) => ({ key, value: share, share }))} party={party} centre={String(shares.length)} unit={(v) => `${v.toFixed(1)}%`} />
      </section>
      <section className="card chart-card" aria-labelledby="chart-turnout">
        <h2 id="chart-turnout">{titles.boardsTurnout}</h2>
        <SharePie items={bands} party={bandParty} centre={String(measured.length)} unit={String} />
      </section>
    </div>
  )
}
