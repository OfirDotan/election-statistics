export type Theme = 'system' | 'light' | 'dark'
export type Density = 'comfortable' | 'compact'

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked (private mode): the choice applies for this visit only
  }
}

/** Theme lives on <html data-theme>; absent means "follow the system" */
export const getTheme = (): Theme => {
  const v = read('theme')
  return v === 'light' || v === 'dark' ? v : 'system'
}
export const setTheme = (theme: Theme) => {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = theme
  write('theme', theme)
}

export const getDensity = (): Density => (read('density') === 'compact' ? 'compact' : 'comfortable')
export const setDensity = (density: Density) => {
  if (density === 'compact') document.documentElement.dataset.density = density
  else document.documentElement.removeAttribute('data-density')
  write('density', density)
}

/** Called once before render so the stored theme never flashes the system one */
export function applyStoredPrefs() {
  setTheme(getTheme())
  setDensity(getDensity())
}
