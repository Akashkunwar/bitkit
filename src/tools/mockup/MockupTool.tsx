import { useEffect, useMemo, useRef, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { Segmented } from '../../components/Segmented'
import { downloadNamed } from '../../lib/download'
import { CHATS, POSTS, chatById, postById } from '../../lib/mockups'

type Line = { mine: boolean; text: string }
type Kind = 'chat' | 'post'

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width) line = next
    else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function paintChat(canvas: HTMLCanvasElement, themeId: string, name: string, lines: Line[]) {
  const theme = chatById(themeId)
  const width = 420
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const font = '16px ui-sans-serif, system-ui, sans-serif'
  ctx.font = font
  const blocks = lines.map((line) => ({ ...line, rows: wrap(ctx, line.text || ' ', 230) }))
  const height = 88 + blocks.reduce((sum, block) => sum + block.rows.length * 22 + 28, 24)
  canvas.width = width
  canvas.height = Math.max(320, height)
  ctx.font = font
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, width, canvas.height)
  ctx.fillStyle = theme.header
  ctx.fillRect(0, 0, width, 64)
  ctx.fillStyle = theme.headerText
  ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(name || 'Name', 20, 38)
  let y = 88
  for (const block of blocks) {
    const boxW = Math.min(280, Math.max(80, ...block.rows.map((row) => ctx.measureText(row).width)) + 28)
    const boxH = block.rows.length * 22 + 16
    const x = block.mine ? width - 16 - boxW : 16
    ctx.fillStyle = block.mine ? theme.mine : theme.theirs
    ctx.beginPath()
    ctx.roundRect(x, y, boxW, boxH, 16)
    ctx.fill()
    ctx.fillStyle = block.mine ? theme.mineText : theme.theirsText
    ctx.font = '16px ui-sans-serif, system-ui, sans-serif'
    block.rows.forEach((row, index) => ctx.fillText(row, x + 14, y + 22 + index * 22))
    y += boxH + 10
  }
}

function paintPost(canvas: HTMLCanvasElement, themeId: string, name: string, handle: string, body: string) {
  const theme = postById(themeId)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const bodyFont = '16px ui-sans-serif, system-ui, sans-serif'
  ctx.font = bodyFont
  const rows = wrap(ctx, body || 'Write the post.', 400).slice(0, 6)
  canvas.width = 480
  canvas.height = 280
  ctx.font = bodyFont
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, 480, 280)
  ctx.fillStyle = theme.card
  ctx.fillRect(16, 16, 448, 248)
  ctx.fillStyle = theme.accent
  ctx.beginPath()
  ctx.arc(48, 56, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = theme.ink
  ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(name || 'Name', 76, 52)
  ctx.fillStyle = theme.muted
  ctx.font = '14px ui-sans-serif, system-ui, sans-serif'
  ctx.fillText(handle || '@name', 76, 72)
  ctx.fillStyle = theme.ink
  ctx.font = bodyFont
  rows.forEach((row, index) => ctx.fillText(row, 32, 120 + index * 24))
}

export default function MockupTool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [kind, setKind] = useState<Kind>('chat')
  const [chat, setChat] = useState(CHATS[0].id)
  const [post, setPost] = useState(POSTS[0].id)
  const [name, setName] = useState('Asha')
  const [handle, setHandle] = useState('@asha')
  const [draft, setDraft] = useState('On my way.')
  const [lines, setLines] = useState<Line[]>([
    { mine: false, text: 'Are you close?' },
    { mine: true, text: 'On my way.' },
  ])
  const [body, setBody] = useState('Shipped the local tools. Nothing left the browser.')

  const previewKey = useMemo(
    () => JSON.stringify({ kind, chat, post, name, handle, lines, body }),
    [kind, chat, post, name, handle, lines, body],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (kind === 'chat') paintChat(canvas, chat, name, lines)
    else paintPost(canvas, post, name, handle, body)
  }, [previewKey, kind, chat, post, name, handle, lines, body])

  return (
    <ToolLayout
      title="Mockups"
      lede="Chat screens and posts you fill in yourself, then download as a PNG. Nothing is posted anywhere."
    >
      <div className="split">
        <section className="panel">
          <Segmented
            label="Kind"
            value={kind}
            options={[
              { value: 'chat', label: 'Chat' },
              { value: 'post', label: 'Post' },
            ]}
            onChange={setKind}
          />
          <label className="field">
            <span>{kind === 'chat' ? 'App' : 'Post'}</span>
            <select
              className="text-input"
              value={kind === 'chat' ? chat : post}
              onChange={(e) => (kind === 'chat' ? setChat(e.target.value) : setPost(e.target.value))}
            >
              {(kind === 'chat' ? CHATS : POSTS).map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Name</span>
            <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {kind === 'post' ? (
            <>
              <label className="field">
                <span>Handle</span>
                <input className="text-input" value={handle} onChange={(e) => setHandle(e.target.value)} />
              </label>
              <label className="field">
                <span>Post</span>
                <textarea
                  className="code-area editor"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <ul className="hint">
                {lines.map((line, index) => (
                  <li key={`${line.text}-${index}`}>
                    {line.mine ? 'You' : 'Them'}: {line.text}{' '}
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setLines(lines.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <label className="field">
                <span>Message</span>
                <input className="text-input" value={draft} onChange={(e) => setDraft(e.target.value)} />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="btn"
                  onClick={() => draft.trim() && setLines([...lines, { mine: false, text: draft }])}
                >
                  Add as them
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => draft.trim() && setLines([...lines, { mine: true, text: draft }])}
                >
                  Add as you
                </button>
              </div>
            </>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              canvasRef.current?.toBlob((blob) => blob && void downloadNamed(blob, 'mockup.png'), 'image/png')
            }
          >
            Download PNG
          </button>
        </section>
        <aside className="panel">
          <canvas ref={canvasRef} className="paper-preview" />
        </aside>
      </div>
    </ToolLayout>
  )
}
