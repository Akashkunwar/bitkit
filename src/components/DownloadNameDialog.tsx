import { useEffect, useRef, useState } from 'react'
import { bindDownloadNamePrompt, type DownloadNameRequest } from '../lib/downloadName'

export function DownloadNameDialog() {
  const [request, setRequest] = useState<DownloadNameRequest | null>(null)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLFormElement>(null)
  const restoreRef = useRef<Element | null>(null)

  useEffect(
    () =>
      bindDownloadNamePrompt((next) => {
        setRequest(next)
        if (next) setName(next.suggested)
      }),
    [],
  )

  useEffect(() => {
    if (!request) return
    restoreRef.current = document.activeElement
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      const dot = request.suggested.lastIndexOf('.')
      input.setSelectionRange(0, dot > 0 ? dot : request.suggested.length)
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        request.resolve(null)
        return
      }
      if (event.key !== 'Tab') return
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey, true)
      ;(restoreRef.current as HTMLElement | null)?.focus?.()
    }
  }, [request])

  if (!request) return null

  return (
    <div className="sheet-backdrop no-print" onClick={() => request.resolve(null)}>
      <form
        ref={dialogRef}
        className="sheet name-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-name-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          request.resolve(name)
        }}
      >
        <h2 id="download-name-title">Name this file</h2>
        <label className="field">
          <span>File name</span>
          <input
            ref={inputRef}
            className="text-input"
            value={name}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <p className="hint">The download uses this name. The file type stays the same.</p>
        <div className="row">
          <button type="submit" className="btn btn-primary">
            Download
          </button>
          <button type="button" className="btn" onClick={() => request.resolve(null)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
