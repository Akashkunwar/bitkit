import { useEffect, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { useCopied } from '../../lib/useCopied'
import { useI18n } from '../../lib/i18n'
import { getPref, setPref } from '../../lib/db'
import { decodeBase32, totpCode, totpSecondsLeft } from '../../lib/totp'

type Account = { id: string; label: string; secret: string }

const PREF = 'totp-accounts'

export default function TotpTool() {
  const { language } = useI18n()
  const L = (en: string, hi: string) => (language === 'hi' ? hi : en)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState('')
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [left, setLeft] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useCopied()

  useEffect(() => {
    void getPref<Account[]>(PREF, []).then((saved) => setAccounts(Array.isArray(saved) ? saved : []))
  }, [])

  useEffect(() => {
    let cancel = false
    const tick = async () => {
      const now = Date.now()
      if (!cancel) setLeft(totpSecondsLeft(now))
      const next: Record<string, string> = {}
      for (const account of accounts) {
        try {
          next[account.id] = await totpCode(decodeBase32(account.secret), now)
        } catch {
          next[account.id] = '------'
        }
      }
      if (!cancel) setCodes(next)
    }
    void tick()
    const id = window.setInterval(() => void tick(), 1000)
    return () => {
      cancel = true
      window.clearInterval(id)
    }
  }, [accounts])

  const save = (next: Account[]) => {
    setAccounts(next)
    void setPref(PREF, next)
  }

  const add = () => {
    try {
      decodeBase32(secret)
      const name = label.trim() || L('Account', 'खाता')
      save([...accounts, { id: crypto.randomUUID(), label: name, secret: secret.replace(/\s+/g, '') }])
      setLabel('')
      setSecret('')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : L('That secret could not be read.', 'यह सीक्रेट नहीं पढ़ा जा सका।'))
    }
  }

  return (
    <ToolLayout
      title="Authenticator"
      lede="Six-digit codes from a Base32 secret. The secret stays in this browser, and in the backup file from Data & settings."
    >
      <p className="hint">
        {L(
          'Anyone with that backup can mint the same codes. This does not scan a QR picture — paste the setup key.',
          'जिसके पास वह बैकअप है, वह वही कोड बना सकता है। QR तस्वीर नहीं पढ़ी जाती — सेटअप कुंजी पेस्ट करें।',
        )}
      </p>
      <div className="split">
        <section className="panel">
          {!accounts.length ? <p className="muted">{L('No accounts yet.', 'अभी कोई खाता नहीं।')}</p> : null}
          {accounts.map((account) => (
            <div key={account.id} className="result-row">
              <div>
                <strong>{account.label}</strong>
                <p className="hint" style={{ margin: 0 }}>
                  {codes[account.id] ?? '------'} · {left}s
                </p>
              </div>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  disabled={!codes[account.id] || codes[account.id] === '------'}
                  onClick={() => void copy(codes[account.id] ?? '')}
                >
                  {copied ? L('Copied', 'कॉपी हो गया') : L('Copy', 'कॉपी')}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => save(accounts.filter((item) => item.id !== account.id))}
                >
                  {L('Remove', 'हटाएँ')}
                </button>
              </div>
            </div>
          ))}
        </section>
        <aside className="panel">
          <label className="field">
            <span>{L('Name', 'नाम')}</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={L('Bank, email…', 'बैंक, ईमेल…')}
            />
          </label>
          <label className="field">
            <span>{L('Secret', 'सीक्रेट')}</span>
            <input value={secret} spellCheck={false} autoComplete="off" onChange={(e) => setSecret(e.target.value)} />
          </label>
          {error ? <p className="status-bad">{error}</p> : null}
          <button type="button" className="btn btn-primary" disabled={!secret.trim()} onClick={add}>
            {L('Add account', 'खाता जोड़ें')}
          </button>
        </aside>
      </div>
    </ToolLayout>
  )
}
