import type { Kalpi, Town } from './types.ts'

export interface Dataset {
  towns: Town[]
  townKalpi: Record<number, Kalpi[]>
}

/** Every check throws with the offending code, so a bad refresh names what broke */
export function validate(d: Dataset): void {
  const fail = (msg: string): never => {
    throw new Error(`data validation failed: ${msg}`)
  }
  const codes = new Set<number>()
  for (const t of d.towns) {
    if (!Number.isInteger(t.code) || t.code <= 0) fail(`town ${t.name}: bad code ${t.code}`)
    if (t.code > 9999) fail(`town ${t.name}: code ${t.code} is not a CBS 4-digit town code`)
    if (codes.has(t.code)) fail(`duplicate town code ${t.code}`)
    codes.add(t.code)

    const v = t.votes
    if (!v) continue
    if (v.eligible < 0 || v.voters < 0 || v.valid < 0) fail(`town ${t.name}: negative counts`)
    if (v.voters > v.eligible) fail(`town ${t.name}: voters ${v.voters} > eligible ${v.eligible}`)
    if (v.valid + v.invalid !== v.voters && v.source === 'kaplan')
      fail(`town ${t.name}: valid ${v.valid} + invalid ${v.invalid} != voters ${v.voters}`)
    if (v.source === 'kaplan') {
      const sum = Object.values(v.byParty).reduce((a, b) => a + b, 0)
      // Unlabelled vote codes are not published, so votes can fall short of valid; they must never exceed it
      if (sum > v.valid) fail(`town ${t.name}: party sum ${sum} > valid ${v.valid}`)
    }
  }

  for (const [code, kalpis] of Object.entries(d.townKalpi)) {
    if (!codes.has(Number(code))) fail(`kalpi data for unknown town code ${code}`)
    for (const k of kalpis) {
      if (k.voters > k.eligible) fail(`kalpi ${code}|${k.kalpi}: voters ${k.voters} > eligible ${k.eligible}`)
      if (!Number.isFinite(k.percent)) fail(`kalpi ${code}|${k.kalpi}: percent ${k.percent}`)
    }
  }
}
