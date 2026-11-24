import { useEffect, useMemo, useState } from 'react'
import { singleElim } from '../../lib/playroom'
import { ModeShell, NamesField, type RosterProps } from './shell'

export function Bracket({ names, roster, onRoster }: RosterProps) {
  const [picks, setPicks] = useState<Record<string, string>>({})
  const rosterKey = names.join('\n')

  useEffect(() => {
    setPicks({})
  }, [rosterKey])

  const rounds = useMemo(() => {
    const built: string[][][] = []
    let current = names
    let champion = ''
    for (let round = 0; round < 8 && current.length > 0; round += 1) {
      if (current.length === 1) {
        champion = current[0] ?? ''
        break
      }
      const matches = singleElim(current)
      built.push(matches)
      const winners = matches.map((match, matchIndex) => {
        if (match.length < 2) return match[0] ?? ''
        const pick = picks[`${round}-${matchIndex}`]
        return pick && match.includes(pick) ? pick : ''
      })
      if (winners.some((winner) => winner.length === 0)) break
      current = winners
    }
    return { built, champion }
  }, [names, picks])

  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Names, one per line" />
          <button type="button" className="btn" onClick={() => setPicks({})}>
            Reset bracket
          </button>
          <p className="hint">The first round is a single-elimination pairing. Choose a winner in each match.</p>
        </>
      }
      result={
        <>
          <h2>Bracket</h2>
          {names.length < 2 ? <p className="hint">Add at least two names.</p> : null}
          {rounds.built.map((matches, roundIndex) => (
            <div key={roundIndex}>
              <h3>Round {roundIndex + 1}</h3>
              <ul>
                {matches.map((match, matchIndex) => (
                  <li key={`${roundIndex}-${matchIndex}`}>
                    {match.length < 2 ? (
                      <span>{match[0]} · bye</span>
                    ) : (
                      <div className="row">
                        {match.map((name) => {
                          const selected = picks[`${roundIndex}-${matchIndex}`] === name
                          return (
                            <button
                              key={name}
                              type="button"
                              className={selected ? 'btn btn-primary' : 'btn'}
                              aria-pressed={selected}
                              onClick={() =>
                                setPicks((current) => ({ ...current, [`${roundIndex}-${matchIndex}`]: name }))
                              }
                            >
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {rounds.champion ? <p className="lede">Winner {rounds.champion}</p> : null}
        </>
      }
    />
  )
}
