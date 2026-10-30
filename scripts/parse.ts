import fs from 'node:fs'
import { decode } from 'geobuf'
import { PbfReader } from 'pbf'
import Papa from 'papaparse'
import { personId } from '../src/lib/mkId.ts'

const RAW = 'data/raw'
/** The full official national result; kept outside RAW so a live refresh can never wipe it */
export const OFFICIAL = 'data/official_national.json'
const HEBREW_LETTERS = /^[א-ת]{1,4}$/
/**
 * The results file's `r_אחר`: per town, the lists the source did not name (the town sum equals
 * their national votes). Kept under this key, which no ballot uses; the town page splits it apart.
 */
export const OTHER = 'אחר'

export interface TownRecord {
  code: number
  name: string
  eligible: number
  voters: number
  valid: number
  invalid: number
  byParty: Record<string, number>
}

export interface KalpiRecord {
  code: number
  kalpi: string
  eligible: number
  voters: number
  percent: number
}

export interface TurnoutRecord {
  eligible: number
  voters: number
  percent: number
}

export interface ResultsHead {
  date: string
  time: string
  /** Ballot boxes counted, percent, as the site shows it */
  counted: number
  /** Voters and the electoral book nationally, which include the double envelopes no town has */
  voters: number
  eligible: number
  /** Turnout percent, as the site shows it */
  turnout: number
  /** Valid (`r_כשרים`) and invalid (`r_פסולים`) summed over the towns; the valid sum is the national list result */
  valid: number
  invalid: number
}

/** Kaplan's `'` is its ayin mark: it sits under a letter, so it reads as a stray leading quote in English text */
const AYIN = '̠'

/** English town names keyed by code, for searching and labels; Kaplan's spellings without its ayin marks */
export function parseTownNames(): { en: Map<number, string> } {
  const raw = JSON.parse(fs.readFileSync(`${RAW}/kaplan_towns.json`, 'utf8')) as Record<string, [string | null, string | null]>
  const en = new Map<number, string>()
  for (const [code, [name]] of Object.entries(raw)) if (name) en.set(Number(code), name.replaceAll(AYIN, ''))
  // Kaplan lists these nine in Hebrew only; the names are the user's spelling
  const own: Record<number, string> = {
    1196: 'Mahane Yatir',
    1339: 'Al-Azi',
    1362: "Gva'ot Eden",
    3786: 'Ovnat',
    3861: "Asa'el",
    3864: 'Beit Hogla',
    3869: 'Avigayil',
    3815: 'Tel Zion',
    3825: "Mevo'ot Yeriho",
  }
  for (const [code, name] of Object.entries(own)) en.set(Number(code), name)
  return { en }
}

export function parseResults(): { towns: TownRecord[]; head: ResultsHead } {
  const geo = decode(new PbfReader(fs.readFileSync(`${RAW}/results.pbf`))) as unknown as {
    date: string
    time: string
    precent_counted: string
    voters_now: string
    total_bzb: string
    voting_percent_now: string
    features: { properties: Record<string, string | number> }[]
  }
  const towns = geo.features.map(({ properties: p }) => {
    const byParty: Record<string, number> = {}
    for (const [k, v] of Object.entries(p)) {
      if (k.startsWith('r_') && !['r_בזב', 'r_מצביעים', 'r_פסולים', 'r_כשרים'].includes(k)) {
        byParty[k === `r_${OTHER}` ? OTHER : k.slice(2)] = Number(v)
      }
    }
    return {
      code: Number(p.SEMEL_YISHUV),
      name: String(p.SHEM_YISHUV),
      eligible: Number(p['r_בזב']),
      voters: Number(p['r_מצביעים']),
      valid: Number(p['r_כשרים']),
      invalid: Number(p['r_פסולים']),
      byParty,
    }
  })
  // The header carries the national turnout as the site prints it; the voters it counts include the
  // double envelopes that no town has (`precent_counted` is the source's own spelling)
  const head: ResultsHead = {
    date: geo.date,
    time: geo.time,
    counted: Number(geo.precent_counted),
    voters: Number(geo.voters_now),
    eligible: Number(geo.total_bzb),
    turnout: Number(geo.voting_percent_now),
    valid: towns.reduce((s, l) => s + l.valid, 0),
    invalid: towns.reduce((s, l) => s + l.invalid, 0),
  }
  return { towns, head }
}

/** GovMap files key features by string and nest values under a `features` object */
function govmapFeatures<T>(file: string): Record<string, T & TurnoutRecord> {
  const data = JSON.parse(fs.readFileSync(`${RAW}/${file}`, 'utf8'))
  return data.features
}

export function parseKalpi(): KalpiRecord[] {
  if (!fs.existsSync(`${RAW}/kalpi.json`)) return []
  return Object.values(govmapFeatures<{ code: number; kalpi: string }>('kalpi.json')).map((f) => ({
    code: f.code,
    kalpi: f.kalpi,
    eligible: f['בזב'],
    voters: f['מצביעים'],
    percent: f.percent,
  }))
}

export function parseMunicipal(): Record<number, TurnoutRecord> {
  const out: Record<number, TurnoutRecord> = {}
  if (!fs.existsSync(`${RAW}/municipal.json`)) return out
  for (const [code, f] of Object.entries(govmapFeatures<{ 'שם ישוב': string }>('municipal.json'))) {
    out[Number(code)] = { eligible: f['בזב'], voters: f['מצביעים'], percent: f.percent }
  }
  return out
}

export function parseGeo() {
  // Same shape as GovMap's file, without arcs: the map renders as one empty FeatureCollection
  if (!fs.existsSync(`${RAW}/geometry.topojson`)) return { type: 'Topology', objects: { municipal: { type: 'FeatureCollection', features: [] } }, arcs: [] }
  return JSON.parse(fs.readFileSync(`${RAW}/geometry.topojson`, 'utf8'))
}

export function parseElectionParties(): Record<string, { name: string; color: string }> {
  if (!fs.existsSync(`${RAW}/elections.json`)) return {}
  return JSON.parse(fs.readFileSync(`${RAW}/elections.json`, 'utf8')).elections['26'].parties
}

export function parseKaplanParties(): { lists: Record<string, { name: string; name_en?: string; name_ar?: string; color: string }>; threshold: number } {
  return JSON.parse(fs.readFileSync(`${RAW}/kaplan_parties.json`, 'utf8'))
}

/**
 * Official national totals, including the double-envelope ballots (soldiers, diplomats, …) that
 * are counted nationally only and are absent from every town. Seat allocation must use these.
 * The Kaplan file folds the small lists into `r_אחר`; `official_national.json` has every list by
 * ballot letters. Current copy: the CEC national table, https://media26.bechirot.gov.il/files/expc.csv
 * (the "download" file behind votes26.bechirot.gov.il/nationalresults), summed and saved with
 * `npm run data -- --save-official <file>`; that CSV is kept as data/raw/cec_national_*.csv.
 */
export function parseNationalVotes(): Record<string, number> {
  const raw = JSON.parse(fs.readFileSync(`${RAW}/kaplan_national.json`, 'utf8')) as Record<string, number>
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) if (k !== 'r_אחר') out[k.slice(2)] = v
  // Saved by `npm run data -- --save-official <file>`; not one of the live-fetched sources
  if (fs.existsSync(OFFICIAL)) {
    for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(OFFICIAL, 'utf8')) as Record<string, number>)) out[k] = v
  } else {
    console.warn(`warn officials: no ${OFFICIAL}, the 24 small lists count only inside the towns`)
  }
  return out
}

export interface CandidateRecord {
  /** `${party}-${position}`, the MK page route key */
  id: string
  party: string
  position: number
  nameHe: string
  nameEn?: string
  isLeader: boolean
  incumbent: boolean
  component?: string
}

/** HuggingFace candidates.csv; the parties.csv list_status is the authority for approved/withdrawn */
export function parseCandidates(): Map<string, CandidateRecord[]> {
  const byParty = new Map<string, CandidateRecord[]>()
  const { data } = Papa.parse<Record<string, string>>(fs.readFileSync(`${RAW}/candidates.csv`, 'utf8'), {
    header: true,
    skipEmptyLines: true,
  })
  for (const row of data) {
    const key = row.ballot_letters
    if (!HEBREW_LETTERS.test(key)) throw new Error(`candidates.csv: bad ballot_letters "${key}" for ${row.name_he}`)
    const list = byParty.get(key) ?? []
    list.push({
      id: personId({ nameEn: row.name_en || row.name_english, nameHe: row.name_he, party: key, position: Number(row.list_position) }),
      party: key,
      position: Number(row.list_position),
      nameHe: row.name_he,
      nameEn: row.name_en || undefined,
      isLeader: row.is_party_leader === 'True',
      incumbent: row.incumbent_mk_25 === 'True',
      component: row.component_party || undefined,
    })
    byParty.set(key, list)
  }
  for (const list of byParty.values()) list.sort((a, b) => a.position - b.position)
  return byParty
}

export function parseCandidateParties(): Record<string, { status: string; note: string; name?: string; nameEn?: string }> {
  // Some fields are wrapped in smart quotes, which papaparse treats as literal text and the comma spills columns
  const csv = fs.readFileSync(`${RAW}/candidate_parties.csv`, 'utf8').replace(/[“”]/g, '"')
  const { data, errors } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  })
  if (errors.length) throw new Error(`candidate_parties.csv: ${errors[0].message}`)
  const out: Record<string, { status: string; note: string; name?: string; nameEn?: string }> = {}
  for (const row of data) {
    const key = row.ballot_letters?.trim()
    // Known upstream trap: one unquoted title spills several columns; refuse rather than mis-join
    if (!HEBREW_LETTERS.test(key ?? '')) throw new Error(`candidate_parties.csv: bad ballot_letters in row "${row.party_en}"`)
    // party_en is the only English name for the 24 lists Kaplan does not translate
    out[key] = { status: row.list_status, note: row.status_note, name: row.party_he?.trim() || undefined, nameEn: row.party_en || undefined }
  }
  return out
}
