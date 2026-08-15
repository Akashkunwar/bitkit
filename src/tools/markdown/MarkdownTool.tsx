import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { DownloadButton } from '../../components/DownloadButton'
import { renderMarkdown, tocFromMarkdown, extractTitle } from '../../lib/markdown'
import { markdownHtmlToPdf, type PdfOptions } from '../../lib/pdf'
import { applyFilenamePattern } from '../../lib/format'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { SendTo } from '../../components/SendTo'

const SAMPLE = `# Brief

Write in Markdown. Tables, lists, and code stay readable.

## Checklist

- [x] Local preview
- [ ] Print to PDF

| Item | Status |
| --- | --- |
| Headings | Yes |
| Links | [Example](https://example.com) |

\`\`\`ts
const ok = true
\`\`\`
`

export default function MarkdownTool() {
  const [source, setSource] = useState(SAMPLE)
  const [pageSize, setPageSize] = useState<PdfOptions['pageSize']>('a4')
  const [marginMm, setMarginMm] = useState(16)
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('BitKit')
  const [showToc, setShowToc] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const html = useMemo(() => renderMarkdown(source), [source])
  const toc = useMemo(() => tocFromMarkdown(source), [source])
  const title = extractTitle(source)

  useHandoff((payload) => {
    if (payload.text) setSource(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setSource)
  })

  const printDoc = () => {
    document.body.classList.add('printing-md')
    window.print()
    document.body.classList.remove('printing-md')
  }

  const downloadPdf = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await markdownHtmlToPdf(html, source, { pageSize, marginMm, header, footer })
      triggerDownload(blob, applyFilenamePattern('{original}', { original: title, ext: 'pdf' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF export failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout
      title="Markdown to PDF"
      lede="Print → Save as PDF keeps text selectable. One-click download is a simpler local fallback."
    >
      <div className="no-print">
        <DropZone
          accept=".md,text/markdown,text/plain"
          label="Drop a .md file, or paste in the editor."
          onFiles={async (files) => {
            const file = files[0]
            if (file) setSource(await file.text())
          }}
        />
      </div>
      <div className="split no-print">
        <section className="panel">
          <textarea
            className="code-area editor"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            aria-label="Markdown source"
          />
        </section>
        <aside className="panel">
          <label className="field">
            <span>Page</span>
            <select value={pageSize} onChange={(event) => setPageSize(event.target.value as PdfOptions['pageSize'])}>
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </label>
          <label className="field">
            <span>Margin (mm)</span>
            <input
              type="number"
              min={8}
              max={32}
              value={marginMm}
              onChange={(event) => setMarginMm(Number(event.target.value))}
            />
          </label>
          <label className="field">
            <span>Header</span>
            <input value={header} onChange={(event) => setHeader(event.target.value)} />
          </label>
          <label className="field">
            <span>Footer</span>
            <input value={footer} onChange={(event) => setFooter(event.target.value)} />
          </label>
          <label className="row">
            <input type="checkbox" checked={showToc} onChange={(event) => setShowToc(event.target.checked)} />
            Table of contents in preview
          </label>
          <div className="row" style={{ marginTop: '1rem' }}>
            <DownloadButton label="Print / Save PDF" onClick={printDoc} />
            <button type="button" className="btn" disabled={busy} onClick={() => void downloadPdf()}>
              {busy ? 'Building…' : 'Download PDF'}
            </button>
          </div>
          {error ? <p className="status-bad">{error}</p> : null}
          <SendTo from="markdown" text={source} />
        </aside>
      </div>
      <section className="panel print-root md-preview">
        {header ? <p className="muted">{header}</p> : null}
        {showToc && toc.length > 1 ? (
          <nav aria-label="Table of contents">
            <h2>Contents</h2>
            <ol>
              {toc.map((item) => (
                <li key={item.text} style={{ marginLeft: (item.level - 1) * 12 }}>
                  {item.text}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <article dangerouslySetInnerHTML={{ __html: html }} />
        {footer ? <p className="muted">{footer}</p> : null}
      </section>
    </ToolLayout>
  )
}
