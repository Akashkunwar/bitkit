import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { parseCsv } from '../../lib/textbench'
import { buildXlsx, readXlsx } from '../../lib/xlsx'
import { zipStore } from '../../lib/zip'
import { rowsToCsv, splitRows } from '../../lib/sheetSplit'

export default function SheetSplitTool() {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<string[][]>([])
  const [perFile, setPerFile] = useState(100)
  const [header, setHeader] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const take = async (next: File) => {
    setError(null)
    setFile(next)
    try {
      if (next.name.toLowerCase().endsWith('.xlsx')) {
        setRows(await readXlsx(new Uint8Array(await next.arrayBuffer())))
      } else {
        setRows(parseCsv(await next.text()))
      }
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Could not read that sheet.')
    }
  }

  useHandoff((payload) => {
    const next = payload.files?.[0]
    if (next) void take(next)
  })

  const chunks = rows.length ? splitRows(rows, perFile, header) : []

  const save = (kind: 'csv' | 'xlsx') => {
    setBusy(true)
    setError(null)
    try {
      const files = chunks.map((chunk, index) => {
        const name = `part-${String(index + 1).padStart(2, '0')}.${kind}`
        const data = kind === 'csv' ? new TextEncoder().encode(rowsToCsv(chunk)) : buildXlsx(chunk)
        return { name, data }
      })
      if (files.length === 1) {
        const type = kind === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        triggerDownload(new Blob([files[0].data.slice().buffer as ArrayBuffer], { type }), files[0].name)
      } else {
        const zip = zipStore(files)
        triggerDownload(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), `split-${kind}.zip`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not split that sheet.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Sheet split"
      lede="Split a CSV or Excel sheet into smaller files. The header can repeat on each part."
    >
      <DropZone
        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        label="Drop a CSV or .xlsx."
        hint="Excel reading uses the first sheet."
        onFiles={(files) => files[0] && void take(files[0])}
      />
      {file ? (
        <p className="hint">
          {file.name} · {rows.length} rows · {chunks.length} file{chunks.length === 1 ? '' : 's'}
        </p>
      ) : null}
      <div className="row">
        <label className="field">
          <span>Data rows per file</span>
          <input
            className="text-input"
            type="number"
            min={1}
            value={perFile}
            onChange={(e) => setPerFile(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <label className="row">
          <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
          Repeat the first row as a header
        </label>
      </div>
      {error ? <p className="status-bad">{error}</p> : null}
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={!chunks.length || busy} onClick={() => save('csv')}>
          Download CSV
        </button>
        <button type="button" className="btn" disabled={!chunks.length || busy} onClick={() => save('xlsx')}>
          Download Excel
        </button>
      </div>
    </ToolLayout>
  )
}
