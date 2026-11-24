import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { NumberSlider } from '../../components/NumberSlider'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useI18n } from '../../lib/i18n'
import { diffPixels, highlightChanges } from '../../lib/imageDiff'

type Slot = 'a' | 'b'
type Mode = 'slider' | 'changes'

function loadImage(file: File): Promise<{ image: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({ image, url })
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that image.'))
    }
    image.src = url
  })
}

function pixels(image: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Could not read that image.')
  ctx.drawImage(image, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

function overlap(
  a: ImageData,
  b: ImageData,
): { a: Uint8ClampedArray; b: Uint8ClampedArray; width: number; height: number } {
  const width = Math.min(a.width, b.width)
  const height = Math.min(a.height, b.height)
  const left = new Uint8ClampedArray(width * height * 4)
  const right = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    left.set(a.data.subarray(y * a.width * 4, y * a.width * 4 + width * 4), y * width * 4)
    right.set(b.data.subarray(y * b.width * 4, y * b.width * 4 + width * 4), y * width * 4)
  }
  return { a: left, b: right, width, height }
}

export default function ImageDiffTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [mode, setMode] = useState<Mode>('changes')
  const [slot, setSlot] = useState<Slot>('a')
  const [urls, setUrls] = useState<{ a: string | null; b: string | null }>({ a: null, b: null })
  const [images, setImages] = useState<{ a: HTMLImageElement | null; b: HTMLImageElement | null }>({ a: null, b: null })
  const [threshold, setThreshold] = useState(16)
  const [slider, setSlider] = useState(50)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [diffBlob, setDiffBlob] = useState<Blob | null>(null)
  const [stats, setStats] = useState<string | null>(null)
  const urlsRef = useRef(urls)
  const previewRef = useRef(preview)
  urlsRef.current = urls
  previewRef.current = preview

  useEffect(() => {
    return () => {
      if (urlsRef.current.a) URL.revokeObjectURL(urlsRef.current.a)
      if (urlsRef.current.b) URL.revokeObjectURL(urlsRef.current.b)
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    }
  }, [])

  useHandoff((payload) => {
    const found = payload.files?.filter((file) => file.type.startsWith('image/')) ?? []
    if (found[0]) void take('a', found[0])
    if (found[1]) void take('b', found[1])
  })

  const take = async (which: Slot, file: File) => {
    setError(null)
    try {
      const loaded = await loadImage(file)
      setUrls((current) => {
        if (current[which]) URL.revokeObjectURL(current[which])
        return { ...current, [which]: loaded.url }
      })
      setImages((current) => ({ ...current, [which]: loaded.image }))
      setSlot(which === 'a' ? 'b' : 'a')
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Could not read that image.', 'यह तस्वीर नहीं पढ़ी जा सकी।'))
    }
  }

  const compare = () => {
    if (!images.a || !images.b) return
    try {
      const region = overlap(pixels(images.a), pixels(images.b))
      const diff = diffPixels(region.a, region.b, threshold)
      const highlighted = highlightChanges(region.a, region.b, threshold)
      const canvas = document.createElement('canvas')
      canvas.width = region.width
      canvas.height = region.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not draw the difference.')
      const pixelsOut = new Uint8ClampedArray(highlighted.length)
      pixelsOut.set(highlighted)
      ctx.putImageData(new ImageData(pixelsOut, region.width, region.height), 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) return
        setDiffBlob(blob)
        setPreview((current) => {
          if (current) URL.revokeObjectURL(current)
          return URL.createObjectURL(blob)
        })
      }, 'image/png')
      const pct = diff.total ? Math.round((diff.changed / diff.total) * 1000) / 10 : 0
      const sizeNote =
        images.a.naturalWidth === images.b.naturalWidth && images.a.naturalHeight === images.b.naturalHeight
          ? ''
          : L(
              ` Sizes differ (${images.a.naturalWidth}×${images.a.naturalHeight} and ${images.b.naturalWidth}×${images.b.naturalHeight}); compared the shared top-left ${region.width}×${region.height}.`,
              ` आकार अलग हैं (${images.a.naturalWidth}×${images.a.naturalHeight} और ${images.b.naturalWidth}×${images.b.naturalHeight}); ऊपर-बाएँ के साझा ${region.width}×${region.height} की तुलना हुई।`,
            )
      setStats(L(`${pct}% of pixels changed.${sizeNote}`, `${pct}% पिक्सेल बदले।${sizeNote}`))
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : L('Could not compare those images.', 'इन तस्वीरों की तुलना नहीं हो सकी।'),
      )
    }
  }

  return (
    <ToolLayout
      title="Image compare"
      lede="Slide between two screenshots, or mark the pixels that changed. Both images stay in this tab."
    >
      <Segmented
        label={L('View', 'दृश्य')}
        value={mode}
        options={[
          { value: 'changes', label: L('Changes', 'बदलाव') },
          { value: 'slider', label: L('Slider', 'स्लाइडर') },
        ]}
        onChange={setMode}
      />
      <DropZone
        label={
          slot === 'a'
            ? L('Drop the first image.', 'पहली तस्वीर डालें।')
            : L('Drop the second image.', 'दूसरी तस्वीर डालें।')
        }
        hint={L('Drop again to fill the empty side.', 'खाली तरफ भरने के लिए दोबारा डालें।')}
        onFiles={(files) => files[0] && void take(slot, files[0])}
      />
      {error ? <p className="status-bad">{error}</p> : null}
      <div className="split">
        <section className="panel">
          {mode === 'slider' && urls.a && urls.b ? (
            <div style={{ position: 'relative' }}>
              <img src={urls.a} alt={L('First image', 'पहली तस्वीर')} style={{ display: 'block', width: '100%' }} />
              <img
                src={urls.b}
                alt={L('Second image', 'दूसरी तस्वीर')}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  clipPath: `inset(0 ${100 - slider}% 0 0)`,
                }}
              />
            </div>
          ) : preview ? (
            <div className="preview-frame">
              <img src={preview} alt={L('Changed pixels in lime', 'बदले पिक्सेल हरे रंग में')} />
            </div>
          ) : (
            <div className="row">
              {urls.a ? <img src={urls.a} alt={L('First image', 'पहली तस्वीर')} style={{ maxWidth: '48%' }} /> : null}
              {urls.b ? <img src={urls.b} alt={L('Second image', 'दूसरी तस्वीर')} style={{ maxWidth: '48%' }} /> : null}
              {!urls.a && !urls.b ? <p className="muted">{L('Drop two images.', 'दो तस्वीरें डालें।')}</p> : null}
            </div>
          )}
        </section>
        <aside className="panel">
          {mode === 'slider' ? (
            <NumberSlider
              label={L('Reveal', 'दिखाएँ')}
              value={slider}
              min={0}
              max={100}
              suffix="%"
              onChange={setSlider}
            />
          ) : (
            <NumberSlider
              label={L('Ignore gaps under', 'इससे छोटे फ़र्क को छोड़ें')}
              value={threshold}
              min={0}
              max={64}
              onChange={setThreshold}
            />
          )}
          <button type="button" className="btn btn-primary" disabled={!images.a || !images.b} onClick={compare}>
            {L('Compare pixels', 'पिक्सेल तुलना करें')}
          </button>
          {stats ? <p className="hint">{stats}</p> : null}
          {diffBlob ? (
            <button type="button" className="btn" onClick={() => triggerDownload(diffBlob, 'image-diff.png')}>
              {L('Download difference', 'अंतर डाउनलोड करें')}
            </button>
          ) : null}
        </aside>
      </div>
    </ToolLayout>
  )
}
