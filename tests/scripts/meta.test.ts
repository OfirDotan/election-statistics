import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseResults } from '../../scripts/parse.ts'
import type { ResultsHead } from '../../scripts/parse.ts'

// Checks the built meta.json against what the source site printed for the results.pbf saved in
// data/raw (counted 00:06 on 2026-10-30): a field map pinned, not data — once the source moves on,
// the snapshot test is skipped and only the consistency checks run.
const SNAPSHOT = '30/10/2026 00:06'
const SITE = { counted: 100, voters: 5_716_665, eligible: 7_331_981, turnout: 77.97, valid: 5_241_325, invalid: 23_359 }

describe('national turnout (meta.json)', () => {
  const head = parseResults().head
  const meta = JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8')) as ResultsHead

  it('is the results header, every field from its own source', () => {
    // Key order does not matter; the same object does, so the app and the raw file cannot drift
    expect(meta).toEqual(head)
  })

  it('keeps the sources separate: towns hold only part of the voters, lists only the valid votes', () => {
    const kalpi = JSON.parse(fs.readFileSync('data/raw/kalpi.json', 'utf8')).features as Record<string, { בזב: number; מצביעים: number }>
    const townVoters = Object.values(kalpi).reduce((s, f) => s + f.מצביעים, 0)
    const townEligible = Object.values(kalpi).reduce((s, f) => s + f.בזב, 0)
    // The double envelopes (and stations registered late) are counted nationally only
    expect(townVoters).toBeGreaterThan(head.voters - 1_000_000)
    expect(townVoters).toBeLessThan(head.voters)
    expect(townEligible).toBeLessThan(head.eligible)
    expect(head.valid + head.invalid).toBeLessThan(head.voters)
    expect(head.valid / head.invalid).toBeGreaterThan(100)
  })

  it.skipIf(`${head.date} ${head.time}` !== SNAPSHOT)('at the 00:06 snapshot, matches the site', () => {
    expect({ counted: head.counted, voters: head.voters, eligible: head.eligible, turnout: head.turnout, valid: head.valid, invalid: head.invalid }).toEqual(SITE)
    expect(Math.round((head.voters / head.eligible) * 10000) / 100).toBe(SITE.turnout)
  })
})
