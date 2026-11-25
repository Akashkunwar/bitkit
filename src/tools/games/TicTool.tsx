import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { bestMove, winner, type Mark } from '../../lib/games/tictactoe'

function empty(): Mark[] {
  return Array(9).fill(null)
}

export default function TicTool() {
  const [board, setBoard] = useState<Mark[]>(empty)
  const result = winner(board)

  const play = (index: number) => {
    if (board[index] || result) return
    const next = board.slice()
    next[index] = 'X'
    const outcome = winner(next)
    if (!outcome) next[bestMove(next, 'O')] = 'O'
    setBoard(next)
  }

  const end = winner(board)

  return (
    <ToolLayout title="Tic-tac-toe" lede="You are X. The other side answers at once.">
      <div className="arcade">
        <div className="arcade-top">
          <strong>{end === 'X' ? 'You win' : end === 'O' ? 'You lose' : end === 'draw' ? 'Draw' : 'Your move'}</strong>
          <button type="button" className="btn" onClick={() => setBoard(empty())}>
            Restart
          </button>
        </div>
        <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 280 }}>
          {board.map((mark, index) => (
            <button key={index} type="button" className="arcade-cell" onClick={() => play(index)}>
              {mark ? <span className={mark === 'X' ? 'mark-you' : 'mark-them'}>{mark}</span> : ''}
            </button>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
