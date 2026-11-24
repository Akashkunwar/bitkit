import { useEffect, useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { freshRepeat, pressRepeat, type Repeat } from '../../lib/games/repeat'
import { Arcade } from './kit'

const PADS = ['1', '2', '3', '4']

export default function RepeatTool() {
  const [rand] = useState(() => mulberry32(9))
  const [game, setGame] = useState<Repeat>(() => freshRepeat(rand))
  const [lit, setLit] = useState(-1)
  const [phase, setPhase] = useState<'show' | 'play'>('show')

  useEffect(() => {
    if (phase !== 'show' || game.failed) return
    const timers = game.sequence.flatMap((color, index) => [
      window.setTimeout(() => setLit(color), index * 560),
      window.setTimeout(() => setLit(-1), index * 560 + 360),
    ])
    timers.push(window.setTimeout(() => setPhase('play'), game.sequence.length * 560 + 40))
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [phase, game.sequence, game.failed])

  const press = (color: number) => {
    if (phase !== 'play' || game.failed) return
    const next = pressRepeat(game, color, rand)
    setGame(next)
    if (!next.failed && next.sequence !== game.sequence) setPhase('show')
  }

  return (
    <Arcade
      title="Repeat"
      lede="Watch the pads, then tap them in the same order. The run grows by one each time."
      status={
        game.failed
          ? `Missed at ${game.sequence.length}`
          : phase === 'show'
            ? 'Watch'
            : `Length ${game.sequence.length}`
      }
      onRestart={() => {
        setGame(freshRepeat(rand))
        setPhase('show')
        setLit(-1)
      }}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 240 }}>
        {PADS.map((label, index) => (
          <button
            key={label}
            type="button"
            className={lit === index ? 'arcade-cell arcade-tile' : 'arcade-cell'}
            onClick={() => press(index)}
          >
            {label}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
