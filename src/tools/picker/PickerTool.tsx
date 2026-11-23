import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { formatColor, sampleCanvas } from '../../lib/colorPick'
import { paletteFromPixels, swatchHex } from '../../lib/palette'
import { type Rgb } from '../../lib/contrast'

export default function PickerTool() {
  const [url, setUrl] = useState<string | null>(null)
  const [rgb, setRgb] = useState<Rgb | null>(null)
  const [palette, setPalette] = useState<string[]>([])
  const imgRef = useRef<HTMLImageElement>(null)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) {
      if (url) URL.revokeObjectURL(url)
      setUrl(URL.createObjectURL(image))
    }
  })

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )

  const formats = rgb ? formatColor(rgb) : null

  const pick = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current
    if (!img) return
    setRgb(sampleCanvas(img, event.clientX, event.clientY))
  }

  const eyedrop = async () => {
    if (!window.EyeDropper) return
    try {
      const result = await new window.EyeDropper().open()
      const hex = result.sRGBHex
      const n = parseInt(hex.slice(1), 16)
      setRgb({ r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 })
    } catch {
      /* cancelled */
    }
  }

  return (
    <ToolLayout
      title="Color picker"
      lede="Sample a pixel from a screenshot or the OS eyedropper. Copy hex, RGB, HSL, or OKLCH."
    >
      <div className="split">
        <section className="panel">
          {url ? (
            <>
              <p className="hint">Click the image to sample.</p>
              <img
                ref={imgRef}
                src={url}
                alt="Sample"
                onClick={pick}
                onLoad={(event) => {
                  const img = event.currentTarget
                  const canvas = document.createElement('canvas')
                  const edge = 160
                  const scale = Math.min(1, edge / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
                  canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale))
                  canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale))
                  const ctx = canvas.getContext('2d', { willReadFrequently: true })
                  if (!ctx) return
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
                  setPalette(paletteFromPixels(data, 6).map(swatchHex))
                }}
                style={{ maxWidth: '100%', cursor: 'crosshair', borderRadius: 'var(--radius-sm)' }}
              />
              {palette.length ? (
                <div className="row" style={{ marginTop: '0.6rem' }}>
                  {palette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className="btn btn-sm"
                      style={{ background: hex }}
                      onClick={() => {
                        const n = parseInt(hex.slice(1), 16)
                        setRgb({ r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 })
                      }}
                    >
                      {hex}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="btn-ghost"
                style={{ marginTop: '0.8rem' }}
                onClick={() => {
                  if (url) URL.revokeObjectURL(url)
                  setUrl(null)
                  setRgb(null)
                }}
              >
                Clear image
              </button>
            </>
          ) : (
            <DropZone
              label="Drop a screenshot, then click a pixel."
              onFiles={(files) => {
                if (!files[0]) return
                if (url) URL.revokeObjectURL(url)
                setUrl(URL.createObjectURL(files[0]))
              }}
            />
          )}
        </section>
        <aside className="panel">
          {window.EyeDropper ? (
            <button type="button" className="btn" onClick={() => void eyedrop()}>
              OS eyedropper
            </button>
          ) : (
            <p className="hint">This browser has no EyeDropper API. Drop a screenshot instead.</p>
          )}
          {formats ? (
            <>
              <div className="color-swatch" style={{ background: formats.hex }} />
              <div className="color-formats">
                {Object.entries(formats).map(([key, value]) => (
                  <button key={key} type="button" className="stat-pill" onClick={() => void copy(value, key)}>
                    <span>{key}</span>
                    <strong>{value}</strong>
                    {copied === key ? <em>Copied</em> : null}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="hint" style={{ marginTop: '1rem' }}>
              No sample yet.
            </p>
          )}
          <SendTo from="picker" text={formats ? `${formats.hex} · ${formats.oklch}` : undefined} />
        </aside>
      </div>
    </ToolLayout>
  )
}
