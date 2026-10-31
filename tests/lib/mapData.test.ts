import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { labelPoints, toWgs84, type MunicipalTopology } from '../../src/lib/mapData.ts'
import type { Polygon } from 'geojson'

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
