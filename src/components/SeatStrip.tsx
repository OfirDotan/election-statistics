import { readableOn } from '../lib/mapLogic.ts'
import { SEATS } from '../lib/mandates.ts'

export interface SeatBlock {
  key: string
  seats: number
  color?: string
  label: string
}

/** The 120-seat chart: one segment per party, sized by seats, each labelled with the seat count. */
export function SeatStrip({ blocks, label }: { blocks: SeatBlock[]; label: string }) {
  const total = blocks.reduce((s, b) => s + b.seats, 0)
  const empty = Math.max(0, SEATS - total)
  return (
    <>
      <div className="seat-strip" role="img" aria-label={`${label}: ${blocks.map((b) => `${b.label} ${b.seats}`).join(', ')}`}>
        {blocks
          .filter((b) => b.seats > 0)
          .map((b) => (
            <span
              key={b.key}
              className="seat-block"
              style={{ inlineSize: `${(b.seats / SEATS) * 100}%`, background: b.color ?? '#9E9E9E', color: readableOn(b.color ?? '#9E9E9E') }}
              title={`${b.label}: ${b.seats}`}
            >
              {b.seats}
            </span>
          ))}
        {empty > 0 && <span className="seat-block seat-empty" style={{ inlineSize: `${(empty / SEATS) * 100}%` }} />}
      </div>
    </>
  )
}
