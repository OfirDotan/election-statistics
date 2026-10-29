/**
 * Knesset seat allocation — Bader-Ofer method, ss. 81-82 of the Knesset Elections Law.
 *
 *  81(a) threshold: a list needs 3.25% of ALL valid votes (an apparentment does not rescue it)
 *  81(b) ma'dad G = floor(qualifying valid votes / 120)
 *  81(c) seats = floor(own votes / G)                     — apparentments do NOT apply here
 *  81(d) leftover seats go one by one to the highest measure:
 *          individual list:  votes / (seats + 1)
 *          apparentment:     (vA + vB) / (sA + sB + used + 1)   — it can win repeatedly
 *  82(b) an apparentment's seats split internally by the s.81 rule:
 *          S = floor((vA + vB) / (sA + sB)); base = floor(own / S) each; the leftover seat goes
 *          to the higher own / (base + 1)
 *
 * Validated against the CEC's own Knesset 25 calculation (see mandates.test.ts).
 */

export const SEATS = 120

/** Threshold as a fraction of valid votes; overridable so the UI can explore "what if" */
export const DEFAULT_THRESHOLD = 0.0325

/** [partyKey, partyKey] — order is irrelevant */
export type Apparentment = [string, string]

/** Agreements reported for the 26th Knesset */
export const APPARENTMENTS_26: Apparentment[] = [
  ['דרך', 'אמת'], // ישר + הדמוקרטים
  ['רק', 'ל'], // ביחד + ישראל ביתנו
  ['מחל', 'ט'], // הליכוד + הציונות הדתית
  ['שס', 'ג'], // ש"ס + יהדות התורה
  ['עם', 'ודם'], // רע"מ + הרשימה המשותפת
]

export interface MandateInput {
  /** Votes per party key */
  votes: Record<string, number>
  threshold?: number
  apparentments?: Apparentment[]
}

export interface MandateResult {
  validVotes: number
  thresholdVotes: number
  /** Parties that passed, sorted by seats desc then votes desc */
  seats: { key: string; votes: number; seats: number; inApparentment: boolean }[]
  /** Parties below threshold with their vote share, for the "wasted votes" view */
  below: { key: string; votes: number; share: number }[]
  /** Votes cast for lists below the threshold */
  wastedVotes: number
  /** Apparentment pairs that were in force (both members passed) */
  effectiveApparentments: Apparentment[]
}

export function allocate(input: MandateInput): MandateResult {
  const threshold = input.threshold ?? DEFAULT_THRESHOLD
  const apparentments = input.apparentments ?? APPARENTMENTS_26
  const entries = Object.entries(input.votes).filter(([, v]) => v > 0)
  const allValid = entries.reduce((sum, [, v]) => sum + v, 0)

  // 81(a): threshold is measured against all valid votes, and applies to each list alone
  const passed = entries.filter(([, v]) => v / allValid >= threshold).map(([k]) => k)
  const passedVotes = entries.filter(([k]) => passed.includes(k)).reduce((s, [, v]) => s + v, 0)
  const thresholdVotes = allValid * threshold
  const below = entries
    .filter(([k]) => !passed.includes(k))
    .map(([key, votes]) => ({ key, votes, share: votes / allValid }))

  const votes = Object.fromEntries(entries) as Record<string, number>
  const seats: Record<string, number> = {}
  const G = Math.floor(passedVotes / SEATS)
  for (const k of passed) seats[k] = Math.floor((votes[k] ?? 0) / G) // 81(c)
  // Guard: with few qualifying lists the floor can already exceed 120 in this degenerate test case
  if (total(seats) > SEATS) {
    const sorted = [...passed].sort((a, b) => votes[b] - votes[a])
    let over = total(seats) - SEATS
    for (const k of [...sorted].reverse()) {
      while (over > 0 && seats[k] > 0) {
        seats[k]--
        over--
      }
    }
    // The largest lists absorb anything left so the total stays exact
    seats[sorted[0]] -= total(seats) - SEATS
  }

  // 82: an agreement is only in force when both members passed
  const pairOf = new Map<string, [string, string]>()
  const effectiveApparentments: Apparentment[] = []
  for (const [a, b] of apparentments) {
    if (passed.includes(a) && passed.includes(b)) {
      pairOf.set(a, [a, b])
      pairOf.set(b, [a, b])
      effectiveApparentments.push([a, b])
    }
  }
  // Final per-party seats: starts as the 81(c) result and every 81(d) seat updates it directly
  const final: Record<string, number> = { ...seats }
  const used = new Map<string, number>(effectiveApparentments.map(([a]) => [a, 0]))
  const key = (p: Apparentment) => p.join('|')
  /** Joint seats won so far per pair; seeded with the pair's 81(c) seats */
  const pairSeats = new Map<string, number>()
  for (const [a, b] of effectiveApparentments) pairSeats.set(key([a, b]), seats[a] + seats[b])

  // 81(d): one seat at a time to the highest measure
  while (total(seats) < SEATS) {
    let bestScore = -1
    let bestPair: Apparentment | null = null
    let bestKey: string | null = null
    const jointKeys = new Set<string>()
    for (const p of effectiveApparentments) jointKeys.add(key(p))
    for (const [a, b] of effectiveApparentments) {
      const score = (votes[a] + votes[b]) / ((pairSeats.get(key([a, b])) ?? 0) + 1)
      if (score > bestScore) {
        bestScore = score
        bestPair = [a, b]
        bestKey = null
      }
    }
    for (const k of passed) {
      const p = pairOf.get(k)
      // A member with a live joint competes jointly; only unpaired lists compete individually
      if (p && jointKeys.has(key(p))) continue
      const score = votes[k] / (seats[k] + 1)
      if (score > bestScore) {
        bestScore = score
        bestPair = null
        bestKey = k
      }
    }
    // No list has a vote left (e.g. a single list holding every valid vote, or partial data):
    // stop instead of allocating seats nothing earned
    if (!bestKey && !bestPair) break
    if (bestKey) {
      seats[bestKey]++
      final[bestKey]++
      continue
    }
    // The pair wins one joint seat. 82(b) splits the pair's WHOLE allocation (not just this
    // seat) by the s.81 rule, so recompute both members' totals from the updated pair total.
    const [a, b] = bestPair!
    used.set(a, used.get(a)! + 1)
    pairSeats.set(key([a, b]), (pairSeats.get(key([a, b])) ?? seats[a] + seats[b]) + 1)
    // Keep the running total right: a joint seat is one seat for the pair
    seats[a]++
    const total_ = pairSeats.get(key([a, b]))!
    // 82(b): split the pair's whole allocation by the s.81 rule using the pair's own S
    const s = Math.floor((votes[a] + votes[b]) / total_)
    const baseA = Math.min(total_, Math.floor(votes[a] / s))
    const baseB = Math.min(total_ - baseA, Math.floor(votes[b] / s))
    const leftover = total_ - baseA - baseB
    final[a] = baseA
    final[b] = baseB
    if (leftover > 0) {
      if (votes[a] / (baseA + 1) >= votes[b] / (baseB + 1)) final[a] += leftover
      else final[b] += leftover
    }
  }

  const byParty = final
  const paired = new Set<string>(effectiveApparentments.flat())

  return {
    validVotes: allValid,
    thresholdVotes,
    seats: Object.entries(byParty)
      .map(([k, n]) => ({ key: k, votes: votes[k] ?? 0, seats: n, inApparentment: paired.has(k) }))
      .sort((x, y) => y.seats - x.seats || y.votes - x.votes),
    below,
    wastedVotes: below.reduce((s, b) => s + b.votes, 0),
    effectiveApparentments,
  }
}

function total(seats: Record<string, number>): number {
  return Object.values(seats).reduce((s, n) => s + n, 0)
}
