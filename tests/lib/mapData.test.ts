import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { labelPoints, mainland, shoreline, toWgs84, type MunicipalTopology } from '../../src/lib/mapData.ts'
import type { FeatureCollection, Geometry, MultiLineString, Polygon } from 'geojson'

const topo: MunicipalTopology = JSON.parse(readFileSync(new URL('../../public/data/geo.topo.json', import.meta.url), 'utf8'))

const inside = (x: number, y: number, rings: number[][][]) => {
  let c = false
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const [x1, y1] = r[i]
      const [x2, y2] = r[(i + 1) % r.length]
      if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c
    }
  }
  return c
}

describe('labelPoints', () => {
  const shapes = new Map(toWgs84(topo).features.map((f) => [f.properties.SETL_CODE, f.geometry]))
  const points = labelPoints(topo)

  it('gives every town a point inside its own shape', () => {
    expect(points.features).toHaveLength(shapes.size)
    const out = points.features.filter((f) => {
      const g = shapes.get(f.properties.SETL_CODE) as Polygon | undefined
      const polys = g ? (g.type === 'Polygon' ? [g.coordinates] : (g as unknown as { coordinates: number[][][][] }).coordinates) : []
      const [x, y] = f.geometry.coordinates
      return !polys.some((poly) => inside(x, y, poly as number[][][]))
    })
    expect(out.map((f) => f.properties.SETL_CODE)).toEqual([])
  })
})

describe('mainland', () => {
  const country: FeatureCollection<Geometry> = JSON.parse(readFileSync(new URL('../../public/geo/israel.geojson', import.meta.url), 'utf8'))
  const [ours, bank] = mainland(toWgs84(topo), country).features.map((f) => (f.geometry as MultiLineString).coordinates[0])
  it('walks the towns of each side of the line as one line', () => {
    expect(ours.length).toBeGreaterThan(bank.length)
    // From the western Negev to the Galilee: the towns a ballot reaches
    expect(ours.some(([x, y]) => x > 35 && y > 33)).toBe(true)
    expect(bank.some(([x]) => x > 35)).toBe(true)
    for (const l of [ours, bank]) expect(Math.min(...l.map((p) => p[0]))).toBeGreaterThan(34.2)
  })
})

describe('shoreline', () => {
  it('puts the coast on the towns and leaves the land borders alone', () => {
    const country: FeatureCollection<Geometry> = JSON.parse(readFileSync(new URL('../../public/geo/israel.geojson', import.meta.url), 'utf8'))
    const before = (country.features[0].geometry as Polygon).coordinates[0] as number[][]
    const after = (shoreline(country, toWgs84(topo)).features[0].geometry as Polygon).coordinates[0] as number[][]
    const km = (p: number[], q: number[]) => Math.hypot((p[0] - q[0]) * 89, (p[1] - q[1]) * 111)
    const moved = before.map((p, i) => [p, after[i], km(p, after[i])] as const).filter((x) => x[2] > 1e-9)
    for (const [p] of moved) expect((p[1] < 32.33 && p[0] < 35.0) || (p[1] < 33.1 && p[0] < 35.08)).toBe(true)
    // Eilat's tip, the towns and the Gulf its shapes leave out
    expect(moved.filter((x) => x[0][1] < 29.6).length).toBeGreaterThan(5)
  })
})
