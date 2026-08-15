import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload, saveAs } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { formatBytes } from '../../lib/format'
import { zipStore } from '../../lib/zip'
import { decodeImage } from '../../lib/image/compress'
import { CAROUSEL_PRESETS, sliceCarousel, suggestPanels, type Panel } from '../../lib/carousel'

export default function CarouselTool() {
  const [file, setFile] = useState<File | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [presetId, setPresetId] = useState(CAROUSEL_PRESETS[0].id)
  const [panels, setPanels] = useState(3)
  const [overlap, setOverlap] = useState(0)
  const [numbered, setNumbered] = useState(true)
  const [background, setBackground] = useState('#ffffff')
  const [output, setOutput] = useState<Panel[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preset = CAROUSEL_PRESETS.find((p) => p.id === presetId) ?? CAROUSEL_PRESETS[0]

  useEffect(() => {
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [urls])

  const take = async (next: File) => {
    setError(null)
    setOutput([])
    setFile(next)
    try {
      const decoded = await decodeImage(next)
      const width = 'naturalWidth' in decoded && decoded.naturalWidth ? decoded.naturalWidth : decoded.width
      const height = 'naturalHeight' in decoded && decoded.naturalHeight ? decoded.naturalHeight : decoded.height
      setSize({ width, height })
      setPanels(suggestPanels(width, height, preset))
      if ('close' in decoded) decoded.close()
    } catch {
      setError('Could not read that image.')
    }
  }

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) void take(image)
  })

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const result = await sliceCarousel(file, { preset, panels, overlap, background, numbered })
      setUrls((old) => {
        for (const url of old) URL.revokeObjectURL(url)
        return result.map((p) => URL.createObjectURL(p.blob))
      })
      setOutput(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not slice that image.')
    } finally {
      setBusy(false)
    }
  }

  const downloadAll = async () => {
    const entries = await Promise.all(
      output.map(async (panel) => ({
        name: `panel-${String(panel.index + 1).padStart(2, '0')}.jpg`,
        data: new Uint8Array(await panel.blob.arrayBuffer()),
      })),
    )
    const zip = zipStore(entries)
    void saveAs(new Blob([zip.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'carousel.zip')
  }

  return (
    <ToolLayout
      title="Carousel splitter"
      lede="Slice one wide image into swipeable panels for Instagram or LinkedIn. Post them in order."
    >
      <DropZone
        accept="image/*"
        label="Drop a wide image — a panorama, a long graphic, or a screenshot."
        hint="Panels are cut left to right and numbered so you upload them in the right order."
        onFiles={(files) => {
          const image = files.find((f) => f.type.startsWith('image/'))
          if (image) void take(image)
          else setError('That is not an image.')
        }}
      />
      {error ? <p className="status-bad">{error}</p> : null}

      {file && size ? (
        <>
          <p className="hint">
            {file.name} · {size.width}×{size.height} · {formatBytes(file.size)}
          </p>

          <div className="split">
            <label className="field">
              <span>Panel shape</span>
              <select
                className="text-input"
                value={presetId}
                onChange={(e) => {
                  setPresetId(e.target.value)
                  const next = CAROUSEL_PRESETS.find((p) => p.id === e.target.value)
                  if (next && size) setPanels(suggestPanels(size.width, size.height, next))
                }}
              >
                {CAROUSEL_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.width}×{p.height}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Panels — {panels}</span>
              <input
                type="range"
                min={2}
                max={10}
                value={panels}
                onChange={(e) => setPanels(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="split">
            <label className="field">
              <span>Seam overlap — {overlap}px of the neighbour repeated</span>
              <input
                type="range"
                min={0}
                max={120}
                value={overlap}
                onChange={(e) => setOverlap(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Background — shows if a panel does not fill</span>
              <input
                type="color"
                className="text-input"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </label>
          </div>

          <label className="row">
            <input type="checkbox" checked={numbered} onChange={(e) => setNumbered(e.target.checked)} />
            Stamp 1/{panels} on each panel
          </label>

          <div className="row" style={{ marginTop: '0.9rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void run()}>
              {busy ? 'Slicing…' : 'Slice into panels'}
            </button>
            {output.length ? (
              <button type="button" className="btn" onClick={() => void downloadAll()}>
                Download all as ZIP
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {output.length ? (
        <>
          <p className="field-label" style={{ marginTop: '1.2rem' }}>
            {output.length} panels — post left to right
          </p>
          <div className="panel-strip">
            {output.map((panel, i) => (
              <figure key={panel.index} className="panel-card">
                <img src={urls[i]} alt={`Panel ${panel.index + 1}`} />
                <figcaption>
                  <span>{panel.index + 1}</span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      triggerDownload(panel.blob, `panel-${String(panel.index + 1).padStart(2, '0')}.jpg`)
                    }
                  >
                    Save
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : null}

      {output.length ? (
        <SendTo
          from="carousel"
          files={output.map((p) => new File([p.blob], `panel-${p.index + 1}.jpg`, { type: 'image/jpeg' }))}
        />
      ) : null}
    </ToolLayout>
  )
}
