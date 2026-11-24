import { useMemo, useState } from 'react'
import { nextPrompt } from '../../lib/playroom'
import { readoutStyle, splitList } from './shared'
import { ModeShell, NamesField } from './shell'

export function Charades() {
  const [text, setText] = useState('The moon landing\nA cat at a piano\nLost keys\nMaking tea\nA slow train')
  const prompts = useMemo(() => splitList(text), [text])
  const [index, setIndex] = useState(0)
  const prompt = nextPrompt(prompts, index)
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={text} onChange={setText} label="Prompts, one per line" />
          <button type="button" className="btn btn-primary" onClick={() => setIndex((current) => current + 1)}>
            Next prompt
          </button>
        </>
      }
      result={
        <>
          <h2>Charades</h2>
          <p className="lede" style={{ ...readoutStyle, fontSize: '2rem' }}>
            {prompt || 'Add a prompt.'}
          </p>
          {prompts.length ? (
            <p className="hint">
              Prompt {(index % prompts.length) + 1} of {prompts.length}
            </p>
          ) : null}
        </>
      }
    />
  )
}
