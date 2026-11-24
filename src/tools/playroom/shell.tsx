import { type ReactNode } from 'react'

export type RosterProps = {
  names: string[]
  roster: string
  onRoster: (value: string) => void
}

export function NamesField({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="code-area editor"
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function ModeShell({ controls, result }: { controls: ReactNode; result: ReactNode }) {
  return (
    <div className="split">
      <section className="panel">{controls}</section>
      <aside className="panel">{result}</aside>
    </div>
  )
}
