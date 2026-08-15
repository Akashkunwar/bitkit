import { useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { SendTo } from '../../components/SendTo'
import { useCopied } from '../../lib/useCopied'
import {
  angleForIndex,
  flipCoins,
  makeTeams,
  parseEntries,
  pickMany,
  randomInt,
  rollDice,
  shuffle,
  wheelSlices,
} from '../../lib/randomize'

type Mode = 'wheel' | 'teams' | 'dice' | 'number'

const MODES: { value: Mode; label: string }[] = [
  { value: 'wheel', label: 'Wheel' },
  { value: 'teams', label: 'Teams' },
  { value: 'dice', label: 'Dice & coins' },
  { value: 'number', label: 'Numbers' },
]

const SAMPLE = 'Asha\nRohan\nMaya\nKabir\nNina\nArjun'

export default function RandomTool() {
  const [mode, setMode] = useState<Mode>('wheel')
  const [text, setText] = useState(SAMPLE)
  const [winner, setWinner] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [angle, setAngle] = useState(0)
  const [removeWinner, setRemoveWinner] = useState(false)

  const [teamCount, setTeamCount] = useState(2)
  const [teams, setTeams] = useState<string[][]>([])

  const [sides, setSides] = useState(6)
  const [diceCount, setDiceCount] = useState(2)
  const [dice, setDice] = useState<number[]>([])
  const [coins, setCoins] = useState<string[]>([])

  const [min, setMin] = useState(1)
  const [max, setMax] = useState(100)
  const [howMany, setHowMany] = useState(1)
  const [unique, setUnique] = useState(true)
  const [numbers, setNumbers] = useState<number[]>([])

  const spinTimer = useRef<number | undefined>(undefined)
  const { copied, copy } = useCopied()

  const entries = useMemo(() => parseEntries(text), [text])
  const slices = useMemo(() => wheelSlices(entries), [entries])

  const spin = () => {
    if (!entries.length || spinning) return
    const index = randomInt(entries.length)
    const target = angleForIndex(index, entries.length)
    setSpinning(true)
    setWinner(null)
    // The transition duration below and this timeout must agree.
    setAngle((current) => current + target)
    window.clearTimeout(spinTimer.current)
    spinTimer.current = window.setTimeout(() => {
      setWinner(entries[index])
      setSpinning(false)
      if (removeWinner) setText(entries.filter((_, i) => i !== index).join('\n'))
    }, 3400)
  }

  const summary =
    mode === 'teams' && teams.length
      ? teams.map((team, i) => `Team ${i + 1}: ${team.join(', ')}`).join('\n')
      : mode === 'wheel' && winner
        ? winner
        : mode === 'dice'
          ? [dice.length ? `Dice: ${dice.join(', ')} (total ${dice.reduce((a, b) => a + b, 0)})` : '', coins.length ? `Coins: ${coins.join(', ')}` : ''].filter(Boolean).join('\n')
          : numbers.join(', ')

  return (
    <ToolLayout
      title="Random picker"
      lede="Pick a name, split teams, roll dice, or draw numbers — using the browser's cryptographic randomness, not Math.random."
    >
      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />

      {mode === 'wheel' || mode === 'teams' ? (
        <label className="field">
          <span>Entries — one per line</span>
          <textarea
            className="code-area"
            rows={6}
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      ) : null}

      {mode === 'wheel' ? (
        <>
          <div className="wheel-wrap">
            <div className="wheel-pointer" aria-hidden="true" />
            <svg
              className="wheel"
              viewBox="-105 -105 210 210"
              style={{
                transform: `rotate(${angle}deg)`,
                transition: spinning ? 'transform 3.3s cubic-bezier(.15,.85,.2,1)' : 'none',
              }}
              role="img"
              aria-label={`Wheel with ${entries.length} entries`}
            >
              {slices.map((slice) => {
                const large = slice.end - slice.start > Math.PI ? 1 : 0
                const x1 = Math.cos(slice.start) * 100
                const y1 = Math.sin(slice.start) * 100
                const x2 = Math.cos(slice.end) * 100
                const y2 = Math.sin(slice.end) * 100
                const mid = (slice.start + slice.end) / 2
                return (
                  <g key={slice.label}>
                    <path
                      d={
                        entries.length === 1
                          ? 'M-100,0 a100,100 0 1,0 200,0 a100,100 0 1,0 -200,0'
                          : `M0,0 L${x1.toFixed(2)},${y1.toFixed(2)} A100,100 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`
                      }
                      fill={slice.colour}
                    />
                    <text
                      x={Math.cos(mid) * 62}
                      y={Math.sin(mid) * 62}
                      fill="#fff"
                      fontSize="8"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${(mid * 180) / Math.PI}, ${Math.cos(mid) * 62}, ${Math.sin(mid) * 62})`}
                    >
                      {slice.label.length > 14 ? `${slice.label.slice(0, 13)}…` : slice.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={!entries.length || spinning} onClick={spin}>
              {spinning ? 'Spinning…' : 'Spin'}
            </button>
            <label className="row">
              <input type="checkbox" checked={removeWinner} onChange={(e) => setRemoveWinner(e.target.checked)} />
              Remove the winner after each spin
            </label>
          </div>

          {winner ? (
            <div className="big-answer">
              <strong>{winner}</strong>
            </div>
          ) : null}
        </>
      ) : null}

      {mode === 'teams' ? (
        <>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="field" style={{ minWidth: '9rem' }}>
              <span>Teams</span>
              <input
                className="text-input"
                type="number"
                min={2}
                max={Math.max(2, entries.length)}
                value={teamCount}
                onChange={(e) => setTeamCount(Math.max(2, Number(e.target.value) || 2))}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={entries.length < 2}
              onClick={() => setTeams(makeTeams(entries, teamCount))}
            >
              Split
            </button>
            <button type="button" className="btn" disabled={!entries.length} onClick={() => setText(shuffle(entries).join('\n'))}>
              Just shuffle
            </button>
          </div>

          {teams.length ? (
            <div className="grid-tools" style={{ marginTop: '1rem' }}>
              {teams.map((team, i) => (
                <div key={i} className="panel">
                  <p className="field-label">Team {i + 1} · {team.length}</p>
                  <ul className="plain-list">
                    {team.map((member) => (
                      <li key={member}>{member}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {mode === 'dice' ? (
        <>
          <div className="split">
            <label className="field">
              <span>Sides</span>
              <select className="text-input" value={sides} onChange={(e) => setSides(Number(e.target.value))}>
                {[4, 6, 8, 10, 12, 20, 100].map((s) => (
                  <option key={s} value={s}>
                    d{s}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>How many</span>
              <input
                className="text-input"
                type="number"
                min={1}
                max={20}
                value={diceCount}
                onChange={(e) => setDiceCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              />
            </label>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => { setDice(rollDice(sides, diceCount)); setCoins([]) }}>
              Roll
            </button>
            <button type="button" className="btn" onClick={() => { setCoins(flipCoins(diceCount)); setDice([]) }}>
              Flip {diceCount} coin{diceCount === 1 ? '' : 's'}
            </button>
          </div>

          {dice.length ? (
            <>
              <div className="dice-row">
                {dice.map((value, i) => (
                  <span key={i} className="die">{value}</span>
                ))}
              </div>
              <div className="pill-row">
                <span className="pill">Total {dice.reduce((a, b) => a + b, 0)}</span>
                <span className="pill">Highest {Math.max(...dice)}</span>
                <span className="pill">Lowest {Math.min(...dice)}</span>
              </div>
            </>
          ) : null}

          {coins.length ? (
            <div className="dice-row">
              {coins.map((face, i) => (
                <span key={i} className="die" data-wide="true">{face}</span>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {mode === 'number' ? (
        <>
          <div className="split">
            <label className="field">
              <span>From</span>
              <input className="text-input" type="number" value={min} onChange={(e) => setMin(Number(e.target.value) || 0)} />
            </label>
            <label className="field">
              <span>To</span>
              <input className="text-input" type="number" value={max} onChange={(e) => setMax(Number(e.target.value) || 0)} />
            </label>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <label className="field" style={{ minWidth: '9rem' }}>
              <span>How many</span>
              <input
                className="text-input"
                type="number"
                min={1}
                max={100}
                value={howMany}
                onChange={(e) => setHowMany(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
              />
            </label>
            <label className="row">
              <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} />
              No repeats
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const lo = Math.min(min, max)
                const hi = Math.max(min, max)
                const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
                setNumbers(pickMany(pool, howMany, !unique))
              }}
            >
              Draw
            </button>
          </div>
          {numbers.length ? (
            <div className="dice-row">
              {numbers.map((n, i) => (
                <span key={i} className="die" data-wide="true">{n}</span>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {summary ? (
        <div className="row" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn" onClick={() => void copy(summary, 'res')}>
            {copied === 'res' ? 'Copied' : 'Copy result'}
          </button>
        </div>
      ) : null}

      <SendTo from="random" text={summary} />
    </ToolLayout>
  )
}
