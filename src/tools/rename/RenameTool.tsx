import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { triggerDownload } from '../../lib/download'
import { useI18n } from '../../lib/i18n'
import { zipStore } from '../../lib/zip'
import { conflictsWithExisting, planRename, type RenamePlan } from '../../lib/rename'
import { FOLDER_SUPPORTED, ensurePermission, pickDirectory, readDirectory, writeFile } from '../../lib/folder'

type Item = { name: string; file: File }

export default function RenameTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [items, setItems] = useState<Item[]>([])
  const [pattern, setPattern] = useState('{n}-{name}.{ext}')
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => {
    try {
      const planned = planRename(
        items.map((item) => item.name),
        pattern,
      )
      const clash = conflictsWithExisting(
        planned,
        items.map((item) => item.name),
      )
      return {
        planned,
        error: clash
          ? language === 'hi'
            ? `“${clash}” इस सूची में पहले से है।`
            : `“${clash}” is already in this list.`
          : null,
      }
    } catch (err) {
      return {
        planned: [] as RenamePlan[],
        error:
          err instanceof Error
            ? err.message
            : language === 'hi'
              ? 'यह पैटर्न नहीं चला।'
              : 'That pattern does not work.',
      }
    }
  }, [items, pattern, language])

  const addFiles = (files: File[]) => {
    setDir(null)
    setNote(null)
    setItems((current) => [...current, ...files.map((file) => ({ name: file.name, file }))])
  }

  const chooseFolder = async () => {
    setError(null)
    setNote(null)
    const picked = await pickDirectory('readwrite')
    if (!picked) return
    const allowed = await ensurePermission(picked, 'readwrite')
    if (!allowed) {
      setError(L('Folder permission was not granted.', 'फ़ोल्डर की अनुमति नहीं मिली।'))
      return
    }
    const found = await readDirectory(picked, { limit: 500 })
    setDir(picked)
    setItems(found.map((entry) => ({ name: entry.relativePath, file: entry.file })))
  }

  const downloadZip = async () => {
    if (!preview.planned.length || preview.error) return
    setBusy(true)
    try {
      const byName = new Map(items.map((item) => [item.name, item.file]))
      const entries = []
      for (const row of preview.planned) {
        const file = byName.get(row.from)
        if (!file) continue
        entries.push({ name: row.to, data: new Uint8Array(await file.arrayBuffer()) })
      }
      const bytes = zipStore(entries)
      triggerDownload(new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/zip' }), 'renamed.zip')
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : L('Could not build the renamed archive.', 'नए नामों की फ़ाइल नहीं बन सकी।'),
      )
    } finally {
      setBusy(false)
    }
  }

  const writeFolder = async () => {
    if (!dir || !preview.planned.length || preview.error) return
    setBusy(true)
    setError(null)
    const temps: { temp: string; to: string }[] = []
    try {
      const byName = new Map(items.map((item) => [item.name, item.file]))
      for (const row of preview.planned) {
        if (row.from === row.to) continue
        const file = byName.get(row.from)
        if (!file) continue
        const temp = `.bitkit-rename-${crypto.randomUUID()}`
        await writeFile(dir, temp, file)
        temps.push({ temp, to: row.to })
      }
      for (const row of preview.planned) {
        if (row.from !== row.to) await dir.removeEntry(row.from)
      }
      for (const row of temps) {
        const handle = await dir.getFileHandle(row.temp)
        const file = await handle.getFile()
        await writeFile(dir, row.to, file)
        await dir.removeEntry(row.temp)
      }
      setNote(L('Renamed in the folder you chose.', 'चुने हुए फ़ोल्डर में नाम बदल दिए गए।'))
      setDir(null)
      setItems([])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : L(
              'The folder could not be updated. Look for leftover .bitkit-rename files.',
              'फ़ोल्डर नहीं बदला जा सका। .bitkit-rename फ़ाइलें बची हो सकती हैं।',
            ),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Batch rename"
      lede="Preview new names, download a ZIP of the copies, or rename inside a folder on Chromium. Files stay on this device."
    >
      <DropZone
        accept="*/*"
        multiple
        label={L('Drop the files to rename.', 'जिन फ़ाइलों के नाम बदलने हैं उन्हें डालें।')}
        hint={
          FOLDER_SUPPORTED
            ? L('Or choose a folder and write the new names back into it.', 'या फ़ोल्डर चुनें और नए नाम उसी में लिखें।')
            : L(
                'This browser cannot write a folder, so the result is a ZIP of renamed copies.',
                'यह ब्राउज़र फ़ोल्डर में नहीं लिख सकता, इसलिए नतीजा नए नामों की ZIP है।',
              )
        }
        onFiles={addFiles}
      />
      {preview.error || error ? <p className="status-bad">{preview.error ?? error}</p> : null}
      {note ? <p className="status-ok">{note}</p> : null}
      <div className="split">
        <section className="panel">
          {!preview.planned.length ? <p className="muted">{L('Names show up here.', 'नाम यहाँ दिखेंगे।')}</p> : null}
          {preview.planned.map((row) => (
            <div key={row.from} className="result-row">
              <code>
                {row.from} → {row.to}
              </code>
            </div>
          ))}
        </section>
        <aside className="panel">
          <label className="field">
            <span>{L('Pattern', 'पैटर्न')}</span>
            <input value={pattern} spellCheck={false} onChange={(e) => setPattern(e.target.value)} />
          </label>
          <p className="hint">{L('{name} {ext} {n} {nn} {date} {time}', '{name} {ext} {n} {nn} {date} {time}')}</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!preview.planned.length || !!preview.error || busy}
              onClick={() => void downloadZip()}
            >
              {busy ? L('Working…', 'चल रहा है…') : L('Download renamed ZIP', 'नए नामों की ZIP डाउनलोड करें')}
            </button>
            {FOLDER_SUPPORTED ? (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => void (dir ? writeFolder() : chooseFolder())}
              >
                {dir ? L('Rename in folder', 'फ़ोल्डर में नाम बदलें') : L('Choose folder', 'फ़ोल्डर चुनें')}
              </button>
            ) : null}
            <button
              type="button"
              className="btn"
              disabled={!items.length}
              onClick={() => {
                setItems([])
                setDir(null)
              }}
            >
              {L('Clear', 'साफ़ करें')}
            </button>
          </div>
        </aside>
      </div>
    </ToolLayout>
  )
}
