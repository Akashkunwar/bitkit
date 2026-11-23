import { useState } from 'react'
import { Segmented } from '../../components/Segmented'
import { ToolLayout } from '../../components/ToolLayout'
import { KeyboardCheck } from './KeyboardCheck'
import { MouseCheck } from './MouseCheck'
import { PadCheck } from './PadCheck'
import { ScreenCheck } from './ScreenCheck'
import { SoundCheck } from './SoundCheck'

type Mode = 'keyboard' | 'mouse' | 'controller' | 'screen' | 'sound'

const MODES: { value: Mode; label: string }[] = [
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'controller', label: 'Controller' },
  { value: 'screen', label: 'Screen' },
  { value: 'sound', label: 'Speakers' },
]

export default function DiagnoseTool() {
  const [mode, setMode] = useState<Mode>('keyboard')

  return (
    <ToolLayout
      title="Device check"
      lede="See whether the keyboard, mouse, controller, screen, and speakers respond. Everything stays in this tab — nothing is recorded or uploaded."
    >
      <Segmented label="Check" value={mode} options={MODES} onChange={setMode} block />
      {mode === 'keyboard' ? <KeyboardCheck /> : null}
      {mode === 'mouse' ? <MouseCheck /> : null}
      {mode === 'controller' ? <PadCheck /> : null}
      {mode === 'screen' ? <ScreenCheck /> : null}
      {mode === 'sound' ? <SoundCheck /> : null}
    </ToolLayout>
  )
}
