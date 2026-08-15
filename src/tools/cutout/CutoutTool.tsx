import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { filesFromBlobs } from '../../lib/handoff'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { removeBackground } from '../../lib/cutout'

export default function CutoutTool() {
  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Blob | null>(null)
  const [threshold, setThreshold] = useState(0.5)
  const [invert, setInvert] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) setFile(image)
  })

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!result) {
      setResultUrl(null)
      return
    }
    const url = URL.createObjectURL(result)
    setResultUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result])

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      setResult(await removeBackground(file, threshold, invert))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cutout failed. The model may still be loading.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Background cutout"
      lede="On-device person/subject cutout. Your photo stays in this tab. The MediaPipe model and WASM may load once from a CDN."
    >
      <p className="banner">Best on a single person or a clear subject. This is not a studio-grade remover and it does not send the image anywhere.</p>
      <div className="split">
        <section className="panel">
          <DropZone
            accept="image/*"
            label="Drop a photo to cut out."
            onFiles={(files) => {
              setFile(files[0] ?? null)
              setResult(null)
            }}
          />
          {sourceUrl ? (
            <div className="preview-frame" style={{ marginTop: '1rem' }}>
              <img src={sourceUrl} alt="Original" />
            </div>
          ) : null}
        </section>
        <aside className="panel">
          <label className="field">
            <span>Edge threshold · {threshold.toFixed(2)}</span>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>
          <label className="row" style={{ marginBottom: '1rem' }}>
            <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
            Invert mask if the subject disappears
          </label>
          <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={() => void run()}>
            {busy ? 'Segmenting… first run downloads the model' : 'Remove background'}
          </button>
          {error ? <p className="status-bad">{error}</p> : null}
          {resultUrl ? (
            <>
              <div className="preview-frame checker" style={{ marginTop: '1rem' }}>
                <img src={resultUrl} alt="Cutout" />
              </div>
              <button
                type="button"
                className="btn"
                style={{ marginTop: '0.8rem' }}
                onClick={() => triggerDownload(result!, 'cutout.png')}
              >
                Download PNG
              </button>
            </>
          ) : null}
          <SendTo
            from="cutout"
            files={result ? filesFromBlobs([{ blob: result, name: 'cutout.png' }]) : file ? [file] : undefined}
          />
        </aside>
      </div>
    </ToolLayout>
  )
}
