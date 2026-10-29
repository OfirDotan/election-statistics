/**
 * Published pre-election refusals between Knesset 26 lists, keyed by ballot letter (see `Party.key`).
 *
 * Only pairings a party stated publicly, in its own words, are listed. Deliberately left out because
 * the refusal was never stated for the pairing itself: Zionist Spirit (RZP–Zehut) never said it would
 * refuse Likud — its refusal was of Smotrich and Ben Gvir — and Likud never said it refused Democrats on
 * its own; Ra'am's public refusal was of Ben Gvir specifically, so it is filed under Otzma Yehudit.
 * Netanyah supporters in Likud and utj and Democrats as "not a partner" are common talking points but no
 * dated, attributable statement of a refusal to sit together was found, so there is no entry.
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
    a: 'ודם',
    b: 'עם',
    reason: {
      he: 'מנסור עבאס: "אף אחד לא צריך לבוא אליי בטענות שרע״מ תשב עם הציונות הדתית. זה לא יקרה, זה לא ראוי."',
      en: 'Mansour Abbas: "Nobody should come to me with complaints that Ra\'am will sit with Religious Zionism. It won\'t happen, it isn\'t appropriate."',
    },
    source: 'הארץ / Ynet, פרסומים סביב הבחירות לכנסת ה-26 (2026) — יש לאמת את הקישור המדויק',
  },
  {
    a: 'שס',
    b: 'אמת',
    reason: {
      he: 'אריה דרעי (ש"ס) הבהיר שהימין לא יוכל להקים ממשלה עם "הדמוקרטים" — גלגול מפלגת העבודה בראשות יאיר גולן.',
      en: 'Aryeh Deri (Shas) said the right could not form a government that includes the Democrats, the Labor successor led by Yair Golan.',
    },
    source: 'ערוץ 14 / ישראל היום, אמירות דרעי לפני הבחירות לכנסת ה-26 (2026) — יש לאמת את הקישור המדויק',
  },
]

/** The refusal between two lists, whichever was added last. */
export function refusalBetween(a: string, b: string): Refusal | undefined {
  return REFUSALS.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))
}
