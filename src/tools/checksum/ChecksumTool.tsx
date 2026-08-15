import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { formatBytes } from '../../lib/format'
import { algoForDigest, hashFile, hashesMatch, HASH_ALGOS, type HashAlgo } from '../../lib/checksum'

type Row = { name: string; size: number; digests: Partial<Record<HashAlgo, string>>; error?: string }

export default function ChecksumTool() {
  const [algo, setAlgo] = useState<HashAlgo>('SHA-256')
  const [rows, setRows] = useState<Row[]>([])
  const [expected, setExpected] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const { copied, copy } = useCopied()

  const run = async (files: File[], which: HashAlgo) => {
    setBusy(true)
    try {
      for (const file of files) {
        try {
          const digest = await hashFile(file, which, setProgress)
          setRows((current) => {
            const index = current.findIndex((r) => r.name === file.name && r.size === file.size)
            const next = [...current]
            if (index >= 0) {
              next[index] = { ...next[index], digests: { ...next[index].digests, [which]: digest } }
            } else {
              next.push({ name: file.name, size: file.size, digests: { [which]: digest } })
            }
            return next
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not hash this file.'
          setRows((current) => [...current, { name: file.name, size: file.size, digests: {}, error: message }])
        }
      }
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  const [pending, setPending] = useState<File[]>([])

  const take = (files: File[]) => {
    setPending(files)
    void run(files, algo)
  }

  useHandoff((payload) => {
    if (payload.files?.length) take(payload.files)
  })

  const guessed = algoForDigest(expected)
  const matchRow = expected.trim()
    ? rows.find((r) => Object.values(r.digests).some((d) => d && hashesMatch(d, expected)))
    : null

  return (
    <ToolLayout
      title="Checksum"
      lede="Verify a download or fingerprint a file. Hashing happens in this tab — the file is never uploaded."
    >
      <DropZone
        accept="*/*"
        multiple
        label="Drop one or more files to hash."
        hint="Large files are read in chunks, so the tab stays responsive."
        onFiles={take}
      />

      <div className="row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
        <label className="field" style={{ minWidth: '10rem' }}>
          <span>Algorithm</span>
          <select
            className="text-input"
            value={algo}
            onChange={(e) => {
              const next = e.target.value as HashAlgo
              setAlgo(next)
              if (pending.length) void run(pending, next)
            }}
          >
            {HASH_ALGOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {rows.length ? (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRows([])
              setPending([])
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      {busy ? (
        <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="meter-fill" style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      ) : null}

      <label className="field" style={{ marginTop: '1rem' }}>
        <span>Expected hash — paste one to compare</span>
        <input
          className="text-input"
          spellCheck={false}
          placeholder="e2c1… or sha256:e2c1…"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
        />
      </label>

      {expected.trim() ? (
        matchRow ? (
          <p className="status-ok">Match — {matchRow.name} has that hash.</p>
        ) : (
          <p className="status-bad">
            No match yet{guessed && guessed !== algo ? ` — that looks like a ${guessed} digest, try switching.` : '.'}
          </p>
        )
      ) : null}

      {rows.length ? (
        <div className="result-list" style={{ marginTop: '1rem' }}>
          {rows.map((row) => (
            <div key={`${row.name}-${row.size}`} className="result-row" style={{ display: 'block' }}>
              <p className="field-label">
                {row.name} · {formatBytes(row.size)}
              </p>
              {row.error ? <p className="status-bad">{row.error}</p> : null}
              {Object.entries(row.digests).map(([name, digest]) => (
                <div key={name} className="row" style={{ alignItems: 'flex-start' }}>
                  <span className="pill">{name}</span>
                  <code className="mono-val wrap-code" style={{ flex: 1 }}>
                    {digest}
                  </code>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void copy(digest as string, `${row.name}-${name}`)}
                  >
                    {copied === `${row.name}-${name}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </ToolLayout>
  )
}
