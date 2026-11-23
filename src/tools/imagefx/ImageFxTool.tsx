import { useEffect, useMemo, useRef, useState } from 'react'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import { downloadNamed } from '../../lib/download'
import {
  applyFisheye,
  applyLook,
  applySeason,
  asciiFromRaster,
  boothStripCount,
  canvasToPng,
  loadStill,
  outputName,
  paintBooth,
  paintKenBurns,
  paintRaster,
  seasonById,
  seasonalDrapes,
  sortImageRows,
  strokeToFill,
  takeFiles,
  traceRaster,
  uniqueColors,
  type Raster,
} from '../../lib/imagefx'
import { useCopied } from '../../lib/useCopied'

const MODES = [
  { value: 'booth', label: 'Photo booth strip' },
  { value: 'newspaper', label: 'Newspaper page' },
  { value: 'decade', label: '10-year filter' },
  { value: 'disposable', label: 'Disposable camera' },
  { value: 'digicam', label: 'Digicam filter' },
  { value: 'fisheye', label: 'Fisheye' },
  { value: 'colors', label: 'Every color in a photo' },
  { value: 'stroke', label: 'SVG stroke to fill' },
  { value: 'live', label: 'Live Photo and Motion Photo' },
  { value: 'sort', label: 'Pixel sorting' },
  { value: 'ascii', label: 'Video to ASCII' },
  { value: 'trace', label: 'Trace to SVG' },
  { value: 'season', label: 'Seasonal color drape' },
] as const

type Mode = (typeof MODES)[number]['value']

const PNG_MODES = new Set<Mode>([
  'booth',
  'newspaper',
  'decade',
  'disposable',
  'digicam',
  'fisheye',
  'live',
  'sort',
  'season',
])

const NOTES: Record<Mode, string> = {
  booth: 'Stacks 2–4 frames in one vertical strip. Fewer photos are repeated; extras past four are left off.',
  newspaper: 'Halftone newsprint, grain, and a date line across the top.',
  decade: 'Faded sepia, grain, and a date from ten years ago.',
  disposable: 'Warm flash, heavy grain, a dark vignette, and an orange date stamp.',
  digicam: 'Hard contrast, a small flash, fine grain, and a yellow camera date.',
  fisheye: 'Remaps every pixel. The center stays where it is and the corners move inward.',
  colors: 'Up to 12 swatches from this photo, plus the full count of unique colors.',
  stroke:
    'Stroked rect, circle, and path tags are rewritten as fills. This is an attribute rewrite, not a full vector tracer.',
  live: 'The still is shown as-is. A short pan, zoom, and motion blur is generated in this tab. Apple Live Photo and Motion Photo movies are not opened.',
  sort: 'Each row is sorted by brightness, dark to light.',
  ascii: 'One local frame, drawn as text in this tab. The file is not uploaded.',
  trace: 'Dark pixels become black rectangles on a downscaled grid. Coarse on purpose, not a full outline trace.',
  season: 'A season palette is draped with multiply and overlay.',
}

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
  <rect x="8" y="8" width="104" height="64" fill="none" stroke="#1c1a17" stroke-width="4"/>
  <circle cx="60" cy="40" r="18" fill="none" stroke="#c45b2d" stroke-width="3"/>
</svg>`

export default function ImageFxTool() {
  const [mode, setMode] = useState<Mode>('booth')
  const [files, setFiles] = useState<File[]>([])
  const [stills, setStills] = useState<Raster[]>([])
  const [frameCount, setFrameCount] = useState(3)
  const [seasonId, setSeasonId] = useState(seasonalDrapes()[0].id)
  const [svgSource, setSvgSource] = useState(SAMPLE_SVG)
  const [ascii, setAscii] = useState('')
  const [colors, setColors] = useState<{ colors: string[]; total: number } | null>(null)
  const [traced, setTraced] = useState('')
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { copied, copy } = useCopied()
  const filled = useMemo(() => strokeToFill(svgSource), [svgSource])
  const seasons = seasonalDrapes()
  const showCanvas = stills.length > 0 && mode !== 'stroke' && mode !== 'ascii' && mode !== 'trace'

  useEffect(() => {
    let live = true
    if (!files.length) {
      setStills((current) => (current.length ? [] : current))
      setBusy(false)
      return
    }
    setBusy(true)
    setError(null)
    void (async () => {
      try {
        const loaded: Raster[] = []
        for (const file of files) {
          loaded.push(await loadStill(file))
          if (!live) return
        }
        if (!live) return
        setStills(loaded)
      } catch (err) {
        if (!live) return
        setStills([])
        setError(err instanceof Error ? err.message : 'Could not read that file.')
      } finally {
        if (live) setBusy(false)
      }
    })()
    return () => {
      live = false
    }
  }, [files])

  useEffect(() => {
    const view = canvasRef.current
    if (!view || !stills.length || mode === 'stroke') {
      setReady(false)
      return
    }
    const still = stills[0]
    try {
      if (mode === 'booth') {
        paintBooth(view, stills, frameCount)
        setReady(true)
      } else if (mode === 'ascii') {
        setAscii(asciiFromRaster(still.data, still.width, still.height))
        setReady(false)
      } else if (mode === 'colors') {
        paintRaster(view, still)
        setColors(uniqueColors(still.data))
        setReady(false)
      } else if (mode === 'trace') {
        setTraced(traceRaster(still.data, still.width, still.height))
        setReady(false)
      } else if (mode === 'fisheye') {
        paintRaster(view, { ...still, data: applyFisheye(still.data, still.width, still.height) })
        setReady(true)
      } else if (mode === 'sort') {
        paintRaster(view, { ...still, data: sortImageRows(still.data, still.width, still.height) })
        setReady(true)
      } else if (mode === 'season') {
        const season = seasonById(seasonId)
        paintRaster(view, { ...still, data: applySeason(still.data, still.width, still.height, season.colors) })
        setReady(true)
      } else if (mode === 'live') {
        paintRaster(view, still)
        setReady(true)
      } else if (mode === 'newspaper' || mode === 'decade' || mode === 'disposable' || mode === 'digicam') {
        paintRaster(view, { ...still, data: applyLook(still.data, still.width, still.height, mode) }, mode)
        setReady(true)
      }
      setError(null)
    } catch (err) {
      setReady(false)
      setError(err instanceof Error ? err.message : 'Could not draw that effect.')
    }
  }, [stills, mode, frameCount, seasonId])

  useEffect(() => {
    if (mode !== 'live' || !stills.length) return
    const source = stills[0]?.canvas
    const view = canvasRef.current
    if (!source || !view) return
    let frame = 0
    let raf = 0
    const loop = () => {
      paintKenBurns(view, source, frame)
      frame += 1
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [mode, stills])

  const savePng = () => {
    const canvas = mode === 'live' ? stills[0]?.canvas : canvasRef.current
    if (!canvas) return
    void canvasToPng(canvas)
      .then((blob) => downloadNamed(blob, outputName(mode)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not save the PNG.'))
  }

  return (
    <ToolLayout
      title="Image FX"
      lede="Photo booth strips, film looks, fisheye, color lists, and coarse traces. Files stay in this tab."
    >
      <Segmented label="Effect" value={mode} options={[...MODES]} onChange={setMode} />
      <p className={mode === 'live' ? undefined : 'hint'}>{NOTES[mode]}</p>

      {mode !== 'stroke' ? (
        <DropZone
          accept={mode === 'ascii' ? 'image/*,video/*' : 'image/*'}
          multiple={mode === 'booth'}
          label={
            mode === 'booth' ? 'Drop 2–4 photos.' : mode === 'ascii' ? 'Drop a video or an image.' : 'Drop an image.'
          }
          hint={mode === 'ascii' ? 'A single frame is drawn here. Nothing is uploaded.' : 'Processed in this tab.'}
          onFiles={(picked) => {
            const accepted = takeFiles(picked, mode)
            if (!accepted.length) {
              setError(mode === 'ascii' ? 'Choose an image or a video.' : 'Choose an image.')
              return
            }
            setError(null)
            setFiles(accepted)
          }}
        />
      ) : null}

      {mode === 'booth' ? (
        <label className="field">
          <span>Frames — {boothStripCount(frameCount)}</span>
          <input
            type="range"
            min={2}
            max={4}
            step={1}
            value={frameCount}
            onChange={(event) => setFrameCount(boothStripCount(Number(event.target.value)))}
          />
        </label>
      ) : null}

      {mode === 'season' ? (
        <Segmented
          label="Season"
          value={seasonId}
          options={seasons.map((season) => ({ value: season.id, label: season.label }))}
          onChange={setSeasonId}
        />
      ) : null}

      {mode === 'stroke' ? (
        <label className="field">
          <span>SVG source</span>
          <textarea
            className="code-area"
            rows={8}
            value={svgSource}
            spellCheck={false}
            onChange={(event) => setSvgSource(event.target.value)}
          />
        </label>
      ) : null}

      {busy ? <p className="hint">Reading the file…</p> : null}
      {error ? (
        <p className="status-bad" role="alert">
          {error}
        </p>
      ) : null}

      <canvas
        ref={canvasRef}
        aria-label="Preview"
        style={{ display: showCanvas ? 'block' : 'none', maxWidth: '100%', height: 'auto', marginTop: '1rem' }}
      />

      {mode === 'colors' && colors ? (
        <>
          <p>
            {colors.total} unique {colors.total === 1 ? 'color' : 'colors'}
            {colors.colors.length < colors.total ? `. Showing ${colors.colors.length}.` : '.'}
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            {colors.colors.map((color) => (
              <div key={color}>
                <span
                  style={{
                    display: 'block',
                    width: '2.4rem',
                    height: '2.4rem',
                    background: color,
                    border: '1px solid var(--line)',
                  }}
                />
                <span className="hint">{color}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {mode === 'ascii' && ascii ? (
        <pre className="ascii-out" aria-label="ASCII frame">
          {ascii}
        </pre>
      ) : null}

      {mode === 'stroke' && filled.includes('<svg') ? (
        <>
          <img
            alt="Filled SVG preview"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(filled)}`}
            style={{ maxWidth: '100%', height: 'auto', background: '#fff' }}
          />
          <label className="field">
            <span>Filled SVG</span>
            <textarea className="code-area" rows={8} readOnly value={filled} spellCheck={false} />
          </label>
        </>
      ) : null}

      {mode === 'trace' && traced.includes('<svg') ? (
        <>
          <img
            alt="Traced SVG preview"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(traced)}`}
            style={{ maxWidth: '100%', height: 'auto', background: '#fff' }}
          />
          <label className="field">
            <span>Traced SVG</span>
            <textarea className="code-area" rows={8} readOnly value={traced} spellCheck={false} />
          </label>
        </>
      ) : null}

      <div className="row" style={{ flexWrap: 'wrap', marginTop: '0.8rem' }}>
        {PNG_MODES.has(mode) ? (
          <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={savePng}>
            Download PNG
          </button>
        ) : null}
        {mode === 'stroke' ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!filled}
              onClick={() => void copy(filled, 'svg')}
            >
              {copied === 'svg' ? 'Copied' : 'Copy SVG'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!filled}
              onClick={() => void downloadNamed(new Blob([filled], { type: 'image/svg+xml' }), outputName('stroke'))}
            >
              Download .svg
            </button>
          </>
        ) : null}
        {mode === 'trace' ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!traced}
              onClick={() => void copy(traced, 'trace')}
            >
              {copied === 'trace' ? 'Copied' : 'Copy SVG'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!traced}
              onClick={() => void downloadNamed(new Blob([traced], { type: 'image/svg+xml' }), outputName('trace'))}
            >
              Download .svg
            </button>
          </>
        ) : null}
        {mode === 'ascii' ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ascii}
              onClick={() => void copy(ascii, 'ascii')}
            >
              {copied === 'ascii' ? 'Copied' : 'Copy text'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!ascii}
              onClick={() => void downloadNamed(new Blob([ascii], { type: 'text/plain' }), outputName('ascii'))}
            >
              Download .txt
            </button>
          </>
        ) : null}
      </div>
    </ToolLayout>
  )
}
