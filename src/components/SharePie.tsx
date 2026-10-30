import { Link } from 'react-router-dom'
import { partyUrl } from '../lib/links.ts'
import type { PartyLookup } from '../lib/useData.ts'

export interface ShareSlice {
  key: string
  value: number
}

const point = (a: number) => `${Math.cos(a).toFixed(4)} ${Math.sin(a).toFixed(4)}`

/** One clockwise slice path per value, from the top; a full circle comes back as two arcs */
function slices(values: number[]): string[] {
  const total = values.reduce((s, n) => s + n, 0)
  const angles = values.map((_, i) => -Math.PI / 2 + (values.slice(0, i).reduce((s, n) => s + n, 0) / total) * Math.PI * 2)
  return values.map((n, i) => {
    const sweep = (n / total) * Math.PI * 2
    const next = angles[i] + sweep
    const arc = `A 1 1 0 ${sweep > Math.PI ? 1 : 0} 1`
    return sweep >= Math.PI * 2 ? `M ${point(angles[i])} ${arc} ${point(Math.PI)} ${arc} ${point(-Math.PI / 2)} Z` : `M 0 0 L ${point(angles[i])} ${arc} ${point(next)} Z`
  })
}

/**
 * A donut of shares with its legend; `interactive` makes the names links, for the leaderboards.
 * SeatsPie is its seat-shaped sibling with its own focus styling.
 */
export function SharePie({
  slices: data,
  party,
  centre,
  unit,
  interactive = false,
}: {
  slices: ShareSlice[]
  party: PartyLookup
  /** The number in the hole, already formatted */
  centre: string
  /** Reads a value into its legend label, e.g. "12 towns" */
  unit: (v: number) => string
  interactive?: boolean
}) {
  const paths = slices(data.map((p) => p.value))
  const label = (p: ShareSlice) => `${party(p.key).name}: ${unit(p.value)}`
  return (
    <div className="pie-wrap">
      <svg className="pie" viewBox="-1.1 -1.1 2.2 2.2" role="img" aria-label={data.map(label).join(', ')}>
        {data.map((p, i) => (
          <path key={p.key} d={paths[i]} fill={party(p.key).color ?? 'var(--text-3)'} stroke="var(--surface)" strokeWidth={0.015}>
            <title>{label(p)}</title>
          </path>
        ))}
        <circle r="0.55" fill="var(--surface)" />
        <text y="0.08" textAnchor="middle" className="pie-num">{centre}</text>
      </svg>
      <ul className="pie-legend">
        {data.map((p) => (
          <li key={p.key}>
            <span className="dot" style={{ background: party(p.key).color }} aria-hidden="true" />
            {interactive ? <Link to={partyUrl(p.key)}>{party(p.key).name}</Link> : <span>{party(p.key).name}</span>}
            <span className="num">{unit(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
