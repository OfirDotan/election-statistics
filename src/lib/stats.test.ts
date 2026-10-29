import { describe, expect, it } from 'vitest'
import { rankedShares, share, sweepTowns, townStats } from './stats.ts'

const vote = (eligible: number, voters: number, valid: number, byParty: Record<string, number>) => ({
  eligible,
  voters,
  valid,
  byParty,
})

describe('share', () => {
  it('returns 0 for an empty denominator', () => {
    expect(share(5, 0)).toBe(0)
  })
})

describe('townStats', () => {
  it('computes turnout from eligible voters and share from valid votes', () => {
    const s = townStats(vote(1000, 700, 680, { מחל: 400, דרך: 280 }))
    expect(s.turnout).toBeCloseTo(70)
    expect(s.validRate).toBeCloseTo((680 / 700) * 100)
    expect(s.leader).toBe('מחל')
    expect(s.margin).toBeCloseTo((120 / 680) * 100)
    expect(s.majority).toBe(true)
  })

  it('is not a majority at exactly 50%', () => {
    const s = townStats(vote(100, 50, 100, { א: 50, ב: 50 }))
    expect(s.leaderShare).toBe(50)
    expect(s.majority).toBe(false)
    expect(s.margin).toBe(0)
  })

  it('handles a town with no valid votes', () => {
    const s = townStats(vote(100, 40, 0, { א: 0 }))
    expect(s).toMatchObject({ leader: 'א', leaderShare: 0, majority: false })
  })

  it('ranks shares descending', () => {
    expect(rankedShares(vote(10, 10, 100, { א: 10, ב: 60, ג: 30 })).map(([k]) => k)).toEqual(['ב', 'ג', 'א'])
  })
})

describe('sweepTowns', () => {
  const t = (leaderShare: number) => ({ stats: { leaderShare } as never })
  it('includes towns exactly at the threshold', () => {
    expect(sweepTowns([t(90), t(89.99), t(100)], 90)).toHaveLength(2)
  })
})
