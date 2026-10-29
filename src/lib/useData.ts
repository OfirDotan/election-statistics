import { loadKalpi, loadMeta, loadParties, loadTowns } from './data.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { useLoad } from './useLoad.ts'

/** Shared lookups: towns, their leading-party colours, and a friendly party name for any key. */
export type PartyLookup = (key: string) => { key: string; name: string; color: string | undefined }

export function useDataset() {
  const towns = useLoad('towns', loadTowns)
  const parties = useLoad('parties', loadParties)
  const byKey = new Map((parties.data ?? []).map((p) => [p.key, p]))
  // English falls back to the Hebrew name for any list without one
  const { lang } = useI18n()
  const party: PartyLookup = (key) => {
    const p = byKey.get(key)
    return { key, name: (lang === 'en' ? p?.nameEn || p?.name : p?.name) ?? key, color: p?.color }
  }
  return { towns: towns.data, parties: parties.data ?? [], party, error: towns.error || parties.error }
}

export { useLoad, loadKalpi, loadMeta }
