import { describe, expect, test } from 'vitest'
import type { Town } from '../../src/lib/mapData.ts'
import { divergences, nationalShares, readableOn, scaleColor } from '../../src/lib/mapLogic.ts'

const A = String.fromCharCode(0x05d0)
const B = String.fromCharCode(0x05d1)
const town = (code: number, a: number, b: number): Town =>
  ({ code, name: String(code), votes: { eligible: 100, voters: 50, valid: a + b, byParty: { [A]: a, [B]: b } } }) as unknown as Town

describe('scaleColor', () => {
  test('clamps the ends and handles a flat range', () => {
    const [lo, hi] = [scaleColor(0, 0, 10), scaleColor(10, 0, 10)]
    expect(lo).not.toBe(hi)
    expect(scaleColor(-5, 0, 10)).toBe(lo)
    expect(scaleColor(15, 0, 10)).toBe(hi)
    expect(scaleColor(0.5, 3, 3)).not.toBe(lo)
  })
})

describe('readableOn', () => {
  test('dark text on light ballot colors, white on dark ones', () => {
    expect(readableOn('#f5f5f5')).toBe('#000')
    expect(readableOn('#1f3a93')).toBe('#fff')
  })
})

describe('divergences', () => {
  test('picks the party farthest from national and skips small towns', () => {
    const national = nationalShares([town(1, 90, 10), town(2, 5, 95)])
    const [x, y] = divergences([town(3, 925, 25), town(4, 0, 400), town(5, 10, 0)], national)
    expect([x.code, y.code]).toStrictEqual([3, 4])
    // Both towns tie their parties for distance from national, so the sorted-key tie-break decides:
    // 'ב' (U+05D1) sorts before 'א' (U+05D0)
    expect([x.party, y.party]).toStrictEqual([B, A])
    expect([Math.sign(x.diff), Math.sign(y.diff)]).toStrictEqual([-1, -1])
  })
})
