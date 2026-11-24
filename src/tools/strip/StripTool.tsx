import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { DownloadButton } from '../../components/DownloadButton'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { applyFilenamePattern, mimeToExt } from '../../lib/format'
import { readMetadata, stripMetadata, type MetadataResult } from '../../lib/exif'
import { usePasteFiles } from '../../lib/usePasteFiles'
import { useI18n } from '../../lib/i18n'

export default function StripTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)
  urlRef.current = url
  const [meta, setMeta] = useState<MetadataResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [stripped, setStripped] = useState<File | null>(null)

  const load = async (next: File) => {
    setError(null)
    setNote(null)
    setStripped(null)
    if (url) URL.revokeObjectURL(url)
    setFile(next)
    setUrl(URL.createObjectURL(next))
    try {
      setMeta(await readMetadata(next))
    } catch (err) {
      setMeta(null)
      setError(err instanceof Error ? err.message : L('Could not read that image.', 'यह तस्वीर नहीं पढ़ी जा सकी।'))
    }
  }

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  useHandoff((payload) => {
    const image = payload.files?.find((item) => item.type.startsWith('image/'))
    if (image) void load(image)
  })
  usePasteFiles((files) => {
    if (files[0]) void load(files[0])
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
      setNote(
        result.method === 'lossless'
          ? L(
              'JPEG and PNG tags were removed without re-encoding the picture.',
              'JPEG और PNG के टैग बिना दोबारा एनकोड किए हटा दिए गए।',
            )
          : L(
              'This format was re-encoded, which drops tags. A watermark drawn into the pixels is still there.',
              'इस फ़ॉर्मैट को दोबारा एनकोड किया गया, इसलिए टैग हट गए। पिक्सेल में बना वॉटरमार्क अब भी रहेगा।',
            ),
      )
      triggerDownload(out, name)
    } catch (err) {
      setError(err instanceof Error ? err.message : L('Could not strip metadata.', 'मेटाडेटा नहीं हटाया जा सका।'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Strip metadata"
      lede="Download a copy with EXIF, GPS, and other tags removed. The picture stays in this tab. A mark baked into the pixels is not removed."
    >
      <DropZone
        onFiles={(files) => files[0] && void load(files[0])}
        label={L('Drop a photo to strip.', 'टैग हटाने के लिए फ़ोटो डालें।')}
        hint={L(
          'Paste works too. JPEG and PNG keep their pixels; other formats are re-encoded.',
          'पेस्ट भी चलता है। JPEG और PNG के पिक्सेल वही रहते हैं; बाकी फ़ॉर्मैट दोबारा एनकोड होते हैं।',
        )}
      />
      {error ? <p className="status-bad">{error}</p> : null}
      <div className="split">
        <section className="panel">
          {url ? (
            <div className="preview-frame">
              <img src={url} alt={L('Photo to strip', 'जिस फ़ोटो के टैग हटेंगे')} />
            </div>
          ) : (
            <p className="muted">{L('No photo yet.', 'अभी कोई फ़ोटो नहीं।')}</p>
          )}
        </section>
        <aside className="panel">
          {meta ? (
            <>
              <p className="status-ok">{meta.format}</p>
              <p className="hint">
                {L(`${meta.tags.length} tags`, `${meta.tags.length} टैग`)}
                {meta.gps
                  ? L(
                      ` · GPS ${meta.gps.lat.toFixed(5)}, ${meta.gps.lon.toFixed(5)}`,
                      ` · GPS ${meta.gps.lat.toFixed(5)}, ${meta.gps.lon.toFixed(5)}`,
                    )
                  : L(' · no GPS fix', ' · GPS नहीं मिला')}
              </p>
            </>
          ) : (
            <p className="muted">{L('Tags show up here.', 'टैग यहाँ दिखेंगे।')}</p>
          )}
          <DownloadButton
            label={
              busy ? L('Stripping…', 'हटा रहे हैं…') : L('Download without metadata', 'बिना मेटाडेटा डाउनलोड करें')
            }
            disabled={!file || busy}
            onClick={() => void strip()}
          />
          {note ? <p className="hint">{note}</p> : null}
          <SendTo from="strip" files={stripped ? [stripped] : []} />
        </aside>
      </div>
    </ToolLayout>
  )
}
