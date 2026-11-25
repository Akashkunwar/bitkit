import { useState } from 'react'
import { freshFuse, stepFuse, submitFuse, type Fuse } from '../../lib/games/fuse'
import { Arcade } from './kit'
import { useTick } from './loop'

export default function FuseTool() {
  const [state, setState] = useState<Fuse>(() => freshFuse())
  const [text, setText] = useState('')

  useTick(() => setState((current) => stepFuse(current)), 100)

  const send = () => {
    const next = submitFuse(state, text)
    setState(next)
    if (next.score !== state.score) setText('')
  }

  return (
    <Arcade
      title="Fuse"
      lede="Type a word of at least four letters that contains the letters before the fuse runs out. A hit adds time."
      status={state.dead ? `Out · ${state.score}` : `${state.score} ${state.score === 1 ? 'word' : 'words'}`}
      onRestart={() => {
        setState(freshFuse())
        setText('')
      }}
    >
      <p className="fuse-prompt">{state.prompt.toUpperCase()}</p>
      <div className="fuse-timer" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(100, (state.time / 160) * 100))}%` }} />
      </div>
      <p className="fuse-note">{state.note || 'The bomb wants those letters inside a real word.'}</p>
      {!state.dead && (
        <div className="arcade-keys">
          <input
            className="field"
            value={text}
            aria-label="Word"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') send()
            }}
          />
          <button type="button" className="btn" onClick={send}>
            Play
          </button>
        </div>
      )}
      {state.used.length > 0 && <p className="fuse-note">{state.used.join(' · ')}</p>}
    </Arcade>
  )
}
