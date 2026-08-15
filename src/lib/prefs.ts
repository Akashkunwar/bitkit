import { useCallback, useEffect, useRef, useState } from 'react'
import { getPref, setPref } from './db'

/**
 * Per-tool settings that survive a reload, plus the local usage counters that
 * let Home float your real workflow to the top. Everything stays in IndexedDB
 * on this device; none of it is sent anywhere.
 */

const SETTINGS_PREFIX = 'tool-settings:'
const USAGE_KEY = 'tool-usage'

export type Usage = Record<string, { count: number; last: number }>

export async function recordUse(toolId: string): Promise<void> {
  const usage = await getPref<Usage>(USAGE_KEY, {})
  const entry = usage[toolId] ?? { count: 0, last: 0 }
  await setPref(USAGE_KEY, { ...usage, [toolId]: { count: entry.count + 1, last: Date.now() } })
}

export async function readUsage(): Promise<Usage> {
  return getPref<Usage>(USAGE_KEY, {})
}

export async function clearUsage(): Promise<void> {
  await setPref(USAGE_KEY, {})
}

/**
 * Ranks by a decayed count so a tool used heavily last month does not outrank
 * one you reach for every day now. Half-life is two weeks.
 */
export function usageScore(entry: { count: number; last: number } | undefined, now = Date.now()): number {
  if (!entry) return 0
  const ageDays = (now - entry.last) / 86_400_000
  return entry.count * 0.5 ** (ageDays / 14)
}

export function sortByUsage<T extends { id: string }>(items: T[], usage: Usage): T[] {
  const now = Date.now()
  return [...items].sort((a, b) => usageScore(usage[b.id], now) - usageScore(usage[a.id], now))
}

// --- per-tool settings ---

export async function readSettings<T>(toolId: string, fallback: T): Promise<T> {
  const stored = await getPref<Partial<T> | null>(`${SETTINGS_PREFIX}${toolId}`, null)
  return stored ? { ...fallback, ...stored } : fallback
}

export async function writeSettings<T>(toolId: string, value: T): Promise<void> {
  await setPref(`${SETTINGS_PREFIX}${toolId}`, value)
}

export async function clearSettings(toolId: string): Promise<void> {
  await setPref(`${SETTINGS_PREFIX}${toolId}`, null)
}

/**
 * Tool settings that persist and can be seeded from a shared URL.
 *
 * Returns `ready` so a tool can avoid flashing defaults before the stored
 * values arrive — reading IndexedDB is asynchronous.
 */
export function useToolSettings<T extends Record<string, unknown>>(
  toolId: string,
  defaults: T,
): {
  settings: T
  update: (patch: Partial<T>) => void
  reset: () => void
  ready: boolean
} {
  const [settings, setSettings] = useState<T>(defaults)
  const [ready, setReady] = useState(false)
  const defaultsRef = useRef(defaults)

  useEffect(() => {
    let live = true
    void (async () => {
      // A shared link wins over stored settings for this visit.
      const fromUrl = readSettingsFromHash<T>()
      const stored = await readSettings<T>(toolId, defaultsRef.current)
      if (!live) return
      setSettings(fromUrl ? { ...stored, ...fromUrl } : stored)
      setReady(true)
    })()
    return () => {
      live = false
    }
  }, [toolId])

  const update = useCallback(
    (patch: Partial<T>) => {
      setSettings((current) => {
        const next = { ...current, ...patch }
        void writeSettings(toolId, next)
        return next
      })
    },
    [toolId],
  )

  const reset = useCallback(() => {
    setSettings(defaultsRef.current)
    void clearSettings(toolId)
  }, [toolId])

  return { settings, update, reset, ready }
}

// --- shareable settings in the URL hash ---

const HASH_PREFIX = '#s='

/**
 * Encodes settings into the URL hash so a configuration can be shared.
 *
 * Only plain values go in — never file contents, never anything read from a
 * dropped file. The hash is not sent to a server by the browser, but a shared
 * link is still visible to whoever receives it, so this stays deliberately
 * limited to tool options.
 */
export function encodeSettingsToHash(settings: Record<string, unknown>): string {
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(settings)) {
    const kind = typeof value
    if (kind === 'string' || kind === 'number' || kind === 'boolean') safe[key] = value
    else if (Array.isArray(value) && value.every((v) => ['string', 'number', 'boolean'].includes(typeof v))) {
      safe[key] = value
    }
  }
  const json = JSON.stringify(safe)
  // encodeURIComponent first so btoa never sees a non-Latin-1 character.
  return HASH_PREFIX + btoa(encodeURIComponent(json))
}

export function readSettingsFromHash<T>(hash = window.location.hash): Partial<T> | null {
  if (!hash.startsWith(HASH_PREFIX)) return null
  try {
    const json = decodeURIComponent(atob(hash.slice(HASH_PREFIX.length)))
    const parsed = JSON.parse(json) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Partial<T>) : null
  } catch {
    return null
  }
}

export function shareableUrl(settings: Record<string, unknown>, base = window.location.href): string {
  const url = new URL(base)
  url.hash = ''
  return url.toString().replace(/#$/, '') + encodeSettingsToHash(settings)
}
