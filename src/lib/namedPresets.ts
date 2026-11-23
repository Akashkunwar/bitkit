/**
 * Named option presets, stored in the same IndexedDB prefs as everything
 * else the app keeps. Values are plain settings only — never file contents.
 */

import { useCallback, useEffect, useState } from 'react'
import { getPref, setPref } from './db'

export type PresetValue = Record<string, string | number | boolean>

export type NamedPreset = {
  id: string
  name: string
  savedAt: number
  value: PresetValue
}

const keyFor = (toolId: string) => `named-presets:${toolId}`

function isValue(value: unknown): value is PresetValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((item) => ['string', 'number', 'boolean'].includes(typeof item))
}

export async function readNamedPresets(toolId: string): Promise<NamedPreset[]> {
  const stored = await getPref<NamedPreset[]>(keyFor(toolId), [])
  return stored.filter((preset) => preset && typeof preset.name === 'string' && isValue(preset.value))
}

export async function saveNamedPreset(toolId: string, name: string, value: PresetValue): Promise<NamedPreset[]> {
  const trimmed = name.trim().slice(0, 40)
  if (!trimmed) throw new Error('Name the preset first.')
  const current = await readNamedPresets(toolId)
  const next = [
    { id: crypto.randomUUID(), name: trimmed, savedAt: Date.now(), value },
    ...current.filter((preset) => preset.name !== trimmed),
  ].slice(0, 12)
  await setPref(keyFor(toolId), next)
  return next
}

export async function deleteNamedPreset(toolId: string, id: string): Promise<NamedPreset[]> {
  const next = (await readNamedPresets(toolId)).filter((preset) => preset.id !== id)
  await setPref(keyFor(toolId), next)
  return next
}

export function plainSettings(value: Record<string, unknown>): PresetValue {
  const out: PresetValue = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') out[key] = item
  }
  return out
}

export function useNamedPresets(toolId: string): {
  presets: NamedPreset[]
  save: (name: string, value: PresetValue) => Promise<void>
  remove: (id: string) => Promise<void>
} {
  const [presets, setPresets] = useState<NamedPreset[]>([])

  useEffect(() => {
    let live = true
    void readNamedPresets(toolId).then((rows) => {
      if (live) setPresets(rows)
    })
    return () => {
      live = false
    }
  }, [toolId])

  const save = useCallback(
    async (name: string, value: PresetValue) => {
      setPresets(await saveNamedPreset(toolId, name, value))
    },
    [toolId],
  )

  const remove = useCallback(
    async (id: string) => {
      setPresets(await deleteNamedPreset(toolId, id))
    },
    [toolId],
  )

  return { presets, save, remove }
}
