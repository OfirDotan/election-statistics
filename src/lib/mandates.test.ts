import { describe, expect, it } from 'vitest'
import { allocate } from './mandates.ts'

/**
 * Official CEC workings for the 25th Knesset (1 Nov 2022), from "נספח לזיכרון דברים":
 * https://www.gov.il/BlobFolder/generalpage/appendixtomemorandum/he/results_Appendix_to_the_memorandum.pdf
 * Valid votes 4,764,742; G = 36,227; published seats Likud 32, Yesh Atid 24, RZP 14, NU 12,
 * Shas 11, UTJ 7, Yisrael Beiteinu 6, Ra'am 5, Hadash-Ta'al 5, Labor 4.
 */
const K25_VOTES = {
  מחל: 1_115_336, // Likud
  יש_עתיד: 847_435, // Yesh Atid
  ט: 516_470, // Religious Zionist + Otzma
  כן: 432_482, // National Unity
  שס: 392_964, // Shas
  ג: 280_194, // UTJ
  ל: 213_687, // Yisrael Beiteinu
  עם: 194_047, // Ra'am
  ודם: 178_735, // Hadash-Ta'al
  העבודה: 175_992, // Labor
  מרצ: 150_793, // failed the threshold (below 154,855)
  // Other lists, none individually reaching the threshold; 365,607 in total
  בל_ד: 138_617,
  ...Object.fromEntries(Array.from({ length: 18 }, (_, i) => [`אחרות${i}`, Math.floor(226_990 / 18)])),
}
const K25_AGREEMENTS: [string, string][] = [
  ['מחל', 'ט'],
  ['כן', 'יש_עתיד'],
  ['העבודה', 'מרצ'], // void: Meretz failed
]

describe('allocate — 25th Knesset regression', () => {
  const result = allocate({ votes: K25_VOTES, apparentments: K25_AGREEMENTS })
  const seats = Object.fromEntries(result.seats.map((s) => [s.key, s.seats]))

  it('reproduces the published allocation', () => {
    expect(seats).toEqual({ מחל: 32, יש_עתיד: 24, ט: 14, כן: 12, שס: 11, ג: 7, ל: 6, עם: 5, ודם: 5, העבודה: 4 })
  })

  it('does not rescue a member that failed the threshold', () => {
    expect(seats['מרצ']).toBeUndefined()
    expect(result.effectiveApparentments).not.toContainEqual(['העבודה', 'מרצ'])
  })

  it('measures the threshold against all valid votes', () => {
    expect(result.thresholdVotes).toBeCloseTo(result.validVotes * 0.0325)
    // Meretz at 150,793 is below it; Labor at 175,992 is above
    expect(result.below.map((b) => b.key)).toEqual(expect.arrayContaining(['מרצ']))
    expect(result.seats.map((s) => s.key)).toContain('העבודה')
  })

  it('allocates exactly 120 seats', () => {
    expect(result.seats.reduce((s, x) => s + x.seats, 0)).toBe(120)
  })
})

describe('allocate — invariants', () => {
  it('gives one list everything when alone', () => {
    // Degenerate: the only list gets all 120 even though first-pass rounding gives 125
    const r = allocate({ votes: { א: 1000 }, apparentments: [] })
    expect(r.seats).toEqual([{ key: 'א', votes: 1000, seats: 120, inApparentment: false }])
  })

  it('is unaffected by apparentments that are not in the input', () => {
    const votes = { א: 500, ב: 300, ג: 200 }
    const single = allocate({ votes, apparentments: [] })
    expect(single.seats.reduce((s, x) => s + x.seats, 0)).toBe(120)
    expect(single.effectiveApparentments).toEqual([])
  })
})
