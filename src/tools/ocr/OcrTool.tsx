import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { recognizeImage } from '../../lib/ocr'

export default function OcrTool() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) setFile(image)
  })

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const result = await recognizeImage(file)
      setText(result.text)
      setConfidence(result.confidence)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed. The engine may still be loading.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="OCR"
      lede="Read printed text from a photo. The image never leaves this tab. The recognition engine and English language pack may load once from a CDN."
    >
      <p className="banner">Your photo stays local. Tesseract WASM and the English traineddata can download the first time you run this.</p>
      <div className="split">
        <section className="panel">
          <DropZone
            accept="image/*"
            label="Drop a screenshot or photo of text."
            onFiles={(files) => {
              setFile(files[0] ?? null)
              setText('')
              setConfidence(null)
            }}
          />
          {preview ? (
            <div className="preview-frame" style={{ marginTop: '1rem' }}>
              <img src={preview} alt="OCR source" />
            </div>
          ) : null}
        </section>
        <aside className="panel">
          <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={() => void run()}>
            {busy ? 'Reading… first run can take a minute' : 'Read text'}
          </button>
          {confidence != null ? (
            <p className={confidence >= 60 ? 'status-ok' : 'status-bad'}>Engine confidence {confidence.toFixed(0)}%</p>
          ) : (
            <p className="hint">Works best on high-contrast printed Latin text. Handwriting is unreliable.</p>
          )}
          {error ? <p className="status-bad">{error}</p> : null}
          <label className="field" style={{ marginTop: '1rem' }}>
            <span>Text</span>
            <textarea className="code-area" rows={14} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="row">
            <button type="button" className="btn" disabled={!text} onClick={() => void copy(text, 'ocr')}>
              {copied === 'ocr' ? 'Copied ✓' : 'Copy'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!text}
              onClick={() => triggerDownload(new Blob([text], { type: 'text/plain' }), 'ocr.txt')}
            >
              Download .txt
            </button>
          </div>
          <SendTo from="ocr" files={file ? [file] : undefined} text={text} />
        </aside>
      </div>
    </ToolLayout>
  )
}
