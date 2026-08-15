import type { ReactNode } from 'react'

type Props = {
  title: string
  lede?: string
  actions?: ReactNode
  children: ReactNode
}

export function ToolLayout({ title, lede, actions, children }: Props) {
  return (
    <article className="tool-layout">
      <header className="tool-hero no-print">
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
        {actions ? <div className="row">{actions}</div> : null}
      </header>
      {children}
    </article>
  )
}
