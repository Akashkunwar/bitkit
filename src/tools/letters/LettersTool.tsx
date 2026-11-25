import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import {
  bonafideLetter,
  leaveLetter,
  offerLetter,
  quotation,
  resignationLetter,
  salarySlip,
  type LetterFields,
} from '../../lib/letters'
import { amountToWords } from '../../lib/numwords'

type Mode = 'leave' | 'resign' | 'offer' | 'bonafide' | 'salary' | 'quote'

const MODES: { value: Mode; label: string }[] = [
  { value: 'leave', label: 'Leave' },
  { value: 'resign', label: 'Resignation' },
  { value: 'offer', label: 'Offer' },
  { value: 'bonafide', label: 'Bonafide' },
  { value: 'salary', label: 'Salary slip' },
  { value: 'quote', label: 'Quotation' },
]

const EMPTY: LetterFields = { sender: '', recipient: '', org: '', role: '', date: '', subject: '', body: '', extra: '' }

export default function LettersTool() {
  const [mode, setMode] = useState<Mode>('leave')
  const [fields, setFields] = useState<LetterFields>({
    ...EMPTY,
    sender: 'A. Sharma',
    recipient: 'The Manager',
    org: 'Northwind Studio',
    role: 'Designer',
    date: new Date().toISOString().slice(0, 10),
    subject: 'casual leave',
    extra: '12 May to 14 May',
  })
  const [earnings, setEarnings] = useState('Basic 40000\nHRA 16000')
  const [deductions, setDeductions] = useState('PF 4800\nTax 2000')
  const [items, setItems] = useState('Design, 1, 12000\nPrint, 50, 40')
  const [tax, setTax] = useState('18')
  const { copied, copy } = useCopied()

  const set = (key: keyof LetterFields) => (value: string) => setFields((prev) => ({ ...prev, [key]: value }))

  const output = useMemo(() => {
    try {
      if (mode === 'leave') return { text: leaveLetter(fields), error: null }
      if (mode === 'resign') return { text: resignationLetter(fields), error: null }
      if (mode === 'offer') return { text: offerLetter(fields), error: null }
      if (mode === 'bonafide') return { text: bonafideLetter(fields), error: null }
      if (mode === 'salary') {
        const text = salarySlip({
          ...fields,
          earnings: parseMoneyLines(earnings),
          deductions: parseMoneyLines(deductions),
        })
        const net = sumLines(earnings) - sumLines(deductions)
        return { text: `${text}\n\n${amountToWords(net, { chequeStyle: true })}`, error: null }
      }
      const parsed = parseItems(items)
      return { text: quotation({ ...fields, items: parsed, taxPct: Number(tax) || 0 }), error: null }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : 'Could not build that letter.' }
    }
  }, [mode, fields, earnings, deductions, items, tax])

  return (
    <ToolLayout
      title="Letters"
      lede="Leave, resignation, offer, bonafide, a salary slip, and a quotation. Edit the draft, then copy or print it."
    >
      <label className="field">
        <span>Letter</span>
        <select className="text-input" value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
          {MODES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="split">
        <Field label="Your name" value={fields.sender} onChange={set('sender')} />
        <Field label="Recipient" value={fields.recipient} onChange={set('recipient')} />
        <Field label="Organisation" value={fields.org} onChange={set('org')} />
        <Field label="Role" value={fields.role} onChange={set('role')} />
        <Field label="Date" value={fields.date} onChange={set('date')} />
        <Field
          label={mode === 'offer' ? 'Pay' : 'Subject or reason'}
          value={fields.subject}
          onChange={set('subject')}
        />
        <Field label={mode === 'salary' ? 'Month' : 'Dates or extra'} value={fields.extra} onChange={set('extra')} />
      </div>
      {mode === 'salary' ? (
        <div className="split">
          <Area label="Earnings — name and amount" value={earnings} onChange={setEarnings} />
          <Area label="Deductions — name and amount" value={deductions} onChange={setDeductions} />
        </div>
      ) : null}
      {mode === 'quote' ? (
        <div className="split">
          <Area label="Items — name, qty, rate" value={items} onChange={setItems} />
          <Field label="Tax %" value={tax} onChange={setTax} />
        </div>
      ) : null}
      {mode !== 'salary' && mode !== 'quote' ? (
        <Area label="A sentence of your own" value={fields.body} onChange={set('body')} />
      ) : mode === 'quote' ? (
        <Area label="Note" value={fields.body} onChange={set('body')} />
      ) : null}
      {output.error ? (
        <p className="status-bad" role="alert">
          {output.error}
        </p>
      ) : (
        <>
          <pre className="mono-val" style={{ whiteSpace: 'pre-wrap' }}>
            {output.text}
          </pre>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => void copy(output.text)}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              Print
            </button>
          </div>
        </>
      )}
    </ToolLayout>
  )
}

function parseMoneyLines(input: string): { label: string; amount: number }[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(.*?)(-?\d[\d,]*(?:\.\d+)?)$/.exec(line)
      if (!match) throw new Error(`“${line}” needs a name and an amount.`)
      return { label: match[1].trim() || 'Item', amount: Number(match[2].replace(/,/g, '')) }
    })
}

function sumLines(input: string): number {
  return parseMoneyLines(input).reduce((total, line) => total + line.amount, 0)
}

function parseItems(input: string): { name: string; qty: number; rate: number }[] {
  const items = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim())
      if (parts.length < 3) throw new Error(`“${line}” needs a name, a quantity, and a rate.`)
      const qty = Number(parts[1])
      const rate = Number(parts[2])
      if (!Number.isFinite(qty) || !Number.isFinite(rate))
        throw new Error(`“${line}” has a quantity or rate that is not a number.`)
      return { name: parts[0], qty, rate }
    })
  if (!items.length) throw new Error('Add at least one item.')
  return items
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="text-input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea className="text-input" rows={5} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
