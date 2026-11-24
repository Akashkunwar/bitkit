import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { SendTo } from '../../components/SendTo'
import { Segmented } from '../../components/Segmented'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useI18n } from '../../lib/i18n'
import { formatBytes } from '../../lib/format'
import { zipDeflate, zipStore } from '../../lib/zip'
import { unzip, zipIndex } from '../../lib/zipRead'
import { gunzip, isGzip, tarExtract, tarGzip } from '../../lib/tar'

type Mode = 'pack' | 'open'
type Pack = 'store' | 'deflate' | 'tar'
type Entry = { name: string; size: number; compressed: number }

function isArchive(file: File): boolean {
  return /\.(zip|tar\.gz|tgz)$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/gzip'
}

export default function ArchiveTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [mode, setMode] = useState<Mode>('pack')
  const [packAs, setPackAs] = useState<Pack>('deflate')
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
      if (isGzip(bytes)) {
        const entries = tarExtract(await gunzip(bytes)).map((entry) => ({
          name: entry.name,
          size: entry.size,
          compressed: entry.size,
        }))
        setArchive({ file, entries })
      } else {
        setArchive({ file, entries: zipIndex(bytes).filter((entry) => !entry.name.endsWith('/')) })
      }
    } catch (err) {
      setArchive(null)
      setError(err instanceof Error ? err.message : L('Could not read that archive.', 'यह आर्काइव नहीं पढ़ा जा सका।'))
    } finally {
      setBusy(false)
    }
  }

  const take = (files: File[]) => {
    if (mode === 'open') {
      const archiveFile = files.find(isArchive)
      if (!archiveFile) {
        setError(L('Drop a .zip or .tar.gz file to open it.', 'खोलने के लिए .zip या .tar.gz डालें।'))
        return
      }
      void openArchive(archiveFile)
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
        const count = seen.get(file.name) ?? 0
        seen.set(file.name, count + 1)
        const name = count ? file.name.replace(/(\.[^.]+)?$/, (ext) => `-${count + 1}${ext}`) : file.name
        entries.push({ name, data: new Uint8Array(await file.arrayBuffer()) })
      }
      const base = zipName.trim() || 'bundle'
      const bytes =
        packAs === 'store'
          ? zipStore(entries)
          : packAs === 'deflate'
            ? await zipDeflate(entries)
            : await tarGzip(entries)
      const ext = packAs === 'tar' ? 'tar.gz' : 'zip'
      triggerDownload(
        new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/octet-stream' }),
        `${base}.${ext}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Could not build that archive.', 'यह आर्काइव नहीं बन सका।'))
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
      const files = (isGzip(bytes) ? tarExtract(await gunzip(bytes)) : await unzip(bytes))
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
      setError(
        err instanceof Error ? err.message : L('Could not extract that archive.', 'यह आर्काइव नहीं निकाला जा सका।'),
      )
    } finally {
      setBusy(false)
    }
  }

  const queueSize = queue.reduce((n, file) => n + file.size, 0)
  const archiveSize = archive?.entries.reduce((n, entry) => n + entry.size, 0) ?? 0

  return (
    <ToolLayout
      title="ZIP archive"
      lede="Bundle files into a stored ZIP, a compressed ZIP, or a .tar.gz, or open one and pull files back out. Nothing is uploaded."
    >
      <Segmented
        label={L('Mode', 'मोड')}
        value={mode}
        options={[
          { value: 'pack', label: L('Make an archive', 'आर्काइव बनाएँ') },
          { value: 'open', label: L('Open an archive', 'आर्काइव खोलें') },
        ]}
        onChange={(next) => {
          setMode(next)
          setError(null)
        }}
      />

      <DropZone
        accept={mode === 'open' ? '.zip,.tar.gz,.tgz,application/zip,application/gzip' : '*/*'}
        multiple={mode === 'pack'}
        label={
          mode === 'pack'
            ? L('Drop the files to bundle.', 'जोड़ने के लिए फ़ाइलें डालें।')
            : L('Drop a .zip or .tar.gz file.', '.zip या .tar.gz डालें।')
        }
        hint={
          mode === 'pack'
            ? L(
                'Deflate shrinks text and code. Photos, PDFs, and video are already compressed, so they stay about the same size.',
                'Deflate टेक्स्ट और कोड को छोटा करता है। फ़ोटो, PDF और वीडियो पहले से संपीड़ित होते हैं, इसलिए उनका आकार लगभग वही रहता है।',
              )
            : L(
                'Encrypted archives, RAR, and 7z are not supported.',
                'एन्क्रिप्टेड आर्काइव, RAR और 7z समर्थित नहीं हैं।',
              )
        }
        onFiles={take}
      />

      {error ? <p className="status-bad">{error}</p> : null}

      {mode === 'pack' ? (
        <div className="split">
          <section className="panel">
            {!queue.length ? <p className="muted">{L('No files queued.', 'कोई फ़ाइल कतार में नहीं।')}</p> : null}
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
                  {L('Remove', 'हटाएँ')}
                </button>
              </div>
            ))}
            {queue.length ? (
              <p className="hint">
                {queue.length} {L(queue.length === 1 ? 'file' : 'files', 'फ़ाइलें')} · {formatBytes(queueSize)}
              </p>
            ) : null}
          </section>
          <aside className="panel">
            <label className="field">
              <span>{L('Archive name', 'आर्काइव का नाम')}</span>
              <input value={zipName} onChange={(e) => setZipName(e.target.value)} placeholder="bundle" />
            </label>
            <Segmented
              label={L('Format', 'फ़ॉर्मैट')}
              value={packAs}
              options={[
                { value: 'deflate', label: L('Compressed ZIP', 'संपीड़ित ZIP') },
                { value: 'store', label: L('Stored ZIP', 'सादी ZIP') },
                { value: 'tar', label: '.tar.gz' },
              ]}
              onChange={setPackAs}
            />
            <div className="row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!queue.length || busy}
                onClick={() => void pack()}
              >
                {busy ? L('Packing…', 'बना रहे हैं…') : L('Download', 'डाउनलोड')}
              </button>
              <button type="button" className="btn" disabled={!queue.length} onClick={() => setQueue([])}>
                {L('Clear', 'साफ़ करें')}
              </button>
            </div>
            <SendTo from="archive" files={queue} />
          </aside>
        </div>
      ) : (
        <div className="split">
          <section className="panel">
            {!archive ? <p className="muted">{L('No archive open.', 'कोई आर्काइव खुला नहीं।')}</p> : null}
            {archive?.entries.map((entry) => (
              <div key={entry.name} className="result-row">
                <code>{entry.name}</code>
                <span className="hint">{formatBytes(entry.size)}</span>
              </div>
            ))}
            {archive ? (
              <p className="hint">
                {archive.entries.length} · {formatBytes(archiveSize)} {L('unpacked', 'बिना पैक')} ·{' '}
                {formatBytes(archive.file.size)}
              </p>
            ) : null}
          </section>
          <aside className="panel">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!archive || busy}
              onClick={() => void extract()}
            >
              {busy ? L('Extracting…', 'निकाल रहे हैं…') : L('Extract every file', 'सारी फ़ाइलें निकालें')}
            </button>
            <p className="hint">
              {L(
                'Each entry downloads separately, so your browser may ask permission to save several files at once.',
                'हर फ़ाइल अलग डाउनलोड होती है, इसलिए ब्राउज़र एक साथ कई फ़ाइलें सहेजने की अनुमति माँग सकता है।',
              )}
            </p>
            <SendTo from="archive" files={extracted} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}
