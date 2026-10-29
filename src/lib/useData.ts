import { loadKalpi, loadMeta, loadParties, loadTowns } from './data.ts'
import { useLoad } from './useLoad.ts'

/** Shared lookups: towns, their leading-party colours, and a friendly party name for any key. */
export type PartyLookup = (key: string) => { key: string; name: string; color: string | undefined }

export function useDataset() {
  const towns = useLoad('towns', loadTowns)
  const parties = useLoad('parties', loadParties)
  const byKey = new Map((parties.data ?? []).map((p) => [p.key, p]))
  // parties.json has no English name; the Hebrew name is shown in both languages
  const party: PartyLookup = (key) => ({ key, name: byKey.get(key)?.name ?? key, color: byKey.get(key)?.color })
  return { towns: towns.data, party, error: towns.error || parties.error }
}

export { useLoad, loadKalpi, loadMeta }
