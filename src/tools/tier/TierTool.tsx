import { useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { downloadNamed } from '../../lib/download'

const TIERS = ['S', 'A', 'B', 'C', 'D'] as const

type Item = { id: number; label: string; tier: (typeof TIERS)[number] }

export default function TierTool() {
  const [draft, setDraft] = useState('')
  const [items, setItems] = useState<Item[]>([
    { id: 1, label: 'Local only', tier: 'S' },
    { id: 2, label: 'No account', tier: 'A' },
  ])
  const [nextId, setNextId] = useState(3)

  const add = () => {
    const label = draft.trim()
    if (!label) return
    setItems([...items, { id: nextId, label, tier: 'C' }])
    setNextId(nextId + 1)
    setDraft('')
  }

  const download = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 80 + TIERS.length * 72
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#f6f1ea'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif'
    TIERS.forEach((tier, index) => {
      const y = 24 + index * 72
      ctx.fillStyle = '#1c1915'
      ctx.fillText(tier, 16, y + 28)
      const row = items.filter((item) => item.tier === tier)
      row.forEach((item, i) => {
        ctx.fillStyle = '#fff'
        ctx.fillRect(56 + i * 150, y, 140, 48)
        ctx.strokeStyle = '#1c1915'
        ctx.strokeRect(56 + i * 150, y, 140, 48)
        ctx.fillStyle = '#1c1915'
        ctx.font = '14px ui-sans-serif, system-ui, sans-serif'
        ctx.fillText(item.label.slice(0, 16), 66 + i * 150, y + 28)
      })
    })
    canvas.toBlob((blob) => blob && void downloadNamed(blob, 'tier.png'), 'image/png')
  }

  return (
    <ToolLayout title="Tier list" lede="Rank your own labels, then download the board. Nothing is uploaded.">
      <div className="row">
        <input
          className="text-input"
          value={draft}
          placeholder="Add a label"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <button type="button" className="btn btn-primary" onClick={add}>
          Add
        </button>
        <button type="button" className="btn" onClick={download}>
          Download PNG
        </button>
      </div>
      {TIERS.map((tier) => (
        <section key={tier} className="panel" style={{ marginTop: '0.75rem' }}>
          <h3>{tier}</h3>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {items
              .filter((item) => item.tier === tier)
              .map((item) => (
                <span key={item.id} className="row">
                  <strong>{item.label}</strong>
                  <select
                    className="text-input"
                    value={item.tier}
                    aria-label={`Move ${item.label}`}
                    onChange={(e) =>
                      setItems(
                        items.map((row) =>
                          row.id === item.id ? { ...row, tier: e.target.value as Item['tier'] } : row,
                        ),
                      )
                    }
                  >
                    {TIERS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setItems(items.filter((row) => row.id !== item.id))}
                  >
                    Remove
                  </button>
                </span>
              ))}
          </div>
        </section>
      ))}
    </ToolLayout>
  )
}
