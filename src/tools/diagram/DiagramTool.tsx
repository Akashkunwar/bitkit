import { useEffect, useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { useTheme } from '../../app/Theme'
import { svgToPng } from '../../lib/chart'

const SAMPLES: { label: string; code: string }[] = [
  {
    label: 'Flowchart',
    code: `flowchart TD
  A[Drop a file] --> B{What kind?}
  B -->|Image| C[Resize & compress]
  B -->|PDF| D[Shrink or split]
  B -->|Text| E[Format or diff]
  C --> F[Download]
  D --> F
  E --> F`,
  },
  {
    label: 'Sequence',
    code: `sequenceDiagram
  participant U as You
  participant T as This tab
  participant N as Network
  U->>T: Drop a photo
  T->>T: Resize and re-encode
  T-->>U: Download
  Note over T,N: Nothing is ever sent`,
  },
  {
    label: 'Gantt',
    code: `gantt
  title Release plan
  dateFormat YYYY-MM-DD
  section Build
  Tools        :done, a1, 2026-01-05, 30d
  Polish       :active, a2, after a1, 20d
  section Ship
  Beta         :a3, after a2, 10d`,
  },
  {
    label: 'Pie',
    code: `pie title Where the time goes
  "Images" : 42
  "PDFs" : 28
  "Text" : 18
  "Everything else" : 12`,
  },
]

let seq = 0

export default function DiagramTool() {
  const [code, setCode] = useState(SAMPLES[0].code)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const mermaidRef = useRef<typeof import('mermaid').default | null>(null)
  const { theme } = useTheme()
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setCode(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setCode)
  })

  useEffect(() => {
    let live = true
    void (async () => {
      // Mermaid is a large dependency, so it only loads on this route.
      const mod = await import('mermaid')
      if (!live) return
      mermaidRef.current = mod.default
      mod.default.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme === 'dark' ? 'dark' : 'default',
        fontFamily: 'Figtree Variable, Figtree, system-ui, sans-serif',
      })
      setReady(true)
    })()
    return () => {
      live = false
    }
  }, [theme])

  useEffect(() => {
    if (!ready || !mermaidRef.current) return
    let live = true
    const mermaid = mermaidRef.current
    void (async () => {
      try {
        seq += 1
        const { svg: rendered } = await mermaid.render(`kit-diagram-${seq}`, code)
        if (!live) return
        setSvg(rendered)
        setError(null)
      } catch (err) {
        if (!live) return
        setSvg('')
        setError(err instanceof Error ? err.message.split('\n')[0] : 'Could not draw that diagram.')
      }
    })()
    return () => {
      live = false
    }
  }, [code, ready])

  // Mermaid sizes to its container; a fixed width makes the export predictable.
  const exportable = useMemo(() => {
    if (!svg) return ''
    return svg.replace(/<svg([^>]*)style="[^"]*"/, '<svg$1').replace('<svg', '<svg style="background:#ffffff"')
  }, [svg])

  return (
    <ToolLayout
      title="Diagram"
      lede="Write Mermaid, get a diagram. Export SVG or PNG — the renderer runs entirely in this tab."
    >
      <DropZone
        accept=".mmd,.txt,.md,text/plain"
        label="Drop a .mmd or text file, or write below."
        onFiles={(files) => {
          if (files[0]) void files[0].text().then(setCode)
        }}
      />

      <div className="chip-row" style={{ marginTop: '1rem' }}>
        {SAMPLES.map((sample) => (
          <button key={sample.label} type="button" className="chip" onClick={() => setCode(sample.code)}>
            {sample.label}
          </button>
        ))}
      </div>

      <div className="diff-panes">
        <label className="field">
          <span>Mermaid source</span>
          <textarea
            className="code-area editor"
            rows={16}
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <div className="field">
          <span>Preview</span>
          {!ready ? (
            <p className="muted">Loading the renderer…</p>
          ) : (
            <div className="diagram-preview" dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
      </div>

      {error ? <p className="status-bad">{error}</p> : svg ? <p className="status-ok">Rendered.</p> : null}

      <div className="row" style={{ marginTop: '0.8rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!svg}
          onClick={() => triggerDownload(new Blob([exportable], { type: 'image/svg+xml' }), 'diagram.svg')}
        >
          Download SVG
        </button>
        <button
          type="button"
          className="btn"
          disabled={!svg}
          onClick={() => {
            void svgToPng(exportable, 2)
              .then((blob) => triggerDownload(blob, 'diagram.png'))
              .catch((err: unknown) => setError(err instanceof Error ? err.message : 'PNG export failed.'))
          }}
        >
          Download PNG
        </button>
        <button type="button" className="btn" disabled={!svg} onClick={() => void copy(exportable, 'svg')}>
          {copied === 'svg' ? 'Copied' : 'Copy SVG'}
        </button>
      </div>

      <SendTo from="diagram" text={code} />
    </ToolLayout>
  )
}
