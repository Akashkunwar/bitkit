import { jsPDF } from 'jspdf'
import { extractTitle } from './markdown'

export type PdfOptions = {
  pageSize: 'a4' | 'letter'
  marginMm: number
  header?: string
  footer?: string
}

export async function markdownHtmlToPdf(html: string, source: string, opts: PdfOptions): Promise<Blob> {
  const page = opts.pageSize === 'letter' ? 'letter' : 'a4'
  const doc = new jsPDF({ unit: 'mm', format: page, compress: true })
  const margin = opts.marginMm
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = pageWidth - margin * 2

  const host = document.createElement('div')
  host.innerHTML = html
  const text = (host.innerText || host.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
  const title = extractTitle(source)

  if (opts.header || title) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(opts.header || title, margin, margin)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  const lines = doc.splitTextToSize(text || ' ', maxWidth) as string[]
  let y = margin + 10
  const footerY = pageHeight - margin + 2

  const paintFooter = (pageNum: number) => {
    doc.setFontSize(9)
    const label = opts.footer ? `${opts.footer}  ·  ${pageNum}` : String(pageNum)
    doc.text(label, pageWidth / 2, footerY, { align: 'center' })
    doc.setFontSize(11)
  }

  let pageNum = 1
  paintFooter(pageNum)
  for (const line of lines) {
    if (y > pageHeight - margin - 8) {
      doc.addPage()
      pageNum += 1
      y = margin
      paintFooter(pageNum)
    }
    doc.text(line, margin, y)
    y += 6
  }

  return doc.output('blob')
}
