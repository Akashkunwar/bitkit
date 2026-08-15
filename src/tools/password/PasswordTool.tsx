import { useCallback, useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import {
  CHARSETS,
  buildAlphabet,
  entropyBits,
  generateBase64UrlToken,
  generateHexToken,
  generatePassword,
  generatePin,
  generateUuid,
  scoreStrength,
  type CharsetKey,
} from '../../lib/password'

type Mode = 'password' | 'token' | 'pin'
type TokenFormat = 'hex' | 'base64url' | 'uuid'

const SET_LABELS: Record<CharsetKey, string> = {
  lower: 'Lowercase (a–z)',
  upper: 'Uppercase (A–Z)',
  digits: 'Digits (0–9)',
  symbols: 'Symbols (!@#$…)',
}

export default function PasswordTool() {
  const [mode, setMode] = useState<Mode>('password')
  const [length, setLength] = useState(20)
  const [sets, setSets] = useState<CharsetKey[]>(['lower', 'upper', 'digits', 'symbols'])
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [requireEachSet, setRequireEachSet] = useState(true)
  const [batch, setBatch] = useState(3)
  const [tokenFormat, setTokenFormat] = useState<TokenFormat>('hex')
  const [tokenBytes, setTokenBytes] = useState(32)
  const [pinLength, setPinLength] = useState(6)
  const [results, setResults] = useState<string[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const alphabetSize = useMemo(() => buildAlphabet(sets, excludeAmbiguous).length, [sets, excludeAmbiguous])

  const strength = useMemo(() => {
    if (mode === 'password') return scoreStrength(entropyBits(length, alphabetSize))
    if (mode === 'pin') return scoreStrength(entropyBits(pinLength, 10))
    if (tokenFormat === 'uuid') return scoreStrength(122)
    return scoreStrength(tokenBytes * 8)
  }, [mode, length, alphabetSize, pinLength, tokenFormat, tokenBytes])

  const generate = useCallback(() => {
    try {
      setError(null)
      if (mode === 'password') {
        setResults(
          Array.from({ length: batch }, () =>
            generatePassword({ length, sets, excludeAmbiguous, requireEachSet }),
          ),
        )
      } else if (mode === 'pin') {
        setResults(Array.from({ length: batch }, () => generatePin(pinLength)))
      } else {
        setResults(
          Array.from({ length: batch }, () => {
            if (tokenFormat === 'uuid') return generateUuid()
            if (tokenFormat === 'base64url') return generateBase64UrlToken(tokenBytes)
            return generateHexToken(tokenBytes)
          }),
        )
      }
    } catch (err) {
      setResults([])
      setError(err instanceof Error ? err.message : 'Generation failed.')
    }
  }, [mode, batch, length, sets, excludeAmbiguous, requireEachSet, pinLength, tokenFormat, tokenBytes])

  useEffect(() => {
    generate()
  }, [generate])

  const toggleSet = (key: CharsetKey) => {
    setSets((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]))
  }

  const copy = async (value: string, index: number) => {
    await navigator.clipboard.writeText(value)
    setCopiedIndex(index)
    window.setTimeout(() => setCopiedIndex(null), 1200)
  }

  return (
    <ToolLayout
      title="Password generator"
      lede="Cryptographically secure passwords, API tokens, and PINs from the Web Crypto API. Nothing is stored or transmitted."
    >
      <div className="split">
        <section className="panel">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span className="field-label">Results</span>
            <button type="button" className="btn btn-primary" onClick={generate}>
              Regenerate
            </button>
          </div>
          {error ? <p className="status-bad">{error}</p> : null}
          <div className="result-list">
            {results.map((value, index) => (
              <div key={`${index}-${value}`} className="result-row">
                <code>{value}</code>
                <button type="button" className="btn" onClick={() => copy(value, index)}>
                  {copiedIndex === index ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <span className="field-label">
              Strength — {strength.label} ({Math.round(strength.bits)} bits of entropy)
            </span>
            <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score}>
              <div className="meter-fill" data-score={strength.score} style={{ width: `${((strength.score + 1) / 5) * 100}%` }} />
            </div>
            <p className="hint">
              Entropy assumes a uniformly random pick from {mode === 'password' ? `${alphabetSize} characters` : mode === 'pin' ? '10 digits' : 'random bytes'} per position. 80+ bits is strong for most uses.
            </p>
          </div>
        </section>
        <aside className="panel">
          <Segmented
            label="Mode"
            value={mode}
            options={[
              { value: 'password', label: 'Password' },
              { value: 'token', label: 'API token' },
              { value: 'pin', label: 'PIN' },
            ]}
            onChange={setMode}
          />
          {mode === 'password' ? (
            <>
              <label className="field">
                <span>Length — {length}</span>
                <input type="range" min={8} max={128} value={length} onChange={(e) => setLength(Number(e.target.value))} />
              </label>
              {(Object.keys(CHARSETS) as CharsetKey[]).map((key) => (
                <label key={key} className="row" style={{ marginBottom: '0.4rem' }}>
                  <input
                    type="checkbox"
                    checked={sets.includes(key)}
                    disabled={sets.length === 1 && sets.includes(key)}
                    onChange={() => toggleSet(key)}
                  />
                  {SET_LABELS[key]}
                </label>
              ))}
              <label className="row" style={{ margin: '0.75rem 0 0.4rem' }}>
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                />
                Exclude ambiguous (0 O 1 l I 5 S…)
              </label>
              <label className="row" style={{ marginBottom: '0.75rem' }}>
                <input type="checkbox" checked={requireEachSet} onChange={(e) => setRequireEachSet(e.target.checked)} />
                Require at least one of each set
              </label>
            </>
          ) : null}
          {mode === 'token' ? (
            <>
              <Segmented
                label="Format"
                value={tokenFormat}
                options={[
                  { value: 'hex', label: 'Hex' },
                  { value: 'base64url', label: 'Base64url' },
                  { value: 'uuid', label: 'UUID v4' },
                ]}
                onChange={setTokenFormat}
              />
              {tokenFormat !== 'uuid' ? (
                <label className="field">
                  <span>
                    Bytes — {tokenBytes} ({tokenBytes * 8} bits)
                  </span>
                  <input
                    type="range"
                    min={16}
                    max={64}
                    step={4}
                    value={tokenBytes}
                    onChange={(e) => setTokenBytes(Number(e.target.value))}
                  />
                </label>
              ) : null}
            </>
          ) : null}
          {mode === 'pin' ? (
            <label className="field">
              <span>Digits — {pinLength}</span>
              <input type="range" min={4} max={12} value={pinLength} onChange={(e) => setPinLength(Number(e.target.value))} />
            </label>
          ) : null}
          <label className="field">
            <span>Batch — {batch} at a time</span>
            <input type="range" min={1} max={10} value={batch} onChange={(e) => setBatch(Number(e.target.value))} />
          </label>
          <p className="hint">
            Values come from crypto.getRandomValues with rejection sampling, so every character is an unbiased draw.
          </p>
        </aside>
      </div>
    </ToolLayout>
  )
}
