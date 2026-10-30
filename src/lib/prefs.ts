export type Theme = 'system' | 'light' | 'dark'
/** "Maximum info" keeps a party that won no vote in a town in that town's breakdown, instead of dropping the close fight */
export type Info = 'default' | 'max'

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

export const getInfo = (): Info => (read('info') === 'max' ? 'max' : 'default')
export const setInfo = (info: Info) => write('info', info)

/** Fired on <window> after a settings change, so the open page re-reads it without a reload */
export const PREFS_EVENT = 'prefs'

/** Called once before render so the stored theme never flashes the system one */
export function applyStoredPrefs() {
  setTheme(getTheme())
}
