type Props = {
  label: string
  disabled?: boolean
  onClick: () => void
  primary?: boolean
}

export function DownloadButton({ label, disabled, onClick, primary = true }: Props) {
  return (
    <button type="button" className={primary ? 'btn btn-primary' : 'btn'} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
}
