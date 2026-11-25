import { useState } from 'react'
import { cpuConnect, dropConnect, freshConnect, type Connect } from '../../lib/games/connect4'
import { Arcade } from './kit'

export default function ConnectTool() {
  const [state, setState] = useState<Connect>(freshConnect)
  const play = (col: number) => {
    const yours = dropConnect(state, col)
    setState(yours === state ? state : cpuConnect(yours))
  }
  const status =
    state.winner === 1 ? 'You win' : state.winner === 2 ? 'You lose' : state.winner === 3 ? 'Draw' : 'Your drop'
  return (
    <Arcade
      title="Connect Four"
      lede="Drop a disc. Four in a line wins. The other side answers at once."
      status={status}
      onRestart={() => setState(freshConnect())}
    >
      <div className="arcade-keys">
        {Array.from({ length: 7 }, (_, col) => (
          <button key={col} type="button" className="btn" onClick={() => play(col)}>
            {col + 1}
          </button>
        ))}
      </div>
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', maxWidth: 360 }}>
        {state.cells.map((cell, index) => (
          <div key={index} className="arcade-cell">
            {cell === 1 ? <span className="mark-you">●</span> : cell === 2 ? <span className="mark-them">○</span> : ''}
          </div>
        ))}
      </div>
    </Arcade>
  )
}
