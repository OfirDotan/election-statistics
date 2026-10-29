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

const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(import.meta.env.BASE_URL + path)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const loadTowns = () => get<Town[]>('data/towns.json')
export const loadParties = () => get<Party[]>('data/parties.json')
export const loadGeo = () => get<MunicipalTopology>('data/geo.topo.json')
// Country outline: the municipal shapes only touch at corners, so their union has no edge to stroke
export const loadCountry = () => get<FeatureCollection<Geometry>>('geo/israel.geojson')
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
 * Galilee, so both axes share one affine fit (U ~ Web Mercator metres of 32.5°N) against the country
 * outline: coast and border vertices of the country GeoJSON are paired with the nearest town vertex by
 * northing, then least squares on the pairs. Residuals stay under a metre. The easting has a metrically
 * exact fit; the grid skews by 0.006° of longitude from south to north, and northing runs straight up in Mercator.
 */
/** Places the projected collection on the globe (grid metres to lon/lat, see the fit above) */
export function toWgs84(geo: MunicipalCollection): MunicipalCollection {
  const lon = (x: number, y: number) => 34.902_710_8 + (x - 3_958_559.2) / 95_112.3 + 0.00616 * ((3_625_574.8 - y) / 95_112.3)
  const lat = (y: number) => ((2 * Math.atan(Math.exp((y - 3_456_960.5) / 6_378_137)) - Math.PI / 2) * 180) / Math.PI
  const move = (c: unknown): unknown => (Array.isArray(c) && typeof c[0] === 'number' ? [lon(c[0], c[1]), lat(c[1])] : (c as unknown[]).map(move))
  return {
    ...geo,
    // Municipal shapes are polygons or multipolygons; a GeometryCollection never appears here
    features: geo.features.map((f) => ({ ...f, geometry: f.geometry && ({ ...f.geometry, coordinates: move((f.geometry as Exclude<Geometry, { geometries: unknown }>).coordinates) } as Geometry) })),
  }
}
