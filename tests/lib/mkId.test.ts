import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { personId } from '../../src/lib/mkId.ts'
import type { Candidate } from '../../src/lib/types.ts'

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
