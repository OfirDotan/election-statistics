import type { Kalpi, Party, Town } from './types.ts'

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
export const loadMeta = () => cached('meta.json', () => get<{ date: string; time: string }>('meta.json'))
