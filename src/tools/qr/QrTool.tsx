import { useEffect, useMemo, useRef, useState } from 'react'
import { DateField } from '../../components/DateField'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { LabelSheet } from '../../components/LabelSheet'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { decodeQrFromBlob, decodeQrFromCanvas } from '../../lib/qrDecode'
import {
  bitcoinPayload,
  emailPayload,
  eventPayload,
  locationPayload,
  mecardPayload,
  phonePayload,
  smsPayload,
  socialPayload,
  urlPayload,
  vcardPayload,
  wifiPayload,
  linkNotes,
  parseWifiPayload,
  type ContactFields,
  type QrMode,
} from '../../lib/qr'
import {
  BODY_SHAPES,
  EYE_BALLS,
  EYE_FRAMES,
  bodySwatch,
  contrastRatio,
  eyeSwatch,
  renderStyledQr,
  type BodyShape,
  type EcLevel,
  type EyeBall,
  type EyeFrame,
  type GradientKind,
} from '../../lib/qrDraw'
import { frameLogo } from '../../lib/qrHalo'
import { embedQrLogo } from '../../lib/qrLogo'

type Panel = 'generate' | 'scan'

const EMPTY_CONTACT: ContactFields = {
  first: '',
  last: '',
  org: '',
  title: '',
  mobile: '',
  work: '',
  email: '',
  url: '',
  street: '',
  city: '',
  zip: '',
  country: '',
}

const CONTENT: { value: QrMode; label: string }[] = [
  { value: 'url', label: 'Link' },
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'sms', label: 'SMS' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'vcard', label: 'Contact card' },
  { value: 'mecard', label: 'MeCard' },
  { value: 'location', label: 'Location' },
  { value: 'event', label: 'Calendar event' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'youtube', label: 'YouTube' },
]

/** Logos exported on a solid black field read as a black block. Lift that field so the mark sits on the pad. */
function liftDarkBackdrop(image: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(image, 0, 0)
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width } = frame
  const corner = (x: number, y: number) => {
    const i = (y * width + x) * 4
    return data[i] < 28 && data[i + 1] < 28 && data[i + 2] < 28 && data[i + 3] > 200
  }
  const edge = canvas.width - 1
  const bottom = canvas.height - 1
  if (!corner(0, 0) || !corner(edge, 0) || !corner(0, bottom) || !corner(edge, bottom)) return null
  for (let i = 0; i < data.length; i += 4) {
    const max = Math.max(data[i], data[i + 1], data[i + 2])
    if (max < 42) data[i + 3] = 0
    else if (max < 70) data[i + 3] = Math.round(((max - 42) / 28) * data[i + 3])
  }
  ctx.putImageData(frame, 0, 0)
  return canvas.toDataURL('image/png')
}

function svgToPng(svg: string, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas is unavailable.'))
        return
      }
      ctx.drawImage(image, 0, 0, size, size)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (blob) resolve(blob)
        else reject(new Error('Could not encode the PNG.'))
      }, 'image/png')
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not draw the QR code.'))
    }
    image.src = url
  })
}

export default function QrTool() {
  const [panel, setPanel] = useState<Panel>('generate')
  const [decoded, setDecoded] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [mode, setMode] = useState<QrMode>('url')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [ssid, setSsid] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const [encryption, setEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA')
  const [hidden, setHidden] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [phone, setPhone] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [contact, setContact] = useState<ContactFields>(EMPTY_CONTACT)
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeLat, setPlaceLat] = useState('')
  const [placeLng, setPlaceLng] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventStart, setEventStart] = useState('')
  const [eventEnd, setEventEnd] = useState('')
  const [eventWhere, setEventWhere] = useState('')
  const [coinAddress, setCoinAddress] = useState('')
  const [coinAmount, setCoinAmount] = useState('')
  const [coinLabel, setCoinLabel] = useState('')
  const [social, setSocial] = useState('')
  const [ecLevel, setEcLevel] = useState<EcLevel>('M')
  const [size, setSize] = useState(512)
  const [margin, setMargin] = useState(2)
  const [dark, setDark] = useState('#10201f')
  const [light, setLight] = useState('#ffffff')
  const [transparent, setTransparent] = useState(false)
  const [body, setBody] = useState<BodyShape>('square')
  const [eye, setEye] = useState<EyeFrame>('frame0')
  const [ball, setBall] = useState<EyeBall>('ball0')
  const [gradient, setGradient] = useState<GradientKind>('none')
  const [gradientTo, setGradientTo] = useState('#1f8a7b')
  const [gradientOnEyes, setGradientOnEyes] = useState(true)
  const [customEyes, setCustomEyes] = useState(false)
  const [eyeFrameColors, setEyeFrameColors] = useState<[string, string, string]>(['#10201f', '#10201f', '#10201f'])
  const [eyeBallColors, setEyeBallColors] = useState<[string, string, string]>(['#10201f', '#10201f', '#10201f'])
  const [logo, setLogo] = useState<string | null>(null)
  const [logoAspect, setLogoAspect] = useState(1)
  const [framed, setFramed] = useState<{ url: string; aspect: number; scale: number } | null>(null)
  const [logoSize, setLogoSize] = useState(18)
  const [logoGap, setLogoGap] = useState(8)
  const logoInput = useRef<HTMLInputElement>(null)
  const [svg, setSvg] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payload = useMemo(() => {
    switch (mode) {
      case 'text':
        return text
      case 'url':
        return urlPayload(url)
      case 'wifi':
        return ssid ? wifiPayload({ ssid, password: wifiPass, encryption, hidden }) : ''
      case 'email':
        return emailTo ? emailPayload({ to: emailTo, subject: emailSubject, body: emailBody }) : ''
      case 'phone':
        return phone ? phonePayload(phone) : ''
      case 'sms':
        return phone ? smsPayload(phone, smsMessage) : ''
      case 'vcard':
        return vcardPayload(contact)
      case 'mecard':
        return mecardPayload(contact)
      case 'location':
        return locationPayload({ query: placeQuery, lat: placeLat, lng: placeLng })
      case 'event':
        return eventPayload({ title: eventTitle, start: eventStart, end: eventEnd, location: eventWhere })
      case 'bitcoin':
        return bitcoinPayload({ address: coinAddress, amount: coinAmount, label: coinLabel })
      case 'facebook':
      case 'twitter':
      case 'youtube':
        return socialPayload(mode, social)
    }
  }, [
    mode,
    text,
    url,
    ssid,
    wifiPass,
    encryption,
    hidden,
    emailTo,
    emailSubject,
    emailBody,
    phone,
    smsMessage,
    contact,
    placeQuery,
    placeLat,
    placeLng,
    eventTitle,
    eventStart,
    eventEnd,
    eventWhere,
    coinAddress,
    coinAmount,
    coinLabel,
    social,
  ])

  useEffect(() => {
    if (logo && ecLevel !== 'H') setEcLevel('H')
  }, [logo, ecLevel])

  useEffect(() => {
    if (!payload) {
      setSvg('')
      setError(null)
      return
    }
    try {
      const code = renderStyledQr(payload, {
        body,
        eye,
        ball,
        dark,
        light,
        transparent,
        gradient,
        gradientTo,
        gradientOnEyes,
        customEyes,
        eyeFrameColors,
        eyeBallColors,
        margin,
        ecLevel,
      })
      setSvg(framed ? embedQrLogo(code, framed.url, { scale: framed.scale, aspect: framed.aspect }) : code)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not encode that payload.')
    }
  }, [
    payload,
    ecLevel,
    margin,
    dark,
    light,
    framed,
    body,
    eye,
    ball,
    transparent,
    gradient,
    gradientTo,
    gradientOnEyes,
    customEyes,
    eyeFrameColors,
    eyeBallColors,
  ])

  useEffect(() => {
    if (!logo) {
      setFramed(null)
      return
    }
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const gapRatio = logoGap / 100
      const next = frameLogo(image, image.naturalWidth, image.naturalHeight, gapRatio, light)
      if (!next.url) return
      setFramed({ url: next.url, aspect: next.aspect, scale: logoSize * next.outerOverArt })
    }
    image.src = logo
    return () => {
      cancelled = true
    }
  }, [logo, logoGap, logoSize, light])

  useHandoff((incoming) => {
    if (incoming.files?.some((f) => f.type.startsWith('image/'))) {
      setPanel('scan')
      const image = incoming.files.find((f) => f.type.startsWith('image/'))
      if (image) void decodeQrFromBlob(image).then((value) => setDecoded(value ?? 'No QR code found.'))
    } else if (incoming.text) {
      setPanel('generate')
      setMode('text')
      setText(incoming.text)
    }
  })

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  const startCamera = async () => {
    setScanError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      await videoRef.current?.play()
      setCameraOn(true)
    } catch {
      setScanError('Camera permission was denied or is unavailable.')
    }
  }

  useEffect(() => {
    if (!cameraOn) return
    let raf = 0
    let active = true
    const tick = async () => {
      const video = videoRef.current
      const canvas = scanCanvasRef.current
      if (video && canvas && video.readyState >= 2) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0)
          const value = await decodeQrFromCanvas(canvas)
          if (value && active) {
            setDecoded(value)
            stopCamera()
            return
          }
        }
      }
      raf = requestAnimationFrame(() => void tick())
    }
    void tick()
    return () => {
      active = false
      cancelAnimationFrame(raf)
    }
  }, [cameraOn])

  useEffect(() => () => stopCamera(), [])

  const downloadSvg = () => {
    triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg')
  }

  const takeLogo = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      const image = new Image()
      image.onload = () => {
        const aspect = image.naturalWidth / image.naturalHeight || 1
        setLogo(liftDarkBackdrop(image) ?? dataUrl)
        setLogoAspect(aspect)
        setLogoSize(aspect > 1.6 ? 42 : 22)
        setEcLevel('H')
      }
      image.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const downloadPng = async () => {
    if (!svg) return
    const blob = await svgToPng(svg, size)
    triggerDownload(blob, 'qr-code.png')
  }

  const raiseCorrection = () => {
    if (ecLevel === 'L' || ecLevel === 'M') setEcLevel('Q')
  }

  const patchContact = (key: keyof ContactFields, value: string) => {
    setContact((current) => ({ ...current, [key]: value }))
  }

  const patchEye = (kind: 'frame' | 'ball', index: number, value: string) => {
    const update = (current: [string, string, string]): [string, string, string] => {
      const next = [...current] as [string, string, string]
      next[index] = value
      return next
    }
    if (kind === 'frame') setEyeFrameColors(update)
    else setEyeBallColors(update)
  }

  const contrast = contrastRatio(dark, gradient === 'none' ? light : gradientTo)
  const lowContrast = !transparent && (contrast < 3 || contrastRatio(dark, light) < 3)

  const copySvg = async () => {
    await navigator.clipboard.writeText(svg)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <ToolLayout
      title="QR code"
      lede="Generate or scan QR codes in this tab. Shapes, contacts, and Wi-Fi passwords never leave the device."
    >
      <Segmented
        label="Mode"
        value={panel}
        options={[
          { value: 'generate', label: 'Generate' },
          { value: 'scan', label: 'Scan' },
        ]}
        onChange={(value) => {
          setPanel(value)
          if (value === 'generate') stopCamera()
        }}
      />
      {panel === 'scan' ? (
        <div className="split">
          <section className="panel">
            <video ref={videoRef} playsInline muted className="qr-video" hidden={!cameraOn} />
            <canvas ref={scanCanvasRef} className="visually-hidden" />
            {decoded ? (
              <>
                <p className="status-ok wrap-code" style={{ whiteSpace: 'pre-wrap' }}>
                  {decoded}
                </p>
                {parseWifiPayload(decoded) ? (
                  <ul className="hint">
                    <li>Network: {parseWifiPayload(decoded)?.ssid}</li>
                    <li>Password: {parseWifiPayload(decoded)?.password || '(none)'}</li>
                    <li>Encryption: {parseWifiPayload(decoded)?.encryption}</li>
                  </ul>
                ) : null}
                {linkNotes(decoded).length ? (
                  <ul className="hint">
                    {linkNotes(decoded).map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="muted">Point the camera at a code, or drop a screenshot.</p>
            )}
            {scanError ? <p className="status-bad">{scanError}</p> : null}
          </section>
          <aside className="panel">
            <DropZone
              label="Drop a QR image."
              onFiles={async (files) => {
                if (!files[0]) return
                setScanError(null)
                const value = await decodeQrFromBlob(files[0])
                setDecoded(value ?? 'No QR code found.')
              }}
            />
            <div className="row" style={{ marginTop: '0.75rem' }}>
              {cameraOn ? (
                <button type="button" className="btn" onClick={stopCamera}>
                  Stop camera
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => void startCamera()}>
                  Open camera
                </button>
              )}
              {decoded ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    void navigator.clipboard.writeText(decoded)
                  }}
                >
                  Copy
                </button>
              ) : null}
            </div>
            <SendTo from="qr" text={decoded || undefined} />
          </aside>
        </div>
      ) : (
        <div className="split">
          <section className="panel">
            {svg ? (
              <>
                <div
                  className="qr-preview"
                  data-clear={transparent || undefined}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
                <p className="hint" style={{ textAlign: 'center' }}>
                  Payload ({payload.length} chars): <code className="wrap-code">{payload}</code>
                </p>
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button type="button" className="btn btn-primary" onClick={downloadSvg}>
                    Download SVG
                  </button>
                  <button type="button" className="btn" onClick={downloadPng}>
                    Download PNG ({size}px)
                  </button>
                  <button type="button" className="btn" onClick={copySvg}>
                    {copied ? 'Copied ✓' : 'Copy SVG code'}
                  </button>
                </div>
              </>
            ) : (
              <p className="muted" style={{ textAlign: 'center', padding: '3rem 0' }}>
                {error ?? 'Fill in the fields to generate a QR code.'}
              </p>
            )}
            {error && svg ? <p className="status-bad">{error}</p> : null}
          </section>
          <aside className="panel">
            <label className="field">
              <span>Content</span>
              <select className="text-input" value={mode} onChange={(e) => setMode(e.target.value as QrMode)}>
                {CONTENT.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'text' ? (
              <label className="field">
                <span>Text</span>
                <textarea className="text-input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
              </label>
            ) : null}
            {mode === 'url' ? (
              <label className="field">
                <span>URL</span>
                <input
                  className="text-input"
                  placeholder="example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
            ) : null}
            {mode === 'wifi' ? (
              <>
                <label className="field">
                  <span>Network name (SSID)</span>
                  <input className="text-input" value={ssid} onChange={(e) => setSsid(e.target.value)} />
                </label>
                <Segmented
                  label="Security"
                  value={encryption}
                  options={[
                    { value: 'WPA', label: 'WPA/WPA2' },
                    { value: 'WEP', label: 'WEP' },
                    { value: 'nopass', label: 'Open' },
                  ]}
                  onChange={setEncryption}
                />
                {encryption !== 'nopass' ? (
                  <label className="field">
                    <span>Password</span>
                    <input className="text-input" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} />
                  </label>
                ) : null}
                <label className="row" style={{ marginBottom: '0.75rem' }}>
                  <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
                  Hidden network
                </label>
              </>
            ) : null}
            {mode === 'email' ? (
              <>
                <label className="field">
                  <span>To</span>
                  <input
                    className="text-input"
                    type="email"
                    placeholder="someone@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Subject</span>
                  <input
                    className="text-input"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Body</span>
                  <textarea
                    className="text-input"
                    rows={3}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </label>
              </>
            ) : null}
            {mode === 'phone' || mode === 'sms' ? (
              <label className="field">
                <span>Phone number</span>
                <input
                  className="text-input"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
            ) : null}
            {mode === 'sms' ? (
              <label className="field">
                <span>Message</span>
                <textarea
                  className="text-input"
                  rows={3}
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                />
              </label>
            ) : null}
            {mode === 'vcard' || mode === 'mecard' ? (
              <div className="form-grid">
                <Field label="First name" value={contact.first} onChange={(value) => patchContact('first', value)} />
                <Field label="Last name" value={contact.last} onChange={(value) => patchContact('last', value)} />
                <Field label="Organization" value={contact.org} onChange={(value) => patchContact('org', value)} />
                <Field label="Title" value={contact.title} onChange={(value) => patchContact('title', value)} />
                <Field label="Mobile" value={contact.mobile} onChange={(value) => patchContact('mobile', value)} />
                <Field label="Work phone" value={contact.work} onChange={(value) => patchContact('work', value)} />
                <Field label="Email" value={contact.email} onChange={(value) => patchContact('email', value)} />
                <Field label="Website" value={contact.url} onChange={(value) => patchContact('url', value)} />
                <Field label="Street" value={contact.street} onChange={(value) => patchContact('street', value)} />
                <Field label="City" value={contact.city} onChange={(value) => patchContact('city', value)} />
                <Field label="Postal code" value={contact.zip} onChange={(value) => patchContact('zip', value)} />
                <Field label="Country" value={contact.country} onChange={(value) => patchContact('country', value)} />
              </div>
            ) : null}
            {mode === 'location' ? (
              <>
                <Field
                  label="Place or address"
                  value={placeQuery}
                  onChange={setPlaceQuery}
                  placeholder="Cakeloo, Bengaluru"
                />
                <div className="form-grid">
                  <Field label="Latitude" value={placeLat} onChange={setPlaceLat} placeholder="12.9716" />
                  <Field label="Longitude" value={placeLng} onChange={setPlaceLng} placeholder="77.5946" />
                </div>
                <p className="hint">
                  Coordinates make a geo code. Leave them empty to encode a maps search for the place.
                </p>
              </>
            ) : null}
            {mode === 'event' ? (
              <>
                <Field label="Title" value={eventTitle} onChange={setEventTitle} />
                <div className="field">
                  <span id="qr-start">Starts</span>
                  <DateField labelId="qr-start" withTime value={eventStart} onChange={setEventStart} />
                </div>
                <div className="field">
                  <span id="qr-end">Ends</span>
                  <DateField labelId="qr-end" withTime value={eventEnd} onChange={setEventEnd} />
                </div>
                <Field label="Location" value={eventWhere} onChange={setEventWhere} />
              </>
            ) : null}
            {mode === 'bitcoin' ? (
              <>
                <Field label="Address" value={coinAddress} onChange={setCoinAddress} />
                <div className="form-grid">
                  <Field label="Amount" value={coinAmount} onChange={setCoinAmount} placeholder="0.001" />
                  <Field label="Label" value={coinLabel} onChange={setCoinLabel} />
                </div>
              </>
            ) : null}
            {mode === 'facebook' || mode === 'twitter' || mode === 'youtube' ? (
              <Field
                label={mode === 'youtube' ? 'Channel or video URL' : 'Profile or URL'}
                value={social}
                onChange={setSocial}
                placeholder={mode === 'youtube' ? '@channel' : 'username'}
              />
            ) : null}

            <ShapePicker
              label="Body"
              value={body}
              options={BODY_SHAPES}
              viewBox="0 0 3 3"
              swatch={bodySwatch}
              onChange={(value) => {
                setBody(value)
                if (value !== 'square') raiseCorrection()
              }}
            />
            <ShapePicker
              label="Eye frame"
              value={eye}
              options={EYE_FRAMES}
              viewBox="0 0 7 7"
              swatch={(id) => eyeSwatch(id, 'ball0')}
              onChange={(value) => {
                setEye(value)
                if (value !== 'frame0') raiseCorrection()
              }}
            />
            <ShapePicker
              label="Eye center"
              value={ball}
              options={EYE_BALLS}
              viewBox="0 0 7 7"
              swatch={(id) => eyeSwatch('frame0', id)}
              onChange={(value) => {
                setBall(value)
                if (value !== 'ball0') raiseCorrection()
              }}
            />

            <Segmented
              label="Error correction"
              value={ecLevel}
              options={[
                { value: 'L', label: 'L 7%' },
                { value: 'M', label: 'M 15%' },
                { value: 'Q', label: 'Q 25%' },
                { value: 'H', label: 'H 30%' },
              ]}
              onChange={setEcLevel}
            />
            <label className="field">
              <span>PNG size — {size}px</span>
              <input
                type="range"
                min={128}
                max={2048}
                step={64}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Quiet zone — {margin} modules</span>
              <input type="range" min={0} max={8} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
            </label>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                <span>Foreground</span>
                <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Background</span>
                <input type="color" value={light} onChange={(e) => setLight(e.target.value)} />
              </label>
            </div>
            <label className="row" style={{ marginBottom: '0.75rem' }}>
              <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
              Transparent background
            </label>
            <label className="field">
              <span>Gradient</span>
              <select
                className="text-input"
                value={gradient}
                onChange={(e) => setGradient(e.target.value as GradientKind)}
              >
                <option value="none">Off</option>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </label>
            {gradient !== 'none' ? (
              <>
                <label className="field">
                  <span>Second color</span>
                  <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} />
                </label>
                <label className="row" style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="checkbox"
                    checked={gradientOnEyes}
                    onChange={(e) => setGradientOnEyes(e.target.checked)}
                  />
                  Gradient on the eyes
                </label>
              </>
            ) : null}
            <label className="row" style={{ marginBottom: '0.75rem' }}>
              <input type="checkbox" checked={customEyes} onChange={(e) => setCustomEyes(e.target.checked)} />
              Separate colors for each eye
            </label>
            {customEyes ? (
              <div className="eye-colors">
                {['Top left', 'Top right', 'Bottom left'].map((name, index) => (
                  <div key={name} className="eye-color-row">
                    <span>{name}</span>
                    <label>
                      Frame
                      <input
                        type="color"
                        aria-label={`${name} frame color`}
                        value={eyeFrameColors[index]}
                        onChange={(e) => patchEye('frame', index, e.target.value)}
                      />
                    </label>
                    <label>
                      Center
                      <input
                        type="color"
                        aria-label={`${name} center color`}
                        value={eyeBallColors[index]}
                        onChange={(e) => patchEye('ball', index, e.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            ) : null}
            {lowContrast ? (
              <p className="status-bad">Foreground and background are close. Phones may not scan this.</p>
            ) : null}
            <span className="field-label">Center logo</span>
            <div className="row" style={{ alignItems: 'center' }}>
              {logo ? <img className="qr-logo-chip" src={logo} alt="" /> : null}
              <button type="button" className="btn" onClick={() => logoInput.current?.click()}>
                {logo ? 'Replace logo' : 'Add logo'}
              </button>
              {logo ? (
                <button type="button" className="btn-ghost" onClick={() => setLogo(null)}>
                  Remove
                </button>
              ) : null}
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                hidden
                aria-label="Choose a logo"
                onChange={(event) => {
                  takeLogo(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </div>
            {logo ? (
              <>
                <label className="field">
                  <span>Logo size — {logoSize}%</span>
                  <input
                    type="range"
                    min={logoAspect > 1.6 ? 28 : 14}
                    max={logoAspect > 1.6 ? 48 : 24}
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  <span>White border — {logoGap === 0 ? 'off' : `${logoGap}%`}</span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    value={logoGap}
                    aria-label="White border thickness"
                    onChange={(e) => setLogoGap(Number(e.target.value))}
                  />
                </label>
              </>
            ) : null}
            <p className="hint">
              {logo
                ? 'White border follows the logo shape. Drag it down for a thin edge, or to off for none. Error correction stays on H so the code can still be scanned.'
                : 'Square modules scan most reliably. Rounded and cut shapes raise error correction so a phone can still read them.'}
            </p>
            <LabelSheet
              sample={payload}
              renderPng={async (value) => {
                const code = renderStyledQr(value, {
                  body,
                  eye,
                  ball,
                  dark,
                  light,
                  transparent,
                  gradient,
                  gradientTo,
                  gradientOnEyes,
                  customEyes,
                  eyeFrameColors,
                  eyeBallColors,
                  margin,
                  ecLevel,
                })
                return svgToPng(code, 512)
              }}
            />
            <SendTo from="qr" text={payload || undefined} />
          </aside>
        </div>
      )}
    </ToolLayout>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="text-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function ShapePicker<T extends string>({
  label,
  value,
  options,
  viewBox,
  swatch,
  onChange,
}: {
  label: string
  value: T
  options: readonly { id: T; label: string }[]
  viewBox: string
  swatch: (id: T) => string
  onChange: (value: T) => void
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="shape-grid" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            className="shape-swatch"
            aria-checked={option.id === value}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.id)}
          >
            <svg viewBox={viewBox} aria-hidden="true">
              <path d={swatch(option.id)} fill="currentColor" fillRule="evenodd" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
