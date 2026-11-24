import { useState } from 'react'
import { dropBall } from '../../lib/sims'

export function GaltonSim() {
  const [bins, setBins] = useState<number[]>(() => Array<number>(11).fill(0))
  const total = bins.reduce((sum, count) => sum + count, 0)

  const drop = (times: number) => {
    setBins((current) => {
      let next = current
      for (let n = 0; n < times; n += 1) {
        let bin = 0
        for (let peg = 0; peg < current.length - 1; peg += 1) if (Math.random() < 0.5) bin += 1
        next = dropBall(next, bin)
      }
      return next
    })
  }

  return (
    <div className="stack">
      <p>
        {total} balls dropped across {bins.length} bins.
      </p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => drop(1)}>
          Drop one
        </button>
        <button type="button" className="btn" onClick={() => drop(20)}>
          Drop 20
        </button>
        <button type="button" className="btn" onClick={() => setBins(Array<number>(bins.length).fill(0))}>
          Reset
        </button>
      </div>
      <div className="table-wrap" style={{ maxHeight: 'none' }}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Bin</th>
              <th className="num">Balls</th>
              <th>Pile</th>
            </tr>
          </thead>
          <tbody>
            {bins.map((count, index) => (
              <tr key={index}>
                <td>{index}</td>
                <td className="num">{count}</td>
                <td>
                  <div style={{ height: 14, width: count * 6, background: '#c45b2d' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
