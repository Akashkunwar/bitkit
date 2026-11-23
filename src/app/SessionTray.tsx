import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { setHandoff } from '../lib/handoff'
import { toolsForFiles } from '../lib/fileRoutes'
import { useI18n } from '../lib/i18n'
import { SessionTrayContext, useSessionTray, type TrayItem } from './useSessionTray'

type Item = TrayItem

const MAX_FILES = 24
const MAX_BYTES = 80 * 1024 * 1024

function sameFile(a: File, b: File): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified
}

export function SessionTrayProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const [note, setNote] = useState<string | null>(null)
  const navigate = useNavigate()

  const add = useCallback((files: File[]) => {
    setItems((current) => {
      const next = [...current]
      let skipped = false
      for (const file of files) {
        if (next.some((item) => sameFile(item.file, file))) continue
        const bytes = next.reduce((sum, item) => sum + item.file.size, 0) + file.size
        if (next.length >= MAX_FILES || bytes > MAX_BYTES) {
          skipped = true
          continue
        }
        next.push({ id: crypto.randomUUID(), file })
      }
      setNote(skipped ? 'The tray holds 24 files or 80 MB, whichever comes first.' : null)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const clear = useCallback(() => {
    setItems([])
    setNote(null)
  }, [])

  const send = useCallback(
    (path: string) => {
      const files = items.map((item) => item.file)
      if (!files.length) return
      setHandoff({ files, from: 'tray' })
      navigate(path)
    },
    [items, navigate],
  )

  const value = useMemo(() => ({ items, note, add, remove, clear, send }), [items, note, add, remove, clear, send])

  return <SessionTrayContext.Provider value={value}>{children}</SessionTrayContext.Provider>
}

/** Files kept for this tab, so the next tool does not ask for them again. */
export function SessionTrayBar() {
  const { items, note, remove, clear, send } = useSessionTray()
  const { t } = useI18n()
  if (!items.length) return null
  const tools = toolsForFiles(items.map((item) => item.file)).slice(0, 4)
  return (
    <section className="session-tray no-print" aria-label={t('tray.label')}>
      <div className="session-tray-head">
        <strong>{t('tray.label')}</strong>
        <button type="button" className="btn-ghost" onClick={clear}>
          {t('tray.clear')}
        </button>
      </div>
      <ul className="session-tray-files">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.file.name}</span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`${t('tray.remove')} ${item.file.name}`}
              onClick={() => remove(item.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {tools.length ? (
        <div className="row">
          {tools.map((tool) => (
            <button key={tool.id} type="button" className="btn btn-sm" onClick={() => send(tool.path)}>
              {tool.title}
            </button>
          ))}
        </div>
      ) : null}
      {note ? <p className="hint">{note}</p> : null}
    </section>
  )
}
