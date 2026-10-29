import type { FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection } from 'topojson-specification'

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
export const loadGeo = () => get<MunicipalTopology>('geo.topo.json')
// GovMap's TopoJSON holds a GeometryCollection, which topojson-specification can type, but its
// properties shape is specific to this file, so the object is described locally.
export interface MunicipalTopology {
  objects: { municipal: GeometryCollection<MunicipalProps> }
  arcs: [number, number][][]
  transform: { scale: [number, number]; translate: [number, number] }
}

/**
 * GovMap ships Israel's municipal shapes in grid metres: a flattened projection in which Israel is a
 * rectangle about 180 km × 480 km with its false northing removed. A linear fit put Beer Sheva in
 * Galilee, so the northing is placed by Mercator instead, fitted on two anchors from this file:
 * מטולה 33.279°N at y 3,932,334 and אילת 29.557°N at y 3,456,690. Northing grows north.
 * Easting is linear: אשדוד at 3858470 is 34.768°E, and one degree at 31° is 95,112 m.
 */
const KY = (Math.log(Math.tan(Math.PI / 4 + (33.279 * Math.PI) / 360)) - Math.log(Math.tan(Math.PI / 4 + (29.557 * Math.PI) / 360))) / (3_932_334.6 - 3_456_690.5)
const KC = Math.log(Math.tan(Math.PI / 4 + (33.279 * Math.PI) / 360)) - KY * 3_932_334.6

/** Places the projected collection on the globe (grid metres to lon/lat, see the anchors above) */
export function toWgs84(geo: MunicipalCollection): MunicipalCollection {
  const lon = (x: number) => 34.7676 + (x - 3_858_470.7) / 95_112.3
  const lat = (y: number) => ((2 * Math.atan(Math.exp(KY * y + KC)) - Math.PI / 2) * 180) / Math.PI
  const move = (c: unknown): unknown => (Array.isArray(c) && typeof c[0] === 'number' ? [lon(c[0]), lat(c[1])] : (c as unknown[]).map(move))
  return {
    ...geo,
    // Municipal shapes are polygons or multipolygons; a GeometryCollection never appears here
    features: geo.features.map((f) => ({ ...f, geometry: f.geometry && ({ ...f.geometry, coordinates: move((f.geometry as Exclude<Geometry, { geometries: unknown }>).coordinates) } as Geometry) })),
  }
}
