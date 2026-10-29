import type { FeatureCollection, Geometry } from 'geojson'

export interface TownVotes {
  eligible: number
  voters: number
  valid: number
  invalid: number
  byParty: Record<string, number>
  source: 'kaplan' | 'govmap'
}

export interface Town {
  code: number
  name: string
  apparentment?: string
  votes: TownVotes | null
}

export interface Party {
  key: string
  name: string
  color: string
  status: string
  votes: number
  leader?: { he: string; en?: string }
  candidates: number
}

export interface MunicipalProps {
  id: number
  SETL_CODE: number
  'שם ישוב': string
}

export type MunicipalCollection = FeatureCollection<Geometry, MunicipalProps>

const get = async <T>(file: string): Promise<T> => {
  const res = await fetch(import.meta.env.BASE_URL + 'data/' + file)
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const loadTowns = () => get<Town[]>('towns.json')
export const loadParties = () => get<Party[]>('parties.json')
// GovMap's TopoJSON holds a FeatureCollection where topojson-specification assumes a
// GeometryCollection, so the standard Types don't fit; only `objects.municipal` is used.
export interface MunicipalTopology {
  objects: { municipal: MunicipalCollection }
  transform?: unknown
}
export const loadGeo = () => get<MunicipalTopology>('geo.topo.json')
