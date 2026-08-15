import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { DownloadButton } from '../../components/DownloadButton'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { applyFilenamePattern, mimeToExt } from '../../lib/format'
import { readMetadata, stripMetadata, type MetadataResult } from '../../lib/exif'
import { filesFromPaste } from '../../lib/clipboard'

export default function ExifTool() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState<MetadataResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripped, setStripped] = useState<File | null>(null)

  const load = async (next: File) => {
    setError(null)
    setStripped(null)
    if (url) URL.revokeObjectURL(url)
    setFile(next)
    setUrl(URL.createObjectURL(next))
    try {
      setMeta(await readMetadata(next))
    } catch (err) {
      setMeta(null)
      setError(err instanceof Error ? err.message : 'Could not read metadata.')
    }
  }

  useHandoff((payload) => {
    const image = payload.files?.find((f) => f.type.startsWith('image/'))
    if (image) void load(image)
  })

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      void filesFromPaste(event).then((files) => {
        if (files[0]) void load(files[0])
      })
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const strip = async () => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const result = await stripMetadata(file)
      const name = applyFilenamePattern('{original}-stripped', {
        original: file.name,
        ext: mimeToExt(result.blob.type || file.type),
      })
      const out = new File([result.blob], name, { type: result.blob.type })
      setStripped(out)
      triggerDownload(out, name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not strip metadata.')
    } finally {
      setBusy(false)
    }
  }

  const groups = [...new Set(meta?.tags.map((t) => t.group) ?? [])]

  return (
    <ToolLayout
      title="Image metadata"
      lede="Read EXIF, IPTC, and GPS in this tab. Strip tags before you send a photo onward. This does not hide AI watermarks."
    >
      <DropZone
        onFiles={(files) => files[0] && void load(files[0])}
        hint="Paste also works. JPEG and PNG can be stripped without re-encoding."
      />
      <div className="split">
        <section className="panel">
          {url ? (
            <div className="preview-frame">
              <img src={url} alt="Inspected" />
            </div>
          ) : (
            <p className="muted">Drop a photo to inspect tags.</p>
          )}
        </section>
        <aside className="panel">
          {meta ? (
            <>
              <p className="status-ok">{meta.format}</p>
              {groups.map((group) => (
                <div key={group} style={{ marginBottom: '0.85rem' }}>
                  <span className="field-label">{group}</span>
                  {meta.tags
                    .filter((t) => t.group === group)
                    .map((tag) => (
                      <p key={tag.label} className="hint" style={{ margin: '0.2rem 0' }}>
                        <strong>{tag.label}</strong> — {tag.value}
                      </p>
                    ))}
                </div>
              ))}
              {meta.gps ? (
                <p className="hint">
                  GPS {meta.gps.lat.toFixed(5)}, {meta.gps.lon.toFixed(5)}. Opening a map is your choice — the
                  coordinates stay in this tab until you copy them.
                </p>
              ) : null}
              <DownloadButton
                label={busy ? 'Stripping…' : 'Download without metadata'}
                disabled={!file || busy}
                onClick={() => void strip()}
              />
              <p className="hint">
                {meta.stripKind === 'reencode'
                  ? 'This format is stripped by re-encoding pixels. JPEG/PNG keep the original bytes minus tag segments.'
                  : 'Lossless strip: tag segments are removed, pixels are not re-encoded.'}
              </p>
            </>
          ) : (
            <p className="hint">Phone photos often include GPS, camera model, and timestamps.</p>
          )}
          {error ? <p className="status-bad">{error}</p> : null}
          <SendTo from="exif" files={stripped ? [stripped] : file ? [file] : undefined} />
        </aside>
      </div>
    </ToolLayout>
  )
}
