import { describe, expect, it } from 'vitest'
import { filterTowns, nationalShares, sortRows, townRows, type TownFilters } from '../../src/lib/derive.ts'
import type { Town } from '../../src/lib/types.ts'

const town = (code: number, name: string, voters: number, byParty: Record<string, number>): Town => ({
  code,
  name,
  votes: { eligible: 100, voters, valid: Object.values(byParty).reduce((a, b) => a + b, 0), invalid: 0, byParty, source: 'kaplan' },
})

// Lead share / leader: 75 A, 75 B, 50 tie, 75 A, 70 B; turnout 80 / 40 / 50 / 100 / 80
const towns: Town[] = [
  town(1, 'Alpha', 80, { א: 60, ב: 20 }),
  town(2, 'Bet', 40, { א: 10, ב: 30 }),
  town(3, 'Gamma', 50, { א: 15, ב: 15 }),
  town(5, 'Delta', 100, { א: 30, ב: 10 }),
  town(6, 'Epsilon', 80, { א: 9, ב: 21 }),
]
const govmap: Town = { code: 4, name: 'קיבוץ', votes: null }
const kalpi = { 4: [{ code: 1, kalpi: '1', eligible: 200, voters: 100, percent: 50 }] }
const rows = townRows([...towns, govmap], kalpi)
const none = (): TownFilters => ({ query: '', leader: '', minShare: 0, minTurnout: 0, majorityOnly: false, pluralityOnly: false })
const names = (r: ReturnType<typeof townRows>) => r.map((x) => x.name)

describe('townRows', () => {
  it('measures a ballot-less town by its kalpi totals', () => {
    const k = rows.find((r) => r.code === 4)!
    expect(k.turnout).toBe(50)
    expect(k.stats?.leader).toBeNull()
    expect(k.valid).toBe(0)
  })
})

describe('filterTowns', () => {
  it('plurality only keeps winners short of a majority', () => {
    // Epsilon leads 70-30 (majority); Gamma's 50-50 tie has no clear winner
    expect(names(filterTowns(rows, { ...none(), pluralityOnly: true }))).toEqual([])
  })
  it('majority only keeps winners above 50%', () => {
    // Epsilon leads 70-30, which is also a majority; Gamma's 50-50 tie is neither
    expect(names(filterTowns(rows, { ...none(), majorityOnly: true }))).toEqual(['Alpha', 'Bet', 'Delta', 'Epsilon'])
  })
  it('leader narrows to that party', () => {
    expect(names(filterTowns(rows, { ...none(), leader: 'ב' }))).toEqual(['Bet', 'Epsilon'])
  })
  it('turnout bound drops low-turnout towns, keeps kalpi-measured ones', () => {
    expect(names(filterTowns(rows, { ...none(), minTurnout: 60 }))).toEqual(['Alpha', 'Delta', 'Epsilon'])
  })
  it('share bound and trimmed name search', () => {
    expect(names(filterTowns(rows, { ...none(), minShare: 70 }))).toEqual(['Alpha', 'Bet', 'Delta', 'Epsilon'])
    expect(names(filterTowns(rows, { ...none(), query: ' שבע ' }))).toEqual([])
    expect(names(filterTowns(rows, { ...none(), query: 'lph' }))).toEqual(['Alpha'])
  })
})

describe('sortRows', () => {
  it('sorts by turnout, unmeasured rows last in both directions', () => {
    const noKalpi = townRows([...towns, govmap], {})
    expect(names(sortRows(noKalpi, 'turnout', -1, 'he'))).toEqual(['Delta', 'Alpha', 'Epsilon', 'Gamma', 'Bet', 'קיבוץ'])
    expect(names(sortRows(noKalpi, 'turnout', 1, 'he')).at(-1)).toBe('קיבוץ')
  })
  it('sorts by valid votes with ballot-less towns last', () => {
    expect(sortRows(rows, 'valid', -1, 'he').at(-1)?.code).toBe(4)
  })
})

describe('nationalShares', () => {
  it('sums per-party votes over kaplan towns only', () => {
    const s = nationalShares([...towns, govmap])
    // א 124, ב 96 of 220 valid (govmap town has no votes)
    expect(s.get('א')).toBeCloseTo(56.36, 1)
    expect(s.get('ב')).toBeCloseTo(43.64, 1)
  })
})
