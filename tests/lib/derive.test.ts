import { describe, expect, it } from 'vitest'
import { boardRows, filterStats, nationalShares, sortRows, townRows, type TownFilters } from '../../src/lib/derive.ts'
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

describe('filterStats', () => {
  it('plurality only keeps winners short of a majority', () => {
    // Epsilon leads 70-30 (majority); Gamma's 50-50 tie has no clear winner
    expect(names(filterStats(rows, { ...none(), pluralityOnly: true }))).toEqual([])
  })
  it('majority only keeps winners above 50%', () => {
    // Epsilon leads 70-30, which is also a majority; Gamma's 50-50 tie is neither
    expect(names(filterStats(rows, { ...none(), majorityOnly: true }))).toEqual(['Alpha', 'Bet', 'Delta', 'Epsilon'])
  })
  it('leader narrows to that party', () => {
    expect(names(filterStats(rows, { ...none(), leader: 'ב' }))).toEqual(['Bet', 'Epsilon'])
  })
  it('turnout bound drops low-turnout towns, keeps kalpi-measured ones', () => {
    expect(names(filterStats(rows, { ...none(), minTurnout: 60 }))).toEqual(['Alpha', 'Delta', 'Epsilon'])
  })
  it('share bound and trimmed name search', () => {
    expect(names(filterStats(rows, { ...none(), minShare: 70 }))).toEqual(['Alpha', 'Bet', 'Delta', 'Epsilon'])
    expect(names(filterStats(rows, { ...none(), query: ' שבע ' }))).toEqual([])
    expect(names(filterStats(rows, { ...none(), query: 'lph' }))).toEqual(['Alpha'])
  })
})

describe('boardRows', () => {
  it('names ballot-less towns by their kalpi name, ranks them and reads a diverging share as its gap', () => {
    const nat = new Map([['א', 60], ['ב', 10]])
    const out = boardRows(rows, [...towns, { ...towns[0], code: 4, name: 'קיבוץ' }], nat, [{ code: 1, party: 'ג', share: 90, national: 10, diff: 80 }])
    const get = (code: number) => out.find((r) => r.code === code)!
    expect(get(4).name).toBe('קיבוץ')
    // Bet leads 75% against a 10% national share; Alpha leads 80% but is only 15 over its 60% national share
    expect(get(2)).toMatchObject({ over: 65, ranks: { sweep: 4, closest: 2, high: 1 } })
    expect(get(1)).toMatchObject({ over: 15, ranks: { sweep: 6, closest: 1, low: 1 } })
    // divergences() ranks every town by its least nationally-typical party, so none is outside the divergence board
    expect(get(1)).toMatchObject({ stats: { leaderShare: 80 } })
    expect(new Set(out.map((r) => r.ranks?.divergence)).size).toBe(out.length)
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
