import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/**
 * A single shared undo slot rather than a deep history stack.
 *
 * Anything destructive registers "here is how to put it back". The user gets a
 * toast and Ctrl+Z for a short window. One slot is deliberate: a deep stack
 * across tools that each own their own state invites restoring something into
 * a screen that has moved on.
 */

export type UndoEntry = {
  /** Shown in the toast, e.g. "Deleted 3 rows". */
  label: string
  undo: () => void | Promise<void>
}

export type UndoApi = {
  /** Registers an undoable action and shows the toast. */
  push: (entry: UndoEntry) => void
  undo: () => void
  dismiss: () => void
  pending: UndoEntry | null
}

export const UNDO_WINDOW_MS = 12_000

export const UndoContext = createContext<UndoApi>({
  push: () => undefined,
  undo: () => undefined,
  dismiss: () => undefined,
  pending: null,
})

export function useUndo(): UndoApi {
  return useContext(UndoContext)
}

/** Drives the provider; the component lives in app/UndoProvider.tsx. */
export function useUndoState(): UndoApi {
  const [pending, setPending] = useState<UndoEntry | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current)
    setPending(null)
  }, [])

  const push = useCallback(
    (entry: UndoEntry) => {
      window.clearTimeout(timer.current)
      setPending(entry)
      timer.current = window.setTimeout(() => setPending(null), UNDO_WINDOW_MS)
    },
    [],
  )

  const undo = useCallback(() => {
    setPending((current) => {
      if (current) void current.undo()
      window.clearTimeout(timer.current)
      return null
    })
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z' || event.shiftKey) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      // Inside a text field the browser's own undo is the right behaviour.
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      setPending((current) => {
        if (!current) return null
        event.preventDefault()
        void current.undo()
        window.clearTimeout(timer.current)
        return null
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { push, undo, dismiss, pending }
}
