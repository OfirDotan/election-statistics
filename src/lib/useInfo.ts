import { useEffect, useState } from 'react'
import { getInfo, PREFS_EVENT, type Info } from './prefs.ts'

/** The "maximum info" setting, kept current while its page stays open */
export function useInfo(): Info {
  const [info, setInfo] = useState(getInfo)
  useEffect(() => {
    const read = () => setInfo(getInfo())
    window.addEventListener(PREFS_EVENT, read)
    return () => window.removeEventListener(PREFS_EVENT, read)
  }, [])
  return info
}
