// The four camps of the 26th Knesset, as the campaign itself was framed. The Joint List carries
// the first Arab bloc; Ra'am the second
export const BLOCS = [
  // ביחד and ישר stood as an apparentment (s. 81(d)), so their votes are counted together at the threshold
  { id: 'change', color: '#2563EB', keys: ['דרך', 'רק', 'אמת', 'ל', 'כן'] },
  { id: 'netanyahu', color: '#DC2626', keys: ['מחל', 'ב', 'שס', 'ג', 'ט'] },
  { id: 'joint', color: '#16A34A', keys: ['ודם'] },
  { id: 'raam', color: '#EAB308', keys: ['עם'] },
] as const

export type BlocId = (typeof BLOCS)[number]['id']
