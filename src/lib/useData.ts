import { loadKalpi, loadMeta, loadParties, loadTowns } from './data.ts'
import { useI18n } from '../i18n/useI18n.ts'
import type { Party } from './types.ts'
import { useLoad } from './useLoad.ts'

/** Shared lookups: towns, their leading-party colours, and a friendly party name for any key. */
export type PartyLookup = (key: string) => { key: string; name: string; color: string | undefined; logo: string | undefined; slug: string | undefined }

export function useDataset() {
  const towns = useLoad('towns', loadTowns)
  const parties = useLoad('parties', loadParties)
  const byKey = new Map((parties.data ?? []).map((p) => [p.key, p]))
  // English falls back to the Hebrew name for any list without one
  const { lang } = useI18n()
  const party: PartyLookup = (key) => {
    const p = byKey.get(key)
    return { key, name: (lang === 'en' ? p?.nameEn || p?.name : p?.name) ?? key, color: p?.color, logo: p?.logo, slug: p?.slug }
  }
  const official = officialTotals(parties.data ?? [])
  // Town deltas are measured against this: national shares come from all valid votes, towns only some
  const nationalShare = new Map((parties.data ?? []).map((p) => [p.key, p.nationalShare ?? 0]))
  return { towns: towns.data, parties: parties.data ?? [], party, official, nationalShare, error: towns.error || parties.error }
}

export { useLoad, loadKalpi, loadMeta }

/**
 * The published national result, all that seat allocation needs. Turnout is not derived here:
 * data/raw/results.pbf carries the voters count the source site prints (meta.json).
 */
export function officialTotals(parties: Party[]) {
  if (!parties.length) return null
  const votes = Object.fromEntries(parties.filter((p) => (p.nationalVotes ?? 0) > 0).map((p) => [p.key, p.nationalVotes ?? 0]))
  return { votes }
}
