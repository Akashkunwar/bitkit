import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { filesFromPaste } from '../../lib/clipboard'
import { decodeImage } from '../../lib/image/compress'
import { PASSPORT_PX, passportLayout, type SheetKind } from '../../lib/passport'

export default function PassportTool() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [kind, setKind] = useState<SheetKind>('4x6')
  const [copies, setCopies] = useState(6)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState<File | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const load = (next: File) => {
    if (url) URL.revokeObjectURL(url)
    setFile(next)
    setUrl(URL.createObjectURL(next))
    setSheet(null)
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

  const render = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const layout = passportLayout(kind, copies)
      const source = await decodeImage(file)
      const sw = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
      const sh = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
      const scale = Math.max(PASSPORT_PX / sw, PASSPORT_PX / sh)
      const tw = sw * scale
      const th = sh * scale
      const sx = (tw - PASSPORT_PX) / 2 / scale
      const sy = (th - PASSPORT_PX) / 2 / scale
      const canvas = canvasRef.current ?? document.createElement('canvas')
      canvas.width = layout.pageW
      canvas.height = layout.pageH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas is unavailable.')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, layout.pageW, layout.pageH)
      for (const cell of layout.cells) {
        ctx.drawImage(source as CanvasImageSource, sx, sy, PASSPORT_PX / scale, PASSPORT_PX / scale, cell.x, cell.y, cell.w, cell.h)
        ctx.strokeStyle = '#dddddd'
        ctx.strokeRect(cell.x + 0.5, cell.y + 0.5, cell.w - 1, cell.h - 1)
      }
      if ('close' in source) source.close()
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed.'))), 'image/jpeg', 0.92)
      })
      const out = new File([blob], `passport-sheet-${kind}.jpg`, { type: 'image/jpeg' })
      setSheet(out)
      triggerDownload(out, out.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the sheet.')
    } finally {
      setBusy(false)
    }
  }

  const layout = passportLayout(kind, copies)

  return (
    <ToolLayout
      title="Passport photo sheet"
      lede="Cover-crop to 600 × 600, then tile onto a 4×6 or A4 print sheet. Check the destination country’s rules before you print."
    >
      <DropZone onFiles={(files) => files[0] && load(files[0])} hint="Center the face. Cover crop matches the compress passport preset." />
      <div className="split">
        <section className="panel">
          {url ? (
            <div className="preview-frame" style={{ width: 240, height: 240 }}>
              <img src={url} alt="Source" style={{ objectFit: 'cover', width: 240, height: 240 }} />
            </div>
          ) : (
            <p className="muted">Drop a portrait photo.</p>
          )}
          <canvas ref={canvasRef} className="visually-hidden" />
        </section>
        <aside className="panel">
          <Segmented
            label="Sheet"
            value={kind}
            options={[
              { value: '4x6', label: '4 × 6 in' },
              { value: 'a4', label: 'A4' },
            ]}
            onChange={setKind}
          />
          <label className="field">
            <span>Copies — {copies} / {layout.cells.length || copies}</span>
            <input
              type="range"
              min={1}
              max={kind === '4x6' ? 6 : 12}
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={() => void render()}>
            {busy ? 'Building…' : 'Download sheet'}
          </button>
          {error ? <p className="status-bad">{error}</p> : null}
          <p className="hint">
            4×6 holds six 2-inch photos at 300 dpi. This is a print aid, not a guarantee of visa acceptance.
          </p>
          <SendTo from="passport" files={sheet ? [sheet] : file ? [file] : undefined} />
        </aside>
      </div>
    </ToolLayout>
  )
}
