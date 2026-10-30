import type { Divergence } from './mapLogic.ts'
import { townStats, type TownStats, type TownVoteInput } from './stats.ts'
import type { Kalpi, Town } from './types.ts'

export type Board = 'all' | 'margins' | 'high' | 'low' | 'closest' | 'divergence'

/** Per-town ranks, 1 = top of that board; `null` where the board doesn't rank the town (no ballots, or under its floor) */
export type BoardRanks = Record<Exclude<Board, 'all'>, number | null>

export interface TownRow {
  code: number
  name: string
  /** Searched as well as the name, so either language finds the town */
  nameEn?: string
  stats: TownStats | null
  source: 'kaplan' | 'govmap' | null
  valid: number
  turnout: number
  /** Present on rows from boardRows */
  ranks?: BoardRanks
  /** The town's share of valid votes over its leader's national share; negative where the leader trails nationally */
  over?: number
  /** Every party's name the town voted for, for the maximum-info search */
  all?: Record<string, string[]>
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
  return towns.map(({ code, name, nameEn, votes }) =>
    votes
      ? { code, name, nameEn, votes }
      : { code, name, nameEn, votes: { eligible: sum(code, 'eligible'), voters: sum(code, 'voters'), valid: 0, invalid: 0, byParty: {}, source: 'govmap' as const } },
  ).map(({ code, name, nameEn, votes }) => {
    const v: TownVoteInput = votes ?? { eligible: 0, voters: 0, valid: 0, byParty: {} }
    const known = v.voters > 0
    return {
      code,
      name,
      nameEn,
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
  /** Maximum info: every party's town figure counts, not only the leader's */
  infoOnly: boolean
}

/** Each town's ballot breakdown as party name lists, so the search can read past the leader under maximum info */
export function allBallots(towns: Town[], nameOf: (key: string) => string): Map<number, Record<string, string[]>> {
  const out = new Map<number, Record<string, string[]>>()
  for (const t of towns) {
    const byParty = t.votes?.byParty ?? {}
    if (Object.keys(byParty).length) out.set(t.code, Object.fromEntries(Object.keys(byParty).map((k) => [k, [nameOf(k).toLowerCase()]])))
  }
  return out
}

/** A town's name in the page's language */
export const townName = (name: string, nameEn: string | undefined, lang: string) => (lang === 'en' ? (nameEn ?? name) : name)

export function filterStats(rows: TownRow[], f: TownFilters): TownRow[] {
  const q = f.query.trim()
  return rows.filter((r) => matches(r, q, f))
}

/** The names in one searched form: lower case, and ' and - read as spaces, so aylut finds 'Aylut */
const searchable = (...names: ((string | undefined) | Record<string, string[]>)[]) =>
  names
    .flatMap((n) => (typeof n === 'string' ? [n] : n ? Object.entries(n).flat() : []))
    .join(' ')
    .toLowerCase().replace(/['’-]+/g, ' ').replace(/\s+/g, ' ').trim()

function matches(r: TownRow, q: string, f: TownFilters): boolean {
  const s = r.stats
  // Unmeasured rows never match (the same result the bounded/s null rule gives)
  if (s === null) return false
  return (
    (q === '' ||
      (f.infoOnly && r.all ? searchable(r.name, r.nameEn, r.all) : searchable(r.name, r.nameEn)).includes(searchable(q))) &&
    (f.leader === '' || (f.infoOnly ? Object.hasOwn(r.all ?? {}, f.leader) : s.leader === f.leader)) &&
    (!f.majorityOnly || s.majority) &&
    (!f.pluralityOnly || (s.margin > 0 && s.leaderShare <= 50)) &&
    s.leaderShare >= f.minShare &&
    r.turnout >= f.minTurnout
  )
}

export type SortKey = 'name' | 'leader' | 'share' | 'margin' | 'turnout' | 'valid'

/** The column a board's ranks follow: same ranking, different column */
export const RANK_COLUMN: Record<Exclude<Board, 'all'>, SortKey> = {
  margins: 'share',
  divergence: 'share',
  closest: 'margin',
  high: 'turnout',
  low: 'turnout',
}

/** Turnout and divergence need real vote counts before shares mean anything */
export const MIN_VALID = 50

/** What each board ranks by, and whether big is best */
const TOP: Record<Exclude<Board, 'all'>, { top: (r: TownRow) => number | null; desc: boolean }> = {
  margins: { top: (r) => r.stats?.leaderShare ?? null, desc: true },
  // Reads the gap, not the share: boardRows rewrites a diverging town's share to that same gap before ranking
  divergence: { top: (r) => r.stats?.leaderShare ?? null, desc: true },
  closest: { top: (r) => r.stats?.margin ?? null, desc: false },
  high: { top: (r) => r.turnout || null, desc: true },
  low: { top: (r) => r.turnout || null, desc: false },
}

/** Names ballot-less towns by their kalpi record and gives every row a rank for each board */
export function boardRows(rows: TownRow[], towns: Town[], national: Map<string, number>, diverge: Divergence[]): TownRow[] {
  const gap = new Map(diverge.map((d) => [d.code, d.diff]))
  const base = rows.map((r) => {
    const s = r.stats
    return {
      ...r,
      name: towns.find((t) => t.code === r.code)?.name ?? r.name,
      nameEn: r.nameEn,
      over: s ? s.leaderShare - (national.get(s.leader ?? '') ?? 0) : undefined,
      // A diverging town's share column reads its gap from national: that is what the divergence board ranks
      stats: s && gap.has(r.code) ? { ...s, leaderShare: gap.get(r.code)! } : s,
    }
  })
  const ranks: Record<number, Record<string, number>> = {}
  for (const b of Object.keys(TOP) as Exclude<Board, 'all'>[]) {
    const { top, desc } = TOP[b]
    base
      .filter((r) => top(r) !== null)
      .sort((a, c) => Number(desc) * ((top(a) ?? 0) - (top(c) ?? 0)) || a.code - c.code)
      .forEach((r, i) => (ranks[r.code] ??= {})[b] = i + 1)
  }
  return base.map((r) => ({ ...r, ranks: Object.fromEntries(Object.keys(TOP).map((b) => [b, ranks[r.code]?.[b] ?? null])) as unknown as BoardRanks }))
}

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

