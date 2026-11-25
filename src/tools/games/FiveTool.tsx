import { useState } from 'react'
import { cpuFive, FIVE_N, freshFive, playFive, type Five } from '../../lib/games/five'
import { Arcade } from './kit'

export default function FiveTool() {
  const [state, setState] = useState<Five>(freshFive)
  const play = (index: number) => {
    const next = playFive(state, index)
    setState(next === state ? state : cpuFive(next))
  }
  const status =
    state.winner === 1 ? 'You win' : state.winner === 2 ? 'You lose' : state.winner === 3 ? 'Draw' : 'Your stone'
  return (
    <Arcade
      title="Gomoku"
      lede="Get five stones in a line. The board answers with a blocking stone."
      status={status}
      onRestart={() => setState(freshFive())}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: `repeat(${FIVE_N}, 1fr)`, maxWidth: 420, gap: 2 }}>
        {state.cells.map((cell, index) => (
          <button
            key={index}
            type="button"
            className="arcade-cell"
            style={{ fontSize: 12 }}
            onClick={() => play(index)}
          >
            {cell === 1 ? <span className="mark-you">●</span> : cell === 2 ? <span className="mark-them">○</span> : ''}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
