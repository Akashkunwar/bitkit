# Frontend Architecture — Personal Utility Hub

## Stack

- Vite + React + TypeScript
- Client-side routing (`react-router`)
- IndexedDB via Dexie for notes, preferences, recents, and favorites
- Web Workers + OffscreenCanvas (with main-thread canvas fallback) for image work
- `vite-plugin-pwa` for the offline shell
- Vitest for unit tests of processors, sanitization, and storage helpers

No remote runtime assets. Fonts are bundled. There is no analytics SDK.

## Layout

```
src/
  app/                 # shell: sidebar, top bar, command palette, home, theme, keys
  components/          # shared UI: ToolLayout, DropZone, Segmented, SortableGrid,
                       #   NumberSlider, ToolIcon, SendTo, PdfPassword, …
  lib/                 # processors, storage, clipboard, download, sanitize — no JSX
  registry.ts          # tool metadata, icons, routes, search terms, shortcuts
  styles/              # tokens → base → layout → components → home → tools → print
  tools/               # one folder per tool (lazy-loaded)
  workers/             # image encode / compress worker
```

### Shared building blocks

- **`ToolLayout`** looks the tool up by route, so a tool passes only its title and lede and gets the breadcrumb, icon, pin, copy-link, and related tools.
- **`useImageList`** owns a list of images with rotated thumbnails, sort, reorder, and object-URL cleanup. Images to PDF, Rotate & flip, the converter, and the collage all use it; **`SortableGrid`** renders it with pointer, keyboard, and position-menu reordering.
- **`usePins`** is one store for pinned tools so the sidebar, home, and tool header always agree. **`usePasteFiles`** is the one window paste listener tools share.
- **`lib/pdfjsRuntime.ts`** is the only place pdf.js is imported; it loads the legacy build and sets the worker once.
- **`lib/domRaster.ts`** draws laid-out HTML into page images via SVG `foreignObject` and cuts tall renders into pages on blank rows. Word to image and Markdown to PDF both use it through **`lib/docRender.ts`**; **`lib/docThemes.ts`** holds the document stylesheets.
- Pure maths lives beside the UI it serves and is unit-tested: `pageLayout`, `collage`, `frame`, `image/transform`, `calc`, `unitConvert`, `finance`, `barcode`.

## Tool registry

`src/registry.ts` is the single catalog. Each entry declares:

- `id`, `path`, `title`, `blurb`, `category`, `icon`, `keywords`, `shortcut`
- `accepts` (what Send-to can hand it) and `isNew`
- lazy `component` import

The home page, sidebar, command palette, Send-to targets, chords, sitemap, and OG card all read this registry. Adding a tool means adding a registry row and a `src/tools/<id>` module, then `npm run assets`.

## Data flow

```
App shell + registry
        │
        ▼
  Tool-specific UI
        │
        ▼
Paste / drop / upload / text
        │
        ▼
Local processor (worker or main thread)
        │
        ▼
Preview + validation
        │
        ▼
Download / print / copy / optional folder write
```

Preferences, notes, and recents live in IndexedDB and never leave the origin.

## Processing

### Images

1. Decode with `createImageBitmap` when available, else `HTMLImageElement`.
2. Draw to canvas (OffscreenCanvas in a worker when supported).
3. Encode via `convertToBlob` / `toBlob` (`image/jpeg`, `image/webp`, `image/png`).
4. For byte targets, binary-search JPEG/WebP quality, then downscale if still over limit.
5. Stage downscales for very large sources to stay under canvas/memory caps.

Shared algorithm lives in `src/lib/image/compress.ts` so tests can run without a worker.

### Markdown

1. Parse with `marked`; task checkboxes become glyphs and headings get ids.
2. Sanitize with `DOMPurify` (no scripts, no inputs, no remote form actions).
3. Preview on a to-scale page in the chosen document theme.
4. Export: exact-look PDF (rendered pages), `window.print()` with `@page` rules for selectable text, or the `jspdf` text engine.

### Notes

Dexie database `kit-notes` with `id`, `title`, `body`, `pinned`, `updatedAt`. Debounced writes. JSON export/import.

## Browser APIs and fallbacks

| Capability | Primary | Fallback |
|---|---|---|
| Paste image | `paste` event + `clipboardData` | `navigator.clipboard.read()` after gesture |
| Save file | `<a download>` | File System Access `showSaveFilePicker` |
| Folder | `showDirectoryPicker` (Chrome) | Hidden; user uses Downloads |
| Image encode | OffscreenCanvas worker | Main-thread canvas |
| PDF | Print stylesheet | jsPDF from sanitized HTML |
| Persistence | IndexedDB | In-memory + warning if IDB unavailable |

## Privacy constraints in code

- No `fetch` of user files to remote hosts.
- Service worker caches only same-origin app assets.
- Optional network for first-load app shell only.
- A zero-network test asserts processors do not call `fetch` / `XMLHttpRequest`.

## Quality gates

CI runs, in order: typecheck, ESLint (hook rules, type-only imports, no stray `any`), Prettier, unit tests, build, bundle budget, generated-assets freshness, and the Playwright suite — every route mounted, keyboard flows, and an accessibility audit of contrast (all five themes, including gradient text), names, target size, and heading order.

## Lazy loading

Route-level `React.lazy` for each tool. PDF and image worker chunks load on first use of those tools.
