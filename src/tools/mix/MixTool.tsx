import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { colorShades, mixColors } from '../../lib/colorMix'

export default function MixTool() {
  const [from, setFrom] = useState('#c45b2d')
  const [to, setTo] = useState('#1d4e89')
  const [steps, setSteps] = useState(6)
  const { copied, copy } = useCopied()

  const mixed = useMemo(() => {
    try {
      return { colors: mixColors(from, to, steps), error: null as string | null }
    } catch (err) {
      return { colors: [] as string[], error: err instanceof Error ? err.message : 'Use hex colors.' }
    }
  }, [from, to, steps])

  const shades = useMemo(() => {
    try {
      return colorShades(from, steps)
    } catch {
      return []
    }
  }, [from, steps])

  return (
    <ToolLayout
      title="Color mix"
      lede="Steps between two colors, and a tint ramp from one color toward white and black."
    >
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>From</span>
            <input type="color" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="color" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="field">
            <span>Steps · {steps}</span>
            <input type="range" min={3} max={11} value={steps} onChange={(e) => setSteps(Number(e.target.value))} />
          </label>
          {mixed.error ? <p className="status-bad">{mixed.error}</p> : null}
          <h3>Mix</h3>
          <Swatches colors={mixed.colors} onCopy={(hex) => void copy(hex, hex)} copied={copied} />
          <h3>Shades of the first color</h3>
          <Swatches colors={shades} onCopy={(hex) => void copy(hex, hex)} copied={copied} />
        </section>
        <aside className="panel">
          <p className="hint">Click a swatch to copy its hex. The ramp stays in this tab.</p>
          <button
            type="button"
            className="btn"
            disabled={!mixed.colors.length}
            onClick={() => void copy(mixed.colors.join('\n'), 'all')}
          >
            {copied === 'all' ? 'Copied ✓' : 'Copy mix'}
          </button>
        </aside>
      </div>
    </ToolLayout>
  )
}

function Swatches({
  colors,
  onCopy,
  copied,
}: {
  colors: string[]
  onCopy: (hex: string) => void
  copied: string | null
}) {
  return (
    <div className="row" style={{ flexWrap: 'wrap', marginBottom: '1rem' }}>
      {colors.map((hex, index) => (
        <button key={`${hex}-${index}`} type="button" className="btn" onClick={() => onCopy(hex)} title={hex}>
          <span
            style={{ display: 'inline-block', width: 18, height: 18, background: hex, border: '1px solid var(--line)' }}
          />
          {copied === hex ? 'Copied' : hex}
        </button>
      ))}
    </div>
  )
}
