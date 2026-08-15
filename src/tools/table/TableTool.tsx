import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload, saveAs } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import {
  columnStats,
  dedupeRows,
  dropEmptyRows,
  filterTable,
  moveColumn,
  removeColumn,
  renameColumn,
  sortTable,
  tableFromCsv,
  tableFromFile,
  tableToCsv,
  tableToJson,
  tableToMarkdown,
  tableToXlsx,
  trimCells,
  type SortDir,
  type Table,
} from '../../lib/table'

const SAMPLE = `name,city,orders,joined
Asha Shah,Mumbai,12,2024-03-04
Rohan Iyer,Pune,4,2024-05-19
Maya Khan,Delhi,27,2023-11-02
Kabir Patel,Mumbai,,2024-01-30`

const PAGE_SIZE = 50

export default function TableTool() {
  const [table, setTable] = useState<Table>(() => tableFromCsv(SAMPLE))
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<number | null>(null)
  const [sort, setSort] = useState<{ index: number; dir: SortDir } | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  const load = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      setError(null)
      const next = await tableFromFile(file)
      setTable(next)
      setSort(null)
      setPage(0)
      setSelected(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  useHandoff((payload) => {
    if (payload.files?.length) void load(payload.files)
    else if (payload.text) {
      try {
        setTable(tableFromCsv(payload.text))
      } catch {
        /* not tabular; leave the sample in place */
      }
    }
  })

  const view = useMemo(() => {
    let next = filterTable(table, query, scope)
    if (sort) next = sortTable(next, sort.index, sort.dir)
    return next
  }, [table, query, scope, sort])

  const stats = useMemo(
    () => (selected == null ? null : columnStats(view, selected)),
    [view, selected],
  )

  const pageCount = Math.max(1, Math.ceil(view.rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = view.rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const apply = (next: Table) => {
    setTable(next)
    setSelected(null)
  }

  const toggleSort = (index: number) => {
    setSort((current) =>
      current?.index === index
        ? current.dir === 'asc'
          ? { index, dir: 'desc' }
          : null
        : { index, dir: 'asc' },
    )
    setPage(0)
  }

  const download = (kind: 'csv' | 'json' | 'xlsx' | 'md') => {
    if (kind === 'xlsx') {
      const bytes = tableToXlsx(view)
      void saveAs(
        new Blob([bytes.slice().buffer as ArrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        'table.xlsx',
      )
      return
    }
    const text = kind === 'csv' ? tableToCsv(view) : kind === 'json' ? tableToJson(view) : tableToMarkdown(view)
    const mime = kind === 'json' ? 'application/json' : 'text/plain'
    triggerDownload(new Blob([text], { type: mime }), `table.${kind}`)
  }

  return (
    <ToolLayout
      title="Data table"
      lede="Open a CSV, TSV, JSON, or Excel file. Sort, filter, clean, and export — all in this tab."
    >
      <DropZone
        accept=".csv,.tsv,.txt,.json,.xlsx,text/csv,application/json"
        label="Drop a CSV, TSV, JSON, or .xlsx file."
        hint="Delimiter is detected automatically."
        onFiles={(files) => void load(files)}
      />
      {error ? <p className="status-bad">{error}</p> : null}

      <div className="row" style={{ margin: '1rem 0 0.5rem', flexWrap: 'wrap' }}>
        <input
          className="text-input"
          style={{ flex: '1 1 14rem' }}
          placeholder="Filter rows…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
        />
        <select
          className="text-input"
          value={scope ?? ''}
          aria-label="Filter column"
          onChange={(e) => setScope(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">All columns</option>
          {table.headers.map((h, i) => (
            <option key={h} value={i}>
              {h}
            </option>
          ))}
        </select>
      </div>

      <div className="row" style={{ flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button type="button" className="btn" onClick={() => apply(dedupeRows(table))}>
          Remove duplicates
        </button>
        <button type="button" className="btn" onClick={() => apply(dropEmptyRows(table))}>
          Drop empty rows
        </button>
        <button type="button" className="btn" onClick={() => apply(trimCells(table))}>
          Trim whitespace
        </button>
      </div>

      <div className="pill-row">
        <span className="pill">
          {view.rows.length} of {table.rows.length} rows
        </span>
        <span className="pill">{table.headers.length} columns</span>
        {sort ? (
          <span className="pill">
            Sorted by {table.headers[sort.index]} {sort.dir === 'asc' ? '↑' : '↓'}
          </span>
        ) : null}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {view.headers.map((header, i) => (
                <th key={`${header}-${i}`} data-selected={selected === i}>
                  <button type="button" className="th-sort" onClick={() => toggleSort(i)}>
                    {header}
                    {sort?.index === i ? <span aria-hidden="true">{sort.dir === 'asc' ? ' ↑' : ' ↓'}</span> : null}
                  </button>
                  <div className="th-tools">
                    <button type="button" title="Column stats" onClick={() => setSelected(selected === i ? null : i)}>
                      ⓘ
                    </button>
                    <button type="button" title="Move left" onClick={() => apply(moveColumn(table, i, -1))}>
                      ←
                    </button>
                    <button type="button" title="Move right" onClick={() => apply(moveColumn(table, i, 1))}>
                      →
                    </button>
                    <button
                      type="button"
                      title="Rename column"
                      onClick={() => {
                        const name = window.prompt('Rename column', header)
                        if (name) apply(renameColumn(table, i, name))
                      }}
                    >
                      ✎
                    </button>
                    <button type="button" title="Delete column" onClick={() => apply(removeColumn(table, i))}>
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, r) => (
              <tr key={r}>
                {view.headers.map((_, c) => (
                  <td key={c} data-selected={selected === c}>
                    {row[c] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view.rows.length > PAGE_SIZE ? (
        <div className="row" style={{ marginTop: '0.6rem' }}>
          <button type="button" className="btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
            Previous
          </button>
          <span className="hint">
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="btn"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      {stats && selected != null ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="field-label">{view.headers[selected]}</p>
          <div className="pill-row">
            <span className="pill">{stats.type}</span>
            <span className="pill">{stats.filled} filled</span>
            <span className="pill">{stats.empty} empty</span>
            <span className="pill">{stats.unique} unique</span>
            {stats.sum != null ? <span className="pill">sum {stats.sum.toLocaleString()}</span> : null}
            {stats.mean != null ? <span className="pill">mean {stats.mean.toFixed(2)}</span> : null}
            {stats.median != null ? <span className="pill">median {stats.median}</span> : null}
            {stats.min != null ? <span className="pill">min {stats.min}</span> : null}
            {stats.max != null ? <span className="pill">max {stats.max}</span> : null}
          </div>
        </div>
      ) : null}

      <div className="row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={() => download('csv')}>
          Download CSV
        </button>
        <button type="button" className="btn" onClick={() => download('xlsx')}>
          Download .xlsx
        </button>
        <button type="button" className="btn" onClick={() => download('json')}>
          Download JSON
        </button>
        <button type="button" className="btn" onClick={() => download('md')}>
          Download Markdown
        </button>
        <button type="button" className="btn" onClick={() => void copy(tableToCsv(view), 'csv')}>
          {copied === 'csv' ? 'Copied' : 'Copy CSV'}
        </button>
      </div>

      <SendTo from="table" text={tableToCsv(view)} />
    </ToolLayout>
  )
}
