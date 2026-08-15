import { useEffect, useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { useHandoff } from '../../lib/useHandoff'
import { contrastRatio, parseHex, rgbToHex, suggestForeground, wcagLevel, type Rgb } from '../../lib/contrast'
import { formatColor } from '../../lib/colorPick'
import { useCopied } from '../../lib/useCopied'

const WHITE: Rgb = { r: 255, g: 255, b: 255 }
const INK: Rgb = { r: 16, g: 32, b: 31 }

export default function ContrastTool() {
  const [fg, setFg] = useState('#f4f7f7')
  const [bg, setBg] = useState('#10201f')
  const [url, setUrl] = useState<string | null>(null)
  const [picking, setPicking] = useState<'fg' | 'bg' | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) {
      if (url) URL.revokeObjectURL(url)
      setUrl(URL.createObjectURL(image))
    }
  })

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  const fgRgb = parseHex(fg) ?? WHITE
  const bgRgb = parseHex(bg) ?? INK
  const ratio = contrastRatio(fgRgb, bgRgb)
  const normal = wcagLevel(ratio, false)
  const large = wcagLevel(ratio, true)
  const suggest = useMemo(() => {
    const aa = suggestForeground(bgRgb, 4.5)
    const aaa = suggestForeground(bgRgb, 7)
    return { aa: aa ? rgbToHex(aa) : null, aaa: aaa ? rgbToHex(aaa) : null }
  }, [bgRgb])

  const eyedrop = async (target: 'fg' | 'bg') => {
    if (!window.EyeDropper) return
    try {
      const result = await new window.EyeDropper().open()
      if (target === 'fg') setFg(result.sRGBHex)
      else setBg(result.sRGBHex)
    } catch {
      /* user cancelled */
    }
  }

  const sampleImage = (event: React.MouseEvent<HTMLImageElement>) => {
    const img = imgRef.current
    if (!img || !picking) return
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = img.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * img.naturalWidth
    const y = ((event.clientY - rect.top) / rect.height) * img.naturalHeight
    ctx.drawImage(img, x, y, 1, 1, 0, 0, 1, 1)
    const pix = ctx.getImageData(0, 0, 1, 1).data
    const hex = rgbToHex({ r: pix[0], g: pix[1], b: pix[2] })
    if (picking === 'fg') setFg(hex)
    else setBg(hex)
    setPicking(null)
  }

  return (
    <ToolLayout
      title="Contrast checker"
      lede="WCAG 2 contrast for a foreground/background pair. Sample from the OS eyedropper or a screenshot."
    >
      <div className="split">
        <section className="panel">
          <div className="contrast-preview" style={{ background: bg, color: fg }}>
            <p style={{ fontSize: '1.05rem', margin: 0 }}>Body text at 16px. The quick brown fox.</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 650, margin: '0.6rem 0 0' }}>Large text 24px</p>
          </div>
          {url ? (
            <div style={{ marginTop: '1rem' }}>
              <p className="hint">{picking ? `Click the image to set ${picking === 'fg' ? 'foreground' : 'background'}.` : 'Load a screenshot, then pick a pixel.'}</p>
              <img
                ref={imgRef}
                src={url}
                alt="Sample"
                onClick={sampleImage}
                style={{ maxWidth: '100%', cursor: picking ? 'crosshair' : 'default' }}
              />
            </div>
          ) : (
            <DropZone
              label="Optional: drop a screenshot to sample colors."
              onFiles={(files) => {
                if (!files[0]) return
                if (url) URL.revokeObjectURL(url)
                setUrl(URL.createObjectURL(files[0]))
              }}
            />
          )}
        </section>
        <aside className="panel">
          <label className="field">
            <span>Foreground {fg}</span>
            <div className="row">
              <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
              <input value={fg} onChange={(e) => setFg(e.target.value)} />
            </div>
          </label>
          <label className="field">
            <span>Background {bg}</span>
            <div className="row">
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
              <input value={bg} onChange={(e) => setBg(e.target.value)} />
            </div>
          </label>
          <div className="row" style={{ marginBottom: '1rem' }}>
            {window.EyeDropper ? (
              <>
                <button type="button" className="btn" onClick={() => void eyedrop('fg')}>
                  Drop foreground
                </button>
                <button type="button" className="btn" onClick={() => void eyedrop('bg')}>
                  Drop background
                </button>
              </>
            ) : null}
            {url ? (
              <>
                <button type="button" className="btn" onClick={() => setPicking('fg')}>
                  Sample FG
                </button>
                <button type="button" className="btn" onClick={() => setPicking('bg')}>
                  Sample BG
                </button>
              </>
            ) : null}
          </div>
          <p className={ratio >= 4.5 ? 'status-ok' : 'status-bad'} style={{ fontSize: '1.4rem', fontWeight: 650 }}>
            {ratio.toFixed(2)} : 1
          </p>
          <p className="hint">Normal text {normal === 'fail' ? 'fails AA' : `passes ${normal}`}</p>
          <p className="hint">Large text {large === 'fail' ? 'fails AA' : `passes ${large}`}</p>
          {suggest.aa && normal === 'fail' ? (
            <button type="button" className="btn" onClick={() => setFg(suggest.aa!)}>
              Use AA foreground {suggest.aa}
            </button>
          ) : null}
          {suggest.aaa && normal !== 'AAA' ? (
            <button type="button" className="btn" style={{ marginTop: '0.4rem' }} onClick={() => setFg(suggest.aaa!)}>
              Use AAA foreground {suggest.aaa}
            </button>
          ) : null}
          <button type="button" className="btn-ghost" onClick={() => { setFg(bg); setBg(fg) }}>
            Swap
          </button>
          <div className="color-formats" style={{ marginTop: '1rem' }}>
            {(['fg', 'bg'] as const).map((slot) => {
              const formats = formatColor(slot === 'fg' ? fgRgb : bgRgb)
              return (
                <button
                  key={slot}
                  type="button"
                  className="stat-pill"
                  onClick={() => void copy(formats.hex, slot)}
                >
                  <span>{slot === 'fg' ? 'Foreground' : 'Background'}</span>
                  <strong>{formats.hex}</strong>
                  <em>{copied === slot ? 'Copied' : formats.oklch}</em>
                </button>
              )
            })}
          </div>
          <SendTo from="contrast" text={`${fg} on ${bg} — ${ratio.toFixed(2)}:1`} />
        </aside>
      </div>
    </ToolLayout>
  )
}
