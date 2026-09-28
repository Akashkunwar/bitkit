import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

type Props<T> = {
  items: T[]
  getKey: (item: T) => string
  getLabel: (item: T) => string
  onMove: (from: number, to: number) => void
  /** The card's picture area; it is also the drag handle. */
  renderMedia: (item: T, index: number) => ReactNode
  /** Buttons for the card footer (rotate, remove, …). */
  renderActions?: (item: T, index: number) => ReactNode
  /** Extra attributes for a card, e.g. selection state. */
  cardProps?: (item: T, index: number) => Record<string, string | boolean | undefined>
  ariaLabel: string
}

const DRAG_THRESHOLD = 6

/**
 * A reorderable grid of cards.
 *
 * Three ways to reorder, because each serves someone the others do not:
 * - drag a card's picture onto another card (pointer events, so it works with
 *   touch as well as a mouse — native HTML drag and drop does not);
 * - pick a position from the card's number menu ("move page 2 to 4");
 * - focus a card and press Alt/Ctrl + arrow keys, announced to screen readers.
 */
export function SortableGrid<T>({
  items,
  getKey,
  getLabel,
  onMove,
  renderMedia,
  renderActions,
  cardProps,
  ariaLabel,
}: Props<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const start = useRef<{ x: number; y: number; index: number; pointer: number } | null>(null)
  const cardRefs = useRef<(HTMLLIElement | null)[]>([])

  const announce = (label: string, to: number) =>
    setAnnouncement(`Moved ${label} to position ${to + 1} of ${items.length}.`)

  const move = (from: number, to: number, focus = false) => {
    if (to < 0 || to >= items.length || from === to) return
    const label = getLabel(items[from])
    onMove(from, to)
    announce(label, to)
    if (focus) window.requestAnimationFrame(() => cardRefs.current[to]?.focus())
  }

  const indexAt = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-sort-index]')
    return el ? Number(el.dataset.sortIndex) : null
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>, index: number) => {
    if (event.button !== 0) return
    start.current = { x: event.clientX, y: event.clientY, index, pointer: event.pointerId }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const origin = start.current
    if (!origin || origin.pointer !== event.pointerId) return
    if (dragIndex === null) {
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < DRAG_THRESHOLD) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragIndex(origin.index)
    }
    setOverIndex(indexAt(event.clientX, event.clientY))
    // Nudge the page when dragging near the top or bottom edge.
    const edge = 72
    if (event.clientY < edge) window.scrollBy(0, -12)
    else if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 12)
  }

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const origin = start.current
    start.current = null
    if (dragIndex !== null && origin) {
      const target = indexAt(event.clientX, event.clientY) ?? overIndex
      if (target !== null) move(origin.index, target)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.target !== event.currentTarget) return
    if (!(event.altKey || event.ctrlKey || event.metaKey)) return
    const delta = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key]
    if (event.key === 'Home') {
      event.preventDefault()
      move(index, 0, true)
    } else if (event.key === 'End') {
      event.preventDefault()
      move(index, items.length - 1, true)
    } else if (delta) {
      event.preventDefault()
      move(index, index + delta, true)
    }
  }

  return (
    <>
      <ul className="thumb-grid" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const label = getLabel(item)
          return (
            <li
              key={getKey(item)}
              ref={(el) => {
                cardRefs.current[index] = el
              }}
              className="thumb-card"
              data-sort-index={index}
              data-dragging={dragIndex === index}
              data-over={overIndex === index && dragIndex !== null && dragIndex !== index}
              tabIndex={0}
              aria-label={`${label}, position ${index + 1} of ${items.length}. Alt plus arrow keys to move.`}
              onKeyDown={(event) => onKeyDown(event, index)}
              {...cardProps?.(item, index)}
            >
              <div
                className="thumb-media"
                onPointerDown={(event) => onPointerDown(event, index)}
                onPointerMove={onPointerMove}
                onPointerUp={finish}
                onPointerCancel={() => {
                  start.current = null
                  setDragIndex(null)
                  setOverIndex(null)
                }}
              >
                {renderMedia(item, index)}
              </div>
              <label className="thumb-index" title="Move to position">
                <span className="visually-hidden">Position of {label}</span>
                <select
                  value={index}
                  onChange={(event) => move(index, Number(event.target.value))}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {items.map((_, n) => (
                    <option key={n} value={n}>
                      {n + 1}
                    </option>
                  ))}
                </select>
              </label>
              <div className="thumb-foot">
                <span className="thumb-name" title={label}>
                  {label}
                </span>
                {renderActions?.(item, index)}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  )
}
