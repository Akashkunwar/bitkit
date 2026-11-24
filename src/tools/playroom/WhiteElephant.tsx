import { useState } from 'react'
import { canSteal } from '../../lib/playroom'
import { ModeShell, NamesField, type RosterProps } from './shell'

type Gift = { id: string; label: string; holder: string; opened: boolean; stolen: boolean }

export function WhiteElephant({ names, roster, onRoster }: RosterProps) {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [thief, setThief] = useState('')

  const deal = () => {
    setGifts(
      names.map((name, index) => ({
        id: `${index}-${name}`,
        label: `Gift ${index + 1}`,
        holder: name,
        opened: false,
        stolen: false,
      })),
    )
    setThief(names[1] ?? names[0] ?? '')
  }

  return (
    <ModeShell
      controls={
        <>
          <NamesField value={roster} onChange={onRoster} label="Players, one per line" />
          <label className="field">
            <span>Who steals</span>
            <select className="text-input" value={thief} onChange={(event) => setThief(event.target.value)}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-primary" disabled={names.length === 0} onClick={deal}>
            Deal gifts
          </button>
          <p className="hint">A gift can be stolen once, and only after it is opened.</p>
        </>
      }
      result={
        <>
          <h2>White elephant</h2>
          {gifts.length === 0 ? <p className="hint">Deal one wrapped gift per player.</p> : null}
          <ul>
            {gifts.map((gift) => {
              const allowed = canSteal(gift.opened, gift.stolen) && thief.length > 0 && thief !== gift.holder
              return (
                <li key={gift.id}>
                  <strong>{gift.label}</strong> · {gift.holder}
                  <span> · {gift.stolen ? 'Stolen' : gift.opened ? 'Opened' : 'Wrapped'}</span>
                  <div className="row">
                    <button
                      type="button"
                      className="btn"
                      disabled={gift.opened}
                      onClick={() =>
                        setGifts((current) =>
                          current.map((item) => (item.id === gift.id ? { ...item, opened: true } : item)),
                        )
                      }
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={!allowed}
                      onClick={() =>
                        setGifts((current) =>
                          current.map((item) =>
                            item.id === gift.id && canSteal(item.opened, item.stolen)
                              ? { ...item, stolen: true, holder: thief }
                              : item,
                          ),
                        )
                      }
                    >
                      Steal
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      }
    />
  )
}
