import { useEffect, useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { mulberry32 } from '../../lib/games/random'
import {
  answerMatches,
  CLUE_LIMIT_MS,
  CLUES,
  clueScore,
  freshLives,
  orderPrompts,
  QUESTIONS,
  rivalCorrect,
  stepLives,
  type Lives,
  type Picture,
} from '../../lib/games/show'
import { useTick } from './loop'

type Mode = 'clues' | 'lives'

export default function ShowTool() {
  const [mode, setMode] = useState<Mode>('clues')
  return (
    <ToolLayout
      title="Pop Sauce"
      lede="Name the clue before the timer ends, or keep a life longer than the rival. Nothing is stored."
    >
      <Segmented
        label="Round"
        value={mode}
        options={[
          { value: 'clues', label: 'Clues' },
          { value: 'lives', label: 'Lives' },
        ]}
        onChange={setMode}
      />
      {mode === 'clues' ? <Clues /> : <LivesRound />}
    </ToolLayout>
  )
}

function Clues() {
  const [seed, setSeed] = useState(11)
  const deck = useMemo(() => orderPrompts(CLUES, seed), [seed])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [locked, setLocked] = useState(false)
  const [points, setPoints] = useState<number | null>(null)
  const [text, setText] = useState('')
  const clue = deck[index]
  const finished = index >= deck.length

  useTick(() => {
    if (locked || finished) return
    setElapsed((ms) => Math.min(CLUE_LIMIT_MS, ms + 100))
  }, 100)

  useEffect(() => {
    if (!locked && !finished && elapsed >= CLUE_LIMIT_MS) {
      setLocked(true)
      setPoints(0)
    }
  }, [elapsed, locked, finished])

  const submit = () => {
    if (locked || finished || !clue) return
    const got = answerMatches(text, clue.answers) ? clueScore(elapsed) : 0
    setPoints(got)
    setScore((current) => current + got)
    setLocked(true)
  }

  const next = () => {
    setIndex((current) => current + 1)
    setElapsed(0)
    setLocked(false)
    setPoints(null)
    setText('')
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        {finished ? `Score ${score}` : `Score ${score} · ${index + 1} of ${deck.length}`}
      </p>
      {clue && !finished ? (
        <>
          <PictureMark id={clue.picture} />
          <p className="lede">{clue.prompt}</p>
          <div className="fuse-timer" aria-hidden="true">
            <span style={{ width: `${Math.max(0, 100 - (elapsed / CLUE_LIMIT_MS) * 100)}%` }} />
          </div>
          {locked ? (
            <p className="hint">
              {points ? `${points} ${points === 1 ? 'point' : 'points'}.` : 'Time.'} Answer: {clue.answers[0]}.
            </p>
          ) : (
            <div className="arcade-keys">
              <input
                className="text-input"
                style={{ maxWidth: 280 }}
                aria-label="Answer"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit()
                }}
              />
              <button type="button" className="btn btn-primary" onClick={submit}>
                Answer
              </button>
            </div>
          )}
          {locked ? (
            <button type="button" className="btn" onClick={next}>
              Next
            </button>
          ) : null}
        </>
      ) : null}
      <button
        type="button"
        className="btn"
        onClick={() => {
          setSeed((current) => current + 1)
          setIndex(0)
          setScore(0)
          setElapsed(0)
          setLocked(false)
          setPoints(null)
          setText('')
        }}
      >
        Restart
      </button>
    </div>
  )
}

function LivesRound() {
  const [seed, setSeed] = useState(7)
  const deck = useMemo(() => orderPrompts(QUESTIONS, seed), [seed])
  const rand = useRef(mulberry32(seed))
  const [state, setState] = useState<Lives>(() => freshLives())
  const [text, setText] = useState('')
  const [pending, setPending] = useState<{ correct: boolean; rival: boolean; answer: string } | null>(null)
  const question = deck[state.index]

  useEffect(() => {
    rand.current = mulberry32(seed)
  }, [seed])

  const submit = () => {
    if (pending || state.over || !question) return
    setPending({
      correct: answerMatches(text, question.answers),
      rival: rivalCorrect(rand.current),
      answer: question.answers[0],
    })
    setText('')
  }

  const advance = () => {
    if (!pending) return
    setState(stepLives(state, pending.correct, pending.rival, deck.length))
    setPending(null)
  }

  return (
    <div className="stack">
      <p className="hint" aria-live="polite">
        You {hearts(state.you)} · Rival {hearts(state.rival)}
        {state.over ? ` · ${state.over === 'you' ? 'You won' : state.over === 'rival' ? 'Rival won' : 'Draw'}` : ''}
      </p>
      {!state.over && question ? (
        <>
          <p className="lede">{question.prompt}</p>
          {pending ? (
            <p className="hint">
              {pending.correct ? 'Right.' : `Answer: ${pending.answer}.`}{' '}
              {pending.rival ? 'Rival was right.' : 'Rival missed.'}
            </p>
          ) : (
            <div className="arcade-keys">
              <input
                className="text-input"
                style={{ maxWidth: 280 }}
                aria-label="Answer"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit()
                }}
              />
              <button type="button" className="btn btn-primary" onClick={submit}>
                Answer
              </button>
            </div>
          )}
          {pending ? (
            <button type="button" className="btn" onClick={advance}>
              Continue
            </button>
          ) : null}
        </>
      ) : (
        <p className="hint">
          You {state.youRight} · Rival {state.rivalRight}
        </p>
      )}
      <button
        type="button"
        className="btn"
        onClick={() => {
          const next = seed + 1
          rand.current = mulberry32(next)
          setSeed(next)
          setState(freshLives())
          setText('')
          setPending(null)
        }}
      >
        Restart
      </button>
    </div>
  )
}

function hearts(n: number): string {
  return `${'●'.repeat(n)}${'○'.repeat(Math.max(0, 3 - n))}`
}

function PictureMark({ id }: { id?: Picture }) {
  if (!id) return null
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Picture clue">
      <rect width="140" height="140" rx="12" fill="var(--bg-mute)" />
      <PictureShape id={id} />
    </svg>
  )
}

function PictureShape({ id }: { id: Picture }) {
  const ink = 'var(--ink)'
  if (id === 'sun') {
    return (
      <g stroke={ink} fill="none" strokeWidth="3">
        <circle cx="70" cy="70" r="22" fill="var(--accent)" stroke={ink} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180
          return (
            <line
              key={angle}
              x1={70 + Math.cos(rad) * 30}
              y1={70 + Math.sin(rad) * 30}
              x2={70 + Math.cos(rad) * 42}
              y2={70 + Math.sin(rad) * 42}
            />
          )
        })}
      </g>
    )
  }
  if (id === 'house') {
    return (
      <g stroke={ink} fill="none" strokeWidth="3">
        <polygon points="70,28 108,62 32,62" fill="var(--accent)" />
        <rect x="40" y="62" width="60" height="46" />
        <rect x="62" y="82" width="16" height="26" />
      </g>
    )
  }
  if (id === 'boat') {
    return (
      <g stroke={ink} fill="none" strokeWidth="3">
        <path d="M28 84 L112 84 L96 108 L44 108 Z" fill="var(--accent)" />
        <line x1="70" y1="84" x2="70" y2="36" />
        <polygon points="70,40 98,78 70,78" fill="var(--bg-elev)" />
      </g>
    )
  }
  if (id === 'tree') {
    return (
      <g stroke={ink} strokeWidth="3">
        <rect x="62" y="86" width="16" height="28" fill="var(--ink)" />
        <circle cx="70" cy="62" r="30" fill="var(--accent)" />
      </g>
    )
  }
  if (id === 'moon') {
    return <path d="M78 28 A36 36 0 1 0 78 112 A28 28 0 1 1 78 28" fill="var(--accent)" stroke={ink} strokeWidth="3" />
  }
  if (id === 'key') {
    return (
      <g stroke={ink} fill="none" strokeWidth="3">
        <circle cx="52" cy="58" r="16" />
        <line x1="66" y1="66" x2="108" y2="108" />
        <line x1="92" y1="92" x2="104" y2="80" />
      </g>
    )
  }
  if (id === 'star') {
    return (
      <polygon
        points="70,24 82,54 114,56 90,76 98,108 70,90 42,108 50,76 26,56 58,54"
        fill="var(--accent)"
        stroke={ink}
        strokeWidth="3"
      />
    )
  }
  if (id === 'cloud') {
    return (
      <g fill="var(--bg-elev)" stroke={ink} strokeWidth="3">
        <ellipse cx="58" cy="78" rx="22" ry="16" />
        <ellipse cx="82" cy="74" rx="26" ry="18" />
        <ellipse cx="70" cy="88" rx="34" ry="14" />
      </g>
    )
  }
  if (id === 'cup') {
    return (
      <g stroke={ink} fill="none" strokeWidth="3">
        <path d="M40 48 H96 L88 100 H48 Z" fill="var(--accent)" />
        <path d="M96 58 H108 A12 12 0 0 1 108 82 H96" />
      </g>
    )
  }
  return (
    <g stroke={ink} fill="none" strokeWidth="3">
      <ellipse cx="68" cy="72" rx="32" ry="16" fill="var(--accent)" />
      <polygon points="100,72 124,58 124,86" fill="var(--accent)" />
      <circle cx="52" cy="68" r="2" fill={ink} />
    </g>
  )
}
