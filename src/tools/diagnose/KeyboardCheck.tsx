import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Segmented } from '../../components/Segmented'
import { getPref, setPref } from '../../lib/db'
import {
  detectKeyboard,
  detectOs,
  EMPTY_KEYS,
  formatKeyName,
  isKeyboardChoice,
  KEYBOARD_OPTIONS,
  keyboardBoard,
  OS_OPTIONS,
  reduceKeys,
  releaseHeld,
  seenOnBoard,
  type KeyCap,
  type KeyboardChoice,
  type KeyboardKind,
  type KeySets,
  type OsKind,
} from '../../lib/diagnose'

const PREF = 'diagnose-keyboard'

type LastKey = { key: string; code: string; repeat: boolean }

function detectedChoice(): KeyboardChoice {
  return {
    os: detectOs(typeof navigator === 'undefined' ? '' : navigator.platform),
    keyboard: detectKeyboard(typeof navigator === 'undefined' ? '' : navigator.language),
  }
}

function KeyRows({ rows, held, seen }: { rows: KeyCap[][]; held: string[]; seen: string[] }) {
  const down = new Set(held)
  const hit = new Set(seen)
  return (
    <div className="diag-rows">
      {rows.map((row, rowIndex) => (
        <div className="diag-row" key={rowIndex}>
          {row.map((key, keyIndex) =>
            key.code ? (
              <span
                key={key.code}
                className="diag-key"
                data-held={down.has(key.code) ? '' : undefined}
                data-seen={hit.has(key.code) ? '' : undefined}
                style={{ flexGrow: key.grow ?? 1 }}
              >
                {key.label}
              </span>
            ) : (
              <span key={`gap-${rowIndex}-${keyIndex}`} className="diag-gap" style={{ flexGrow: key.grow ?? 0.4 }} />
            ),
          )}
        </div>
      ))}
    </div>
  )
}

export function KeyboardCheck() {
  const [choice, setChoice] = useState<KeyboardChoice>(detectedChoice)
  const [keys, setKeys] = useState<KeySets>(EMPTY_KEYS)
  const [last, setLast] = useState<LastKey | null>(null)
  const [listening, setListening] = useState(false)
  const touched = useRef(false)
  const board = useMemo(() => keyboardBoard(choice.os, choice.keyboard), [choice])
  const responded = seenOnBoard(keys.seen, board.codes)

  useEffect(() => {
    void getPref<unknown>(PREF, null).then((saved) => {
      if (!touched.current && isKeyboardChoice(saved)) setChoice(saved)
    })
  }, [])

  useEffect(() => {
    const onBlur = () => setKeys((state) => releaseHeld(state))
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [])

  const choose = (next: KeyboardChoice) => {
    touched.current = true
    setChoice(next)
    void setPref(PREF, next)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setLast({ key: event.key, code: event.code, repeat: event.repeat })
    setKeys((state) => reduceKeys(state, event.code, 'down'))
    // Shift+Escape is the way out, because Tab itself has to be testable.
    if (event.code === 'Escape' && event.shiftKey) event.currentTarget.blur()
  }

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setKeys((state) => reduceKeys(state, event.code, 'up'))
  }

  return (
    <section className="panel" aria-labelledby="diag-keys-title">
      <div className="diag-head">
        <h2 id="diag-keys-title">Keyboard</h2>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setKeys(EMPTY_KEYS)
            setLast(null)
          }}
        >
          Reset
        </button>
      </div>
      <div className="diag-picks">
        <Segmented
          label="Operating system"
          value={choice.os}
          options={OS_OPTIONS}
          onChange={(os: OsKind) => choose({ ...choice, os })}
        />
        <Segmented
          label="Keyboard"
          value={choice.keyboard}
          options={KEYBOARD_OPTIONS}
          onChange={(keyboard: KeyboardKind) => choose({ ...choice, keyboard })}
        />
      </div>
      <p className="diag-stats">
        <span>
          <strong>{responded}</strong> of {board.codes.length} keys responded
        </span>
        {keys.held.length ? <span>{keys.held.length} held</span> : null}
      </p>
      <p className="hint">
        Pick the operating system and the keyboard so the picture matches the keys in front of you. A key this machine
        does not have stays empty. Click the keyboard, then press every key once. A key that stays filled after you let
        go never sent a release. Brightness, volume, and many Fn keys never reach a web page. Shift+Escape releases the
        keyboard.
      </p>
      <div
        className="diag-board"
        tabIndex={0}
        role="group"
        aria-label="Keyboard tester. Click here, then press keys. Shift+Escape releases it."
        data-listening={listening ? '' : undefined}
        onPointerDown={(event) => {
          event.currentTarget.focus()
          setListening(true)
        }}
        onFocus={() => setListening(true)}
        onBlur={() => {
          setListening(false)
          setKeys((state) => releaseHeld(state))
        }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
      >
        <p className="diag-prompt">{listening ? 'Listening.' : 'Click here to start.'}</p>
        <div className="diag-layout">
          <div className="diag-main">
            <p className="diag-kicker">Letters</p>
            <KeyRows rows={board.letters} held={keys.held} seen={keys.seen} />
          </div>
          <div className="diag-side">
            <div>
              <p className="diag-kicker">Navigation</p>
              <KeyRows rows={board.nav} held={keys.held} seen={keys.seen} />
            </div>
            <div>
              <p className="diag-kicker">Number pad</p>
              <KeyRows rows={board.numpad} held={keys.held} seen={keys.seen} />
            </div>
          </div>
        </div>
      </div>
      <p className="diag-legend" aria-hidden="true">
        <span className="diag-key" data-seen="">
          Seen
        </span>
        <span className="diag-key" data-held="">
          Held
        </span>
      </p>
      <p className="diag-readout" aria-live="polite">
        {last
          ? `Last: ${formatKeyName(last.key)} · ${last.code || 'no code'}${last.repeat ? ' · repeat' : ''}`
          : 'No key yet.'}
      </p>
    </section>
  )
}
