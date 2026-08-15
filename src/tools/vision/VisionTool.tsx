import { useEffect, useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { parseHex, rgbToHex } from '../../lib/contrast'
import { decodeImage } from '../../lib/image/compress'
import { findClashes, simulateImageData, simulateRgb, VISION_TYPES, type VisionType } from '../../lib/vision'

const DEFAULT_PALETTE = ['#0d8a78', '#7c3aed', '#c2610a', '#2563eb', '#b52d6b', '#3f7d1f']

export default function VisionTool() {
  const [type, setType] = useState<VisionType>('deuteranopia')
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const originalRef = useRef<HTMLCanvasElement>(null)
  const simulatedRef = useRef<HTMLCanvasElement>(null)

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) setFile(image)
  })

  useEffect(() => {
    if (!file) return
    let live = true
    void (async () => {
      try {
        const source = await decodeImage(file)
        if (!live) return
        const width = 'naturalWidth' in source && source.naturalWidth ? source.naturalWidth : source.width
        const height = 'naturalHeight' in source && source.naturalHeight ? source.naturalHeight : source.height
        const scale = Math.min(1, 900 / Math.max(width, height))
        const w = Math.max(1, Math.round(width * scale))
        const h = Math.max(1, Math.round(height * scale))

        for (const [ref, apply] of [
          [originalRef, false],
          [simulatedRef, true],
        ] as const) {
          const canvas = ref.current
          if (!canvas) continue
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) continue
          ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)
          if (apply) {
            const image = ctx.getImageData(0, 0, w, h)
            simulateImageData(image.data, type)
            ctx.putImageData(image, 0, 0)
          }
        }
        if ('close' in source) source.close()
        setError(null)
      } catch (err) {
        if (live) setError(err instanceof Error ? err.message : 'Could not read that image.')
      }
    })()
    return () => {
      live = false
    }
  }, [file, type])

  const simulated = useMemo(
    () =>
      palette.map((hex) => {
        const rgb = parseHex(hex)
        return rgb ? rgbToHex(simulateRgb(rgb, type)) : hex
      }),
    [palette, type],
  )

  const clashes = useMemo(() => findClashes(palette, type, parseHex), [palette, type])
  const note = VISION_TYPES.find((v) => v.value === type)?.note ?? ''

  return (
    <ToolLayout
      title="Colour vision"
      lede="See a palette or a screenshot the way viewers with colour blindness do. Everything is simulated locally."
    >
      <div className="chip-row">
        {VISION_TYPES.map((v) => (
          <button
            key={v.value}
            type="button"
            className={type === v.value ? 'chip chip-on' : 'chip'}
            onClick={() => setType(v.value)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <p className="hint">{note}</p>

      <p className="field-label" style={{ marginTop: '1rem' }}>
        Palette
      </p>
      <div className="swatch-row">
        {palette.map((hex, i) => (
          <div key={`${hex}-${i}`} className="vision-swatch">
            <div className="vision-pair">
              <span style={{ background: hex }} title={`Original ${hex}`} />
              <span style={{ background: simulated[i] }} title={`Simulated ${simulated[i]}`} />
            </div>
            <input
              type="color"
              value={hex}
              aria-label={`Colour ${i + 1}`}
              onChange={(e) => setPalette(palette.map((c, j) => (j === i ? e.target.value : c)))}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setPalette(palette.filter((_, j) => j !== i))}
              disabled={palette.length <= 2}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn" onClick={() => setPalette([...palette, '#888888'])}>
          Add colour
        </button>
        <button type="button" className="btn" onClick={() => setPalette(DEFAULT_PALETTE)}>
          Reset
        </button>
      </div>

      {clashes.length ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="status-bad">
            {clashes.length} pair{clashes.length === 1 ? '' : 's'} become hard to tell apart:
          </p>
          <ul className="result-list">
            {clashes.map((pair) => (
              <li key={`${pair.a}-${pair.b}`} className="result-row">
                <span className="swatch-color" style={{ background: pair.a }} />
                <span className="mono-val">{pair.a}</span>
                <span aria-hidden="true">↔</span>
                <span className="swatch-color" style={{ background: pair.b }} />
                <span className="mono-val">{pair.b}</span>
              </li>
            ))}
          </ul>
          <p className="hint">Pair colour with shape, position, or a label so it is not the only signal.</p>
        </div>
      ) : (
        <p className="status-ok">Every pair in this palette stays distinguishable.</p>
      )}

      <p className="field-label" style={{ marginTop: '1.5rem' }}>
        Check a screenshot
      </p>
      <DropZone
        accept="image/*"
        label="Drop a screenshot or design to simulate."
        onFiles={(files) => {
          const image = files.find((f) => f.type.startsWith('image/'))
          if (image) setFile(image)
          else setError('That is not an image.')
        }}
      />
      {error ? <p className="status-bad">{error}</p> : null}

      <div className="split" style={{ display: file ? 'grid' : 'none' }}>
        <div className="field">
          <span>Original</span>
          <canvas ref={originalRef} className="vision-canvas" />
        </div>
        <div className="field">
          <span>Simulated</span>
          <canvas ref={simulatedRef} className="vision-canvas" />
        </div>
      </div>

      {file ? (
        <div className="row" style={{ marginTop: '0.8rem' }}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              simulatedRef.current?.toBlob((blob) => {
                if (blob) triggerDownload(blob, `simulated-${type}.png`)
              }, 'image/png')
            }}
          >
            Download simulated image
          </button>
        </div>
      ) : null}

      <SendTo from="vision" text={palette.join(', ')} />
    </ToolLayout>
  )
}
