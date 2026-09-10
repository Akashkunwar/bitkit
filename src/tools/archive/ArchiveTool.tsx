import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { Segmented } from '../../components/Segmented'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { formatBytes } from '../../lib/format'
import { zipStore } from '../../lib/zip'
import { unzip, zipIndex } from '../../lib/zipRead'

type Mode = 'pack' | 'open'
type Entry = { name: string; size: number; compressed: number }

function isZip(file: File): boolean {
  return file.type === 'application/zip' || /\.zip$/i.test(file.name)
}

export default function ArchiveTool() {
  const [mode, setMode] = useState<Mode>('pack')
  const [queue, setQueue] = useState<File[]>([])
  const [archive, setArchive] = useState<{ file: File; entries: Entry[] } | null>(null)
  const [extracted, setExtracted] = useState<File[]>([])
  const [zipName, setZipName] = useState('bundle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openArchive = async (file: File) => {
    setBusy(true)
    setError(null)
    setExtracted([])
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      setArchive({ file, entries: zipIndex(bytes).filter((entry) => !entry.name.endsWith('/')) })
    } catch (err) {
      setArchive(null)
      setError(err instanceof Error ? err.message : 'Could not read that archive.')
    } finally {
      setBusy(false)
    }
  }

  const take = (files: File[]) => {
    if (mode === 'open') {
      const zip = files.find(isZip)
      if (!zip) {
        setError('Drop a .zip file to open it.')
        return
      }
      void openArchive(zip)
      return
    }
    setError(null)
    setQueue((prev) => [...prev, ...files])
  }

  useHandoff((payload) => {
    if (payload.files?.length) take(payload.files)
  })

  const pack = async () => {
    if (!queue.length) return
    setBusy(true)
    setError(null)
    try {
      const seen = new Map<string, number>()
      const entries = []
      for (const file of queue) {
        // Two files with the same name would otherwise silently overwrite.
        const count = seen.get(file.name) ?? 0
        seen.set(file.name, count + 1)
        const name = count ? file.name.replace(/(\.[^.]+)?$/, (ext) => `-${count + 1}${ext}`) : file.name
        entries.push({ name, data: new Uint8Array(await file.arrayBuffer()) })
      }
      const bytes = zipStore(entries)
      triggerDownload(
        new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }),
        `${zipName.trim() || 'bundle'}.zip`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build that archive.')
    } finally {
      setBusy(false)
    }
  }

  const extract = async () => {
    if (!archive) return
    setBusy(true)
    setError(null)
    try {
      const bytes = new Uint8Array(await archive.file.arrayBuffer())
      const files = (await unzip(bytes))
        .filter((entry) => !entry.name.endsWith('/'))
        .map(
          (entry) =>
            new File([entry.data.slice().buffer as ArrayBuffer], entry.name.split('/').pop() || entry.name, {
              type: 'application/octet-stream',
            }),
        )
      setExtracted(files)
      for (const file of files) triggerDownload(file, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not extract that archive.')
    } finally {
      setBusy(false)
    }
  }

  const queueSize = queue.reduce((n, file) => n + file.size, 0)
  const archiveSize = archive?.entries.reduce((n, entry) => n + entry.size, 0) ?? 0

  return (
    <ToolLayout
      title="ZIP archive"
      lede="Bundle files into one .zip, or open a .zip and pull files back out. Nothing is uploaded."
    >
      <Segmented
        label="Mode"
        value={mode}
        options={[
          { value: 'pack', label: 'Make a ZIP' },
          { value: 'open', label: 'Open a ZIP' },
        ]}
        onChange={(next) => {
          setMode(next)
          setError(null)
        }}
      />

      <DropZone
        accept={mode === 'open' ? 'application/zip,.zip' : '*/*'}
        multiple={mode === 'pack'}
        label={mode === 'pack' ? 'Drop the files to bundle.' : 'Drop a .zip file.'}
        hint={
          mode === 'pack'
            ? 'Entries are stored, not compressed — already-compressed files (JPEG, PNG, PDF, MP4) would not shrink anyway.'
            : 'Encrypted archives and formats other than .zip are not supported.'
        }
        onFiles={take}
      />

      {error ? <p className="status-bad">{error}</p> : null}

      {mode === 'pack' ? (
        <div className="split">
          <section className="panel">
            {!queue.length ? <p className="muted">No files queued.</p> : null}
            {queue.map((file, index) => (
              <div key={`${file.name}-${index}`} className="result-row">
                <code>
                  {file.name} · {formatBytes(file.size)}
                </code>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setQueue((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
            {queue.length ? (
              <p className="hint">
                {queue.length} file{queue.length === 1 ? '' : 's'} · {formatBytes(queueSize)}
              </p>
            ) : null}
          </section>
          <aside className="panel">
            <label className="field">
              <span>Archive name</span>
              <input value={zipName} onChange={(e) => setZipName(e.target.value)} placeholder="bundle" />
            </label>
            <div className="row">
              <button type="button" className="btn btn-primary" disabled={!queue.length || busy} onClick={() => void pack()}>
                {busy ? 'Packing…' : 'Download .zip'}
              </button>
              <button type="button" className="btn" disabled={!queue.length} onClick={() => setQueue([])}>
                Clear
              </button>
            </div>
            <SendTo from="archive" files={queue} />
          </aside>
        </div>
      ) : (
        <div className="split">
          <section className="panel">
            {!archive ? <p className="muted">No archive open.</p> : null}
            {archive?.entries.map((entry) => (
              <div key={entry.name} className="result-row">
                <code>{entry.name}</code>
                <span className="hint">{formatBytes(entry.size)}</span>
              </div>
            ))}
            {archive ? (
              <p className="hint">
                {archive.entries.length} entr{archive.entries.length === 1 ? 'y' : 'ies'} ·{' '}
                {formatBytes(archiveSize)} unpacked · {formatBytes(archive.file.size)} on disk
              </p>
            ) : null}
          </section>
          <aside className="panel">
            <button type="button" className="btn btn-primary" disabled={!archive || busy} onClick={() => void extract()}>
              {busy ? 'Extracting…' : 'Extract every file'}
            </button>
            <p className="hint">
              Each entry downloads separately, so your browser may ask permission to save several files at once.
            </p>
            <SendTo from="archive" files={extracted} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
