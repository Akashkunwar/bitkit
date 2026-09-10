# Privacy and Limitations

## Local-processing promise

BitKit processes files and notes in your browser. User images, Markdown, and note text are not uploaded to a server operated by this app. There are no accounts and no analytics in the default build.

You can verify this with the browser network panel: after the app shell has loaded, using a tool should not send the file contents anywhere.

## Permissions

- **Clipboard read** happens only on paste (or an explicit paste button) while the page is focused. HTTPS is required.
- **Camera, microphone, and screen capture** are requested only when you use Screen & camera recorder, QR scan, or Sound meter, and only after a click. Captured media stays in this tab.
- **Notifications** are not requested.
- **Downloads** use the browser download UI. The site cannot silently write to an arbitrary folder.
- **Directory access** (optional) uses the File System Access API. You pick a folder; permission can be revoked in the browser.

## Storage

Notes, favorites, recents, and preferences are stored in IndexedDB under this origin.

This is **not a backup**. Browsers can evict storage when disk is low, when you clear site data, or when you use private browsing. Export notes regularly.

## Clipboard and downloads

A normal website cannot:

- Intercept Ctrl/Cmd+V while another app is focused.
- Force a file into a specific path without a user gesture and, for folders, an explicit picker.

Paste-to-download therefore requires the BitKit tab to be focused. Auto-download still uses the browser’s download behavior (typically the Downloads folder, possibly with a Save dialog depending on settings).

## Images and memory

Very large images (tens of megabytes, huge pixel dimensions) may fail on mobile because of canvas size and RAM limits. The compressor downscales in stages and surfaces a clear error instead of hanging.

HEIC/HEIF support depends on the browser decoder. Animated GIF export is not a first-class path; the first frame may be used.

Canvas re-encoding **strips** most metadata (EXIF, ICC). That is a side effect of re-encoding, not a provenance-evasion feature.

## Recognition engines (OCR and cutout)

OCR (Tesseract) and background cutout (MediaPipe) fetch their WASM and model files from a CDN the first time you allow them. Your image is not uploaded; only the engine files are downloaded. After that, the service worker can reuse those files offline.

## Provenance and AI watermarks (unsupported)

BitKit does **not** remove SynthID, C2PA Content Credentials, or other provenance watermarks, and it does not help images evade AI detectors.

SynthID embeds a signal in pixels and is designed to survive cropping, filters, and lossy compression. Adding a transparent overlay does not reliably hide it. Offering that as a product feature would be misleading and is out of scope.

Image Finishing is for legitimate visual edits (crop, color, resize, overlays) and optional **viewing** of remaining file metadata. If you use AI-assisted assets in marketing, label them appropriately.

## PDF output

Browser **Print → Save as PDF** is the high-quality, searchable path. Layout can differ slightly by browser.

The one-click PDF download is a best-effort client-side render. It may not be pixel-identical to print output and may rasterize some elements.

Custom webfonts in print depend on the browser having loaded the bundled fonts.

## Office file conversion

Word, PowerPoint, and Excel files are ZIP containers of XML. BitKit reads that XML directly in the tab — there is no conversion service and nothing is uploaded — which also fixes the ceiling on fidelity.

What comes across: text, heading levels, bold and italic, bulleted and numbered lists, tables, and explicit page breaks. What does not: images, text boxes, columns, headers and footers, footnotes, fonts, colour, and exact page geometry. A `.pptx` is read as a text outline, one heading and bullet list per slide — not a picture of the deck. Legacy `.doc`, `.ppt`, and `.xls` (the pre-2007 binary formats) are not readable; re-save them as the modern format first.

The one-click PDF export draws text with the PDF standard fonts, which are Latin-1 only. Devanagari, CJK, and similar scripts cannot be drawn that way, so the tool detects them and points at **Print → Save as PDF**, where the browser embeds its own fonts.

## PDF to Word and text

A PDF stores positioned glyphs, not paragraphs. Structure is therefore *inferred*: lines from y positions, paragraphs from the leading between them, headings from type size, lists from the leading character, and tables from columns that line up across consecutive rows. It reconstructs the words reliably and the structure usually; it never recovers the original Word file.

A scanned PDF has no text layer at all. The tool detects that and sends you to OCR rather than handing back an empty document.

## PDF watermarks are not protection

The watermark, page numbers, and running heads are drawn over the existing page content. The original text stays selectable, and the marks can be removed by anyone with a PDF editor. Treat a watermark as a label, not as a security control.

BitKit cannot encrypt a PDF or remove an existing password — it has no way to crack one, and it does not claim to. Encrypted files are flagged so you know why the output may look wrong.

## ZIP archives

Archives are written **stored**, not deflated. For the usual payload — JPEGs, PNGs, PDFs, MP4s — that costs nothing, because those are already compressed. A folder of text files will not shrink.

Reading handles standard stored and deflated entries. Encrypted ZIPs and other archive formats (`.rar`, `.7z`, `.tar.gz`) are not supported.

## Offline

After the first successful load, the service worker serves the app shell and JS chunks from cache. Opening the site for the first time still needs a network connection.
