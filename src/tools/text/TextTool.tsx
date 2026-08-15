import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import {
  applyCase,
  csvToJson,
  dummyPeople,
  jsonToCsv,
  loremParagraphs,
  textStats,
  type CaseMode,
} from '../../lib/textbench'

type Mode = 'case' | 'count' | 'csv' | 'dummy'

const CASES: { value: CaseMode; label: string }[] = [
  { value: 'lower', label: 'lower' },
  { value: 'upper', label: 'UPPER' },
  { value: 'title', label: 'Title' },
  { value: 'sentence', label: 'Sentence' },
  { value: 'camel', label: 'camelCase' },
  { value: 'pascal', label: 'PascalCase' },
  { value: 'snake', label: 'snake_case' },
  { value: 'kebab', label: 'kebab-case' },
  { value: 'slug', label: 'slug' },
  { value: 'squeeze', label: 'Squeeze' },
]

export default function TextTool() {
  const [mode, setMode] = useState<Mode>('case')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [csvDir, setCsvDir] = useState<'csv' | 'json'>('csv')
  const [paras, setParas] = useState(2)
  const [people, setPeople] = useState(5)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
    else if (payload.files?.[0]) {
      const file = payload.files[0]
      void file.text().then(setInput)
      if (file.name.endsWith('.csv')) setMode('csv')
    }
  })

  const stats = useMemo(() => textStats(input), [input])

  const runCase = (mode: CaseMode) => {
    setError(null)
    setOutput(applyCase(input, mode))
  }

  const runCsv = () => {
    try {
      setError(null)
      if (csvDir === 'csv') setOutput(JSON.stringify(csvToJson(input), null, 2))
      else setOutput(jsonToCsv(input))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed.')
    }
  }

  const peopleRows = useMemo(() => dummyPeople(people), [people])

  return (
    <ToolLayout
      title="Text bench"
      lede="Case and slugs, a live word count, CSV ↔ JSON, and dummy copy. All local."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'case', label: 'Case' },
          { value: 'count', label: 'Count' },
          { value: 'csv', label: 'CSV ↔ JSON' },
          { value: 'dummy', label: 'Dummy' },
        ]}
        onChange={setMode}
      />
      {mode !== 'dummy' ? (
        <div className="split">
          <section className="panel">
            <DropZone
              accept=".txt,.md,.csv,.json,text/plain,text/csv,application/json"
              label="Drop a text file, or type below."
              onFiles={async (files) => {
                if (files[0]) setInput(await files[0].text())
              }}
            />
            <label className="field" style={{ marginTop: '1rem' }}>
              <span>Input</span>
              <textarea
                className="code-area editor"
                rows={14}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste text"
              />
            </label>
            {output ? (
              <label className="field">
                <span>Output</span>
                <textarea className="code-area" rows={10} readOnly value={output} />
              </label>
            ) : null}
            {error ? <p className="status-bad">{error}</p> : null}
          </section>
          <aside className="panel">
            {mode === 'case' ? (
              <div className="row" style={{ marginBottom: '1rem' }}>
                {CASES.map((c) => (
                  <button key={c.value} type="button" className="btn" disabled={!input} onClick={() => runCase(c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
            ) : null}
            {mode === 'count' ? (
              <div className="stat-pills">
                <div className="stat-pill">
                  <span>Words</span>
                  <strong>{stats.words.toLocaleString()}</strong>
                </div>
                <div className="stat-pill">
                  <span>Characters</span>
                  <strong>{stats.chars.toLocaleString()}</strong>
                </div>
                <div className="stat-pill">
                  <span>No spaces</span>
                  <strong>{stats.charsNoSpace.toLocaleString()}</strong>
                </div>
                <div className="stat-pill">
                  <span>Sentences</span>
                  <strong>{stats.sentences.toLocaleString()}</strong>
                </div>
                <div className="stat-pill">
                  <span>Lines</span>
                  <strong>{stats.lines.toLocaleString()}</strong>
                </div>
                <div className="stat-pill">
                  <span>Bytes</span>
                  <strong>{stats.bytes.toLocaleString()}</strong>
                </div>
              </div>
            ) : null}
            {mode === 'csv' ? (
              <>
                <Segmented
                  label="Direction"
                  value={csvDir}
                  options={[
                    { value: 'csv', label: 'CSV → JSON' },
                    { value: 'json', label: 'JSON → CSV' },
                  ]}
                  onChange={setCsvDir}
                />
                <button type="button" className="btn btn-primary" disabled={!input.trim()} onClick={runCsv}>
                  Convert
                </button>
              </>
            ) : null}
            <div className="row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn" disabled={!output} onClick={() => void copy(output, 'out')}>
                {copied === 'out' ? 'Copied ✓' : 'Copy output'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={!output}
                onClick={() =>
                  triggerDownload(
                    new Blob([output], { type: csvDir === 'json' && mode === 'csv' ? 'text/csv' : 'text/plain' }),
                    mode === 'csv' && csvDir === 'csv' ? 'rows.json' : 'text.txt',
                  )
                }
              >
                Download
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={!output}
                onClick={() => {
                  setInput(output)
                  setOutput('')
                }}
              >
                Use as input
              </button>
            </div>
            <SendTo from="text" text={output || input} />
          </aside>
        </div>
      ) : (
        <div className="split">
          <section className="panel">
            <h3>Lorem</h3>
            <label className="field">
              <span>Paragraphs · {paras}</span>
              <input type="range" min={1} max={12} value={paras} onChange={(e) => setParas(Number(e.target.value))} />
            </label>
            <textarea className="code-area" rows={10} readOnly value={loremParagraphs(paras)} />
            <button type="button" className="btn" onClick={() => void copy(loremParagraphs(paras), 'lorem')}>
              {copied === 'lorem' ? 'Copied ✓' : 'Copy lorem'}
            </button>
          </section>
          <aside className="panel">
            <h3>Dummy people</h3>
            <p className="hint">Deterministic fake names for forms. Not real people.</p>
            <label className="field">
              <span>Rows · {people}</span>
              <input type="range" min={1} max={25} value={people} onChange={(e) => setPeople(Number(e.target.value))} />
            </label>
            <table className="zone-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {peopleRows.map((row) => (
                  <tr key={row.email}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn" onClick={() => void copy(JSON.stringify(peopleRows, null, 2), 'people')}>
                {copied === 'people' ? 'Copied ✓' : 'Copy JSON'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  triggerDownload(new Blob([JSON.stringify(peopleRows, null, 2)], { type: 'application/json' }), 'people.json')
                }
              >
                Download
              </button>
            </div>
            <SendTo from="text" text={JSON.stringify(peopleRows, null, 2)} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
