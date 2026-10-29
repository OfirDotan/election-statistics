// Interface-only copies: tsconfig.app compiles src with allowImportingTsExtensions, and a
// re-export from scripts/ would let tsc -b type-check scripts output under the app config.
// Keep in sync with scripts/types.ts.

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
  color: string
  /** 'approved' | 'withdrawn' | 'unknown' */
  status: string
  votes: number
  leader?: { he: string; en?: string }
  candidates: number
}

