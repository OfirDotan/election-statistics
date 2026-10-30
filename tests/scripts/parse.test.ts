import { describe, expect, it } from 'vitest'
import { parseTownNames } from '../../scripts/parse.ts'

describe('parseTownNames', () => {
  it('drops Kaplan’s ayin mark, which would read as a leading quote', () => {
    const { en } = parseTownNames()
    expect(en.get(511)).toBe("'Aylut")
    expect(en.get(7)).toBe('Shahar')
    // The nine Kaplan has only in Hebrew carry the user's English names
    expect(en.get(3786)).toBe('Ovnat')
    expect([...en.values()].some((n) => n.includes('̠'))).toBe(false)
  })
})
