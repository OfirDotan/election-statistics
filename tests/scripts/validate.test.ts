import { describe, expect, it } from 'vitest'
import { validate } from '../../scripts/validate.ts'

const town = (over: Record<string, unknown>) => ({
  code: 3000,
  name: 'עיר',
  votes: { eligible: 100, voters: 70, valid: 68, invalid: 2, byParty: { מחל: 40, דרך: 28 }, source: 'kaplan' },
  ...over,
}) as never

describe('validate', () => {
  it('accepts a well-formed dataset', () => {
    expect(() => validate({ towns: [town({})], townKalpi: { 3000: [{ code: 3000, kalpi: '1', eligible: 50, voters: 40, percent: 80 }] } })).not.toThrow()
  })

  it('rejects voters above eligible', () => {
    expect(() => validate({ towns: [town({ votes: { eligible: 10, voters: 20, valid: 18, invalid: 2, byParty: {}, source: 'kaplan' } })], townKalpi: {} })).toThrow(/voters/)
  })

  it('rejects party votes above valid votes', () => {
    expect(() => validate({ towns: [town({ votes: { eligible: 100, voters: 70, valid: 10, invalid: 60, byParty: { מחל: 40 }, source: 'kaplan' } })], townKalpi: {} })).toThrow(/party sum/)
  })

  it('rejects kalpi data for an unknown town', () => {
    expect(() => validate({ towns: [town({})], townKalpi: { 9999: [] } })).toThrow(/unknown town/)
  })
})
