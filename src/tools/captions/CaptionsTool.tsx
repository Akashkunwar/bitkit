import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { useI18n } from '../../lib/i18n'
import { formatSrt, formatVtt, mergeCues, parseCaptions, shiftCues, type Cue } from '../../lib/captions'

export default function CaptionsTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [text, setText] = useState('')
  const [extra, setExtra] = useState('')
  const [name, setName] = useState('captions.srt')
  const [shift, setShift] = useState(0)

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setText)
  })

  const cues = useMemo(() => {
    if (!text.trim() && !extra.trim()) return { list: [] as Cue[], error: null as string | null }
    try {
      const first = text.trim() ? parseCaptions(text, name) : []
      const second = extra.trim() ? parseCaptions(extra) : []
      const merged = second.length ? mergeCues(first, second) : first
      return { list: shift === 0 ? merged : shiftCues(merged, shift), error: null }
    } catch (err) {
      return {
        list: [] as Cue[],
        error:
          err instanceof Error
            ? err.message
            : language === 'hi'
              ? 'ये कैप्शन नहीं पढ़े जा सके।'
              : 'Could not read those captions.',
      }
    }
  }, [text, extra, name, shift, language])

  const download = (kind: 'srt' | 'vtt') => {
    const body = kind === 'srt' ? formatSrt(cues.list) : formatVtt(cues.list)
    const base = name.replace(/\.(srt|vtt)$/i, '') || 'captions'
    triggerDownload(new Blob([body], { type: 'text/plain' }), `${base}.${kind}`)
  }

  return (
    <ToolLayout title="Captions" lede="Shift subtitle times, or merge two SRT or VTT files. Nothing is uploaded.">
      <DropZone
        accept=".srt,.vtt,text/plain"
        label={L('Drop an SRT or VTT file.', 'SRT या VTT फ़ाइल डालें।')}
        hint={L('Or paste the cues below.', 'या संकेत नीचे पेस्ट करें।')}
        onFiles={(files) => {
          const file = files[0]
          if (!file) return
          setName(file.name)
          void file.text().then(setText)
        }}
      />
      {cues.error ? <p className="status-bad">{cues.error}</p> : null}
      <div className="split">
        <section className="panel">
          <label className="field">
            <span>{L('Cues', 'संकेत')}</span>
            <textarea
              className="code-area editor"
              rows={12}
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{L('Second file to merge', 'मिलाने वाली दूसरी फ़ाइल')}</span>
            <textarea
              className="code-area editor"
              rows={6}
              spellCheck={false}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
            />
          </label>
        </section>
        <aside className="panel">
          <label className="field">
            <span>{L('Shift, in seconds', 'सेकंड में खिसकाएँ')}</span>
            <input type="number" step="0.1" value={shift} onChange={(e) => setShift(Number(e.target.value))} />
          </label>
          <p className="hint">
            {cues.list.length
              ? L(
                  `${cues.list.length} cues. Negative shift moves them earlier.`,
                  `${cues.list.length} संकेत। ऋणात्मक मान उन्हें पहले ले जाता है।`,
                )
              : L(
                  'A negative shift moves cues earlier. Times do not go below zero.',
                  'ऋणात्मक मान संकेत को पहले ले जाता है। समय शून्य से नीचे नहीं जाता।',
                )}
          </p>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!cues.list.length}
              onClick={() => download('srt')}
            >
              {L('Download SRT', 'SRT डाउनलोड करें')}
            </button>
            <button type="button" className="btn" disabled={!cues.list.length} onClick={() => download('vtt')}>
              {L('Download VTT', 'VTT डाउनलोड करें')}
            </button>
          </div>
        </aside>
      </div>
    </ToolLayout>
  )
}
