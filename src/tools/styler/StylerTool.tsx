import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { toDevanagari, toRoman } from '../../lib/transliterate'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { applyStyle, STYLES, toPlain } from '../../lib/unicodeStyle'

export default function StylerTool() {
  const [text, setText] = useState('BitKit runs on your device')
  const [mode, setMode] = useState<'style' | 'script'>('style')
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
  })

  const styled = useMemo(() => STYLES.map((style) => ({ ...style, output: applyStyle(text, style.id) })), [text])

  return (
    <ToolLayout
      title="Unicode text styler"
      lede="Bold and italic for places that strip formatting, or type between Roman and Devanagari."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'style', label: 'Style' },
          { value: 'script', label: 'Transliterate' },
        ]}
        onChange={setMode}
      />
      <label className="field">
        <span>Your text</span>
        <textarea
          className="text-input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something…"
        />
      </label>

      <div className="row">
        <button type="button" className="btn" onClick={() => setText(toPlain(text))}>
          Strip styling back to plain
        </button>
        {mode === 'script' ? (
          <>
            <button type="button" className="btn" onClick={() => setText(toDevanagari(text))}>
              Roman → Devanagari
            </button>
            <button type="button" className="btn" onClick={() => setText(toRoman(text))}>
              Devanagari → Roman
            </button>
          </>
        ) : null}
      </div>
      {mode === 'script' ? (
        <p className="hint">
          Vowels are written out (aa, ee, oo). A consonant before another consonant gets a halant. Use tt and dd for ट
          and ड. The last consonant keeps its inherent vowel.
        </p>
      ) : null}

      <div className="result-list" style={{ marginTop: '1rem' }}>
        {styled.map((style) => (
          <div key={style.id} className="result-row" style={{ alignItems: 'flex-start' }}>
            <span className="pill" style={{ minWidth: '7.5rem' }}>
              {style.label}
            </span>
            <span className="styled-out" style={{ flex: 1 }}>
              {style.output || <span className="muted">—</span>}
            </span>
            <button
              type="button"
              className="btn-ghost"
              disabled={!style.output}
              onClick={() => void copy(style.output, style.id)}
            >
              {copied === style.id ? 'Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: '1.2rem' }}>
        <p className="field-label">Before you use these</p>
        <ul className="plain-list">
          <li>
            These are substitute characters, not real formatting. Screen readers announce them character by character or
            skip them entirely — an entire bio in script is unreadable to someone using one.
          </li>
          <li>Search will not match them. A styled name is effectively unsearchable.</li>
          <li>Some platforms reject them in display names, and older devices show empty boxes.</li>
          <li>Use them for a word or two of emphasis, not a whole paragraph.</li>
        </ul>
      </div>

      <SendTo from="styler" text={styled[0]?.output ?? text} />
    </ToolLayout>
  )
}
