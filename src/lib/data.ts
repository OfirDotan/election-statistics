import type { Candidate, Kalpi, MkProfile, Party, Town } from './types.ts'

const base = import.meta.env.BASE_URL

/** Fetched once per file, cached for the session; a failed fetch is retried next call. */
function cached<T>(file: string, fetcher: () => Promise<T>): Promise<T> {
  let p = pending.get(file) as Promise<T> | undefined
  p ??= fetcher().catch((e: unknown) => {
    pending.delete(file)
    throw e
  })
  pending.set(file, p)
  return p
}
const pending = new Map<string, Promise<unknown>>()

const get = async <T,>(file: string): Promise<T> => {
  const res = await fetch(`${base}data/${file}`)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const loadTowns = () => cached('towns.json', () => get<Town[]>('towns.json'))
export const loadParties = () => cached('parties.json', () => get<Party[]>('parties.json'))
export const loadKalpi = () => cached('kalpi.json', () => get<Record<string, Kalpi[]>>('kalpi.json'))
// The results file header: national turnout as the source counts it (voters include the double
// envelopes no town has), plus `valid`, whose total is the national list result
export interface Meta {
  date: string
  time: string
  /** Ballot boxes counted, percent */
  counted?: number
  voters?: number
  /** Voters on the electoral book (בזב) */
  eligible?: number
  /** Turnout percent, `voting_percent_now` of the results header */
  turnout?: number
  /** Valid (`r_כשרים`) and invalid (`r_פסולים`) votes summed over the towns; valid = the national list sum */
  valid?: number
  invalid?: number
}
export const loadMeta = () => cached('meta.json', () => get<Meta>('meta.json'))
export const loadCandidates = () => cached('candidates.json', () => get<Candidate[]>('candidates.json'))
// Hand-collected MK bios, keyed by candidate id (the name slug). A failed fetch only blanks the profile, not the page
export const loadMks = () => cached('mks.json', () => get<MkProfile[]>('mks.json').catch(() => [] as MkProfile[]))
