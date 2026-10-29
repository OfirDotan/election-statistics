import { SEATS } from './mandates.ts'

export interface CoalitionParty {
  key: string
  seats: number
  /** The largest single party is the presumptive PM and is flagged in the UI */
  isLargest: boolean
}

export interface Coalition {
  parties: CoalitionParty[]
  seats: number
  hasMajority: boolean
  /** Seats that must come from outside the coalition to reach 61 */
  seatsNeeded: number
  /** Coalition seats as a share of 120 */
  share: number
  /** Single outside party whose addition would cross the line, if any */
  missing: { key: string; seats: number } | null
}

export const MAJORITY = Math.floor(SEATS / 2) + 1

/**
 * Summarise a hand-picked coalition. `seatsByParty` is the allocation from allocate();
 * order is preserved so the UI can keep the user's pick order.
 */
export function summariseCoalition(seatsByParty: { key: string; seats: number }[], picked: string[]): Coalition {
  const chosen = new Set(picked)
  const largest = [...seatsByParty].sort((a, b) => b.seats - a.seats)[0]
  const parties = seatsByParty
    .filter((p) => chosen.has(p.key) && p.seats > 0)
    .map((p) => ({ ...p, isLargest: p.key === largest?.key }))
  const seats = parties.reduce((s, p) => s + p.seats, 0)
  const outside = seatsByParty.filter((p) => !chosen.has(p.key) && p.seats > 0)
  const fits = outside
    .filter((p) => seats + p.seats >= MAJORITY)
    .sort((a, b) => a.seats - b.seats || b.key.localeCompare(a.key))
  return {
    parties,
    seats,
    hasMajority: seats >= MAJORITY,
    seatsNeeded: Math.max(0, MAJORITY - seats),
    share: seats / SEATS,
    missing: seats >= MAJORITY || !fits[0] ? null : { key: fits[0].key, seats: fits[0].seats },
  }
}
