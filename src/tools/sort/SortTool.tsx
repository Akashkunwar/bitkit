import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { bubbleFrames, parseNumbers } from '../../lib/sortSteps'

export default function SortTool() {
  const [text, setText] = useState('8 3 5 1 9 2 7 4')
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)

  const parsed = useMemo(() => {
    try {
      return { frames: bubbleFrames(parseNumbers(text)), error: null as string | null }
    } catch (err) {
      return { frames: [], error: err instanceof Error ? err.message : 'Enter numbers.' }
    }
  }, [text])

  useEffect(() => {
    setFrame(0)
    setPlaying(false)
  }, [text])

  useEffect(() => {
    if (!playing || !parsed.frames.length) return
    if (frame >= parsed.frames.length - 1) {
      setPlaying(false)
      return
    }
    const id = window.setInterval(() => setFrame((current) => current + 1), 180)
    return () => window.clearInterval(id)
  }, [playing, parsed.frames.length, frame])

  const current = parsed.frames[Math.min(frame, Math.max(0, parsed.frames.length - 1))]
  const max = current ? Math.max(...current.values.map((n) => Math.abs(n)), 1) : 1

  return (
    <ToolLayout title="Sort steps" lede="Bubble sort, one comparison at a time. The numbers never leave this tab.">
      <label className="field">
        <span>Numbers</span>
        <input className="text-input" value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {parsed.error ? <p className="status-bad">{parsed.error}</p> : null}
      <div className="row" style={{ alignItems: 'flex-end', minHeight: 180, gap: 4 }}>
        {current?.values.map((value, index) => (
          <div key={`${index}-${value}`} style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                height: `${(Math.abs(value) / max) * 140}px`,
                background:
                  index === current.i || index === current.j ? 'var(--accent, #c45b2d)' : 'var(--ink, #1c1915)',
              }}
            />
            <span className="hint">{value}</span>
          </div>
        ))}
      </div>
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!parsed.frames.length}
          onClick={() => setPlaying((on) => !on)}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={!parsed.frames.length || frame >= parsed.frames.length - 1}
          onClick={() => setFrame((n) => n + 1)}
        >
          Step
        </button>
        <span className="hint">{parsed.frames.length ? `${frame + 1} / ${parsed.frames.length}` : ''}</span>
      </div>
    </ToolLayout>
  )
}
