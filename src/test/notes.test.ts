import { describe, expect, it, beforeEach } from 'vitest'
import { db, exportNotes, importNotes, listNotes, newNote, replaceNotes, upsertNote } from '../lib/db'
import { restoreBackup, type Backup } from '../lib/backup'

describe('notes storage', () => {
  beforeEach(async () => {
    await db.notes.clear()
    await db.prefs.clear()
  })

  it('survives upsert and list', async () => {
    const note = { ...newNote(), title: 'Hello', body: 'World' }
    await upsertNote(note)
    const listed = await listNotes()
    expect(listed).toHaveLength(1)
    expect(listed[0].title).toBe('Hello')
    expect(listed[0].body).toBe('World')
  })

  it('pins first', async () => {
    const a = { ...newNote(), id: 'a', title: 'A', pinned: false, updatedAt: 1 }
    const b = { ...newNote(), id: 'b', title: 'B', pinned: true, updatedAt: 2 }
    await upsertNote(a)
    await upsertNote(b)
    const listed = await listNotes()
    expect(listed[0].id).toBe('b')
  })

  it('round-trips export and import', async () => {
    const note = { ...newNote(), title: 'Keep', body: 'yes' }
    const json = exportNotes([note])
    const imported = importNotes(json)
    await replaceNotes(imported)
    const listed = await listNotes()
    expect(listed[0].title).toBe('Keep')
  })

  it('rejects invalid backup files', () => {
    expect(() => importNotes('{"nope":true}')).toThrow(/notes array/)
  })
})

describe('backup merge', () => {
  beforeEach(async () => {
    await db.notes.clear()
    await db.prefs.clear()
  })

  it('keeps local prefs on merge and only inserts missing keys', async () => {
    await db.prefs.put({ key: 'theme', value: 'local' })
    const older = { ...newNote(), id: 'n1', title: 'old', updatedAt: 10 }
    const newer = { ...newNote(), id: 'n1', title: 'new', updatedAt: 20 }
    await db.notes.put(older)
    const backup: Backup = {
      app: 'bitkit',
      version: 2,
      exportedAt: '2026-01-01T00:00:00.000Z',
      notes: [newer],
      prefs: [
        { key: 'theme', value: 'imported' },
        { key: 'fresh', value: 1 },
      ],
      local: {},
    }
    const result = await restoreBackup(backup, 'merge')
    expect(result.notesUpdated).toBe(1)
    expect((await db.prefs.get('theme'))?.value).toBe('local')
    expect((await db.prefs.get('fresh'))?.value).toBe(1)
    expect((await db.notes.get('n1'))?.title).toBe('new')
  })
})
