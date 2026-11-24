import { useState } from 'react'
import { mulberry32 } from '../../lib/games/random'
import { fifteenSolved, freshFifteen, slideFifteen } from '../../lib/games/fifteen'
import { Arcade } from './kit'

export default function FifteenTool() {
  const [tiles, setTiles] = useState(() => freshFifteen(mulberry32(5)))
  return (
    <Arcade
      title="Fifteen"
      lede="Slide tiles into the gap until they read 1 to 15."
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
