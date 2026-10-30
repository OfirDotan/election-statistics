import type { Divergence } from './mapLogic.ts'
import { townStats, type TownStats, type TownVoteInput } from './stats.ts'
import type { Kalpi, Town } from './types.ts'

export type BoardRow = TownRow & {
  /** Clears the minimum valid votes, so the turnout and divergence boards may list it */
  board: boolean
  /** The party the board ranks by: the diverging party on the divergence board, else the leader */
  party: string | null
  /** leaderShare, or the divergence gap when the town diverges */
  value: number
}

export interface TownRow {
  code: number
  name: string
  stats: TownStats | null
  source: 'kaplan' | 'govmap' | null
  valid: number
  turnout: number
}

/** Town voting figures; a town with no vote data gets empty ones. */
export function townVotes(town: Town): TownVoteInput {
  return town.votes ?? { eligible: 0, voters: 0, valid: 0, invalid: 0, byParty: {} }
}

/** National shares per party, percent of all valid votes in towns with a ballot breakdown. */
export function nationalShares(towns: Town[]): Map<string, number> {
  const sum = new Map<string, number>()
  let valid = 0
  for (const t of towns) {
    if (t.votes?.source !== 'kaplan') continue
    valid += t.votes.valid
    for (const [k, n] of Object.entries(t.votes.byParty)) sum.set(k, (sum.get(k) ?? 0) + n)
  }
  for (const [k, n] of sum) sum.set(k, valid ? (n / valid) * 100 : 0)
  return sum
}

export function townRows(towns: Town[], kalpi?: Record<string, Kalpi[]>): TownRow[] {
  const sum = (code: number, k: 'eligible' | 'voters') => (kalpi?.[code] ?? []).reduce((s, r) => s + r[k], 0)
  // Towns without own votes are measured by their kalpi totals (they have no byParty)
  return towns.map(({ code, name, votes }) =>
    votes
      ? { code, name, votes }
      : { code, name, votes: { eligible: sum(code, 'eligible'), voters: sum(code, 'voters'), valid: 0, invalid: 0, byParty: {}, source: 'govmap' as const } },
  ).map(({ code, name, votes }) => {
    const v: TownVoteInput = votes ?? { eligible: 0, voters: 0, valid: 0, byParty: {} }
    const known = v.voters > 0
    return {
      code,
      name,
      stats: known ? townStats(v) : null,
      source: votes?.source ?? null,
      valid: v.valid,
      turnout: known ? (v.voters / v.eligible) * 100 : 0,
    }
  })
}

export interface TownFilters {
  query: string
  leader: string
  minShare: number
  minTurnout: number
  majorityOnly: boolean
  pluralityOnly: boolean
}

export function filterStats(rows: TownRow[], f: TownFilters): TownRow[] {
  const q = f.query.trim()
  return rows.filter((r) => matches(r, q, f))
}

/** A diverging town fires on its outlier party; the share column stays its leader's (§3, like the rest of the boards) */
export function boardRows(rows: TownRow[], towns: Town[], diverge: Divergence[], minValid = 50): BoardRow[] {
  const outlier = new Map(diverge.map((d) => [d.code, d]))
  return rows.filter((r) => r.stats || outlier.has(r.code)).map((r) => {
    const d = outlier.get(r.code)
    return { ...r, name: towns.find((t) => t.code === r.code)?.name ?? r.name, board: r.valid >= minValid, party: d ? d.party : (r.stats?.leader ?? null), value: d ? d.diff : (r.stats?.leaderShare ?? 0) }
  })
}

function matches(r: TownRow, q: string, f: TownFilters): boolean {
  const s = r.stats
  // Unmeasured rows never match (the same result the bounded/s null rule gives)
  if (s === null) return false
  return (
    (q === '' || r.name.includes(q)) &&
    (f.leader === '' || s.leader === f.leader) &&
    (!f.majorityOnly || s.majority) &&
    (!f.pluralityOnly || (s.margin > 0 && s.leaderShare <= 50)) &&
    s.leaderShare >= f.minShare &&
    r.turnout >= f.minTurnout
  )
}

export type SortKey = 'name' | 'leader' | 'share' | 'margin' | 'turnout' | 'valid'

/** Stable sort on one column; rows without data sort last in either direction. */
export function sortRows(rows: TownRow[], key: SortKey, dir: 1 | -1, locale: string): TownRow[] {
  const val = (r: TownRow): string | number | null => {
    const s = r.stats
    switch (key) {
      case 'name': return r.name
      case 'leader': return s?.leader ?? null
      case 'share': return s?.leaderShare ?? null
      case 'margin': return s?.margin ?? null
      case 'turnout': return s ? r.turnout : null
      case 'valid': return r.source === 'kaplan' ? r.valid : null
    }
  }
  return [...rows].sort((a, b) => {
    const x = val(a)
    const y = val(b)
    if (x == null || y == null) return x == null ? (y == null ? a.code - b.code : 1) : -1
    const c = typeof x === 'string' ? String(x).localeCompare(String(y), locale) : x - (y as number)
    return c * dir || a.code - b.code
  })
}

