import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'

type Props = {
  accept?: string
  multiple?: boolean
  label?: string
  hint?: string
  onFiles: (files: File[]) => void
  children?: ReactNode
}

export function DropZone({ accept = 'image/*', multiple, label, hint, onFiles, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(false)

  const take = (list: FileList | File[] | null) => {
    const files = list ? [...list] : []
    if (files.length) onFiles(files)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setActive(false)
    take(event.dataTransfer.files)
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    take(event.target.files)
    event.target.value = ''
  }

  return (
    <div
      className="dropzone"
      data-active={active}
      onDragOver={(event) => {
        event.preventDefault()
        setActive(true)
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
    >
      <p>{label ?? 'Drop a file, click to choose, or paste.'}</p>
      {hint ? <p className="hint">{hint}</p> : null}
      <div className="row" style={{ justifyContent: 'center', marginTop: '0.8rem' }}>
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          Choose file
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
