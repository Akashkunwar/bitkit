import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { filesFromBlobs } from '../../lib/handoff'
import { buildFaviconSet, ICON_SIZES } from '../../lib/favicon'
import { zipStore } from '../../lib/zip'
import { filesFromPaste } from '../../lib/clipboard'

export default function FaviconTool() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<File[]>([])

  const load = (next: File) => {
    if (url) URL.revokeObjectURL(url)
    setFile(next)
    setUrl(URL.createObjectURL(next))
    setOutputs([])
    setError(null)
  }

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) load(image)
  })

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void filesFromPaste(event).then((files) => {
        if (files[0]) load(files[0])
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const set = await buildFaviconSet(file)
      const files = filesFromBlobs(
        set.map((item) => ({
          blob: new Blob([item.bytes.slice().buffer as ArrayBuffer], {
            type: item.name.endsWith('.ico') ? 'image/x-icon' : 'image/png',
          }),
          name: item.name,
        })),
      )
      setOutputs(files)
      const zip = zipStore(set.map((item) => ({ name: item.name, data: item.bytes })))
      triggerDownload(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'favicon-set.zip')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build icons.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Favicon set"
      lede="One square image becomes 16–512 PNG icons plus a favicon.ico. Cover-cropped in this tab."
    >
      <DropZone onFiles={(files) => files[0] && load(files[0])} hint="Use a simple mark. Tiny sizes crush fine detail." />
      <div className="split">
        <section className="panel">
          {url ? (
            <div className="preview-frame" style={{ width: 240, height: 240 }}>
              <img src={url} alt="Source" />
            </div>
          ) : (
            <p className="muted">Drop a logo or emoji-style mark.</p>
          )}
          <p className="hint" style={{ marginTop: '0.75rem' }}>
            Sizes: {ICON_SIZES.join(', ')} px, plus ICO with 16/32/48.
          </p>
        </section>
        <aside className="panel">
          <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={() => void run()}>
            {busy ? 'Building…' : 'Download ZIP'}
          </button>
          {outputs.map((out) => (
            <p key={out.name} className="hint">
              {out.name} · {out.size} bytes
            </p>
          ))}
          {error ? <p className="status-bad">{error}</p> : null}
          <SendTo from="favicon" files={outputs.length ? outputs : file ? [file] : undefined} />
        </aside>
      </div>
    </ToolLayout>
  )
}
