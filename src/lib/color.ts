/** Black or white, whichever reads better on the given #rrggbb background (WCAG relative luminance). */
export function readableOn(hex: string): '#000000' | '#ffffff' {
  const h = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(h)) return '#ffffff'
  const ch = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4)
  // contrast ratio against white = 1.05 / (L + 0.05) >= 4.5
  return 1.05 / (lum + 0.05) >= 4.5 ? '#ffffff' : '#000000'
}
