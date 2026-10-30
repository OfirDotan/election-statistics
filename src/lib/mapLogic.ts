import type { Town, TownVotes } from './mapData.ts'
import { share, townStats } from './stats.ts'

export interface Divergence {
  code: number
  party: string
  share: number
  national: number
  diff: number
}

const SEQUENTIAL_STOPS = ['#ECF2FE', '#BBD0F8', '#7AA5EC', '#3B78D8', '#1C4FA8']
const LIGHT_TEXT_MAX_LUMINANCE = 0.18

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/** Interpolates a hex ramp at t in [0,1] (t is clamped) */
export function sequential(t: number, stops = SEQUENTIAL_STOPS): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  const f = x - i
  const [a, b] = [rgb(stops[i]), rgb(stops[i + 1])]
  return '#' + a.map((c, k) => Math.round(c + (b[k] - c) * f).toString(16).padStart(2, '0')).join('')
}

/** Maps a value onto the ramp between min and max; a flat range returns the midpoint color */
export function scaleColor(value: number, min: number, max: number, stops?: string[]): string {
  return sequential(min === max ? 0.5 : (value - min) / (max - min), stops)
}

/** Party shares in percent for a vote block; empty when an apparentment town has no own breakdown */
export function sharesOf(votes: TownVotes | null | undefined): Record<string, number> {
  return votes ? Object.fromEntries(Object.entries(votes.byParty).map(([k, n]) => [k, share(n, votes.valid)])) : {}
}

/** National party shares of all valid votes done in towns */
export function nationalShares(towns: Town[]): Record<string, number> {
  const total: Record<string, number> = {}
  let valid = 0
  for (const t of towns) {
    if (!t.votes) continue
    valid += t.votes.valid
    for (const [k, n] of Object.entries(t.votes.byParty)) total[k] = (total[k] ?? 0) + n
  }
  return Object.fromEntries(Object.entries(total).map(([k, n]) => [k, share(n, valid)]))
}

/** For each town, the party whose share differs most (absolute points) from its national share */
export function divergences(towns: Town[], national: Record<string, number>, minValid = 50): Divergence[] {
  const out: Divergence[] = []
  for (const t of towns) {
    if (!t.votes || t.votes.valid < minValid) continue
    const shares = sharesOf(t.votes)
    const party = Object.keys(shares)
      .sort()
      .reduce<string | null>((best, k) => (best === null || Math.abs(shares[k] - (national[k] ?? 0)) > Math.abs(shares[best] - (national[best] ?? 0)) ? k : best), null)
    if (party === null) continue
    out.push({ code: t.code, party, share: shares[party], national: national[party] ?? 0, diff: shares[party] - (national[party] ?? 0) })
  }
  return out
}

/** Party with the most votes; null for a town whose ballots carry no breakdown */
export function topParty(t: Town): { party: string; share: number } | null {
  if (!t.votes || t.votes.valid <= 0) return null
  const s = townStats(t.votes)
  return s.leader ? { party: s.leader, share: s.leaderShare } : null
}

/** Text color for a party chip on its ballot color: whichever of black/white contrasts most */
export function readableOn(hex: string): '#000' | '#fff' {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > LIGHT_TEXT_MAX_LUMINANCE ? '#000' : '#fff'
}
