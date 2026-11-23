import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'
import { certificateText, CODE_SNIPPET, CODE_WORDS, codeScore, nextWord } from '../../lib/codetype'

type Mode = 'code' | 'game' | 'certificate'

export default function CodeTypeTool() {
  const [mode, setMode] = useState<Mode>('code')
  const [typed, setTyped] = useState('')
  const [index, setIndex] = useState(0)
  const [guess, setGuess] = useState('')
  const [hits, setHits] = useState(0)
  const [name, setName] = useState('Asha')
  const [wpm, setWpm] = useState(40)
  const [accuracy, setAccuracy] = useState(98)
  const { copied, copy } = useCopied()
  const word = useMemo(() => nextWord(CODE_WORDS, index).word, [index])
  const certificate = certificateText({ name, wpm, accuracy })

  return (
    <ToolLayout
      title="Code typing"
      lede="Type a snippet, a word at a time, or fill in a certificate. The score stays in this tab."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'code', label: 'Code' },
          { value: 'game', label: 'Words' },
          { value: 'certificate', label: 'Certificate' },
        ]}
        onChange={setMode}
      />
      {mode === 'code' ? (
        <div className="split">
          <section className="panel">
            <pre className="code-area">{CODE_SNIPPET}</pre>
            <textarea
              className="code-area editor"
              rows={4}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              spellCheck={false}
            />
          </section>
          <aside className="panel">
            <p className="lede">
              {codeScore(CODE_SNIPPET, typed)} / {CODE_SNIPPET.length} characters match
            </p>
          </aside>
        </div>
      ) : null}
      {mode === 'game' ? (
        <div className="panel">
          <p className="lede">{word}</p>
          <input
            className="text-input"
            value={guess}
            aria-label="Type the word"
            onChange={(e) => {
              const value = e.target.value
              if (value.trim() === word) {
                setHits((n) => n + 1)
                setIndex((n) => n + 1)
                setGuess('')
                return
              }
              setGuess(value)
            }}
          />
          <p className="hint">{hits} words</p>
        </div>
      ) : null}
      {mode === 'certificate' ? (
        <div className="split">
          <section className="panel">
            <label className="field">
              <span>Name</span>
              <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Words per minute</span>
              <input
                className="text-input"
                type="number"
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Accuracy</span>
              <input
                className="text-input"
                type="number"
                value={accuracy}
                onChange={(e) => setAccuracy(Number(e.target.value))}
              />
            </label>
          </section>
          <aside className="panel">
            <textarea className="code-area" rows={6} readOnly value={certificate} />
            <button type="button" className="btn btn-primary" onClick={() => void copy(certificate, 'cert')}>
              {copied === 'cert' ? 'Copied ✓' : 'Copy certificate'}
            </button>
          </aside>
        </div>
      ) : null}
    </ToolLayout>
  )
}
