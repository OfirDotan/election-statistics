import { describe, expect, it } from 'vitest'
import { DILEMMAS, SOURCES, STANCES } from '../../src/lib/alignments.ts'

// The 11 lists that won seats in the 26th Knesset
const SEATED = ['מחל', 'דרך', 'רק', 'אמת', 'ודם', 'ל', 'עם', 'ב', 'ג', 'שס', 'ט']
const KEYS = new Set(DILEMMAS.map((d) => d.key))
const SOURCE_IDS = new Set(SOURCES.map((s) => s.id))

const url = (source: string) => (source.startsWith('https://') ? source : SOURCES.find((s) => s.id === source)?.url)

describe('party dilemmas', () => {
  it('has 8–12 dilemmas, each with a unique key and both ends labelled', () => {
    expect(DILEMMAS.length).toBeGreaterThanOrEqual(8)
    expect(DILEMMAS.length).toBeLessThanOrEqual(12)
    expect(KEYS.size).toBe(DILEMMAS.length)
    for (const d of DILEMMAS) {
      for (const s of [d.he, d.en, d.leftHe, d.leftEn, d.rightHe, d.rightEn]) expect(s.trim()).not.toBe('')
    }
  })

  it('covers every seated party with a camp note', () => {
    for (const key of SEATED) {
      expect(STANCES[key], key).toBeDefined()
      expect(STANCES[key]!.campNoteHe.trim(), key).not.toBe('')
      expect(STANCES[key]!.campNoteEn.trim(), key).not.toBe('')
    }
  })

  it('keeps scores whole and on the 0–100 scale, each with a source URL and a basis', () => {
    for (const [party, p] of Object.entries(STANCES)) {
      expect(Object.keys(p.stances).length, party).toBeGreaterThan(0)
      for (const [dilemma, s] of Object.entries(p.stances)) {
        expect(KEYS.has(dilemma), `${party}/${dilemma}`).toBe(true)
        expect(Number.isInteger(s.score), `${party}/${dilemma}`).toBe(true)
        expect(s.score, `${party}/${dilemma}`).toBeGreaterThanOrEqual(0)
        expect(s.score, `${party}/${dilemma}`).toBeLessThanOrEqual(100)
        expect(url(s.source), `${party}/${dilemma}`).toMatch(/^https:\/\//)
        expect(s.basis.trim(), `${party}/${dilemma}`).not.toBe('')
        expect(s.basis.length, `${party}/${dilemma}`).toBeLessThanOrEqual(120)
      }
    }
  })

  it('has source ids that resolve and unique source URLs', () => {
    expect(SOURCE_IDS.size).toBe(SOURCES.length)
    for (const s of SOURCES) expect(s.url).toMatch(/^https:\/\//)
    for (const [party, p] of Object.entries(STANCES)) {
      for (const s of Object.values(p.stances)) {
        expect(url(s.source), party).toMatch(/^https:\/\//)
      }
    }
  })
})
