# Privacy and Limitations

## Local-processing promise

BitKit processes files and notes in your browser. User images, Markdown, and note text are not uploaded to a server operated by this app. There are no accounts and no analytics in the default build.

You can verify this with the browser network panel: after the app shell has loaded, using a tool should not send the file contents anywhere.

## Permissions

- **Clipboard read** happens only on paste (or an explicit paste button) while the page is focused. HTTPS is required.
- **Downloads** use the browser download UI. The site cannot silently write to an arbitrary folder.
- **Directory access** (optional) uses the File System Access API. You pick a folder; permission can be revoked in the browser.
- **Notifications / camera / microphone** are not requested.

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

## Provenance and AI watermarks (unsupported)

BitKit does **not** remove SynthID, C2PA Content Credentials, or other provenance watermarks, and it does not help images evade AI detectors.

SynthID embeds a signal in pixels and is designed to survive cropping, filters, and lossy compression. Adding a transparent overlay does not reliably hide it. Offering that as a product feature would be misleading and is out of scope.

Image Finishing is for legitimate visual edits (crop, color, resize, overlays) and optional **viewing** of remaining file metadata. If you use AI-assisted assets in marketing, label them appropriately.

## PDF output

Browser **Print → Save as PDF** is the high-quality, searchable path. Layout can differ slightly by browser.

The one-click PDF download is a best-effort client-side render. It may not be pixel-identical to print output and may rasterize some elements.

Custom webfonts in print depend on the browser having loaded the bundled fonts.

## Offline

After the first successful load, the service worker serves the app shell and JS chunks from cache. Opening the site for the first time still needs a network connection.
