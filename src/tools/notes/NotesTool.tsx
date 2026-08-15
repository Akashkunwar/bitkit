import { useEffect, useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { deleteNote, exportNotes, importNotes, listNotes, newNote, replaceNotes, upsertNote, type Note } from '../../lib/db'
import { renderMarkdown } from '../../lib/markdown'
import { markdownHtmlToPdf } from '../../lib/pdf'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { SendTo } from '../../components/SendTo'

export default function NotesTool() {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const timer = useRef<number | null>(null)

  const refresh = async (select?: string) => {
    const all = await listNotes()
    setNotes(all)
    setActiveId((id) => select ?? id ?? all[0]?.id ?? null)
  }

  useEffect(() => {
    void (async () => {
      const all = await listNotes()
      if (!all.length) {
        const note = newNote()
        await upsertNote(note)
        setNotes([note])
        setActiveId(note.id)
        return
      }
      setNotes(all)
      setActiveId(all[0].id)
    })()
  }, [])

  useHandoff((payload) => {
    const body = payload.text
    if (!body) return
    void (async () => {
      const note = newNote()
      note.body = body
      note.title = body.split('\n')[0]?.slice(0, 80) ?? 'Imported'
      await upsertNote(note)
      await refresh(note.id)
    })()
  })

  const active = notes.find((note) => note.id === activeId) ?? null
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((note) => `${note.title}\n${note.body}`.toLowerCase().includes(q))
  }, [notes, query])

  const save = (patch: Partial<Note>) => {
    if (!active) return
    const next = { ...active, ...patch }
    setNotes((list) => list.map((note) => (note.id === next.id ? next : note)))
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void upsertNote(next)
    }, 280)
  }

  return (
    <ToolLayout
      title="Local notes"
      lede="Stored in this browser only. Clearing site data or using private mode will drop them — export a backup if they matter."
    >
      <div className="notes-split">
        <aside className="panel">
          <input
            className="text-input"
            placeholder="Search notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search notes"
          />
          <div className="row" style={{ margin: '0.8rem 0' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                const note = newNote()
                await upsertNote(note)
                await refresh(note.id)
              }}
            >
              New
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                triggerDownload(
                  new Blob([exportNotes(notes)], { type: 'application/json' }),
                  'kit-notes.json',
                )
              }
            >
              Export
            </button>
            <label className="btn">
              Import
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  const imported = importNotes(await file.text())
                  await replaceNotes(imported)
                  await refresh(imported[0]?.id)
                }}
              />
            </label>
          </div>
          <div className="note-list">
            {filtered.map((note) => (
              <button
                key={note.id}
                type="button"
                className="note-item"
                data-active={note.id === activeId}
                onClick={() => setActiveId(note.id)}
              >
                {note.pinned ? '📌 ' : ''}
                {note.title || 'Untitled'}
              </button>
            ))}
          </div>
        </aside>
        <section className="panel note-editor">
          {active ? (
            <>
              <div className="row" style={{ marginBottom: '0.8rem' }}>
                <button type="button" className="btn" onClick={() => save({ pinned: !active.pinned })}>
                  {active.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button type="button" className="btn" onClick={() => setPreview((v) => !v)}>
                  {preview ? 'Edit' : 'Preview'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={pdfBusy || !active.body.trim()}
                  onClick={async () => {
                    setPdfBusy(true)
                    try {
                      const html = renderMarkdown(active.body)
                      const blob = await markdownHtmlToPdf(html, active.body, {
                        pageSize: 'a4',
                        marginMm: 16,
                        header: active.title,
                        footer: 'BitKit',
                      })
                      triggerDownload(blob, `${active.title || 'note'}.pdf`)
                    } finally {
                      setPdfBusy(false)
                    }
                  }}
                >
                  {pdfBusy ? 'PDF…' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    await deleteNote(active.id)
                    await refresh()
                  }}
                >
                  Delete
                </button>
              </div>
              <input
                className="text-input"
                value={active.title}
                onChange={(event) => save({ title: event.target.value })}
                aria-label="Note title"
              />
              {preview ? (
                <div className="md-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.body) }} />
              ) : (
                <textarea
                  value={active.body}
                  onChange={(event) => save({ body: event.target.value })}
                  placeholder="Write anything. Markdown welcome."
                  aria-label="Note body"
                />
              )}
              <SendTo from="notes" text={active.body} />
            </>
          ) : (
            <p className="muted">No note selected.</p>
          )}
        </section>
      </div>
    </ToolLayout>
  )
}
