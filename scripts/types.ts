// Baked output shapes, shared with src/lib.

export interface Town {
  code: number
  name: string
  /** Apparentment group this list belongs to, if any */
  apparentment?: string
  /** Null when no vote data exists for the locality */
  votes: {
    eligible: number
    voters: number
    valid: number
    invalid: number
    byParty: Record<string, number>
    /** 'kaplan' = town results; 'govmap' = turnout only, no breakdown */
    source: 'kaplan' | 'govmap'
  } | null
}

export interface Kalpi {
  code: number
  kalpi: string
  eligible: number
  voters: number
  percent: number
}

export interface Party {
  key: string
  name: string
  nameEn?: string
  /** Path under public/assets/parties, when a logo exists */
  logo?: string
  color: string
  /** 'approved' | 'withdrawn' | 'unknown' */
  status: string
  /** Votes across localities (excludes double-envelope ballots) */
  votes: number
  /** Official national total, double-envelope ballots included — the basis for seat allocation */
  nationalVotes: number
  leader?: { he: string; en?: string }
  candidates: number
}
