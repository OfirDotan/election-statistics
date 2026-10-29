import { describe, expect, it } from 'vitest'
import { chamber, rowSizes } from '../../src/lib/donut.ts'
import { SEATS } from '../../src/lib/mandates.ts'

describe('coalition chamber', () => {
  const seats = chamber()

  it('lays out exactly 120 seats in 5 symmetric rows', () => {
    expect(seats).toHaveLength(SEATS)
    const rows = rowSizes()
    expect(rows).toHaveLength(5)
    expect(rows.reduce((a, b) => a + b, 0)).toBe(SEATS)
    // outer rows hold at least as many as inner ones
    expect([...rows].sort((a, b) => a - b)).toEqual(rows)
    for (const [row, n] of rows.entries()) expect(seats.filter((s) => s.row === row)).toHaveLength(n)
    expect(seats.filter((s) => s.side === 'left')).toHaveLength(SEATS / 2)
    expect(seats.filter((s) => s.side === 'right')).toHaveLength(SEATS / 2)
  })

  it('never lets two seats overlap', () => {
    for (const a of seats)
      for (const b of seats)
        if (a !== b) expect(Math.hypot(a.cx - b.cx, a.cy - b.cy)).toBeGreaterThan((a.size + b.size) / 2)
  })

  it('sizes the chamber to any total, so a coalition can be drawn without the opposition', () => {
    for (const total of [61, 64, 72, 120]) {
      const small = chamber(total)
      expect(small).toHaveLength(total)
      // no floor row is ever empty, or the inner seat would sit alone in mid-air
      for (const [row, n] of rowSizes(total).entries()) expect(small.filter((s) => s.row === row)).toHaveLength(n)
      expect(Math.abs(small.filter((s) => s.side === 'left').length - small.filter((s) => s.side === 'right').length)).toBeLessThanOrEqual(1)
    }
  })

  it('has no empty row and no crossing seats for small chambers', () => {
    for (const total of [61, 62, 63, 64, 70]) {
      const small = chamber(total)
      expect(small).toHaveLength(total)
      expect(new Set(small.map((s) => s.row)).size).toBe(5)
      for (const a of small) for (const b of small) if (a !== b) expect(Math.hypot(a.cx - b.cx, a.cy - b.cy)).toBeGreaterThan((a.size + b.size) / 2)
      for (const s of small) {
        if (s.side === 'left') expect(s.cx + s.size / 2).toBeLessThan(-0.5)
        else expect(s.cx - s.size / 2).toBeGreaterThan(0.5)
      }
    }
  })

  it('keeps every seat on its own side of the middle line, above the floor', () => {
    for (const s of seats) {
      // the right edge of a left seat stays left of 0; the left edge of a right seat stays right of 0
      if (s.side === 'left') expect(s.cx + s.size / 2).toBeLessThan(-1)
      else expect(s.cx - s.size / 2).toBeGreaterThan(1)
      expect(s.cy).toBeLessThan(0)
    }
  })
})
