import { UndoContext, useUndoState, type UndoApi } from '../lib/undo'
import { useI18n } from '../lib/i18n'
import type { ReactNode } from 'react'

export function UndoProvider({ children }: { children: ReactNode }) {
  const api: UndoApi = useUndoState()
  const { t } = useI18n()
  return (
    <UndoContext.Provider value={api}>
      {children}
      {api.pending ? (
        <div className="undo-toast no-print" role="status" aria-live="polite">
          <span>{api.pending.label}</span>
          <button type="button" className="btn btn-primary" onClick={api.undo}>
            {t('undo.undo')}
          </button>
          <button type="button" className="btn-ghost" aria-label={t('undo.dismiss')} onClick={api.dismiss}>
            ✕
          </button>
        </div>
      ) : null}
    </UndoContext.Provider>
  )
}
