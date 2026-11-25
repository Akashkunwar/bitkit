import { useEffect, useMemo, useState } from 'react'
import { DateField } from '../../components/DateField'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { downloadNamed } from '../../lib/download'
import { getPref, setPref } from '../../lib/db'
import { useUndo } from '../../lib/undo'
import { emptyInvoice, invoicePdf, itemId, money, totalsOf, type Invoice } from '../../lib/invoice'
import { useI18n } from '../../lib/i18n'

const STORE_KEY = 'invoice-draft'

export default function InvoiceTool() {
  const [invoice, setInvoice] = useState<Invoice>(() => emptyInvoice())
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    void getPref<Invoice | null>(STORE_KEY, null).then((stored) => {
      if (stored && Array.isArray(stored.items)) setInvoice({ ...emptyInvoice(), ...stored })
    })
  }, [])
  const [error, setError] = useState<string | null>(null)
  const undo = useUndo()
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)

  const totals = useMemo(() => totalsOf(invoice), [invoice])
  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) =>
    setInvoice((current) => ({ ...current, [key]: value }))

  const setItem = (id: string, patch: Partial<Invoice['items'][number]>) =>
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))

  const download = () => {
    try {
      const blob = invoicePdf(invoice)
      void downloadNamed(blob, `${invoice.number || 'invoice'}.pdf`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the PDF.')
    }
  }

  return (
    <ToolLayout
      title={L('Invoice', 'इनवॉइस')}
      lede={L(
        'Fill in the lines, get a clean PDF. The draft stays in this browser — nothing is sent or stored elsewhere.',
        'पंक्तियाँ भरें, पीडीएफ पाएँ। मसौदा इसी ब्राउज़र में रहता है।',
      )}
    >
      <div className="split">
        <label className="field">
          <span>{L('Title', 'शीर्षक')}</span>
          <input className="text-input" value={invoice.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="field">
          <span>{L('Invoice number', 'इनवॉइस संख्या')}</span>
          <input className="text-input" value={invoice.number} onChange={(e) => set('number', e.target.value)} />
        </label>
      </div>

      <div className="split">
        <div className="field">
          <span id="invoice-date">{L('Date', 'तारीख')}</span>
          <DateField labelId="invoice-date" value={invoice.date} onChange={(value) => set('date', value)} />
        </div>
        <div className="field">
          <span id="invoice-due">{L('Due date', 'देय तारीख')}</span>
          <DateField labelId="invoice-due" value={invoice.dueDate} onChange={(value) => set('dueDate', value)} />
        </div>
      </div>

      <div className="split">
        <label className="field">
          <span>{L('From', 'भेजने वाला')}</span>
          <textarea
            className="text-input"
            rows={4}
            value={invoice.from}
            onChange={(e) => set('from', e.target.value)}
          />
        </label>
        <label className="field">
          <span>{L('Bill to', 'बिल प्राप्तकर्ता')}</span>
          <textarea
            className="text-input"
            rows={4}
            value={invoice.billTo}
            onChange={(e) => set('billTo', e.target.value)}
          />
        </label>
      </div>

      <p className="field-label" style={{ marginTop: '1rem' }}>
        {L('Line items', 'मदें')}
      </p>
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{L('Description', 'विवरण')}</th>
              <th style={{ width: '6rem' }}>{L('Qty', 'मात्रा')}</th>
              <th style={{ width: '8rem' }}>{L('Rate', 'दर')}</th>
              <th style={{ width: '8rem' }}>{L('Amount', 'राशि')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <input
                    className="grid-input"
                    value={item.description}
                    onChange={(e) => setItem(item.id, { description: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="grid-input"
                    type="number"
                    min={0}
                    step="any"
                    value={item.quantity}
                    onChange={(e) => setItem(item.id, { quantity: Number(e.target.value) || 0 })}
                  />
                </td>
                <td>
                  <input
                    className="grid-input"
                    type="number"
                    min={0}
                    step="any"
                    value={item.rate}
                    onChange={(e) => setItem(item.id, { rate: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="mono-val">{money(item.quantity * item.rate, invoice.currency)}</td>
                <td>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      const before = invoice.items
                      set(
                        'items',
                        invoice.items.filter((i) => i.id !== item.id),
                      )
                      undo.push({
                        label: `Removed “${item.description || 'line item'}”`,
                        undo: () => set('items', before),
                      })
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={() => set('items', [...invoice.items, { id: itemId(), description: '', quantity: 1, rate: 0 }])}
        >
          {L('Add line', 'पंक्ति जोड़ें')}
        </button>
      </div>

      <div className="split">
        <label className="field">
          <span>{L('Currency symbol', 'मुद्रा चिह्न')}</span>
          <input className="text-input" value={invoice.currency} onChange={(e) => set('currency', e.target.value)} />
        </label>
        <label className="field">
          <span>{L('Discount %', 'छूट %')}</span>
          <input
            className="text-input"
            type="number"
            min={0}
            max={100}
            value={invoice.discount}
            onChange={(e) => set('discount', Number(e.target.value) || 0)}
          />
        </label>
      </div>

      <div className="split">
        <label className="field">
          <span>{L('Tax label', 'कर का नाम')}</span>
          <input className="text-input" value={invoice.taxLabel} onChange={(e) => set('taxLabel', e.target.value)} />
        </label>
        <label className="field">
          <span>{L('Tax %', 'कर %')}</span>
          <input
            className="text-input"
            type="number"
            min={0}
            max={100}
            step="any"
            value={invoice.taxPercent}
            onChange={(e) => set('taxPercent', Number(e.target.value) || 0)}
          />
        </label>
      </div>

      <label className="field">
        <span>{L('Notes', 'टिप्पणी')}</span>
        <textarea
          className="text-input"
          rows={3}
          value={invoice.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </label>

      <div className="pill-row">
        <span className="pill">
          {L('Subtotal', 'उप-योग')} {money(totals.subtotal, invoice.currency)}
        </span>
        {totals.discount ? (
          <span className="pill">
            {L('Discount', 'छूट')} −{money(totals.discount, invoice.currency)}
          </span>
        ) : null}
        {totals.tax ? (
          <span className="pill">
            {invoice.taxLabel} {money(totals.tax, invoice.currency)}
          </span>
        ) : null}
        <span className="pill">
          {L('Total', 'कुल')} {money(totals.total, invoice.currency)}
        </span>
      </div>

      {error ? <p className="status-bad">{error}</p> : null}
      {invoice.currency && !/^[\u0020-\u00ff]*$/.test(invoice.currency) ? (
        <p className="hint">
          The PDF fonts only cover Latin-1, so “{invoice.currency}” is written out in the PDF (for example ₹ becomes
          “Rs.”).
        </p>
      ) : null}

      <div className="row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={download}>
          {L('Download PDF', 'पीडीएफ डाउनलोड')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void setPref(STORE_KEY, invoice).then(() => {
              setSaved(true)
              window.setTimeout(() => setSaved(false), 1500)
            })
          }}
        >
          {saved ? L('Saved', 'सहेजा गया') : L('Save draft', 'मसौदा सहेजें')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            void getPref<Invoice | null>(STORE_KEY, null).then((stored) => {
              if (stored) setInvoice(stored)
            })
          }}
        >
          {L('Load draft', 'मसौदा खोलें')}
        </button>
        <button type="button" className="btn" onClick={() => setInvoice(emptyInvoice())}>
          {L('Reset', 'रीसेट')}
        </button>
      </div>

      <SendTo from="invoice" text={`${invoice.number} — ${money(totals.total, invoice.currency)}`} />
    </ToolLayout>
  )
}
