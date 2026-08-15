import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import {
  BOX_STYLES,
  drawBox,
  drawTable,
  drawTree,
  parseOutline,
  parseRows,
  type Align,
  type BoxStyle,
} from '../../lib/boxdraw'

type Mode = 'table' | 'box' | 'tree'

const MODES: { value: Mode; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'box', label: 'Box' },
  { value: 'tree', label: 'Tree' },
]

const ALIGNS: { value: Align; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const SAMPLES: Record<Mode, string> = {
  table: 'Tool, Input, Output\nCompress, Image, Smaller image\nShrink, PDF, Smaller PDF\nChart, CSV, SVG or PNG',
  box: 'Heads up\nThis runs entirely in your browser.',
  tree: 'src\n  lib\n    table.ts\n    chart.ts\n  tools\n    table\n    chart\n  registry.ts',
}

export default function BoxDrawTool() {
  const [mode, setMode] = useState<Mode>('table')
  const [input, setInput] = useState(SAMPLES.table)
  const [style, setStyle] = useState<BoxStyle>('light')
  const [align, setAlign] = useState<Align>('left')
  const [header, setHeader] = useState(true)
  const [padding, setPadding] = useState(1)
  const [delimiter, setDelimiter] = useState(',')
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
  })

  const output = useMemo(() => {
    try {
      if (mode === 'table') {
        return drawTable(parseRows(input, delimiter), { style, header, align, padding })
      }
      if (mode === 'box') return drawBox(input, style, padding, align)
      return drawTree(parseOutline(input), style)
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not draw that.'
    }
  }, [mode, input, style, header, align, padding, delimiter])

  return (
    <ToolLayout
      title="Box drawing"
      lede="ASCII and Unicode tables, boxes, and trees for READMEs, comments, and terminal output."
    >
      <Segmented
        label="Shape"
        value={mode}
        options={MODES}
        onChange={(next) => {
          setMode(next)
          setInput(SAMPLES[next])
          if (next === 'tree' && style === 'markdown') setStyle('light')
        }}
      />

      <label className="field">
        <span>
          {mode === 'table'
            ? 'Rows — one per line, cells separated by the delimiter'
            : mode === 'tree'
              ? 'Outline — indent with spaces or tabs to nest'
              : 'Text — one line per row'}
        </span>
        <textarea
          className="code-area"
          rows={8}
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>

      <div className="split">
        <label className="field">
          <span>Line style</span>
          <select className="text-input" value={style} onChange={(e) => setStyle(e.target.value as BoxStyle)}>
            {BOX_STYLES.filter((s) => mode === 'table' || s.value !== 'markdown').map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {mode === 'table' ? (
          <label className="field">
            <span>Delimiter</span>
            <select className="text-input" value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
              <option value=",">Comma</option>
              <option value="|">Pipe</option>
              <option value=";">Semicolon</option>
              <option value="\t">Tab</option>
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Padding — {padding}</span>
            <input
              type="range"
              min={0}
              max={4}
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      {mode !== 'tree' ? (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Segmented label="Align" value={align} options={ALIGNS} onChange={setAlign} />
          {mode === 'table' ? (
            <>
              <label className="row">
                <input type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
                First row is a header
              </label>
              <label className="field" style={{ minWidth: '10rem' }}>
                <span>Padding — {padding}</span>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      <pre className="ascii-out" aria-label="Drawing output">
        {output}
      </pre>

      <div className="row" style={{ marginTop: '0.8rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" disabled={!output} onClick={() => void copy(output, 'out')}>
          {copied === 'out' ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!output}
          onClick={() => void copy(`\`\`\`\n${output}\n\`\`\``, 'fenced')}
        >
          {copied === 'fenced' ? 'Copied' : 'Copy in a code fence'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!output}
          onClick={() => triggerDownload(new Blob([output], { type: 'text/plain' }), 'drawing.txt')}
        >
          Download .txt
        </button>
      </div>

      <p className="hint" style={{ marginTop: '1rem' }}>
        Columns are measured by display width, so CJK characters and emoji — which take two terminal cells —
        still line up.
      </p>

      <SendTo from="boxdraw" text={output} />
    </ToolLayout>
  )
}
