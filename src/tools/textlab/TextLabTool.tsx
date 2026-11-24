import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'
import { useHandoff } from '../../lib/useHandoff'
import { keywordDensity, morseDecode, morseEncode, morseUnits, parseUrlParts, rot13, vigenere } from '../../lib/textlab'

type Mode = 'density' | 'html' | 'rot13' | 'vigenere' | 'morse' | 'url'

async function playMorse(code: string) {
  const units = morseUnits(code)
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.frequency.value = 600
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.value = 0
  osc.start()
  let at = ctx.currentTime + 0.05
  const unit = 0.08
  for (const mark of units) {
    if (mark > 0) {
      gain.gain.setValueAtTime(0.08, at)
      at += mark * unit
      gain.gain.setValueAtTime(0, at)
    } else {
      at += -mark * unit
    }
  }
  osc.stop(at + 0.05)
  window.setTimeout(() => void ctx.close(), (at + 0.2) * 1000)
}

export default function TextLabTool() {
  const [mode, setMode] = useState<Mode>('density')
  const [input, setInput] = useState('')
  const [key, setKey] = useState('KEY')
  const [decode, setDecode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
  })

  const result = useMemo(() => {
    if (mode === 'html' || mode === 'density' || mode === 'url' || !input.trim())
      return { text: '', error: null as string | null }
    try {
      const text =
        mode === 'rot13'
          ? rot13(input)
          : mode === 'vigenere'
            ? vigenere(input, key, decode)
            : decode
              ? morseDecode(input)
              : morseEncode(input)
      return { text, error: null as string | null }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : 'Could not convert that text.' }
    }
  }, [mode, input, key, decode])

  const density = useMemo(() => (mode === 'density' ? keywordDensity(input) : []), [mode, input])
  const parts = useMemo(() => {
    if (mode !== 'url' || !input.trim()) return null
    try {
      return parseUrlParts(input)
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not read that URL.'
    }
  }, [mode, input])

  return (
    <ToolLayout
      title="Text lab"
      lede="Word frequency, a sandboxed HTML preview, ROT13, Vigenère, Morse, and the parts of a URL."
    >
      <Segmented
        label="Mode"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'density', label: 'Density' },
          { value: 'html', label: 'HTML' },
          { value: 'rot13', label: 'ROT13' },
          { value: 'vigenere', label: 'Vigenère' },
          { value: 'morse', label: 'Morse' },
          { value: 'url', label: 'URL' },
        ]}
      />
      <label className="field">
        <span>{mode === 'html' ? 'HTML' : mode === 'url' ? 'URL' : 'Text'}</span>
        <textarea
          className="code-area"
          rows={8}
          value={input}
          spellCheck={false}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>
      {mode === 'vigenere' ? (
        <div className="row">
          <label className="field">
            <span>Key</span>
            <input className="text-input" value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <label className="row">
            <input type="checkbox" checked={decode} onChange={(e) => setDecode(e.target.checked)} />
            Decode
          </label>
        </div>
      ) : null}
      {mode === 'morse' ? (
        <label className="row">
          <input type="checkbox" checked={decode} onChange={(e) => setDecode(e.target.checked)} />
          Decode Morse
        </label>
      ) : null}
      {result.error || error ? <p className="status-bad">{result.error || error}</p> : null}
      {mode === 'density' ? (
        density.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Count</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {density.map((row) => (
                  <tr key={row.word}>
                    <td>{row.word}</td>
                    <td>{row.count}</td>
                    <td>{Math.round(row.share * 1000) / 10}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Paste some words.</p>
        )
      ) : null}
      {mode === 'html' ? (
        <>
          <p className="hint">Scripts do not run. The preview is sandboxed in this tab.</p>
          <iframe
            title="HTML preview"
            sandbox=""
            srcDoc={input}
            style={{ width: '100%', minHeight: 280, border: '1px solid var(--line)', background: '#fff' }}
          />
        </>
      ) : null}
      {mode === 'url' && typeof parts === 'string' ? <p className="status-bad">{parts}</p> : null}
      {mode === 'url' && parts && typeof parts !== 'string' ? (
        <dl className="stack">
          {(
            [
              ['Address', parts.href],
              ['Protocol', parts.protocol],
              ['Host', parts.host],
              ['Path', parts.pathname],
              ['Query', parts.search || '—'],
              ['Hash', parts.hash || '—'],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="hint">{label}</dt>
              <dd>
                <code>{value}</code>
              </dd>
            </div>
          ))}
          {parts.params.map((param) => (
            <div key={param.key}>
              <dt className="hint">{param.key}</dt>
              <dd>
                <code>{param.value}</code>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {result.text ? <textarea className="code-area" rows={6} readOnly value={result.text} /> : null}
      <div className="row">
        {result.text ? (
          <button type="button" className="btn btn-primary" onClick={() => void copy(result.text, 'out')}>
            {copied === 'out' ? 'Copied ✓' : 'Copy'}
          </button>
        ) : null}
        {mode === 'morse' && (decode ? input : result.text) ? (
          <button
            type="button"
            className="btn"
            onClick={() =>
              void playMorse(decode ? input : result.text).catch(() => setError('This browser blocked the beep.'))
            }
          >
            Play
          </button>
        ) : null}
      </div>
    </ToolLayout>
  )
}
