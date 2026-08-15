import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { triggerDownload } from '../../lib/download'
import { formatBytes } from '../../lib/format'
import { tools } from '../../registry'
import {
  backupBlob,
  backupFilename,
  createBackup,
  isPersisted,
  parseBackup,
  requestPersistence,
  restoreBackup,
  storageEstimate,
  summarise,
  wipeEverything,
  type Backup,
  type RestoreMode,
} from '../../lib/backup'
import { clearUsage, readUsage, sortByUsage, usageScore, type Usage } from '../../lib/prefs'

export default function SettingsTool() {
  const [usage, setUsage] = useState<Usage>({})
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null)
  const [persisted, setPersisted] = useState(false)
  const [incoming, setIncoming] = useState<Backup | null>(null)
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  const refresh = () => {
    void readUsage().then(setUsage)
    void storageEstimate().then(setEstimate)
    void isPersisted().then(setPersisted)
  }

  useEffect(refresh, [])

  const ranked = sortByUsage(tools, usage).filter((tool) => usage[tool.id]?.count)

  const exportNow = async () => {
    try {
      const backup = await createBackup()
      triggerDownload(backupBlob(backup), backupFilename())
      setStatus(`Exported ${backup.notes.length} notes and ${backup.prefs.length} settings.`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the backup.')
    }
  }

  const stage = async (file: File) => {
    try {
      setIncoming(parseBackup(await file.text()))
      setError(null)
      setStatus(null)
    } catch (err) {
      setIncoming(null)
      setError(err instanceof Error ? err.message : 'Could not read that file.')
    }
  }

  const restore = async () => {
    if (!incoming) return
    try {
      const result = await restoreBackup(incoming, mode)
      setStatus(
        mode === 'replace'
          ? `Replaced everything with ${result.notesAdded} notes and ${result.prefsWritten} settings.`
          : `Added ${result.notesAdded} notes, updated ${result.notesUpdated}, wrote ${result.prefsWritten} settings.`,
      )
      setIncoming(null)
      setError(null)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed.')
    }
  }

  const summary = incoming ? summarise(incoming) : null

  return (
    <ToolLayout
      title="Data & settings"
      lede="Everything BitKit stores lives in this browser. Export it, bring it to another device, or clear it."
    >
      <div className="panel">
        <p className="field-label">Storage</p>
        <div className="pill-row">
          {estimate ? (
            <>
              <span className="pill">
                Using <strong>{formatBytes(estimate.usage)}</strong>
              </span>
              {estimate.quota ? <span className="pill">of about {formatBytes(estimate.quota)} available</span> : null}
            </>
          ) : (
            <span className="pill">This browser will not report storage use</span>
          )}
          <span className="pill">{persisted ? 'Protected from eviction' : 'Can be evicted'}</span>
        </div>
        {!persisted ? (
          <>
            <p className="hint">
              Browsers clear IndexedDB when disk runs low, and “clear site data” wipes it with no warning. Asking
              for persistent storage makes that much less likely.
            </p>
            <div className="row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  void requestPersistence().then((granted) => {
                    setPersisted(granted)
                    setStatus(
                      granted
                        ? 'This site now has persistent storage.'
                        : 'The browser declined. Installing BitKit usually grants it automatically.',
                    )
                  })
                }}
              >
                Request persistent storage
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <p className="field-label">Back up</p>
        <p className="hint">
          One JSON file with your notes, pinned tools, per-tool settings, and saved pipelines. Keep it somewhere
          you would keep a document.
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => void exportNow()}>
            Export everything
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <p className="field-label">Restore</p>
        <DropZone
          accept="application/json,.json"
          label="Drop a BitKit backup file."
          hint="Nothing is written until you confirm below."
          onFiles={(files) => {
            if (files[0]) void stage(files[0])
          }}
        />

        {summary ? (
          <>
            <div className="pill-row">
              <span className="pill">{summary.notes} notes</span>
              <span className="pill">{summary.prefs} settings</span>
              <span className="pill">
                Exported {summary.exportedAt ? new Date(summary.exportedAt).toLocaleString() : 'unknown'}
              </span>
            </div>
            <div className="field">
              <span>How to apply it</span>
              <div className="row" role="radiogroup" aria-label="Restore mode">
                <button
                  type="button"
                  className={mode === 'merge' ? 'btn btn-primary' : 'btn'}
                  aria-pressed={mode === 'merge'}
                  onClick={() => setMode('merge')}
                >
                  Merge — keep newer notes
                </button>
                <button
                  type="button"
                  className={mode === 'replace' ? 'btn btn-primary' : 'btn'}
                  aria-pressed={mode === 'replace'}
                  onClick={() => setMode('replace')}
                >
                  Replace everything
                </button>
              </div>
            </div>
            {mode === 'replace' ? (
              <p className="status-bad">
                Replace deletes every note and setting on this device first. Export the current state before you
                do this if you are unsure.
              </p>
            ) : null}
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => void restore()}>
                {mode === 'replace' ? 'Replace everything' : 'Merge into this device'}
              </button>
              <button type="button" className="btn" onClick={() => setIncoming(null)}>
                Cancel
              </button>
            </div>
          </>
        ) : null}
      </div>

      {ranked.length ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="field-label">Most used</p>
          <p className="hint">
            Counted on this device only, and weighted so recent use matters more. Home sorts by this.
          </p>
          <div className="result-list">
            {ranked.slice(0, 8).map((tool) => (
              <div key={tool.id} className="result-row">
                <span style={{ flex: 1 }}>{tool.title}</span>
                <span className="pill">{usage[tool.id].count}×</span>
                <span className="hint">{Math.round(usageScore(usage[tool.id]))} score</span>
              </div>
            ))}
          </div>
          <div className="row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                void clearUsage().then(() => {
                  setUsage({})
                  setStatus('Usage history cleared.')
                })
              }}
            >
              Clear usage history
            </button>
          </div>
        </div>
      ) : null}

      <div className="panel" style={{ marginTop: '1rem', borderColor: 'var(--danger)' }}>
        <p className="field-label">Clear everything</p>
        <p className="hint">Deletes all notes, settings, pins, and pipelines from this browser. Not reversible.</p>
        <div className="row">
          {confirmWipe ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  void wipeEverything().then(() => {
                    setConfirmWipe(false)
                    setStatus('Everything cleared.')
                    refresh()
                  })
                }}
              >
                Yes, delete it all
              </button>
              <button type="button" className="btn" onClick={() => setConfirmWipe(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirmWipe(true)}>
              Clear all local data
            </button>
          )}
        </div>
      </div>

      {status ? <p className="status-ok">{status}</p> : null}
      {error ? <p className="status-bad">{error}</p> : null}
    </ToolLayout>
  )
}
