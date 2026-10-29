// Concrete 2026 dilemmas: each is an either/or the campaign and the 26th Knesset actually argued over,
// with its two ends labelled. Score 0 = fully the left pole, 100 = fully the right pole, 50 = a
// documented split. A party with no evidence for a dilemma simply has no entry for it.
export interface Dilemma {
  key: string
  he: string
  en: string
  leftHe: string
  leftEn: string
  rightHe: string
  rightEn: string
}

export const DILEMMAS: Dilemma[] = [
  {
    key: 'draft',
    he: 'חוק הגיוס',
    en: 'Haredi draft law',
    leftHe: 'פטור לבחורי ישיבה',
    leftEn: 'Yeshiva exemption',
    rightHe: 'גיוס חובה לכולם',
    rightEn: 'Draft for everyone',
  },
  {
    key: 'judiciary',
    he: 'הרפורמה המשפטית',
    en: 'Judicial overhaul',
    leftHe: 'בג"ץ חזק',
    leftEn: 'Strong High Court',
    rightHe: 'עליונות הכנסת',
    rightEn: 'Knesset supremacy',
  },
  {
    key: 'gaza',
    he: 'עזה',
    en: 'Gaza',
    leftHe: 'עסקה וסיום המלחמה',
    leftEn: 'Deal, end the war',
    rightHe: 'לחימה עד הכרעה',
    rightEn: 'Fight to victory',
  },
  {
    key: 'palestine',
    he: 'מדינה פלסטינית',
    en: 'Palestinian state',
    leftHe: 'שתי מדינות בגבולות 67',
    leftEn: 'Two states, 1967 lines',
    rightHe: 'התנגדות מוחלטת',
    rightEn: 'Absolutely opposed',
  },
  {
    key: 'settlements',
    he: 'יהודה ושומרון',
    en: 'Judea and Samaria',
    leftHe: 'פינוי ועצירת סיפוח',
    leftEn: 'Evacuate, halt annexation',
    rightHe: 'ריבונות ישראלית',
    rightEn: 'Israeli sovereignty',
  },
  {
    key: 'yeshivaBudgets',
    he: 'תקציבי הישיבות',
    en: 'Yeshiva budgets',
    leftHe: 'בלי מימון ציבורי',
    leftEn: 'No public funding',
    rightHe: 'תקצוב מלא',
    rightEn: 'Full funding',
  },
  {
    key: 'religionState',
    he: 'תחבורה בשבת ונישואים אזרחיים',
    en: 'Shabbat transit & civil marriage',
    leftHe: 'הפרדת דת ומדינה',
    leftEn: 'Separate religion & state',
    rightHe: 'שימור הסטטוס-קוו',
    rightEn: 'Keep the status quo',
  },
  {
    key: 'taxes',
    he: 'מיסים ויוקר המחיה',
    en: 'Taxes & cost of living',
    leftHe: 'שירותים ופיקוח מחירים',
    leftEn: 'Services & price controls',
    rightHe: 'הורדת מיסים והפרטה',
    rightEn: 'Cut taxes, less state',
  },
  {
    key: 'arabCoalition',
    he: 'מפלגות ערביות בקואליציה',
    en: 'Arab parties in the coalition',
    leftHe: 'שותפות לגיטימית',
    leftEn: 'A legitimate partner',
    rightHe: 'לא בקואליציה',
    rightEn: 'Not in the coalition',
  },
  {
    key: 'equality',
    he: 'שוויון לערבים וחוק הלאום',
    en: 'Arab equality & Nation-State Law',
    leftHe: 'ביטול החוק ושוויון',
    leftEn: 'Repeal it, full equality',
    rightHe: 'מדינה יהודית',
    rightEn: 'A Jewish state',
  },
]

export interface PartyStance {
  camp: 'left' | 'centre' | 'right' | 'arab' | 'haredi' | 'religious-zionist'
  campNoteHe: string
  campNoteEn: string
  stances: Record<string, { score: number; source: string; basis: string }>
}

// Scores are an editorial read of the cited source, not a poll.
export const STANCES: Record<string, PartyStance> = {
  מחל: {
    camp: 'right',
    campNoteHe: 'מפלגת השלטון בראשות נתניהו; הקמפיין על ביטחון, ריבונות ביהודה ושומרון והמשך הרפורמה המשפטית',
    campNoteEn: "Netanyahu's governing party; campaign on security, sovereignty in Judea and Samaria and continuing the judicial overhaul",
    stances: {
      draft: {
        score: 65,
        source: 'https://bhirot26.online/party/likud',
        basis: 'התנגדות לחוק גיוס עם סנקציות אישיות; רק "קידום חוק גיוס מרוכך עם יעדים הדרגתיים"',
      },
      judiciary: {
        score: 95,
        source: 'https://bhirot26.online/party/likud',
        basis: '"שינוי הרכב הוועדה לבחירת שופטים, צמצום עילת הסבירות והגבלת ביקורת בג\'ץ"',
      },
      palestine: {
        score: 95,
        source: 'https://bhirot26.online/party/likud',
        basis: 'התנגדות למדינה פלסטינית, כולל על חשבון נורמליזציה עם סעודיה ("טראמפ לא שאל אותי")',
      },
      settlements: {
        score: 85,
        source: 'https://bhirot26.online/party/likud',
        basis: '"הרחבת ההתיישבות ביהודה ושומרון; פתיחות לריבונות הדרגתית בתיאום עם ארה"ב"',
      },
      religionState: {
        score: 75,
        source: 'https://bhirot26.online/party/likud',
        basis: 'הצבעה נגד תחבורה ציבורית בשבת (19.11.2025), "שימור הסטטוס-קוו"',
      },
      taxes: {
        score: 80,
        source: 'https://bhirot26.online/party/likud',
        basis: '"הפחתת מסים ורגולציה"',
      },
      arabCoalition: {
        score: 95,
        source: 'https://bhirot26.online/party/likud',
        basis: 'נגד שותפות מפלגות ערביות בקואליציה: "זה השותף של איזנקוט"',
      },
    },
  },
  דרך: {
    camp: 'centre',
    campNoteHe: 'ישר! — מפלגת הרמטכ"ל לשעבר גדי איזנקוט, מרכז-ימין בגוש השינוי',
    campNoteEn: 'Yashar — former IDF chief Gadi Eisenkot, centre-right within the change bloc',
    stances: {
      draft: {
        score: 80,
        source: 'https://bhirot26.online/party/yashar',
        basis: 'בעד חוק גיוס שריון "כולל סנקציות אישיות על משתמטים"',
      },
      judiciary: {
        score: 70,
        source: 'https://bhirot26.online/party/yashar',
        basis: 'סומן "עמדה חלקית" לגבי הגבלת בג"ץ וחיזוק כוח הכנסת והממשלה',
      },
      palestine: {
        score: 80,
        source: 'https://bhirot26.online/party/yashar',
        basis: 'נגד הקמת מדינה פלסטינית ("שתי מדינות הן טעות אחרי 7 באוקטובר")',
      },
      settlements: {
        score: 70,
        source: 'https://bhirot26.online/party/yashar',
        basis: 'עמדה חלקית על הרחבת ההתנחלויות',
      },
      yeshivaBudgets: {
        score: 10,
        source: 'https://bhirot26.online/party/yashar',
        basis: 'נגד הגדלת התקציבים לישיבות ולמוסדות החינוך החרדי',
      },
      religionState: {
        score: 35,
        source: 'https://bhirot26.online/party/yashar',
        basis: 'עמדה חלקית על תחבורה בשבת ונישואים אזרחיים',
      },
      taxes: {
        score: 65,
        source: 'https://www.davar1.co.il/687126/',
        basis: 'תוכניתו הכלכלית של מרידור "הולכת ימינה": קיצוץ מס הכנסה, תחרות בייבוא וצמצום ההוצאה הממשלתית',
      },
      arabCoalition: {
        score: 45,
        source: 'https://bhirot26.online/party/yashar',
        basis: 'לא הופיעה עמדת "נגד" למפלגות ערביות בקואליציה ביחס לנתניהו',
      },
    },
  },
  רק: {
    camp: 'centre',
    campNoteHe: 'ביחד — איחוד בנט ולפיד, המרכז בגוש השינוי',
    campNoteEn: "B'Yachad — the Bennett–Lapid merger, the change bloc's centre",
    stances: {
      draft: {
        score: 85,
        source: 'https://bhirot26.online/party/beyachad',
        basis: '"נעביר חוק גיוס לכולם" — בלי מכסות ובלי קומבינות',
      },
      judiciary: {
        score: 30,
        source: 'https://bhirot26.online/party/beyachad',
        basis: '"ביטול חקיקת הרפורמה החד-צדדית"; "שינויים רק בהסכמה רחבה"',
      },
      palestine: {
        score: 90,
        source: 'https://bhirot26.online/party/beyachad',
        basis: '"התנגדות למדינה פלסטינית"',
      },
      yeshivaBudgets: {
        score: 15,
        source: 'https://bhirot26.online/party/beyachad',
        basis: 'נגד הגדלת התקציבים לישיבות ולחינוך החרדי: "ביחד נתקן את שילוב אחינו החרדים"',
      },
      religionState: {
        score: 10,
        source: 'https://bhirot26.online/party/beyachad',
        basis: 'בעד תחבורה ציבורית בשבת ונישואים אזרחיים',
      },
      taxes: {
        score: 70,
        source: 'https://bhirot26.online/party/beyachad',
        basis: 'בעד הורדת מסים גם על חשבון שירותים; פירוק מונופולים והורדת יוקר המחיה',
      },
      arabCoalition: {
        score: 95,
        source: 'https://bhirot26.online/party/beyachad',
        basis: '"בנט שולל ישיבה בממשלה הנשענת על המפלגות הערביות"',
      },
    },
  },
  אמת: {
    camp: 'left',
    campNoteHe: 'הדמוקרטים — איחוד העבודה ומרצ, הגוש הציוני השמאלי',
    campNoteEn: 'The Democrats — the Labor–Meretz merger, the Zionist left',
    stances: {
      draft: {
        score: 40,
        source: 'https://bhirot26.online/party/democrats',
        basis: '"שירות שוויוני לכלל אזרחי ישראל ללא ויתור על שוויון בנטל" (סומן עמדה חלקית)',
      },
      judiciary: {
        score: 5,
        source: 'https://bhirot26.online/party/democrats',
        basis: '"ביטול כל חוקי ההפיכה המשטרית"',
      },
      gaza: {
        score: 25,
        source: 'https://bhirot26.online/party/democrats',
        basis: 'קוראים לפירוז עזה ולהחלפת שלטון חמאס, לאורך המלחמה עד להכרעה',
      },
      settlements: {
        score: 5,
        source: 'https://bhirot26.online/party/democrats',
        basis: '"עצירת הסיפוח ופינוי מאחזים אלימים"',
      },
      yeshivaBudgets: {
        score: 5,
        source: 'https://bhirot26.online/party/democrats',
        basis: 'נגד תקצוב מוסדות חרדיים ללא לימודי ליבה',
      },
      religionState: {
        score: 5,
        source: 'https://bhirot26.online/party/democrats',
        basis: '"נישואים אזרחיים, תחבורה ציבורית בשבת"',
      },
      taxes: {
        score: 10,
        source: 'https://bhirot26.online/party/democrats',
        basis: 'בעד פיקוח מחירים, נגד הורדת מסים ופתיחת שוק המזון — "השקעה בתעסוקה ובשירותים החברתיים"',
      },
      arabCoalition: {
        score: 5,
        source: 'https://bhirot26.online/party/democrats',
        basis: 'בעד שותפות מפלגות ערביות בקואליציה',
      },
      equality: {
        score: 5,
        source: 'https://bhirot26.online/party/democrats',
        basis: '"תיקון חוק הלאום, שוויון מלא לחברה הערבית ולקהילת הלהט"ב"',
      },
    },
  },
  'ודם': {
    camp: 'arab',
    campNoteHe: 'הרשימה המשותפת — חד"ש, תע"ל ובל"ד',
    campNoteEn: "The Joint List — Hadash, Ta'al and Balad",
    stances: {
      draft: {
        score: 5,
        source: 'https://bhirot26.online/party/joint',
        basis: 'מתנגדת לחוק גיוס חרדי ולשירות חובה אזרחי, בפרט לערבים',
      },
      judiciary: {
        score: 5,
        source: 'https://bhirot26.online/party/joint',
        basis: 'מתנגדת להגבלת בג"ץ ("יסודות הדמוקרטיה והחירויות")',
      },
      palestine: {
        score: 0,
        source: 'https://bhirot26.online/party/joint',
        basis: '"סיום הכיבוש ומדינה פלסטינית בגבולות 67\' לצד ישראל"',
      },
      settlements: {
        score: 0,
        source: 'https://bhirot26.online/party/joint',
        basis: 'מתנגדת להרחבת ההתנחלויות',
      },
      taxes: {
        score: 5,
        source: 'https://bhirot26.online/party/joint',
        basis: '"סוציאליזם דמוקרטי: זכויות עובדים, שירותים ציבוריים"; נגד הורדת מסים',
      },
      arabCoalition: {
        score: 10,
        source: 'https://bhirot26.online/party/joint',
        basis: 'לא מצטרפת לקואליציה אך מוכנה להמליץ על ממשלת חלופה; תנאי: סיום הכיבוש וחוק-יסוד לשוויון',
      },
      equality: {
        score: 0,
        source: 'https://bhirot26.online/party/joint',
        basis: '"ביטול חוק הלאום וכל חקיקה מפלה"',
      },
    },
  },
  ל: {
    camp: 'right',
    campNoteHe: 'ישראל ביתנו — ימין חילוני-לאומי קשוח בביטחון ובגיוס, חילוני מובהק בדת ומדינה',
    campNoteEn: 'Yisrael Beiteinu — secular nationalist right: hard line on security and the draft, strongly anti-clerical',
    stances: {
      draft: {
        score: 90,
        source: 'https://bhirot26.online/party/beytenu',
        basis: '"חוק גיוס חובה לכל אזרח בגיל 18 בשני מסלולים, צבאי או אזרחי"',
      },
      judiciary: {
        score: 20,
        source: 'https://bhirot26.online/party/beytenu',
        basis: 'הצביעה נגד עילת הסבירות; דורשת חוקה ובית משפט לחוקה, מתנגדת לפסקת התגברות',
      },
      palestine: {
        score: 75,
        source: 'https://bhirot26.online/party/beytenu',
        basis: '"הסדר אזורי כולל בלבד, לא הסדר נפרד עם הפלסטינים"',
      },
      settlements: {
        score: 80,
        source: 'https://bhirot26.online/party/beytenu',
        basis: 'בעד הצעת חוק החלת הריבונות ביהודה והשומרון (2025)',
      },
      yeshivaBudgets: {
        score: 10,
        source: 'https://bhirot26.online/party/beytenu',
        basis: 'נגד תקצוב מוסדות חרדיים שאינם מלמדים ליבה; העברת סמכויות שבת לרשויות המקומיות',
      },
      religionState: {
        score: 5,
        source: 'https://bhirot26.online/party/beytenu',
        basis: 'בעד תחבורה בשבת ונישואים אזרחיים: "הפרדה בין דת למדינה"',
      },
      taxes: {
        score: 85,
        source: 'https://bhirot26.online/party/beytenu',
        basis: '"הפחתת רגולציה, צמצום המגזר הציבורי ופירוק מונופולים"',
      },
      arabCoalition: {
        score: 95,
        source: 'https://bhirot26.online/party/beytenu',
        basis: '"הממשלה הבאה תורכב אך ורק ממפלגות ציוניות"',
      },
    },
  },
  ב: {
    camp: 'right',
    campNoteHe: 'עוצמה יהודית — ימין לאומי קיצוני בראשות בן גביר: ריבונות, ענישה מקסימלית וחיזוק הזהות היהודית',
    campNoteEn: "Otzma Yehudit — Ben-Gvir's far right: sovereignty, maximal punishment and a stronger Jewish identity",
    stances: {
      draft: {
        score: 50,
        source: 'https://bhirot26.online/party/otzma',
        basis: 'הצביעה נגד חוק לימוד תורה (13.7.2026) אך "עמדה חלקית" על חובת שירות לכלל האזרחים',
      },
      judiciary: {
        score: 100,
        source: 'https://bhirot26.online/party/otzma',
        basis: '"תמיכה מלאה ברפורמה ובריסון בג"ץ והיועמ"שית"',
      },
      gaza: {
        score: 100,
        source: 'https://bhirot26.online/party/otzma',
        basis: 'התנגדות לעסקאות עם חמאס; "רק לחץ צבאי מוחלט"',
      },
      palestine: {
        score: 100,
        source: 'https://bhirot26.online/party/otzma',
        basis: 'הצעת חוק לביטול הסכמי אוסלו; "החלת ריבונות מלאה ביהודה ושומרון"',
      },
      settlements: {
        score: 100,
        source: 'https://bhirot26.online/party/otzma',
        basis: '"עידוד הגירה מעזה וחידוש ההתיישבות בה"',
      },
      religionState: {
        score: 90,
        source: 'https://bhirot26.online/party/otzma',
        basis: 'הצביעה נגד תחבורה ציבורית בשבת (19.11.2025)',
      },
      arabCoalition: {
        score: 100,
        source: 'https://bhirot26.online/party/otzma',
        basis: 'בן גביר: "ישיבה עם מנסור עבאס גרועה מטבח 7 באוקטובר"',
      },
    },
  },
  עם: {
    camp: 'arab',
    campNoteHe: 'רע"ם — מפלגה ערבית-תורנית שמרנית, היחידה שמוכנה לשבת בקואליציה',
    campNoteEn: "Ra'am — conservative religious Arab party, the only Arab list open to a coalition",
    stances: {
      draft: {
        score: 40,
        source: 'https://bhirot26.online/party/raam',
        basis: 'עבאס (6.12.2025) הביע חריפות תמיכה מסוימת בהצעות לפטור חרדים מגיוס',
      },
      judiciary: {
        score: 15,
        source: 'https://bhirot26.online/party/raam',
        basis: 'הצביעה נגד ביטול עילת הסבירות (7.2023)',
      },
      palestine: {
        score: 15,
        source: 'https://bhirot26.online/party/raam',
        basis: '"תמיכה עקרונית בשתי מדינות וסיום המלחמה"; "לאופייה היהודי של המדינה" כמציאות',
      },
      settlements: {
        score: 15,
        source: 'https://bhirot26.online/party/raam',
        basis: 'הצביעה נגד חוק יישום ההתנתקות (2023) בשיח על חזרה להתנחלות בעזה',
      },
      yeshivaBudgets: {
        score: 70,
        source: 'https://bhirot26.online/party/raam',
        basis: 'עבאס דרש להעביר 100 מיליון ש"ח מתקציב רע"ם לציבור החרדי',
      },
      religionState: {
        score: 85,
        source: 'https://bhirot26.online/party/raam',
        basis: 'הצביעה נגד נישואין אזרחיים; מגנה את המשפחה המסורתית',
      },
      taxes: {
        score: 20,
        source: 'https://bhirot26.online/party/raam',
        basis: 'בעד פיקוח על מחירי מוצרי מזון בסיסיים (פ/5091/25)',
      },
      arabCoalition: {
        score: 5,
        source: 'https://bhirot26.online/party/raam',
        basis: '"נוכחות רע"ם בקואליציה תשמור על הביטחון"',
      },
      equality: {
        score: 10,
        source: 'https://bhirot26.online/party/raam',
        basis: 'דורשת מעמד אזרחי שוויוני; "אין עמדה מתועדת" לביטול חוק הלאום',
      },
    },
  },
  שס: {
    camp: 'haredi',
    campNoteHe: 'ש"ס — מפלגה חרדית-ספרדית חברתית, בגוש נתניהו',
    campNoteEn: 'Shas — Sephardi Haredi party, socially minded, inside the Netanyahu bloc',
    stances: {
      draft: {
        score: 0,
        source: 'https://bhirot26.online/party/shas',
        basis: '"עיגון בחוק של מעמד לומדי התורה ופטור/דחייה לבני ישיבות"',
      },
      judiciary: {
        score: 95,
        source: 'https://bhirot26.online/party/shas',
        basis: 'מצע "משפט": "תמיכה ברפורמה המשפטית ובפסקת התגברות"',
      },
      palestine: {
        score: 90,
        source: 'https://bhirot26.online/party/shas',
        basis: 'הצביעה נגד הכרה במדינה פלסטינית (30.10.2024)',
      },
      settlements: {
        score: 90,
        source: 'https://bhirot26.online/party/shas',
        basis: 'בעד "החלת הריבונות ביהודה, שומרון ובקעת הירדן" (23.7.2025)',
      },
      yeshivaBudgets: {
        score: 100,
        source: 'https://www.mako.co.il/news-israel-elections/2026/Article-420d8b8ce3931a1027.htm',
        basis: 'דרעי: "לא תהיה ממשלה בישראל שש"ס תומכת או משתתפת בלי שנסדיר את מעמד תלמידי הישיבות"',
      },
      religionState: {
        score: 100,
        source: 'https://bhirot26.online/party/shas',
        basis: 'הצביעה נגד תחבורה ציבורית בשבת (19.11.2025); "שימור הסטטוס-קוו"',
      },
      taxes: {
        score: 25,
        source: 'https://bhirot26.online/party/shas',
        basis: 'נגד הורדת מסים; "סל מזון וביטחון תזונתי", בעד פיקוח מחירים',
      },
      arabCoalition: {
        score: 85,
        source: 'https://bhirot26.online/party/shas',
        basis: '"ש"ס תקפה: איזנקוט חצה קו אדום" (על שותפות עם מפלגות ערביות)',
      },
    },
  },
  ג: {
    camp: 'haredi',
    campNoteHe: 'יהדות התורה — מפלגה חרדית-אשכנזית שבראש סדר יומה עולם התורה',
    campNoteEn: 'UTJ — Ashkenazi Haredi party, the yeshiva world first',
    stances: {
      draft: {
        score: 0,
        source: 'https://bhirot26.online/party/utj',
        basis: '"הגנה על עולם התורה, פטור מגיוס לבני ישיבות"',
      },
      judiciary: {
        score: 90,
        source: 'https://bhirot26.online/party/utj',
        basis: 'בעד הגבלת בג"ץ, "שנתפס כגורם עוין לציבור החרדי"',
      },
      palestine: {
        score: 85,
        source: 'https://bhirot26.online/party/utj',
        basis: '"היו"ר שולל מדינה פלסטינית"',
      },
      settlements: {
        score: 80,
        source: 'https://bhirot26.online/party/utj',
        basis: 'בעד הרחבת ההתנחלויות (פרק הביטחון במצע)',
      },
      yeshivaBudgets: {
        score: 100,
        source: 'https://bhirot26.online/party/utj',
        basis: '"תקצוב מלא לחינוך העצמאי ללא התערבות בתכני הליבה"',
      },
      religionState: {
        score: 100,
        source: 'https://bhirot26.online/party/utj',
        basis: '"התנגדות לנישואים אזרחיים ולתחבורה ציבורית בשבת"',
      },
      taxes: {
        score: 20,
        source: 'https://bhirot26.online/party/utj',
        basis: 'נגד הורדת מסים; "קצבאות ותמיכות למשפחות גדולות"',
      },
    },
  },
  ט: {
    camp: 'religious-zionist',
    campNoteHe: 'הציונות הדתית — ימין דתי-לאומי: ריבונות ביהודה ושומרון ותקציבים להתיישבות',
    campNoteEn: 'Religious Zionism — religious-nationalist right: sovereignty in Judea and Samaria and settlement budgets',
    stances: {
      draft: {
        score: 10,
        source: 'https://bhirot26.online/party/rz',
        basis: 'הצביעה נגד חוק לימוד תורה עם סנקציות (13.7.2026)',
      },
      judiciary: {
        score: 100,
        source: 'https://bhirot26.online/party/rz',
        basis: '"שינוי בחירת שופטים, פסקת התגברות, ביטול עילת הסבירות"',
      },
      gaza: {
        score: 100,
        source: 'https://bhirot26.online/party/rz',
        basis: '"התנגדה לעסקאות החטופים שהיו כרוכות בסיום המלחמה"',
      },
      palestine: {
        score: 100,
        source: 'https://bhirot26.online/party/rz',
        basis: 'סמוטריץ\': "ארץ ישראל שייכת לעם ישראל על פי התורה"',
      },
      settlements: {
        score: 100,
        source: 'https://bhirot26.online/party/rz',
        basis: '"החלת ריבונות מלאה ביהודה ושומרון והרחבה מסיבית של ההתיישבות"',
      },
      religionState: {
        score: 95,
        source: 'https://bhirot26.online/party/rz',
        basis: 'הצביעה נגד תחבורה ציבורית בשבת (19.11.2025)',
      },
      taxes: {
        score: 95,
        source: 'https://bhirot26.online/party/rz',
        basis: '"שוק חופשי בגישה שמרנית"',
      },
      arabCoalition: {
        score: 100,
        source: 'https://bhirot26.online/party/rz',
        basis: 'סמוטריץ\' (5.5.2026): "ישיבה עם מנסור עבאס גרועה מטבח 7 באוקטובר"',
      },
    },
  },
}

export const SOURCES: { id: string; label: string; url: string }[] = [
  { id: 'bhirot26', label: 'מצפן הבחירה — עמדות המפלגות לכנסת ה-26', url: 'https://bhirot26.online/party' },
  {
    id: 'mako-deri',
    label: 'N12: דרעי באולטימטום — "לא תהיה ממשלה בלי הסדרת מעמד לומדי התורה"',
    url: 'https://www.mako.co.il/news-israel-elections/2026/Article-420d8b8ce3931a1027.htm',
  },
  { id: 'davar-yashar', label: 'דבר: "ישר!" הולכת ימינה בתוכנית הכלכלית שהציגה', url: 'https://www.davar1.co.il/687126/' },
]
