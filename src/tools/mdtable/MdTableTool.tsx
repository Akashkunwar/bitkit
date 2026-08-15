import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useUndo } from '../../lib/undo'
import { useCopied } from '../../lib/useCopied'
import { tableFromCsv, tableToCsv, type Table } from '../../lib/table'

type Align = 'left' | 'center' | 'right'

const ALIGNS: { value: Align; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const SAMPLE: Table = {
  headers: ['Tool', 'Input', 'Output'],
  rows: [
    ['Compress', 'Image', 'Smaller image'],
    ['Shrink', 'PDF', 'Smaller PDF'],
    ['Chart', 'CSV', 'SVG or PNG'],
  ],
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>')
}

function ruleFor(align: Align, width: number): string {
  const dashes = '-'.repeat(Math.max(3, width))
  if (align === 'center') return `:${dashes}:`
  if (align === 'right') return `${dashes}:`
  return dashes
}

function toMarkdown(table: Table, aligns: Align[], pad: boolean): string {
  const cell = (value: string, i: number, widths: number[]) => {
    const text = escapeCell(value)
    if (!pad) return text
    const width = widths[i]
    if (aligns[i] === 'right') return text.padStart(width)
    if (aligns[i] === 'center') {
      const total = width - text.length
      const left = Math.floor(total / 2)
      return ' '.repeat(left) + text + ' '.repeat(total - left)
    }
    return text.padEnd(width)
  }

  const widths = table.headers.map((header, i) =>
    Math.max(escapeCell(header).length, ...table.rows.map((row) => escapeCell(row[i] ?? '').length), 3),
  )

  const head = `| ${table.headers.map((h, i) => cell(h, i, widths)).join(' | ')} |`
  const rule = `| ${table.headers.map((_, i) => ruleFor(aligns[i], pad ? widths[i] - 2 : 3)).join(' | ')} |`
  const body = table.rows.map((row) => `| ${table.headers.map((_, i) => cell(row[i] ?? '', i, widths)).join(' | ')} |`)
  return [head, rule, ...body].join('\n')
}

/** Reads a GitHub-style markdown table back into a grid. */
function fromMarkdown(input: string): { table: Table; aligns: Align[] } | null {
  const lines = input
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|'))
  if (lines.length < 2) return null
  const split = (line: string) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replaceAll('\\|', '|').replaceAll('<br>', '\n'))

  const headers = split(lines[0])
  const ruleCells = split(lines[1])
  if (!ruleCells.every((c) => /^:?-{1,}:?$/.test(c))) return null
  const aligns: Align[] = ruleCells.map((c) =>
    c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left',
  )
  const rows = lines.slice(2).map((line) => {
    const cells = split(line)
    while (cells.length < headers.length) cells.push('')
    return cells.slice(0, headers.length)
  })
  return { table: { headers, rows }, aligns }
}

export default function MdTableTool() {
  const [table, setTable] = useState<Table>(SAMPLE)
  const [aligns, setAligns] = useState<Align[]>(() => SAMPLE.headers.map(() => 'left'))
  const [pad, setPad] = useState(true)
  const [selected, setSelected] = useState(0)
  const { copied, copy } = useCopied()
  const undo = useUndo()

  const adopt = (next: Table, nextAligns?: Align[]) => {
    setTable(next)
    setAligns(nextAligns ?? next.headers.map((_, i) => aligns[i] ?? 'left'))
    setSelected(0)
  }

  useHandoff((payload) => {
    const text = payload.text
    if (text) {
      const parsed = fromMarkdown(text)
      if (parsed) adopt(parsed.table, parsed.aligns)
      else {
        try {
          adopt(tableFromCsv(text))
        } catch {
          /* leave the current table alone */
        }
      }
    } else if (payload.files?.[0]) {
      void payload.files[0].text().then((content) => {
        const parsed = fromMarkdown(content)
        if (parsed) adopt(parsed.table, parsed.aligns)
        else adopt(tableFromCsv(content))
      })
    }
  })

  const markdown = useMemo(() => toMarkdown(table, aligns, pad), [table, aligns, pad])

  const setCell = (r: number, c: number, value: string) => {
    setTable((current) => {
      const rows = current.rows.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row))
      return { ...current, rows }
    })
  }

  const setHeader = (c: number, value: string) => {
    setTable((current) => ({ ...current, headers: current.headers.map((h, i) => (i === c ? value : h)) }))
  }

  const addRow = () => setTable((c) => ({ ...c, rows: [...c.rows, c.headers.map(() => '')] }))
  const addColumn = () => {
    setTable((c) => ({ headers: [...c.headers, `Column ${c.headers.length + 1}`], rows: c.rows.map((r) => [...r, '']) }))
    setAligns((a) => [...a, 'left'])
  }
  const removeRow = (r: number) => {
    const before = table
    setTable((c) => ({ ...c, rows: c.rows.filter((_, i) => i !== r) }))
    undo.push({ label: `Deleted row ${r + 1}`, undo: () => setTable(before) })
  }
  const removeColumn = (col: number) => {
    const beforeTable = table
    const beforeAligns = aligns
    const name = table.headers[col]
    setTable((c) => ({
      headers: c.headers.filter((_, i) => i !== col),
      rows: c.rows.map((r) => r.filter((_, i) => i !== col)),
    }))
    setAligns((a) => a.filter((_, i) => i !== col))
    setSelected(0)
    undo.push({
      label: `Deleted column “${name}”`,
      undo: () => {
        setTable(beforeTable)
        setAligns(beforeAligns)
      },
    })
  }

  return (
    <ToolLayout
      title="Markdown table"
      lede="Edit a table in a grid instead of counting pipes. Paste Markdown or CSV in, get clean Markdown out."
    >
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={addRow}>
          Add row
        </button>
        <button type="button" className="btn" onClick={addColumn}>
          Add column
        </button>
        <label className="row">
          <input type="checkbox" checked={pad} onChange={(e) => setPad(e.target.checked)} />
          Align the pipes
        </label>
      </div>

      <div className="table-wrap" style={{ maxHeight: 'none', marginTop: '0.8rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              {table.headers.map((header, c) => (
                <th key={c} data-selected={selected === c}>
                  <input
                    className="grid-input"
                    value={header}
                    onFocus={() => setSelected(c)}
                    onChange={(e) => setHeader(c, e.target.value)}
                  />
                  <div className="th-tools">
                    <button type="button" title="Delete column" onClick={() => removeColumn(c)}>
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r}>
                {table.headers.map((_, c) => (
                  <td key={c}>
                    <input
                      className="grid-input"
                      value={row[c] ?? ''}
                      onFocus={() => setSelected(c)}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button type="button" className="btn-ghost" onClick={() => removeRow(r)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {table.headers[selected] ? (
        <Segmented
          label={`Alignment — ${table.headers[selected]}`}
          value={aligns[selected] ?? 'left'}
          options={ALIGNS}
          onChange={(value) => setAligns(aligns.map((a, i) => (i === selected ? value : a)))}
        />
      ) : null}

      <label className="field">
        <span>Markdown</span>
        <textarea
          className="code-area editor"
          rows={10}
          spellCheck={false}
          value={markdown}
          onChange={(e) => {
            const parsed = fromMarkdown(e.target.value)
            if (parsed) adopt(parsed.table, parsed.aligns)
          }}
        />
      </label>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={() => void copy(markdown, 'md')}>
          {copied === 'md' ? 'Copied' : 'Copy Markdown'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => triggerDownload(new Blob([markdown], { type: 'text/markdown' }), 'table.md')}
        >
          Download .md
        </button>
        <button type="button" className="btn" onClick={() => void copy(tableToCsv(table), 'csv')}>
          {copied === 'csv' ? 'Copied' : 'Copy as CSV'}
        </button>
      </div>

      <SendTo from="mdtable" text={markdown} />
    </ToolLayout>
  )
}
