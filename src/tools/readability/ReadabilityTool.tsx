import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useHandoff } from '../../lib/useHandoff'
import { analyse, bandForEase, formatDuration } from '../../lib/readability'

const SAMPLE = `BitKit keeps your files on your own device. When you drop an image into the resizer, it is decoded, scaled, and re-encoded by the browser itself, and the result is handed straight back to you as a download.

Nothing is uploaded. There is no account to create, no server that holds a copy, and no analytics watching which tools you open. After the first visit the whole thing works offline.`

export default function ReadabilityTool() {
  const [text, setText] = useState(SAMPLE)

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setText)
  })

  const report = useMemo(() => analyse(text), [text])
  const band = bandForEase(report.ease)
  const easePercent = Math.min(100, Math.max(0, report.ease))

  return (
    <ToolLayout
      title="Readability"
      lede="Reading time, a Flesch score, and the specific sentences making it harder than it needs to be."
    >
      <label className="field">
        <span>Text</span>
        <textarea
          className="text-input"
          rows={9}
          value={text}
          placeholder="Paste a draft…"
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      {!report.words ? (
        <p className="muted">Paste something to analyse.</p>
      ) : (
        <>
          <div className="score-card" data-tone={band.tone}>
            <div>
              <span className="score-value">{Math.round(report.ease)}</span>
              <span className="score-label">Reading ease</span>
            </div>
            <div className="score-body">
              <strong>{band.label}</strong>
              <p>{band.note}</p>
              <div className="score-track" aria-hidden="true">
                <div className="score-bar" data-tone={band.tone} style={{ width: `${easePercent}%` }} />
              </div>
            </div>
          </div>

          <div className="pill-row">
            <span className="pill">
              <strong>{formatDuration(report.readingTimeSec)}</strong> to read
            </span>
            <span className="pill">{formatDuration(report.speakingTimeSec)} to read aloud</span>
            <span className="pill">Grade {Math.max(1, Math.round(report.grade))}</span>
          </div>

          <div className="pill-row">
            <span className="pill">{report.words} words</span>
            <span className="pill">{report.sentences} sentences</span>
            <span className="pill">{report.paragraphs} paragraphs</span>
            <span className="pill">{report.characters} characters</span>
            <span className="pill">{report.avgWordsPerSentence.toFixed(1)} words per sentence</span>
          </div>

          <div className="grid-tools" style={{ marginTop: '1.2rem' }}>
            <div className="panel">
              <p className="field-label">Passive voice</p>
              <div className="big-answer" style={{ margin: '0.2rem 0' }}>
                <strong>{report.passiveHits}</strong>
              </div>
              <p className="hint">
                {report.passiveHits === 0
                  ? 'None found. Direct writing.'
                  : 'Rewrite a few as “X did Y” and the prose tightens.'}
              </p>
            </div>
            <div className="panel">
              <p className="field-label">Adverbs</p>
              <div className="big-answer" style={{ margin: '0.2rem 0' }}>
                <strong>{report.adverbHits}</strong>
              </div>
              <p className="hint">
                {report.adverbHits <= report.words / 100
                  ? 'Within a normal range.'
                  : 'Words ending in -ly often signal a weak verb underneath.'}
              </p>
            </div>
          </div>

          {report.longest.length > 1 ? (
            <>
              <p className="field-label" style={{ marginTop: '1.4rem' }}>
                Longest sentences — usually where the difficulty lives
              </p>
              <div className="result-list">
                {report.longest.map((sentence) => (
                  <div key={sentence.index} className="result-row" style={{ alignItems: 'flex-start' }}>
                    <span className="pill" data-tone={sentence.words > 25 ? 'warn' : undefined}>
                      {sentence.words} words
                    </span>
                    <span style={{ flex: 1 }}>{sentence.text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <p className="hint" style={{ marginTop: '1.2rem' }}>
            Flesch scores are tuned to English prose. They read code, lists, and technical vocabulary as harder
            than they are, so treat a low score on a reference document as expected rather than a problem.
          </p>
        </>
      )}

      <SendTo from="readability" text={text} />
    </ToolLayout>
  )
}
