import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  addWheel,
  appendTrail,
  EMPTY_WHEEL,
  POINTER_BUTTONS,
  pointerButtonName,
  tallyPress,
  type TrailPoint,
  type WheelTotals,
} from '../../lib/diagnose'

type Point = TrailPoint & { id: number }

export function MouseCheck() {
  const stageRef = useRef<HTMLDivElement>(null)
  const trailId = useRef(0)
  const frame = useRef(0)
  const pending = useRef<TrailPoint | null>(null)
  const touches = useRef(new Set<number>())
  const [held, setHeld] = useState<number[]>([])
  const [seen, setSeen] = useState<number[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [pos, setPos] = useState<TrailPoint | null>(null)
  const [trail, setTrail] = useState<Point[]>([])
  const [wheel, setWheel] = useState<WheelTotals>(EMPTY_WHEEL)
  const [fingers, setFingers] = useState(0)

  const pointFrom = (event: ReactPointerEvent): TrailPoint | null => {
    const stage = stageRef.current
    if (!stage) return null
    const rect = stage.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const remember = (button: number) => {
    setHeld((current) => (current.includes(button) ? current : [...current, button]))
    setSeen((current) => (current.includes(button) ? current : [...current, button]))
    setCounts((current) => tallyPress(current, button))
  }

  const release = (button: number) => {
    setHeld((current) => current.filter((item) => item !== button))
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Some browsers only capture a pointer that came from a real device.
    }
    remember(event.button)
    if (event.pointerType === 'touch') {
      touches.current.add(event.pointerId)
      setFingers(touches.current.size)
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    release(event.button)
    if (touches.current.delete(event.pointerId)) setFingers(touches.current.size)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = pointFrom(event)
    if (!point) return
    pending.current = point
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const next = pending.current
      if (!next) return
      setPos(next)
      trailId.current += 1
      const id = trailId.current
      setTrail((current) => appendTrail(current, { ...next, id }))
    })
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    // React's wheel listener is passive, so it cannot keep the page from scrolling.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setWheel((current) => addWheel(current, event.deltaX, event.deltaY))
    }
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => node.removeEventListener('wheel', onWheel)
  }, [])

  const reset = () => {
    setHeld([])
    setSeen([])
    setCounts({})
    setPos(null)
    setTrail([])
    setWheel(EMPTY_WHEEL)
    setFingers(0)
    touches.current.clear()
  }

  return (
    <section className="panel" aria-labelledby="diag-pointer-title">
      <div className="diag-head">
        <h2 id="diag-pointer-title">Mouse and touch</h2>
        <button type="button" className="btn" onClick={reset}>
          Reset
        </button>
      </div>
      <p className="hint">
        Click, scroll, and drag inside the area. Back and Forward only light up when the browser lets the page see those
        buttons. A finger count appears when the device sends touch.
      </p>
      <div className="diag-choices" aria-label="Buttons">
        {POINTER_BUTTONS.map((button) => (
          <div
            key={button.button}
            className="diag-choice"
            data-held={held.includes(button.button) ? '' : undefined}
            data-seen={seen.includes(button.button) ? '' : undefined}
          >
            <strong>{button.name}</strong>
            <span>{counts[button.button] ?? 0} presses</span>
          </div>
        ))}
        <div className="diag-choice" data-seen={fingers > 0 ? '' : undefined}>
          <strong>{fingers}</strong>
          <span>{fingers === 1 ? 'finger' : 'fingers'}</span>
        </div>
      </div>
      <div
        ref={stageRef}
        className="diag-stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerMove={onPointerMove}
        onContextMenu={(event) => event.preventDefault()}
      >
        {trail.map((point, index) => (
          <span
            key={point.id}
            className="diag-dot"
            style={{ left: point.x, top: point.y, opacity: (index + 1) / trail.length }}
          />
        ))}
        {pos ? <span className="diag-cross" style={{ left: pos.x, top: pos.y }} /> : null}
        <p className="diag-stage-read">
          {pos ? `${Math.round(pos.x)}, ${Math.round(pos.y)}` : 'Move the pointer here'}
        </p>
      </div>
      <p className="diag-readout">
        Scroll events — up {wheel.up}, down {wheel.down}, left {wheel.left}, right {wheel.right}
        {seen.some((button) => button > 4)
          ? ` · also ${seen
              .filter((button) => button > 4)
              .map((button) => pointerButtonName(button))
              .join(', ')}`
          : ''}
      </p>
    </section>
  )
}
