export type LetterFields = {
  sender: string
  recipient: string
  org: string
  role: string
  date: string
  subject: string
  body: string
  extra: string
}

export function leaveLetter(fields: LetterFields): string {
  return block(fields, [
    `Dear ${fields.recipient || 'Sir or Madam'},`,
    '',
    `I am writing to request ${fields.subject || 'leave'} ${fields.extra ? `from ${fields.extra}` : ''}.`.replace(
      /\s+\./,
      '.',
    ),
    '',
    fields.body || 'I will complete any handover before I am away and can be reached if something urgent comes up.',
    '',
    'Thank you for considering this.',
    '',
    'Yours sincerely,',
    fields.sender || 'Your name',
    fields.role,
    fields.org,
  ])
}

export function resignationLetter(fields: LetterFields): string {
  return block(fields, [
    `Dear ${fields.recipient || 'Sir or Madam'},`,
    '',
    `Please accept this letter as notice of my resignation from the post of ${fields.role || 'my role'} at ${fields.org || 'the organisation'}.`,
    fields.extra ? `My last working day will be ${fields.extra}.` : '',
    '',
    fields.body || 'I am grateful for the opportunity and will do what I can to hand work over cleanly.',
    '',
    'Yours sincerely,',
    fields.sender || 'Your name',
  ])
}

export function offerLetter(fields: LetterFields): string {
  return block(fields, [
    `Dear ${fields.recipient || 'Candidate'},`,
    '',
    `We are pleased to offer you the position of ${fields.role || 'the role'} at ${fields.org || 'the company'}.`,
    fields.extra ? `The offered start date is ${fields.extra}.` : '',
    fields.subject ? `Compensation: ${fields.subject}.` : '',
    '',
    fields.body ||
      'This offer is subject to the terms we will send with your contract. Please reply to confirm whether you accept.',
    '',
    'Yours sincerely,',
    fields.sender || 'Hiring manager',
    fields.org,
  ])
}

export function bonafideLetter(fields: LetterFields): string {
  return block(fields, [
    'TO WHOEVER IT MAY CONCERN',
    '',
    `This is to certify that ${fields.recipient || 'the person named'} ${fields.role ? `is a ${fields.role}` : 'is associated with us'} at ${fields.org || 'this institution'}.`,
    fields.extra ? `Period: ${fields.extra}.` : '',
    fields.subject ? `Purpose: ${fields.subject}.` : '',
    '',
    fields.body || 'This certificate is issued on request and does not by itself create any other obligation.',
    '',
    fields.sender || 'Authorised signatory',
    fields.org,
    fields.date,
  ])
}

export type SlipLine = { label: string; amount: number }

export function salarySlip(fields: LetterFields & { earnings: SlipLine[]; deductions: SlipLine[] }): string {
  const earned = sum(fields.earnings)
  const deducted = sum(fields.deductions)
  const net = earned - deducted
  const rows = [
    `${fields.org || 'Employer'}`,
    `Salary slip — ${fields.extra || fields.date || ''}`.trim(),
    '',
    `Employee: ${fields.recipient || ''}`,
    `Role: ${fields.role || ''}`,
    '',
    'Earnings',
    ...fields.earnings.map((line) => lineText(line.label, line.amount)),
    lineText('Total earnings', earned),
    '',
    'Deductions',
    ...fields.deductions.map((line) => lineText(line.label, line.amount)),
    lineText('Total deductions', deducted),
    '',
    lineText('Net pay', net),
  ]
  return rows.filter((line) => line !== '').join('\n')
}

export function quotation(
  fields: LetterFields & { items: { name: string; qty: number; rate: number }[]; taxPct: number },
): string {
  const sub = fields.items.reduce((total, item) => total + item.qty * item.rate, 0)
  const tax = sub * (fields.taxPct / 100)
  const lines = [
    fields.org || 'Quotation',
    fields.date,
    '',
    `To: ${fields.recipient || ''}`,
    fields.subject ? `Subject: ${fields.subject}` : '',
    '',
    'Item | Qty | Rate | Amount',
    ...fields.items.map((item) => `${item.name} | ${item.qty} | ${money(item.rate)} | ${money(item.qty * item.rate)}`),
    '',
    `Subtotal: ${money(sub)}`,
    `Tax ${fields.taxPct}%: ${money(tax)}`,
    `Total: ${money(sub + tax)}`,
    '',
    fields.body,
    '',
    fields.sender,
  ]
  return lines.filter((line) => line !== '').join('\n')
}

function block(fields: LetterFields, lines: string[]): string {
  const head = [fields.sender, fields.org, fields.date].filter(Boolean).join('\n')
  return (
    [head, head ? '' : '', ...lines]
      .filter((line, index, all) => line !== '' || all[index - 1] !== '')
      .join('\n')
      .trim() + '\n'
  )
}

function lineText(label: string, amount: number): string {
  return `${label.padEnd(22, ' ')} ${money(amount).padStart(12, ' ')}`
}

function money(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function sum(lines: SlipLine[]): number {
  return lines.reduce((total, line) => total + line.amount, 0)
}
