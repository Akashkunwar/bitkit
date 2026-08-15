import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { triggerDownload } from '../../lib/download'
import { annotationId, exportPdf, type Annotation, type PageState, type Point } from '../../lib/pdfEdit'
import { useHandoff } from '../../lib/useHandoff'
import { SendTo } from '../../components/SendTo'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type ToolMode = 'select' | 'pen' | 'text' | 'whiteout' | 'highlight' | 'sign'

type Viewport = { width: number; height: number; scale: number }

let pageSeq = 0
const pageId = () => `p${Date.now().toString(36)}${(pageSeq += 1)}`

function PageCanvas({
  doc,
  sourceIndex,
  extraRotation,
  targetWidth,
  onViewport,
}: {
  doc: PDFDocumentProxy
  sourceIndex: number
  extraRotation: number
  targetWidth: number
  onViewport?: (vp: Viewport) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null = null
    void (async () => {
      const page = await doc.getPage(sourceIndex + 1)
      if (cancelled) return
      const rotation = (page.rotate + extraRotation) % 360
      const base = page.getViewport({ scale: 1, rotation })
      const scale = targetWidth / base.width
      const vp = page.getViewport({ scale, rotation })
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(vp.width * dpr)
      canvas.height = Math.floor(vp.height * dpr)
      canvas.style.width = `${vp.width}px`
      canvas.style.height = `${vp.height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      task = page.render({ canvas, canvasContext: ctx, viewport: vp, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] })
      try {
        await task.promise
        onViewport?.({ width: vp.width, height: vp.height, scale })
      } catch {
        /* render cancelled */
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, sourceIndex, extraRotation, targetWidth, onViewport])

  return <canvas ref={canvasRef} />
}

function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [dirty, setDirty] = useState(false)

  const pos = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="signature-pad"
        width={360}
        height={140}
        onPointerDown={(event) => {
          drawing.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          const ctx = event.currentTarget.getContext('2d')
          if (!ctx) return
          const p = pos(event)
          ctx.strokeStyle = '#10201f'
          ctx.lineWidth = 2.2
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return
          const ctx = event.currentTarget.getContext('2d')
          if (!ctx) return
          const p = pos(event)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
          setDirty(true)
        }}
        onPointerUp={() => {
          drawing.current = false
        }}
      />
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <button
          type="button"
          className="btn"
          disabled={!dirty}
          onClick={() => {
            const canvas = canvasRef.current
            if (canvas) onSave(canvas.toDataURL('image/png'))
          }}
        >
          Use signature
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            const canvas = canvasRef.current
            canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
            setDirty(false)
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default function PdfTool() {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const sourceBytes = useRef<Uint8Array | null>(null)
  const [fileName, setFileName] = useState('document.pdf')
  const [pages, setPages] = useState<PageState[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<ToolMode>('select')
  const [penColor, setPenColor] = useState('#c03434')
  const [penWidth, setPenWidth] = useState(2)
  const [textSize, setTextSize] = useState(14)
  const [textColor, setTextColor] = useState('#10201f')
  const [highlightColor, setHighlightColor] = useState('#ffe066')
  const [signature, setSignature] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport | null>(null)
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [pendingText, setPendingText] = useState<{ x: number; y: number; value: string } | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dragStart = useRef<Point | null>(null)

  const selected = pages.find((p) => p.id === selectedId) ?? null
  const selectedIndex = selected ? pages.indexOf(selected) : -1

  const loadFile = useCallback(async (files: File[]) => {
    const file = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (!file) {
      setError('That was not a PDF file.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      sourceBytes.current = buf.slice()
      const loaded = await pdfjs.getDocument({ data: buf }).promise
      const next: PageState[] = Array.from({ length: loaded.numPages }, (_, i) => ({
        id: pageId(),
        sourceIndex: i,
        rotation: 0,
        annotations: [],
      }))
      setDoc(loaded)
      setPages(next)
      setSelectedId(next[0]?.id ?? null)
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that PDF.')
    } finally {
      setBusy(false)
    }
  }, [])

  useHandoff((payload) => {
    if (payload.files?.length) void loadFile(payload.files)
  })

  const patchPage = (id: string, partial: Partial<PageState> | ((page: PageState) => Partial<PageState>)) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...(typeof partial === 'function' ? partial(p) : partial) } : p)),
    )
  }

  const addAnnotation = (ann: Annotation) => {
    if (!selected) return
    patchPage(selected.id, (p) => ({ annotations: [...p.annotations, ann] }))
  }

  const movePage = (delta: number) => {
    if (selectedIndex < 0) return
    const target = selectedIndex + delta
    if (target < 0 || target >= pages.length) return
    const next = [...pages]
    const [page] = next.splice(selectedIndex, 1)
    next.splice(target, 0, page)
    setPages(next)
  }

  const toPoints = (event: { clientX: number; clientY: number; currentTarget: EventTarget }): Point | null => {
    if (!viewport) return null
    const rect = (event.currentTarget as Element).getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) / viewport.scale,
      y: (event.clientY - rect.top) / viewport.scale,
    }
  }

  const onOverlayDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const p = toPoints(event)
    if (!p || !selected) return
    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'pen') {
      setDraft({ id: annotationId(), kind: 'pen', points: [p], color: penColor, width: penWidth })
    } else if (tool === 'whiteout' || tool === 'highlight') {
      dragStart.current = p
      setDraft({
        id: annotationId(),
        kind: tool,
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        color: tool === 'whiteout' ? '#ffffff' : highlightColor,
        opacity: tool === 'whiteout' ? 1 : 0.45,
      })
    } else if (tool === 'sign' && signature) {
      const img = new Image()
      img.onload = () => {
        const w = 140
        const h = (img.height / img.width) * w
        addAnnotation({ id: annotationId(), kind: 'image', x: p.x, y: p.y, w, h, dataUrl: signature })
      }
      img.src = signature
    }
  }

  const onOverlayMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draft) return
    const p = toPoints(event)
    if (!p) return
    if (draft.kind === 'pen') {
      setDraft({ ...draft, points: [...draft.points, p] })
    } else if ((draft.kind === 'whiteout' || draft.kind === 'highlight') && dragStart.current) {
      const start = dragStart.current
      setDraft({
        ...draft,
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y),
      })
    }
  }

  const onOverlayUp = () => {
    if (!draft) return
    const keep =
      draft.kind === 'pen' ? draft.points.length > 1 : draft.kind === 'whiteout' || draft.kind === 'highlight' ? draft.w > 2 && draft.h > 2 : true
    if (keep) addAnnotation(draft)
    setDraft(null)
    dragStart.current = null
  }

  const commitText = () => {
    if (pendingText && pendingText.value.trim()) {
      addAnnotation({
        id: annotationId(),
        kind: 'text',
        x: pendingText.x,
        y: pendingText.y,
        text: pendingText.value,
        size: textSize,
        color: textColor,
      })
    }
    setPendingText(null)
  }

  const removeSelectedAnnotation = useCallback(() => {
    if (!selected || !selectedAnnotation) return
    patchPage(selected.id, (p) => ({ annotations: p.annotations.filter((a) => a.id !== selectedAnnotation) }))
    setSelectedAnnotation(null)
  }, [selected, selectedAnnotation])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (event.key === 'Delete' || event.key === 'Backspace') removeSelectedAnnotation()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [removeSelectedAnnotation])

  const download = async () => {
    if (!sourceBytes.current || !pages.length) return
    setBusy(true)
    setError(null)
    try {
      const bytes = await exportPdf(sourceBytes.current, pages)
      const name = fileName.replace(/\.pdf$/i, '') + '-edited.pdf'
      triggerDownload(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' }), name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.')
    } finally {
      setBusy(false)
    }
  }

  const renderAnnotation = (ann: Annotation, scale: number, isDraft = false) => {
    const common = {
      key: ann.id,
      onClick: isDraft
        ? undefined
        : (event: React.MouseEvent) => {
            if (tool !== 'select') return
            event.stopPropagation()
            setSelectedAnnotation(ann.id)
          },
      style: tool === 'select' && !isDraft ? { cursor: 'pointer' } : undefined,
      'data-selected': selectedAnnotation === ann.id || undefined,
    }
    if (ann.kind === 'pen') {
      const d = ann.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x * scale).toFixed(1)} ${(p.y * scale).toFixed(1)}`).join(' ')
      return <path {...common} d={d} fill="none" stroke={ann.color} strokeWidth={ann.width * scale} strokeLinecap="round" strokeLinejoin="round" className="ann" />
    }
    if (ann.kind === 'whiteout' || ann.kind === 'highlight') {
      return (
        <rect
          {...common}
          x={ann.x * scale}
          y={ann.y * scale}
          width={ann.w * scale}
          height={ann.h * scale}
          fill={ann.color}
          fillOpacity={ann.opacity}
          stroke={ann.kind === 'whiteout' ? 'rgba(0,0,0,0.15)' : 'none'}
          className="ann"
        />
      )
    }
    if (ann.kind === 'text') {
      return (
        <text {...common} x={ann.x * scale} y={(ann.y + ann.size) * scale} fontSize={ann.size * scale} fill={ann.color} fontFamily="Helvetica, Arial, sans-serif" className="ann">
          {ann.text.split('\n').map((line, i) => (
            <tspan key={i} x={ann.x * scale} dy={i === 0 ? 0 : ann.size * 1.25 * scale}>
              {line}
            </tspan>
          ))}
        </text>
      )
    }
    return <image {...common} href={ann.dataUrl} x={ann.x * scale} y={ann.y * scale} width={ann.w * scale} height={ann.h * scale} className="ann" />
  }

  if (!doc) {
    return (
      <ToolLayout
        title="PDF editor"
        lede="Annotate, sign, white-out, and reorder PDF pages — the file is parsed and rebuilt entirely in this tab."
      >
        <section className="panel">
          <DropZone
            accept="application/pdf,.pdf"
            label="Drop a PDF or click to choose."
            hint="Nothing is uploaded. Large documents may take a moment to render."
            onFiles={(files) => void loadFile(files)}
          />
          {busy ? <p className="muted">Opening…</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
          <SendTo from="pdf" />
        </section>
      </ToolLayout>
    )
  }

  return (
    <ToolLayout
      title="PDF editor"
      lede={`${fileName} — ${pages.length} page${pages.length === 1 ? '' : 's'}. All edits stay in this tab.`}
      actions={
        <>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void download()}>
            {busy ? 'Working…' : 'Download edited PDF'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setDoc(null)
              setPages([])
              sourceBytes.current = null
            }}
          >
            Close file
          </button>
        </>
      }
    >
      {error ? <p className="status-bad">{error}</p> : null}
      {sourceBytes.current ? (
        <SendTo
          from="pdf"
          files={[new File([sourceBytes.current.slice().buffer as ArrayBuffer], fileName, { type: 'application/pdf' })]}
        />
      ) : null}
      <div className="pdf-workspace">
        <aside className="panel pdf-pages">
          <span className="field-label">Pages</span>
          <div className="pdf-thumb-list">
            {pages.map((page, index) => (
              <button
                key={page.id}
                type="button"
                className="pdf-thumb"
                data-active={page.id === selectedId}
                onClick={() => {
                  setSelectedId(page.id)
                  setSelectedAnnotation(null)
                }}
              >
                <PageCanvas doc={doc} sourceIndex={page.sourceIndex} extraRotation={page.rotation} targetWidth={92} />
                <span className="tool-index">
                  {index + 1}
                  {page.annotations.length ? ` · ${page.annotations.length} ann.` : ''}
                </span>
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn" disabled={selectedIndex <= 0} onClick={() => movePage(-1)} title="Move page up">
              ↑
            </button>
            <button type="button" className="btn" disabled={selectedIndex < 0 || selectedIndex >= pages.length - 1} onClick={() => movePage(1)} title="Move page down">
              ↓
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selected}
              title="Rotate 90°"
              onClick={() => selected && patchPage(selected.id, (p) => ({ rotation: (((p.rotation + 90) % 360) as PageState['rotation']), annotations: [] }))}
            >
              ⟳
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selected}
              title="Duplicate page"
              onClick={() => {
                if (!selected) return
                const copy: PageState = { ...selected, id: pageId(), annotations: selected.annotations.map((a) => ({ ...a, id: annotationId() })) }
                const next = [...pages]
                next.splice(selectedIndex + 1, 0, copy)
                setPages(next)
              }}
            >
              ⧉
            </button>
            <button
              type="button"
              className="btn"
              disabled={pages.length <= 1 || !selected}
              title="Delete page"
              onClick={() => {
                const next = pages.filter((p) => p.id !== selected?.id)
                setPages(next)
                setSelectedId(next[Math.max(0, selectedIndex - 1)]?.id ?? null)
              }}
            >
              🗑
            </button>
          </div>
          <p className="hint">Rotating a page clears its annotations.</p>
        </aside>

        <section className="panel pdf-stage-wrap">
          {selected ? (
            <div className="pdf-stage">
              <PageCanvas
                doc={doc}
                sourceIndex={selected.sourceIndex}
                extraRotation={selected.rotation}
                targetWidth={660}
                onViewport={setViewport}
              />
              {viewport ? (
                <svg
                  className="pdf-overlay"
                  width={viewport.width}
                  height={viewport.height}
                  data-tool={tool}
                  onPointerDown={onOverlayDown}
                  onPointerMove={onOverlayMove}
                  onPointerUp={onOverlayUp}
                  onClick={(event) => {
                    if (tool === 'select') setSelectedAnnotation(null)
                    if (tool === 'text') {
                      // Placed on click (not pointerdown) so the browser's
                      // mousedown focus handling cannot immediately blur the input.
                      const p = toPoints(event)
                      if (p) setPendingText({ x: p.x, y: p.y, value: '' })
                    }
                  }}
                >
                  {selected.annotations.map((ann) => renderAnnotation(ann, viewport.scale))}
                  {draft ? renderAnnotation(draft, viewport.scale, true) : null}
                </svg>
              ) : null}
              {pendingText && viewport ? (
                <input
                  autoFocus
                  className="pdf-text-input"
                  style={{
                    left: pendingText.x * viewport.scale,
                    top: pendingText.y * viewport.scale,
                    fontSize: textSize * viewport.scale,
                    color: textColor,
                  }}
                  value={pendingText.value}
                  placeholder="Type, then Enter"
                  onChange={(e) => setPendingText({ ...pendingText, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitText()
                    if (e.key === 'Escape') setPendingText(null)
                  }}
                  onBlur={commitText}
                />
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="panel pdf-toolbox">
          <Segmented
            label="Tool"
            value={tool}
            options={[
              { value: 'select', label: 'Select' },
              { value: 'pen', label: 'Pen' },
              { value: 'text', label: 'Text' },
              { value: 'whiteout', label: 'Whiteout' },
              { value: 'highlight', label: 'Highlight' },
              { value: 'sign', label: 'Sign' },
            ]}
            onChange={(value) => {
              setTool(value)
              setSelectedAnnotation(null)
            }}
          />
          {tool === 'pen' ? (
            <>
              <label className="field">
                <span>Pen color</span>
                <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} />
              </label>
              <label className="field">
                <span>Width — {penWidth}pt</span>
                <input type="range" min={1} max={10} value={penWidth} onChange={(e) => setPenWidth(Number(e.target.value))} />
              </label>
            </>
          ) : null}
          {tool === 'text' ? (
            <>
              <label className="field">
                <span>Text color</span>
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              </label>
              <label className="field">
                <span>Size — {textSize}pt</span>
                <input type="range" min={8} max={48} value={textSize} onChange={(e) => setTextSize(Number(e.target.value))} />
              </label>
              <p className="hint">Click the page to place a text box. Combine with whiteout to replace existing text.</p>
            </>
          ) : null}
          {tool === 'highlight' ? (
            <label className="field">
              <span>Highlight color</span>
              <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} />
            </label>
          ) : null}
          {tool === 'whiteout' ? <p className="hint">Drag over content to cover it with an opaque white block.</p> : null}
          {tool === 'sign' ? (
            <>
              <span className="field-label">Draw your signature</span>
              <SignaturePad onSave={setSignature} />
              {signature ? (
                <p className="hint">
                  Signature saved ✓ — click anywhere on the page to place it.
                </p>
              ) : (
                <p className="hint">Draw above, press “Use signature”, then click the page.</p>
              )}
            </>
          ) : null}
          {tool === 'select' ? (
            <p className="hint">Click an annotation to select it, then press Delete or the button below.</p>
          ) : null}
          <div className="row" style={{ marginTop: '0.75rem' }}>
            <button type="button" className="btn" disabled={!selectedAnnotation} onClick={removeSelectedAnnotation}>
              Delete selected
            </button>
            <button
              type="button"
              className="btn"
              disabled={!selected || !selected.annotations.length}
              onClick={() => selected && patchPage(selected.id, (p) => ({ annotations: p.annotations.slice(0, -1) }))}
            >
              Undo last
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={!selected || !selected.annotations.length}
              onClick={() => selected && patchPage(selected.id, { annotations: [] })}
            >
              Clear page
            </button>
          </div>
        </aside>
      </div>
    </ToolLayout>
  )
}
