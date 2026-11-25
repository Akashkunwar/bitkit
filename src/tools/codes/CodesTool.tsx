import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { useHandoff } from '../../lib/useHandoff'
import {
  atbash,
  basicAuthHeader,
  caesar,
  convertHost,
  decodeBase32,
  decodeBase58,
  decodeQuotedPrintable,
  encodeBase32,
  encodeBase58,
  encodeQuotedPrintable,
  explainChmod,
  formatXml,
  fromDataUri,
  fromNato,
  gunzipBase64,
  gzipBase64,
  hammingDistance,
  hmacSha256,
  httpStatus,
  isbnValid,
  jsonToTypes,
  luhnValid,
  makePassphrase,
  randomMac,
  sriHash,
  toDataUri,
  toNato,
  ulid,
  xorFromHex,
  xorHex,
} from '../../lib/codes'

type Mode =
  | 'base32'
  | 'base58'
  | 'puny'
  | 'caesar'
  | 'atbash'
  | 'xor'
  | 'nato'
  | 'qp'
  | 'gzip'
  | 'sri'
  | 'hmac'
  | 'auth'
  | 'data'
  | 'types'
  | 'xml'
  | 'chmod'
  | 'http'
  | 'luhn'
  | 'isbn'
  | 'hamming'
  | 'ulid'
  | 'mac'
  | 'phrase'

const MODES: { id: Mode; label: string }[] = [
  { id: 'base32', label: 'Base32' },
  { id: 'base58', label: 'Base58' },
  { id: 'puny', label: 'Punycode' },
  { id: 'caesar', label: 'Caesar cipher' },
  { id: 'atbash', label: 'Atbash' },
  { id: 'xor', label: 'XOR' },
  { id: 'nato', label: 'NATO alphabet' },
  { id: 'qp', label: 'Quoted-printable' },
  { id: 'gzip', label: 'Gzip' },
  { id: 'sri', label: 'Subresource integrity' },
  { id: 'hmac', label: 'HMAC-SHA256' },
  { id: 'auth', label: 'Basic auth' },
  { id: 'data', label: 'Data URI' },
  { id: 'types', label: 'JSON to TypeScript' },
  { id: 'xml', label: 'XML format' },
  { id: 'chmod', label: 'chmod' },
  { id: 'http', label: 'HTTP status' },
  { id: 'luhn', label: 'Luhn check' },
  { id: 'isbn', label: 'ISBN check' },
  { id: 'hamming', label: 'Hamming distance' },
  { id: 'ulid', label: 'ULID' },
  { id: 'mac', label: 'MAC address' },
  { id: 'phrase', label: 'Passphrase' },
]

const REVERSIBLE = new Set<Mode>(['base32', 'base58', 'puny', 'caesar', 'xor', 'nato', 'qp', 'gzip', 'data'])

export default function CodesTool() {
  const [mode, setMode] = useState<Mode>('base32')
  const [input, setInput] = useState('hello')
  const [extra, setExtra] = useState('')
  const [shift, setShift] = useState('3')
  const [decode, setDecode] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { copied, copy } = useCopied()
  useHandoff((payload) => {
    if (payload.text) setInput(payload.text)
  })

  const hint = useMemo(() => HINTS[mode], [mode])

  const run = async () => {
    setError(null)
    setBusy(true)
    try {
      setOutput(await convert(mode, input, { extra, shift: Number(shift) || 0, decode }))
    } catch (err) {
      setOutput('')
      setError(err instanceof Error ? err.message : 'Could not convert that.')
    } finally {
      setBusy(false)
    }
  }

  const fresh = (kind: 'ulid' | 'mac' | 'phrase') => {
    setError(null)
    if (kind === 'ulid') setOutput(ulid())
    else if (kind === 'mac') setOutput(randomMac())
    else {
      const words = Number(extra) || 6
      const made = makePassphrase(words)
      setOutput(`${made.phrase}\n${made.bits} bits from a 256-word list`)
    }
  }

  return (
    <ToolLayout
      title="Codes"
      lede="Base32, Base58, punycode, ciphers, gzip, checksums, and the small encodings that stay in the browser."
    >
      <label className="field">
        <span>Code</span>
        <select
          className="text-input"
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as Mode)
            setOutput('')
            setError(null)
          }}
        >
          {MODES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{hint}</p>
      {mode === 'ulid' || mode === 'mac' || mode === 'phrase' ? (
        <div className="row">
          {mode === 'phrase' ? (
            <label className="field">
              <span>Words</span>
              <input
                className="text-input"
                inputMode="numeric"
                value={extra}
                placeholder="6"
                onChange={(event) => setExtra(event.target.value)}
              />
            </label>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={() => fresh(mode)}>
            Generate
          </button>
        </div>
      ) : (
        <>
          <div className="row">
            {REVERSIBLE.has(mode) ? (
              <label className="field">
                <span>Direction</span>
                <select
                  className="text-input"
                  value={decode ? 'decode' : 'encode'}
                  onChange={(event) => setDecode(event.target.value === 'decode')}
                >
                  <option value="encode">Encode</option>
                  <option value="decode">Decode</option>
                </select>
              </label>
            ) : null}
            {mode === 'caesar' ? (
              <label className="field">
                <span>Shift</span>
                <input
                  className="text-input"
                  inputMode="numeric"
                  value={shift}
                  onChange={(event) => setShift(event.target.value)}
                />
              </label>
            ) : null}
            {mode === 'xor' || mode === 'hmac' || mode === 'auth' || mode === 'hamming' ? (
              <label className="field">
                <span>{mode === 'auth' ? 'Password' : mode === 'hamming' ? 'Second string' : 'Key'}</span>
                <input className="text-input" value={extra} onChange={(event) => setExtra(event.target.value)} />
              </label>
            ) : null}
            {mode === 'data' && !decode ? (
              <label className="field">
                <span>MIME type</span>
                <input
                  className="text-input"
                  value={extra}
                  placeholder="text/plain"
                  onChange={(event) => setExtra(event.target.value)}
                />
              </label>
            ) : null}
          </div>
          <label className="field">
            <span>Input</span>
            <textarea
              className="text-input"
              rows={8}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void run()}>
            {busy ? 'Working' : 'Run'}
          </button>
        </>
      )}
      {error ? (
        <p className="status-bad" role="alert">
          {error}
        </p>
      ) : null}
      {output ? (
        <>
          <label className="field">
            <span>Result</span>
            <textarea className="text-input" rows={8} readOnly value={output} />
          </label>
          <button type="button" className="btn" onClick={() => void copy(output)}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </>
      ) : null}
    </ToolLayout>
  )
}

const HINTS: Record<Mode, string> = {
  base32: 'RFC 4648 Base32, with padding.',
  base58: 'Bitcoin alphabet. No 0, O, I, or l.',
  puny: 'A hostname or URL. Non-ASCII labels become xn--.',
  caesar: 'Shifts letters and leaves everything else in place.',
  atbash: 'A swaps with Z, B with Y, and so on.',
  xor: 'Repeating-key XOR. The encoded form is hex.',
  nato: 'ICAO words. A slash marks a space when you decode.',
  qp: 'Quoted-printable, UTF-8 bytes.',
  gzip: 'Gzip, shown as Base64. Nothing is uploaded.',
  sri: 'A sha384 integrity hash for a script or style tag.',
  hmac: 'HMAC-SHA256 of the text, as hex.',
  auth: 'An Authorization header. The input is the username.',
  data: 'A Base64 data URI, or the text inside one.',
  types: 'A TypeScript type for the JSON value.',
  xml: 'Indents a well-formed XML document.',
  chmod: '755 or rwxr-xr-x. Setuid bits are not shown.',
  http: 'A common status code, such as 404.',
  luhn: 'The check used on payment-card numbers. This does not talk to a bank.',
  isbn: 'ISBN-10 or ISBN-13, with or without hyphens.',
  hamming: 'How many characters differ. Both strings must be the same length.',
  ulid: 'A 26-character sortable id from the clock and random bytes.',
  mac: 'A locally administered unicast address. It is not a real adapter.',
  phrase: 'Each word is one of 256, so a word is 8 bits. This is not the EFF list.',
}

async function convert(
  mode: Mode,
  input: string,
  options: { extra: string; shift: number; decode: boolean },
): Promise<string> {
  const bytes = () => new TextEncoder().encode(input)
  if (mode === 'base32') {
    return options.decode ? new TextDecoder().decode(decodeBase32(input)) : encodeBase32(bytes())
  }
  if (mode === 'base58') {
    return options.decode ? new TextDecoder().decode(decodeBase58(input)) : encodeBase58(bytes())
  }
  if (mode === 'puny') return convertHost(input, options.decode)
  if (mode === 'caesar') return caesar(input, options.decode ? -options.shift : options.shift)
  if (mode === 'atbash') return atbash(input)
  if (mode === 'xor') return options.decode ? xorFromHex(input, options.extra) : xorHex(input, options.extra)
  if (mode === 'nato') return options.decode ? fromNato(input) : toNato(input)
  if (mode === 'qp') return options.decode ? decodeQuotedPrintable(input) : encodeQuotedPrintable(input)
  if (mode === 'gzip') return options.decode ? gunzipBase64(input) : gzipBase64(input)
  if (mode === 'sri') return sriHash(input)
  if (mode === 'hmac') return hmacSha256(input, options.extra)
  if (mode === 'auth') return basicAuthHeader(input, options.extra)
  if (mode === 'data') return options.decode ? fromDataUri(input) : toDataUri(options.extra, input)
  if (mode === 'types') return jsonToTypes(input)
  if (mode === 'xml') return formatXml(input)
  if (mode === 'chmod') {
    const modeBits = explainChmod(input)
    return `${modeBits.octal}\n${modeBits.symbolic}`
  }
  if (mode === 'http') return httpStatus(Number(input.trim()))
  if (mode === 'luhn') return luhnValid(input) ? 'Valid' : 'Not valid'
  if (mode === 'isbn') {
    const result = isbnValid(input)
    return `${result.kind}: ${result.valid ? 'valid' : 'not valid'}`
  }
  if (mode === 'hamming') return String(hammingDistance(input, options.extra))
  return ''
}
