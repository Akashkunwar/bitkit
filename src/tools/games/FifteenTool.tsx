import { useCallback, useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { fifteenSolved, freshFifteen, slideFifteen } from '../../lib/games/fifteen'
import { Arcade } from './kit'
import { useArrows } from './keys'

const SLIDE: Record<string, [number, number]> = {
  ArrowLeft: [0, 1],
  ArrowRight: [0, -1],
  ArrowUp: [1, 0],
  ArrowDown: [-1, 0],
}

export default function FifteenTool() {
  const [tiles, setTiles] = useState(() => freshFifteen(mulberry32(5)))
  const play = useCallback((key: string) => {
    const step = SLIDE[key]
    if (!step) return
    setTiles((current) => {
      const blank = current.indexOf(0)
      const row = Math.floor(blank / 4) + step[0]
      const col = (blank % 4) + step[1]
      if (row < 0 || col < 0 || row > 3 || col > 3) return current
      return slideFifteen(current, row * 4 + col)
    })
  }, [])
  useArrows(play)
  return (
    <Arcade
      title="15 Puzzle"
      lede="Slide tiles into the gap until they read 1 to 15. Arrow keys move the tile beside the gap."
      status={fifteenSolved(tiles) ? 'Solved' : 'Slide a neighbour'}
      onRestart={() => setTiles(freshFifteen(mulberry32(Date.now() % 100000)))}
    >
      <div className="arcade-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', maxWidth: 280 }}>
        {tiles.map((tile, index) => (
          <button
            key={index}
            type="button"
            className={tile ? 'arcade-cell' : 'arcade-cell arcade-tile'}
            onClick={() => setTiles((current) => slideFifteen(current, index))}
          >
            {tile || ''}
          </button>
        ))}
      </div>
    </Arcade>
  )
}
