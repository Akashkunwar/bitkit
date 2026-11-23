import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import {
  addScore,
  assignRoles,
  canSteal,
  countdownLabel,
  meditationPhases,
  nextPlayer,
  nextPrompt,
  pickName,
  raceStep,
  rollNotation,
  simulateHunger,
  singleElim,
  targetPosition,
} from '../../lib/playroom'

type Mode =
  | 'screen'
  | 'countdown'
  | 'score'
  | 'meditate'
  | 'dice'
  | 'notation'
  | 'board'
  | 'imposter'
  | 'charades'
  | 'elephant'
  | 'cats'
  | 'bracket'
  | 'horse'
  | 'duck'
  | 'reindeer'
  | 'hunger'
  | 'marble'
  | 'country'

const MODES: { value: Mode; label: string }[] = [
  { value: 'screen', label: 'Classroom screen' },
  { value: 'countdown', label: 'Classroom countdown' },
  { value: 'score', label: 'Scoreboard' },
  { value: 'meditate', label: 'Meditation timer' },
  { value: 'dice', label: '3D physics dice' },
  { value: 'notation', label: 'D&D dice notation' },
  { value: 'board', label: 'Board game timer' },
  { value: 'imposter', label: 'Imposter' },
  { value: 'charades', label: 'Charades' },
  { value: 'elephant', label: 'White elephant' },
  { value: 'cats', label: 'Games for cats' },
  { value: 'bracket', label: 'Bracket' },
  { value: 'horse', label: 'Horse race' },
  { value: 'duck', label: 'Duck race' },
  { value: 'reindeer', label: 'Reindeer race' },
  { value: 'hunger', label: 'Hunger Games' },
  { value: 'marble', label: 'Marble race' },
  { value: 'country', label: 'Country marble race' },
]

const RACES: { mode: Mode; label: string; noun: string; step: string; initial: string }[] = [
  {
    mode: 'horse',
    label: 'Horse race',
    noun: 'Horses',
    step: 'Step the horses',
    initial: 'Chestnut\nBay\nGrey\nPinto',
  },
  {
    mode: 'duck',
    label: 'Duck race',
    noun: 'Ducks',
    step: 'Step the ducks',
    initial: 'Mallard\nTeal\nPintail\nWigeon',
  },
  {
    mode: 'reindeer',
    label: 'Reindeer race',
    noun: 'Reindeer',
    step: 'Step the reindeer',
    initial: 'Dasher\nDancer\nPrancer\nVixen',
  },
  {
    mode: 'marble',
    label: 'Marble race',
    noun: 'Marbles',
    step: 'Step the marbles',
    initial: 'Red\nBlue\nGreen\nGold',
  },
  {
    mode: 'country',
    label: 'Country marble race',
    noun: 'Countries',
    step: 'Step the countries',
    initial: 'Kenya\nJapan\nBrazil\nNorway',
  },
]

const readoutStyle = { fontSize: '3rem', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' as const, margin: 0 }
const stageStyle = { width: '100%', maxWidth: 420, height: 'auto', borderRadius: 12, background: '#111827' }

function splitList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function clampCount(raw: string, max: number): number {
  const value = Number(raw)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, Math.floor(value)))
}

function NamesField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="code-area editor"
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function ModeShell({ controls, result }: { controls: ReactNode; result: ReactNode }) {
  return (
    <div className="split">
      <section className="panel">{controls}</section>
      <aside className="panel">{result}</aside>
    </div>
  )
}

type RosterProps = {
  names: string[]
  roster: string
  onRoster: (value: string) => void
}

function ClassroomScreen({ names, roster, onRoster }: RosterProps) {
  const [seed, setSeed] = useState(1)
  const picked = pickName(names, seed)
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <button type="button" className="btn btn-primary" onClick={() => setSeed((current) => current + 1)}>
            Pick a name
          </button>
        </>
      }
      result={
        <>
          <h2>Classroom screen</h2>
          <p className="lede" style={readoutStyle}>
            {picked || 'Add at least one name.'}
          </p>
        </>
      }
    />
  )
}

function ClassroomCountdown() {
  const [setFor, setSetFor] = useState(65)
  const [left, setLeft] = useState(65)
  const [on, setOn] = useState(false)

  useEffect(() => {
    if (!on) return
    if (left <= 0) {
      setOn(false)
      return
    }
    const id = window.setInterval(() => {
      setLeft((seconds) => (seconds <= 0 ? 0 : seconds - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [on, left])

  return (
    <ModeShell
      controls={
        <>
          <label className="field">
            <span>Seconds</span>
            <input
              className="text-input"
              type="number"
              min={0}
              max={86400}
              value={setFor}
              onChange={(event) => {
                const next = clampCount(event.target.value, 86400)
                setSetFor(next)
                if (!on) setLeft(next)
              }}
            />
          </label>
          <div className="row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!on && left <= 0) setLeft(setFor)
                setOn((running) => !running)
              }}
            >
              {on ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOn(false)
                setLeft(setFor)
              }}
            >
              Reset
            </button>
          </div>
        </>
      }
      result={
        <>
          <h2>Classroom countdown</h2>
          <p className="lede" style={readoutStyle} aria-live="polite">
            {countdownLabel(left)}
          </p>
          <p className="hint">{left <= 0 ? 'Time is up.' : on ? 'Counting down.' : 'Press start to run the clock.'}</p>
        </>
      }
    />
  )
}

function Scoreboard({ names, roster, onRoster }: RosterProps) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const [delta, setDelta] = useState(1)
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <label className="field">
            <span>Points to add</span>
            <input
              className="text-input"
              type="number"
              min={1}
              max={100}
              value={delta}
              onChange={(event) => setDelta(Math.max(1, clampCount(event.target.value, 100)))}
            />
          </label>
        </>
      }
      result={
        <>
          <h2>Scoreboard</h2>
          {names.length === 0 ? <p className="hint">Add a name to keep score.</p> : null}
          <table className="data-table">
            <tbody>
              {names.map((name, index) => (
                <tr key={`${name}-${index}`}>
                  <td>{name}</td>
                  <td>{scores[name] ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setScores((current) => addScore(current, name, delta))}
                    >
                      Add {delta}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      }
    />
  )
}

function Meditation() {
  const phases = useMemo(() => meditationPhases(), [])
  const [index, setIndex] = useState(0)
  const [left, setLeft] = useState(phases[0]?.seconds ?? 0)
  const [on, setOn] = useState(false)
  const phase = phases[index] ?? phases[0]

  useEffect(() => {
    if (!on || phases.length === 0) return
    if (left <= 0) {
      const next = (index + 1) % phases.length
      const seconds = phases[next]?.seconds ?? 0
      if (seconds <= 0) {
        setOn(false)
        return
      }
      setIndex(next)
      setLeft(seconds)
      return
    }
    const id = window.setInterval(() => {
      setLeft((seconds) => seconds - 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [on, left, index, phases])

  return (
    <ModeShell
      controls={
        <>
          <p className="hint">The cycle walks inhale, hold, and exhale, then starts again.</p>
          <ol>
            {phases.map((item, itemIndex) => (
              <li key={`${item.name}-${itemIndex}`}>
                {item.name} · {item.seconds}s
              </li>
            ))}
          </ol>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => setOn((running) => !running)}>
              {on ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOn(false)
                setIndex(0)
                setLeft(phases[0]?.seconds ?? 0)
              }}
            >
              Restart cycle
            </button>
          </div>
        </>
      }
      result={
        <>
          <h2>Meditation timer</h2>
          <p className="lede" style={readoutStyle} aria-live="polite">
            {phase?.name ?? 'Breathe'}
          </p>
          <p className="lede">{countdownLabel(left)}</p>
        </>
      }
    />
  )
}

const DIE_VERTS: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
]

const DIE_FACES = [
  [0, 1, 2, 3],
  [4, 7, 6, 5],
  [0, 4, 5, 1],
  [3, 2, 6, 7],
  [0, 3, 7, 4],
  [1, 5, 6, 2],
]

function drawDie(ctx: CanvasRenderingContext2D, width: number, height: number, angle: number, value: string) {
  const ay = angle
  const ax = angle * 0.65
  const cosY = Math.cos(ay)
  const sinY = Math.sin(ay)
  const cosX = Math.cos(ax)
  const sinX = Math.sin(ax)
  const projected = DIE_VERTS.map(([x, y, z]) => {
    const x1 = x * cosY - z * sinY
    const z1 = x * sinY + z * cosY
    const y2 = y * cosX - z1 * sinX
    const z2 = y * sinX + z1 * cosX
    const perspective = 2.8 / (4 - z2)
    return { x: width / 2 + x1 * 78 * perspective, y: height / 2 + y2 * 78 * perspective, z: z2 }
  })
  const order = DIE_FACES.map((ids) => ({
    ids,
    depth: ids.reduce((sum, id) => sum + projected[id].z, 0) / ids.length,
  })).sort((a, b) => a.depth - b.depth)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, width, height)
  for (const face of order) {
    ctx.beginPath()
    face.ids.forEach((id, vertex) => {
      const point = projected[id]
      if (vertex === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.closePath()
    const light = Math.round(168 + face.depth * 36)
    ctx.fillStyle = `rgb(${light}, ${light + 6}, ${Math.min(255, light + 22)})`
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#0f172a'
    ctx.stroke()
  }
  const front = order[order.length - 1]
  if (!front) return
  const cx = front.ids.reduce((sum, id) => sum + projected[id].x, 0) / front.ids.length
  const cy = front.ids.reduce((sum, id) => sum + projected[id].y, 0) / front.ids.length
  ctx.fillStyle = '#111827'
  ctx.font = '700 32px ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(value, cx, cy)
}

function DiceRoll() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [seed, setSeed] = useState(1)
  const [face, setFace] = useState<number | null>(null)
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let alive = true
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      if (!alive) return
      const t = spinning ? Math.min(1, (now - started) / 900) : 1
      const angle = spinning ? t * Math.PI * 6 : 0.9
      const tumbling = String(1 + (Math.floor(t * 18) % 6))
      const shown = spinning && t < 1 ? tumbling : face === null ? '·' : String(face)
      drawDie(ctx, canvas.width, canvas.height, angle, shown)
      if (spinning && t < 1) frame = window.requestAnimationFrame(tick)
      else if (spinning) setSpinning(false)
    }
    frame = window.requestAnimationFrame(tick)
    return () => {
      alive = false
      window.cancelAnimationFrame(frame)
    }
  }, [spinning, face])

  return (
    <ModeShell
      controls={
        <>
          <p className="hint">
            A cube drawn on the canvas. Its faces tumble, then it settles on a 1d6 roll. This is not a physics engine.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const next = seed + 1
              setSeed(next)
              setFace(rollNotation('1d6', next).total)
              setSpinning(true)
            }}
          >
            Roll the cube
          </button>
        </>
      }
      result={
        <>
          <h2>3D physics dice</h2>
          <canvas
            ref={canvasRef}
            width={360}
            height={240}
            style={stageStyle}
            aria-label={face === null ? 'Drawn cube die' : `Drawn cube showing ${face}`}
          />
          <p className="lede" aria-live="polite">
            {face === null ? 'Roll to see a face.' : `Rolled ${face}`}
          </p>
        </>
      }
    />
  )
}

function NotationRoll() {
  const [text, setText] = useState('2d20+3')
  const [seed, setSeed] = useState(1)
  const [result, setResult] = useState<{ rolls: number[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roll = (notation: string) => {
    const next = seed + 1
    setSeed(next)
    setText(notation)
    try {
      setResult(rollNotation(notation, next))
      setError(null)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Could not roll that.')
    }
  }

  return (
    <ModeShell
      controls={
        <>
          <label className="field">
            <span>Dice notation</span>
            <input
              className="text-input"
              value={text}
              spellCheck={false}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => roll(text)}>
              Roll
            </button>
            <button type="button" className="btn" onClick={() => roll('2d20+3')}>
              2d20+3
            </button>
            <button type="button" className="btn" onClick={() => roll('4d6kh3')}>
              4d6kh3
            </button>
          </div>
          {error ? <p className="status-bad">{error}</p> : null}
        </>
      }
      result={
        <>
          <h2>D&D dice notation</h2>
          {result ? (
            <>
              <p className="hint">Dice that count: {result.rolls.join(', ')}</p>
              <p className="lede" style={readoutStyle}>
                {result.total}
              </p>
              <p className="hint">Seed {seed}</p>
            </>
          ) : (
            <p className="hint">Try 2d20+3 or 4d6kh3. Keep-highest keeps that many dice and adds them.</p>
          )}
        </>
      }
    />
  )
}

function BoardTimer({ names, roster, onRoster }: RosterProps) {
  const [setFor, setSetFor] = useState(30)
  const [left, setLeft] = useState(30)
  const [on, setOn] = useState(false)
  const [index, setIndex] = useState(0)
  const current = names.length ? names[((index % names.length) + names.length) % names.length] : ''

  useEffect(() => {
    if (!on) return
    if (names.length === 0) {
      setOn(false)
      return
    }
    if (left <= 0) {
      setIndex((player) => nextPlayer(names, player))
      setLeft(Math.max(1, setFor))
      return
    }
    const id = window.setInterval(() => {
      setLeft((seconds) => seconds - 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [on, left, names, setFor])

  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Players, one per line" />
          <label className="field">
            <span>Seconds per turn</span>
            <input
              className="text-input"
              type="number"
              min={1}
              max={3600}
              value={setFor}
              onChange={(event) => setSetFor(Math.max(1, clampCount(event.target.value, 3600)))}
            />
          </label>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => setOn((running) => !running)}>
              {on ? 'Pause clock' : 'Start clock'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIndex((player) => nextPlayer(names, player))
                setLeft(Math.max(1, setFor))
              }}
            >
              Next player
            </button>
          </div>
        </>
      }
      result={
        <>
          <h2>Board game timer</h2>
          <p className="lede" style={{ ...readoutStyle, fontSize: '2.2rem' }}>
            {current || 'Add a player.'}
          </p>
          <p className="lede" aria-live="polite">
            {countdownLabel(left)}
          </p>
          <ol>
            {names.map((name, player) => (
              <li key={`${name}-${player}`}>
                {name === current && player === index % names.length ? `${name} · turn` : name}
              </li>
            ))}
          </ol>
        </>
      }
    />
  )
}

function Imposter({ names, roster, onRoster }: RosterProps) {
  const [seed, setSeed] = useState(1)
  const [roles, setRoles] = useState<{ name: string; role: 'imposter' | 'crew' }[]>([])
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={names.length === 0}
            onClick={() => {
              const next = seed + 1
              setSeed(next)
              setRoles(assignRoles(names, next))
            }}
          >
            Assign roles
          </button>
          <p className="hint">Roles are dealt on this screen only.</p>
        </>
      }
      result={
        <>
          <h2>Imposter</h2>
          {roles.length === 0 ? <p className="hint">Assign roles when the group is in the list.</p> : null}
          <ul>
            {roles.map((entry) => (
              <li key={entry.name}>
                {entry.name} · {entry.role === 'imposter' ? 'Imposter' : 'Crew'}
              </li>
            ))}
          </ul>
        </>
      }
    />
  )
}

function Charades() {
  const [text, setText] = useState('The moon landing\nA cat at a piano\nLost keys\nMaking tea\nA slow train')
  const prompts = useMemo(() => splitList(text), [text])
  const [index, setIndex] = useState(0)
  const prompt = nextPrompt(prompts, index)
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={text} onChange={setText} label="Prompts, one per line" />
          <button type="button" className="btn btn-primary" onClick={() => setIndex((current) => current + 1)}>
            Next prompt
          </button>
        </>
      }
      result={
        <>
          <h2>Charades</h2>
          <p className="lede" style={{ ...readoutStyle, fontSize: '2rem' }}>
            {prompt || 'Add a prompt.'}
          </p>
          {prompts.length ? (
            <p className="hint">
              Prompt {(index % prompts.length) + 1} of {prompts.length}
            </p>
          ) : null}
        </>
      }
    />
  )
}

type Gift = { id: string; label: string; holder: string; opened: boolean; stolen: boolean }

function WhiteElephant({ names, roster, onRoster }: RosterProps) {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [thief, setThief] = useState('')

  const deal = () => {
    setGifts(
      names.map((name, index) => ({
        id: `${index}-${name}`,
        label: `Gift ${index + 1}`,
        holder: name,
        opened: false,
        stolen: false,
      })),
    )
    setThief(names[1] ?? names[0] ?? '')
  }

  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Players, one per line" />
          <label className="field">
            <span>Who steals</span>
            <select className="text-input" value={thief} onChange={(event) => setThief(event.target.value)}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" disabled={names.length === 0} onClick={deal}>
            Deal gifts
          </button>
          <p className="hint">A gift can be stolen once, and only after it is opened.</p>
        </>
      }
      result={
        <>
          <h2>White elephant</h2>
          {gifts.length === 0 ? <p className="hint">Deal one wrapped gift per player.</p> : null}
          <ul>
            {gifts.map((gift) => {
              const allowed = canSteal(gift.opened, gift.stolen) && thief.length > 0 && thief !== gift.holder
              return (
                <li key={gift.id}>
                  <strong>{gift.label}</strong> · {gift.holder}
                  <span> · {gift.stolen ? 'Stolen' : gift.opened ? 'Opened' : 'Wrapped'}</span>
                  <div className="row">
                    <button
                      type="button"
                      className="btn"
                      disabled={gift.opened}
                      onClick={() =>
                        setGifts((current) =>
                          current.map((item) => (item.id === gift.id ? { ...item, opened: true } : item)),
                        )
                      }
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={!allowed}
                      onClick={() =>
                        setGifts((current) =>
                          current.map((item) =>
                            item.id === gift.id && canSteal(item.opened, item.stolen)
                              ? { ...item, stolen: true, holder: thief }
                              : item,
                          ),
                        )
                      }
                    >
                      Steal
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      }
    />
  )
}

function CatPlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const margin = 28
    const span = Math.max(0, Math.min(canvas.width, canvas.height) - margin * 2)
    let seed = 1
    let target = targetPosition(seed, span)
    let x = margin + target.x
    let y = margin + target.y
    let frame = 0
    const tick = () => {
      const tx = margin + target.x
      const ty = margin + target.y
      x += (tx - x) * 0.045
      y += (ty - y) * 0.045
      if ((tx - x) ** 2 + (ty - y) ** 2 < 9) {
        seed += 1
        target = targetPosition(seed, span)
      }
      ctx.fillStyle = '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.strokeRect(margin, margin, span, span)
      ctx.beginPath()
      ctx.arc(x, y, 16, 0, Math.PI * 2)
      ctx.fillStyle = '#fb7185'
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff7ed'
      ctx.fill()
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <ModeShell
      controls={
        <p className="hint">
          A target moves inside the box. It is a canvas drawing for a cat to follow, with no network and no physics
          engine.
        </p>
      }
      result={
        <>
          <h2>Games for cats</h2>
          <canvas ref={canvasRef} width={360} height={280} style={stageStyle} aria-label="Moving target" />
        </>
      }
    />
  )
}

function Bracket({ names, roster, onRoster }: RosterProps) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const rosterKey = names.join('\n')

  useEffect(() => {
    setPicks({})
  }, [rosterKey])

  const rounds = useMemo(() => {
    const built: string[][][] = []
    let current = names
    let champion = ''
    for (let round = 0; round < 8 && current.length > 0; round += 1) {
      if (current.length === 1) {
        champion = current[0] ?? ''
        break
      }
      const matches = singleElim(current)
      built.push(matches)
      const winners = matches.map((match, matchIndex) => {
        if (match.length < 2) return match[0] ?? ''
        const pick = picks[`${round}-${matchIndex}`]
        return pick && match.includes(pick) ? pick : ''
      })
      if (winners.some((winner) => winner.length === 0)) break
      current = winners
    }
    return { built, champion }
  }, [names, picks])

  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <button type="button" className="btn" onClick={() => setPicks({})}>
            Reset bracket
          </button>
          <p className="hint">The first round is a single-elimination pairing. Choose a winner in each match.</p>
        </>
      }
      result={
        <>
          <h2>Bracket</h2>
          {names.length < 2 ? <p className="hint">Add at least two names.</p> : null}
          {rounds.built.map((matches, roundIndex) => (
            <div key={roundIndex}>
              <h3>Round {roundIndex + 1}</h3>
              <ul>
                {matches.map((match, matchIndex) => (
                  <li key={`${roundIndex}-${matchIndex}`}>
                    {match.length < 2 ? (
                      <span>{match[0]} · bye</span>
                    ) : (
                      <div className="row">
                        {match.map((name) => {
                          const selected = picks[`${roundIndex}-${matchIndex}`] === name
                          return (
                            <button
                              key={name}
                              type="button"
                              className={selected ? 'btn btn-primary' : 'btn'}
                              aria-pressed={selected}
                              onClick={() =>
                                setPicks((current) => ({ ...current, [`${roundIndex}-${matchIndex}`]: name }))
                              }
                            >
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {rounds.champion ? <p className="lede">Winner {rounds.champion}</p> : null}
        </>
      }
    />
  )
}

function Race({ label, noun, step, initial }: { label: string; noun: string; step: string; initial: string }) {
  const [text, setText] = useState(initial)
  const entrants = useMemo(() => splitList(text), [text])
  const [seed, setSeed] = useState(1)
  const order = useMemo(() => raceStep(entrants, seed), [entrants, seed])
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={text} onChange={setText} label={`${noun}, one per line`} />
          <button
            type="button"
            className="btn btn-primary"
            disabled={entrants.length === 0}
            onClick={() => setSeed((current) => current + 1)}
          >
            {step}
          </button>
        </>
      }
      result={
        <>
          <h2>{label}</h2>
          <p className="hint">
            {noun} · seed {seed}
          </p>
          <ol>
            {order.map((name, index) => (
              <li key={`${name}-${index}`}>
                {index + 1}. {name}
              </li>
            ))}
          </ol>
        </>
      }
    />
  )
}

function Hunger({ names, roster, onRoster }: RosterProps) {
  const [seed, setSeed] = useState(1)
  const order = useMemo(() => simulateHunger(names, seed), [names, seed])
  const winner = order[order.length - 1]
  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Tributes, one per line" />
          <button
            type="button"
            className="btn btn-primary"
            disabled={names.length === 0}
            onClick={() => setSeed((current) => current + 1)}
          >
            Step the games
          </button>
        </>
      }
      result={
        <>
          <h2>Hunger Games</h2>
          <p className="hint">Seed {seed}. The last name is the winner.</p>
          {names.length === 0 ? <p className="hint">Add a tribute.</p> : null}
          <ol>
            {order.map((name, index) => (
              <li key={`${name}-${index}`}>{index === order.length - 1 ? `Winner ${name}` : `Out ${name}`}</li>
            ))}
          </ol>
          {winner ? <p className="lede">{winner}</p> : null}
        </>
      }
    />
  )
}

export default function PlayroomTool() {
  const [mode, setMode] = useState<Mode>('screen')
  const [roster, setRoster] = useState('Asha\nDev\nMina\nRohit')
  const names = useMemo(() => splitList(roster), [roster])
  const race = RACES.find((item) => item.mode === mode)

  return (
    <ToolLayout
      title="Playroom"
      lede="Classroom picks, timers, dice, party games, and races. Rolls and shuffles stay in this tab."
    >
      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />
      {mode === 'screen' ? <ClassroomScreen names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'countdown' ? <ClassroomCountdown /> : null}
      {mode === 'score' ? <Scoreboard names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'meditate' ? <Meditation /> : null}
      {mode === 'dice' ? <DiceRoll /> : null}
      {mode === 'notation' ? <NotationRoll /> : null}
      {mode === 'board' ? <BoardTimer names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'imposter' ? <Imposter names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'charades' ? <Charades /> : null}
      {mode === 'elephant' ? <WhiteElephant names={names} roster={roster} onRoster={setRoster} /> : null}
      {mode === 'cats' ? <CatPlay /> : null}
      {mode === 'bracket' ? <Bracket names={names} roster={roster} onRoster={setRoster} /> : null}
      {race ? <Race label={race.label} noun={race.noun} step={race.step} initial={race.initial} /> : null}
      {mode === 'hunger' ? <Hunger names={names} roster={roster} onRoster={setRoster} /> : null}
    </ToolLayout>
  )
}
