<div align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="">
  <h1>BitKit</h1>
  <p><strong>61 everyday tools that run entirely in your browser.</strong></p>
  <p>No account. No server. Nothing you open ever leaves your device.</p>
</div>

---

Most small utilities — resize an image, shrink a PDF, clean a CSV, decode a JWT — mean
uploading your file to somebody else's server. BitKit does all of it locally, in the tab,
using the platform APIs browsers already ship. After the first load it works offline.

## Tools

| Group | Tools |
| --- | --- |
| **Daily** | Convert (time, zones, units, percent, GST), Links & cards, Meeting planner, Age & date difference, Deadline calculator, Timers, Random picker, Number to words, Health calculators, Trip cost |
| **Image** | Clipboard download, Resize & compress, Image finishing, Image metadata (EXIF/GPS), Favicon set, Passport sheet, Background cutout, SVG convert, Carousel splitter, Meme generator, ASCII from image |
| **Document** | Markdown to PDF, PDF editor, PDF merge & split, Image ↔ PDF, OCR, PDF form fill, PDF shrink, Markdown table, Invoice |
| **Data** | Data table (CSV/TSV/JSON/XLSX), Chart maker |
| **Media** | Video & audio trim, Screen & camera recorder, Noise generator, Sound meter |
| **Developer** | JSON formatter, Text diff, Password generator, QR code, Encode (Base64/JWT/SHA), Text bench, Regex tester, Checksum, JSON·YAML·TOML, Cron builder, Number base |
| **Design** | Gradient builder, Tailwind theme builder, Contrast checker, Colour picker, Diagram (Mermaid), Colour vision |
| **Writing** | Unicode text styler, Emoji search, Platform counter, Readability, Box drawing |
| **Notes** | Local notes, Data & settings, Pipelines |

Press <kbd>/</kbd> or <kbd>⌘K</kbd> to search — the palette runs actions too, not just
navigation ("paste and compress to 450 KB"). Press <kbd>?</kbd> for every shortcut.

Every tool has a chord. Twenty-four keep a single letter (<kbd>G</kbd> <kbd>R</kbd> for
resize), and all 61 are reachable by category (<kbd>G</kbd> <kbd>4</kbd> <kbd>D</kbd> —
fourth group, Data table). Digits can never collide with the single-letter chords, which
is what made room for the rest.

## Beyond the tools

- **Your data is yours to move.** Export notes, pins, settings, and pipelines as one
  file from *Data & settings*, and restore it by merge or replace. IndexedDB can be
  evicted without warning, so the app also offers to request persistent storage.
- **Undo.** Anything destructive registers a way back, with a toast and <kbd>Ctrl</kbd>+<kbd>Z</kbd>.
- **Pipelines.** Save a sequence of tools you keep repeating and walk a file through it.
- **Folder in, folder out.** Chromium browsers can run an image tool across a whole
  directory, writing results to a subfolder. Elsewhere it falls back to multi-select.
- **Offline and updates.** The app says when you are offline and when a new version is
  ready, instead of leaving a stale service worker in place.
- **Hindi.** The shell, home page, and navigation are translated. Tool interiors are
  still English — see [`src/lib/i18n.ts`](src/lib/i18n.ts) for why that line is drawn there.
- **One tool crashing cannot blank the app.** Each route is wrapped in a boundary that
  keeps navigation alive and offers a pre-filled issue link.

## How the privacy claim holds up

- No analytics, no accounts, no content uploads in the default build.
- Files are read with `FileReader` / `ArrayBuffer` and processed with Canvas, WebCodecs,
  WebCrypto, Web Workers, and WASM — all in-process.
- A test in [`src/test/privacy.test.ts`](src/test/privacy.test.ts) fails the build if a
  processing path starts making network calls.
- Shareable links encode tool *settings* only. File contents are filtered out before
  anything reaches the URL, and a test asserts it.
- Two engines (Tesseract OCR and MediaPipe segmentation) fetch their model files from a
  CDN the first time you use them. Your image still never leaves the tab — see
  [docs/PRIVACY_AND_LIMITATIONS.md](docs/PRIVACY_AND_LIMITATIONS.md).

## Develop

```bash
npm install
npm run dev
```

```bash
npm test          # 202 unit tests
npm run test:e2e  # 86 Playwright checks, including accessibility
npm run typecheck # tsc project references
npm run build     # regenerates assets, typechecks, then builds
```

CI runs typecheck, unit tests, a bundle budget on the eager chunk, an assets-freshness
check, and the Playwright suite including a WCAG contrast and target-size audit.

Brand assets are generated, not hand-drawn — `npm run assets` rebuilds the PWA icons,
the Open Graph card, and `sitemap.xml` from the tool registry. CI fails if they are
stale, so run it after adding a tool.

## Deploy

The output in `dist/` is a static SPA. Both configs are already committed.

### Cloudflare Pages

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | `20` |

`public/_redirects` handles the SPA fallback and `public/_headers` sets caching and
security headers.

### Vercel

Import the repo — `vercel.json` already sets the framework, rewrites, and headers.
No dashboard configuration needed.

### Anywhere else

Serve `dist/` and rewrite unknown paths to `/index.html`.

Set your real domain before deploying so the sitemap and canonical URL match:

```bash
SITE_URL=https://your-domain.com npm run assets
```

Then update `<link rel="canonical">` in [index.html](index.html).

## Architecture

- **Vite + React 19 + TypeScript**, routed with React Router.
- Every tool is a lazy route registered in [`src/registry.ts`](src/registry.ts) — one
  entry defines its title, category, search keywords, shortcut, and handoff types.
- Pure logic lives in `src/lib/`, UI in `src/tools/`, so the interesting parts are
  unit-testable without a DOM.
- Heavy engines (Mermaid, Tesseract, pdf.js, MediaPipe) are lazy-loaded and
  runtime-cached rather than precached, keeping the first visit small.
- **Send to** hands a result from one tool to another without a round trip.

## Licence

MIT — see [LICENSE](LICENSE).
