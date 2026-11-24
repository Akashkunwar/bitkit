function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function line(label: string, value: string): string {
  const text = value.trim()
  return text ? `${label}: ${text}` : ''
}

function block(parts: string[]): string {
  return parts.filter(Boolean).join('\n')
}

export function resumeText(fields: {
  name: string
  title: string
  email: string
  phone: string
  summary: string
  experience: string
  education: string
}): string {
  return block([
    fields.name.trim() || 'Name',
    fields.title.trim(),
    [fields.email, fields.phone]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' · '),
    fields.summary.trim() ? `\n${fields.summary.trim()}` : '',
    fields.experience.trim() ? `\nExperience\n${fields.experience.trim()}` : '',
    fields.education.trim() ? `\nEducation\n${fields.education.trim()}` : '',
  ])
}

export function signatureHtml(fields: {
  name: string
  title: string
  company: string
  email: string
  phone: string
  website: string
}): string {
  const name = escapeHtml(fields.name.trim() || 'Name')
  const role = escapeHtml(
    [fields.title, fields.company]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', '),
  )
  const links = [fields.email, fields.phone, fields.website].map((part) => escapeHtml(part.trim())).filter(Boolean)
  return `<table cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:14px;color:#1c1917"><tr><td style="font-weight:700">${name}</td></tr>${role ? `<tr><td>${role}</td></tr>` : ''}${links.map((item) => `<tr><td>${item}</td></tr>`).join('')}</table>`
}

export function businessCardSvg(fields: {
  name: string
  title: string
  company: string
  email: string
  phone: string
}): string {
  const name = escapeHtml(fields.name.trim() || 'Name')
  const title = escapeHtml(fields.title.trim())
  const company = escapeHtml(fields.company.trim())
  const contact = escapeHtml(
    [fields.email, fields.phone]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' · '),
  )
  return `<svg xmlns="http://www.w3.org/2000/svg" width="336" height="192" viewBox="0 0 336 192"><rect width="336" height="192" fill="#fafaf9" stroke="#d6d3d1"/><text x="24" y="72" font-family="sans-serif" font-size="22" font-weight="700" fill="#1c1917">${name}</text><text x="24" y="100" font-family="sans-serif" font-size="14" fill="#44403c">${title}</text><text x="24" y="126" font-family="sans-serif" font-size="14" fill="#44403c">${company}</text><text x="24" y="160" font-family="sans-serif" font-size="12" fill="#57534e">${contact}</text></svg>`
}

export function billOfSale(fields: {
  seller: string
  buyer: string
  item: string
  price: string
  date: string
  notes: string
}): string {
  return block([
    'Bill of sale',
    '',
    line('Date', fields.date),
    line('Seller', fields.seller),
    line('Buyer', fields.buyer),
    line('Item', fields.item),
    line('Price', fields.price),
    fields.notes.trim() ? `\n${fields.notes.trim()}` : '',
    '',
    'The seller transfers the item to the buyer for the price above. This is a blank form filled in on this device. It is not legal advice.',
  ])
}

export function agreementText(fields: {
  partyA: string
  partyB: string
  date: string
  subject: string
  terms: string
}): string {
  const a = fields.partyA.trim() || 'Party A'
  const b = fields.partyB.trim() || 'Party B'
  return block([
    'Agreement',
    '',
    line('Date', fields.date),
    line('Between', `${a} and ${b}`),
    line('Subject', fields.subject),
    '',
    fields.terms.trim() || 'The parties agree to the terms written here.',
    '',
    `${a} ________________________    ${b} ________________________`,
    '',
    'A blank form filled in on this device. It is not legal advice.',
  ])
}
