import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Copy, Delete, History, Trash2 } from 'lucide-react'
import { ToolLayout } from '../../components/ToolLayout'
import { getPref, setPref } from '../../lib/db'
import { useCopied } from '../../lib/useCopied'
import { calculate, formatNumber, tryCalculate, type AngleMode } from '../../lib/calc'

type Entry = { expr: string; result: number; at: number }

const HISTORY_KEY = 'calc-history'
const HISTORY_MAX = 60

type Key = {
  label: string
  /** Text inserted at the cursor, or a command. */
  insert?: string
  action?: 'clear' | 'back' | 'equals' | 'negate' | 'angle' | 'second'
  aria?: string
  tone?: 'op' | 'fn' | 'accent' | 'muted'
  wide?: boolean
}

const BASIC: Key[] = [
  { label: 'AC', action: 'clear', tone: 'muted', aria: 'All clear' },
  { label: '⌫', action: 'back', tone: 'muted', aria: 'Backspace' },
  { label: '%', insert: '%', tone: 'muted', aria: 'Percent' },
  { label: '÷', insert: '÷', tone: 'op', aria: 'Divide' },
  { label: '7', insert: '7' },
  { label: '8', insert: '8' },
  { label: '9', insert: '9' },
  { label: '×', insert: '×', tone: 'op', aria: 'Multiply' },
  { label: '4', insert: '4' },
  { label: '5', insert: '5' },
  { label: '6', insert: '6' },
  { label: '−', insert: '−', tone: 'op', aria: 'Minus' },
  { label: '1', insert: '1' },
  { label: '2', insert: '2' },
  { label: '3', insert: '3' },
  { label: '+', insert: '+', tone: 'op', aria: 'Plus' },
  { label: '±', action: 'negate', aria: 'Change sign' },
  { label: '0', insert: '0' },
  { label: '.', insert: '.', aria: 'Decimal point' },
  { label: '=', action: 'equals', tone: 'accent', aria: 'Equals' },
]

function scientific(second: boolean, angle: AngleMode): Key[] {
  return [
    { label: '2nd', action: 'second', tone: second ? 'accent' : 'fn', aria: 'Second functions' },
    { label: angle === 'deg' ? 'DEG' : 'RAD', action: 'angle', tone: 'fn', aria: `Angle unit: ${angle}` },
    { label: '(', insert: '(', tone: 'fn' },
    { label: ')', insert: ')', tone: 'fn' },
    second
      ? { label: 'sin⁻¹', insert: 'asin(', tone: 'fn', aria: 'Arcsine' }
      : { label: 'sin', insert: 'sin(', tone: 'fn', aria: 'Sine' },
    second
      ? { label: 'cos⁻¹', insert: 'acos(', tone: 'fn', aria: 'Arccosine' }
      : { label: 'cos', insert: 'cos(', tone: 'fn', aria: 'Cosine' },
    second
      ? { label: 'tan⁻¹', insert: 'atan(', tone: 'fn', aria: 'Arctangent' }
      : { label: 'tan', insert: 'tan(', tone: 'fn', aria: 'Tangent' },
    second
      ? { label: '∛', insert: 'cbrt(', tone: 'fn', aria: 'Cube root' }
      : { label: '√', insert: '√(', tone: 'fn', aria: 'Square root' },
    second
      ? { label: 'eˣ', insert: 'e^', tone: 'fn', aria: 'e to the power' }
      : { label: 'ln', insert: 'ln(', tone: 'fn', aria: 'Natural log' },
    second
      ? { label: '10ˣ', insert: '10^', tone: 'fn', aria: 'Ten to the power' }
      : { label: 'log', insert: 'log(', tone: 'fn', aria: 'Log base 10' },
    { label: 'x²', insert: '^2', tone: 'fn', aria: 'Square' },
    { label: 'xʸ', insert: '^', tone: 'fn', aria: 'Power' },
    { label: 'π', insert: 'π', tone: 'fn', aria: 'Pi' },
    { label: 'e', insert: 'e', tone: 'fn', aria: "Euler's number" },
    { label: 'n!', insert: '!', tone: 'fn', aria: 'Factorial' },
    { label: '1/x', insert: '^(-1)', tone: 'fn', aria: 'Reciprocal' },
    second
      ? { label: 'nPr', insert: 'nPr(', tone: 'fn', aria: 'Permutations' }
      : { label: 'nCr', insert: 'nCr(', tone: 'fn', aria: 'Combinations' },
    { label: 'mod', insert: ' mod ', tone: 'fn', aria: 'Modulo' },
    { label: '|x|', insert: 'abs(', tone: 'fn', aria: 'Absolute value' },
    { label: 'Ans', insert: 'ans', tone: 'fn', aria: 'Previous answer' },
  ]
}

export default function CalculatorTool() {
  const [expr, setExpr] = useState('')
  const [angle, setAngle] = useState<AngleMode>('deg')
  const [second, setSecond] = useState(false)
  const [ans, setAns] = useState<number | undefined>(undefined)
  const [memory, setMemory] = useState(0)
  const [history, setHistory] = useState<Entry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [justEvaluated, setJustEvaluated] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { copied, copy } = useCopied(1400)

  useEffect(() => {
    void getPref<Entry[]>(HISTORY_KEY, []).then((stored) => {
      const list = Array.isArray(stored) ? stored : []
      setHistory(list)
      if (list[0]) setAns(list[0].result)
    })
  }, [])

  const preview = useMemo(() => tryCalculate(expr, { ans, angle }), [expr, ans, angle])

  const focusAt = (position: number) => {
    window.requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.setSelectionRange(position, position)
    })
  }

  const insert = useCallback(
    (text: string) => {
      const input = inputRef.current
      setError(null)
      // After "=", typing a digit starts fresh; an operator continues from the answer.
      const continuing = justEvaluated && /^[\s+\-−×÷*/^%!)]|^ mod/.test(text)
      const base = justEvaluated && !continuing ? '' : expr
      const start = justEvaluated ? base.length : (input?.selectionStart ?? base.length)
      const end = justEvaluated ? base.length : (input?.selectionEnd ?? base.length)
      const next = base.slice(0, start) + text + base.slice(end)
      setExpr(next)
      setJustEvaluated(false)
      focusAt(start + text.length)
    },
    [expr, justEvaluated],
  )

  const evaluate = useCallback(() => {
    if (!expr.trim()) return
    try {
      const result = calculate(expr, { ans, angle })
      const entry = { expr, result, at: Date.now() }
      const next = [entry, ...history.filter((h) => h.expr !== expr)].slice(0, HISTORY_MAX)
      setHistory(next)
      void setPref(HISTORY_KEY, next)
      setAns(result)
      setExpr(formatNumber(result).replace('∞', 'Infinity'))
      setError(null)
      setJustEvaluated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not compute.')
    }
  }, [expr, ans, angle, history])

  const press = (key: Key) => {
    if (key.insert) {
      insert(key.insert)
      return
    }
    switch (key.action) {
      case 'clear':
        setExpr('')
        setError(null)
        setJustEvaluated(false)
        focusAt(0)
        break
      case 'back': {
        const input = inputRef.current
        const start = input?.selectionStart ?? expr.length
        const end = input?.selectionEnd ?? expr.length
        if (start !== end) {
          setExpr(expr.slice(0, start) + expr.slice(end))
          focusAt(start)
        } else if (start > 0) {
          setExpr(expr.slice(0, start - 1) + expr.slice(start))
          focusAt(start - 1)
        }
        setJustEvaluated(false)
        break
      }
      case 'equals':
        evaluate()
        break
      case 'negate':
        if (expr.trim()) setExpr(expr.startsWith('-(') && expr.endsWith(')') ? expr.slice(2, -1) : `-(${expr})`)
        setJustEvaluated(false)
        break
      case 'angle':
        setAngle((a) => (a === 'deg' ? 'rad' : 'deg'))
        break
      case 'second':
        setSecond((s) => !s)
        break
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || (event.key === '=' && !event.shiftKey)) {
      event.preventDefault()
      evaluate()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setExpr('')
      setError(null)
    } else if (justEvaluated && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault()
      insert(event.key === '*' ? '×' : event.key === '/' ? '÷' : event.key)
    }
  }

  const current = justEvaluated ? ans : preview
  const memoryValue = current ?? ans ?? 0

  const clearHistory = () => {
    setHistory([])
    void setPref(HISTORY_KEY, [])
  }

  return (
    <ToolLayout
      title="Calculator"
      lede="A scientific calculator you can type into: 2π, 200 + 18%, sin 30, 5!, √2 — with a live answer, memory, and history that stays on this device."
    >
      <div className="calc-layout">
        <section className="panel calc" aria-label="Calculator">
          <div className="calc-display">
            <div className="calc-status">
              <span className="badge">{angle === 'deg' ? 'Degrees' : 'Radians'}</span>
              {memory ? <span className="badge">M = {formatNumber(memory)}</span> : null}
              {second ? <span className="badge">2nd</span> : null}
            </div>
            <label className="visually-hidden" htmlFor="calc-expression">
              Expression
            </label>
            <input
              id="calc-expression"
              ref={inputRef}
              className="calc-input"
              value={expr}
              placeholder="0"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              onChange={(e) => {
                setExpr(e.target.value)
                setError(null)
                setJustEvaluated(false)
              }}
              onKeyDown={onKeyDown}
            />
            <div className="calc-result" aria-live="polite">
              {error ? (
                <span className="status-bad">{error}</span>
              ) : current !== null && current !== undefined ? (
                <>
                  <output htmlFor="calc-expression" className="calc-value">
                    {justEvaluated ? '' : '= '}
                    {formatNumber(current, { group: true })}
                  </output>
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm btn-ghost"
                    aria-label={copied ? 'Copied' : 'Copy result'}
                    onClick={() => void copy(formatNumber(current))}
                  >
                    {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                  </button>
                </>
              ) : (
                <span className="muted">&nbsp;</span>
              )}
            </div>
          </div>

          <div className="calc-memory" role="group" aria-label="Memory">
            <button type="button" className="calc-mem" onClick={() => setMemory(0)} disabled={!memory}>
              MC
            </button>
            <button
              type="button"
              className="calc-mem"
              onClick={() => insert(formatNumber(memory))}
              disabled={!memory}
              aria-label="Memory recall"
            >
              MR
            </button>
            <button
              type="button"
              className="calc-mem"
              onClick={() => setMemory((m) => m + memoryValue)}
              aria-label="Add to memory"
            >
              M+
            </button>
            <button
              type="button"
              className="calc-mem"
              onClick={() => setMemory((m) => m - memoryValue)}
              aria-label="Subtract from memory"
            >
              M−
            </button>
          </div>

          <div className="calc-keys">
            <div className="calc-grid calc-grid-sci">
              {scientific(second, angle).map((key) => (
                <button
                  key={key.label}
                  type="button"
                  className="calc-key"
                  data-tone={key.tone}
                  aria-label={key.aria ?? key.label}
                  aria-pressed={key.action === 'second' ? second : undefined}
                  onClick={() => press(key)}
                >
                  {key.label}
                </button>
              ))}
            </div>
            <div className="calc-grid calc-grid-basic">
              {BASIC.map((key) => (
                <button
                  key={key.label}
                  type="button"
                  className="calc-key"
                  data-tone={key.tone}
                  aria-label={key.aria ?? key.label}
                  onClick={() => press(key)}
                >
                  {key.label === '⌫' ? <Delete size={18} aria-hidden="true" /> : key.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="panel calc-history">
          <div className="panel-title">
            <h2>
              <History size={16} aria-hidden="true" /> History
            </h2>
            {history.length ? (
              <button type="button" className="btn btn-sm btn-ghost" onClick={clearHistory}>
                <Trash2 size={14} aria-hidden="true" />
                Clear
              </button>
            ) : null}
          </div>
          {history.length ? (
            <ol className="calc-history-list">
              {history.map((entry) => (
                <li key={entry.at}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpr(entry.expr)
                      setJustEvaluated(false)
                      focusAt(entry.expr.length)
                    }}
                    title="Use this expression"
                  >
                    <span className="calc-history-expr">{entry.expr}</span>
                    <span className="calc-history-result">= {formatNumber(entry.result, { group: true })}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="hint">Results you calculate show up here. Tap one to reuse it.</p>
          )}
          <details className="calc-help">
            <summary>What you can type</summary>
            <ul className="plain-list">
              <li>
                <code>+ − × ÷ ^ %</code>, brackets, and <code>mod</code>
              </li>
              <li>
                <code>sin cos tan</code> and <code>asin acos atan</code> (degrees or radians)
              </li>
              <li>
                <code>sqrt cbrt root(x, n) ln log log(x, base) exp abs</code>
              </li>
              <li>
                <code>5!</code>, <code>nCr(5, 2)</code>, <code>gcd</code>, <code>lcm</code>, <code>round(x, 2)</code>
              </li>
              <li>
                <code>π e φ</code> and <code>ans</code> for the previous answer
              </li>
              <li>
                <code>200 + 10%</code> is 220, like a shop calculator
              </li>
            </ul>
          </details>
        </aside>
      </div>
    </ToolLayout>
  )
}
