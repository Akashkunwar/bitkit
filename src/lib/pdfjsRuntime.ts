/**
 * The one place pdf.js is loaded and its worker configured.
 *
 * This is the "legacy" build on purpose. pdf.js 6's modern build calls very
 * new built-ins (Map.prototype.getOrInsertComputed, among others) and fails
 * to render a single page in current Safari, Firefox ESR, and Chromium a few
 * releases old. The legacy build ships the polyfills for exactly those, at a
 * small size cost, for a tool people open expecting it to just work.
 *
 * Import `pdfjs` from here instead of 'pdfjs-dist' so the worker is always
 * set before the first document opens.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjs }
