import { describe, expect, it } from 'vitest'
import type { Town, TownVotes } from '../../src/lib/mapData.ts'
import { divergences, nationalShares, readableOn, scaleColor, sequential } from '../../src/lib/mapLogic.ts'

const votes = (byParty: Record<string, number>, valid = 100): TownVotes => ({
  eligible: 200,
  voters: valid,
  valid,
  invalid: 0,
  byParty,
  source: 'kaplan',
})
const town = (code: number, byParty: Record<string, number>, valid = 100): Town => ({
  code,
  name: `t${code}`,
  votes: votes(byParty, valid),
})

describe('sequential / scaleColor', () => {
  it('returns the ramp ends at t=0 and t=1', () => {
    expect(sequential(0)).toBe('#ecf2fe')
    expect(sequential(1)).toBe('#1c4fa8')
  })
  it('clamps out-of-range and non-finite input', () => {
    expect(scaleColor(-5, 0, 100)).toBe('#ecf2fe')
    expect(scaleColor(500, 0, 100)).toBe('#1c4fa8')
    expect(scaleColor(Number.NaN, 0, 100)).toBe(sequential(0))
  })
  it('uses the midpoint for a flat range', () => {
    expect(scaleColor(42, 42, 42)).toBe(sequential(0.5))
  })
})

describe('readableOn', () => {
  it('chooses white on dark colors and black on light ones', () => {
    expect(readableOn('#1C5BAD')).toBe('#fff')
    expect(readableOn('#FFEDB9')).toBe('#000')
  })
})

describe('nationalShares', () => {
  it('weights by valid votes and skips towns without votes', () => {
    expect(nationalShares([town(1, { א: 50, ב: 50 }), town(2, { א: 200, ב: 0 }, 300), { code: 3, name: 'x', votes: null }])).toEqual({
      א: 62.5,
      ב: 12.5,
    })
  })
})

describe('divergences', () => {
  const national: Record<string, number> = { א: 30, ב: 70 }
  it('picks each party that differs most from its national share', () => {
    const [a, b] = divergences([town(1, { א: 90, ב: 10 }), town(2, { א: 5, ב: 95 })], national, 0)
    expect(a.party).toBe('א')
    expect(a.diff).toBeCloseTo(60)
    expect(b.party).toBe('ב')
    expect(b.diff).toBeCloseTo(25)
  })
  it('excludes towns below the valid-vote floor', () => {
    expect(divergences([town(1, { א: 100 }, 49)], national)).toEqual([])
  })
  it('keeps the sign of the difference', () => {
    const [d] = divergences([town(1, { א: 25, ב: 75 })], national, 0)
    expect(d.diff).toBeCloseTo(5)
  })
})
