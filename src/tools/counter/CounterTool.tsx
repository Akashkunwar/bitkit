import { useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { SendTo } from '../../components/SendTo'
import { useHandoff } from '../../lib/useHandoff'
import { useCopied } from '../../lib/useCopied'
import { countText, lengthFor, PLATFORMS, statusFor, type Platform } from '../../lib/platforms'

const GROUPS = ['Social', 'Search', 'Messaging', 'Store'] as const

export default function CounterTool() {
  const [text, setText] = useState('')
  const [pinned, setPinned] = useState<string[]>(['x-post', 'meta-title', 'meta-desc'])
  const { copied, copy } = useCopied()

  useHandoff((payload) => {
    if (payload.text) setText(payload.text)
    else if (payload.files?.[0]) void payload.files[0].text().then(setText)
  })

  const counts = useMemo(() => countText(text), [text])

  const row = (platform: Platform) => {
    const used = lengthFor(text, platform)
    const status = statusFor(used, platform.limit)
    const percent = Math.min(100, (used / platform.limit) * 100)
    const isPinned = pinned.includes(platform.id)
    return (
      <div key={platform.id} className="limit-row" data-status={status}>
        <div className="limit-head">
          <button
            type="button"
            className="pin-btn"
            aria-pressed={isPinned}
            aria-label={isPinned ? `Unpin ${platform.name}` : `Pin ${platform.name}`}
            onClick={() =>
              setPinned((current) =>
                current.includes(platform.id)
                  ? current.filter((id) => id !== platform.id)
                  : [...current, platform.id],
              )
            }
          >
            {isPinned ? '★' : '☆'}
          </button>
          <strong>{platform.name}</strong>
          <span className="muted">{platform.field}</span>
          <span className="limit-count">
            {used} / {platform.limit}
          </span>
        </div>
        <div className="limit-track">
          <div className="limit-bar" data-status={status} style={{ width: `${percent}%` }} />
        </div>
        {status === 'over' ? (
          <p className="limit-note">
            {used - platform.limit} over —{' '}
            {platform.behaviour === 'truncates'
              ? 'this will be cut off'
              : platform.behaviour === 'penalised'
                ? 'this will hurt how it displays'
                : 'this will be rejected'}
            .
          </p>
        ) : platform.note ? (
          <p className="limit-note muted">{platform.note}</p>
        ) : null}
      </div>
    )
  }

  const pinnedPlatforms = PLATFORMS.filter((p) => pinned.includes(p.id))

  return (
    <ToolLayout
      title="Platform counter"
      lede="One draft, checked against every character limit that matters — counted the way each platform actually counts."
    >
      <label className="field">
        <span>Draft</span>
        <textarea
          className="text-input"
          rows={7}
          value={text}
          placeholder="Paste your post, title, or description…"
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      <div className="pill-row">
        <span className="pill">
          <strong>{counts.graphemes}</strong> characters
        </span>
        <span className="pill">{counts.words} words</span>
        <span className="pill">{counts.charactersNoSpaces} without spaces</span>
        <span className="pill">{counts.lines} lines</span>
        <span className="pill">{counts.bytes} bytes</span>
        {counts.emoji ? <span className="pill">{counts.emoji} emoji</span> : null}
        {counts.urls ? <span className="pill">{counts.urls} links</span> : null}
      </div>

      {counts.graphemes !== counts.characters ? (
        <p className="hint">
          {counts.characters} code units but {counts.graphemes} visible characters — emoji and accented letters
          take more than one unit, and platforms differ on which they count.
        </p>
      ) : null}

      <div className="row" style={{ marginTop: '0.8rem' }}>
        <button type="button" className="btn" disabled={!text} onClick={() => void copy(text, 'text')}>
          {copied === 'text' ? 'Copied' : 'Copy draft'}
        </button>
        <button type="button" className="btn" disabled={!text} onClick={() => setText('')}>
          Clear
        </button>
      </div>

      {pinnedPlatforms.length ? (
        <>
          <p className="field-label" style={{ marginTop: '1.4rem' }}>
            Pinned
          </p>
          <div className="limit-list">{pinnedPlatforms.map(row)}</div>
        </>
      ) : null}

      {GROUPS.map((group) => {
        const list = PLATFORMS.filter((p) => p.group === group && !pinned.includes(p.id))
        if (!list.length) return null
        return (
          <div key={group}>
            <p className="field-label" style={{ marginTop: '1.4rem' }}>
              {group}
            </p>
            <div className="limit-list">{list.map(row)}</div>
          </div>
        )
      })}

      <SendTo from="counter" text={text} />
    </ToolLayout>
  )
}
