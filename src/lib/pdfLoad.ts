import { PDFDocument } from 'pdf-lib'

export async function loadPdf(bytes: Uint8Array): Promise<{ doc: PDFDocument; encrypted: boolean }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return { doc, encrypted: Boolean(doc.isEncrypted) }
}

export function encryptionWarning(
  encrypted: boolean,
  mode: 'pdf-lib' | 'pdfjs' = 'pdf-lib',
): string | null {
  if (!encrypted) return null
  if (mode === 'pdfjs') {
    return 'This PDF is encrypted. Enter the password to open it in this tab. BitKit cannot crack passwords, and the password is not sent anywhere.'
  }
  return 'This PDF is encrypted. BitKit cannot decrypt it, so pages may come out blank or garbled. Unlock it in a PDF reader first if the result looks wrong.'
}
