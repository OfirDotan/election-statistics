/**
 * Published pre-election refusals between Knesset 26 lists, keyed by ballot letter (see `Party.key`).
 *
 * Each entry should be a pairing a party stated publicly. The single entry below is not: no dated,
 * attributable statement of a refusal to sit was found for any pairing, so it is flagged as unverified
 * in its own reason and source rather than presented as a quote. Everything else is left out for the
 * same reason (RZP–Zehut never refused Likud, only Smotrich and Ben Gvir; "Democrats is not a partner"
 * is a talking point without a dated statement). Add pairs only with a real outlet and date.
 *
 * Every entry is order-independent (see `refusalBetween`): a party that refuses to sit refuses both ways.
 */

export interface Refusal {
  /** Ballot letters, either order */
  a: string
  b: string
  reason: { he: string; en: string }
  /** Outlet + date of the statement */
  source: string
}

export const REFUSALS: Refusal[] = [
  {
    a: 'עם',
    b: 'ב',
    reason: {
      he: 'רע״ם והציונות הדתית של בן גביר אינן מתחרות על אותו קהל אלא על עמדות מנוגדות: בן גביר הגיש לוועדת הבחירות בקשה לפסול את רע״ם, ורע״ם הציגה לימוד את הוצאת עוצמה יהודית מהממשלה כהישג.',
      en: "Ra'am and Ben-Gvir's Otzma Yehudit hold opposite positions: Ben-Gvir petitioned the Election Committee to disqualify Ra'am, and Ra'am campaigned on Otzma Yehudit staying out of any government. NEITHER PARTY HAS PUBLICLY CONFIRMED A REFUSAL TO SIT TOGETHER — this pairing is the obvious clash, not a cited statement.",
    },
    source: 'NOT A CITED STATEMENT — both parties passed each other up; verify before relying on it',
  },
]

/** The refusal between two lists, whichever was added last. */
export function refusalBetween(a: string, b: string): Refusal | undefined {
  return REFUSALS.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))
}
