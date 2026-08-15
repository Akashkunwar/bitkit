import { describe, expect, it, beforeEach } from 'vitest'
import { db, exportNotes, importNotes, listNotes, newNote, replaceNotes, upsertNote } from '../lib/db'

describe('notes storage', () => {
  beforeEach(async () => {
    await db.notes.clear()
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
