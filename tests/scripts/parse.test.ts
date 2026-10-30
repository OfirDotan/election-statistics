import { describe, expect, it } from 'vitest'
import { parseTownNames } from '../../scripts/parse.ts'

describe('parseTownNames', () => {
  it('drops Kaplan’s ayin mark, which would read as a leading quote', () => {
    const { en } = parseTownNames()
    expect(en.get(511)).toBe("'Aylut")
    expect(en.get(7)).toBe('Shahar')
    expect([...en.values()].some((n) => n.includes('̠'))).toBe(false)
  })
})
