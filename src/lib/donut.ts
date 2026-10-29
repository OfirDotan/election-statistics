import { SEATS } from './mandates.ts'

export type Seat = { row: number; side: 'left' | 'right'; cx: number; cy: number; size: number }

const ROWS = 5
const R0 = 48 // innermost row radius
const STEP = 10 // row pitch
export const SIZE = 7.5 // seat square; rows are 2.5 apart, so neighbours never touch
// seating arc: ±12° either side of the middle line down to the floor
const ARC = (70 * Math.PI) / 180

/** `total` seats shared across the five rows in proportion to their arc length, each row even */
export function rowSizes(total: number = SEATS) {
  const weights = Array.from({ length: ROWS }, (_, r) => R0 + r * STEP)
  const sum = weights.reduce((a, b) => a + b, 0)
  const sizes = weights.map((w) => Math.floor((total * w) / sum / 2) * 2)
  // hand out what is left, a pair at a time from the outer rows in, so every row stays even
  for (let i = ROWS - 1; sizes.reduce((a, b) => a + b, 0) < total; i = i === 0 ? ROWS - 1 : i - 1) sizes[i] += 2
  // an odd total overflows by one: drop it from the aisle end of the widest half-row
  if (sizes.reduce((a, b) => a + b, 0) > total) sizes[ROWS - 1]--
  return sizes
}

/** The chamber: `total` seats (120 by default), 5 rows, each split evenly left and right of the aisle */
export function chamber(total: number = SEATS): Seat[] {
  const seats: Seat[] = []
  for (const [row, n] of rowSizes(total).entries()) {
    const r = R0 + row * STEP
    // a lone seat in a row sits on the right, nearest the aisle
    const half = Math.ceil(n / 2)
    const sideSeats = (side: 'left' | 'right') => (side === 'left' ? Math.floor(n / 2) : half)
    // a quarter-slot of aisle at the top and again at the floor, the rest shared by the seats
    const step = ARC / (half + 0.5)
    // seat square: 80% of its slot's chord, so neighbours keep clear air
    const size = Math.min(SIZE, step * r * 0.8)
    // each side starts just off the aisle (90°) and works round toward the floor, ending a quarter-slot short
    for (const side of ['left', 'right'] as const) {
      const from = side === 'right' ? 0 : Math.PI
      for (let k = 0; k < sideSeats(side); k++) {
        const a = Math.PI / 2 - step * (k + 0.75)
        seats.push({ row, side, cx: +(r * Math.cos(from - a)).toFixed(2), cy: +(-r * Math.sin(a)).toFixed(2), size: +size.toFixed(2) })
      }
    }
  }
  return seats
}
