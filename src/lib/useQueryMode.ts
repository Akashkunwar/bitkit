import { useSearchParams } from 'react-router-dom'

/** Keeps a segmented mode in `?mode=` so the link opens that screen. */
export function useQueryMode<T extends string>(allowed: readonly T[], fallback: T): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('mode')
  const mode = raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
  const setMode = (next: T) => {
    const copy = new URLSearchParams(params)
    if (next === fallback) copy.delete('mode')
    else copy.set('mode', next)
    setParams(copy, { replace: true })
  }
  return [mode, setMode]
}
