import { useEffect, useRef, useState } from 'react'
import { formatDisplay, refreshHertz, SCREEN_COLOURS, type DisplayInfo } from '../../lib/diagnose'

function readDisplay(): DisplayInfo {
  return {
    screenWidth: window.screen?.width ?? 0,
    screenHeight: window.screen?.height ?? 0,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
  }
}

export function ScreenCheck() {
  const [info, setInfo] = useState<DisplayInfo>(() => readDisplay())
  const [colour, setColour] = useState<number | null>(null)
  const [hz, setHz] = useState<number | null | undefined>(undefined)
  const [measuring, setMeasuring] = useState(false)
  const [fullNote, setFullNote] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const fillRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef(0)
  const opened = useRef(false)

  useEffect(() => {
    const read = () => setInfo(readDisplay())
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])

  useEffect(() => {
    return () => cancelAnimationFrame(measureRef.current)
  }, [])

  useEffect(() => {
    if (colour === null) {
      opened.current = false
      return
    }
    if (!opened.current) {
      opened.current = true
      fillRef.current?.focus()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setColour(null)
        return
      }
      if (event.key === 'ArrowRight') setColour((current) => ((current ?? 0) + 1) % SCREEN_COLOURS.length)
      if (event.key === 'ArrowLeft')
        setColour((current) => ((current ?? 0) - 1 + SCREEN_COLOURS.length) % SCREEN_COLOURS.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [colour])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === fillRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const measure = () => {
    cancelAnimationFrame(measureRef.current)
    setMeasuring(true)
    setHz(undefined)
    const deltas: number[] = []
    let last = 0
    let frames = 0
    const step = (now: number) => {
      if (last) deltas.push(now - last)
      last = now
      frames += 1
      if (frames < 90) measureRef.current = requestAnimationFrame(step)
      else {
        setHz(refreshHertz(deltas))
        setMeasuring(false)
      }
    }
    measureRef.current = requestAnimationFrame(step)
  }

  const goFull = () => {
    const node = fillRef.current
    if (!node) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }
    void node.requestFullscreen().catch(() => {
      setFullNote('This browser blocked fullscreen. The colour still covers this page, not the browser chrome.')
    })
  }

  const shown = formatDisplay(info)
  const swatch = colour === null ? null : SCREEN_COLOURS[colour]

  return (
    <section className="panel" aria-labelledby="diag-screen-title">
      <h2 id="diag-screen-title">Screen</h2>
      <p className="hint">
        A stuck or dead pixel is a dot that stays one colour while the rest of the panel changes. The sizes are what the
        browser reports, in CSS pixels. The refresh figure is an estimate from frame timing while this tab is in front.
      </p>
      <dl className="diag-facts">
        <div>
          <dt>Screen</dt>
          <dd>{shown.screen}</dd>
        </div>
        <div>
          <dt>Window</dt>
          <dd>{shown.window}</dd>
        </div>
        <div>
          <dt>Pixel ratio</dt>
          <dd>{shown.ratio}</dd>
        </div>
        <div>
          <dt>Refresh</dt>
          <dd>
            {measuring
              ? 'Measuring…'
              : hz === undefined
                ? 'Not measured'
                : hz === null
                  ? 'No steady rate'
                  : `About ${hz} Hz`}
          </dd>
        </div>
      </dl>
      <div className="row">
        <button type="button" className="btn" onClick={measure} disabled={measuring}>
          {measuring ? 'Measuring…' : 'Measure refresh'}
        </button>
      </div>
      <div className="diag-swatches">
        {SCREEN_COLOURS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className="diag-swatch"
            style={{ background: item.fill, color: item.ink }}
            onClick={() => {
              setFullNote(null)
              setColour(index)
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {swatch ? (
        <div
          ref={fillRef}
          className="diag-fill"
          role="dialog"
          aria-modal="true"
          aria-label={`${swatch.label} screen`}
          style={{ background: swatch.fill, color: swatch.ink }}
          tabIndex={-1}
          onClick={(event) => {
            const target = event.target as HTMLElement
            if (target.closest('button')) return
            setColour(null)
          }}
        >
          <div>
            <p>{swatch.label}</p>
            <p className="diag-fill-note">
              Look for a dot that does not change. Arrow keys switch colour. Click the colour, or press Escape, to
              close.
            </p>
            <div className="row diag-fill-actions">
              <button type="button" className="btn" onClick={goFull}>
                {fullscreen ? 'Leave fullscreen' : 'Fill the display'}
              </button>
              <button type="button" className="btn" onClick={() => setColour(null)}>
                Close
              </button>
            </div>
            {fullNote ? <p className="diag-fill-note">{fullNote}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
