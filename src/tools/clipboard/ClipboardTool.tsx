import { useCallback, useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { DownloadButton } from '../../components/DownloadButton'
import { Segmented } from '../../components/Segmented'
import { filesFromPaste, copyBlob } from '../../lib/clipboard'
import { compressImage, type EncodeMime } from '../../lib/image/compress'
import { applyFilenamePattern, mimeToExt } from '../../lib/format'
import { triggerDownload, writeToDirectory } from '../../lib/download'
import { getPref, setPref } from '../../lib/db'
import { useHandoff } from '../../lib/useHandoff'
import { SendTo } from '../../components/SendTo'

type Format = EncodeMime

export default function ClipboardTool() {
  const [autoDownload, setAutoDownload] = useState(true)
  const [format, setFormat] = useState<Format>('image/png')
  const [pattern, setPattern] = useState('clipboard-{date}')
  const [preview, setPreview] = useState<{ url: string; blob: Blob; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [folder, setFolder] = useState<FileSystemDirectoryHandle | null>(null)
  const [count, setCount] = useState(1)

  useEffect(() => {
    void (async () => {
      setAutoDownload(await getPref('clipboard-auto', true))
      setFormat(await getPref<Format>('clipboard-format', 'image/png'))
      setPattern(await getPref('clipboard-pattern', 'clipboard-{date}'))
    })()
  }, [])

  const handleFiles = useCallback(
    async (files: File[]) => {
      const image = files.find((file) => file.type.startsWith('image/'))
      if (!image) {
        setError('Clipboard did not contain an image.')
        return
      }
      setError(null)
      try {
        const result =
          format === 'image/png' && !image.type.includes('png')
            ? await compressImage(image, { mime: format })
            : format === image.type
              ? { blob: image }
              : await compressImage(image, { mime: format })
        const blob = 'blob' in result ? result.blob : image
        const name = applyFilenamePattern(pattern, {
          original: image.name,
          ext: mimeToExt(blob.type || format),
          index: count,
        })
        const url = URL.createObjectURL(blob)
        setPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { url, blob, name }
        })
        setCount((n) => n + 1)
        if (autoDownload) {
          if (folder) await writeToDirectory(folder, blob, name)
          else triggerDownload(blob, name)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save that image.')
      }
    },
    [autoDownload, count, folder, format, pattern],
  )

  useHandoff((payload) => {
    if (payload.files?.length) void handleFiles(payload.files)
  })

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      void filesFromPaste(event).then((files) => {
        if (files.length) void handleFiles(files)
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [handleFiles])

  return (
    <ToolLayout
      title="Clipboard download"
      lede="With this tab focused, press Ctrl or Cmd + V. The image is processed here and saved through the browser download UI."
    >
      <div className="split">
        <section className="panel">
          <DropZone onFiles={handleFiles} hint="This page must stay focused. The site cannot intercept paste from other apps." />
          {preview ? (
            <div className="preview-frame" style={{ marginTop: '1rem' }}>
              <img src={preview.url} alt="Pasted image preview" />
            </div>
          ) : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </section>
        <aside className="panel">
          <label className="row" style={{ marginBottom: '1rem' }}>
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={async (event) => {
                setAutoDownload(event.target.checked)
                await setPref('clipboard-auto', event.target.checked)
              }}
            />
            Auto-download on paste
          </label>
          <Segmented
            label="Format"
            value={format}
            options={[
              { value: 'image/png', label: 'PNG' },
              { value: 'image/jpeg', label: 'JPEG' },
              { value: 'image/webp', label: 'WebP' },
            ]}
            onChange={async (value) => {
              setFormat(value)
              await setPref('clipboard-format', value)
            }}
          />
          <label className="field">
            <span>Filename pattern</span>
            <input
              className="text-input"
              value={pattern}
              onChange={async (event) => {
                setPattern(event.target.value)
                await setPref('clipboard-pattern', event.target.value)
              }}
            />
            <span className="hint">{'{date} {original} {n}'}</span>
          </label>
          <div className="row">
            <DownloadButton
              label="Download"
              disabled={!preview}
              onClick={() => preview && triggerDownload(preview.blob, preview.name)}
            />
            <button
              type="button"
              className="btn"
              disabled={!preview}
              onClick={() => preview && copyBlob(preview.blob)}
            >
              Copy back
            </button>
          </div>
          {'showDirectoryPicker' in window ? (
            <p>
              <button
                type="button"
                className="btn-ghost"
                onClick={async () => {
                  const dir = await window.showDirectoryPicker?.()
                  if (dir) setFolder(dir)
                }}
              >
                {folder ? `Folder: ${folder.name}` : 'Choose folder (optional)'}
              </button>
            </p>
          ) : (
            <p className="hint">Folder picker is not available in this browser. Files go to Downloads.</p>
          )}
          <SendTo
            from="clipboard"
            files={preview ? [new File([preview.blob], preview.name, { type: preview.blob.type })] : undefined}
          />
        </aside>
      </div>
    </ToolLayout>
  )
}
