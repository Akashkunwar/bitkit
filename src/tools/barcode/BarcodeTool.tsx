import { useMemo, useState } from 'react'
import { Check, Copy, Download, FileArchive } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useToolSettings } from '../../lib/prefs'
import { useCopied } from '../../lib/useCopied'
import { zipStore } from '../../lib/zip'
import { BarcodeError, SYMBOLOGIES, barcodeSvg, encodeBarcode, type Encoded, type Symbology } from '../../lib/barcode'

const DEFAULTS = {
  symbology: 'code128' as Symbology,
  value: 'BITKIT-2026-0042',
  moduleWidth: 2,
  height: 80,
  showText: true,
  foreground: '#000000',
  background: '#ffffff',
  batch: false,
}

function svgToPng(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width * scale
      canvas.height = image.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas is unavailable.'))
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encode failed.'))), 'image/png')
    }
    image.onerror = () => reject(new Error('Could not draw the barcode.'))
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

type Settings = typeof DEFAULTS

function renderSvg(encoded: Encoded, settings: Settings): string {
  // EAN/UPC scanners need about 11 blank modules either side; 10 suits the rest.
  const quietZone = settings.symbology === 'code128' || settings.symbology === 'code39' ? 10 : 11
  return barcodeSvg(encoded, {
    moduleWidth: settings.moduleWidth,
    height: settings.height,
    quietZone,
    showText: settings.showText,
    foreground: settings.foreground,
    background: settings.background,
  })
}

function fileSafe(value: string): string {
  return (
    value
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'barcode'
  )
}

export default function BarcodeTool() {
  const { settings, update } = useToolSettings('barcode', DEFAULTS)
  const [batchText, setBatchText] = useState('SKU-0001\nSKU-0002\nSKU-0003')
  const [busy, setBusy] = useState(false)
  const [outputs, setOutputs] = useState<File[]>([])
  const { copied, copy } = useCopied(1400)
  const info = SYMBOLOGIES.find((s) => s.id === settings.symbology) ?? SYMBOLOGIES[0]
  const single = useMemo(() => {
    try {
      const encoded = encodeBarcode(settings.symbology, settings.value)
      return { svg: renderSvg(encoded, settings), text: encoded.text, error: null }
    } catch (err) {
      return { svg: null, text: '', error: err instanceof BarcodeError ? err.message : 'Could not encode that.' }
    }
  }, [settings])

  const batch = useMemo(() => {
    if (!settings.batch) return []
    return batchText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 500)
      .map((line) => {
        try {
          const encoded = encodeBarcode(settings.symbology, line)
          return { line, svg: renderSvg(encoded, settings), text: encoded.text, error: null as string | null }
        } catch (err) {
          return { line, svg: null, text: '', error: err instanceof Error ? err.message : 'Invalid' }
        }
      })
  }, [settings, batchText])

  const downloadSingle = async (kind: 'svg' | 'png') => {
    if (!single.svg) return
    const name = `${fileSafe(single.text)}.${kind}`
    const blob = kind === 'svg' ? new Blob([single.svg], { type: 'image/svg+xml' }) : await svgToPng(single.svg)
    const file = new File([blob], name, { type: blob.type })
    setOutputs([file])
    triggerDownload(file, name)
  }

  const downloadBatch = async () => {
    const valid = batch.filter((row) => row.svg)
    if (!valid.length) return
    setBusy(true)
    try {
      const files: File[] = []
      for (const row of valid) {
        const blob = await svgToPng(row.svg!)
        files.push(new File([blob], `${fileSafe(row.text)}.png`, { type: 'image/png' }))
      }
      const entries = await Promise.all(
        files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) })),
      )
      const zip = zipStore(entries)
      triggerDownload(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'barcodes.zip')
      setOutputs(files)
    } finally {
      setBusy(false)
    }
  }

  const invalid = batch.filter((row) => row.error).length

  return (
    <ToolLayout
      title="Barcode generator"
      lede="Code 128, EAN-13, UPC-A, EAN-8, and Code 39 as sharp SVG or PNG — one at a time or a whole list at once. Check digits are worked out for you."
    >
      <div className="split">
        <section className="panel">
          <Segmented
            label="Type"
            value={settings.symbology}
            onChange={(symbology) => {
              const next = SYMBOLOGIES.find((s) => s.id === symbology)!
              update({ symbology, value: next.example })
            }}
            options={SYMBOLOGIES.map((s) => ({ value: s.id, label: s.label, title: s.hint }))}
          />
          <p className="hint" style={{ marginTop: '-0.5rem' }}>
            {info.hint}
          </p>

          <label className="switch" style={{ margin: '0.5rem 0 1rem' }}>
            <input type="checkbox" checked={settings.batch} onChange={(e) => update({ batch: e.target.checked })} />
            Make many at once (one value per line)
          </label>

          {settings.batch ? (
            <>
              <label className="field">
                <span>Values</span>
                <textarea
                  className="code-area"
                  rows={8}
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                />
              </label>
              <p className="hint">
                {batch.length} {batch.length === 1 ? 'barcode' : 'barcodes'}
                {invalid ? ` · ${invalid} invalid (shown below)` : ''}
              </p>
              <ul className="barcode-batch">
                {batch.slice(0, 60).map((row, i) => (
                  <li key={`${row.line}-${i}`}>
                    {row.svg ? (
                      <div className="barcode-mini" dangerouslySetInnerHTML={{ __html: row.svg }} />
                    ) : (
                      <p className="status-bad">
                        {row.line}: {row.error}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {batch.length > 60 ? <p className="hint">Showing the first 60; the ZIP includes all.</p> : null}
            </>
          ) : (
            <>
              <label className="field">
                <span>Value</span>
                <input
                  value={settings.value}
                  onChange={(e) => update({ value: e.target.value })}
                  placeholder={info.example}
                  aria-invalid={!!single.error}
                  spellCheck={false}
                />
              </label>
              {single.error ? (
                <p className="status-bad" role="alert">
                  {single.error}
                </p>
              ) : null}
              <div className="barcode-stage">
                {single.svg ? (
                  <div
                    className="barcode-preview"
                    role="img"
                    aria-label={`${info.label} barcode for ${single.text}`}
                    dangerouslySetInnerHTML={{ __html: single.svg }}
                  />
                ) : (
                  <p className="muted">Fix the value to see the barcode.</p>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="panel">
          <label className="field">
            <span>Bar width · {settings.moduleWidth}px</span>
            <input
              type="range"
              min={1}
              max={5}
              value={settings.moduleWidth}
              onChange={(e) => update({ moduleWidth: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>Height · {settings.height}px</span>
            <input
              type="range"
              min={30}
              max={200}
              step={5}
              value={settings.height}
              onChange={(e) => update({ height: Number(e.target.value) })}
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Bars</span>
              <input
                type="color"
                value={settings.foreground}
                onChange={(e) => update({ foreground: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Background</span>
              <input
                type="color"
                value={settings.background}
                onChange={(e) => update({ background: e.target.value })}
              />
            </label>
          </div>
          <label className="switch" style={{ marginBottom: '1rem' }}>
            <input
              type="checkbox"
              checked={settings.showText}
              onChange={(e) => update({ showText: e.target.checked })}
            />
            Print the value under the bars
          </label>
          <p className="hint">Keep dark bars on a light background — most scanners cannot read inverted barcodes.</p>

          {settings.batch ? (
            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              disabled={busy || !batch.some((row) => row.svg)}
              onClick={() => void downloadBatch()}
            >
              {busy ? <span className="spinner" aria-hidden="true" /> : <FileArchive size={18} aria-hidden="true" />}
              Download {batch.length - invalid} PNGs (ZIP)
            </button>
          ) : (
            <div className="stack">
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                disabled={!single.svg}
                onClick={() => void downloadSingle('png')}
              >
                <Download size={18} aria-hidden="true" />
                Download PNG
              </button>
              <div className="grid-2">
                <button type="button" className="btn" disabled={!single.svg} onClick={() => void downloadSingle('svg')}>
                  SVG
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!single.svg}
                  onClick={() => single.svg && void copy(single.svg)}
                >
                  {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy SVG'}
                </button>
              </div>
            </div>
          )}
          <SendTo from="barcode" files={outputs} />
        </aside>
      </div>
    </ToolLayout>
  )
}
