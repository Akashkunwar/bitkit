<div align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="">
  <h1>BitKit</h1>
  <p><strong>59 everyday tools that run entirely in your browser.</strong></p>
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
| **Notes** | Local notes |

Press <kbd>/</kbd> or <kbd>⌘K</kbd> to search. Many tools have a `G` chord shortcut
(<kbd>G</kbd> then <kbd>R</kbd> for resize, and so on) shown next to their name.

## How the privacy claim holds up

- No analytics, no accounts, no content uploads in the default build.
- Files are read with `FileReader` / `ArrayBuffer` and processed with Canvas, WebCodecs,
  WebCrypto, Web Workers, and WASM — all in-process.
- A test in [`src/test/privacy.test.ts`](src/test/privacy.test.ts) fails the build if a
  processing path starts making network calls.
- Two engines (Tesseract OCR and MediaPipe segmentation) fetch their model files from a
  CDN the first time you use them. Your image still never leaves the tab — see
  [docs/PRIVACY_AND_LIMITATIONS.md](docs/PRIVACY_AND_LIMITATIONS.md).

## Develop

```bash
npm install
npm run dev
```

```bash
npm test          # 170 unit tests
npm run typecheck # tsc project references
npm run build     # regenerates assets, typechecks, then builds
```

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
