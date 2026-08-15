import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { triggerDownload } from '../../lib/download'
import {
  defaultGradient,
  gradientCss,
  gradientCssRule,
  gradientSvg,
  uid,
  type GradientState,
  type GradientType,
} from '../../lib/gradient'

const RADIAL_POSITIONS = ['center', 'top left', 'top', 'top right', 'left', 'right', 'bottom left', 'bottom', 'bottom right']

function randomHex(): string {
  const buf = crypto.getRandomValues(new Uint8Array(3))
  return `#${[...buf].map((b) => b.toString(16).padStart(2, '0')).join('')}`
}

export default function GradientTool() {
  const [state, setState] = useState<GradientState>(defaultGradient)
  const [copied, setCopied] = useState(false)

  const css = useMemo(() => gradientCss(state), [state])
  const rule = useMemo(() => gradientCssRule(state), [state])
  const svg = useMemo(() => gradientSvg(state), [state])

  const patch = (partial: Partial<GradientState>) => setState((prev) => ({ ...prev, ...partial }))

  const updateStop = (id: string, partial: Partial<{ color: string; position: number }>) =>
    patch({ stops: state.stops.map((s) => (s.id === id ? { ...s, ...partial } : s)) })

  const updateBlob = (id: string, partial: Partial<{ color: string; x: number; y: number; radius: number }>) =>
    patch({ meshBlobs: state.meshBlobs.map((b) => (b.id === id ? { ...b, ...partial } : b)) })

  const copyCss = async () => {
    await navigator.clipboard.writeText(rule)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const randomize = () => {
    if (state.type === 'mesh') {
      patch({
        meshBlobs: state.meshBlobs.map((b) => ({
          ...b,
          color: randomHex(),
          x: Math.round(Math.random() * 100),
          y: Math.round(Math.random() * 100),
        })),
      })
    } else {
      patch({
        angle: Math.round(Math.random() * 360),
        stops: state.stops.map((s) => ({ ...s, color: randomHex() })),
      })
    }
  }

  return (
    <ToolLayout
      title="Gradient builder"
      lede="Design linear, radial, conic, and mesh-style gradients visually. Copy production-ready CSS or export an SVG."
    >
      <div className="split">
        <section className="panel">
          <div className="gradient-preview" style={{ background: css }} />
          <label className="field" style={{ marginTop: '1rem' }}>
            <span>CSS</span>
            <textarea className="code-area" rows={state.type === 'mesh' ? 7 : 3} readOnly value={rule} />
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={copyCss}>
              {copied ? 'Copied ✓' : 'Copy CSS'}
            </button>
            {svg ? (
              <button
                type="button"
                className="btn"
                onClick={() => triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), 'gradient.svg')}
              >
                Export SVG (800×600)
              </button>
            ) : (
              <span className="hint">Conic gradients have no native SVG primitive — use the CSS.</span>
            )}
            <button type="button" className="btn" onClick={randomize}>
              Randomize
            </button>
          </div>
        </section>
        <aside className="panel">
          <Segmented
            label="Type"
            value={state.type}
            options={[
              { value: 'linear', label: 'Linear' },
              { value: 'radial', label: 'Radial' },
              { value: 'conic', label: 'Conic' },
              { value: 'mesh', label: 'Mesh' },
            ]}
            onChange={(type: GradientType) => patch({ type })}
          />

          {state.type === 'linear' || state.type === 'conic' ? (
            <label className="field">
              <span>Angle — {state.angle}°</span>
              <input
                type="range"
                aria-label="Gradient angle in degrees"
                min={0}
                max={360}
                value={state.angle}
                onChange={(e) => patch({ angle: Number(e.target.value) })}
              />
            </label>
          ) : null}

          {state.type === 'radial' ? (
            <Segmented
              label="Shape"
              value={state.radialShape}
              options={[
                { value: 'circle', label: 'Circle' },
                { value: 'ellipse', label: 'Ellipse' },
              ]}
              onChange={(radialShape) => patch({ radialShape })}
            />
          ) : null}

          {state.type === 'radial' || state.type === 'conic' ? (
            <label className="field">
              <span>Position</span>
              <select value={state.radialPosition} onChange={(e) => patch({ radialPosition: e.target.value })}>
                {RADIAL_POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {state.type !== 'mesh' ? (
            <>
              <span className="field-label">Color stops</span>
              {[...state.stops]
                .sort((a, b) => a.position - b.position)
                .map((stop, i) => (
                  <div key={stop.id} className="stop-row">
                    <input
                      type="color"
                      aria-label={`Colour for stop ${i + 1}`}
                      value={stop.color}
                      onChange={(e) => updateStop(stop.id, { color: e.target.value })}
                    />
                    <input
                      type="range"
                      aria-label={`Position of stop ${i + 1}`}
                      min={0}
                      max={100}
                      value={stop.position}
                      onChange={(e) => updateStop(stop.id, { position: Number(e.target.value) })}
                    />
                    <span className="mono-val">{stop.position}%</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      aria-label="Remove stop"
                      disabled={state.stops.length <= 2}
                      onClick={() => patch({ stops: state.stops.filter((s) => s.id !== stop.id) })}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              <button
                type="button"
                className="btn"
                style={{ marginTop: '0.5rem' }}
                disabled={state.stops.length >= 8}
                onClick={() => patch({ stops: [...state.stops, { id: uid(), color: randomHex(), position: 50 }] })}
              >
                Add stop
              </button>
            </>
          ) : (
            <>
              <label className="field">
                <span>Base color</span>
                <input
                  type="color"
                  value={state.meshBackground}
                  onChange={(e) => patch({ meshBackground: e.target.value })}
                />
              </label>
              <span className="field-label">Mesh points</span>
              {state.meshBlobs.map((blob, i) => (
                <div key={blob.id} className="mesh-row">
                  <div className="stop-row">
                    <input
                      type="color"
                      aria-label={`Colour for mesh point ${i + 1}`}
                      value={blob.color}
                      onChange={(e) => updateBlob(blob.id, { color: e.target.value })}
                    />
                    <span className="mono-val">#{i + 1}</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      aria-label="Remove point"
                      disabled={state.meshBlobs.length <= 1}
                      onClick={() => patch({ meshBlobs: state.meshBlobs.filter((b) => b.id !== blob.id) })}
                    >
                      ✕
                    </button>
                  </div>
                  <label className="field">
                    <span>X {blob.x}% · Y {blob.y}% · spread {blob.radius}%</span>
                    <div className="row">
                      <input
                        type="range"
                        aria-label={`Horizontal position of mesh point ${i + 1}`}
                        min={0}
                        max={100}
                        value={blob.x}
                        onChange={(e) => updateBlob(blob.id, { x: Number(e.target.value) })}
                      />
                      <input
                        type="range"
                        aria-label={`Vertical position of mesh point ${i + 1}`}
                        min={0}
                        max={100}
                        value={blob.y}
                        onChange={(e) => updateBlob(blob.id, { y: Number(e.target.value) })}
                      />
                      <input
                        type="range"
                        aria-label={`Spread of mesh point ${i + 1}`}
                        min={20}
                        max={100}
                        value={blob.radius}
                        onChange={(e) => updateBlob(blob.id, { radius: Number(e.target.value) })}
                      />
                    </div>
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="btn"
                disabled={state.meshBlobs.length >= 6}
                onClick={() =>
                  patch({
                    meshBlobs: [
                      ...state.meshBlobs,
                      { id: uid(), color: randomHex(), x: 50, y: 50, radius: 50 },
                    ],
                  })
                }
              >
                Add mesh point
              </button>
            </>
          )}
        </aside>
      </div>
    </ToolLayout>
  )
}
