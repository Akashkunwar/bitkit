import { useEffect, useMemo, useRef, useState } from 'react'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import { getPref, setPref } from '../../lib/db'
import {
  accuracy,
  confidence,
  lessonWords,
  netWpm,
  rawWpm,
  recordKey,
  speedWords,
  unlockedLetters,
  type Attempt,
  type LearnStats,
} from '../../lib/typing'

type Mode = 'learn' | 'speed'
type SpeedKind = 'time' | 'words'
type Run = 'idle' | 'running' | 'done'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const TIMES = [15, 30, 60] as const
const COUNTS = [10, 25, 50] as const

export default function TypingTool() {
  const [mode, setMode] = useState<Mode>('learn')
  const [stats, setStats] = useState<LearnStats>({})
  const [loaded, setLoaded] = useState(false)
  const [learnWords, setLearnWords] = useState<string[]>([])
  const [learnIndex, setLearnIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [badKey, setBadKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const [kind, setKind] = useState<SpeedKind>('time')
  const [seconds, setSeconds] = useState(30)
  const [count, setCount] = useState(25)
  const [punctuation, setPunctuation] = useState(false)
  const [numbers, setNumbers] = useState(false)
  const [speedList, setSpeedList] = useState<string[]>(() => speedWords(120, { punctuation: false, numbers: false }))
  const [speedIndex, setSpeedIndex] = useState(0)
  const [completed, setCompleted] = useState<Attempt[]>([])
  const [run, setRun] = useState<Run>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [keystrokes, setKeystrokes] = useState(0)
  const [bests, setBests] = useState<Record<string, { wpm: number; acc: number }>>({})

  const inputRef = useRef<HTMLInputElement>(null)
  const typedRef = useRef('')
  const lastRef = useRef(0)
  const runRef = useRef<Run>('idle')
  const speedListRef = useRef(speedList)
  const speedIndexRef = useRef(0)
  speedListRef.current = speedList
  speedIndexRef.current = speedIndex
  const startedRef = useRef(0)
  const letters = useMemo(() => unlockedLetters(stats), [stats])
  const nextLetter = letters.length < 26 ? 'etaoinshrdlucmfwypvbgkqjxz'[letters.length] : null
  const knownLetters = useRef(0)

  useEffect(() => {
    if (!loaded) return
    if (knownLetters.current === 0) {
      knownLetters.current = letters.length
      return
    }
    if (letters.length > knownLetters.current) setNotice(`Unlocked “${letters.at(-1)}”`)
    knownLetters.current = letters.length
  }, [loaded, letters])

  useEffect(() => {
    void getPref<LearnStats>('typing-learn', {}).then((saved) => {
      setStats(saved)
      setLearnWords(lessonWords(unlockedLetters(saved), saved, 18))
      setLoaded(true)
    })
    void getPref<Record<string, { wpm: number; acc: number }>>('typing-best', {}).then(setBests)
  }, [])

  useEffect(() => {
    if (!loaded) return
    const id = window.setTimeout(() => void setPref('typing-learn', stats), 350)
    return () => window.clearTimeout(id)
  }, [stats, loaded])

  useEffect(() => {
    if (run !== 'running' || kind !== 'time') return
    const id = window.setInterval(() => {
      const next = performance.now() - startedRef.current
      setElapsed(next)
      if (next >= seconds * 1000) finishRef.current(next)
    }, 80)
    return () => window.clearInterval(id)
  }, [run, kind, seconds])

  const sync = (value: string) => {
    typedRef.current = value
    if (inputRef.current && inputRef.current.value !== value) inputRef.current.value = value
    setTyped(value)
  }

  const miss = (letter: string) => {
    setStats((current) => recordKey(current, letter, false, 0))
    setBadKey(letter)
    window.setTimeout(() => setBadKey((key) => (key === letter ? null : key)), 160)
  }

  const onLearn = (value: string) => {
    const word = learnWords[learnIndex] ?? ''
    if (value.endsWith(' ')) {
      if (value.slice(0, -1) === word && word) {
        sync('')
        const following = learnIndex + 1
        setLearnIndex(following)
        if (following > learnWords.length - 6) {
          setLearnWords((current) => [...current, ...lessonWords(unlockedLetters(stats), stats, 12)])
        }
      } else {
        sync(typedRef.current)
        miss(' ')
      }
      return
    }
    if (value.length < typedRef.current.length) {
      sync(value)
      return
    }
    if (value.length !== typedRef.current.length + 1) {
      sync(typedRef.current)
      return
    }
    const expected = word[typedRef.current.length]
    if (value.endsWith(expected ?? '\u0000')) {
      const now = performance.now()
      const gap = Math.min(1200, lastRef.current === 0 ? 400 : now - lastRef.current)
      lastRef.current = now
      setStats((current) => recordKey(current, expected, true, gap))
      sync(value)
      return
    }
    sync(typedRef.current)
    if (expected) miss(expected)
  }

  const startSpeed = () => {
    if (runRef.current !== 'idle') return
    runRef.current = 'running'
    startedRef.current = performance.now()
    setRun('running')
    setElapsed(0)
  }

  const finishSpeed = (ms: number) => {
    if (runRef.current === 'done') return
    runRef.current = 'done'
    const partial = typedRef.current
    const word = speedListRef.current[speedIndexRef.current]
    let attempts = completedRef.current
    if (partial && word) {
      attempts = [...attempts, { word, typed: partial }]
      completedRef.current = attempts
      setCompleted(attempts)
      setKeystrokes((countKeys) => countKeys + partial.length)
    }
    setRun('done')
    setElapsed(ms)
    const wpm = Math.round(netWpm(attempts, ms))
    const acc = Math.round(accuracy(attempts))
    const key = `${kindRef.current}-${kindRef.current === 'time' ? secondsRef.current : countRef.current}`
    setBests((current) => {
      const previous = current[key]
      if (previous && previous.wpm >= wpm) return current
      const next = { ...current, [key]: { wpm, acc } }
      void setPref('typing-best', next)
      return next
    })
  }

  const completedRef = useRef(completed)
  completedRef.current = completed
  const kindRef = useRef(kind)
  const secondsRef = useRef(seconds)
  const countRef = useRef(count)
  kindRef.current = kind
  secondsRef.current = seconds
  countRef.current = count
  const finishRef = useRef(finishSpeed)
  finishRef.current = finishSpeed

  const onSpeed = (value: string) => {
    if (run === 'done') {
      sync('')
      return
    }
    if (value.endsWith(' ')) {
      const body = value.slice(0, -1)
      if (!body) {
        sync('')
        return
      }
      startSpeed()
      const word = speedList[speedIndex] ?? ''
      const attempt = { word, typed: body }
      const attempts = [...completedRef.current, attempt]
      completedRef.current = attempts
      setCompleted(attempts)
      setKeystrokes((countKeys) => countKeys + body.length + 1)
      sync('')
      const following = speedIndex + 1
      if (kind === 'words' && following >= speedList.length) {
        setSpeedIndex(following)
        finishRef.current(Math.max(1, performance.now() - startedRef.current))
        return
      }
      if (following > speedList.length - 12) {
        setSpeedList((current) => [...current, ...speedWords(40, { punctuation, numbers })])
      }
      setSpeedIndex(following)
      return
    }
    if (value) startSpeed()
    sync(value)
  }

  const restartSpeed = (next?: {
    kind?: SpeedKind
    seconds?: (typeof TIMES)[number]
    count?: (typeof COUNTS)[number]
    punctuation?: boolean
    numbers?: boolean
  }) => {
    const useKind = next?.kind ?? kind
    const useSeconds = next?.seconds ?? seconds
    const useCount = next?.count ?? count
    const usePunctuation = next?.punctuation ?? punctuation
    const useNumbers = next?.numbers ?? numbers
    setKind(useKind)
    setSeconds(useSeconds)
    setCount(useCount)
    setPunctuation(usePunctuation)
    setNumbers(useNumbers)
    setSpeedList(speedWords(useKind === 'time' ? 140 : useCount, { punctuation: usePunctuation, numbers: useNumbers }))
    setSpeedIndex(0)
    setCompleted([])
    completedRef.current = []
    runRef.current = 'idle'
    setRun('idle')
    setElapsed(0)
    setKeystrokes(0)
    sync('')
    inputRef.current?.focus()
  }

  const words = mode === 'learn' ? learnWords : speedList
  const index = mode === 'learn' ? learnIndex : speedIndex
  const expected = mode === 'learn' && typed === (words[index] ?? '') ? ' ' : (words[index]?.[typed.length] ?? '')
  const liveAttempts = run === 'idle' ? [] : completed
  const liveMs = run === 'running' && kind === 'time' ? elapsed : run === 'done' ? elapsed : elapsed
  const shownWpm = liveAttempts.length > 0 && liveMs > 0 ? Math.round(netWpm(liveAttempts, Math.max(liveMs, 1))) : 0
  const shownAcc = liveAttempts.length > 0 ? Math.round(accuracy(liveAttempts)) : 100
  const bestKey = `${kind}-${kind === 'time' ? seconds : count}`

  return (
    <ToolLayout
      title="Typing"
      lede="Learn unlocks one letter at a time, the way a first keyboard course does. Speed is a timed test for when the keys are already familiar. Nothing is uploaded."
    >
      <Segmented
        label="Practice"
        value={mode}
        options={[
          { value: 'learn', label: 'Learn' },
          { value: 'speed', label: 'Speed' },
        ]}
        onChange={(value) => {
          setMode(value)
          sync('')
          window.setTimeout(() => inputRef.current?.focus(), 0)
        }}
      />

      {mode === 'speed' ? (
        <>
          <Segmented
            label="Test"
            value={kind}
            options={[
              { value: 'time', label: 'Time' },
              { value: 'words', label: 'Words' },
            ]}
            onChange={(value) => restartSpeed({ kind: value })}
          />
          {kind === 'time' ? (
            <Segmented
              label="Seconds"
              value={String(seconds)}
              options={TIMES.map((value) => ({ value: String(value), label: String(value) }))}
              onChange={(value) => restartSpeed({ seconds: Number(value) as (typeof TIMES)[number] })}
            />
          ) : (
            <Segmented
              label="Words"
              value={String(count)}
              options={COUNTS.map((value) => ({ value: String(value), label: String(value) }))}
              onChange={(value) => restartSpeed({ count: Number(value) as (typeof COUNTS)[number] })}
            />
          )}
          <div className="row" style={{ marginBottom: '0.75rem' }}>
            <label className="row">
              <input
                type="checkbox"
                checked={punctuation}
                onChange={(event) => restartSpeed({ punctuation: event.target.checked })}
              />
              Punctuation
            </label>
            <label className="row">
              <input
                type="checkbox"
                checked={numbers}
                onChange={(event) => restartSpeed({ numbers: event.target.checked })}
              />
              Numbers
            </label>
          </div>
        </>
      ) : (
        <p className="hint">
          Letters in play: {letters.join(' ')}.{' '}
          {nextLetter ? `“${nextLetter}” unlocks when these are steady.` : 'Every letter is unlocked.'}
        </p>
      )}

      {mode === 'learn' ? (
        <Keyboard letters={letters} expected={expected.toLowerCase()} badKey={badKey} stats={stats} />
      ) : null}

      <div
        className="type-stage"
        onMouseDown={(event) => {
          if (event.target === inputRef.current) return
          event.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <p className="type-words" aria-hidden="true">
          {loaded || mode === 'speed' ? (
            words.slice(Math.max(0, index - 2), index + 16).map((word, offset) => {
              const wordIndex = Math.max(0, index - 2) + offset
              const state = wordIndex < index ? 'done' : wordIndex === index ? 'current' : 'future'
              const typedWord =
                state === 'current'
                  ? typed
                  : state === 'done'
                    ? mode === 'speed'
                      ? completed[wordIndex]?.typed
                      : word
                    : ''
              return <WordView key={`${wordIndex}-${word}`} word={word} typed={typedWord ?? ''} state={state} />
            })
          ) : (
            <span className="type-future">Loading your letters…</span>
          )}
        </p>
        <input
          ref={inputRef}
          className="type-capture"
          autoFocus
          aria-label={mode === 'learn' ? 'Lesson typing' : 'Speed test typing'}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Tab') {
              event.preventDefault()
              if (mode === 'speed') restartSpeed()
              else {
                sync('')
                setLearnIndex(0)
                setLearnWords(lessonWords(letters, stats, 18))
              }
            }
          }}
          onChange={(event) => (mode === 'learn' ? onLearn(event.target.value) : onSpeed(event.target.value))}
        />
      </div>

      <div className="type-meter">
        {mode === 'speed' ? (
          <>
            <strong>
              {kind === 'time'
                ? Math.max(0, Math.ceil(seconds - elapsed / 1000))
                : `${Math.min(speedIndex, count)}/${count}`}
            </strong>
            <span>{shownWpm} wpm</span>
            <span>{shownAcc}%</span>
            {bests[bestKey] ? <span className="muted">best {bests[bestKey].wpm} wpm</span> : null}
          </>
        ) : (
          <>
            <span>{letters.length} letters</span>
            {notice ? (
              <span className="status-ok">{notice}</span>
            ) : (
              <span className="muted">Wrong keys do not advance.</span>
            )}
          </>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (mode === 'speed') restartSpeed()
            else {
              sync('')
              setLearnIndex(0)
              setLearnWords(lessonWords(letters, stats, 18))
              inputRef.current?.focus()
            }
          }}
        >
          Restart
        </button>
      </div>

      {mode === 'speed' && run === 'done' ? (
        <div className="panel type-result">
          <div className="big-answer">
            <strong>{Math.round(netWpm(completed, Math.max(elapsed, 1)))}</strong> <span>wpm</span>
          </div>
          <div className="pill-row">
            <span className="pill">{Math.round(accuracy(completed))}% accuracy</span>
            <span className="pill">{Math.round(rawWpm(keystrokes, Math.max(elapsed, 1)))} raw</span>
            <span className="pill">{kind === 'time' ? `${seconds}s` : `${count} words`}</span>
          </div>
        </div>
      ) : null}

      {mode === 'learn' ? (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            if (!confirmReset) {
              setConfirmReset(true)
              window.setTimeout(() => setConfirmReset(false), 2500)
              return
            }
            setStats({})
            setLearnIndex(0)
            setLearnWords(lessonWords(unlockedLetters({}), {}, 18))
            setNotice(null)
            setConfirmReset(false)
            sync('')
            void setPref('typing-learn', {})
          }}
        >
          {confirmReset ? 'Confirm reset' : 'Reset progress'}
        </button>
      ) : (
        <p className="hint">
          Tab restarts the test. A wrong letter stays on the word until you finish it or backspace.
        </p>
      )}
    </ToolLayout>
  )
}

function WordView({ word, typed, state }: { word: string; typed: string; state: 'done' | 'current' | 'future' }) {
  if (state === 'future') return <span className="type-word type-future">{word} </span>
  if (state === 'done') {
    const wrong = typed !== word
    return <span className={wrong ? 'type-word type-bad' : 'type-word type-done'}>{word} </span>
  }
  const cells = []
  const length = Math.max(word.length, typed.length)
  for (let i = 0; i < length; i += 1) {
    if (i === typed.length) cells.push(<span key="caret" className="type-caret" />)
    const wanted = word[i]
    const got = typed[i]
    if (got === undefined) cells.push(<span key={i}>{wanted}</span>)
    else if (wanted === undefined)
      cells.push(
        <span key={i} className="type-bad">
          {got}
        </span>,
      )
    else
      cells.push(
        <span key={i} className={got === wanted ? 'type-good' : 'type-bad'}>
          {wanted}
        </span>,
      )
  }
  if (typed.length >= word.length) cells.push(<span key="caret" className="type-caret" />)
  return <span className="type-word">{cells} </span>
}

function Keyboard({
  letters,
  expected,
  badKey,
  stats,
}: {
  letters: string[]
  expected: string
  badKey: string | null
  stats: LearnStats
}) {
  const open = new Set(letters)
  return (
    <div className="type-keys" aria-hidden="true">
      {ROWS.map((row) => (
        <div key={row} className="type-row">
          {row.split('').map((key) => (
            <span
              key={key}
              className="type-key"
              data-next={expected === key || undefined}
              data-bad={badKey === key || undefined}
              data-locked={!open.has(key) || undefined}
            >
              {key}
              {open.has(key) ? (
                <span className="type-conf">
                  <span style={{ width: `${Math.round(confidence(stats[key]) * 100)}%` }} />
                </span>
              ) : null}
            </span>
          ))}
        </div>
      ))}
      <div className="type-row">
        <span
          className="type-key type-space"
          data-next={expected === ' ' || undefined}
          data-bad={badKey === ' ' || undefined}
        >
          space
        </span>
      </div>
    </div>
  )
}
