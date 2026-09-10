import type { PDFDocumentProxy } from 'pdfjs-dist'

type PdfJsModule = {
  getDocument: (src: { data: Uint8Array; password?: string }) => { promise: Promise<PDFDocumentProxy> }
}

export class PdfPasswordError extends Error {
  readonly kind: 'needed' | 'incorrect'

  constructor(kind: 'needed' | 'incorrect') {
    super(kind === 'incorrect' ? 'That password is wrong.' : 'This PDF needs a password.')
    this.name = 'PdfPasswordError'
    this.kind = kind
  }
}

export function isPdfPasswordError(err: unknown): err is PdfPasswordError {
  return err instanceof PdfPasswordError
}

function passwordKind(err: unknown, hadPassword: boolean): 'needed' | 'incorrect' | null {
  if (!err || typeof err !== 'object') return null
  const name = 'name' in err ? String(err.name) : ''
  const message = 'message' in err ? String(err.message) : ''
  const code = 'code' in err ? Number(err.code) : 0
  if (name === 'PasswordException' || /password/i.test(message) || code === 1 || code === 2) {
    return hadPassword || code === 2 || /incorrect|invalid/i.test(message) ? 'incorrect' : 'needed'
  }
  return null
}

/** Open a PDF with pdf.js. Copies the buffer because pdf.js transfers (detaches) it. */
export async function openPdfJs(
  pdfjs: PdfJsModule,
  data: Uint8Array,
  password?: string,
): Promise<PDFDocumentProxy> {
  try {
    return await pdfjs.getDocument({
      data: data.slice(),
      password: password || undefined,
    }).promise
  } catch (err) {
    const kind = passwordKind(err, Boolean(password))
    if (kind) throw new PdfPasswordError(kind)
    throw err
  }
}

export async function destroyPdfJs(doc: PDFDocumentProxy | null | undefined): Promise<void> {
  if (!doc) return
  try {
    await doc.cleanup()
  } catch {
    /* already torn down */
  }
}
