import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ToolLayout } from '../../components/ToolLayout'
import { DropZone } from '../../components/DropZone'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { triggerDownload } from '../../lib/download'
import { useHandoff } from '../../lib/useHandoff'
import { decodeQrFromBlob, decodeQrFromCanvas } from '../../lib/qrDecode'
import { emailPayload, phonePayload, smsPayload, urlPayload, wifiPayload, type QrMode } from '../../lib/qr'

type EcLevel = 'L' | 'M' | 'Q' | 'H'
type Panel = 'generate' | 'scan'

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
  const [ecLevel, setEcLevel] = useState<EcLevel>('M')
  const [size, setSize] = useState(512)
  const [margin, setMargin] = useState(2)
  const [dark, setDark] = useState('#10201f')
  const [light, setLight] = useState('#ffffff')
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
    }
  }, [mode, text, url, ssid, wifiPass, encryption, hidden, emailTo, emailSubject, emailBody, phone, smsMessage])

  useEffect(() => {
    if (!payload) {
      setSvg('')
      setError(null)
      return
    }
    QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: ecLevel,
      margin,
      color: { dark, light },
    })
      .then((code) => {
        setSvg(code)
        setError(null)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not encode that payload.'))
  }, [payload, ecLevel, margin, dark, light])

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

  const downloadPng = async () => {
    const dataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: ecLevel,
      margin,
      width: size,
      color: { dark, light },
    })
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (ch) => ch.charCodeAt(0))
    triggerDownload(new Blob([bytes], { type: 'image/png' }), 'qr-code.png')
  }

  const copySvg = async () => {
    await navigator.clipboard.writeText(svg)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <ToolLayout
      title="QR code"
      lede="Generate or scan QR codes in this tab. Wi-Fi passwords and links never leave the device."
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
              <p className="status-ok wrap-code" style={{ whiteSpace: 'pre-wrap' }}>
                {decoded}
              </p>
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
              <div className="qr-preview" dangerouslySetInnerHTML={{ __html: svg }} />
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
          <Segmented
            label="Payload type"
            value={mode}
            options={[
              { value: 'url', label: 'Link' },
              { value: 'text', label: 'Text' },
              { value: 'wifi', label: 'Wi-Fi' },
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
              { value: 'sms', label: 'SMS' },
            ]}
            onChange={setMode}
          />
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
                <input className="text-input" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </label>
              <label className="field">
                <span>Body</span>
                <textarea className="text-input" rows={3} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
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
              <textarea className="text-input" rows={3} value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} />
            </label>
          ) : null}

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
            <input type="range" min={128} max={2048} step={64} value={size} onChange={(e) => setSize(Number(e.target.value))} />
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
          <p className="hint">
            Higher error correction makes denser codes that survive damage or logos. Keep contrast high for reliable scanning.
          </p>
          <SendTo from="qr" text={payload || undefined} />
        </aside>
      </div>
      )}
    </ToolLayout>
  )
}
