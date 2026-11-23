import { describe, expect, it } from 'vitest'
import { resolveDownloadName } from '../lib/downloadName'

describe('resolveDownloadName', () => {
  it('uses the typed name and keeps the real extension', () => {
    expect(resolveDownloadName('Quarterly report', 'notes.pdf')).toBe('Quarterly report.pdf')
    expect(resolveDownloadName('Quarterly report.pdf', 'notes.pdf')).toBe('Quarterly report.pdf')
    expect(resolveDownloadName('brief.docx', 'notes.pdf')).toBe('brief.pdf')
  })

  it('keeps a dotted base that is not a file type', () => {
    expect(resolveDownloadName('report.v2', 'notes.pdf')).toBe('report.v2.pdf')
  })

  it('falls back to the suggested name when the field is empty', () => {
    expect(resolveDownloadName('   ', 'invoice.pdf')).toBe('invoice.pdf')
    expect(resolveDownloadName('', 'letter.docx')).toBe('letter.docx')
  })

  it('strips characters that break a download name', () => {
    expect(resolveDownloadName('Q3/final:draft?.pdf', 'notes.pdf')).toBe('Q3 final draft.pdf')
  })
})
