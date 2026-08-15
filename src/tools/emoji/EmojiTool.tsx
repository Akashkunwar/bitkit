import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useCopied } from '../../lib/useCopied'
import { EMOJI, EMOJI_GROUPS, searchEmoji, searchKaomoji, type EmojiGroup } from '../../lib/emoji'

export default function EmojiTool() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<EmojiGroup | 'All'>('All')
  const [basket, setBasket] = useState<string[]>([])
  const { copied, copy } = useCopied()

  const results = useMemo(() => searchEmoji(query, group), [query, group])
  const kaomoji = useMemo(() => (query ? searchKaomoji(query) : []), [query])

  const add = (char: string) => {
    setBasket((current) => [...current, char])
    void copy(char, char)
  }

  return (
    <ToolLayout
      title="Emoji search"
      lede="Find an emoji by what it means, not by its official name. Click to copy."
    >
      <div className="finder-input">
        <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <input
          type="search"
          value={query}
          aria-label="Search emoji"
          placeholder={`Search ${EMOJI.length} emoji — try “launch”, “thanks”, or “bug”`}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button type="button" className="btn-ghost" onClick={() => setQuery('')}>
            Clear
          </button>
        ) : null}
      </div>

      <div className="filter-row">
        {(['All', ...EMOJI_GROUPS] as (EmojiGroup | 'All')[]).map((option) => (
          <button
            key={option}
            type="button"
            className={group === option ? 'filter-pill is-on' : 'filter-pill'}
            aria-pressed={group === option}
            onClick={() => setGroup(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {basket.length ? (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <p className="field-label" style={{ margin: 0 }}>Picked</p>
            <div className="row">
              <button type="button" className="btn-ghost" onClick={() => setBasket([])}>
                Clear
              </button>
              <button type="button" className="btn" onClick={() => void copy(basket.join(''), 'basket')}>
                {copied === 'basket' ? 'Copied' : 'Copy all'}
              </button>
            </div>
          </div>
          <p className="emoji-basket">{basket.join('')}</p>
        </div>
      ) : null}

      <p className="field-label" style={{ marginTop: '1.2rem' }}>
        {results.length} emoji
      </p>
      {results.length ? (
        <div className="emoji-grid">
          {results.map((emoji) => (
            <button
              key={emoji.char + emoji.name}
              type="button"
              className="emoji-cell"
              title={`${emoji.name} — ${emoji.keywords}`}
              onClick={() => add(emoji.char)}
            >
              <span className="emoji-char">{emoji.char}</span>
              <span className="emoji-name">{copied === emoji.char ? 'Copied' : emoji.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Nothing matched “{query}”. Try a feeling, an object, or an action.</p>
      )}

      {kaomoji.length ? (
        <>
          <p className="field-label" style={{ marginTop: '1.4rem' }}>
            Kaomoji
          </p>
          <div className="result-list">
            {kaomoji.map((k) => (
              <div key={k.text} className="result-row">
                <span className="mono-val" style={{ flex: 1 }}>{k.text}</span>
                <span className="hint">{k.name}</span>
                <button type="button" className="btn-ghost" onClick={() => void copy(k.text, k.text)}>
                  {copied === k.text ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!query ? (
        <p className="hint" style={{ marginTop: '1.2rem' }}>
          Search a kaomoji by name too — try “shrug”, “table flip”, or “bear”.
        </p>
      ) : null}

      <SendTo from="emoji" text={basket.join('')} />
    </ToolLayout>
  )
}
