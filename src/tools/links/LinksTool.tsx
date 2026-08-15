import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useCopied } from '../../lib/useCopied'
import { icsEvent, utmLink, vcard, whatsappLink } from '../../lib/links'

type Mode = 'whatsapp' | 'utm' | 'vcard' | 'ics'

export default function LinksTool() {
  const [mode, setMode] = useState<Mode>('whatsapp')
  const { copied, copy } = useCopied()
  const [phone, setPhone] = useState('')
  const [waText, setWaText] = useState('')
  const [url, setUrl] = useState('')
  const [source, setSource] = useState('newsletter')
  const [medium, setMedium] = useState('email')
  const [campaign, setCampaign] = useState('')
  const [term, setTerm] = useState('')
  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [org, setOrg] = useState('')
  const [title, setTitle] = useState('')
  const [cardPhone, setCardPhone] = useState('')
  const [email, setEmail] = useState('')
  const [site, setSite] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')

  const built = useMemo(() => {
    try {
      if (mode === 'whatsapp') return { value: phone.trim() ? whatsappLink(phone, waText) : '', error: null }
      if (mode === 'utm')
        return {
          value:
            url.trim() && source.trim() && medium.trim() && campaign.trim()
              ? utmLink({ url, source, medium, campaign, term, content })
              : '',
          error: null,
        }
      if (mode === 'vcard') return { value: name.trim() ? vcard({ name, org, title, phone: cardPhone, email, url: site }) : '', error: null }
      return {
        value: eventTitle.trim() && start ? icsEvent({ title: eventTitle, start, end, location, description }) : '',
        error: null,
      }
    } catch (err) {
      return { value: '', error: err instanceof Error ? err.message : 'Could not build that.' }
    }
  }, [mode, phone, waText, url, source, medium, campaign, term, content, name, org, title, cardPhone, email, site, eventTitle, start, end, location, description])

  const result = built.value
  const liveError = built.error

  return (
    <ToolLayout
      title="Links & cards"
      lede="WhatsApp wa.me links, UTM campaign URLs, a vCard, or a calendar event. Copy or download — nothing is shortened or stored."
    >
      <Segmented
        label="Kind"
        value={mode}
        options={[
          { value: 'whatsapp', label: 'WhatsApp' },
          { value: 'utm', label: 'UTM' },
          { value: 'vcard', label: 'vCard' },
          { value: 'ics', label: 'Event' },
        ]}
        onChange={setMode}
      />
      <div className="split">
        <section className="panel">
          {mode === 'whatsapp' ? (
            <>
              <label className="field">
                <span>Phone with country code</span>
                <input className="text-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9198XXXXXXXX" />
              </label>
              <label className="field">
                <span>Prefilled message</span>
                <textarea className="code-area" rows={6} value={waText} onChange={(e) => setWaText(e.target.value)} />
              </label>
            </>
          ) : null}
          {mode === 'utm' ? (
            <>
              <label className="field">
                <span>Destination URL</span>
                <input className="text-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/offer" />
              </label>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  <span>Source</span>
                  <input className="text-input" value={source} onChange={(e) => setSource(e.target.value)} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span>Medium</span>
                  <input className="text-input" value={medium} onChange={(e) => setMedium(e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Campaign</span>
                <input className="text-input" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
              </label>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  <span>Term</span>
                  <input className="text-input" value={term} onChange={(e) => setTerm(e.target.value)} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span>Content</span>
                  <input className="text-input" value={content} onChange={(e) => setContent(e.target.value)} />
                </label>
              </div>
            </>
          ) : null}
          {mode === 'vcard' ? (
            <>
              <label className="field">
                <span>Name</span>
                <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  <span>Org</span>
                  <input className="text-input" value={org} onChange={(e) => setOrg(e.target.value)} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span>Title</span>
                  <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Phone</span>
                <input className="text-input" value={cardPhone} onChange={(e) => setCardPhone(e.target.value)} />
              </label>
              <label className="field">
                <span>Email</span>
                <input className="text-input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="field">
                <span>URL</span>
                <input className="text-input" value={site} onChange={(e) => setSite(e.target.value)} />
              </label>
            </>
          ) : null}
          {mode === 'ics' ? (
            <>
              <label className="field">
                <span>Event title</span>
                <input className="text-input" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
              </label>
              <div className="row">
                <label className="field" style={{ flex: 1 }}>
                  <span>Starts</span>
                  <input className="text-input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span>Ends</span>
                  <input className="text-input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Location</span>
                <input className="text-input" value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea className="code-area" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </>
          ) : null}
        </section>
        <aside className="panel">
          <label className="field">
            <span>Result</span>
            <textarea className="code-area" rows={10} readOnly value={result} placeholder="Fill the fields to build a result." />
          </label>
          {liveError ? <p className="status-bad">{liveError}</p> : null}
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={!result} onClick={() => void copy(result, 'link')}>
              {copied === 'link' ? 'Copied ✓' : 'Copy'}
            </button>
            {mode === 'whatsapp' || mode === 'utm' ? (
              <a className="btn" href={result || undefined} target="_blank" rel="noreferrer" aria-disabled={!result}>
                Open
              </a>
            ) : null}
            {mode === 'vcard' ? (
              <button
                type="button"
                className="btn"
                disabled={!result}
                onClick={() => triggerDownload(new Blob([result], { type: 'text/vcard' }), 'contact.vcf')}
              >
                Download .vcf
              </button>
            ) : null}
            {mode === 'ics' ? (
              <button
                type="button"
                className="btn"
                disabled={!result}
                onClick={() => triggerDownload(new Blob([result], { type: 'text/calendar' }), 'event.ics')}
              >
                Download .ics
              </button>
            ) : null}
          </div>
          <p className="hint" style={{ marginTop: '1rem' }}>
            These are local builders. There is no shortener and no click tracking.
          </p>
          <SendTo from="links" text={result} />
        </aside>
      </div>
    </ToolLayout>
  )
}
