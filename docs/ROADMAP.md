# Roadmap

## Phase 1 — Foundation (this repo)

- Product, privacy, architecture, and roadmap docs.
- Design tokens, app shell, command bar, shared tool layout.
- Tool registry, routing, theme, PWA shell.

## Phase 2 — MVP A

- Clipboard image download.
- Image resize / compress (presets, batch, byte targets).
- Local notes (IndexedDB, search, pin, export/import).

## Phase 3 — MVP B

- Markdown to PDF (preview, print, client-side fallback).
- Image finishing (crop, rotate, color, overlay, export presets).

## Phase 4 — Hardening

- Worker performance and large-file safeguards.
- Accessibility (keyboard, contrast, reduced motion).
- Offline and cross-browser fallbacks (Chrome, Safari, Firefox).
- Processor, sanitization, storage, and privacy tests.

## Phase 5 — Expansion (shipped)

The original backlog is in the registry. Do not add tools unless they are high-frequency and cannot be a mode on an existing one.

Shipped: passport sheet, cutout, favicon, color picker, EXIF, PDF merge/split, image↔PDF, form fill, QR generate/read, JSON/diff/encode/regex, convert (time/units/percent/GST), password/UUID.

## Phase 6 — Document conversion (shipped)

The gap people actually hit: they arrive with a Word file, a stack of PDFs, or a PDF they need the text out of, and every other answer is an upload.

Shipped: Office to PDF (`.docx`, `.pptx`, `.xlsx`, `.csv`, `.rtf`, `.html`, `.md`, `.txt`), PDF to Word & text (`.docx`, Markdown, plain text), watermark / page numbers / Bates numbering / running heads, and a ZIP archive tool. All four share one document model (`src/lib/docBlocks.ts`), so every reader gains every writer.

## Non-goals (do not schedule)

- SynthID / watermark / detector evasion
- Cloud sync or accounts in the frontend-only product
- System-wide clipboard daemon (would need a native app or extension)
- PDF encryption or password removal — pdf-lib cannot encrypt, and cracking a password is not something this app should do
- Pixel-faithful Word or PowerPoint rendering — that needs a layout engine, and half-doing it would misrepresent the output
