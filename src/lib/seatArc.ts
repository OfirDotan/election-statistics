import { SEATS } from './mandates.ts'

export interface ArcPoint {
  /** Percent of the semicircle box, from its top-left corner (direction: ltr on the element, so RTL and LTR mirror) */
  x: number
  y: number
  /** Seats between this seat and position 0; 61 is the majority line */
  index: number
}

/**
 * `SEATS` seats fanned over a semicircle whose centre sits on the bottom edge, filled from both
 * outer ends inward like the plenary. `margin` (< 1) shrinks the radius so corner seats fit.
 */
export function seatArc(margin = 0.93): ArcPoint[] {
  return Array.from({ length: SEATS }, (_, i) => {
    const angle = ((SEATS - 1 - i) / (SEATS - 1)) * Math.PI
    return { x: 50 - 50 * margin * Math.cos(angle), y: 100 - 100 * margin * Math.sin(angle), index: i }
  })
}

