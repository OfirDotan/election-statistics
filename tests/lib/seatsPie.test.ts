import { describe, expect, it } from 'vitest'

// Mirrors slicePaths() in src/components/SeatsPie.tsx: paths are string maths, so check the angles
// the helper emits rather than render React here
const TAU = Math.PI * 2
const at = (a: number) => `${Math.cos(a).toFixed(4)} ${Math.sin(a).toFixed(4)}`

function slicePaths(seats: number[]): string[] {
  const total = seats.reduce((s, n) => s + n, 0)
  let angle = -Math.PI / 2
  return seats.map((n) => {
    const sweep = (n / total) * TAU
    const from = at(angle)
    angle += sweep
    const arc = `A 1 1 0 ${sweep > Math.PI ? 1 : 0} 1`
    return sweep >= TAU ? `M ${from} ${arc} ${at(Math.PI)} ${arc} ${at(-Math.PI / 2)} Z` : `M 0 0 L ${from} ${arc} ${at(angle)} Z`
  })
}

describe('seats pie slices', () => {
  it('starts at 12 o’clock and closes the circle', () => {
    const paths = slicePaths([48, 30, 12])
    // 48 of 90 seats is 192°: past half a turn, so the large-arc flag is 1
    expect(paths[0]).toBe(`M 0 0 L 0.0000 -1.0000 A 1 1 0 1 1 -0.2079 0.9781 Z`)
    // the last slice ends exactly where the first began
    expect(paths[2].endsWith('0.0000 -1.0000 Z')).toBe(true)
    expect(paths.join('').match(/ A 1 1 0 1 1 /g)).toHaveLength(1)
  })

  it('draws a lone party as a ring of two arcs, not a zero-length wedge', () => {
    const [d] = slicePaths([120])
    expect(d.match(/A 1 1 0 1 1/g)).toHaveLength(2)
    expect(d).not.toContain('L')
  })
})
