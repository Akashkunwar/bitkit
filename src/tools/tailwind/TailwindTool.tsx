import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { triggerDownload } from '../../lib/download'
import {
  buildScale,
  buildThemeBlock,
  hexToOklch,
  oklchString,
  oklchToHex,
  type ThemeColor,
  type ThemeExtras,
} from '../../lib/tailwind'

let seq = 0
const nextId = () => `c${Date.now().toString(36)}${(seq += 1)}`

export default function TailwindTool() {
  const [colors, setColors] = useState<ThemeColor[]>([
    { id: nextId(), name: 'primary', hue: 170, chroma: 0.14 },
    { id: nextId(), name: 'accent', hue: 290, chroma: 0.18 },
  ])
  const [extras, setExtras] = useState<ThemeExtras>({
    fontSans: 'Figtree, system-ui, sans-serif',
    fontMono: 'ui-monospace, monospace',
    radius: '0.75rem',
    spacingUnit: '0.25rem',
  })
  const [copied, setCopied] = useState(false)

  const themeBlock = useMemo(() => buildThemeBlock(colors, extras), [colors, extras])

  const patchColor = (id: string, partial: Partial<ThemeColor>) =>
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, ...partial } : c)))

  const setFromHex = (id: string, hex: string) => {
    const { h, c } = hexToOklch(hex)
    patchColor(id, { hue: Math.round(h), chroma: Math.round(Math.min(c, 0.3) * 1000) / 1000 })
  }

  const copyTheme = async () => {
    await navigator.clipboard.writeText(themeBlock)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <ToolLayout
      title="Tailwind theme builder"
      lede="Architect Tailwind CSS v4 @theme blocks with OKLCH color scales, font tokens, and geometry — generated entirely in this tab."
    >
      <div className="split">
        <section className="panel">
          {colors.map((color) => {
            const scale = buildScale(color.hue, color.chroma)
            return (
              <div key={color.id} style={{ marginBottom: '1.5rem' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <input
                    className="text-input"
                    style={{ maxWidth: '11rem' }}
                    value={color.name}
                    aria-label="Color name"
                    onChange={(e) => patchColor(color.id, { name: e.target.value })}
                  />
                  <div className="row">
                    <input
                      type="color"
                      aria-label={`Base colour for ${color.name}`}
                      title="Pick a base color — hue and chroma are derived from it"
                      value={oklchToHex({ l: 0.62, c: color.chroma, h: color.hue })}
                      onChange={(e) => setFromHex(color.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={colors.length <= 1}
                      onClick={() => setColors((prev) => prev.filter((c) => c.id !== color.id))}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="swatch-row">
                  {scale.map(({ step, value }) => (
                    <div key={step} className="swatch" title={oklchString(value)}>
                      <div className="swatch-color" style={{ background: oklchString(value) }} />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <div className="row" style={{ marginTop: '0.5rem' }}>
                  <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <span>Hue — {color.hue}°</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={color.hue}
                      onChange={(e) => patchColor(color.id, { hue: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <span>Chroma — {color.chroma.toFixed(3)}</span>
                    <input
                      type="range"
                      min={0}
                      max={0.3}
                      step={0.005}
                      value={color.chroma}
                      onChange={(e) => patchColor(color.id, { chroma: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </div>
            )
          })}
          <button
            type="button"
            className="btn"
            disabled={colors.length >= 6}
            onClick={() =>
              setColors((prev) => [
                ...prev,
                { id: nextId(), name: `color-${prev.length + 1}`, hue: Math.round(Math.random() * 360), chroma: 0.15 },
              ])
            }
          >
            Add color scale
          </button>
        </section>
        <aside className="panel">
          <label className="field">
            <span>--font-sans</span>
            <input className="text-input" value={extras.fontSans} onChange={(e) => setExtras({ ...extras, fontSans: e.target.value })} />
          </label>
          <label className="field">
            <span>--font-mono</span>
            <input className="text-input" value={extras.fontMono} onChange={(e) => setExtras({ ...extras, fontMono: e.target.value })} />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span>--radius-lg</span>
              <input className="text-input" value={extras.radius} onChange={(e) => setExtras({ ...extras, radius: e.target.value })} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>--spacing</span>
              <input className="text-input" value={extras.spacingUnit} onChange={(e) => setExtras({ ...extras, spacingUnit: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>@theme block (Tailwind v4)</span>
            <textarea className="code-area" rows={16} readOnly value={themeBlock} />
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={copyTheme}>
              {copied ? 'Copied ✓' : 'Copy @theme'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => triggerDownload(new Blob([themeBlock], { type: 'text/css' }), 'theme.css')}
            >
              Download theme.css
            </button>
          </div>
          <p className="hint" style={{ marginTop: '1rem' }}>
            Scales follow Tailwind&apos;s 50–950 convention: lightness ramps down each step while chroma peaks mid-scale, all
            expressed in OKLCH for perceptually even steps.
          </p>
        </aside>
      </div>
    </ToolLayout>
  )
}
