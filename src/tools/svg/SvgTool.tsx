import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { filesFromBlobs } from '../../lib/handoff'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { rasterToSvg, svgFileToPng } from '../../lib/svgConvert'

type Mode = 'svg2png' | 'png2svg'

export default function SvgTool() {
  const [mode, setMode] = useState<Mode>('svg2png')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [png, setPng] = useState<Blob | null>(null)
  const [svg, setSvg] = useState('')
  const [scale, setScale] = useState(2)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    const next = payload.files?.[0]
    if (!next) return
    setFile(next)
    if (next.type === 'image/svg+xml' || next.name.endsWith('.svg')) setMode('svg2png')
    else setMode('png2svg')
  })

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const convert = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'svg2png') {
        const blob = await svgFileToPng(file, scale)
        setPng(blob)
        setSvg('')
      } else {
        setSvg(await rasterToSvg(file))
        setPng(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Convert failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="SVG convert"
      lede="SVG to a crisp PNG, or wrap a PNG in an SVG. The wrap is an honest <image> container — it does not vectorize."
    >
      <Segmented
        label="Direction"
        value={mode}
        options={[
          { value: 'svg2png', label: 'SVG → PNG' },
          { value: 'png2svg', label: 'PNG → SVG wrap' },
        ]}
        onChange={(next) => {
          setMode(next)
          setPng(null)
          setSvg('')
        }}
      />
      <div className="split">
        <section className="panel">
          <DropZone
            accept={mode === 'svg2png' ? 'image/svg+xml,.svg' : 'image/png,image/jpeg,image/webp'}
            label={mode === 'svg2png' ? 'Drop an SVG.' : 'Drop a PNG, JPEG, or WebP.'}
            onFiles={(files) => {
              setFile(files[0] ?? null)
              setPng(null)
              setSvg('')
            }}
          />
          {preview ? (
            <div className="preview-frame checker" style={{ marginTop: '1rem' }}>
              <img src={preview} alt="Source" />
            </div>
          ) : null}
        </section>
        <aside className="panel">
          {mode === 'svg2png' ? (
            <label className="field">
              <span>Scale · {scale}×</span>
              <input type="range" min={1} max={4} step={1} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
            </label>
          ) : (
            <p className="banner warn">This embeds the raster as a data URL. Paths are not traced.</p>
          )}
          <button type="button" className="btn btn-primary" disabled={!file || busy} onClick={() => void convert()}>
            {busy ? 'Converting…' : 'Convert'}
          </button>
          {error ? <p className="status-bad">{error}</p> : null}
          {png ? (
            <div className="row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn" onClick={() => triggerDownload(png, 'mark.png')}>
                Download PNG
              </button>
            </div>
          ) : null}
          {svg ? (
            <>
              <textarea className="code-area" rows={8} readOnly value={svg} style={{ marginTop: '1rem' }} />
              <div className="row">
                <button type="button" className="btn" onClick={() => void copy(svg, 'svg')}>
                  {copied === 'svg' ? 'Copied ✓' : 'Copy SVG'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), 'wrapped.svg')}
                >
                  Download SVG
                </button>
              </div>
            </>
          ) : null}
          <SendTo
            from="svg"
            files={png ? filesFromBlobs([{ blob: png, name: 'mark.png' }]) : file ? [file] : undefined}
            text={svg || undefined}
          />
        </aside>
      </div>
    </ToolLayout>
  )
}
