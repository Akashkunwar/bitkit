import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DropZone } from '../components/DropZone'
import { ToolLayout } from '../components/ToolLayout'
import { setHandoff, suggestPath, takeHandoff } from '../lib/handoff'
import { SEND_TARGETS } from '../lib/handoff'

const SHARE_CACHE = 'kit-share'

async function filesFromShareCache(): Promise<{ files: File[]; text: string }> {
  if (!('caches' in window)) return { files: [], text: '' }
  const cache = await caches.open(SHARE_CACHE)
  const stored = await cache.match('files')
  const textRes = await cache.match('text')
  const text = textRes ? await textRes.text() : ''
  const files: File[] = []
  if (stored) {
    const body = await stored.formData()
    for (const value of body.values()) {
      if (value instanceof File) files.push(value)
    }
  }
  await cache.delete('files')
  await cache.delete('text')
  return { files, text }
}

export default function SharePage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Looking for a shared file…')

  useEffect(() => {
    let cancelled = false
    const consume = (incoming: File[], incomingText: string) => {
      if (cancelled) return
      setFiles(incoming)
      setText(incomingText)
      if (incoming.length || incomingText) {
        const path = suggestPath(incoming, incomingText)
        setHandoff({ files: incoming, text: incomingText || undefined, from: 'share' })
        navigate(path, { replace: true })
      } else {
        setStatus('Drop a file here, or share one to BitKit from another app after install.')
      }
    }

    const pending = takeHandoff()
    if (pending?.files?.length || pending?.text) {
      consume(pending.files ?? [], pending.text ?? '')
      return () => {
        cancelled = true
      }
    }

    void filesFromShareCache().then((result) => consume(result.files, result.text))

    return () => {
      cancelled = true
    }
  }, [navigate])

  return (
    <ToolLayout
      title="Open with BitKit"
      lede="Shared or opened files stay on this device. Pick a tool, or let BitKit route by type."
    >
      <p className="hint">{status}</p>
      <DropZone
        accept="image/*,application/pdf,.pdf,.md,.txt,.json"
        multiple
        label="Drop files to route them."
        onFiles={(incoming) => {
          setFiles(incoming)
          const path = suggestPath(incoming, text)
          setHandoff({ files: incoming, text: text || undefined, from: 'share' })
          navigate(path)
        }}
      />
      {files.length ? (
        <div className="row" style={{ flexWrap: 'wrap', marginTop: '1rem' }}>
          {SEND_TARGETS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="btn"
              onClick={() => {
                setHandoff({ files, text: text || undefined, from: 'share' })
                navigate(tool.path)
              }}
            >
              {tool.title}
            </button>
          ))}
        </div>
      ) : null}
    </ToolLayout>
  )
}
