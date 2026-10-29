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
  nameEn?: string
  /** URL segment for the party page: English, e.g. `likud` */
  slug?: string
  /** File name under assets/parties/, empty when the list has no logo */
  logo: string
  color: string
  /** 'approved' | 'withdrawn' | 'unknown' */
  status: string
  votes: number
  /** Official national total, double-envelope ballots included. Kaplan's per-list totals lack the double envelopes */
  nationalVotes?: number
  /** Share (percent) of Kaplan's national total, `אחר` folded in; TownPage deltas use it */
  nationalShare?: number
  leader?: { he: string; en?: string }
  candidates: number
  /** Seats from the official national votes; 0 for every list below the threshold */
  seats?: number
  /** Share (percent) of all valid votes (national table over town valid sums, `אחר` separated) */
  share?: number
  /** The list after its leader, in ballot order: candidates[0] is the leader, so seat N is candidates[N - 1] */
  candidateNames?: string[]
}

export interface Candidate {
  /** Name slug, e.g. `benjamin-netanyahu`, see personId */
  id: string
  party: string
  position: number
  nameHe: string
  nameEn?: string
  isLeader: boolean
  incumbent: boolean
  component?: string
}

/** Stable per-list-slot key: the same person is a different MK if they move on the list, so name is not part of it. */
export type MkProfile = {
  /** Same as the candidate id */
  id: string
  nameHe: string
  nameEn?: string
  /** Wikimedia Commons file name; rendered as a /thumb/ URL at the width the page needs */
  photo?: string
  photoCredit?: string
  birthYear?: number
  /** English; Hebrew in birthPlaceHe */
  birthPlace?: string
  birthPlaceHe?: string
  education?: string[]
  /** Hebrew; English in professionEn */
  profession?: string
  professionEn?: string
  /** Knesset terms served before the 26th */
  priorTerms?: string
  priorRoles?: string[]
  backgroundHe?: string
  backgroundEn?: string
  sources: string[]
}
