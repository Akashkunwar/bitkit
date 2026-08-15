import { db, type Note } from './db'

/**
 * One file containing everything BitKit keeps on this device.
 *
 * IndexedDB is not durable storage — browsers evict it under pressure, and
 * "clear site data" wipes it without a prompt. Without an export there is no
 * way back, so this is closer to a safety requirement than a feature.
 */

export const BACKUP_VERSION = 2

export type Backup = {
  app: 'bitkit'
  version: number
  exportedAt: string
  notes: Note[]
  prefs: { key: string; value: unknown }[]
  /** Theme and other localStorage values BitKit owns. */
  local: Record<string, string>
}

const LOCAL_KEYS = ['bitkit-theme', 'bitkit-open-sections', 'bitkit-language']

export async function createBackup(): Promise<Backup> {
  const [notes, prefs] = await Promise.all([db.notes.toArray(), db.prefs.toArray()])
  const local: Record<string, string> = {}
  for (const key of LOCAL_KEYS) {
    try {
      const value = localStorage.getItem(key)
      if (value != null) local[key] = value
    } catch {
      /* private mode */
    }
  }
  return {
    app: 'bitkit',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    notes,
    prefs: prefs.map((row) => ({ key: row.key, value: row.value })),
    local,
  }
}

export function backupBlob(backup: Backup): Blob {
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
}

export function backupFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `bitkit-backup-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}.json`
}

export type BackupSummary = {
  notes: number
  prefs: number
  local: number
  exportedAt: string
  version: number
}

export function summarise(backup: Backup): BackupSummary {
  return {
    notes: backup.notes.length,
    prefs: backup.prefs.length,
    local: Object.keys(backup.local ?? {}).length,
    exportedAt: backup.exportedAt,
    version: backup.version,
  }
}

/** Validates and normalises an uploaded file before anything is written. */
export function parseBackup(json: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const value = parsed as Partial<Backup>
  if (!value || typeof value !== 'object') throw new Error('That file is not a BitKit backup.')
  if (value.app !== 'bitkit') throw new Error('That file was not exported by BitKit.')
  if (typeof value.version !== 'number' || value.version > BACKUP_VERSION) {
    throw new Error('That backup came from a newer version of BitKit. Update first, then import.')
  }

  const notes: Note[] = Array.isArray(value.notes)
    ? value.notes.map((note) => ({
        id: String(note?.id || crypto.randomUUID()),
        title: String(note?.title ?? 'Untitled').slice(0, 200),
        body: String(note?.body ?? ''),
        pinned: Boolean(note?.pinned),
        updatedAt: Number(note?.updatedAt) || Date.now(),
      }))
    : []

  const prefs = Array.isArray(value.prefs)
    ? value.prefs
        .filter((row) => row && typeof row.key === 'string')
        .map((row) => ({ key: row.key, value: row.value }))
    : []

  const local: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value.local ?? {})) {
    // Only restore keys BitKit owns, so a doctored file cannot write anything else.
    if (LOCAL_KEYS.includes(key) && typeof entry === 'string') local[key] = entry
  }

  return { app: 'bitkit', version: value.version, exportedAt: String(value.exportedAt ?? ''), notes, prefs, local }
}

export type RestoreMode = 'merge' | 'replace'

export type RestoreResult = { notesAdded: number; notesUpdated: number; prefsWritten: number }

export async function restoreBackup(backup: Backup, mode: RestoreMode): Promise<RestoreResult> {
  let notesAdded = 0
  let notesUpdated = 0

  await db.transaction('rw', db.notes, db.prefs, async () => {
    if (mode === 'replace') {
      await db.notes.clear()
      await db.prefs.clear()
      notesAdded = backup.notes.length
      if (backup.notes.length) await db.notes.bulkPut(backup.notes)
    } else {
      for (const note of backup.notes) {
        const existing = await db.notes.get(note.id)
        if (!existing) {
          await db.notes.put(note)
          notesAdded += 1
        } else if (note.updatedAt > existing.updatedAt) {
          // Newer wins, so importing an older backup never loses recent edits.
          await db.notes.put(note)
          notesUpdated += 1
        }
      }
    }
    for (const pref of backup.prefs) await db.prefs.put(pref)
  })

  for (const [key, value] of Object.entries(backup.local ?? {})) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* private mode */
    }
  }

  return { notesAdded, notesUpdated, prefsWritten: backup.prefs.length }
}

export async function wipeEverything(): Promise<void> {
  await db.transaction('rw', db.notes, db.prefs, async () => {
    await db.notes.clear()
    await db.prefs.clear()
  })
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* private mode */
    }
  }
}

/** Rough on-device footprint, when the browser will tell us. */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const estimate = await navigator.storage.estimate()
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
}

/**
 * Asks the browser to exempt this origin from routine eviction. Chrome grants
 * it silently for installed or frequently used sites; Firefox prompts.
 */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}

export async function isPersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false
  return navigator.storage.persisted()
}
