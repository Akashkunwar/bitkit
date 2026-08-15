import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { convertConfig, CONFIG_FORMATS, detectFormat, type ConfigFormat } from '../../lib/config'

const SAMPLE = `{
  "name": "kit",
  "private": true,
  "server": { "port": 5173, "host": "localhost" },
  "tools": ["json", "diff", "qr"]
}`

export default function ConfigTool() {
  const [input, setInput] = useState(SAMPLE)
  const [from, setFrom] = useState<ConfigFormat>('json')
  const [to, setTo] = useState<ConfigFormat>('yaml')
  const [indent, setIndent] = useState(2)
  const { copied, copy } = useCopied()

  const adopt = (text: string, filename?: string) => {
    setInput(text)
    const detected = detectFormat(text, filename)
    setFrom(detected)
    if (detected === to) setTo(detected === 'json' ? 'yaml' : 'json')
  }

  useHandoff((payload) => {
    if (payload.files?.[0]) {
      const file = payload.files[0]
      void file.text().then((text) => adopt(text, file.name))
    } else if (payload.text) adopt(payload.text)
  })

  const result = useMemo(() => convertConfig(input, from, to, indent), [input, from, to, indent])
  const ext = CONFIG_FORMATS.find((f) => f.value === to)?.ext ?? 'txt'

  return (
    <ToolLayout
      title="JSON · YAML · TOML"
      lede="Convert between the three config formats. Parsing and printing both happen locally."
    >
      <DropZone
        accept=".json,.yaml,.yml,.toml,application/json,text/yaml"
        label="Drop a .json, .yaml, or .toml file."
        onFiles={(files) => {
          const file = files[0]
          if (file) void file.text().then((text) => adopt(text, file.name))
        }}
      />

      <div className="split" style={{ marginTop: '1rem' }}>
        <Segmented label="From" value={from} options={CONFIG_FORMATS} onChange={setFrom} />
        <Segmented label="To" value={to} options={CONFIG_FORMATS} onChange={setTo} />
      </div>

      <div className="row">
        <label className="field" style={{ minWidth: '8rem' }}>
          <span>Indent</span>
          <select className="text-input" value={indent} onChange={(e) => setIndent(Number(e.target.value))}>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => {
            // Swapping is only meaningful when the current output is valid.
            if (result.error) return
            setInput(result.output)
            setFrom(to)
            setTo(from)
          }}
          disabled={Boolean(result.error)}
        >
          Swap ⇄
        </button>
      </div>

      <div className="diff-panes">
        <label className="field">
          <span>Input</span>
          <textarea
            className="code-area editor"
            rows={16}
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Output</span>
          <textarea className="code-area editor" rows={16} spellCheck={false} readOnly value={result.output} />
        </label>
      </div>

      {result.error ? <p className="status-bad">{result.error}</p> : <p className="status-ok">Converted.</p>}

      <div className="row" style={{ marginTop: '0.8rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!result.output}
          onClick={() => void copy(result.output, 'out')}
        >
          {copied === 'out' ? 'Copied' : 'Copy output'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!result.output}
          onClick={() => triggerDownload(new Blob([result.output], { type: 'text/plain' }), `config.${ext}`)}
        >
          Download .{ext}
        </button>
      </div>

      <SendTo from="config" text={result.output || input} />
    </ToolLayout>
  )
}
