import { useEffect, useState } from 'react'

/** Runs a cached loader on mount; re-runs only when `key` changes. */
export function useLoad<T>(key: string, loader: () => Promise<T>) {
  const [s, setS] = useState<{ data: T | null; error: boolean }>({ data: null, error: false })
  const [lastKey, setLastKey] = useState(key)
  if (key !== lastKey) {
    setLastKey(key)
    setS({ data: null, error: false })
  }
  useEffect(() => {
    let alive = true
    loader().then(
      (data) => alive && setS({ data, error: false }),
      () => alive && setS({ data: null, error: true }),
    )
    return () => {
      alive = false
    }
  }, [loader])
  return s
}
