import { useEffect, useRef, useState } from 'react'
import { bindDownloadNamePrompt, type DownloadNameRequest } from '../lib/downloadName'

export function DownloadNameDialog() {
  const [request, setRequest] = useState<DownloadNameRequest | null>(null)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      const dot = request.suggested.lastIndexOf('.')
      input.setSelectionRange(0, dot > 0 ? dot : request.suggested.length)
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      request.resolve(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [request])

  if (!request) return null

  return (
    <div className="sheet-backdrop no-print" onClick={() => request.resolve(null)}>
      <form
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
