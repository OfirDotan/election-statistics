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
 * GovMap ships Israel's municipal shapes in Israel TM Grid metres (EPSG:2039), a flattened projection
 * in which Israel is a rectangle about 180 km × 480 km with its false northing removed. These constants
 * were fitted to this file: outline + bounding box of every ring, then a linear map onto lon/lat.
 */
const ITM = { kx: 1 / 88_000, ky: -0.887 / 88_000 }

/** Places the projected collection on the globe (linear fit from ITM metres to lon/lat) */
export function toWgs84(topo: MunicipalTopology, geo: MunicipalCollection): MunicipalCollection {
  const { scale, translate } = topo.transform
  // Every point in the file is an arc vertex: the deltas are cumulative, so the running sum is the grid coordinate
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const arc of topo.arcs) {
    let x = 0
    let y = 0
    for (const [dx, dy] of arc) {
      x += dx
      y += dy
      const gx = translate[0] + x * scale[0]
      const gy = translate[1] + y * scale[1]
      minX = Math.min(minX, gx)
      maxX = Math.max(maxX, gx)
      minY = Math.min(minY, gy)
      maxY = Math.max(maxY, gy)
    }
  }
  // Pin the box to Israel's true outline: its centre sits at 34.97°E, 31.05°N
  const mx = (minX + maxX) / 2
  const my = (minY + maxY) / 2
  const lon = (x: number) => 34.965 + (x - mx) * ITM.kx
  const lat = (y: number) => 31.05 + (y - my) * ITM.ky
  const move = (c: unknown): unknown => (Array.isArray(c) && typeof c[0] === 'number' ? [lon(c[0]), lat(c[1])] : (c as unknown[]).map(move))
  return {
    ...geo,
    // Municipal shapes are polygons or multipolygons; a GeometryCollection never appears here
    features: geo.features.map((f) => ({ ...f, geometry: f.geometry && ({ ...f.geometry, coordinates: move((f.geometry as Exclude<Geometry, { geometries: unknown }>).coordinates) } as Geometry) })),
  }
}
