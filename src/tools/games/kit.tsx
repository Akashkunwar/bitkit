import { useEffect, type ReactNode, type RefObject } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { isTypingTarget } from './loop'

export function Arcade({
  title,
  lede,
  status,
  onRestart,
  children,
}: {
  title: string
  lede: string
  status: string
  onRestart: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key !== ' ' || isTypingTarget(event.target)) return
      event.preventDefault()
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [])
  return (
    <ToolLayout title={title} lede={lede}>
      <div className="arcade">
        <div className="arcade-top">
          <strong>{status}</strong>
          <button type="button" className="btn" onClick={onRestart}>
            Restart
          </button>
        </div>
        {children}
      </div>
    </ToolLayout>
  )
}

export function HoldKeys({
  labels,
  held,
}: {
  labels: readonly (readonly [string, string])[]
  held: RefObject<Set<string>>
}) {
  return (
    <div className="arcade-keys">
      {labels.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className="btn"
          onPointerDown={(event) => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            const keys = held.current
            if (!keys) return
            keys.delete(key)
            keys.add(key)
          }}
          onPointerUp={(event) => {
            held.current?.delete(key)
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
          onPointerCancel={() => held.current?.delete(key)}
          onLostPointerCapture={() => held.current?.delete(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
