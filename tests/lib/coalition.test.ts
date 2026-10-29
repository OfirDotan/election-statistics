import { describe, expect, it } from 'vitest'
import { MAJORITY, summariseCoalition } from '../../src/lib/coalition.ts'

const seats = [
  { key: 'מחל', seats: 30 },
  { key: 'דרך', seats: 20 },
  { key: 'רק', seats: 12 },
  { key: 'שס', seats: 8 },
  { key: 'ג', seats: 7 },
]

describe('summariseCoalition', () => {
  it('flags majority and computes the gap', () => {
    const c = summariseCoalition(seats, ['מחל', 'דרך', 'רק'])
    expect(c.seats).toBe(62)
    expect(c.hasMajority).toBe(true)
    expect(c.seatsNeeded).toBe(0)
    expect(c.missing).toBeNull()
    expect(c.parties.find((p) => p.key === 'מחל')?.isLargest).toBe(true)
  })

  it('names the smallest single addition that crosses the line', () => {
    const c = summariseCoalition(seats, ['מחל', 'דרך'])
    expect(c.seats).toBe(50)
    expect(c.hasMajority).toBe(false)
    expect(c.seatsNeeded).toBe(MAJORITY - 50)
    expect(c.missing).toEqual({ key: 'רק', seats: 12 })
  })

  it('ignores parties with zero seats', () => {
    const c = summariseCoalition(seats, ['כן'])
    expect(c.parties).toHaveLength(0)
    expect(c.seats).toBe(0)
  })
})
