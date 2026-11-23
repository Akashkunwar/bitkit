import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'
import { desDecrypt, desEncrypt } from '../../lib/des'
import { ripemd160Hex } from '../../lib/ripemd'

type Mode = 'encrypt' | 'decrypt' | 'ripemd'

export default function CipherTool() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [text, setText] = useState('hello')
  const [password, setPassword] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  const run = () => {
    try {
      setError(null)
      if (mode === 'ripemd') setOutput(ripemd160Hex(text))
      else if (mode === 'encrypt') setOutput(desEncrypt(text, password))
      else setOutput(desDecrypt(text, password))
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : 'That did not work.')
    }
  }

  return (
    <ToolLayout
      title="DES and RIPEMD"
      lede="DES encrypts with a password in this tab. RIPEMD-160 is a hash, not a way to reverse one."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'encrypt', label: 'DES encrypt' },
          { value: 'decrypt', label: 'DES decrypt' },
          { value: 'ripemd', label: 'RIPEMD-160' },
        ]}
        onChange={setMode}
      />
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>{mode === 'decrypt' ? 'Message' : 'Text'}</span>
            <textarea
              className="code-area editor"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
            />
          </label>
          {mode !== 'ripemd' ? (
            <label className="field">
              <span>Password</span>
              <input
                className="text-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={run}>
            Run
          </button>
          {error ? <p className="status-bad">{error}</p> : null}
        </section>
        <aside className="panel">
          <textarea className="code-area" rows={8} readOnly value={output} />
          <button type="button" className="btn" disabled={!output} onClick={() => void copy(output, 'out')}>
            {copied === 'out' ? 'Copied ✓' : 'Copy'}
          </button>
        </aside>
      </div>
    </ToolLayout>
  )
}
