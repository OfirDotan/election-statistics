import type { FeatureCollection, Geometry, MultiLineString, Point, Polygon } from 'geojson'

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

/**
 * The area the towns cover, as the lines round it: ours, and the West Bank's, whose villages no ballot
 * reaches. A country alone has the villages that are no shape at all sitting outside it, so every 5 km
 * square of the map that holds a town's corner is taken, minus the squares with a square's width of their
 * own free around them; a square is ours or theirs, whichever side of the West Bank's border its middle
 * falls. Lines, not shapes: the land is drawn as a wide stroke on them, which fills round the holes instead
 * of across them, so the sea and the gaps in the towns show the tiles under them.
 */
export function mainland(geo: MunicipalCollection, country: FeatureCollection<Geometry>): FeatureCollection<MultiLineString, { westBank: boolean }> {
  const polys = (f: MunicipalCollection['features'][number]) =>
    (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []) as unknown as number[][][][]
  // 1 km² at least: a few dozen shapes are car parks, farmland and rigs, not towns
  const area = (r: number[][]) => Math.abs(r.reduce((s, p, i) => s + (r[i + 1] ?? r[0])[0] * p[1] - p[0] * (r[i + 1] ?? r[0])[1], 0)) / 2
  // Mercator metres, which is what the map draws in: a square on the map is a cell
  const mx = (lon: number) => (lon * Math.PI * 6_378_137) / 180
  const my = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 6_378_137
  const CELL = 5_000
  const cell = new Set<number>()
  for (const f of geo.features.filter((f) => polys(f).some((p) => area(p[0]) * 89 * 111 >= 1)))
    for (const p of polys(f).flatMap((r) => r.flat())) cell.add(Math.floor(mx(p[0]) / CELL) * 100_000 + Math.floor(my(p[1]) / CELL))
  // A square with a square's width of its own free on any side is left out: a corner of one off a cell
  // that stays goes too, so the outline is the edge of the squares left
  for (const k of [...cell]) {
    const i = Math.floor(k / 100_000)
    const j = k % 100_000
    if ([-2, 2].some((d) => [[i + d, j], [i, j + d], [i + d, j + d], [i + d, j - d]].every(([a, b]) => !cell.has(a * 100_000 + b)))) cell.delete(k)
  }
  const ll = (p: number[]) => [((p[0] / 6_378_137) * 180) / Math.PI, (Math.atan(Math.sinh(p[1] / 6_378_137)) * 180) / Math.PI]
  const line = bankLine(country)
  // The edge of the squares: the sides that face a square left out, walked as one line round them. At each
  // corner the walk takes the side that keeps the squares left, so it circles the outside of every hole and
  // never crosses back along itself; a stroke on it fills the squares' area and runs out at no corner
  type Dir = 0 | 1 | 2 | 3
  type Side = { s: string; e: string; d: Dir }
  const edge = (cells: Set<number>) => {
    const key = (x: number, y: number) => `${x},${y}`
    // A side goes east, north, west or south from its start, a cell corner: direction and end
    const side = (a: number[], b: number[]) => ({ s: key(a[0], a[1]), e: key(b[0], b[1]), d: (b[0] > a[0] ? 0 : b[1] < a[1] ? 1 : b[0] < a[0] ? 2 : 3) as Dir })
    const sides: Side[] = []
    for (const k of cells) {
      const [x, y] = [Math.floor(k / 100_000), k % 100_000]
      // A square's left, right, top and bottom sides, each only where the square next to it is left out; each
      // runs so that this square is on its left
      for (const [dx, dy, a, b] of [
        [-1, 0, [x, y], [x, y + 1]],
        [1, 0, [x + 1, y + 1], [x + 1, y]],
        [0, -1, [x + 1, y], [x, y]],
        [0, 1, [x, y + 1], [x + 1, y + 1]],
      ] as [number, number, number[], number[]][])
        if (!cells.has((x + dx) * 100_000 + y + dy)) sides.push(side(a, b))
    }
    // The sides leaving each point
    const sidesAt = new Map<string, Side[]>()
    for (const s of sides) sidesAt.set(s.s, [...(sidesAt.get(s.s) ?? []), s])
    const pts: number[][] = []
    const done = new Set<string>()
    let ends = 0
    for (const { s, d } of sides) {
      if (done.has(`${s}|${d}`)) continue
      let [p, dir]: [string, Dir] = [s, d]
      while (!done.has(`${p}|${dir}`) && ends++ < 5_000) {
        done.add(`${p}|${dir}`)
        const [x, y] = p.split(',').map(Number)
        pts.push(ll([x * CELL, y * CELL]))
        // The side that keeps the squares left: the first leaving here clockwise past the one came in by, or
        // when there is none, the first of all of them, since the squares on it are left by its other side
        const here = sidesAt.get(p) ?? []
        const back = ((dir + 2) % 4) as Dir
        const turn = [...Array(4)].map((_, i) => (back + 1 + i) % 4).flatMap((dd) => here.filter((h) => h.d === dd))
        const on = turn[0] ?? here[0]
        if (!on) break
        p = on.e
        dir = on.d
      }
    }
    // Back to where it started, so the last side of a loop is drawn too
    return [pts]
  }
  // Ours first, the West Bank's after
  const side = [new Set<number>(), new Set<number>()]
  for (const k of cell) side[eastOf(line, ll([Math.floor(k / 100_000) * CELL + CELL / 2, (k % 100_000) * CELL + CELL / 2])) ? 1 : 0].add(k)
  return {
    type: 'FeatureCollection',
    features: side.map((s, i) => ({ type: 'Feature', properties: { westBank: i === 1 }, geometry: { type: 'MultiLineString', coordinates: edge(s) } })),
  }
}
export function eastOf(bank: number[][], [x, y]: number[]): boolean {
  // The point of the line at the point's height
  const k = bank.findIndex((p) => p[1] >= y)
  if (k < 0) return false
  const [a, b] = [bank[Math.max(k - 1, 0)], bank[k]]
  return x > a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1] || 1)
}
/**
 * The country's line over the West Bank, south to north: from the border's middle at the sea, up the
 * Jordan, to Jordan's mouth at Lubia. Its last stretch to the sea at Netanya is left off.
 */
export function bankLine(country: FeatureCollection<Geometry>): number[][] {
  const line = ((country.features[0]?.geometry as Polygon | undefined)?.coordinates[0] ?? []) as number[][]
  const east = line.findIndex((p) => p[1] < 29.6 && p[0] < 34.96)
  return line.slice(east, line.findLastIndex((p) => p[1] > 31.55 && p[0] < 35.0) + 1).reverse()
}
