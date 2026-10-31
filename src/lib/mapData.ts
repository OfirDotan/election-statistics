import type { FeatureCollection, Geometry, Point } from 'geojson'

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
export const loadCountry = async (): Promise<FeatureCollection<Geometry>> => {
  const [country, topo] = await Promise.all([get<FeatureCollection<Geometry>>('geo/israel.geojson'), loadGeo()])
  return shoreline(country, toWgs84(topo))
}
export const loadLabels = () => loadGeo().then(labelPoints)
// GovMap's TopoJSON holds a GeometryCollection, which topojson-specification can type, but its
// properties shape is specific to this file, so the object is described locally.
export interface MunicipalTopology {
  objects: { municipal: { geometries: ({ arcs: number[][] | number[][][]; type: 'Polygon' | 'MultiPolygon'; properties: MunicipalProps })[] } }
  arcs: [number, number][][]
  transform: { scale: [number, number]; translate: [number, number] }
}

/**
 * GovMap ships Israel's municipal shapes in grid metres with the false northing removed: the origin
 * is the country outline's south-west corner, Eilat. The grid is not northing-up (it runs south) and
 * carries a rotation against Web Mercator, so both axes go through one affine fit to Mercator metres.
 * The fit is least squares over the grid centroid of 15 well-known towns against their real position,
 * leaving the centroids within ~4 km except Eilat (12 km) and the Negev ridge spots (~8 km).
 */
const R = 6_378_137
const lat0 = 32.5 * (Math.PI / 180)
const lon = (x: number, y: number) => ((-874.31 + 0.842_278 * (x - 3_895_697.45) - 0.002_705 * (y - 3_761_333.67)) / R / Math.cos(lat0)) * (180 / Math.PI) + 35
const lat = (x: number, y: number) => Math.atan(Math.sinh((3_761_304.69 - 0.004_081 * (x - 3_895_697.45) + 1.004_473 * (y - 3_761_333.67)) / R)) * (180 / Math.PI)
/**
 * Places the topology on the globe (grid metres to lon/lat, the fit above). TopoJSON arcs are quantised
 * deltas: decode them to absolute grid metres first, then fit each point on its own.
 */
export function toWgs84(topo: MunicipalTopology): MunicipalCollection {
  const [kx, ky] = topo.transform.scale
  const [dx, dy] = topo.transform.translate
  const arcs = topo.arcs.map((arc) => {
    let x = 0
    let y = 0
    return arc.map(([ax, ay]) => ((x += ax), (y += ay), [x * kx + dx, y * ky + dy]))
  })
  // Mercator metres east of 35°E; grid northing runs south, so the Y coefficient is negative
  // Joined and wound as topojson-client does: drop the shared point, a negative index reverses the arc
  const line = (ids: number[]) => {
    const out: number[][] = []
    for (const id of ids) {
      const arc = arcs[id < 0 ? ~id : id].map((p) => [lon(p[0], p[1]), lat(p[0], p[1])])
      if (out.length) arc.shift()
      if (id < 0) arc.reverse()
      out.push(...arc)
    }
    return out
  }
  const ring = (ids: number[]) => {
    const r = line(ids)
    while (r.length < 4) r.push(r[0])
    return r
  }
  return {
    type: 'FeatureCollection',
    features: topo.objects.municipal.geometries.map((g) => ({
      type: 'Feature',
      properties: g.properties,
      // Municipal shapes are polygons or multipolygons
      geometry: { type: g.type, coordinates: g.type === 'Polygon' ? (g.arcs as number[][]).map(ring) : (g.arcs as number[][][]).map((poly) => poly.map((ids) => ring(ids))) } as Geometry,
    })),
  }
}
/**
 * A point per town for the map labels. Kaplan puts each label where the town's number sits on its
 * ballot box list, always inside the town, and does not publish those points; the centre of the
 * shape can land outside a crescent-shaped town, so the stack of horizontal slices that contains
 * the most of the shape is taken and the middle of it is the point.
 */
export function labelPoints(topo: MunicipalTopology): FeatureCollection<Point, MunicipalProps> {
  const [kx, ky] = topo.transform.scale
  const [dx, dy] = topo.transform.translate
  const grid: number[][][] = topo.arcs.map((arc) => {
    let x = 0
    let y = 0
    return arc.map(([ax, ay]) => ((x += ax), (y += ay), [x * kx + dx, y * ky + dy]))
  })
  const ring = (ids: number[]) => {
    const out: number[][] = []
    for (const id of ids) {
      const arc = grid[id < 0 ? ~id : id].map((p) => [p[0], p[1]])
      if (out.length) arc.shift()
      if (id < 0) arc.reverse()
      out.push(...arc)
    }
    // Closed: the crossing count needs a last point joining back to the first
    return [...out, out[0]]
  }
  // The runs of a slice at height y, as [x from, x to] in ascending order
  const runs = (rings: number[][][], y: number) => {
    const xs: number[] = []
    for (const r of rings) {
      for (let i = 1; i < r.length; i++) {
        const [x1, y1] = r[i - 1]
        const [x2, y2] = r[i]
        if (y1 <= y !== y2 <= y) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1))
      }
    }
    xs.sort((a, b) => a - b)
    return xs.filter((_, i) => i % 2 === 0).map((x, i): [number, number] => [x, xs[2 * i + 1]])
  }
  return {
    type: 'FeatureCollection',
    features: topo.objects.municipal.geometries.map((g) => {
      // Every ring of every polygon, closed
      const polys = (g.type === 'Polygon' ? [g.arcs] : g.arcs) as number[][][]
      const rings = polys.flat().map((ids) => ring(ids as number[]))
      const ys = rings[0].map((p) => p[1])
      const min = Math.min(...ys)
      const max = Math.max(...ys)
      // 40 slices across the shape; the widest run of all is the place. Even-odd counting needs every
      // ring at once: a hole splits its slice, so a run inside another would then never come up
      let best: [number, number, number] = [-1, (min + max) / 2, 0]
      for (let i = 0; i < 40; i++) {
        const y = min + ((i + 0.5) * (max - min)) / 40
        for (const [a, b] of runs(rings, y)) if (b - a > best[0]) best = [b - a, y, (a + b) / 2]
      }
      return { type: 'Feature', properties: g.properties, geometry: { type: 'Point', coordinates: [lon(best[2], best[1]), lat(best[2], best[1])] } }
    }),
  }
}

/**
 * The country outline with its coast redrawn from the towns' own shapes. The outline's coast is too
 * coarse for the towns drawn on it (Eilat's tip misses by ~0.5 km), so every outline vertex on the
 * Mediterranean and the Gulf of Aqaba takes the nearest town edge; the land borders to Egypt, Jordan
 * and the West Bank stay as the outline has them.
 *
 * The towns' coastline is the truth here (the sea ends where they do), but 1-3 km away from it the
 * outline only bounds a pan and nothing is drawn there, so a moved vertex may stray that far.
 */
export function shoreline(country: FeatureCollection<Geometry>, geo: MunicipalCollection): FeatureCollection<Geometry> {
  // Every town's coastline: its vertices, and its edges, each from a vertex of its own
  const pts: number[][] = []
  const segs: [number[], number[]][] = []
  for (const f of geo.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []
    // Polygon: one ring list; MultiPolygon: a list of them
    for (const rings of polys as unknown as number[][][][]) {
      for (const ring of rings) {
        pts.push(...ring)
        for (let i = 1; i < ring.length; i++) segs.push([ring[i - 1], ring[i]])
      }
    }
  }
  const km = (p: number[], q: number[]) => Math.hypot((p[0] - q[0]) * 89, (p[1] - q[1]) * 111)
  // 5 km only: a coast vertex further than that from the nearest town is not on that town's coast
  const x = (lon: number) => Math.floor(lon * 89)
  const y = (lat: number) => Math.floor(lat * 111)
  const put = <T>(m: Map<number, T[]>, k: number, t: T) => m.set(k, [...(m.get(k) ?? []), t])
  const near = new Map<number, number[][]>()
  // An edge is filed under the cell of its start, and only looked for from within 5 km of that start:
  // the part of it nearest a point there is then within 5 km of the start too
  const from = new Map<number, [number[], number[]][]>()
  for (const p of pts) put(near, x(p[0]) * 1000 + y(p[1]), p)
  for (const [a, b] of segs) put(from, x(a[0]) * 1000 + y(a[1]), [a, b])
  const nearest = (p: number[]) => {
    let best = p
    let at = Infinity
    const found: [number[], number[]][] = []
    for (let i = x(p[0]) - 5; i <= x(p[0]) + 5; i++) {
      for (let j = y(p[1]) - 5; j <= y(p[1]) + 5; j++) {
        for (const q of near.get(i * 1000 + j) ?? []) {
          const d = km(p, q)
          if (d < at) [best, at] = [q, d]
        }
        found.push(...(from.get(i * 1000 + j) ?? []))
      }
    }
    for (const [a, b] of found) {
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
      const d = km(p, [a[0] + t * dx, a[1] + t * dy])
      if (d < at) [best, at] = [[a[0] + t * dx, a[1] + t * dy], d]
    }
    return best
  }
  // South of Netanya is Mediterranean coast and the Gulf; up to Rosh Hanikra the coast runs west of 35.08
  const sea = (p: number[]) => (p[1] < 32.33 && p[0] < 35.0) || (p[1] < 33.1 && p[0] < 35.08)
  const ring = country.features[0]?.geometry
  if (ring?.type !== 'Polygon') return country
  // New points, never the caller's own: so the outline as loaded stays as it was
  const coordinates = ring.coordinates.map((r: number[][]) => r.map((p) => (sea(p) ? nearest(p) : p))) as unknown as typeof ring.coordinates
  return { ...country, features: [{ ...country.features[0], geometry: { type: 'Polygon', coordinates } }] }
}
