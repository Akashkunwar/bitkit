import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import {
  base64ToBytes,
  bytesToBase64,
  decodeJwt,
  decodeTextBase64,
  decodeUriComponentSafe,
  digestHex,
  encodeTextBase64,
  encodeUriComponentSafe,
} from '../../lib/encode'
import { formatInZone } from '../../lib/time'
import { decodeEntities, encodeEntities } from '../../lib/entities'
import { aesDecrypt, aesEncrypt } from '../../lib/aesText'
import { signJwt, verifyJwt } from '../../lib/jwtSign'
import { md5Hex } from '../../lib/md5'
import { sha224Hex } from '../../lib/sha224'

type Mode = 'base64' | 'url' | 'html' | 'jwt' | 'hash' | 'aes'
type Algo = 'MD5' | 'SHA-224' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

const JWT_SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJraXQiLCJuYW1lIjoiTG9jYWwiLCJpYXQiOjE3MTAwMDAwMDB9.signature'

export default function EncodeTool() {
  const [mode, setMode] = useState<Mode>('base64')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [urlSafe, setUrlSafe] = useState(false)
  const [algo, setAlgo] = useState<Algo>('SHA-256')
  const [password, setPassword] = useState('')
  const [jwtSecret, setJwtSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) {
      setInput(payload.text)
      if (payload.text.trim().split('.').length === 3) setMode('jwt')
    } else if (payload.files?.[0]) void payload.files[0].text().then(setInput)
  })

  const jwt = useMemo(() => {
    if (mode !== 'jwt' || !input.trim()) return null
    try {
      return { view: decodeJwt(input), error: null as string | null }
    } catch (err) {
      return { view: null, error: err instanceof Error ? err.message : 'Could not decode JWT.' }
    }
  }, [mode, input])

  const claims = useMemo(() => {
    const payload = jwt?.view?.payload
    if (!payload || typeof payload !== 'object') return []
    const rec = payload as Record<string, unknown>
    return (['iat', 'nbf', 'exp'] as const)
      .filter((k) => typeof rec[k] === 'number')
      .map((k) => ({
        key: k,
        unix: rec[k] as number,
        label: formatInZone(new Date((rec[k] as number) * 1000), 'UTC'),
      }))
  }, [jwt])

  const run = (fn: () => string) => {
    try {
      setError(null)
      setOutput(fn())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.')
    }
  }

  const hashText = async () => {
    setBusy(true)
    setError(null)
    try {
      if (algo === 'MD5') setOutput(md5Hex(input))
      else if (algo === 'SHA-224') setOutput(sha224Hex(input))
      else setOutput(await digestHex(new TextEncoder().encode(input), algo))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hash failed.')
    } finally {
      setBusy(false)
    }
  }

  const hashFile = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      setInput(`(file) ${file.name} · ${file.size.toLocaleString()} bytes`)
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (algo === 'MD5') setOutput(md5Hex(bytes))
      else if (algo === 'SHA-224') setOutput(sha224Hex(bytes))
      else setOutput(await digestHex(bytes, algo))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hash failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Encode"
      lede="Base64, URL, HTML entities, JWT, hashes, and AES. Nothing is uploaded. JWTs are decoded, not verified."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'base64', label: 'Base64' },
          { value: 'url', label: 'URL' },
          { value: 'html', label: 'HTML' },
          { value: 'jwt', label: 'JWT' },
          { value: 'hash', label: 'Hash' },
          { value: 'aes', label: 'AES' },
        ]}
        onChange={(next) => {
          setMode(next)
          setOutput('')
          setError(null)
        }}
      />
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>{mode === 'jwt' ? 'Token' : mode === 'hash' ? 'Text to hash' : 'Input'}</span>
            <textarea
              className="code-area editor"
              rows={mode === 'jwt' ? 8 : 14}
              spellCheck={false}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'jwt' ? 'header.payload.signature' : 'Paste text'}
            />
          </label>
          {mode === 'jwt' && !input.trim() ? (
            <p className="hint">
              <button type="button" className="btn-ghost" onClick={() => setInput(JWT_SAMPLE)}>
                Load a sample
              </button>
            </p>
          ) : null}
          {mode === 'hash' ? (
            <DropZone
              accept="*/*"
              label="Or drop a file to hash. The file stays in this tab."
              onFiles={(files) => files[0] && void hashFile(files[0])}
            />
          ) : null}
          {mode === 'base64' ? (
            <DropZone
              accept="*/*"
              label="Optional: drop a file to encode as Base64."
              onFiles={async (files) => {
                const file = files[0]
                if (!file) return
                const bytes = new Uint8Array(await file.arrayBuffer())
                setInput(`(file) ${file.name}`)
                setOutput(bytesToBase64(bytes))
              }}
            />
          ) : null}
          {output ? (
            <label className="field" style={{ marginTop: '1rem' }}>
              <span>Output</span>
              <textarea className="code-area" rows={8} spellCheck={false} readOnly value={output} />
            </label>
          ) : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </section>
        <aside className="panel">
          {mode === 'base64' ? (
            <>
              <label className="row" style={{ marginBottom: '1rem' }}>
                <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} />
                URL-safe (no +, /, or =)
              </label>
              <div className="row" style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!input}
                  onClick={() => run(() => encodeTextBase64(input, urlSafe))}
                >
                  Encode
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!input}
                  onClick={() => run(() => decodeTextBase64(input))}
                >
                  Decode
                </button>
              </div>
              <button
                type="button"
                className="btn"
                disabled={!output}
                onClick={() => {
                  try {
                    const bytes = base64ToBytes(output || input)
                    triggerDownload(
                      new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
                      'decoded.bin',
                    )
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Decode failed.')
                  }
                }}
              >
                Download decoded bytes
              </button>
            </>
          ) : null}
          {mode === 'html' ? (
            <div className="row" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!input}
                onClick={() => run(() => encodeEntities(input))}
              >
                Encode
              </button>
              <button type="button" className="btn" disabled={!input} onClick={() => run(() => decodeEntities(input))}>
                Decode
              </button>
            </div>
          ) : null}
          {mode === 'aes' ? (
            <>
              <label className="field">
                <span>Password</span>
                <input
                  className="text-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!input || busy}
                  onClick={() => {
                    setBusy(true)
                    setError(null)
                    void aesEncrypt(input, password)
                      .then(setOutput)
                      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Encrypt failed.'))
                      .finally(() => setBusy(false))
                  }}
                >
                  Encrypt
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!input || busy}
                  onClick={() => {
                    setBusy(true)
                    setError(null)
                    void aesDecrypt(input, password)
                      .then(setOutput)
                      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Decrypt failed.'))
                      .finally(() => setBusy(false))
                  }}
                >
                  Decrypt
                </button>
              </div>
            </>
          ) : null}
          {mode === 'url' ? (
            <div className="row" style={{ marginBottom: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!input}
                onClick={() => run(() => encodeUriComponentSafe(input))}
              >
                Encode
              </button>
              <button
                type="button"
                className="btn"
                disabled={!input}
                onClick={() => run(() => decodeUriComponentSafe(input))}
              >
                Decode
              </button>
            </div>
          ) : null}
          {mode === 'jwt' ? (
            <>
              <p className="banner warn">
                Decoding does not check the signature. Sign and verify use HMAC-SHA256. The secret stays in this tab.
              </p>
              <label className="field">
                <span>Secret</span>
                <input
                  className="text-input"
                  type="password"
                  value={jwtSecret}
                  onChange={(e) => setJwtSecret(e.target.value)}
                />
              </label>
              <div className="row" style={{ marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!input.trim() || !jwtSecret}
                  onClick={() => {
                    void (async () => {
                      try {
                        setError(null)
                        const trimmed = input.trim()
                        const payload =
                          trimmed.startsWith('{') || trimmed.startsWith('[')
                            ? (JSON.parse(trimmed) as unknown)
                            : { sub: trimmed }
                        setOutput(await signJwt(payload, jwtSecret))
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not sign.')
                      }
                    })()
                  }}
                >
                  Sign
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!input.trim() || !jwtSecret}
                  onClick={() => {
                    void (async () => {
                      try {
                        setError(null)
                        const result = await verifyJwt(input, jwtSecret)
                        setOutput(result.ok ? 'Signature matches.' : 'The signature does not match that secret.')
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not verify.')
                      }
                    })()
                  }}
                >
                  Verify
                </button>
              </div>
              {jwt?.error ? <p className="status-bad">{jwt.error}</p> : null}
              {jwt?.view ? (
                <>
                  <p className="status-ok">{jwt.view.parts} parts decoded.</p>
                  <label className="field">
                    <span>Header</span>
                    <textarea
                      className="code-area"
                      rows={6}
                      readOnly
                      value={JSON.stringify(jwt.view.header, null, 2)}
                    />
                  </label>
                  <label className="field">
                    <span>Payload</span>
                    <textarea
                      className="code-area"
                      rows={8}
                      readOnly
                      value={JSON.stringify(jwt.view.payload, null, 2)}
                    />
                  </label>
                  {claims.length ? (
                    <ul className="hint">
                      {claims.map((c) => (
                        <li key={c.key}>
                          {c.key} {c.unix} → {c.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
          {mode === 'hash' ? (
            <>
              <Segmented
                label="Algorithm"
                value={algo}
                options={[
                  { value: 'MD5', label: 'MD5' },
                  { value: 'SHA-224', label: 'SHA-224' },
                  { value: 'SHA-1', label: 'SHA-1' },
                  { value: 'SHA-256', label: 'SHA-256' },
                  { value: 'SHA-384', label: 'SHA-384' },
                  { value: 'SHA-512', label: 'SHA-512' },
                ]}
                onChange={setAlgo}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!input.trim() || busy}
                onClick={() => void hashText()}
              >
                {busy ? 'Hashing…' : `Hash with ${algo}`}
              </button>
            </>
          ) : null}
          <div className="row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn"
              disabled={!output && !jwt?.view}
              onClick={() =>
                void copy(
                  output ||
                    (jwt?.view ? JSON.stringify({ header: jwt.view.header, payload: jwt.view.payload }, null, 2) : ''),
                  'out',
                )
              }
            >
              {copied === 'out' ? 'Copied ✓' : 'Copy output'}
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
          <SendTo from="encode" text={output || input} />
        </aside>
      </div>
    </ToolLayout>
  )
}
