import type { DocBlock, Run } from './docBlocks'
import { blocksToPdf, type PdfOptions } from './docPdf'
import { extractTitle } from './markdown'

export type { PdfOptions }

type Inline = { bold: boolean; italic: boolean; mono: boolean }

const BASE: Inline = { bold: false, italic: false, mono: false }

function inlineFor(tag: string, current: Inline): Inline {
  if (tag === 'strong' || tag === 'b') return { ...current, bold: true }
  if (tag === 'em' || tag === 'i') return { ...current, italic: true }
  if (tag === 'code' || tag === 'kbd' || tag === 'samp') return { ...current, mono: true }
  return current
}

function collectRuns(node: Node, style: Inline, out: Run[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ')
    if (text) out.push({ text, ...(style.bold ? { bold: true } : {}), ...(style.italic ? { italic: true } : {}), ...(style.mono ? { mono: true } : {}) })
    return
  }
  if (!(node instanceof HTMLElement)) return
  const tag = node.tagName.toLowerCase()
  if (tag === 'br') {
    out.push({ text: ' ' })
    return
  }
  const next = inlineFor(tag, style)
  node.childNodes.forEach((child) => collectRuns(child, next, out))
}

function runsFrom(node: HTMLElement): Run[] {
  const out: Run[] = []
  collectRuns(node, BASE, out)
  // Collapse the runs so a paragraph of plain text is one segment, not a hundred.
  const merged: Run[] = []
  for (const run of out) {
    const last = merged[merged.length - 1]
    if (last && !!last.bold === !!run.bold && !!last.italic === !!run.italic && !!last.mono === !!run.mono) {
      last.text += run.text
    } else {
      merged.push({ ...run })
    }
  }
  const trimmed = merged.filter((r) => r.text.length)
  if (trimmed.length) {
    trimmed[0].text = trimmed[0].text.replace(/^\s+/, '')
    trimmed[trimmed.length - 1].text = trimmed[trimmed.length - 1].text.replace(/\s+$/, '')
  }
  return trimmed.filter((r) => r.text.length)
}

function walk(node: Node, out: DocBlock[], depth: number): void {
  if (node.nodeType === Node.TEXT_NODE) return
  if (!(node instanceof HTMLElement)) {
    node.childNodes.forEach((child) => walk(child, out, depth))
    return
  }
  const tag = node.tagName.toLowerCase()

  if (/^h[1-6]$/.test(tag)) {
    const runs = runsFrom(node)
    if (runs.length) out.push({ kind: 'h', level: Math.min(4, Number(tag[1])) as 1 | 2 | 3 | 4, runs })
    return
  }
  if (tag === 'pre') {
    const text = (node.innerText || node.textContent || '').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '')
    if (text) out.push({ kind: 'pre', text })
    return
  }
  if (tag === 'ul' || tag === 'ol') {
    const ordered = tag === 'ol'
    let index = 1
    for (const child of [...node.children]) {
      if (child.tagName.toLowerCase() !== 'li') continue
      const li = child as HTMLElement
      const nested = [...li.children].filter((el) => /^(ul|ol)$/i.test(el.tagName))
      const clone = li.cloneNode(true) as HTMLElement
      clone.querySelectorAll('ul,ol').forEach((el) => el.remove())
      const runs = runsFrom(clone)
      if (runs.length) {
        out.push({ kind: 'li', runs, depth, marker: ordered ? `${index}.` : '•' })
        index += 1
      }
      for (const sub of nested) walk(sub, out, depth + 1)
    }
    return
  }
  if (tag === 'table') {
    const rows: string[][] = []
    let header = false
    node.querySelectorAll('tr').forEach((tr, i) => {
      const cells = [...tr.querySelectorAll('th,td')].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
      if (!cells.length) return
      if (i === 0 && tr.querySelector('th')) header = true
      rows.push(cells)
    })
    if (rows.length) out.push({ kind: 'table', rows, header })
    return
  }
  if (tag === 'hr') {
    out.push({ kind: 'break' })
    return
  }
  if (tag === 'p' || tag === 'blockquote' || tag === 'figcaption') {
    const runs = runsFrom(node)
    if (runs.length) out.push({ kind: 'p', runs })
    return
  }
  node.childNodes.forEach((child) => walk(child, out, depth))
}

/** Parses rendered HTML into the shared block model. */
export function blocksFromHtml(html: string): DocBlock[] {
  const host = document.createElement('div')
  host.innerHTML = html
  const out: DocBlock[] = []
  walk(host, out, 0)
  if (!out.length) {
    const text = (host.innerText || host.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
    if (text) out.push({ kind: 'p', runs: [{ text }] })
  }
  return out
}

export async function markdownHtmlToPdf(html: string, source: string, opts: PdfOptions): Promise<Blob> {
  return blocksToPdf(blocksFromHtml(html), { ...opts, title: opts.header || extractTitle(source) })
}
