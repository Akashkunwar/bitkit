import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { channelsFromHex, hexFromCmyk } from '../../lib/ink'

export default function InkTool() {
  const [hex, setHex] = useState('#c45b2d')
  const [c, setC] = useState('18')
  const [m, setM] = useState('68')
  const [y, setY] = useState('90')
  const [k, setK] = useState('8')
  const { copied, copy } = useCopied()

  const fromHex = useMemo(() => {
    try {
      return { value: channelsFromHex(hex), error: null as string | null }
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : 'Use a hex color.' }
    }
  }, [hex])

  const fromCmyk = useMemo(() => {
    try {
      return { value: hexFromCmyk(Number(c), Number(m), Number(y), Number(k)), error: null as string | null }
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : 'CMYK values run from 0 to 100.' }
    }
  }, [c, m, y, k])

  return (
    <ToolLayout
      title="Ink colors"
      lede="Hex, RGB, HSL, and a simple device CMYK. The CMYK numbers are not a press profile."
    >
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>Hex</span>
            <input className="text-input" value={hex} onChange={(event) => setHex(event.target.value)} />
          </label>
          {fromHex.error ? (
            <p className="status-bad" role="alert">
              {fromHex.error}
            </p>
          ) : fromHex.value ? (
            <>
              <div className="stat-grid">
                <Swatch hex={fromHex.value.hex} />
                <Stat label="RGB" value={fromHex.value.rgb} />
                <Stat label="HSL" value={fromHex.value.hsl} />
                <Stat label="CMYK" value={fromHex.value.cmyk} />
              </div>
              <button type="button" className="btn" onClick={() => void copy(fromHex.value?.cmyk ?? '')}>
                {copied ? 'Copied' : 'Copy CMYK'}
              </button>
            </>
          ) : null}
        </section>
        <section className="panel">
          <div className="split">
            <ChannelField label="C" value={c} onChange={setC} />
            <ChannelField label="M" value={m} onChange={setM} />
            <ChannelField label="Y" value={y} onChange={setY} />
            <ChannelField label="K" value={k} onChange={setK} />
          </div>
          {fromCmyk.error ? (
            <p className="status-bad" role="alert">
              {fromCmyk.error}
            </p>
          ) : fromCmyk.value ? (
            <div className="stat-grid">
              <Swatch hex={fromCmyk.value} />
              <Stat label="Hex" value={fromCmyk.value} />
            </div>
          ) : null}
        </section>
      </div>
    </ToolLayout>
  )
}

function ChannelField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="text-input"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ fontSize: '1rem' }}>
        {value}
      </span>
    </div>
  )
}

function Swatch({ hex }: { hex: string }) {
  return (
    <div className="stat">
      <span className="stat-label">Swatch</span>
      <span className="stat-value" style={{ background: hex, minHeight: '2rem', borderRadius: 6 }} />
    </div>
  )
}
