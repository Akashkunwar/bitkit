import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { inspectPdf } from '../../lib/pdfPages'
import { encryptionWarning } from '../../lib/pdfLoad'
import {
  DEFAULT_NUMBERS,
  DEFAULT_WATERMARK,
  deletePages,
  NUMBER_FORMATS,
  PLACEMENTS,
  rotatePages,
  stampPdf,
  type NumberSpec,
  type WatermarkSpec,
} from '../../lib/stamp'

type Source = { file: File; bytes: Uint8Array; pages: number; encrypted: boolean }

export default function StampTool() {
  const [source, setSource] = useState<Source | null>(null)
  const [watermark, setWatermark] = useState<WatermarkSpec>(DEFAULT_WATERMARK)
  const [useWatermark, setUseWatermark] = useState(true)
  const [numbers, setNumbers] = useState<NumberSpec>(DEFAULT_NUMBERS)
  const [useNumbers, setUseNumbers] = useState(true)
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  const [margin, setMargin] = useState(28)
  const [range, setRange] = useState('')
  const [deleteRange, setDeleteRange] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [outFile, setOutFile] = useState<File | null>(null)

  const take = async (files: File[]) => {
    const pdf = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (!pdf) {
      setError('Drop a PDF file.')
      return
    }
    setError(null)
    setOutFile(null)
    const bytes = new Uint8Array(await pdf.arrayBuffer())
    const { pages, encrypted } = await inspectPdf(bytes)
    setSource({ file: pdf, bytes, pages, encrypted })
  }

  useHandoff((payload) => {
    if (payload.files?.length) void take(payload.files)
  })

  const emit = (bytes: Uint8Array, suffix: string) => {
    const name = source ? source.file.name.replace(/\.pdf$/i, '') : 'document'
    const file = new File([bytes.slice().buffer as ArrayBuffer], `${name}-${suffix}.pdf`, {
      type: 'application/pdf',
    })
    setOutFile(file)
    triggerDownload(file, file.name)
  }

  const apply = async () => {
    if (!source) return
    setBusy(true)
    setError(null)
    try {
      const bytes = await stampPdf(source.bytes, {
        watermark: useWatermark ? watermark : null,
        numbers: useNumbers ? numbers : null,
        header,
        footer,
        margin,
        range,
        filename: source.file.name,
      })
      emit(bytes, 'stamped')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stamp that PDF.')
    } finally {
      setBusy(false)
    }
  }

  const rotate = async (turns: number) => {
    if (!source) return
    setBusy(true)
    setError(null)
    try {
      emit(await rotatePages(source.bytes, range, turns), 'rotated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rotate that PDF.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!source || !deleteRange.trim()) return
    setBusy(true)
    setError(null)
    try {
      emit(await deletePages(source.bytes, deleteRange.trim()), 'trimmed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove those pages.')
    } finally {
      setBusy(false)
    }
  }

  const encryptNote = encryptionWarning(source?.encrypted ?? false)

  return (
    <ToolLayout
      title="Watermark & page numbers"
      lede="Stamp a PDF with a watermark, page numbers, Bates numbers, or a running head — offline, without re-rendering the pages."
    >
      <DropZone
        accept="application/pdf,.pdf"
        label="Drop a PDF."
        hint="The marks are drawn over the existing pages, so the original text stays selectable."
        onFiles={(files) => void take(files)}
      />

      {error ? <p className="status-bad">{error}</p> : null}
      {encryptNote ? <p className="banner warn">{encryptNote}</p> : null}
      {source ? (
        <p className="hint">
          <code>{source.file.name}</code> · {source.pages} page{source.pages === 1 ? '' : 's'}
        </p>
      ) : null}

      <div className="split">
        <section className="panel">
          <label className="row">
            <input type="checkbox" checked={useWatermark} onChange={(e) => setUseWatermark(e.target.checked)} />
            <strong>Watermark</strong>
          </label>
          {useWatermark ? (
            <>
              <label className="field">
                <span>Text</span>
                <input
                  value={watermark.text}
                  onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                  placeholder="DRAFT"
                />
              </label>
              <label className="field">
                <span>Size (pt)</span>
                <input
                  type="number"
                  min={8}
                  max={200}
                  value={watermark.size}
                  onChange={(e) => setWatermark({ ...watermark, size: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Angle: {watermark.angle}°</span>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  value={watermark.angle}
                  onChange={(e) => setWatermark({ ...watermark, angle: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Opacity: {Math.round(watermark.opacity * 100)}%</span>
                <input
                  type="range"
                  min={2}
                  max={100}
                  value={Math.round(watermark.opacity * 100)}
                  onChange={(e) => setWatermark({ ...watermark, opacity: Number(e.target.value) / 100 })}
                />
              </label>
              <label className="field">
                <span>Colour</span>
                <input
                  type="color"
                  value={watermark.color}
                  onChange={(e) => setWatermark({ ...watermark, color: e.target.value })}
                />
              </label>
              <label className="row">
                <input
                  type="checkbox"
                  checked={watermark.tile}
                  onChange={(e) => setWatermark({ ...watermark, tile: e.target.checked })}
                />
                Tile across the whole page
              </label>
              <p className="hint">
                A watermark is a visible mark, not a lock. Anyone with a PDF editor can take it off again.
              </p>
            </>
          ) : null}
        </section>

        <aside className="panel">
          <label className="row">
            <input type="checkbox" checked={useNumbers} onChange={(e) => setUseNumbers(e.target.checked)} />
            <strong>Page numbers</strong>
          </label>
          {useNumbers ? (
            <>
              <label className="field">
                <span>Format</span>
                <select
                  value={numbers.format}
                  onChange={(e) => setNumbers({ ...numbers, format: e.target.value as NumberSpec['format'] })}
                >
                  {NUMBER_FORMATS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Position</span>
                <select
                  value={numbers.placement}
                  onChange={(e) => setNumbers({ ...numbers, placement: e.target.value as NumberSpec['placement'] })}
                >
                  {PLACEMENTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {numbers.format === 'bates' ? (
                <>
                  <label className="field">
                    <span>Bates prefix</span>
                    <input value={numbers.prefix} onChange={(e) => setNumbers({ ...numbers, prefix: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Digits</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={numbers.digits}
                      onChange={(e) => setNumbers({ ...numbers, digits: Number(e.target.value) })}
                    />
                  </label>
                </>
              ) : null}
              <label className="field">
                <span>Start at</span>
                <input
                  type="number"
                  min={0}
                  value={numbers.startAt}
                  onChange={(e) => setNumbers({ ...numbers, startAt: Number(e.target.value) })}
                />
              </label>
              <label className="row">
                <input
                  type="checkbox"
                  checked={numbers.skipFirst}
                  onChange={(e) => setNumbers({ ...numbers, skipFirst: e.target.checked })}
                />
                Leave the cover page unnumbered
              </label>
            </>
          ) : null}

          <label className="field">
            <span>Header (top left)</span>
            <input value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Confidential — {file}" />
          </label>
          <label className="field">
            <span>Footer (bottom left)</span>
            <input value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="{date}" />
          </label>
          <p className="hint">
            Header and footer accept <code>{'{n}'}</code>, <code>{'{total}'}</code>, <code>{'{file}'}</code>, and{' '}
            <code>{'{date}'}</code>.
          </p>
          <label className="field">
            <span>Margin (pt)</span>
            <input type="number" min={8} max={120} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Pages (blank = all)</span>
            <input value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-3,7" />
          </label>

          <div className="row" style={{ marginTop: '0.9rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={!source || busy} onClick={() => void apply()}>
              {busy ? 'Working…' : 'Apply & download'}
            </button>
            <button type="button" className="btn" disabled={!source || busy} onClick={() => void rotate(1)}>
              Rotate ↻
            </button>
            <button type="button" className="btn" disabled={!source || busy} onClick={() => void rotate(-1)}>
              Rotate ↺
            </button>
          </div>

          <label className="field" style={{ marginTop: '1rem' }}>
            <span>Remove pages</span>
            <input value={deleteRange} onChange={(e) => setDeleteRange(e.target.value)} placeholder="2,5-6" />
          </label>
          <button
            type="button"
            className="btn"
            disabled={!source || busy || !deleteRange.trim()}
            onClick={() => void remove()}
          >
            Delete those pages
          </button>

          <SendTo from="stamp" files={outFile ? [outFile] : source ? [source.file] : []} />
        </aside>
      </div>
    </ToolLayout>
  )
}
