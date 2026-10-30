import { useState } from 'react'
import { Link } from 'react-router-dom'
import { partyUrl } from '../lib/links.ts'
import { PartyLogo } from './PartyLogo.tsx'
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
 * A donut of shares with its legend; `interactive` links the names to their party pages.
 * SeatsPie is its seat-shaped sibling with its own focus styling.
 */
export function SharePie({ slices: data, party, centre, unit, interactive = false }: { slices: ShareSlice[]; party: PartyLookup; centre: string; unit: (v: number) => string; interactive?: boolean }) {
  // The slice under the pointer or keys, or the one whose legend row is hovered: both light it up
  const [active, setActive] = useState<string | null>(null)
  const paths = slices(data.map((p) => p.value))
  const label = (p: ShareSlice) => `${party(p.key).name}: ${unit(p.value)}`
  const hot = (key: string) => (active === null || active === key ? undefined : 'is-dim')
  return (
    <div className="pie-wrap">
      <svg className="pie" viewBox="-1.1 -1.1 2.2 2.2" role="img" aria-label={data.map(label).join(', ')}>
        {data.map((p, i) => (
          <path
            key={p.key}
            className={hot(p.key)}
            d={paths[i]}
            fill={`color-mix(in srgb, ${party(p.key).color ?? 'var(--text-3)'}, white ${active === p.key ? 28 : 0}%)`}
            stroke="var(--surface)"
            strokeWidth={0.015}
            tabIndex={0}
            onMouseEnter={() => setActive(p.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(p.key)}
            onBlur={() => setActive(null)}
          >
            <title>{label(p)}</title>
          </path>
        ))}
        <circle r="0.55" fill="var(--surface)" className="pie-hole" />
        <text y="0.08" textAnchor="middle" className="pie-num">{centre}</text>
      </svg>
      <ul className="pie-legend">
        {data.map((p) => (
          <li key={p.key} className={hot(p.key)} onMouseEnter={() => setActive(p.key)} onMouseLeave={() => setActive(null)}>
            <PartyLogo logo={party(p.key).logo} />
            {interactive ? <Link to={partyUrl(p.key)}>{party(p.key).name}</Link> : <span>{party(p.key).name}</span>}
            <span className="num">{unit(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
