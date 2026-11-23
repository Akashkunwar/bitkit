import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { triggerDownload } from '../lib/download'
import { LABEL_PAGE, labelGrid, type PageSize } from '../lib/labelSheet'

type Props = {
  /** Used once per cell when the list below is empty. */
  sample: string
  renderPng: (value: string) => Promise<Blob>
}

/**
 * A printable page of codes. One value per line, or leave the list empty
 * to repeat the code that is already on screen.
 */
export function LabelSheet({ sample, renderPng }: Props) {
  const [lines, setLines] = useState('')
  const [cols, setCols] = useState(3)
  const [rows, setRows] = useState(8)
  const [page, setPage] = useState<PageSize>('a4')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    const typed = lines
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const values = typed.length ? typed : sample.trim() ? Array.from({ length: cols * rows }, () => sample.trim()) : []
    if (!values.length) {
      setError('Enter a value, or fill the list with one code per line.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const pdf = await PDFDocument.create()
      const cells = labelGrid({ page, cols, rows })
      const size = LABEL_PAGE[page]
      for (let start = 0; start < values.length; start += cells.length) {
        const slice = values.slice(start, start + cells.length)
        const sheet = pdf.addPage([size.width, size.height])
        for (let index = 0; index < slice.length; index += 1) {
          const blob = await renderPng(slice[index])
          if (blob.type && blob.type !== 'image/png') {
            throw new Error('Label images have to be PNG so the sheet can embed them.')
          }
          const bytes = new Uint8Array(await blob.arrayBuffer())
          const image = await pdf.embedPng(bytes)
          const cell = cells[index]
          const scale = Math.min((cell.width - 8) / image.width, (cell.height - 8) / image.height)
          const w = image.width * scale
          const h = image.height * scale
          sheet.drawImage(image, {
            x: cell.x + (cell.width - w) / 2,
            y: cell.y + (cell.height - h) / 2,
            width: w,
            height: h,
          })
        }
      }
      const bytes = await pdf.save()
      triggerDownload(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }), 'labels.pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the label sheet.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="label-sheet">
      <summary>Print a label sheet</summary>
      <p className="hint">
        One code per line, or leave this empty to fill the page with the code above. The PDF stays on this device.
      </p>
      <label className="field">
        <span>Values</span>
        <textarea
          className="code-area"
          rows={5}
          value={lines}
          placeholder={sample || 'One value per line'}
          onChange={(event) => setLines(event.target.value)}
        />
      </label>
      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>Columns</span>
          <input
            className="text-input"
            type="number"
            min={1}
            max={8}
            value={cols}
            onChange={(event) => setCols(Number(event.target.value) || 1)}
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Rows</span>
          <input
            className="text-input"
            type="number"
            min={1}
            max={12}
            value={rows}
            onChange={(event) => setRows(Number(event.target.value) || 1)}
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Page</span>
          <select className="text-input" value={page} onChange={(event) => setPage(event.target.value as PageSize)}>
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
      </div>
      <button type="button" className="btn" disabled={busy} onClick={() => void download()}>
        {busy ? 'Building…' : 'Download label PDF'}
      </button>
      {error ? <p className="status-bad">{error}</p> : null}
    </details>
  )
}
