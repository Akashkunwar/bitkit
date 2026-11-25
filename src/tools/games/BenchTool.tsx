import { useEffect, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import {
  AIM_ROUNDS,
  aimPoint,
  benchLine,
  CHIMP_GRID,
  clickChimp,
  dealChimp,
  digitsFor,
  freshSequence,
  freshVerbal,
  freshVisual,
  holdForDigits,
  judgeVerbal,
  pickVisual,
  pressSequence,
  revealVisual,
  typingScore,
  type Chimp,
  type Sequence,
  type Verbal,
  type Visual,
} from '../../lib/games/bench'
import { mulberry32 } from '../../lib/games/random'

type Mode = 'reaction' | 'sequence' | 'aim' | 'number' | 'verbal' | 'chimp' | 'visual' | 'typing'

const MODES: { value: Mode; label: string }[] = [
  { value: 'reaction', label: 'Reaction' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'aim', label: 'Aim' },
  { value: 'number', label: 'Numbers' },
  { value: 'verbal', label: 'Words' },
  { value: 'chimp', label: 'Chimp' },
  { value: 'visual', label: 'Squares' },
  { value: 'typing', label: 'Typing' },
]

export default function BenchTool() {
  const [mode, setMode] = useState<Mode>('reaction')
  return (
    <ToolLayout
      title="Human Benchmark"
      lede="Reaction, a growing 3×3 sequence, thirty targets, digits, seen-or-new words, the number grid, flashing squares, and a short typing line. Nothing is stored."
    >
      <Segmented label="Drill" value={mode} options={MODES} onChange={setMode} />
      {mode === 'reaction' ? <Reaction /> : null}
      {mode === 'sequence' ? <SequenceDrill /> : null}
      {mode === 'aim' ? <Aim /> : null}
      {mode === 'number' ? <Numbers /> : null}
      {mode === 'verbal' ? <Words /> : null}
      {mode === 'chimp' ? <ChimpDrill /> : null}
      {mode === 'visual' ? <Squares /> : null}
      {mode === 'typing' ? <TypingLine /> : null}
    </ToolLayout>
  )
}

function Reaction() {
  const [wait, setWait] = useState<'idle' | 'wait' | 'go' | 'done'>('idle')
  const [ms, setMs] = useState<number | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const started = useRef(0)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const start = () => {
    setMs(null)
    setWait('wait')
    timer.current = window.setTimeout(
      () => {
        started.current = performance.now()
        setWait('go')
      },
      800 + Math.random() * 2200,
    )
  }

  const tap = () => {
    if (wait === 'wait') {
      window.clearTimeout(timer.current)
      setWait('idle')
      setMs(-1)
      return
    }
    if (wait !== 'go') return
    const next = Math.round(performance.now() - started.current)
    setMs(next)
    setBest((current) => (current == null || next < current ? next : current))
    setWait('done')
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {best == null ? 'Wait for green, then click.' : `Best ${best} ms`}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        style={{
          minHeight: 160,
          width: '100%',
          background: wait === 'go' ? '#2f7d55' : undefined,
          color: wait === 'go' ? '#f7f4ea' : undefined,
        }}
        onClick={() => (wait === 'idle' || wait === 'done' ? start() : tap())}
      >
        {wait === 'idle'
          ? 'Start'
          : wait === 'wait'
            ? 'Wait for green'
            : wait === 'go'
              ? 'Now'
              : ms != null && ms < 0
                ? 'Too early'
                : `${ms} ms`}
      </button>
    </div>
  )
}

function SequenceDrill() {
  const rand = useRef(mulberry32(9))
  const [game, setGame] = useState<Sequence>(() => freshSequence(rand.current))
  const [lit, setLit] = useState(-1)
  const [phase, setPhase] = useState<'show' | 'play'>('show')

  useEffect(() => {
    if (phase !== 'show' || game.failed) return
    const timers = game.order.flatMap((cell, index) => [
      window.setTimeout(() => setLit(cell), index * 520),
      window.setTimeout(() => setLit(-1), index * 520 + 320),
    ])
    timers.push(window.setTimeout(() => setPhase('play'), game.order.length * 520 + 40))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [phase, game.order, game.failed])

  const press = (cell: number) => {
    if (phase !== 'play' || game.failed) return
    const next = pressSequence(game, cell, rand.current)
    setGame(next)
    if (!next.failed && next.order !== game.order) setPhase('show')
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {game.failed
          ? `Missed at length ${game.order.length}`
          : phase === 'show'
            ? 'Watch'
            : `Length ${game.order.length}`}
      </p>
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 280 }}>
        {Array.from({ length: 9 }, (_, index) => (
          <button
            key={index}
            type="button"
            className={lit === index ? 'arcade-cell arcade-tile' : 'arcade-cell'}
            aria-label={`Square ${index + 1}`}
            onClick={() => press(index)}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setGame(freshSequence(rand.current))
          setPhase('show')
          setLit(-1)
        }}
      >
        Restart
      </button>
    </div>
  )
}

function Aim() {
  const rand = useRef(mulberry32(Date.now() % 1_000_000_000))
  const started = useRef(performance.now())
  const [left, setLeft] = useState(AIM_ROUNDS)
  const [point, setPoint] = useState(() => aimPoint(rand.current))
  const [times, setTimes] = useState<number[]>([])

  const average = times.length ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length) : 0

  const hit = () => {
    const now = performance.now()
    const next = times.concat(Math.round(now - started.current))
    setTimes(next)
    if (next.length >= AIM_ROUNDS) {
      setLeft(0)
      return
    }
    started.current = now
    setPoint(aimPoint(rand.current))
    setLeft(AIM_ROUNDS - next.length)
  }

  const restart = () => {
    rand.current = mulberry32(Date.now() % 1_000_000_000)
    started.current = performance.now()
    setTimes([])
    setLeft(AIM_ROUNDS)
    setPoint(aimPoint(rand.current))
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {left === 0 ? `Average ${average} ms` : `${left} targets · click the circle`}
      </p>
      <div className="panel" style={{ position: 'relative', height: 320 }}>
        {left > 0 ? (
          <button
            type="button"
            aria-label="Target"
            onClick={hit}
            style={{
              position: 'absolute',
              left: `${point.x}%`,
              top: `${point.y}%`,
              width: 52,
              height: 52,
              minHeight: 52,
              padding: 0,
              borderRadius: 99,
              border: '1px solid var(--line-strong)',
              background: 'var(--accent)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ) : null}
      </div>
      <button type="button" className="btn" onClick={restart}>
        Restart
      </button>
    </div>
  )
}

function Numbers() {
  const rand = useRef(mulberry32(5))
  const [level, setLevel] = useState(1)
  const [value, setValue] = useState(() => digitsFor(1, rand.current))
  const [phase, setPhase] = useState<'show' | 'type' | 'done'>('show')
  const [typed, setTyped] = useState('')
  const [remembered, setRemembered] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase !== 'show') return
    const id = window.setTimeout(() => setPhase('type'), holdForDigits(level))
    return () => window.clearTimeout(id)
  }, [phase, level, value])

  useEffect(() => {
    if (phase === 'type') input.current?.focus()
  }, [phase, value])

  const begin = (next: number) => {
    setLevel(next)
    setValue(digitsFor(next, rand.current))
    setTyped('')
    setPhase('show')
  }

  const submit = () => {
    if (phase !== 'type') return
    if (typed === value) {
      setRemembered(level)
      if (level >= 20) setPhase('done')
      else begin(level + 1)
      return
    }
    setPhase('done')
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {phase === 'done'
          ? `Remembered ${remembered} ${remembered === 1 ? 'digit' : 'digits'}`
          : `${level} ${level === 1 ? 'digit' : 'digits'}`}
      </p>
      {phase === 'show' ? (
        <p className="fuse-prompt" style={{ letterSpacing: '0.08em' }}>
          {value}
        </p>
      ) : null}
      {phase === 'type' ? (
        <div className="arcade-keys">
          <input
            ref={input}
            className="text-input"
            style={{ maxWidth: 240 }}
            inputMode="numeric"
            aria-label="Number"
            value={typed}
            onChange={(event) => setTyped(event.target.value.replace(/\D/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
          />
          <button type="button" className="btn btn-primary" onClick={submit}>
            Check
          </button>
        </div>
      ) : null}
      {phase === 'done' ? <p className="hint">The number was {value}.</p> : null}
      <button
        type="button"
        className="btn"
        onClick={() => {
          setRemembered(0)
          begin(1)
        }}
      >
        Restart
      </button>
    </div>
  )
}

function Words() {
  const rand = useRef(mulberry32(3))
  const [game, setGame] = useState<Verbal>(() => freshVerbal(rand.current))

  const call = (claim: 'seen' | 'new') => {
    if (game.over) return
    setGame(judgeVerbal(game, claim, rand.current))
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {game.over
          ? `Score ${game.score}`
          : `Score ${game.score} · ${game.lives} ${game.lives === 1 ? 'life' : 'lives'}`}
      </p>
      <p className="fuse-prompt" style={{ fontSize: '2rem', letterSpacing: 0 }}>
        {game.current}
      </p>
      <div className="arcade-keys">
        <button type="button" className="btn btn-primary" disabled={game.over} onClick={() => call('seen')}>
          Seen
        </button>
        <button type="button" className="btn" disabled={game.over} onClick={() => call('new')}>
          New
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            rand.current = mulberry32(Date.now() % 1_000_000_000)
            setGame(freshVerbal(rand.current))
          }}
        >
          Restart
        </button>
      </div>
    </div>
  )
}

function ChimpDrill() {
  const rand = useRef(mulberry32(8))
  const [game, setGame] = useState<Chimp>(() => dealChimp(4, 0, rand.current))

  const click = (cell: number) => {
    if (game.over || game.done) return
    if (!game.spots.includes(cell)) return
    setGame(clickChimp(game, cell, rand.current))
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {game.done
          ? `Cleared ${game.cleared}`
          : game.over
            ? `Missed at ${game.count}`
            : `Click 1 through ${game.count}`}
      </p>
      <div className="arcade-grid" style={{ gridTemplateColumns: `repeat(${CHIMP_GRID}, 1fr)`, maxWidth: 420 }}>
        {Array.from({ length: CHIMP_GRID * CHIMP_GRID }, (_, cell) => {
          const number = game.spots.indexOf(cell) + 1
          if (!number)
            return <span key={cell} className="arcade-cell" style={{ visibility: 'hidden' }} aria-hidden="true" />
          const show = !game.hidden && !game.done
          return (
            <button
              key={cell}
              type="button"
              className="arcade-cell"
              aria-label={show ? `Number ${number}` : 'Hidden number'}
              onClick={() => click(cell)}
            >
              {show ? number : ''}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          rand.current = mulberry32(Date.now() % 1_000_000_000)
          setGame(dealChimp(4, 0, rand.current))
        }}
      >
        Restart
      </button>
    </div>
  )
}

function Squares() {
  const rand = useRef(mulberry32(4))
  const [game, setGame] = useState<Visual>(() => freshVisual(1, rand.current))

  useEffect(() => {
    if (game.phase !== 'show' || game.over || game.done) return
    const id = window.setTimeout(() => setGame((current) => revealVisual(current)), 650 + game.tiles.length * 260)
    return () => window.clearTimeout(id)
  }, [game.phase, game.level, game.over, game.done, game.tiles.length])

  const click = (cell: number) => setGame(pickVisual(game, cell, rand.current))

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {game.done
          ? `Cleared level ${game.level}`
          : game.over
            ? `Missed at level ${game.level}`
            : `Level ${game.level}`}
      </p>
      <div className="arcade-grid" style={{ gridTemplateColumns: `repeat(${game.size}, 1fr)`, maxWidth: 360 }}>
        {Array.from({ length: game.size * game.size }, (_, cell) => {
          const on = game.tiles.includes(cell)
          const lit = (game.phase === 'show' && on) || game.picked.includes(cell) || (game.over && on)
          return (
            <button
              key={cell}
              type="button"
              className={lit ? 'arcade-cell arcade-tile' : 'arcade-cell'}
              aria-label="Square"
              disabled={game.phase === 'show' || game.over || game.done}
              onClick={() => click(cell)}
            />
          )
        })}
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          rand.current = mulberry32(Date.now() % 1_000_000_000)
          setGame(freshVisual(1, rand.current))
        }}
      >
        Restart
      </button>
    </div>
  )
}

function TypingLine() {
  const rand = useRef(mulberry32(6))
  const [line, setLine] = useState(() => benchLine(rand.current))
  const [typed, setTyped] = useState('')
  const [score, setScore] = useState<{ wpm: number; accuracy: number } | null>(null)
  const started = useRef(0)

  const restart = () => {
    rand.current = mulberry32(Date.now() % 1_000_000_000)
    setLine(benchLine(rand.current))
    setTyped('')
    setScore(null)
    started.current = 0
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {score ? `${score.wpm} wpm · ${score.accuracy}%` : 'Type the line.'}
      </p>
      <p className="lede">
        {line.split('').map((char, index) => {
          const got = typed[index]
          const color = got == null ? 'var(--muted)' : got === char ? 'var(--ink)' : '#a33b32'
          return (
            <span key={index} style={{ color }}>
              {char}
            </span>
          )
        })}
      </p>
      <input
        className="text-input"
        aria-label="Typing line"
        value={typed}
        disabled={score != null}
        onChange={(event) => {
          if (score) return
          const next = event.target.value
          if (next.length > line.length) return
          if (!started.current) started.current = performance.now()
          setTyped(next)
          if (next.length === line.length) setScore(typingScore(next, line, performance.now() - started.current))
        }}
      />
      <button type="button" className="btn" onClick={restart}>
        Restart
      </button>
    </div>
  )
}
