import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'
import { blobSvg, patternSvg, placeholderSvg } from '../../lib/shapes'

type Kind = 'blob' | 'dots' | 'grid' | 'stripes' | 'box'

export default function ShapesTool() {
  const [kind, setKind] = useState<Kind>('blob')
  const [seed, setSeed] = useState(1)
  const [fill, setFill] = useState('#c45b2d')
  const [width, setWidth] = useState(640)
  const [height, setHeight] = useState(360)
  const [label, setLabel] = useState('')
  const { copied, copy } = useCopied()
  const svg = useMemo(() => {
    try {
      const text =
        kind === 'blob'
          ? blobSvg(seed, fill)
          : kind === 'box'
            ? placeholderSvg(width, height, label, fill)
            : patternSvg(kind, fill)
      return { text, error: null as string | null }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : 'Use a hex color.' }
    }
  }, [kind, seed, fill, width, height, label])

  return (
    <ToolLayout title="SVG shapes" lede="A random blob, or a repeating pattern, as SVG you can copy.">
      <Segmented
        label="Shape"
        value={kind}
        options={[
          { value: 'blob', label: 'Blob' },
          { value: 'dots', label: 'Dots' },
          { value: 'grid', label: 'Grid' },
          { value: 'stripes', label: 'Stripes' },
          { value: 'box', label: 'Placeholder' },
        ]}
        onChange={setKind}
      />
      <div className="row">
        <label className="field">
          <span>Color</span>
          <input type="color" value={fill} onChange={(e) => setFill(e.target.value)} />
        </label>
        {kind === 'box' ? (
          <>
            <label className="field">
              <span>Width</span>
              <input
                className="text-input"
                type="number"
                min={1}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Height</span>
              <input
                className="text-input"
                type="number"
                min={1}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Label</span>
              <input className="text-input" value={label} onChange={(e) => setLabel(e.target.value)} />
            </label>
          </>
        ) : null}
        {kind === 'blob' ? (
          <button type="button" className="btn" onClick={() => setSeed((n) => n + 1)}>
            Another blob
          </button>
        ) : null}
      </div>
      {svg.error ? <p className="status-bad">{svg.error}</p> : null}
      {svg.text ? (
        <img alt="" src={`data:image/svg+xml,${encodeURIComponent(svg.text)}`} style={{ width: 240, height: 240 }} />
      ) : null}
      <textarea className="code-area" rows={6} readOnly value={svg.text} />
      <button type="button" className="btn btn-primary" disabled={!svg.text} onClick={() => void copy(svg.text, 'svg')}>
        {copied === 'svg' ? 'Copied ✓' : 'Copy SVG'}
      </button>
    </ToolLayout>
  )
}
