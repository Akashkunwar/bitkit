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
  app/                 # shell, router, theme, command palette
  components/          # shared UI (drop zone, tool layout, download)
  lib/                 # processors, storage, clipboard, download, sanitize
  registry.ts          # tool metadata, routes, search terms, shortcuts
  styles/              # design tokens and global CSS
  tools/               # one folder per tool (lazy-loaded)
  workers/             # image encode / compress worker
```

## Tool registry

`src/registry.ts` is the single catalog. Each entry declares:

- `id`, `path`, `title`, `blurb`, `category`, `keywords`, `shortcut`
- lazy `component` import

The dashboard, command bar, recents, and favorites all read this registry. Adding a tool means adding a registry row and a `src/tools/<id>` module.

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

1. Parse with `marked`.
2. Sanitize with `DOMPurify` (no scripts, no remote form actions).
3. Preview in a print-styled article.
4. Export: `window.print()` first; `jspdf` HTML renderer as a one-click fallback.

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

## Lazy loading

Route-level `React.lazy` for each tool. PDF and image worker chunks load on first use of those tools.
