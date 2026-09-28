<div align="center">
  <img src="public/favicon.svg" width="72" height="72" alt="">
  <h1>BitKit</h1>
  <p><strong>76 everyday tools that run entirely in your browser.</strong></p>
  <p>No account. No server. Nothing you open ever leaves your device.</p>
</div>

---

Most small utilities — turn photos into a PDF, a Word file into images, resize an image,
shrink a PDF, decode a JWT — mean uploading your file to somebody else's server. BitKit does
all of it locally, in the tab, using the platform APIs browsers already ship. After the
first load it works offline.

## Tools

| Group | Tools |
| --- | --- |
| **Daily** | **Calculator** (scientific, typed or tapped), **Unit converter** (16 quantities), **Finance** (EMI, SIP, compound interest, CAGR, discounts), Convert (time, zones, CSS units, percent, GST), Links & cards, Meeting planner, Age & date difference, Deadline calculator, Timers, Random picker, Number to words, Health calculators, Trip cost |
| **Image** | **Image converter** (JPG/PNG/WebP/AVIF/BMP), **Rotate & flip**, **Image collage**, **Screenshot frame**, Clipboard download, Resize & compress, Image finishing, Image metadata (EXIF/GPS), Favicon set, Passport sheet, Background cutout, SVG convert, Carousel splitter, Meme generator, ASCII from image |
| **Document** | **Images to PDF** (reorder, rotate, page setup), **PDF to images** (PNG/JPEG/WebP, any DPI), **Word to image** (and exact-look PDF), **Markdown to PDF** (themes, paginated), PDF editor, PDF merge & split, OCR, PDF form fill, Office to PDF, PDF to Word & text, Watermark & page numbers, PDF shrink, Markdown table, Invoice |
| **Data** | Data table (CSV/TSV/JSON/XLSX), Chart maker, ZIP archive |
| **Media** | Video & audio trim, Screen & camera recorder, Noise generator, Sound meter |
| **Developer** | **Barcode generator** (Code 128, EAN-13, UPC-A, EAN-8, Code 39), JSON formatter, Text diff, Password generator, QR code, Encode (Base64/JWT/SHA), Text bench, Regex tester, Checksum, JSON·YAML·TOML, Cron builder, Number base |
| **Design** | Gradient builder, Tailwind theme builder, Contrast checker, Colour picker, Diagram (Mermaid), Colour vision |
| **Writing** | **Text to speech**, Unicode text styler, Emoji search, Platform counter, Readability, Box drawing |
| **Notes** | Local notes, Data & settings, Pipelines |

New in this release are in **bold**. Drop any file on the home page to see every tool that can open it.

Press <kbd>⌘K</kbd> (or <kbd>Ctrl</kbd> <kbd>K</kbd>, or <kbd>/</kbd>) for the command
palette — it runs actions too, not just navigation ("compress an image to 450 KB").
Press <kbd>?</kbd> for every shortcut and <kbd>[</kbd> to hide the sidebar.

Every tool has a chord. Twenty-four keep a single letter (<kbd>G</kbd> <kbd>R</kbd> for
resize), and all 76 are reachable by category (<kbd>G</kbd> <kbd>4</kbd> <kbd>D</kbd> —
fourth group, Data table). Digits can never collide with the single-letter chords, which
is what made room for the rest.

## Beyond the tools

- **A modern interface.** Category-coloured icons on every tool, a sidebar you can hide
  for wide tools, breadcrumbs, one-click pinning, related tools at the foot of each page,
  and a home page that routes any dropped file to the tools that can open it.
- **Five themes.** Mist and Deep, plus Paper (warm, low-blue), Midnight (true black
  for OLED), and Contrast (AAA body text, no shadows). *Match system* follows the OS
  and lets you pick which pair it switches between — Paper by day, Midnight by night is
  a valid answer. Text size, density, and a reduced-motion override sit beside them in
  *Data & settings*. The accessibility suite audits contrast in all five.
- **Your data is yours to move.** Export notes, pins, settings, and pipelines as one
  file from *Data & settings*, and restore it by merge or replace. IndexedDB can be
  evicted without warning, so the app also offers to request persistent storage.
- **Undo.** Anything destructive registers a way back, with a toast and <kbd>Ctrl</kbd>+<kbd>Z</kbd>.
- **Pipelines.** Save a sequence of tools you keep repeating and walk a file through it.
- **Folder in, folder out.** Chromium browsers can run an image tool across a whole
  directory, writing results to a subfolder. Elsewhere it falls back to multi-select.
- **Offline and updates.** The app says when you are offline and when a new version is
  ready, instead of leaving a stale service worker in place.
- **Hindi.** The shell, home page, command palette, and navigation are translated. Tool interiors are
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
npm test             # 386 unit tests
npm run test:e2e     # Playwright: every route, keyboard flows, and accessibility
npm run typecheck    # tsc project references
npm run lint         # ESLint (hooks, type imports, no stray any)
npm run format:check # Prettier
npm run build        # regenerates assets, typechecks, then builds
```

CI runs typecheck, lint, formatting, unit tests, a bundle budget on the eager chunk, an
assets-freshness check, and the Playwright suite including a WCAG contrast (every theme,
gradient text included) and target-size audit. Barcode tests decode every symbology with
ZXing, so a wrong pattern table cannot ship.

Brand assets are generated, not hand-drawn — `npm run assets` rebuilds the PWA icons,
the Open Graph card, and `sitemap.xml` from the tool registry. CI fails if they are
stale, so run it after adding a tool.

## Deploy

The output in `dist/` is a static SPA. Both configs are already committed.

### Cloudflare Workers

`wrangler.jsonc` describes a static-assets Worker: it builds the site, uploads
`dist/`, and serves the app shell for any unmatched path so deep links work.
Caching and security headers come from `public/_headers`.

Connect the repo under **Workers & Pages → Create → Import a repository**. The
defaults are right: leave the build command empty and keep the deploy command
`npx wrangler deploy` — wrangler runs `npm run build` itself before uploading.
The site is served from `bitkit.<account>.workers.dev`.

To deploy from your machine instead:

```bash
npx wrangler login && npm run deploy
```

There is deliberately no `_redirects` file. Workers Assets rejects the usual
`/* /index.html 200` SPA rule as an infinite loop, and `not_found_handling`
already does its job.

**Cloudflare Pages** also works if you want a `pages.dev` address: connect the
repo under **Create → Pages → Connect to Git** with build command
`npm run build` and output directory `dist`. Pages ignores `wrangler.jsonc`
(it has no `pages_build_output_dir`) and serves `index.html` for unknown paths
on its own, because the build has no top-level `404.html`.

### Vercel

Import the repo — `vercel.json` already sets the framework, rewrites, and
headers. No dashboard configuration needed.

### Anywhere else

Serve `dist/` and rewrite unknown paths to `/index.html`.

Set your real domain before deploying so the sitemap and canonical URL match:

```bash
SITE_URL=https://your-domain.com npm run assets
```

Then update `<link rel="canonical">` in [index.html](index.html).

## Architecture

- **Vite + React 19 + TypeScript**, routed with React Router; icons from Lucide.
- Every tool is a lazy route registered in [`src/registry.ts`](src/registry.ts) — one
  entry defines its title, icon, category, search keywords, shortcut, and handoff types.
- Pure logic lives in `src/lib/`, UI in `src/tools/`, so the interesting parts are
  unit-testable without a DOM.
- Heavy engines (Mermaid, Tesseract, pdf.js, docx-preview, MediaPipe) are lazy-loaded
  and runtime-cached rather than precached, keeping the first visit small.
- Styles are layered — tokens, base, layout, components, home, tools, print — and every
  tool shares one class vocabulary, so the design system restyles all of them at once.
- See [docs/FRONTEND_ARCHITECTURE.md](docs/FRONTEND_ARCHITECTURE.md) for the shared
  building blocks (sortable image grids, the HTML-to-page renderer, pdf.js runtime).
- **Send to** hands a result from one tool to another without a round trip.

## Licence

MIT — see [LICENSE](LICENSE).
