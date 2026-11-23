import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { useCopied } from '../../lib/useCopied'
import { bingoCard, CHRISTMAS_WORDS, maze, seatNames, secretSanta, wordBingo, wordSearch } from '../../lib/party'

type Mode = 'santa' | 'bingo' | 'search' | 'maze' | 'seats' | 'christmas' | 'goals'

export default function PartyTool() {
  const [mode, setMode] = useState<Mode>('santa')
  const [names, setNames] = useState('Asha\nDev\nMina\nRohit')
  const [words, setWords] = useState('local\nbrowser\nbitkit\npuzzle')
  const [seed, setSeed] = useState(1)
  const [perTable, setPerTable] = useState(4)
  const { copied, copy } = useCopied()

  const santa = useMemo(() => {
    if (mode !== 'santa') return { pairs: [] as { from: string; to: string }[], error: null as string | null }
    try {
      return { pairs: secretSanta(names.split('\n'), seed), error: null as string | null }
    } catch (err) {
      return { pairs: [], error: err instanceof Error ? err.message : 'Could not pair names.' }
    }
  }, [mode, names, seed])

  const card = useMemo(() => (mode === 'bingo' ? bingoCard(seed) : []), [mode, seed])
  const puzzle = useMemo(
    () => (mode === 'search' ? wordSearch(words.split('\n'), 12, seed) : null),
    [mode, words, seed],
  )
  const walls = useMemo(() => (mode === 'maze' ? maze(21, 21, seed) : null), [mode, seed])
  const extra = useMemo(() => {
    try {
      if (mode === 'seats')
        return { tables: seatNames(names.split('\n'), perTable, seed), card: null, error: null as string | null }
      if (mode === 'christmas')
        return { tables: null, card: wordBingo(CHRISTMAS_WORDS, seed), error: null as string | null }
      if (mode === 'goals')
        return { tables: null, card: wordBingo(words.split('\n'), seed), error: null as string | null }
      return { tables: null, card: null, error: null as string | null }
    } catch (err) {
      return { tables: null, card: null, error: err instanceof Error ? err.message : 'Could not build that sheet.' }
    }
  }, [mode, names, words, perTable, seed])

  const santaText = santa.pairs.map((pair) => `${pair.from} → ${pair.to}`).join('\n')

  return (
    <ToolLayout
      title="Party sheets"
      lede="Secret santa, bingo, word cards, a word search, a maze, and a seating chart. Shuffle again for a new sheet. Nothing is saved."
    >
      <Segmented
        label="Sheet"
        value={mode}
        options={[
          { value: 'santa', label: 'Secret santa' },
          { value: 'bingo', label: 'Bingo' },
          { value: 'search', label: 'Word search' },
          { value: 'maze', label: 'Maze' },
          { value: 'seats', label: 'Seats' },
          { value: 'christmas', label: 'Christmas' },
          { value: 'goals', label: 'Goals' },
        ]}
        onChange={setMode}
      />
      <div className="split">
        <section className="panel">
          {mode === 'santa' || mode === 'seats' ? (
            <label className="field">
              <span>Names, one per line</span>
              <textarea
                className="code-area editor"
                rows={8}
                value={names}
                onChange={(e) => setNames(e.target.value)}
              />
            </label>
          ) : null}
          {mode === 'search' || mode === 'goals' ? (
            <label className="field">
              <span>Words, one per line</span>
              <textarea
                className="code-area editor"
                rows={8}
                value={words}
                onChange={(e) => setWords(e.target.value)}
              />
            </label>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={() => setSeed((n) => n + 1)}>
            Shuffle
          </button>
          {mode === 'seats' ? (
            <label className="field">
              <span>Seats per table · {perTable}</span>
              <input
                type="range"
                min={2}
                max={10}
                value={perTable}
                onChange={(e) => setPerTable(Number(e.target.value))}
              />
            </label>
          ) : null}
          {santa.error || extra.error ? <p className="status-bad">{santa.error || extra.error}</p> : null}
          {mode === 'santa' && santaText ? (
            <button type="button" className="btn" onClick={() => void copy(santaText, 'santa')}>
              {copied === 'santa' ? 'Copied ✓' : 'Copy pairs'}
            </button>
          ) : null}
        </section>
        <aside className="panel">
          {mode === 'santa' ? (
            <ul>
              {santa.pairs.map((pair) => (
                <li key={pair.from}>
                  {pair.from} gives to {pair.to}
                </li>
              ))}
            </ul>
          ) : null}
          {mode === 'bingo' ? (
            <table className="data-table">
              <thead>
                <tr>
                  {['B', 'I', 'N', 'G', 'O'].map((letter) => (
                    <th key={letter}>{letter}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.map((row, index) => (
                  <tr key={index}>
                    {row.map((n, col) => (
                      <td key={col}>{n === 0 ? 'FREE' : n}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {puzzle ? (
            <>
              <p className="hint">Placed: {puzzle.placed.join(', ') || 'none'}</p>
              <pre className="code-area">{puzzle.grid.map((row) => row.join(' ')).join('\n')}</pre>
            </>
          ) : null}
          {walls ? (
            <pre className="code-area" aria-label="Maze">
              {walls.map((row) => row.map((cell) => (cell ? '██' : '  ')).join('')).join('\n')}
            </pre>
          ) : null}
          {extra.tables ? (
            <ul>
              {extra.tables.map((table, index) => (
                <li key={index}>
                  Table {index + 1}: {table.join(', ')}
                </li>
              ))}
            </ul>
          ) : null}
          {extra.card ? (
            <table className="data-table">
              <tbody>
                {extra.card.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, col) => (
                      <td key={col}>{cell ?? 'FREE'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </aside>
      </div>
    </ToolLayout>
  )
}
