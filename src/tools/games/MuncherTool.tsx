import { useState } from 'react'
import { freshMuncher, stepMuncher, type Muncher } from '../../lib/games/muncher'
import { Arcade } from './kit'
import { useHeld, useTick } from './loop'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const

export default function MuncherTool() {
  const [state, setState] = useState<Muncher>(freshMuncher)
  const held = useHeld(KEYS)

  useTick(() => {
    const dir = held.current.has('ArrowLeft')
      ? { x: -1, y: 0 }
      : held.current.has('ArrowRight')
        ? { x: 1, y: 0 }
        : held.current.has('ArrowUp')
          ? { x: 0, y: -1 }
          : held.current.has('ArrowDown')
            ? { x: 0, y: 1 }
            : null
    setState((current) => stepMuncher(current, dir, true))
  }, 180)

  const width = state.rows[0].length
  return (
    <Arcade
      title="Muncher"
      lede="Eat every dot. Arrow keys move. The ghost steps toward you."
      status={state.won ? 'Clear' : state.dead ? 'Caught' : `Dots ${state.score} · lives ${state.lives}`}
      onRestart={() => setState(freshMuncher())}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, maxWidth: 420, gap: 2 }}>
        {state.rows.flatMap((row, y) =>
          row.split('').map((cell, x) => {
            const here = state.px === x && state.py === y
            const ghost = state.gx === x && state.gy === y
            const dot = state.dots[y * width + x]
            return (
              <div
                key={`${x}-${y}`}
                className="arcade-cell"
                style={{ fontSize: 12, background: cell === '#' ? '#24281c' : undefined }}
              >
                {here ? '●' : ghost ? '▲' : dot ? '·' : ''}
              </div>
            )
          }),
        )}
      </div>
      <div className="arcade-keys">
        <button
          type="button"
          className="btn"
          onClick={() => setState((current) => stepMuncher(current, { x: 0, y: -1 }, true))}
        >
          Up
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setState((current) => stepMuncher(current, { x: -1, y: 0 }, true))}
        >
          Left
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setState((current) => stepMuncher(current, { x: 1, y: 0 }, true))}
        >
          Right
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setState((current) => stepMuncher(current, { x: 0, y: 1 }, true))}
        >
          Down
        </button>
      </div>
    </Arcade>
  )
}
