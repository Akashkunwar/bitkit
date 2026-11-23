import { useEffect, useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { downloadNamed } from '../../lib/download'
import {
  addPoint,
  discordStamp,
  lineShares,
  nextPair,
  SCREENS,
  screenByFeature,
  unfollowers,
  type ScreenSpec,
} from '../../lib/socialScreens'

type Fields = { name: string; handle: string; caption: string; left: string; right: string }

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width) line = next
    else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function paint(canvas: HTMLCanvasElement, spec: ScreenSpec, fields: Fields) {
  const wide = spec.kind === 'feed' || spec.kind === 'album' || spec.kind === 'year'
  const width = wide ? 840 : 420
  const height = wide ? 520 : 760
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = width
  canvas.height = height
  ctx.fillStyle = spec.bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = spec.accent
  ctx.fillRect(0, 0, width, 72)
  ctx.fillStyle =
    spec.bg === '#ffffff' || spec.bg.startsWith('#f') || spec.bg.startsWith('#d') || spec.bg.startsWith('#e')
      ? '#111'
      : '#fff'
  if (spec.kind === 'story' || spec.kind === 'reel' || spec.kind === 'live') ctx.fillStyle = '#fff'
  ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(spec.feature, 16, 32)
  ctx.font = '14px ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(fields.handle || '@name', 16, 54)
  ctx.fillStyle = spec.ink
  ctx.font = '600 28px ui-sans-serif, system-ui, sans-serif'
  const title = fields.name || 'Name'
  if (spec.kind === 'poster' || spec.kind === 'toast' || spec.kind === 'lyrics') {
    ctx.textAlign = 'center'
    ctx.fillText(title, width / 2, height / 2)
    ctx.font = '16px ui-sans-serif, system-ui, sans-serif'
    wrap(ctx, fields.caption || spec.feature, width - 80)
      .slice(0, 4)
      .forEach((line, index) => ctx.fillText(line, width / 2, height / 2 + 40 + index * 24))
    ctx.textAlign = 'left'
    return
  }
  if (spec.kind === 'emoji') {
    ctx.font = '96px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(fields.left || '😀', 70, 360)
    ctx.fillText(fields.right || '🔥', 190, 400)
    return
  }
  if (spec.kind === 'album' || spec.kind === 'booth') {
    for (let i = 0; i < (spec.kind === 'booth' ? 4 : 9); i += 1) {
      const cols = spec.kind === 'booth' ? 1 : 3
      const size = spec.kind === 'booth' ? 140 : 140
      const x = 40 + (i % cols) * (size + 16)
      const y = 110 + Math.floor(i / cols) * (size + 16)
      ctx.fillStyle = spec.accent
      ctx.fillRect(x, y, spec.kind === 'booth' ? width - 80 : size, size)
    }
    return
  }
  if (spec.kind === 'story' || spec.kind === 'live' || spec.kind === 'reel') {
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 4; i += 1) ctx.fillRect(16 + i * 98, 90, 88, 4)
  }
  ctx.fillStyle = spec.ink
  ctx.font = '600 32px ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(title, 24, 160)
  ctx.font = '18px ui-sans-serif, system-ui, sans-serif'
  wrap(ctx, fields.caption || 'Write the caption.', width - 48)
    .slice(0, 8)
    .forEach((line, index) => ctx.fillText(line, 24, 210 + index * 28))
}

export default function SocialTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [feature, setFeature] = useState(SCREENS[1].feature)
  const spec = screenByFeature(feature)
  const [name, setName] = useState('Asha')
  const [handle, setHandle] = useState('@asha')
  const [caption, setCaption] = useState('On my way.')
  const [left, setLeft] = useState('😀')
  const [right, setRight] = useState('🔥')
  const [following, setFollowing] = useState('asha\ndev\nmina')
  const [followers, setFollowers] = useState('asha\nmina')
  const [taps, setTaps] = useState<Record<string, number>>({ Asha: 2, Dev: 1 })
  const [scores, setScores] = useState<Record<string, number>>({})
  const [step, setStep] = useState(0)
  const [guess, setGuess] = useState('')
  const members = useMemo(() => Object.keys(taps), [taps])
  const pair = nextPair(members, step)
  const missing = unfollowers(following.split('\n'), followers.split('\n'))
  const stamps = discordStamp(new Date('2026-11-23T12:00:00Z'))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (['lists', 'stamp', 'share', 'bias'].includes(spec.kind)) return
    paint(canvas, spec, { name, handle, caption, left, right })
  }, [spec, name, handle, caption, left, right])

  return (
    <ToolLayout
      title="Social screens"
      lede="Mock screens you fill in yourself, then download as a PNG. Nothing is posted."
    >
      <label className="field">
        <span>Screen</span>
        <select className="text-input" value={feature} onChange={(e) => setFeature(e.target.value)}>
          {SCREENS.map((item) => (
            <option key={item.feature} value={item.feature}>
              {item.feature}
            </option>
          ))}
        </select>
      </label>
      <div className="split">
        <section className="panel">
          {spec.kind === 'lists' ? (
            <>
              <label className="field">
                <span>Following, one per line</span>
                <textarea
                  className="code-area editor"
                  rows={6}
                  value={following}
                  onChange={(e) => setFollowing(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Followers, one per line</span>
                <textarea
                  className="code-area editor"
                  rows={6}
                  value={followers}
                  onChange={(e) => setFollowers(e.target.value)}
                />
              </label>
            </>
          ) : null}
          {spec.kind === 'share' ? (
            <div className="row">
              {members.map((member) => (
                <button
                  key={member}
                  type="button"
                  className="btn"
                  onClick={() => setTaps({ ...taps, [member]: taps[member] + 1 })}
                >
                  {member}
                </button>
              ))}
            </div>
          ) : null}
          {spec.kind === 'bias' && pair ? (
            <div className="row">
              {pair.map((person) => (
                <button
                  key={person}
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setScores(addPoint(scores, person))
                    setStep((n) => n + 1)
                  }}
                >
                  {person}
                </button>
              ))}
            </div>
          ) : null}
          {spec.kind === 'emoji' ? (
            <>
              <label className="field">
                <span>First emoji</span>
                <input className="text-input" value={left} onChange={(e) => setLeft(e.target.value)} />
              </label>
              <label className="field">
                <span>Second emoji</span>
                <input className="text-input" value={right} onChange={(e) => setRight(e.target.value)} />
              </label>
              {spec.feature === 'Emoji Kitchen game' ? (
                <label className="field">
                  <span>Guess the two emoji</span>
                  <input className="text-input" value={guess} onChange={(e) => setGuess(e.target.value)} />
                </label>
              ) : null}
            </>
          ) : null}
          {spec.kind !== 'lists' && spec.kind !== 'stamp' && spec.kind !== 'share' && spec.kind !== 'bias' ? (
            <>
              <label className="field">
                <span>Name</span>
                <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                <span>Handle</span>
                <input className="text-input" value={handle} onChange={(e) => setHandle(e.target.value)} />
              </label>
              <label className="field">
                <span>Caption</span>
                <textarea
                  className="code-area editor"
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </label>
            </>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              canvasRef.current?.toBlob((blob) => blob && void downloadNamed(blob, 'screen.png'), 'image/png')
            }
          >
            Download PNG
          </button>
        </section>
        <aside className="panel">
          {spec.kind === 'lists' ? (
            <ul>
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {missing.length === 0 ? <li>Everyone follows back.</li> : null}
            </ul>
          ) : null}
          {spec.kind === 'stamp' ? (
            <ul>
              {stamps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {spec.kind === 'share' ? (
            <ul>
              {lineShares(taps).map((row) => (
                <li key={row.name}>
                  {row.name} · {Math.round(row.share * 100)}%
                </li>
              ))}
            </ul>
          ) : null}
          {spec.kind === 'bias' ? (
            <ul>
              {Object.entries(scores).map(([person, points]) => (
                <li key={person}>
                  {person} · {points}
                </li>
              ))}
            </ul>
          ) : null}
          {spec.feature === 'Emoji Kitchen game' && guess.trim() === `${left}${right}` ? (
            <p className="lede">That matches.</p>
          ) : null}
          <canvas
            ref={canvasRef}
            className="paper-preview"
            hidden={['lists', 'stamp', 'share', 'bias'].includes(spec.kind)}
          />
        </aside>
      </div>
    </ToolLayout>
  )
}
