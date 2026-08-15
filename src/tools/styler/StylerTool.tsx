import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { applyStyle, STYLES, toPlain } from '../../lib/unicodeStyle'

export default function StylerTool() {
  const [text, setText] = useState('BitKit runs on your device')
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
  })

  const styled = useMemo(
    () => STYLES.map((style) => ({ ...style, output: applyStyle(text, style.id) })),
    [text],
  )

  return (
    <ToolLayout
      title="Unicode text styler"
      lede="Bold and italic for places that strip formatting — bios, usernames, post titles."
    >
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
      </div>

      <div className="result-list" style={{ marginTop: '1rem' }}>
        {styled.map((style) => (
          <div key={style.id} className="result-row" style={{ alignItems: 'flex-start' }}>
            <span className="pill" style={{ minWidth: '7.5rem' }}>{style.label}</span>
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
            These are substitute characters, not real formatting. Screen readers announce them character by
            character or skip them entirely — an entire bio in script is unreadable to someone using one.
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
