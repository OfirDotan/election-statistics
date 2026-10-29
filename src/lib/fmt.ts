/** Percent with fixed decimals; locale fixed so digits stay Latin in both languages. */
export const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`
export const fmtInt = (n: number) => n.toLocaleString('en-US')
