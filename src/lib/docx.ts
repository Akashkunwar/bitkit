/**
 * Word (.docx) in and out, without a conversion service.
 *
 * A .docx is a ZIP of XML parts. We read `word/document.xml` for the text,
 * `word/numbering.xml` to tell a numbered list from a bulleted one, and drop
 * everything else — images, floats, columns, fonts. That is a deliberate
 * limit, not an oversight: the tool promises the text, its structure, and its
 * emphasis, and the UI says exactly that.
 */
import { zipStore } from './zip'
import { unzip } from './zipRead'
import type { DocBlock, Run } from './docBlocks'

const enc = new TextEncoder()

// Control characters are illegal in XML 1.0 and make Word refuse the file.
const ILLEGAL_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replace(ILLEGAL_XML, '')
}

// --- reading ---

function children(el: Element, local: string): Element[] {
  return [...el.children].filter((child) => child.localName === local)
}

function firstChild(el: Element, local: string): Element | null {
  return children(el, local)[0] ?? null
}

/** Depth-first descendants with one of these local names, in document order. */
function descendants(el: Element, locals: string[]): Element[] {
  const out: Element[] = []
  const visit = (node: Element) => {
    for (const child of [...node.children]) {
      if (locals.includes(child.localName)) out.push(child)
      else visit(child)
    }
  }
  visit(el)
  return out
}

function attr(el: Element | null, name: string): string | null {
  if (!el) return null
  for (const a of [...el.attributes]) {
    if (a.localName === name) return a.value
  }
  return null
}

/** Word writes `<w:b/>` for on and `<w:b w:val="0"/>` for off. */
function toggled(rPr: Element | null, name: string): boolean {
  if (!rPr) return false
  const el = firstChild(rPr, name)
  if (!el) return false
  const val = attr(el, 'val')
  return val === null || !['0', 'false', 'off'].includes(val)
}

function runsOfParagraph(p: Element): Run[] {
  const out: Run[] = []
  for (const r of descendants(p, ['r'])) {
    const rPr = firstChild(r, 'rPr')
    const bold = toggled(rPr, 'b')
    const italic = toggled(rPr, 'i')
    let text = ''
    for (const node of descendants(r, ['t', 'tab', 'br', 'noBreakHyphen'])) {
      if (node.localName === 't') text += node.textContent ?? ''
      else if (node.localName === 'tab') text += '\t'
      else if (node.localName === 'noBreakHyphen') text += '-'
      else text += ' '
    }
    if (!text) continue
    const last = out[out.length - 1]
    if (last && !!last.bold === bold && !!last.italic === italic) last.text += text
    else out.push({ text, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) })
  }
  return out.filter((run) => run.text.length)
}

type Numbering = Map<string, boolean>

function readNumbering(xml: string | null): Numbering {
  const map: Numbering = new Map()
  if (!xml) return map
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const root = doc.documentElement
  if (!root || root.localName === 'parsererror') return map

  const abstractOrdered = new Map<string, Map<string, boolean>>()
  for (const abs of children(root, 'abstractNum')) {
    const id = attr(abs, 'abstractNumId')
    if (id === null) continue
    const levels = new Map<string, boolean>()
    for (const lvl of children(abs, 'lvl')) {
      const ilvl = attr(lvl, 'ilvl') ?? '0'
      const fmt = attr(firstChild(lvl, 'numFmt'), 'val') ?? 'bullet'
      levels.set(ilvl, fmt !== 'bullet' && fmt !== 'none')
    }
    abstractOrdered.set(id, levels)
  }
  for (const num of children(root, 'num')) {
    const numId = attr(num, 'numId')
    const absId = attr(firstChild(num, 'abstractNumId'), 'val')
    if (numId === null || absId === null) continue
    for (const [ilvl, ordered] of abstractOrdered.get(absId) ?? []) map.set(`${numId}:${ilvl}`, ordered)
  }
  return map
}

const HEADING = /^heading\s*([1-9])$/i

function headingLevel(style: string | null): 1 | 2 | 3 | 4 | null {
  if (!style) return null
  const normalised = style.replace(/([a-z])([A-Z0-9])/g, '$1 $2').trim()
  if (/^title$/i.test(normalised)) return 1
  if (/^subtitle$/i.test(normalised)) return 2
  const match = normalised.match(HEADING)
  if (!match) return null
  return Math.min(4, Number(match[1])) as 1 | 2 | 3 | 4
}

function cellText(tc: Element): string {
  return children(tc, 'p')
    .map((p) => runsOfParagraph(p).map((r) => r.text).join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tableBlock(tbl: Element): DocBlock | null {
  const rows: string[][] = []
  let boldFirst = true
  children(tbl, 'tr').forEach((tr, index) => {
    const cells = children(tr, 'tc')
    if (!cells.length) return
    rows.push(cells.map(cellText))
    if (index === 0) {
      const runs = cells.flatMap((tc) => children(tc, 'p').flatMap(runsOfParagraph))
      const filled = runs.filter((r) => r.text.trim())
      boldFirst = filled.length > 0 && filled.every((r) => r.bold)
    }
  })
  if (!rows.length) return null
  return { kind: 'table', rows, header: rows.length > 1 && boldFirst }
}

export function docxBlocksFromXml(documentXml: string, numberingXml: string | null = null): DocBlock[] {
  const doc = new DOMParser().parseFromString(documentXml, 'application/xml')
  const root = doc.documentElement
  if (!root || root.localName === 'parsererror') throw new Error('That .docx has an unreadable document part.')
  const body = descendants(root, ['body'])[0] ?? root
  const numbering = readNumbering(numberingXml)

  const out: DocBlock[] = []
  const counters = new Map<string, number>()

  for (const node of [...body.children]) {
    if (node.localName === 'tbl') {
      counters.clear()
      const table = tableBlock(node)
      if (table) out.push(table)
      continue
    }
    if (node.localName !== 'p') continue

    const pPr = firstChild(node, 'pPr')
    if (pPr && firstChild(pPr, 'pageBreakBefore')) out.push({ kind: 'break' })
    const explicitBreak = descendants(node, ['br']).some((br) => attr(br, 'type') === 'page')

    const runs = runsOfParagraph(node)
    const style = attr(pPr ? firstChild(pPr, 'pStyle') : null, 'val')
    const numPr = pPr ? firstChild(pPr, 'numPr') : null

    if (!runs.length) {
      if (explicitBreak) out.push({ kind: 'break' })
      continue
    }

    const level = headingLevel(style)
    if (level) {
      counters.clear()
      out.push({ kind: 'h', level, runs })
    } else if (numPr) {
      const numId = attr(firstChild(numPr, 'numId'), 'val') ?? '0'
      const ilvl = attr(firstChild(numPr, 'ilvl'), 'val') ?? '0'
      const depth = Math.min(4, Number(ilvl) || 0)
      const ordered = numbering.get(`${numId}:${ilvl}`) ?? false
      let marker = '•'
      if (ordered) {
        const key = `${numId}:${ilvl}`
        const next = (counters.get(key) ?? 0) + 1
        counters.set(key, next)
        // A fresh item at this level restarts every level nested under it.
        for (const other of [...counters.keys()]) {
          if (other.startsWith(`${numId}:`) && Number(other.split(':')[1]) > depth) counters.delete(other)
        }
        marker = `${next}.`
      }
      out.push({ kind: 'li', runs, depth, marker })
    } else {
      counters.clear()
      out.push({ kind: 'p', runs })
    }
    if (explicitBreak) out.push({ kind: 'break' })
  }
  return out
}

export async function readDocx(bytes: Uint8Array): Promise<DocBlock[]> {
  const files = await unzip(bytes)
  const decoder = new TextDecoder()
  const main = files.find((f) => f.name === 'word/document.xml')
  if (!main) {
    throw new Error(
      'That file is not a Word .docx (no word/document.xml inside). A legacy .doc has to be re-saved as .docx first.',
    )
  }
  const numbering = files.find((f) => f.name === 'word/numbering.xml')
  return docxBlocksFromXml(decoder.decode(main.data), numbering ? decoder.decode(numbering.data) : null)
}

/** Text of every slide in a .pptx, in order. Text only — shapes are not laid out. */
export async function readPptxOutline(bytes: Uint8Array): Promise<DocBlock[]> {
  const files = await unzip(bytes)
  const decoder = new TextDecoder()
  const slides = files
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f.name))
    .sort((a, b) => Number(/(\d+)/.exec(a.name)![1]) - Number(/(\d+)/.exec(b.name)![1]))
  if (!slides.length) throw new Error('That file is not a PowerPoint .pptx (no slides inside).')

  const out: DocBlock[] = []
  slides.forEach((slide, index) => {
    if (index > 0) out.push({ kind: 'break' })
    out.push({ kind: 'h', level: 2, runs: [{ text: `Slide ${index + 1}` }] })
    const doc = new DOMParser().parseFromString(decoder.decode(slide.data), 'application/xml')
    if (!doc.documentElement || doc.documentElement.localName === 'parsererror') return
    for (const para of descendants(doc.documentElement, ['p'])) {
      const text = descendants(para, ['t'])
        .map((t) => t.textContent ?? '')
        .join('')
        .trim()
      if (text) out.push({ kind: 'li', runs: [{ text }], depth: 0, marker: '•' })
    }
  })
  return out
}

// --- writing ---

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

/** Half-point sizes, matching Word's own heading scale closely enough. */
const HEADING_SIZES = [32, 26, 22, 20]

function stylesXml(): string {
  const headings = HEADING_SIZES.map(
    (size, i) =>
      `<w:style w:type="paragraph" w:styleId="Heading${i + 1}"><w:name w:val="heading ${i + 1}"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="${i}"/><w:spacing w:before="${240 - i * 40}" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`,
  ).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${headings}<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/></w:rPr></w:style></w:styles>`
}

function runXml(run: Run): string {
  const props: string[] = []
  if (run.bold) props.push('<w:b/>')
  if (run.italic) props.push('<w:i/>')
  if (run.mono) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>')
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
  // xml:space="preserve" keeps the spaces between styled runs from collapsing.
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`
}

function paragraphXml(runs: Run[], pPr = ''): string {
  return `<w:p>${pPr}${runs.map(runXml).join('')}</w:p>`
}

function tableXml(rows: string[][], header: boolean): string {
  const cols = Math.max(...rows.map((row) => row.length))
  const width = Math.floor(9360 / cols)
  const borders =
    '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="C8C8C8"/><w:left w:val="single" w:sz="4" w:color="C8C8C8"/><w:bottom w:val="single" w:sz="4" w:color="C8C8C8"/><w:right w:val="single" w:sz="4" w:color="C8C8C8"/><w:insideH w:val="single" w:sz="4" w:color="C8C8C8"/><w:insideV w:val="single" w:sz="4" w:color="C8C8C8"/></w:tblBorders>'
  const grid = `<w:tblGrid>${new Array(cols).fill(`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>`
  const body = rows
    .map((row, r) => {
      const bold = header && r === 0
      const cells = new Array(cols)
        .fill(0)
        .map((_, c) => {
          const shade = bold ? '<w:shd w:val="clear" w:fill="F1F4F4"/>' : ''
          const text = paragraphXml(row[c] ? [{ text: row[c], ...(bold ? { bold: true } : {}) }] : [])
          return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shade}</w:tcPr>${text}</w:tc>`
        })
        .join('')
      const trPr = bold ? '<w:trPr><w:tblHeader/></w:trPr>' : ''
      return `<w:tr>${trPr}${cells}</w:tr>`
    })
    .join('')
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${borders}</w:tblPr>${grid}${body}</w:tbl>`
}

function bodyXml(blocks: DocBlock[]): string {
  const out: string[] = []
  for (const block of blocks) {
    if (block.kind === 'h') {
      out.push(paragraphXml(block.runs, `<w:pPr><w:pStyle w:val="Heading${block.level}"/></w:pPr>`))
    } else if (block.kind === 'p') {
      out.push(paragraphXml(block.runs, '<w:pPr><w:spacing w:after="120"/></w:pPr>'))
    } else if (block.kind === 'li') {
      const indent = 360 + block.depth * 360
      out.push(
        paragraphXml(
          [{ text: `${block.marker} ` }, ...block.runs],
          `<w:pPr><w:ind w:left="${indent}" w:hanging="360"/><w:spacing w:after="60"/></w:pPr>`,
        ),
      )
    } else if (block.kind === 'pre') {
      for (const line of block.text.split('\n')) {
        out.push(paragraphXml([{ text: line || ' ', mono: true }], '<w:pPr><w:pStyle w:val="Code"/></w:pPr>'))
      }
    } else if (block.kind === 'table') {
      out.push(tableXml(block.rows, block.header))
      // Word needs a paragraph after a table, or adjacent tables merge into one.
      out.push('<w:p/>')
    } else {
      out.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    }
  }
  if (!out.length) out.push('<w:p/>')
  return out.join('')
}

export function buildDocx(blocks: DocBlock[]): Uint8Array {
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml(blocks)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`
  return zipStore([
    { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(DOC_RELS) },
    { name: 'word/styles.xml', data: enc.encode(stylesXml()) },
    { name: 'word/document.xml', data: enc.encode(document) },
  ])
}
