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
