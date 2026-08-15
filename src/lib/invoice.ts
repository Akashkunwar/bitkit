import { jsPDF } from 'jspdf'

export type LineItem = {
  id: string
  description: string
  quantity: number
  rate: number
}

export type Invoice = {
  title: string
  number: string
  date: string
  dueDate: string
  currency: string
  from: string
  billTo: string
  items: LineItem[]
  taxLabel: string
  taxPercent: number
  discount: number
  notes: string
}

let counter = 0
export function itemId(): string {
  counter += 1
  return `li${Date.now().toString(36)}${counter}`
}

export function emptyInvoice(): Invoice {
  const today = new Date().toISOString().slice(0, 10)
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)
  return {
    title: 'Invoice',
    number: `INV-${new Date().getFullYear()}-001`,
    date: today,
    dueDate: due,
    currency: '₹',
    from: 'Your name\nStreet, City\nemail@example.com',
    billTo: 'Client name\nCompany\nCity',
    items: [
      { id: itemId(), description: 'Design work', quantity: 10, rate: 1500 },
      { id: itemId(), description: 'Revisions', quantity: 2, rate: 900 },
    ],
    taxLabel: 'GST 18%',
    taxPercent: 18,
    discount: 0,
    notes: 'Payment due within 14 days.',
  }
}

export type Totals = { subtotal: number; discount: number; tax: number; total: number }

export function totalsOf(invoice: Invoice): Totals {
  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const discount = (subtotal * (invoice.discount || 0)) / 100
  const taxable = subtotal - discount
  const tax = (taxable * (invoice.taxPercent || 0)) / 100
  return { subtotal, discount, tax, total: taxable + tax }
}

export function money(amount: number, currency: string): string {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${currency}${formatted}`
}

/**
 * jsPDF's built-in fonts are Latin-1 only, so a rupee sign (or any non-Latin-1
 * glyph) would render as garbage. Swapping in an ASCII code keeps the document
 * readable rather than silently corrupt.
 */
function pdfSafeCurrency(currency: string): string {
  const map: Record<string, string> = { '₹': 'Rs. ', '€': 'EUR ', '£': 'GBP ', '¥': 'JPY ', $: '$' }
  if (map[currency]) return map[currency]
  // eslint-disable-next-line no-control-regex
  return /^[\u0020-\u00ff]*$/.test(currency) ? currency : `${currency.replace(/[^\u0020-\u00ff]/g, '')} `
}

export function invoicePdf(invoice: Invoice): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const currency = pdfSafeCurrency(invoice.currency)
  const totals = totalsOf(invoice)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const right = pageWidth - margin
  const amount = (n: number) => `${currency}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(invoice.title || 'Invoice', margin, margin + 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`No. ${invoice.number}`, right, margin, { align: 'right' })
  doc.text(`Date: ${invoice.date}`, right, margin + 5, { align: 'right' })
  if (invoice.dueDate) doc.text(`Due: ${invoice.dueDate}`, right, margin + 10, { align: 'right' })

  let y = margin + 20
  doc.setFont('helvetica', 'bold')
  doc.text('From', margin, y)
  doc.text('Bill to', pageWidth / 2, y)
  doc.setFont('helvetica', 'normal')
  const fromLines = doc.splitTextToSize(invoice.from || '', pageWidth / 2 - margin - 6) as string[]
  const toLines = doc.splitTextToSize(invoice.billTo || '', pageWidth / 2 - margin - 6) as string[]
  doc.text(fromLines, margin, y + 5)
  doc.text(toLines, pageWidth / 2, y + 5)
  y += 5 + Math.max(fromLines.length, toLines.length) * 4.6 + 8

  const colQty = right - 78
  const colRate = right - 48
  const colAmount = right

  doc.setDrawColor(200)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', margin, y)
  doc.text('Qty', colQty, y, { align: 'right' })
  doc.text('Rate', colRate, y, { align: 'right' })
  doc.text('Amount', colAmount, y, { align: 'right' })
  y += 2
  doc.line(margin, y, right, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  for (const item of invoice.items) {
    if (y > pageHeight - 60) {
      doc.addPage()
      y = margin
    }
    const lines = doc.splitTextToSize(item.description || '', colQty - margin - 8) as string[]
    doc.text(lines, margin, y)
    doc.text(String(item.quantity), colQty, y, { align: 'right' })
    doc.text(amount(item.rate), colRate, y, { align: 'right' })
    doc.text(amount(item.quantity * item.rate), colAmount, y, { align: 'right' })
    y += Math.max(1, lines.length) * 4.6 + 2
  }

  y += 2
  doc.line(colQty - 10, y, right, y)
  y += 6

  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(label, colRate, y, { align: 'right' })
    doc.text(value, colAmount, y, { align: 'right' })
    y += 5.5
  }
  row('Subtotal', amount(totals.subtotal))
  if (totals.discount) row(`Discount ${invoice.discount}%`, `-${amount(totals.discount)}`)
  if (totals.tax) row(invoice.taxLabel || 'Tax', amount(totals.tax))
  y += 1
  doc.setFontSize(12)
  row('Total', amount(totals.total), true)
  doc.setFontSize(10)

  if (invoice.notes) {
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', margin, y)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(invoice.notes, right - margin) as string[]
    doc.text(noteLines, margin, y + 5)
  }

  return doc.output('blob')
}
