import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { FolderOpen, UploadCloud } from 'lucide-react'
import { imageFormatHint } from '../lib/image/formatHint'

type Props = {
  accept?: string
  multiple?: boolean
  label?: string
  hint?: string
  onFiles: (files: File[]) => void
  /** A single-row variant for adding more files once some are loaded. */
  compact?: boolean
  /** Button text; defaults to "Choose file" / "Choose files". */
  buttonLabel?: string
  children?: ReactNode
}

/**
 * Drag-and-drop target with a file picker fallback.
 *
 * The whole zone is a drop target; the button is the keyboard and touch path.
 * A drag leaving a child element fires dragleave on the zone too, so the
 * active state is tracked with a depth counter rather than a boolean.
 */
export function DropZone({
  accept = 'image/*',
  multiple,
  label,
  hint,
  onFiles,
  compact,
  buttonLabel,
  children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const depth = useRef(0)
  const [active, setActive] = useState(false)
  const [formatNote, setFormatNote] = useState<string | null>(null)

  const take = (list: FileList | File[] | null) => {
    const files = list ? [...list] : []
    if (!files.length) return
    const note = files.map(imageFormatHint).find(Boolean) ?? null
    setFormatNote(note)
    onFiles(files)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    depth.current = 0
    setActive(false)
    take(event.dataTransfer.files)
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    take(event.target.files)
    event.target.value = ''
  }

  const title = label ?? (multiple ? 'Drop files here, or paste.' : 'Drop a file here, or paste.')

  return (
    <div
      className={compact ? 'dropzone dropzone-compact' : 'dropzone'}
      data-active={active}
      onDragEnter={(event) => {
        event.preventDefault()
        depth.current += 1
        setActive(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1)
        if (depth.current === 0) setActive(false)
      }}
      onDrop={onDrop}
    >
      <span className="dropzone-icon" aria-hidden="true">
        <UploadCloud size={compact ? 18 : 22} />
      </span>
      <div>
        <p className="dropzone-title">{title}</p>
        {hint ? <p className="hint">{hint}</p> : null}
        {formatNote ? <p className="banner">{formatNote}</p> : null}
      </div>
      <div className="dropzone-actions">
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          <FolderOpen size={16} aria-hidden="true" />
          {buttonLabel ?? (multiple ? 'Choose files' : 'Choose file')}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        aria-label={label ?? 'Choose a file'}
        onChange={onChange}
      />
      {children}
    </div>
  )
}
