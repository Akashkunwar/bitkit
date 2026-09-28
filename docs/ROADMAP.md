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

## Phase 7 — Redesign and conversion depth (shipped)

A new interface, and the conversions people ask for by name.

- **Interface.** A new design system across five themes (ink-and-highlighter palette, category-tinted icons), a full-height sidebar that can be hidden, a ⌘K command palette, a home page with smart file drop, and tool pages with breadcrumbs, pinning, and related tools.
- **Documents.** Images to PDF rebuilt around a sortable grid with page setup; PDF to images; Word to image with an exact-look PDF; Markdown to PDF rebuilt around themed, paginated output.
- **Images.** Image converter, Rotate & flip, Image collage, Screenshot frame.
- **Calculators.** Scientific calculator, Unit converter (16 quantities), Finance calculators (EMI, SIP, compound interest, CAGR, discounts).
- **More.** Barcode generator, Text to speech.
- **Engineering.** ESLint and Prettier in CI, pdf.js on its legacy build for browser coverage, send-to targets derived from the registry, and a ranked token search.

## Non-goals (do not schedule)

- SynthID / watermark / detector evasion
- Cloud sync or accounts in the frontend-only product
- System-wide clipboard daemon (would need a native app or extension)
- PDF encryption or password removal — pdf-lib cannot encrypt, and cracking a password is not something this app should do
- Pixel-identical Word or PowerPoint rendering. Word to image renders a close layout through docx-preview and says plainly where it can differ (substituted fonts, pagination for files not saved by Word); matching Word exactly needs Word's own layout engine.
