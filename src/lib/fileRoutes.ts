import { getTool, type ToolMeta } from '../registry'

/**
 * Which tools can do something useful with a set of dropped files, best first.
 *
 * `suggestPath` in handoff.ts picks the single default destination for OS
 * "open with" and share-target launches; this is the wider menu shown when a
 * person drops files on Home and chooses for themselves.
 */

type Kind =
  | 'image'
  | 'svg'
  | 'pdf'
  | 'word'
  | 'office'
  | 'sheet'
  | 'markdown'
  | 'json'
  | 'config'
  | 'text'
  | 'html'
  | 'zip'
  | 'video'
  | 'audio'
  | 'other'

export function kindOf(file: File): Kind {
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? name.split('.').pop()! : ''
  const type = file.type
  if (type === 'image/svg+xml' || ext === 'svg') return 'svg'
  if (type.startsWith('image/') || /^(png|jpe?g|webp|gif|bmp|avif|heic|heif|tiff?|ico)$/.test(ext)) return 'image'
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'word'
  if (/^(pptx|rtf|odt)$/.test(ext)) return 'office'
  if (/^(xlsx|csv|tsv)$/.test(ext) || type === 'text/csv') return 'sheet'
  if (/^(md|markdown)$/.test(ext) || type === 'text/markdown') return 'markdown'
  if (ext === 'json' || type === 'application/json') return 'json'
  if (/^(ya?ml|toml)$/.test(ext)) return 'config'
  if (/^html?$/.test(ext) || type === 'text/html') return 'html'
  if (ext === 'zip' || type === 'application/zip') return 'zip'
  if (type.startsWith('video/') || /^(mp4|webm|mov|mkv)$/.test(ext)) return 'video'
  if (type.startsWith('audio/') || /^(mp3|wav|ogg|m4a|flac)$/.test(ext)) return 'audio'
  if (type.startsWith('text/') || /^(txt|log)$/.test(ext)) return 'text'
  return 'other'
}

const SINGLE: Record<Kind, string[]> = {
  image: [
    'image-convert',
    'compress',
    'rotate-flip',
    'image-pdf',
    'finish',
    'cutout',
    'exif',
    'ocr',
    'picker',
    'meme',
    'favicon',
    'passport',
    'carousel',
    'frame',
  ],
  svg: ['svg', 'image-convert', 'favicon', 'compress'],
  pdf: ['pdf-images', 'pdf', 'pages', 'shrink', 'pdf-text', 'stamp', 'forms'],
  word: ['doc-image', 'office'],
  office: ['office', 'doc-image'],
  sheet: ['table', 'chart', 'office', 'doc-image'],
  markdown: ['markdown', 'doc-image', 'office', 'readability', 'counter'],
  json: ['json', 'config', 'table'],
  config: ['config'],
  text: ['counter', 'readability', 'speech', 'text', 'office', 'doc-image'],
  html: ['office', 'doc-image'],
  zip: ['archive'],
  video: ['media'],
  audio: ['media'],
  other: [],
}

const MANY: Partial<Record<Kind, string[]>> = {
  image: ['image-pdf', 'collage', 'image-convert', 'compress', 'rotate-flip'],
  svg: ['image-convert', 'image-pdf', 'collage'],
  pdf: ['pages', 'shrink'],
}

/** Tools that accept anything at all, offered after the specific ones. */
const ANY = ['archive', 'checksum']

export function toolsForFiles(files: File[]): ToolMeta[] {
  if (!files.length) return []
  const kinds = [...new Set(files.map(kindOf))]
  let ids: string[]
  if (kinds.length === 1) {
    const kind = kinds[0]
    ids = files.length > 1 ? (MANY[kind] ?? SINGLE[kind]) : SINGLE[kind]
  } else if (kinds.every((k) => k === 'image' || k === 'svg')) {
    ids = MANY.image!
  } else if (kinds.every((k) => k === 'image' || k === 'pdf')) {
    ids = ['image-pdf', 'pages']
  } else {
    ids = []
  }
  const seen = new Set<string>()
  return [...ids, ...ANY]
    .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
    .map((id) => getTool(id))
    .filter((tool): tool is ToolMeta => !!tool)
}
