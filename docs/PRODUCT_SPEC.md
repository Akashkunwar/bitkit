# Product Specification — Personal Utility Hub

## Vision

A privacy-first, frontend-only toolbox that consolidates everyday image, document, note, and text tasks into one minimal site. Every operation runs locally in the browser. There are no accounts, uploads, tracking, or backend services in the initial product.

The product name in the UI is **BitKit**. Files stay on the device. After first load the app works offline.

## Personas

- **Creator / marketer** who pastes screenshots, resizes assets for forms, and exports Markdown briefs as PDFs.
- **Form filler** who must meet government or portal constraints (exact pixels, hard byte limits).
- **Note-taker** who wants a fast scratchpad that survives reloads without signing in.
- **Keyboard-first user** who wants to land on the site, search or paste, and leave with a file.

## Product principles

1. Local-only processing. User content never leaves the device.
2. One shared tool flow: **Input → Options → Preview → Download/Copy**.
3. Honest about browser limits. Do not promise silent filesystem writes or provenance evasion.
4. Search-first navigation. Tools are found by name, synonym, or shortcut.
5. Minimal visual language. Distinct through typography, spacing, and one accent — not decoration.

## In-scope MVP tools

### 1. Clipboard Image Download (`/clipboard`)

While the site is focused, Ctrl/Cmd+V pastes an image, shows a preview, names the file, and downloads it.

- Optional auto-download on paste.
- Output format (PNG / JPEG / WebP) and filename pattern.
- One-click copy-back to clipboard.
- Default destination is the browser Downloads folder.
- Optional folder picker via File System Access API where supported. Arbitrary silent writes are out of scope.

### 2. Image Finishing (`/finish`)

Legitimate visual edits only:

- Crop, resize, rotate, flip.
- Color and lighting (brightness, contrast, saturation).
- Solid-color background replacement for images with simple transparency.
- Text / color overlays.
- Format conversion and marketing export presets (square, story, landscape).

**Excluded:** SynthID removal, watermark stripping, detector evasion, provenance forgery, or any claim that an image is human-created.

### 3. Markdown to PDF (`/markdown`)

- Paste Markdown or open a `.md` file.
- Live preview with headings, lists, tables, task lists, fenced code, local images, and links.
- Page size, margins, theme, header/footer, optional table of contents.
- HTML is sanitized before render.
- Primary export: browser print / Save as PDF (searchable, high-quality typography).
- Fallback: client-side generated PDF for one-click download.

### 4. Local Notes (`/notes`)

- Fast scratchpad with automatic persistence.
- Titles, search, pinning, Markdown preview.
- Stored only in this browser (IndexedDB).
- Export / import backup.
- Clear warning that browser data can be cleared. No cross-device sync.

### 5. Image Resize and Compress (`/compress`)

- Upload, drag/drop, or paste. Batch supported.
- Exact or maximum dimensions; crop / contain / cover.
- Aspect-ratio and common government/form presets.
- Target byte limits (2 MB, 450 KB, 300 KB, custom).
- Iterative encode for highest practical quality at or below the limit.
- Before/after preview with dimensions and file size.
- JPEG transparency warning. Honest failure when a limit cannot be met.

## Shared experience

- Dashboard with a prominent command/search bar, keyboard navigation, favorites, recents, and categories.
- Dark / light themes, undo/reset, accessible controls, no hidden network activity.
- Installable PWA with an offline shell. Heavy processors load only when a tool is opened.

## Explicit exclusions

- Backend, accounts, cloud sync, analytics, CDNs for user content.
- System-wide clipboard capture (page must be focused).
- Silent writes to arbitrary folders.
- AI watermark / SynthID / C2PA removal or spoofing.
- Claims that processed images will pass AI detectors.

## Acceptance criteria

- Core tools work without sending user content over the network.
- Paste-to-download takes one paste when auto-download is on and the page is focused.
- Image export respects requested dimensions and never exceeds the selected byte limit when reported as successful.
- Notes survive reloads and can be exported and restored.
- Markdown PDF remains selectable/searchable via print, handles tables, code, links, and page breaks.
- Keyboard-usable, responsive on mobile, functional offline after first load.

## Browser support

Current Chrome, Safari, and Firefox on desktop; Chromium and Safari on mobile. Features that require File System Access API degrade gracefully.
