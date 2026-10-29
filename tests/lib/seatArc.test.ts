import { describe, expect, it } from 'vitest'
import { refusalBetween, REFUSALS } from '../../src/lib/refusals.ts'
import { seatArc } from '../../src/lib/seatArc.ts'

describe('seatArc', () => {
  it('spreads 120 seats evenly across a semicircle, symmetric about the middle', () => {
    const pts = seatArc()
    expect(pts).toHaveLength(120)
    expect(pts[0].x).toBeCloseTo(100 - pts[119].x)
    expect(pts[0].y).toBeCloseTo(pts[119].y)
    for (const p of pts) expect(p.y).toBeGreaterThanOrEqual(0)
    // Halfway seat 60 is 61 from either end: the majority line
    expect(pts[59].x + pts[60].x).toBeCloseTo(100)
    expect(pts[60].x).toBeLessThan(50)
    expect(pts[59].x).toBeGreaterThan(50)
    for (let i = 1; i < pts.length; i++) expect(pts[i].x).toBeLessThan(pts[i - 1].x)
  })
})

describe('refusals', () => {
  it('matches a pair in either order', () => {
    const { a, b } = REFUSALS[0]
    expect(refusalBetween(b, a)).toBe(refusalBetween(a, b))
    expect(refusalBetween(a, b)?.reason.he).toBeTruthy()
  })

  it('has none for a pair not listed', () => {
    expect(refusalBetween('מחל', 'עם')).toBeUndefined()
  })

  it('every entry names its source in both languages', () => {
    for (const r of REFUSALS) {
      expect(r.a).not.toBe(r.b)
      expect(r.source).toBeTruthy()
      expect(r.reason.he).toBeTruthy()
      expect(r.reason.en).toBeTruthy()
    }
  })
})
