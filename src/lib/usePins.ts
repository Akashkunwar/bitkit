import { useCallback, useSyncExternalStore } from 'react'
import { getPref, setPref } from './db'

/**
 * Pinned tools, shared by the sidebar, the home grid, and the tool header.
 *
 * Pins used to be read separately by each view on mount, so pinning from one
 * place left the others stale until the next navigation. One module-level
 * store with subscribers keeps every view on the same list.
 */

const KEY = 'favorites'
let pins: string[] = []
let loaded = false
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function ensureLoaded(): void {
  if (loaded) return
  loaded = true
  void getPref<string[]>(KEY, []).then((stored) => {
    pins = Array.isArray(stored) ? stored.filter((id) => typeof id === 'string') : []
    emit()
  })
}

function subscribe(listener: () => void): () => void {
  ensureLoaded()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function snapshot(): string[] {
  return pins
}

export async function setPins(next: string[]): Promise<void> {
  pins = next
  emit()
  await setPref(KEY, next)
}

/** Re-reads storage, e.g. after a backup restore wrote to it directly. */
export async function reloadPins(): Promise<void> {
  pins = await getPref<string[]>(KEY, [])
  emit()
}

export function usePins(): { pins: string[]; isPinned: (id: string) => boolean; toggle: (id: string) => void } {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot)
  const isPinned = useCallback((id: string) => current.includes(id), [current])
  const toggle = useCallback((id: string) => {
    const next = pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id]
    void setPins(next)
  }, [])
  return { pins: current, isPinned, toggle }
}
