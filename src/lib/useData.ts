import { loadKalpi, loadMeta, loadParties, loadTowns } from './data.ts'
import { useI18n } from '../i18n/useI18n.ts'
import type { Party } from './types.ts'
import { useLoad } from './useLoad.ts'

/** Double-envelope ballots (`מעטפות כפולות`), counted nationally only */
const DOUBLE_ENVELOPE = 493_642

/** Shared lookups: towns, their leading-party colours, and a friendly party name for any key. */
export type PartyLookup = (key: string) => { key: string; name: string; color: string | undefined; logo: string | undefined }

export function useDataset() {
  const towns = useLoad('towns', loadTowns)
  const parties = useLoad('parties', loadParties)
  const byKey = new Map((parties.data ?? []).map((p) => [p.key, p]))
  // English falls back to the Hebrew name for any list without one
  const { lang } = useI18n()
  const party: PartyLookup = (key) => {
    const p = byKey.get(key)
    return { key, name: (lang === 'en' ? p?.nameEn || p?.name : p?.name) ?? key, color: p?.color, logo: p?.logo }
  }
  const official = officialTotals(parties.data ?? [])
  return { towns: towns.data, parties: parties.data ?? [], party, official, error: towns.error || parties.error }
}

export { useLoad, loadKalpi, loadMeta }

/**
 * The published national result. Seat allocation runs on `votes`; `cast` adds the double-envelope
 * ballots, which Kaplan counts nationally but never in a town, so turnout is not understated.
 */
export function officialTotals(parties: Party[]) {
  if (!parties.length) return null
  const votes = Object.fromEntries(parties.map((p) => [p.key, p.nationalVotes ?? 0]))
  const cast = parties.reduce((s, p) => s + p.votes, 0) + DOUBLE_ENVELOPE
  return { votes, cast }
}
