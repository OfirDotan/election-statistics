import fs from 'node:fs/promises'
import path from 'node:path'
import { parseCandidates, parseCandidateParties, parseElectionParties, parseGeo, parseKalpi, parseKaplanParties, parseMunicipal, parseNationalVotes, parseResults } from './parse.ts'
import type { Kalpi, Party, Town } from './types.ts'
import { validate } from './validate.ts'

/** Party names in the results file are official titles; the CEC catalog has the short public names */
export function build() {
  const { localities, date, time } = parseResults()
  const kalpi = parseKalpi()
  const municipal = parseMunicipal()
  const parties = buildParties(localities)
  const statuses = parseCandidateParties()

  const kalpiByTown = new Map<number, Kalpi[]>()
  for (const k of kalpi) {
    const list = kalpiByTown.get(k.code) ?? []
    list.push({ code: k.code, kalpi: k.kalpi, eligible: k.eligible, voters: k.voters, percent: k.percent })
    kalpiByTown.set(k.code, list)
  }

  const towns: Town[] = localities.map((l) => ({
    code: l.code,
    name: l.name,
    votes: { eligible: l.eligible, voters: l.voters, valid: l.valid, invalid: l.invalid, byParty: l.byParty, source: 'kaplan' },
  }))

  // Localities GovMap knows about but the results file does not: keep them as turnout-only rows
  const known = new Set(towns.map((t) => t.code))
  for (const [code, m] of Object.entries(municipal)) {
    if (!known.has(Number(code))) {
      towns.push({
        code: Number(code),
        name: '',
        votes: { eligible: m.eligible, voters: m.voters, valid: 0, invalid: 0, byParty: {}, source: 'govmap' },
      })
    }
  }

  // Names for GOVMAP-only towns come from the geometry's properties
  const geo = parseGeo()
  const geoName = new Map<number, string>((geo.objects.municipal.geometries ?? []).map((g: { properties: { SETL_CODE: number; 'שם ישוב': string } }) => [g.properties.SETL_CODE, g.properties['שם ישוב']]))
  for (const t of towns) if (!t.name) t.name = geoName.get(t.code) ?? `#${t.code}`

  // Kalpi detail and every town's own turnout live in the per-town payload
  const townKalpi: Record<number, Kalpi[]> = {}
  for (const [code, list] of kalpiByTown) townKalpi[code] = list.sort((a, b) => a.kalpi.localeCompare(b.kalpi, 'he', { numeric: true }))

  const candidates = parseCandidates()
  const candidateList = [...candidates.values()].flat().filter((c) => statuses[c.party]?.status !== 'withdrawn')

  return { towns, parties, candidateList, townKalpi, geo, asOf: { date, time } }
}

function buildParties(localities: ReturnType<typeof parseResults>['localities']): Party[] {
  const cec = parseElectionParties()
  const kaplan = parseKaplanParties().lists
  const statuses = parseCandidateParties()
  const candidates = parseCandidates()
  const national = parseNationalVotes()
  const votes: Record<string, number> = {}
  for (const l of localities) for (const [k, n] of Object.entries(l.byParty)) votes[k] = (votes[k] ?? 0) + n
  // CEC names replace Kaplan names for common keys; keys only one source knows keep that source's
  const names: Record<string, string> = Object.fromEntries(Object.entries(kaplan).map(([k, v]) => [k, v.name]))
  // Kaplan lists only 13 of 37, so without the CEC the results' official titles name the rest
  const official: Record<string, number> = {}
  for (const l of localities) for (const k of Object.keys(l.byParty)) official[k] = (official[k] ?? 0) + 1
  for (const k of Object.keys(official)) names[k] ??= k
  for (const [k, v] of Object.entries(cec)) names[k] = v.name
  return Object.keys(names).map((key) => {
    const list = candidates.get(key) ?? []
    const leader = list.find((c) => c.isLeader)
    return {
      key,
      name: names[key],
      nameEn: kaplan[key]?.name_en ?? statuses[key]?.nameEn,
      color: kaplan[key]?.color ?? cec[key]?.color ?? '#9E9E9E',
      status: statuses[key]?.status ?? 'unknown',
      votes: votes[key] ?? 0,
      nationalVotes: national[key] ?? 0,
      leader: leader ? { he: leader.nameHe, en: leader.nameEn } : undefined,
      candidates: list.length,
    }
  }).filter((p) => p.candidates > 0)
}

/**
 * Writes to a staging dir and swaps it in only once every file is on disk,
 * so a crash mid-build leaves the previous dataset untouched.
 */
export async function write(out: string) {
  const data = build()
  validate(data)
  const staging = `${out}.staging`
  await fs.rm(staging, { recursive: true, force: true })
  await fs.mkdir(staging, { recursive: true })
  const json = (file: string, value: unknown) => fs.writeFile(path.join(staging, file), JSON.stringify(value))
  await json('towns.json', data.towns)
  await json('parties.json', data.parties)
  await json('candidates.json', data.candidateList)
  await json('kalpi.json', data.townKalpi)
  await json('meta.json', data.asOf)
  await json('geo.topo.json', data.geo)
  // The manifest is written last: its presence marks a complete dataset
  await json('index.json', {
    towns: data.towns.length,
    parties: data.parties.length,
    candidates: data.candidateList.length,
  })
  await fs.rm(out, { recursive: true, force: true })
  await fs.rename(staging, out)
  return data
}
