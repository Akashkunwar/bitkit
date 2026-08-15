import { useNavigate } from 'react-router-dom'
import { fileKind, SEND_TARGETS, setHandoff, type HandoffKind } from '../lib/handoff'

type Props = {
  from: string
  files?: File[]
  text?: string
}

function payloadKinds(files: File[] | undefined, text: string | undefined): HandoffKind[] {
  const kinds = new Set<HandoffKind>()
  for (const file of files ?? []) {
    const kind = fileKind(file)
    if (kind) kinds.add(kind)
  }
  if (text?.trim()) kinds.add('text')
  return [...kinds]
}

export function SendTo({ from, files, text }: Props) {
  const navigate = useNavigate()
  const kinds = payloadKinds(files, text)
  if (!kinds.length) return null
  const targets = SEND_TARGETS.filter((tool) => tool.id !== from && tool.accepts.some((kind) => kinds.includes(kind)))
  if (!targets.length) return null

  return (
    <div className="send-to">
      <span className="field-label">Send to</span>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {targets.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="btn"
            onClick={() => {
              setHandoff({ files, text, from })
              navigate(tool.path)
            }}
          >
            {tool.title}
          </button>
        ))}
      </div>
    </div>
  )
}
