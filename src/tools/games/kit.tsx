import { type ReactNode, type RefObject } from 'react'
import { ToolLayout } from '../../components/ToolLayout'

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
            held.current?.add(key)
          }}
          onPointerUp={() => held.current?.delete(key)}
          onPointerCancel={() => held.current?.delete(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
