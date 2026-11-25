import { useState } from 'react'
import { cpuDraughts, draughtMoves, freshDraughts, playDraughts, type Draughts } from '../../lib/games/draughts'
import { Arcade } from './kit'

function reply(state: Draughts) {
  let next = state
  for (let guard = 0; guard < 8 && next.turn === -1 && !next.over; guard += 1) {
    const stepped = cpuDraughts(next)
    if (stepped.cells === next.cells) break
    next = stepped
  }
  return next
}

export default function DraughtsTool() {
  const [state, setState] = useState<Draughts>(freshDraughts)
  const [from, setFrom] = useState(-1)
  const moves = draughtMoves(state.cells, 1, state.chain)
  const play = (index: number) => {
    if (state.turn !== 1 || state.over) return
    const move = moves.find((item) => item.from === (state.chain >= 0 ? state.chain : from) && item.to === index)
    if (!move) {
      if (state.cells[index] > 0) setFrom(index)
      return
    }
    setState(reply(playDraughts(state, move)))
    setFrom(-1)
  }
  const status =
    state.over === 1 ? 'You win' : state.over === -1 ? 'You lose' : state.chain >= 0 ? 'Jump again' : 'Your move'
  return (
    <Arcade
      title="Checkers"
      lede="You are the dark pieces at the bottom. Tap a piece, then a diagonal square. Jumps are required."
      status={status}
      onRestart={() => {
        setState(freshDraughts())
        setFrom(-1)
      }}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)', maxWidth: 380 }}>
        {state.cells.map((cell, index) => {
          const dark = (Math.floor(index / 8) + (index % 8)) % 2 === 1
          const mark = cell === 1 ? '●' : cell === 2 ? '♛' : cell === -1 ? '○' : cell === -2 ? '♕' : ''
          const side = cell > 0 ? 'mark-you' : cell < 0 ? 'mark-them' : ''
          return (
            <button
              key={index}
              type="button"
              className={from === index ? 'arcade-cell arcade-tile' : 'arcade-cell'}
              style={{ background: dark ? '#6d5438' : '#e6d3b0', borderColor: 'transparent' }}
              onClick={() => play(index)}
            >
              {mark ? <span className={side}>{mark}</span> : ''}
            </button>
          )
        })}
      </div>
    </Arcade>
  )
}
