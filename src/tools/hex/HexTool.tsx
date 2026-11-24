import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { useI18n } from '../../lib/i18n'
import { formatBytes } from '../../lib/format'
import { HEX_PREVIEW_BYTES, hexRows, sniffType } from '../../lib/hex'

type View = { name: string; size: number; kind: string; text: string; truncated: boolean }

export default function HexTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [width, setWidth] = useState<8 | 16>(16)
  const [file, setFile] = useState<File | null>(null)
  const [view, setView] = useState<View | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  const open = async (next: File, columns: 8 | 16) => {
    setError(null)
    setFile(next)
    try {
      const bytes = new Uint8Array(await next.slice(0, HEX_PREVIEW_BYTES).arrayBuffer())
      const rows = hexRows(bytes, columns)
      const text = rows.map((row) => `${row.offset}  ${row.hex.padEnd(columns * 3, ' ')} ${row.ascii}`).join('\n')
      setView({
        name: next.name,
        size: next.size,
        kind: sniffType(bytes),
        text,
        truncated: next.size > bytes.length,
      })
    } catch (err) {
      setView(null)
      setError(err instanceof Error ? err.message : L('Could not read that file.', 'यह फ़ाइल नहीं पढ़ी जा सकी।'))
    }
  }

  useHandoff((payload) => {
    if (payload.files?.[0]) void open(payload.files[0], width)
  })

  return (
    <ToolLayout
      title="Hex view"
      lede="The first 64 KB of a file, as hex and ASCII, plus a type read from the opening bytes. The file stays in this tab."
    >
      <DropZone
        accept="*/*"
        label={L('Drop any file.', 'कोई भी फ़ाइल डालें।')}
        hint={L(
          'Only the first 64 KB is drawn, so a large file does not freeze the tab.',
          'सिर्फ़ पहले 64 KB दिखते हैं, ताकि बड़ी फ़ाइल टैब को रोक न दे।',
        )}
        onFiles={(files) => files[0] && void open(files[0], width)}
      />
      <div className="row" style={{ marginTop: '1rem' }}>
        <label className="field" style={{ minWidth: '10rem' }}>
          <span>{L('Bytes per row', 'हर पंक्ति में बाइट')}</span>
          <select
            className="text-input"
            value={width}
            onChange={(event) => {
              const next = Number(event.target.value) === 8 ? 8 : 16
              setWidth(next)
              if (file) void open(file, next)
            }}
          >
            <option value={16}>16</option>
            <option value={8}>8</option>
          </select>
        </label>
      </div>
      {error ? <p className="status-bad">{error}</p> : null}
      {view ? (
        <section className="panel">
          <p className="status-ok">
            {view.kind} · {formatBytes(view.size)}
            {view.truncated ? L(' · showing the first 64 KB', ' · पहले 64 KB दिख रहे हैं') : ''}
          </p>
          <pre className="code-area" style={{ overflow: 'auto', maxHeight: '28rem' }}>
            {view.text}
          </pre>
          <button type="button" className="btn" onClick={() => void copy(view.text)}>
            {copied ? L('Copied', 'कॉपी हो गया') : L('Copy hex', 'हेक्स कॉपी करें')}
          </button>
        </section>
      ) : (
        <p className="muted">{L('No file yet.', 'अभी कोई फ़ाइल नहीं।')}</p>
      )}
    </ToolLayout>
  )
}
