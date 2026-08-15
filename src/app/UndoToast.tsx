import { UndoContext, useUndoState, type UndoApi } from '../lib/undo'
import type { ReactNode } from 'react'

export function UndoProvider({ children }: { children: ReactNode }) {
  const api: UndoApi = useUndoState()
  return (
    <UndoContext.Provider value={api}>
      {children}
      {api.pending ? (
        <div className="undo-toast no-print" role="status" aria-live="polite">
          <span>{api.pending.label}</span>
          <button type="button" className="btn btn-primary" onClick={api.undo}>
            Undo
          </button>
          <button type="button" className="btn-ghost" aria-label="Dismiss" onClick={api.dismiss}>
            ✕
          </button>
        </div>
      ) : null}
    </UndoContext.Provider>
  )
}
