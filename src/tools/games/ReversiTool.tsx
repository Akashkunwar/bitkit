import { useState } from 'react'
import { cpuReversi, freshReversi, playReversi, reversiScore, type Reversi } from '../../lib/games/reversi'
import { Arcade } from './kit'

export default function ReversiTool() {
  const [state, setState] = useState<Reversi>(freshReversi)
  const score = reversiScore(state.cells)
  const play = (index: number) => {
    let next = playReversi(state, index)
    if (next === state) return
    while (!next.over && next.turn === -1) {
      const played = cpuReversi(next)
      if (played === next) break
      next = played
    }
    setState(next)
  }
  const status = state.over
    ? score.you === score.them
      ? 'Draw'
      : score.you > score.them
        ? 'You win'
        : 'You lose'
    : state.turn === 1
      ? `Your turn · ${score.you}–${score.them}`
      : `Their turn · ${score.you}–${score.them}`
  return (
    <Arcade
      title="Reversi"
      lede="You are the dark discs. A move must flip at least one light disc."
      status={status}
      onRestart={() => setState(freshReversi())}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(8, 1fr)', maxWidth: 380 }}>
        {state.cells.map((cell, index) => (
          <button key={index} type="button" className="arcade-cell" onClick={() => play(index)}>
            {cell === 1 ? <span className="mark-you">●</span> : cell === -1 ? <span className="mark-them">○</span> : ''}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
