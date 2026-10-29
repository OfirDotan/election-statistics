import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PartyLogo } from './PartyLogo.tsx'
import { partyUrl } from '../lib/links.ts'

export interface PieSlice {
  key: string
  name: string
  color: string
  seats: number
  logo?: string
}

const TAU = Math.PI * 2
const at = (a: number) => `${Math.cos(a).toFixed(4)} ${Math.sin(a).toFixed(4)}`

/** Unit-circle slice paths, each starting at 12 o'clock and running clockwise; a full circle comes back as a ring of two arcs. */
function slicePaths(seats: number[]): string[] {
  const total = seats.reduce((s, n) => s + n, 0)
  let angle = -Math.PI / 2
  return seats.map((n) => {
    const sweep = (n / total) * TAU
    const from = at(angle)
    angle += sweep
    const arc = `A 1 1 0 ${sweep > Math.PI ? 1 : 0} 1`
    return sweep >= TAU ? `M ${from} ${arc} ${at(Math.PI)} ${arc} ${at(-Math.PI / 2)} Z` : `M 0 0 L ${from} ${arc} ${at(angle)} Z`
  })
}

/** Seats as a donut plus a legend; each slice starts at 12 o'clock and runs clockwise. */
export function SeatsPie({ slices, seatWord }: { slices: PieSlice[]; seatWord: string }) {
  const total = slices.reduce((s, p) => s + p.seats, 0)
  const paths = slicePaths(slices.map((p) => p.seats))
  // Hover or keyboard focus on a slice names it; the legend still carries every name and count
  const [active, setActive] = useState<number | null>(null)
  const on = active === null ? null : slices[active]
  const label = (p: PieSlice) => `${p.name}: ${p.seats} ${seatWord}`
  return (
    <div className="pie-wrap">
      {on && (
        <div className="pie-tip" role="status">
          <PartyLogo logo={on.logo} />
          <span>{on.name}</span>
          <span className="num">{on.seats}</span>
        </div>
      )}
      <svg className="pie" viewBox="-1.1 -1.1 2.2 2.2" role="img" aria-label={slices.map((p) => `${p.name}: ${p.seats}`).join(', ')}>
        {slices.map((p, i) => (
          <path
            key={p.key}
            d={paths[i]}
            fill={p.color}
            stroke="var(--surface)"
            strokeWidth={0.015}
            tabIndex={0}
            role="img"
            aria-label={label(p)}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <title>{label(p)}</title>
          </path>
        ))}
        <circle r="0.55" fill="var(--surface)" />
        <text y="0.08" textAnchor="middle" className="pie-num">{total}</text>
      </svg>
      <ul className="pie-legend">
        {slices.map((p) => (
          <li key={p.key}>
            <PartyLogo logo={p.logo} />
            <Link to={partyUrl(p)}>{p.name}</Link>
            <span className="num">{p.seats}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
