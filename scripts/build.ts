import fs from 'node:fs/promises'
import path from 'node:path'
import { LOGOS } from './logos.ts'
import { allocate } from '../src/lib/mandates.ts'
import { parseCandidates, parseCandidateParties, parseElectionParties, parseGeo, parseKalpi, parseKaplanParties, parseMunicipal, parseNationalVotes, parseResults, parseTownNames } from './parse.ts'
import type { Kalpi, Party, Town } from './types.ts'
import { validate } from './validate.ts'

const FALLBACK = 'data/fallback'
/** Party-page name lists: enough for a realistic Knesset, not the whole ballot */
const CANDIDATES_PER_PARTY = 40

/** The party's main short English name as its URL: "Together (B'Yachad)" is `together`, and lists
 *  without one fall back to their ballot key */
const SHORT: Record<string, string> = {
  מחל: 'likud', דרך: 'yashar', רק: 'together', אמת: 'democrats', ודם: 'joint-list', ל: 'israel-beiteinu',
  ב: 'otzma', שס: 'shas', ג: 'utj', ט: 'religious-zionist', עם: 'raam', די: 'reservists',
}
/** Small lists share URLs once shortened, so the key joins the slug for them */
const partySlug = (key: string, nameEn: string | undefined) => {
  if (SHORT[key]) return SHORT[key]
  const s = (nameEn ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // No ballot letter in the URL: the list's own index disambiguates instead
  return `${s || 'list'}-${[...key].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 0) % 1000}`
}

/** Party names in the results file are official titles; the CEC catalog has the short public names */
export function build() {
  const { towns, head } = parseResults()
  const kalpi = parseKalpi()
  const municipal = parseMunicipal()
  const parties = buildParties(towns)
  const statuses = parseCandidateParties()

  const kalpiByTown = new Map<number, Kalpi[]>()
  for (const k of kalpi) {
    const list = kalpiByTown.get(k.code) ?? []
    list.push({ code: k.code, kalpi: k.kalpi, eligible: k.eligible, voters: k.voters, percent: k.percent })
    kalpiByTown.set(k.code, list)
  }

  // English names go on the towns themselves: the app searches by either and the map labels in the page's language
  const { en } = parseTownNames()
  const out: Town[] = towns.map((l) => ({
    code: l.code,
    name: l.name,
    nameEn: en.get(l.code),
    votes: { eligible: l.eligible, voters: l.voters, valid: l.valid, invalid: l.invalid, byParty: l.byParty, source: 'kaplan' },
  }))

  // Towns GovMap knows about but the results file does not: keep them as turnout-only rows
  const known = new Set(out.map((t) => t.code))
  for (const [code, m] of Object.entries(municipal)) {
    if (!known.has(Number(code))) {
      out.push({
        code: Number(code),
        name: '',
        nameEn: en.get(Number(code)),
        votes: { eligible: m.eligible, voters: m.voters, valid: 0, invalid: 0, byParty: {}, source: 'govmap' },
      })
    }
  }

  // Names for GOVMAP-only towns come from the geometry's properties
  const geo = parseGeo()
  const geoName = new Map<number, string>((geo.objects.municipal.geometries ?? []).map((g: { properties: { SETL_CODE: number; 'שם ישוב': string } }) => [g.properties.SETL_CODE, g.properties['שם ישוב']]))
  for (const t of out) if (!t.name) t.name = geoName.get(t.code) ?? `#${t.code}`

  // Kalpi detail and every town's own turnout live in the per-town payload
  const townKalpi: Record<number, Kalpi[]> = {}
  for (const [code, list] of kalpiByTown) townKalpi[code] = list.sort((a, b) => a.kalpi.localeCompare(b.kalpi, 'he', { numeric: true }))

  const candidates = parseCandidates()
  const candidateList = [...candidates.values()].flat().filter((c) => statuses[c.party]?.status !== 'withdrawn')

  return { towns: out, parties, candidateList, townKalpi, geo, asOf: head }
}

function buildParties(towns: ReturnType<typeof parseResults>['towns']): Party[] {
  // Share denominators: Kaplan's table over the town sums, which by construction add up to it
  const validTotal = towns.reduce((s, l) => s + l.valid, 0)
  const seatOf = Object.fromEntries(allocate({ votes: Object.fromEntries(Object.entries(parseNationalVotes()).filter(([, n]) => n > 0)) }).seats.map((s) => [s.key, s.seats]))
  const cec = parseElectionParties()
  const kaplan = parseKaplanParties().lists
  const statuses = parseCandidateParties()
  const candidates = parseCandidates()
  const national = parseNationalVotes()
  const votes: Record<string, number> = {}
  for (const l of towns) for (const [k, n] of Object.entries(l.byParty)) votes[k] = (votes[k] ?? 0) + n
  // CEC names replace Kaplan names for common keys; keys only one source knows keep that source's
  const names: Record<string, string> = Object.fromEntries(Object.entries(kaplan).map(([k, v]) => [k, v.name]))
  // Kaplan lists only 13 of 37, so without the CEC the results' official titles name the rest
  const official: Record<string, number> = {}
  for (const l of towns) for (const k of Object.keys(l.byParty)) official[k] = (official[k] ?? 0) + 1
  for (const k of Object.keys(official)) names[k] ??= k
  for (const [k, v] of Object.entries(cec)) names[k] = v.name
  const nationalTotal = Object.values(national).reduce((s, n) => s + n, 0)
  const namesEn: Record<string, string> = {}
  // Every list on the official result, so the national table is the full ballot
  for (const key of Object.keys(national)) {
    names[key] ??= key
    if (statuses[key]?.name) names[key] = statuses[key].name
    if (statuses[key]?.nameEn) namesEn[key] = statuses[key].nameEn
  }
  return Object.keys(names).map((key) => {
    const list = candidates.get(key) ?? []
    const leader = list.find((c) => c.isLeader)
    // The leader is inside every list, so the list without it is the rest of the seats, by position
    const c = list.filter((x) => !x.isLeader).slice(0, CANDIDATES_PER_PARTY)
    return {
      key,
      slug: partySlug(key, namesEn[key] ?? kaplan[key]?.name_en ?? statuses[key]?.nameEn),
      name: names[key],
      nameEn: namesEn[key] ?? kaplan[key]?.name_en ?? statuses[key]?.nameEn,
      logo: LOGOS[key] ?? '',
      color: kaplan[key]?.color ?? cec[key]?.color ?? '#9E9E9E',
      status: statuses[key]?.status ?? 'unknown',
      votes: votes[key] ?? 0,
      nationalVotes: national[key] ?? 0,
      nationalShare: nationalTotal ? ((national[key] ?? 0) / nationalTotal) * 100 : 0,
      leader: leader ? { he: leader.nameHe, en: leader.nameEn } : undefined,
      candidates: list.length,
      seats: seatOf[key] ?? 0,
      candidateNames: c.map((x) => x.nameHe),
      // Of all valid votes; `nationalShare` is the same share off Kaplan's table, `אחר` folded in
      share: validTotal ? ((national[key] ?? 0) / validTotal) * 100 : 0,
    }
  }).filter((p) => p.candidates > 0 || p.nationalVotes > 0)
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
  // Hand-written source of truth whose photos point into public/assets/mks; the swap below would drop it
  await fs.copyFile('data/mks.json', path.join(staging, 'mks.json'))
  // The manifest is written last: its presence marks a complete dataset
  await json('index.json', {
    towns: data.towns.length,
    parties: data.parties.length,
    candidates: data.candidateList.length,
  })
  await fs.rm(out, { recursive: true, force: true })
  // Windows briefly locks a directory a dev server or watcher just had open; the swap is safe to retry
  for (let i = 1; ; i++) {
    try {
      await fs.rename(staging, out)
      break
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EPERM' || i >= 5) throw err
      await new Promise((resolve) => setTimeout(resolve, 200 * i))
    }
  }
  // The fallback copy ships in the image: the site keeps working while the live sources are down
  if (out !== FALLBACK) {
    await fs.rm(FALLBACK, { recursive: true, force: true })
    await fs.cp(out, FALLBACK, { recursive: true })
  }
  return data
}

/** Puts the saved dataset in place; a failed rebuild calls it with the fallback itself */
export async function copyFallback(from = FALLBACK, out = 'public/data') {
  await fs.rm(out, { recursive: true, force: true })
  await fs.cp(from, out, { recursive: true })
  return JSON.parse(await fs.readFile(`${out}/index.json`, 'utf8')) as { towns: number; parties: number; candidates: number }
}
