import { useCallback, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { parseSubnet } from '../../lib/subnet'
import { useHandoff } from '../../lib/useHandoff'
import { useToolPreset } from '../../lib/actions'
import { useCopied } from '../../lib/useCopied'
import {
  applyBitOp,
  asSigned,
  BASES,
  BIT_OPS,
  BIT_WIDTHS,
  bitsOf,
  bytesOf,
  parseInBase,
  popcount,
  toBase,
  toggleBit,
  wrap,
  type Base,
  type BitOp,
  type BitWidth,
} from '../../lib/numbers'

export default function BaseTool() {
  const [text, setText] = useState('255')
  const [base, setBase] = useState<Base>(10)
  const [width, setWidth] = useState<BitWidth>(32)
  const [operand, setOperand] = useState('4')
  const [op, setOp] = useState<BitOp>('and')
  const [view, setView] = useState<'base' | 'subnet'>('base')
  const [cidr, setCidr] = useState('192.168.1.10/24')
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text?.trim()) setText(payload.text.trim())
  })
  const applyPreset = useCallback((preset: { view?: unknown }) => {
    if (preset.view === 'subnet') setView('subnet')
  }, [])
  useToolPreset('base', applyPreset)

  const value = useMemo(() => parseInBase(text, base), [text, base])
  const operandValue = useMemo(() => parseInBase(operand, base), [operand, base])

  const wrapped = value == null ? null : wrap(value, width)
  const bits = wrapped == null ? [] : bitsOf(wrapped, width)
  const unary = BIT_OPS.find((o) => o.value === op)?.unary

  const result = useMemo(() => {
    if (wrapped == null) return null
    if (unary) return applyBitOp(wrapped, 0n, op, width)
    if (operandValue == null) return null
    return applyBitOp(wrapped, operandValue, op, width)
  }, [wrapped, operandValue, op, width, unary])

  const setBit = (indexFromLeft: number) => {
    if (wrapped == null) return
    const bitIndex = width - 1 - indexFromLeft
    setText(toBase(toggleBit(wrapped, bitIndex, width), base, false))
  }

  const rows = wrapped == null ? [] : BASES.map((b) => ({ ...b, text: toBase(wrapped, b.value) }))
  const subnet = useMemo(() => {
    try {
      return { value: parseSubnet(cidr), error: null as string | null }
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : 'Could not read that subnet.' }
    }
  }, [cidr])

  return (
    <ToolLayout
      title="Number base"
      lede="Convert between binary, octal, decimal, and hex — or split an IPv4 address and a prefix into network, mask, and hosts."
    >
      <Segmented
        label="Mode"
        value={view}
        options={[
          { value: 'base', label: 'Base' },
          { value: 'subnet', label: 'Subnet' },
        ]}
        onChange={setView}
      />
      {view === 'subnet' ? (
        <section className="panel">
          <label className="field">
            <span>Address / prefix</span>
            <input
              className="text-input mono-val"
              value={cidr}
              spellCheck={false}
              onChange={(e) => setCidr(e.target.value)}
            />
          </label>
          {subnet.error ? (
            <p className="status-bad">{subnet.error}</p>
          ) : subnet.value ? (
            <div className="result-list">
              {(
                [
                  ['Network', subnet.value.network],
                  ['Broadcast', subnet.value.broadcast],
                  ['First host', subnet.value.first],
                  ['Last host', subnet.value.last],
                  ['Netmask', subnet.value.netmask],
                  ['Wildcard', subnet.value.wildcard],
                  ['Hosts', String(subnet.value.hosts)],
                  ['Total addresses', String(subnet.value.total)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="result-row">
                  <span className="pill">{label}</span>
                  <code className="mono-val wrap-code" style={{ flex: 1 }}>
                    {value}
                  </code>
                  <button type="button" className="btn btn-sm" onClick={() => void copy(value, label)}>
                    {copied === label ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <p className="hint">IPv4 only. /31 counts both addresses as hosts. /32 is a single host.</p>
        </section>
      ) : (
        <>
          <div className="split">
            <label className="field">
              <span>Value</span>
              <input
                className="text-input mono-val"
                spellCheck={false}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Input base</span>
              <select className="text-input" value={base} onChange={(e) => setBase(Number(e.target.value) as Base)}>
                {BASES.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {value == null && text.trim() ? (
            <p className="status-bad">
              That is not a valid {BASES.find((b) => b.value === base)?.label.toLowerCase()} value.
            </p>
          ) : null}

          <label className="field">
            <span>Width</span>
            <div className="row" role="radiogroup" aria-label="Bit width">
              {BIT_WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className={w === width ? 'btn btn-primary' : 'btn'}
                  aria-pressed={w === width}
                  onClick={() => setWidth(w)}
                >
                  {w}-bit
                </button>
              ))}
            </div>
          </label>

          {wrapped != null ? (
            <>
              <div className="result-list">
                {rows.map((row) => (
                  <div key={row.value} className="result-row">
                    <span className="pill">{row.label}</span>
                    <code className="mono-val wrap-code" style={{ flex: 1 }}>
                      {row.prefix}
                      {row.text}
                    </code>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() =>
                        void copy(`${row.prefix}${row.text.replaceAll(' ', '').replaceAll(',', '')}`, row.label)
                      }
                    >
                      {copied === row.label ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="pill-row">
                <span className="pill">signed {asSigned(wrapped, width).toString()}</span>
                <span className="pill">{popcount(wrapped, width)} bits set</span>
                <span className="pill">bytes {bytesOf(wrapped, width).join(' ')}</span>
                <span className="pill">reversed {[...bytesOf(wrapped, width)].reverse().join(' ')}</span>
              </div>

              <p className="field-label" style={{ marginTop: '1rem' }}>
                Bits — click to flip
              </p>
              <div className="bit-grid">
                {bits.map((on, i) => (
                  <button
                    key={i}
                    type="button"
                    className="bit"
                    data-on={on}
                    title={`Bit ${width - 1 - i}`}
                    onClick={() => setBit(i)}
                  >
                    {on ? 1 : 0}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <p className="field-label" style={{ marginTop: '1.5rem' }}>
            Bitwise
          </p>
          <div className="split">
            <label className="field">
              <span>Operation</span>
              <select className="text-input" value={op} onChange={(e) => setOp(e.target.value as BitOp)}>
                {BIT_OPS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{unary ? 'Not used' : 'Operand'}</span>
              <input
                className="text-input mono-val"
                spellCheck={false}
                disabled={unary}
                value={operand}
                onChange={(e) => setOperand(e.target.value)}
              />
            </label>
          </div>

          {result != null ? (
            <div className="result-list">
              {BASES.map((b) => (
                <div key={b.value} className="result-row">
                  <span className="pill">{b.label}</span>
                  <code className="mono-val wrap-code" style={{ flex: 1 }}>
                    {b.prefix}
                    {toBase(result, b.value)}
                  </code>
                </div>
              ))}
              <div className="row">
                <button type="button" className="btn" onClick={() => setText(toBase(result, base, false))}>
                  Use as value
                </button>
              </div>
            </div>
          ) : null}

          <SendTo from="base" text={wrapped == null ? text : toBase(wrapped, 10, false)} />
        </>
      )}
    </ToolLayout>
  )
}
