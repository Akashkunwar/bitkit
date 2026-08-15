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

## Phase 5 — Expansion (backlog only)

Add tools only when they are high-frequency. Do not ship dozens of shallow utilities.

### Image

- Format conversion as a dedicated tool
- Passport-photo sheet
- On-device background remover
- Favicon / app-icon generator
- Color picker from image
- Metadata viewer (read-only)

### PDF

- Merge, split, reorder, rotate
- Image to PDF / PDF to images
- Simple form filling

### Text / developer

- Word / character count
- Case conversion and whitespace cleanup
- JSON formatter / validator
- Diff
- Base64 / URL tools
- UUID / hash generator
- Regex tester

### Daily

- QR generate / read
- Unit and timezone conversion
- Percentage calculator
- Password generator
- Color palette / contrast checker
- Timestamp converter

## Non-goals (do not schedule)

- SynthID / watermark / detector evasion
- Cloud sync or accounts in the frontend-only product
- System-wide clipboard daemon (would need a native app or extension)
