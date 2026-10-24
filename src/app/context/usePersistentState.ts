import { useCallback, useState } from "react"

/**
 * useState backed by sessionStorage, so a refresh or a direct URL hit keeps the value.
 *
 * sessionStorage rather than localStorage: this holds a session and an in-flight offer, which
 * should not outlive the tab. Every access is guarded — storage throws in private mode and in
 * embedded webviews, and the app must still render when it does.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue(prev => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next
        try {
          if (resolved === null || resolved === undefined) window.sessionStorage.removeItem(key)
          else window.sessionStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // Value still lives in React state for this page view; only persistence is lost.
        }
        return resolved
      })
    },
    [key]
  )

  return [value, set] as const
}
