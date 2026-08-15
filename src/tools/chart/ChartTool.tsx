import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { columnType, tableFromCsv, tableFromFile, tableToCsv, type Table } from '../../lib/table'
import { chartSvg, svgToPng, type ChartKind, type ChartSpec } from '../../lib/chart'

const SAMPLE = `month,signups,revenue
Jan,120,4200
Feb,168,5100
Mar,142,4800
Apr,205,7300
May,262,9100
Jun,231,8600`

const KINDS: { value: ChartKind; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'groupedBar', label: 'Grouped' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
]

function firstNumericColumns(table: Table): number[] {
  return table.headers
    .map((_, i) => i)
    .filter((i) => columnType(table.rows, i) === 'number')
}

export default function ChartTool() {
  const [csv, setCsv] = useState(SAMPLE)
  const [table, setTable] = useState<Table>(() => tableFromCsv(SAMPLE))
  const [kind, setKind] = useState<ChartKind>('bar')
  const [labelColumn, setLabelColumn] = useState(0)
  const [valueColumns, setValueColumns] = useState<number[]>(() => firstNumericColumns(tableFromCsv(SAMPLE)).slice(0, 1))
  const [title, setTitle] = useState('Signups by month')
  const [showGrid, setShowGrid] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showValues, setShowValues] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  const adopt = (next: Table) => {
    setTable((current) => {
      const sameShape = current.headers.join('\u0000') === next.headers.join('\u0000')
      if (!sameShape) {
        setLabelColumn(0)
        const numeric = firstNumericColumns(next)
        setValueColumns(numeric.length ? numeric.slice(0, 1) : [Math.min(1, Math.max(0, next.headers.length - 1))])
      }
      return next
    })
    setError(null)
  }

  useHandoff((payload) => {
    if (payload.files?.length) {
      void tableFromFile(payload.files[0])
        .then((next) => {
          adopt(next)
          setCsv(tableToCsv(next))
        })
        .catch(() => setError('Could not read that file.'))
    } else if (payload.text) {
      try {
        adopt(tableFromCsv(payload.text))
        setCsv(payload.text)
      } catch {
        setError('That text is not tabular.')
      }
    }
  })

  const spec: ChartSpec = useMemo(
    () => ({
      kind,
      labelColumn,
      valueColumns: valueColumns.length ? valueColumns : [0],
      title,
      width: 760,
      height: 440,
      showGrid,
      showLegend,
      showValues,
    }),
    [kind, labelColumn, valueColumns, title, showGrid, showLegend, showValues],
  )

  const svg = useMemo(() => {
    try {
      return chartSvg(table, spec)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draw that chart.')
      return ''
    }
  }, [table, spec])

  const single = kind === 'pie' || kind === 'donut' || kind === 'bar'

  const toggleValue = (index: number) => {
    setValueColumns((current) => {
      if (single) return [index]
      if (!current.includes(index)) return [...current, index].sort((a, b) => a - b)
      const next = current.filter((i) => i !== index)
      // Never leave the chart with nothing to draw.
      return next.length ? next : current
    })
  }

  return (
    <ToolLayout
      title="Chart maker"
      lede="Turn a CSV into a chart and export it as SVG or PNG. Nothing is uploaded."
    >
      <DropZone
        accept=".csv,.tsv,.json,.xlsx,text/csv"
        label="Drop a CSV, TSV, JSON, or .xlsx file — or edit the sample below."
        onFiles={(files) => {
          void tableFromFile(files[0])
            .then((next) => {
              adopt(next)
              setCsv(tableToCsv(next))
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not read that file.'))
        }}
      />
      {error ? <p className="status-bad">{error}</p> : null}

      <label className="field" style={{ marginTop: '1rem' }}>
        <span>Data — CSV</span>
        <textarea
          className="code-area"
          rows={7}
          spellCheck={false}
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value)
            try {
              adopt(tableFromCsv(e.target.value))
            } catch {
              setError('Could not parse that CSV.')
            }
          }}
        />
      </label>

      <Segmented label="Chart type" value={kind} options={KINDS} onChange={setKind} />

      <div className="split">
        <label className="field">
          <span>Labels from</span>
          <select
            className="text-input"
            value={labelColumn}
            onChange={(e) => setLabelColumn(Number(e.target.value))}
          >
            {table.headers.map((h, i) => (
              <option key={h} value={i}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Title</span>
          <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>

      <div className="field">
        <span>{single ? 'Value column' : 'Value columns'}</span>
        <div className="chip-row">
          {table.headers.map((h, i) => (
            <button
              key={h}
              type="button"
              className={valueColumns.includes(i) ? 'chip chip-on' : 'chip'}
              aria-pressed={valueColumns.includes(i)}
              onClick={() => toggleValue(i)}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <label className="row">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          Grid
        </label>
        <label className="row">
          <input type="checkbox" checked={showLegend} onChange={(e) => setShowLegend(e.target.checked)} />
          Legend
        </label>
        <label className="row">
          <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} />
          Value labels
        </label>
      </div>

      <div className="chart-preview" dangerouslySetInnerHTML={{ __html: svg }} />

      <div className="row" style={{ marginTop: '0.9rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!svg}
          onClick={() => triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), 'chart.svg')}
        >
          Download SVG
        </button>
        <button
          type="button"
          className="btn"
          disabled={!svg}
          onClick={() => {
            void svgToPng(svg, 2)
              .then((blob) => triggerDownload(blob, 'chart.png'))
              .catch((err: unknown) => setError(err instanceof Error ? err.message : 'PNG export failed.'))
          }}
        >
          Download PNG
        </button>
        <button type="button" className="btn" disabled={!svg} onClick={() => void copy(svg, 'svg')}>
          {copied === 'svg' ? 'Copied' : 'Copy SVG'}
        </button>
      </div>

      <SendTo from="chart" text={svg} />
    </ToolLayout>
  )
}
