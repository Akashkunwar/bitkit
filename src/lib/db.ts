import Dexie, { type EntityTable } from 'dexie'

export type Note = {
  id: string
  title: string
  body: string
  pinned: boolean
  updatedAt: number
}

export type Prefs = {
  key: string
  value: unknown
}

class BitKitDB extends Dexie {
  notes!: EntityTable<Note, 'id'>
  prefs!: EntityTable<Prefs, 'key'>

  constructor() {
    // Storage name kept from the pre-rename build on purpose: changing it
    // would strand notes users have already saved in this browser.
    super('kit-local')
    this.version(1).stores({
      notes: 'id, updatedAt, pinned, title',
      prefs: 'key',
    })
  }
}

export const db = new BitKitDB()

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  const row = await db.prefs.get(key)
  return (row?.value as T) ?? fallback
}

export async function setPref<T>(key: string, value: T): Promise<void> {
  await db.prefs.put({ key, value })
}

export function newNote(): Note {
  return {
    id: crypto.randomUUID(),
    title: 'Untitled',
    body: '',
    pinned: false,
    updatedAt: Date.now(),
  }
}

export async function listNotes(): Promise<Note[]> {
  const all = await db.notes.toArray()
  return all.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
}

export async function upsertNote(note: Note): Promise<void> {
  await db.notes.put({ ...note, updatedAt: Date.now() })
}

export async function deleteNote(id: string): Promise<void> {
  await db.notes.delete(id)
}

export function exportNotes(notes: Note[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), notes }, null, 2)
}

export function importNotes(json: string): Note[] {
  const parsed = JSON.parse(json) as { notes?: Note[] }
  if (!Array.isArray(parsed.notes)) throw new Error('Backup file has no notes array.')
  return parsed.notes.map((note) => ({
    id: String(note.id || crypto.randomUUID()),
    title: String(note.title || 'Untitled').slice(0, 200),
    body: String(note.body || ''),
    pinned: Boolean(note.pinned),
    updatedAt: Number(note.updatedAt) || Date.now(),
  }))
}

export async function replaceNotes(notes: Note[]): Promise<void> {
  await db.transaction('rw', db.notes, async () => {
    await db.notes.clear()
    if (notes.length) await db.notes.bulkPut(notes)
  })
}
