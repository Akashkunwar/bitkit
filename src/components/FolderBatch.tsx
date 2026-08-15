import { useRef, useState } from 'react'
import {
  ensurePermission,
  ensureSubfolder,
  FOLDER_SUPPORTED,
  pickDirectory,
  readDirectory,
  runBatch,
  writeFile,
  type BatchProgress,
} from '../lib/folder'

type Props = {
  /** Extensions to pick up, lower case and without the dot. */
  extensions: string[]
  /** Subfolder created inside the chosen directory for results. */
  outputFolder: string
  /** Turns one input file into one output file. */
  process: (file: File) => Promise<{ name: string; blob: Blob }>
  /** Fallback when the browser has no File System Access. */
  onFilesPicked?: (files: File[]) => void
  label?: string
}

/**
 * Runs a tool across a whole folder, writing results into a subfolder.
 *
 * Only Chromium-family browsers expose File System Access. Elsewhere this
 * offers multi-file selection instead of hiding, so the feature degrades to
 * something usable rather than disappearing.
 */
export function FolderBatch({ extensions, outputFolder, process, onFilesPicked, label }: Props) {
  const [progress, setProgress] = useState<BatchProgress | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const run = async () => {
    setError(null)
    setSummary(null)
    try {
      const dir = await pickDirectory('readwrite')
      if (!dir) return
      if (!(await ensurePermission(dir, 'readwrite'))) {
        setError('Write permission was declined, so nothing was changed.')
        return
      }

      const files = await readDirectory(dir, { extensions })
      if (!files.length) {
        setError(`No matching files in that folder (looking for ${extensions.join(', ')}).`)
        return
      }

      setRunning(true)
      const controller = new AbortController()
      abortRef.current = controller

      const out = await ensureSubfolder(dir, outputFolder)
      const result = await runBatch(files, process, setProgress, controller.signal)
      for (const output of result.outputs) await writeFile(out, output.name, output.blob)

      setSummary(
        `Wrote ${result.outputs.length} files into ${dir.name}/${outputFolder}.` +
          (result.failed.length ? ` ${result.failed.length} could not be processed.` : ''),
      )
      if (result.failed.length) {
        setError(result.failed.map((f) => `${f.name}: ${f.reason}`).join('\n'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The batch run failed.')
    } finally {
      setRunning(false)
      setProgress(null)
      abortRef.current = null
    }
  }

  return (
    <div className="batch-row">
      {FOLDER_SUPPORTED ? (
        <>
          <button type="button" className="btn" disabled={running} onClick={() => void run()}>
            {running ? 'Processing folder…' : (label ?? 'Process a whole folder')}
          </button>
          {running ? (
            <button type="button" className="btn-ghost" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
          ) : null}
          {progress ? (
            <span className="hint">
              {progress.done} of {progress.total}
              {progress.current ? ` — ${progress.current}` : ''}
            </span>
          ) : (
            <span className="hint">
              Results go into a new “{outputFolder}” subfolder. Originals are never modified.
            </span>
          )}
        </>
      ) : (
        <>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Choose many files
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            aria-label="Choose files to process"
            accept={extensions.map((e) => `.${e}`).join(',')}
            onChange={(event) => {
              const files = [...(event.target.files ?? [])]
              if (files.length) onFilesPicked?.(files)
              event.target.value = ''
            }}
          />
          <span className="hint">
            This browser cannot write to a folder, so pick the files and download the results instead.
          </span>
        </>
      )}

      {summary ? <p className="status-ok">{summary}</p> : null}
      {error ? (
        <p className="status-bad" style={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
