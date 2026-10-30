export interface TownVoteInput {
  eligible: number
  voters: number
  valid: number
  invalid?: number
  byParty: Record<string, number>
}

export interface TownStats {
  turnout: number
  validRate: number
  leader: string | null
  leaderShare: number
  topTwoShare: number
  margin: number
  majority: boolean
}

/** The results file's `r_אחר`, which scripts/parse.ts keeps under this key */
export const OTHER = 'אחר'

/** Every ballot key a town has in data built before the unlisted votes were kept apart */
const NAMED = new Set(['מחל', 'דרך', 'רק', 'אמת', 'ודם', 'ל', 'ב', 'שס', 'ג', 'ט', 'עם', 'די', 'ך'])

/** The key a dataset keeps the unlisted votes under: `אחר`, or, in data built before it was kept, the key no ballot has */
export function otherKey(keys: Set<string>): string {
  return keys.has(OTHER) ? OTHER : ([...keys].find((k) => !NAMED.has(k)) ?? OTHER)
}

/**
 * Maximum info: the lists that won no vote in a town are spread over its `other` key by their national
 * shares, since the results file gives each town only that sum. `others` lists them.
 * A list too small for one vote in the town is left out; rounding keeps the town's total.
 * shortcut: shares are national, upgrade when the source publishes those counts per town
 */
export function splitOther(v: TownVoteInput, other: string, others: Iterable<[string, number]>): TownVoteInput {
  const n = v.byParty[other]
  if (!n) return v
  const lists = [...others].filter(([k]) => !(k in v.byParty))
  const total = lists.reduce((s, [, pct]) => s + pct, 0)
  const rest = Object.entries(v.byParty).filter(([k]) => k !== other)
  let left = n
  const share = lists
    .map(([k, pct]): [string, number] => (total > 0 ? [k, Math.round((n * pct) / total)] : [k, 0]))
    .filter(([, c]) => c > 0)
    .map(([k, c]): [string, number] => ((left -= c), [k, c]))
  if (share.length && left) share[0][1] += left
  return { ...v, byParty: Object.fromEntries([...rest, ...share]) }
}

/** Share in percent; 0 when the denominator is empty */
export function share(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0
}

/** Party shares of valid votes, descending */
export function rankedShares(v: TownVoteInput): [string, number][] {
  return Object.entries(v.byParty)
    .map(([k, n]) => [k, share(n, v.valid)] as [string, number])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/** Per-town summary. Ties for first keep the first key in input order (numeric-keyed letters sort stably). */
export function townStats(v: TownVoteInput): TownStats {
  const ranked = rankedShares(v)
  const leader = ranked[0]?.[0] ?? null
  const leaderShare = ranked[0]?.[1] ?? 0
  const second = ranked[1]?.[1] ?? 0
  return {
    turnout: share(v.voters, v.eligible),
    validRate: share(v.valid, v.voters),
    leader,
    leaderShare,
    topTwoShare: leaderShare + second,
    margin: leaderShare - second,
    majority: leaderShare > 50,
  }
}

/** Towns where one party's share reaches the sweep threshold */
export function sweepTowns<T extends { stats: TownStats }>(towns: T[], threshold = 90): T[] {
  return towns.filter((t) => t.stats.leaderShare >= threshold)
}
