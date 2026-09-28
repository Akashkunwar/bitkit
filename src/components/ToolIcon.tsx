import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CATEGORY_META, type ToolCategory } from '../registry'

type Props = {
  icon: LucideIcon
  category: ToolCategory
  size?: 'sm' | 'md' | 'lg'
}

const GLYPH = { sm: 16, md: 19, lg: 24 } as const

/** A tool or category glyph on a badge tinted with its category hue. */
export function ToolIcon({ icon: Icon, category, size = 'md' }: Props) {
  const style = { '--cat': CATEGORY_META[category].color } as CSSProperties
  return (
    <span className={size === 'lg' ? 'tool-icon tool-icon-lg' : 'tool-icon'} style={style} aria-hidden="true">
      <Icon size={GLYPH[size]} strokeWidth={2} />
    </span>
  )
}
