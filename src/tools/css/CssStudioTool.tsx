import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import {
  bezierCss,
  boxShadowCss,
  checkboxCss,
  clipCss,
  glassCss,
  glitchCss,
  loaderCss,
  nativeShadow,
  patternCss,
  radiusCss,
  switchCss,
  triangleCss,
  type ClipShape,
  type PatternKind,
  type TrianglePoint,
} from '../../lib/cssStudio'

type Kind =
  | 'shadow'
  | 'radius'
  | 'clip'
  | 'bezier'
  | 'glass'
  | 'pattern'
  | 'triangle'
  | 'loader'
  | 'switch'
  | 'check'
  | 'glitch'
  | 'native'

const KINDS: { value: Kind; label: string }[] = [
  { value: 'shadow', label: 'Box shadow' },
  { value: 'radius', label: 'Border radius' },
  { value: 'clip', label: 'Clip path' },
  { value: 'bezier', label: 'Cubic bezier' },
  { value: 'glass', label: 'Glass' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'triangle', label: 'Triangle' },
  { value: 'loader', label: 'Loader' },
  { value: 'switch', label: 'Switch' },
  { value: 'check', label: 'Checkbox' },
  { value: 'glitch', label: 'Text glitch' },
  { value: 'native', label: 'React Native shadow' },
]

export default function CssStudioTool() {
  const [kind, setKind] = useState<Kind>('shadow')
  const [x, setX] = useState(0)
  const [y, setY] = useState(12)
  const [blur, setBlur] = useState(28)
  const [spread, setSpread] = useState(0)
  const [inset, setInset] = useState(false)
  const [color, setColor] = useState('#1c1915')
  const [tl, setTl] = useState(16)
  const [tr, setTr] = useState(16)
  const [br, setBr] = useState(16)
  const [bl, setBl] = useState(16)
  const [clip, setClip] = useState<ClipShape>('blob')
  const [x1, setX1] = useState(0.4)
  const [y1, setY1] = useState(0)
  const [x2, setX2] = useState(0.2)
  const [y2, setY2] = useState(1)
  const [alpha, setAlpha] = useState(0.35)
  const [pattern, setPattern] = useState<PatternKind>('dots')
  const [gap, setGap] = useState(16)
  const [point, setPoint] = useState<TrianglePoint>('up')
  const [size, setSize] = useState(36)
  const [on, setOn] = useState(true)
  const [glitch, setGlitch] = useState('BitKit')
  const { copied, copy } = useCopied()

  const css = useMemo(() => {
    if (kind === 'shadow') return `box-shadow: ${boxShadowCss(x, y, blur, spread, color, inset)};`
    if (kind === 'radius') return `border-radius: ${radiusCss(tl, tr, br, bl)};`
    if (kind === 'clip') return `clip-path: ${clipCss(clip)};`
    if (kind === 'bezier') return `transition-timing-function: ${bezierCss(x1, y1, x2, y2)};`
    if (kind === 'glass') return glassCss(blur, alpha)
    if (kind === 'pattern') return patternCss(pattern, color, gap)
    if (kind === 'triangle') return triangleCss(size, color, point)
    if (kind === 'loader') return loaderCss(color, size)
    if (kind === 'switch') return switchCss(color, '#c8c2b8')
    if (kind === 'check') return checkboxCss(color)
    if (kind === 'native') return nativeShadow(x, y, blur, color, alpha)
    return glitchCss(color)
  }, [kind, x, y, blur, spread, inset, color, tl, tr, br, bl, clip, x1, y1, x2, y2, alpha, pattern, gap, size, point])

  const previewStyle = useMemo(() => {
    if (kind === 'shadow') return { boxShadow: boxShadowCss(x, y, blur, spread, color, inset) }
    if (kind === 'radius') return { borderRadius: radiusCss(tl, tr, br, bl) }
    if (kind === 'clip') return { clipPath: clipCss(clip), background: color }
    if (kind === 'glass') return { background: `rgba(255,255,255,${alpha})`, backdropFilter: `blur(${blur}px)` }
    if (kind === 'pattern') return undefined
    if (kind === 'bezier') return { transition: `transform 0.6s ${bezierCss(x1, y1, x2, y2)}` }
    if (kind === 'native') return { boxShadow: boxShadowCss(x, y, blur, 0, color, false) }
    return undefined
  }, [kind, x, y, blur, spread, inset, color, tl, tr, br, bl, clip, alpha, x1, y1, x2, y2])

  return (
    <ToolLayout
      title="CSS studio"
      lede="Shadows, radii, clips, easing, glass, patterns, and small controls. Copy the CSS."
    >
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>Generator</span>
            <select className="text-input" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {KINDS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {kind === 'shadow' || kind === 'glass' || kind === 'native' ? (
            <Slider label={kind === 'glass' ? 'Blur' : 'Blur'} value={blur} min={0} max={80} onChange={setBlur} />
          ) : null}
          {kind === 'shadow' || kind === 'native' ? (
            <>
              <Slider label="X" value={x} min={-40} max={40} onChange={setX} />
              <Slider label="Y" value={y} min={-40} max={40} onChange={setY} />
              {kind === 'shadow' ? (
                <Slider label="Spread" value={spread} min={-20} max={40} onChange={setSpread} />
              ) : null}
              {kind === 'shadow' ? (
                <label className="row">
                  <input type="checkbox" checked={inset} onChange={(e) => setInset(e.target.checked)} />
                  Inset
                </label>
              ) : null}
            </>
          ) : null}
          {kind === 'radius' ? (
            <>
              <Slider label="Top left" value={tl} min={0} max={80} onChange={setTl} />
              <Slider label="Top right" value={tr} min={0} max={80} onChange={setTr} />
              <Slider label="Bottom right" value={br} min={0} max={80} onChange={setBr} />
              <Slider label="Bottom left" value={bl} min={0} max={80} onChange={setBl} />
            </>
          ) : null}
          {kind === 'clip' ? (
            <label className="field">
              <span>Shape</span>
              <select className="text-input" value={clip} onChange={(e) => setClip(e.target.value as ClipShape)}>
                {(['circle', 'ellipse', 'triangle', 'diamond', 'hexagon', 'blob'] as ClipShape[]).map((shape) => (
                  <option key={shape} value={shape}>
                    {shape}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {kind === 'bezier' ? (
            <>
              <Slider label="X1" value={x1} min={0} max={1} step={0.01} onChange={setX1} />
              <Slider label="Y1" value={y1} min={-1} max={2} step={0.01} onChange={setY1} />
              <Slider label="X2" value={x2} min={0} max={1} step={0.01} onChange={setX2} />
              <Slider label="Y2" value={y2} min={-1} max={2} step={0.01} onChange={setY2} />
            </>
          ) : null}
          {kind === 'glass' || kind === 'native' ? (
            <Slider
              label={kind === 'native' ? 'Opacity' : 'Fill'}
              value={alpha}
              min={0.05}
              max={kind === 'native' ? 1 : 0.8}
              step={0.01}
              onChange={setAlpha}
            />
          ) : null}
          {kind === 'pattern' ? (
            <>
              <label className="field">
                <span>Pattern</span>
                <select
                  className="text-input"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value as PatternKind)}
                >
                  {(['dots', 'grid', 'stripes', 'checker'] as PatternKind[]).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <Slider label="Gap" value={gap} min={8} max={40} onChange={setGap} />
            </>
          ) : null}
          {kind === 'triangle' || kind === 'loader' ? (
            <Slider label="Size" value={size} min={12} max={80} onChange={setSize} />
          ) : null}
          {kind === 'triangle' ? (
            <label className="field">
              <span>Point</span>
              <select className="text-input" value={point} onChange={(e) => setPoint(e.target.value as TrianglePoint)}>
                {(['up', 'down', 'left', 'right'] as TrianglePoint[]).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {kind !== 'radius' && kind !== 'bezier' ? (
            <label className="field">
              <span>Color</span>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          ) : null}
          <textarea className="code-area" rows={12} readOnly value={css} />
          <button type="button" className="btn btn-primary" onClick={() => void copy(css, 'css')}>
            {copied === 'css' ? 'Copied ✓' : 'Copy CSS'}
          </button>
        </section>
        <aside className="panel css-stage" data-kind={kind}>
          {kind === 'pattern' ? <style>{`.css-card { ${css} }`}</style> : null}
          {kind === 'loader' ? (
            <div className="css-loader" style={{ width: size, height: size, borderTopColor: color }} />
          ) : null}
          {kind === 'switch' ? (
            <button
              type="button"
              className="css-switch"
              aria-checked={on}
              onClick={() => setOn((v) => !v)}
              style={{ background: on ? color : undefined }}
            />
          ) : null}
          {kind === 'check' ? (
            <button
              type="button"
              className="css-check"
              aria-checked={on}
              onClick={() => setOn((v) => !v)}
              style={{ borderColor: color, background: on ? color : 'transparent' }}
            />
          ) : null}
          {kind === 'glitch' ? (
            <p className="css-glitch" data-text={glitch || 'BitKit'} style={{ color }}>
              {glitch || 'BitKit'}
            </p>
          ) : null}
          {kind === 'glitch' ? (
            <label className="field">
              <span>Text</span>
              <input className="text-input" value={glitch} onChange={(e) => setGlitch(e.target.value)} />
            </label>
          ) : null}
          {kind === 'triangle' ? (
            <div
              style={{
                width: 0,
                height: 0,
                ...(point === 'up'
                  ? {
                      borderLeft: `${size}px solid transparent`,
                      borderRight: `${size}px solid transparent`,
                      borderBottom: `${size}px solid ${color}`,
                    }
                  : point === 'down'
                    ? {
                        borderLeft: `${size}px solid transparent`,
                        borderRight: `${size}px solid transparent`,
                        borderTop: `${size}px solid ${color}`,
                      }
                    : point === 'left'
                      ? {
                          borderTop: `${size}px solid transparent`,
                          borderBottom: `${size}px solid transparent`,
                          borderRight: `${size}px solid ${color}`,
                        }
                      : {
                          borderTop: `${size}px solid transparent`,
                          borderBottom: `${size}px solid transparent`,
                          borderLeft: `${size}px solid ${color}`,
                        }),
              }}
            />
          ) : null}
          {kind !== 'loader' && kind !== 'switch' && kind !== 'check' && kind !== 'glitch' && kind !== 'triangle' ? (
            <div className="css-card" style={previewStyle} data-move={kind === 'bezier' ? '1' : undefined} />
          ) : null}
        </aside>
      </div>
    </ToolLayout>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <label className="field">
      <span>
        {label} · {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
