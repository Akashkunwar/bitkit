export function Privacy() {
  return (
    <article className="hero" style={{ maxWidth: '40rem' }}>
      <p className="kicker">Privacy</p>
      <h1>Files stay on this device.</h1>
      <p>
        BitKit has no backend for your content. Images, Markdown, and notes are processed in the browser. After the
        app shell loads, using a tool should not send the file anywhere.
      </p>
      <ul className="lede">
        <li>No accounts, analytics, or content uploads in the default build.</li>
        <li>Notes live in IndexedDB for this origin. That is not a backup — export if they matter.</li>
        <li>Paste works only while this tab is focused. The site cannot write silently to an arbitrary folder.</li>
        <li>
          Image finishing does not remove SynthID or other provenance watermarks, and it does not claim to beat AI
          detectors.
        </li>
        <li>
          OCR and background cutout load their recognition engines from a CDN the first time you use them. Your photo
          stays in this tab and is not uploaded.
        </li>
      </ul>
    </article>
  )
}
