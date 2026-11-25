export type Citation = {
  authors: string
  year: string
  title: string
  container: string
  publisher: string
  url: string
  accessed: string
}

function authorList(authors: string): string[] {
  return authors
    .split(/\s*(?:,| and )\s*/i)
    .map((name) => name.trim())
    .filter(Boolean)
    .map(invertName)
}

function invertName(name: string): string {
  if (name.includes(',')) return name
  const parts = name.split(/\s+/)
  if (parts.length < 2) return name
  const last = parts[parts.length - 1]
  const rest = parts.slice(0, -1).join(' ')
  return `${last}, ${rest}`
}

function apaAuthors(authors: string): string {
  const names = authorList(authors)
  if (!names.length) return 'Author unknown'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]}, & ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`
}

function mlaAuthors(authors: string): string {
  const names = authorList(authors)
  if (!names.length) return 'Author unknown'
  if (names.length === 1) return names[0]
  return `${names[0]}, et al.`
}

export function apaCitation(source: Citation): string {
  const year = source.year.trim() || 'n.d.'
  const title = source.title.trim() || 'Untitled'
  const tail = [source.container, source.publisher]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('. ')
  const link = source.url.trim() ? ` ${source.url.trim()}` : ''
  return `${apaAuthors(source.authors)} (${year}). ${title}.${tail ? ` ${tail}.` : ''}${link}`.replace(/\.\./g, '.')
}

export function mlaCitation(source: Citation): string {
  const title = source.title.trim() || 'Untitled'
  const year = source.year.trim()
  const container = source.container.trim()
  const publisher = source.publisher.trim()
  const bits = [mlaAuthors(source.authors), title, container, publisher, year].filter(Boolean)
  const accessed = source.accessed.trim() ? `Accessed ${source.accessed.trim()}.` : ''
  const link = source.url.trim()
  return `${bits.join('. ')}.${link ? ` ${link}.` : ''}${accessed ? ` ${accessed}` : ''}`.replace(/\.\./g, '.')
}

export function chicagoCitation(source: Citation): string {
  const authors = authorList(source.authors).join(', and ') || 'Author unknown'
  const title = source.title.trim() || 'Untitled'
  const year = source.year.trim()
  const place = [source.publisher, year]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
  const container = source.container.trim()
  const link = source.url.trim()
  return `${authors}. ${title}. ${container ? `${container}. ` : ''}${place ? `${place}. ` : ''}${link}`.trim()
}
