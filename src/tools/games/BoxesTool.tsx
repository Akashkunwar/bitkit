import { useState } from 'react'
import { cpuBoxes, freshBoxes, playBoxes, type Boxes } from '../../lib/games/boxes'
import { Arcade } from './kit'

function answer(state: Boxes) {
  let next = state
  for (let guard = 0; guard < 24 && next.turn === 2 && !next.over; guard += 1) {
    const stepped = cpuBoxes(next)
    if (stepped === next) break
    next = stepped
  }
  return next
}

export default function BoxesTool() {
  const [state, setState] = useState<Boxes>(freshBoxes)
  const play = (kind: 'h' | 'v', index: number) => {
    const next = playBoxes(state, kind, index)
    setState(next === state ? state : answer(next))
  }
  const status = state.over
    ? state.score[0] === state.score[1]
      ? 'Draw'
      : state.score[0] > state.score[1]
        ? 'You win'
        : 'You lose'
    : `You ${state.score[0]} · them ${state.score[1]}`
  return (
    <Arcade
      title="Dots and Boxes"
      lede="Tap a line. Close a square and you play again. The other side takes the rest."
      status={status}
      onRestart={() => setState(freshBoxes())}
    >
      <div className="boxes">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={row}>
            <div className="box-h">
              {Array.from({ length: 4 }, (_, col) => {
                const index = row * 4 + col
                return (
                  <button
                    key={col}
                    type="button"
                    className={state.h[index] ? 'edge on' : 'edge'}
                    onClick={() => play('h', index)}
                  />
                )
              })}
            </div>
            {row < 4 && (
              <div className="box-v">
                {Array.from({ length: 5 }, (_, col) => {
                  const index = row * 5 + col
                  const owner = col < 4 ? state.owner[row * 4 + col] : 0
                  return (
                    <span key={col}>
                      <button
                        type="button"
                        className={state.v[index] ? 'edge vert on' : 'edge vert'}
                        onClick={() => play('v', index)}
                      />
                      {col < 4 && (
                        <i>
                          {owner === 1 ? (
                            <span className="mark-you">●</span>
                          ) : owner === 2 ? (
                            <span className="mark-them">○</span>
                          ) : (
                            ''
                          )}
                        </i>
                      )}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Arcade>
  )
}
