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
  /** URL segment: the party's main English name, e.g. `likud` */
  slug: string
  name: string
  nameEn?: string
  /** File name under assets/parties/, empty when the list has no logo */
  logo: string
  color: string
  /** 'approved' | 'withdrawn' | 'unknown' */
  status: string
  /** Votes across localities (excludes double-envelope ballots) */
  votes: number
  /** Official national total, double-envelope ballots included — the basis for seat allocation */
  nationalVotes: number
  leader?: { he: string; en?: string }
  candidates: number
  /** Seats from the official national votes; 0 for every list below the threshold */
  seats?: number
  /** Share (percent) of all valid votes; nationalShare is the same off Kaplan's table with `אחר` folded in */
  share?: number
  /** The list after its leader, in ballot order: candidates[0] is the leader, so seat N is candidates[N - 1] */
  candidateNames?: string[]
}
