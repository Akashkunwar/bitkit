type Props = {
  value: string
  onChange: (value: string) => void
  onUnlock: () => void
  busy?: boolean
  error?: string | null
}

export function PdfPassword({ value, onChange, onUnlock, busy, error }: Props) {
  return (
    <div style={{ marginTop: '0.8rem' }}>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          className="text-input"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value && !busy) onUnlock()
          }}
        />
      </label>
      <button type="button" className="btn btn-primary" disabled={!value || busy} onClick={onUnlock}>
        {busy ? 'Opening…' : 'Unlock'}
      </button>
      {error ? <p className="status-bad">{error}</p> : null}
      <p className="hint">Used only in this tab to open the file. It is not stored or sent anywhere.</p>
    </div>
  )
}
