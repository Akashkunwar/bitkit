import { useState } from 'react'
import { plainSettings, useNamedPresets, type PresetValue } from '../lib/namedPresets'

type Props = {
  toolId: string
  snapshot: Record<string, unknown>
  onApply: (value: PresetValue) => void
}

/** Named option sets for a tool. File contents are never stored. */
export function PresetBar({ toolId, snapshot, onApply }: Props) {
  const { presets, save, remove } = useNamedPresets(toolId)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const store = async () => {
    try {
      await save(name, plainSettings(snapshot))
      setName('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that preset.')
    }
  }

  return (
    <div className="preset-bar">
      <div className="row">
        <label className="field" style={{ flex: 1, marginBottom: 0 }}>
          <span className="hint">Save these options</span>
          <input
            className="text-input"
            value={name}
            placeholder="Portal JPEG, 450 KB"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void store()
            }}
          />
        </label>
        <button type="button" className="btn" onClick={() => void store()}>
          Save preset
        </button>
      </div>
      {presets.length ? (
        <div className="pill-row" style={{ marginTop: '0.6rem' }}>
          {presets.map((preset) => (
            <span key={preset.id} className="preset-chip">
              <button type="button" className="btn-ghost" onClick={() => onApply(preset.value)}>
                {preset.name}
              </button>
              <button
                type="button"
                className="btn-ghost"
                aria-label={`Delete preset ${preset.name}`}
                onClick={() => void remove(preset.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="hint">Presets stay in this browser. A portal size you use every week belongs here.</p>
      )}
      {error ? <p className="status-bad">{error}</p> : null}
    </div>
  )
}
