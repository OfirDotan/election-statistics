import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { personId } from '../../src/lib/mkId.ts'
import type { Candidate, MkProfile } from '../../src/lib/types.ts'

const read = (f: string) => JSON.parse(readFileSync(new URL(`../../public/data/${f}`, import.meta.url), 'utf8'))
const candidates: Candidate[] = read('candidates.json')

describe('personId', () => {
  it('slugs the English name', () => {
    expect(personId({ nameEn: 'Benjamin Netanyahu', nameHe: 'נתניהו בנימין', party: 'מחל', position: 1 })).toBe('benjamin-netanyahu')
    expect(personId({ nameHe: 'נתניהו בנימין', party: 'מחל', position: 1 })).toBe('מחל-1')
  })

  it('gives every candidate a readable id without Hebrew', () => {
    for (const c of candidates) if (c.nameEn) expect(c.id, c.nameEn).toMatch(/^[a-z0-9-]+$/)
  })

  it('gives every candidate a unique id', () => {
    const ids = candidates.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('mks.json', () => {
  const mks: MkProfile[] = read('mks.json')
  const HE = /[֐-׿]/
  const ordinal = (n: number) => {
    const suffix = ['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'
    return `${n}${suffix}`
  }
  const sentences =(s: string) => s.split(/(?<=[.!?׃])\s+/).filter((x) => x.trim().length > 10)
  // "Role (2014–2017)" | "Role (from 2024)" | "Role (Dec 2022–Jan 2024)" | "Role" | "(a, b)" lists of those
  const MONTH = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
  const SPAN = `(?:from )?(?:${MONTH} )?\\d{4}(?:–(?:${MONTH} )?\\d{4})?`
  const DATE = new RegExp(`^${SPAN}(?:, ${SPAN})*$`)
  // a role ranks by the last year in its date ("from 2022" counts as 2022); general undated roles go last
  const recentKey = (r: string) => {
    const m = r.match(/\(([^()]*)\)\s*$/)
    const years = m?.[1].match(/\d{4}/g)?.map(Number) ?? []
    return years.length ? Math.max(...years) : null
  }

  it('covers every elected MK with a source per fact', () => {
    expect(mks.length).toBe(120)
    for (const m of mks) {
      expect(m.sources.length, m.id).toBeGreaterThan(0)
      for (const s of m.sources) expect(s, m.id).toMatch(/^https:\/\//)
    }
  })

  it('gives most MKs a Commons photo with a credit, and a credit only with a photo', () => {
    expect(mks.filter((m) => m.photo).length).toBeGreaterThanOrEqual(90)
    for (const m of mks) {
      expect(!!m.photoCredit, m.id).toBe(!!m.photo)
      if (m.photo) expect(m.photo, m.id).toMatch(/^File:.+\.(jpe?g|png)$/i)
    }
  })

  it('writes a biography of at least three sentences in both languages', () => {
    for (const m of mks) {
      expect(sentences(m.backgroundEn ?? '').length, m.id + ' en').toBeGreaterThanOrEqual(3)
      expect(sentences(m.backgroundHe ?? '').length, m.id + ' he').toBeGreaterThanOrEqual(3)
    }
  })

  const body = (r: string) => r.replace(/\s*\([^()]*\)\s*$/, '')
  // shortcut: only a trailing "(...)" counts as a date, so an inner parenthetical stays part of the role body
  const dateOf = (r: string) => r.match(/\(([^()]*)\)\s*$/)

  it('gives every elected MK at least one prior role, one role per item, most recent first', () => {
    for (const m of mks) {
      const en = m.priorRoles ?? []
      const he = m.priorRolesHe ?? []
      expect(en.length, m.id).toBeGreaterThanOrEqual(1)
      expect(he.length, m.id).toBe(en.length)
      for (const r of [...en, ...he]) {
        expect(r.includes(' · ') || r.includes('|') || r.trim() === '', m.id + ': ' + r).toBe(false)
        // two roles joined by a comma: "Minister of X, Minister of Y" (a surname such as "Lahav, Welfare ..." is fine)
        expect(/,\s+(minister|chair|chairman|deputy|prime|leader|founder|member|director|commander|mayor)\b/i.test(body(r)), m.id + ': ' + r).toBe(false)
        const d = dateOf(r)
        // Hebrew wording before the year is free ("משנת 2022", "מנובמבר 2024"); the date inside must be canonical
        // a Hebrew prose annotation without years ("(תשע שנים)") is fine; a dated role must be canonical
        const canonical = d?.[1].match(/\d{4}(?:–\d{4})?/)?.[0]
        const knesset = d && /Knesset|ה?כנסת/.test(d[1])
        if (d && !knesset && /\d/.test(d[1])) expect(canonical ?? d[1], m.id + ': ' + r).toMatch(DATE)
      }
      const keys = en.map(recentKey).filter((k): k is number => k !== null)
      expect(keys, m.id).toEqual([...keys].sort((a, b) => b - a))
    }
  })

  it('pairs each Hebrew role with the English role in the same position', () => {
    for (const m of mks) {
      const en = m.priorRoles ?? []
      const he = m.priorRolesHe ?? []
      for (let i = 0; i < en.length; i++) {
        // the Hebrew date must start at the same point as the English one (year or year range),
        // whatever the Hebrew wording before it ("משנת", "מנובמבר", "מאז")
        // the last year of the English date must be the last year of the Hebrew one ("2000s–2012" is either)
        const lastYear = (r: string) => dateOf(r)?.[1].match(/\d{4}/g)?.at(-1)
        const a = lastYear(en[i])
        const b = lastYear(he[i] ?? '')
        // a Hebrew extra detail ("(פרש ב-2018)") is fine; a date that disagrees with the English one is not
        if (!/Knesset|ה?כנסת/.test(en[i]) && a) expect(b, `${m.id}: ${en[i]} <> ${he[i]}`).toBe(a)
      }
      for (const r of en) expect(HE.test(r) && !/Prime Minister's Office/.test(r), m.id + ': ' + r).toBe(false)
    }
  })

  it('writes previous Knesset terms as ranges, in both languages', () => {
    for (const m of mks) {
      for (const t of [m.priorTerms, m.priorTermsHe].filter(Boolean) as string[]) {
        expect(t, m.id).not.toMatch(/\d+(st|nd|rd|th)-\d|ה-\d+-ה-\d/)
        // ordinals must be well formed: 1st, 2nd, 3rd, 11th, 21st, 24th
        for (const n of t.match(/\d+(st|nd|rd|th)/g) ?? []) expect(ordinal(Number(n.slice(0, -2))), m.id + ': ' + t).toBe(n)
      }
    }
  })

  it('keeps Hebrew text free of ASCII quotes, pipes and double-escaped entities', () => {
    const walk = (m: MkProfile): [string, string][] =>
      Object.entries(m).flatMap(([k, v]) =>
        typeof v === 'string' ? ([[k, v]] as [string, string][]) : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => [k, x] as [string, string]) : [],
      )
    for (const m of mks)
      for (const [k, v] of walk(m)) {
        // education uses "Degree| Institution" as its two-column separator
        if (k === 'sources' || k === 'photo' || k.startsWith('education') || !HE.test(v)) continue
        expect(/["|&]|&#\d+;|&quot;/.test(v), `${m.id}.${k}: ${v}`).toBe(false)
      }
  })

  it('lists education items as a degree and an institution', () => {
    for (const m of mks) {
      for (const e of m.education ?? []) expect(e.split('|').length, m.id + ': ' + e).toBeLessThanOrEqual(2)
      expect(m.education?.length ?? 0, m.id).toBe(m.educationHe?.length ?? 0)
    }
  })
})
