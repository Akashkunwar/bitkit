import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { saveAs } from '../../lib/download'
import { getPref, setPref } from '../../lib/db'
import { emptyInvoice, invoicePdf, itemId, money, totalsOf, type Invoice } from '../../lib/invoice'

const STORE_KEY = 'invoice-draft'

export default function InvoiceTool() {
  const [invoice, setInvoice] = useState<Invoice>(() => emptyInvoice())
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      void saveAs(blob, `${invoice.number || 'invoice'}.pdf`)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the PDF.')
    }
  }

  return (
    <ToolLayout
      title="Invoice"
      lede="Fill in the lines, get a clean PDF. The draft stays in this browser — nothing is sent or stored elsewhere."
    >
      <div className="split">
        <label className="field">
          <span>Title</span>
          <input className="text-input" value={invoice.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="field">
          <span>Invoice number</span>
          <input className="text-input" value={invoice.number} onChange={(e) => set('number', e.target.value)} />
        </label>
      </div>

      <div className="split">
        <label className="field">
          <span>Date</span>
          <input className="text-input" type="date" value={invoice.date} onChange={(e) => set('date', e.target.value)} />
        </label>
        <label className="field">
          <span>Due date</span>
          <input
            className="text-input"
            type="date"
            value={invoice.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </label>
      </div>

      <div className="split">
        <label className="field">
          <span>From</span>
          <textarea className="text-input" rows={4} value={invoice.from} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label className="field">
          <span>Bill to</span>
          <textarea
            className="text-input"
            rows={4}
            value={invoice.billTo}
            onChange={(e) => set('billTo', e.target.value)}
          />
        </label>
      </div>

      <p className="field-label" style={{ marginTop: '1rem' }}>
        Line items
      </p>
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ width: '6rem' }}>Qty</th>
              <th style={{ width: '8rem' }}>Rate</th>
              <th style={{ width: '8rem' }}>Amount</th>
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
                    onClick={() => set('items', invoice.items.filter((i) => i.id !== item.id))}
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
          Add line
        </button>
      </div>

      <div className="split">
        <label className="field">
          <span>Currency symbol</span>
          <input className="text-input" value={invoice.currency} onChange={(e) => set('currency', e.target.value)} />
        </label>
        <label className="field">
          <span>Discount %</span>
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
          <span>Tax label</span>
          <input className="text-input" value={invoice.taxLabel} onChange={(e) => set('taxLabel', e.target.value)} />
        </label>
        <label className="field">
          <span>Tax %</span>
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
        <span>Notes</span>
        <textarea className="text-input" rows={3} value={invoice.notes} onChange={(e) => set('notes', e.target.value)} />
      </label>

      <div className="pill-row">
        <span className="pill">Subtotal {money(totals.subtotal, invoice.currency)}</span>
        {totals.discount ? <span className="pill">Discount −{money(totals.discount, invoice.currency)}</span> : null}
        {totals.tax ? <span className="pill">{invoice.taxLabel} {money(totals.tax, invoice.currency)}</span> : null}
        <span className="pill">Total {money(totals.total, invoice.currency)}</span>
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
          Download PDF
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
          {saved ? 'Saved' : 'Save draft'}
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
          Load draft
        </button>
        <button type="button" className="btn" onClick={() => setInvoice(emptyInvoice())}>
          Reset
        </button>
      </div>

      <SendTo from="invoice" text={`${invoice.number} — ${money(totals.total, invoice.currency)}`} />
    </ToolLayout>
  )
}
