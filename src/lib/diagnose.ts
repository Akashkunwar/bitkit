/**
 * Device-check logic that does not touch the DOM.
 *
 * The page can only report what the browser forwards after the operating
 * system has handled the hardware. These helpers turn those events into
 * "seen" and "held" so a stuck key (down without up) stays distinguishable
 * from a key that merely responded once.
 */

export type KeyCap = {
  /** KeyboardEvent.code. Empty marks a visual gap, not a key. */
  code: string
  label: string
  /** Width relative to a letter key. */
  grow?: number
}

export type OsKind = 'mac' | 'windows' | 'linux'
export type KeyboardKind = 'us' | 'uk' | 'fr' | 'de'

export type KeyboardChoice = {
  os: OsKind
  keyboard: KeyboardKind
}

export const OS_OPTIONS: { value: OsKind; label: string }[] = [
  { value: 'mac', label: 'Mac' },
  { value: 'windows', label: 'Windows' },
  { value: 'linux', label: 'Linux' },
]

export const KEYBOARD_OPTIONS: { value: KeyboardKind; label: string }[] = [
  { value: 'us', label: 'US' },
  { value: 'uk', label: 'UK' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
]

const OS_KINDS: readonly OsKind[] = ['mac', 'windows', 'linux']
const KEYBOARD_KINDS: readonly KeyboardKind[] = ['us', 'uk', 'fr', 'de']

/** Unshifted glyph printed on each physical key. ISO boards add IntlBackslash and move Backslash. */
const LEGENDS: Record<KeyboardKind, Record<string, string>> = {
  us: {
    Backquote: '`',
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    Digit6: '6',
    Digit7: '7',
    Digit8: '8',
    Digit9: '9',
    Digit0: '0',
    Minus: '-',
    Equal: '=',
    KeyQ: 'Q',
    KeyW: 'W',
    KeyE: 'E',
    KeyR: 'R',
    KeyT: 'T',
    KeyY: 'Y',
    KeyU: 'U',
    KeyI: 'I',
    KeyO: 'O',
    KeyP: 'P',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    KeyA: 'A',
    KeyS: 'S',
    KeyD: 'D',
    KeyF: 'F',
    KeyG: 'G',
    KeyH: 'H',
    KeyJ: 'J',
    KeyK: 'K',
    KeyL: 'L',
    Semicolon: ';',
    Quote: "'",
    KeyZ: 'Z',
    KeyX: 'X',
    KeyC: 'C',
    KeyV: 'V',
    KeyB: 'B',
    KeyN: 'N',
    KeyM: 'M',
    Comma: ',',
    Period: '.',
    Slash: '/',
  },
  uk: {
    Backquote: '`',
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    Digit6: '6',
    Digit7: '7',
    Digit8: '8',
    Digit9: '9',
    Digit0: '0',
    Minus: '-',
    Equal: '=',
    KeyQ: 'Q',
    KeyW: 'W',
    KeyE: 'E',
    KeyR: 'R',
    KeyT: 'T',
    KeyY: 'Y',
    KeyU: 'U',
    KeyI: 'I',
    KeyO: 'O',
    KeyP: 'P',
    BracketLeft: '[',
    BracketRight: ']',
    KeyA: 'A',
    KeyS: 'S',
    KeyD: 'D',
    KeyF: 'F',
    KeyG: 'G',
    KeyH: 'H',
    KeyJ: 'J',
    KeyK: 'K',
    KeyL: 'L',
    Semicolon: ';',
    Quote: "'",
    Backslash: '#',
    IntlBackslash: '\\',
    KeyZ: 'Z',
    KeyX: 'X',
    KeyC: 'C',
    KeyV: 'V',
    KeyB: 'B',
    KeyN: 'N',
    KeyM: 'M',
    Comma: ',',
    Period: '.',
    Slash: '/',
  },
  fr: {
    Backquote: '²',
    Digit1: '&',
    Digit2: 'é',
    Digit3: '"',
    Digit4: "'",
    Digit5: '(',
    Digit6: '-',
    Digit7: 'è',
    Digit8: '_',
    Digit9: 'ç',
    Digit0: 'à',
    Minus: ')',
    Equal: '=',
    KeyQ: 'A',
    KeyW: 'Z',
    KeyE: 'E',
    KeyR: 'R',
    KeyT: 'T',
    KeyY: 'Y',
    KeyU: 'U',
    KeyI: 'I',
    KeyO: 'O',
    KeyP: 'P',
    BracketLeft: '^',
    BracketRight: '$',
    KeyA: 'Q',
    KeyS: 'S',
    KeyD: 'D',
    KeyF: 'F',
    KeyG: 'G',
    KeyH: 'H',
    KeyJ: 'J',
    KeyK: 'K',
    KeyL: 'L',
    Semicolon: 'M',
    Quote: 'ù',
    Backslash: '*',
    IntlBackslash: '<',
    KeyZ: 'W',
    KeyX: 'X',
    KeyC: 'C',
    KeyV: 'V',
    KeyB: 'B',
    KeyN: 'N',
    KeyM: ',',
    Comma: ';',
    Period: ':',
    Slash: '!',
  },
  de: {
    Backquote: '^',
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    Digit6: '6',
    Digit7: '7',
    Digit8: '8',
    Digit9: '9',
    Digit0: '0',
    Minus: 'ß',
    Equal: '´',
    KeyQ: 'Q',
    KeyW: 'W',
    KeyE: 'E',
    KeyR: 'R',
    KeyT: 'T',
    KeyY: 'Z',
    KeyZ: 'Y',
    KeyU: 'U',
    KeyI: 'I',
    KeyO: 'O',
    KeyP: 'P',
    BracketLeft: 'Ü',
    BracketRight: '+',
    KeyA: 'A',
    KeyS: 'S',
    KeyD: 'D',
    KeyF: 'F',
    KeyG: 'G',
    KeyH: 'H',
    KeyJ: 'J',
    KeyK: 'K',
    KeyL: 'L',
    Semicolon: 'Ö',
    Quote: 'Ä',
    Backslash: '#',
    IntlBackslash: '<',
    KeyX: 'X',
    KeyC: 'C',
    KeyV: 'V',
    KeyB: 'B',
    KeyN: 'N',
    KeyM: 'M',
    Comma: ',',
    Period: '.',
    Slash: '-',
  },
}

const gap = (grow: number): KeyCap => ({ code: '', label: '', grow })

function named(legend: Record<string, string>, code: string, grow?: number): KeyCap {
  const label = legend[code]
  if (!label) throw new Error(`No key label for ${code}`)
  return grow ? { code, label, grow } : { code, label }
}

/** Mac laptops have no menu key and no right Control. Windows and Linux do, with different names. */
function bottomRow(os: OsKind): KeyCap[] {
  if (os === 'mac') {
    return [
      { code: 'ControlLeft', label: 'Ctrl', grow: 1.5 },
      { code: 'AltLeft', label: 'Opt', grow: 1.4 },
      { code: 'MetaLeft', label: 'Cmd', grow: 1.5 },
      { code: 'Space', label: 'Space', grow: 6.2 },
      { code: 'MetaRight', label: 'Cmd', grow: 1.5 },
      { code: 'AltRight', label: 'Opt', grow: 1.4 },
    ]
  }
  if (os === 'linux') {
    return [
      { code: 'ControlLeft', label: 'Ctrl', grow: 1.3 },
      { code: 'MetaLeft', label: 'Super', grow: 1.35 },
      { code: 'AltLeft', label: 'Alt', grow: 1.1 },
      { code: 'Space', label: 'Space', grow: 4.2 },
      { code: 'AltRight', label: 'AltGr', grow: 1.5 },
      { code: 'MetaRight', label: 'Super', grow: 1.35 },
      { code: 'ContextMenu', label: 'Menu', grow: 1.15 },
      { code: 'ControlRight', label: 'Ctrl', grow: 1.3 },
    ]
  }
  return [
    { code: 'ControlLeft', label: 'Ctrl', grow: 1.45 },
    { code: 'MetaLeft', label: 'Win', grow: 1.15 },
    { code: 'AltLeft', label: 'Alt', grow: 1.2 },
    { code: 'Space', label: 'Space', grow: 5.2 },
    { code: 'AltRight', label: 'Alt', grow: 1.2 },
    { code: 'ContextMenu', label: 'Menu', grow: 1.15 },
    { code: 'ControlRight', label: 'Ctrl', grow: 1.45 },
  ]
}

function letterRows(keyboard: KeyboardKind, os: OsKind): KeyCap[][] {
  const legend = LEGENDS[keyboard]
  const iso = keyboard !== 'us'
  const key = (code: string, grow?: number) => named(legend, code, grow)
  const back: KeyCap = { code: 'Backspace', label: os === 'mac' ? 'Delete' : 'Back', grow: 1.9 }
  const digits = [
    'Backquote',
    'Digit1',
    'Digit2',
    'Digit3',
    'Digit4',
    'Digit5',
    'Digit6',
    'Digit7',
    'Digit8',
    'Digit9',
    'Digit0',
    'Minus',
    'Equal',
  ].map((code) => key(code))

  return [
    [
      { code: 'Escape', label: 'Esc', grow: 1.35 },
      gap(0.55),
      { code: 'F1', label: 'F1' },
      { code: 'F2', label: 'F2' },
      { code: 'F3', label: 'F3' },
      { code: 'F4', label: 'F4' },
      gap(0.45),
      { code: 'F5', label: 'F5' },
      { code: 'F6', label: 'F6' },
      { code: 'F7', label: 'F7' },
      { code: 'F8', label: 'F8' },
      gap(0.45),
      { code: 'F9', label: 'F9' },
      { code: 'F10', label: 'F10' },
      { code: 'F11', label: 'F11' },
      { code: 'F12', label: 'F12' },
    ],
    [...digits, back],
    [
      { code: 'Tab', label: 'Tab', grow: 1.55 },
      key('KeyQ'),
      key('KeyW'),
      key('KeyE'),
      key('KeyR'),
      key('KeyT'),
      key('KeyY'),
      key('KeyU'),
      key('KeyI'),
      key('KeyO'),
      key('KeyP'),
      key('BracketLeft'),
      key('BracketRight'),
      ...(iso ? [] : [key('Backslash', 1.45)]),
    ],
    [
      { code: 'CapsLock', label: 'Caps', grow: iso ? 1.55 : 1.75 },
      key('KeyA'),
      key('KeyS'),
      key('KeyD'),
      key('KeyF'),
      key('KeyG'),
      key('KeyH'),
      key('KeyJ'),
      key('KeyK'),
      key('KeyL'),
      key('Semicolon'),
      key('Quote'),
      ...(iso ? [key('Backslash')] : []),
      { code: 'Enter', label: 'Enter', grow: iso ? 1.55 : 2.05 },
    ],
    [
      { code: 'ShiftLeft', label: 'Shift', grow: iso ? 1.15 : 2.25 },
      ...(iso ? [key('IntlBackslash')] : []),
      key('KeyZ'),
      key('KeyX'),
      key('KeyC'),
      key('KeyV'),
      key('KeyB'),
      key('KeyN'),
      key('KeyM'),
      key('Comma'),
      key('Period'),
      key('Slash'),
      { code: 'ShiftRight', label: 'Shift', grow: iso ? 1.85 : 2.65 },
    ],
    bottomRow(os),
  ]
}

export const NAV_ROWS: KeyCap[][] = [
  [
    { code: 'PrintScreen', label: 'PrtSc' },
    { code: 'ScrollLock', label: 'ScrLk' },
    { code: 'Pause', label: 'Pause' },
  ],
  [
    { code: 'Insert', label: 'Ins' },
    { code: 'Home', label: 'Home' },
    { code: 'PageUp', label: 'PgUp' },
  ],
  [
    { code: 'Delete', label: 'Del' },
    { code: 'End', label: 'End' },
    { code: 'PageDown', label: 'PgDn' },
  ],
  [
    { code: '', label: '', grow: 1 },
    { code: 'ArrowUp', label: '↑' },
    { code: '', label: '', grow: 1 },
  ],
  [
    { code: 'ArrowLeft', label: '←' },
    { code: 'ArrowDown', label: '↓' },
    { code: 'ArrowRight', label: '→' },
  ],
]

export const NUMPAD_ROWS: KeyCap[][] = [
  [
    { code: 'NumLock', label: 'Num' },
    { code: 'NumpadDivide', label: '/' },
    { code: 'NumpadMultiply', label: '*' },
    { code: 'NumpadSubtract', label: '−' },
  ],
  [
    { code: 'Numpad7', label: '7' },
    { code: 'Numpad8', label: '8' },
    { code: 'Numpad9', label: '9' },
    { code: 'NumpadAdd', label: '+' },
  ],
  [
    { code: 'Numpad4', label: '4' },
    { code: 'Numpad5', label: '5' },
    { code: 'Numpad6', label: '6' },
    { code: 'NumpadEnter', label: 'Enter' },
  ],
  [
    { code: 'Numpad1', label: '1' },
    { code: 'Numpad2', label: '2' },
    { code: 'Numpad3', label: '3' },
    { code: 'NumpadDecimal', label: '.' },
  ],
  [{ code: 'Numpad0', label: '0', grow: 2 }],
]

export function layoutCodes(rows: readonly (readonly KeyCap[])[]): string[] {
  return rows.flatMap((row) => row.map((key) => key.code).filter(Boolean))
}

/** Laptops omit the print-screen cluster. Full keyboards still report those codes in the last-key line. */
export function navRows(os: OsKind): KeyCap[][] {
  return os === 'mac' ? NAV_ROWS.slice(1) : NAV_ROWS
}

export type KeyboardBoard = {
  letters: KeyCap[][]
  nav: KeyCap[][]
  numpad: KeyCap[][]
  codes: string[]
}

export function keyboardBoard(os: OsKind, keyboard: KeyboardKind): KeyboardBoard {
  const letters = letterRows(keyboard, os)
  const nav = navRows(os)
  const numpad = NUMPAD_ROWS
  return { letters, nav, numpad, codes: layoutCodes([...letters, ...nav, ...numpad]) }
}

export function isKeyboardChoice(value: unknown): value is KeyboardChoice {
  if (!value || typeof value !== 'object') return false
  const choice = value as KeyboardChoice
  return OS_KINDS.includes(choice.os) && KEYBOARD_KINDS.includes(choice.keyboard)
}

/** Guess from the platform string. The picker overrides this, because a browser cannot see the keycaps. */
export function detectOs(platform: string): OsKind {
  const value = platform.toLowerCase()
  if (value.includes('mac') || value.includes('iphone') || value.includes('ipad')) return 'mac'
  if (value.includes('linux') || value.includes('x11') || value.includes('cros')) return 'linux'
  return 'windows'
}

export function detectKeyboard(language: string): KeyboardKind {
  const value = language.toLowerCase()
  if (value.startsWith('fr')) return 'fr'
  if (value.startsWith('de')) return 'de'
  if (value === 'en-gb' || value.startsWith('en-gb')) return 'uk'
  return 'us'
}

export type KeySets = {
  held: string[]
  seen: string[]
}

export const EMPTY_KEYS: KeySets = { held: [], seen: [] }

export function reduceKeys(state: KeySets, code: string, phase: 'down' | 'up'): KeySets {
  if (!code) return state
  if (phase === 'down') {
    const held = state.held.includes(code) ? state.held : [...state.held, code]
    const seen = state.seen.includes(code) ? state.seen : [...state.seen, code]
    if (held === state.held && seen === state.seen) return state
    return { held, seen }
  }
  if (!state.held.includes(code)) return state
  return { held: state.held.filter((item) => item !== code), seen: state.seen }
}

/** A missed keyup (alt-tab, a swallowed Fn chord) must not leave every modifier looking stuck. */
export function releaseHeld(state: KeySets): KeySets {
  return state.held.length ? { held: [], seen: state.seen } : state
}

export function seenOnBoard(seen: readonly string[], codes: readonly string[]): number {
  const hit = new Set(seen)
  return codes.filter((code) => hit.has(code)).length
}

export function formatKeyName(key: string): string {
  if (key === ' ') return 'Space'
  if (key === 'Unidentified') return 'Unidentified'
  return key || 'Unknown'
}

export const POINTER_BUTTONS = [
  { button: 0, name: 'Left' },
  { button: 1, name: 'Middle' },
  { button: 2, name: 'Right' },
  { button: 3, name: 'Back' },
  { button: 4, name: 'Forward' },
] as const

export function pointerButtonName(button: number): string {
  return POINTER_BUTTONS.find((item) => item.button === button)?.name ?? `Button ${button}`
}

export function tallyPress(counts: Record<number, number>, button: number): Record<number, number> {
  return { ...counts, [button]: (counts[button] ?? 0) + 1 }
}

export type WheelTotals = { up: number; down: number; left: number; right: number }

export const EMPTY_WHEEL: WheelTotals = { up: 0, down: 0, left: 0, right: 0 }

export function addWheel(totals: WheelTotals, deltaX: number, deltaY: number): WheelTotals {
  return {
    up: totals.up + (deltaY < 0 ? 1 : 0),
    down: totals.down + (deltaY > 0 ? 1 : 0),
    left: totals.left + (deltaX < 0 ? 1 : 0),
    right: totals.right + (deltaX > 0 ? 1 : 0),
  }
}

export type TrailPoint = { x: number; y: number }

export function appendTrail<T extends TrailPoint>(trail: readonly T[], point: T, limit = 48): T[] {
  const next = trail.length >= limit ? trail.slice(trail.length - limit + 1) : trail.slice()
  next.push(point)
  return next
}

/**
 * Standard Gamepad mapping. Face names list the Xbox label and the PlayStation
 * label, because the browser reports positions, not the glyphs printed on the pad.
 */
export const STANDARD_PAD = [
  { index: 0, label: 'A / Cross', short: 'A', place: 'face' },
  { index: 1, label: 'B / Circle', short: 'B', place: 'face' },
  { index: 2, label: 'X / Square', short: 'X', place: 'face' },
  { index: 3, label: 'Y / Triangle', short: 'Y', place: 'face' },
  { index: 4, label: 'Left bumper', short: 'LB', place: 'bumper' },
  { index: 5, label: 'Right bumper', short: 'RB', place: 'bumper' },
  { index: 6, label: 'Left trigger', short: 'LT', place: 'trigger' },
  { index: 7, label: 'Right trigger', short: 'RT', place: 'trigger' },
  { index: 8, label: 'Back', short: 'Back', place: 'menu' },
  { index: 9, label: 'Start', short: 'Start', place: 'menu' },
  { index: 10, label: 'Left stick', short: 'L3', place: 'stick' },
  { index: 11, label: 'Right stick', short: 'R3', place: 'stick' },
  { index: 12, label: 'D-pad up', short: 'Up', place: 'dpad' },
  { index: 13, label: 'D-pad down', short: 'Down', place: 'dpad' },
  { index: 14, label: 'D-pad left', short: 'Left', place: 'dpad' },
  { index: 15, label: 'D-pad right', short: 'Right', place: 'dpad' },
  { index: 16, label: 'Guide', short: 'Guide', place: 'menu' },
] as const

export function padLabel(index: number): string {
  return STANDARD_PAD.find((button) => button.index === index)?.label ?? `Button ${index}`
}

export type PadButton = { pressed: boolean; value: number }

export type PadReading = {
  id: string
  index: number
  mapping: string
  buttons: PadButton[]
  axes: number[]
}

type PadSource = {
  id: string
  index: number
  mapping: string
  buttons: readonly { pressed: boolean; value: number }[]
  axes: readonly number[]
}

/** Copy a live Gamepad. The browser mutates that object in place, which React must not hold. */
export function readingFromPad(pad: PadSource): PadReading {
  return {
    id: pad.id,
    index: pad.index,
    mapping: pad.mapping,
    buttons: pad.buttons.map((button) => ({ pressed: button.pressed, value: button.value })),
    axes: [...pad.axes],
  }
}

export function buttonActive(button: PadButton | undefined): boolean {
  if (!button) return false
  return button.pressed || button.value > 0.4
}

export function buttonFill(button: PadButton | undefined): number {
  if (!button) return 0
  const value = Number.isFinite(button.value) ? button.value : button.pressed ? 1 : 0
  return Math.min(1, Math.max(0, value))
}

/** −1…1 axis onto a 0…100 position inside a stick well. */
export function stickPercent(axis: number): number {
  if (!Number.isFinite(axis)) return 50
  return (Math.min(1, Math.max(-1, axis)) + 1) * 50
}

export type PadMemory = Record<string, { buttons: number[]; axes: number[] }>

const AXIS_MOVED = 0.25

export function padMemoryKey(pad: PadReading): string {
  return pad.id || `index-${pad.index}`
}

/** Remember buttons and sticks that have left rest, without forgetting them when they return. */
export function notePadActivity(memory: PadMemory, pads: readonly PadReading[]): PadMemory {
  let changed = false
  const next: PadMemory = { ...memory }
  for (const pad of pads) {
    const key = padMemoryKey(pad)
    const prev = next[key] ?? { buttons: [], axes: [] }
    const buttons = [...prev.buttons]
    const axes = [...prev.axes]
    let local = false
    pad.buttons.forEach((button, index) => {
      if (buttonActive(button) && !buttons.includes(index)) {
        buttons.push(index)
        local = true
      }
    })
    pad.axes.forEach((axis, index) => {
      if (Math.abs(axis) > AXIS_MOVED && !axes.includes(index)) {
        axes.push(index)
        local = true
      }
    })
    if (local) {
      next[key] = { buttons, axes }
      changed = true
    }
  }
  return changed ? next : memory
}

/** Coarse signature so a polling loop can skip a render when the pad has not moved. */
export function padSignature(pads: readonly PadReading[]): string {
  return pads
    .map((pad) => {
      const buttons = pad.buttons.map((button) => `${button.pressed ? 1 : 0}${Math.round(button.value * 20)}`).join(',')
      const axes = pad.axes.map((axis) => Math.round(axis * 40)).join(',')
      return `${pad.index}:${buttons}:${axes}`
    })
    .join('|')
}

export const SCREEN_COLOURS = [
  { id: 'black', label: 'Black', fill: '#000000', ink: '#ffffff' },
  { id: 'white', label: 'White', fill: '#ffffff', ink: '#161616' },
  { id: 'red', label: 'Red', fill: '#d01212', ink: '#ffffff' },
  { id: 'green', label: 'Green', fill: '#0c8f3e', ink: '#ffffff' },
  { id: 'blue', label: 'Blue', fill: '#1248d0', ink: '#ffffff' },
  { id: 'gray', label: 'Gray', fill: '#808080', ink: '#ffffff' },
] as const

export type DisplayInfo = {
  screenWidth: number
  screenHeight: number
  windowWidth: number
  windowHeight: number
  pixelRatio: number
}

export function formatDisplay(info: DisplayInfo): { screen: string; window: string; ratio: string } {
  const ratio = Number.isInteger(info.pixelRatio) ? String(info.pixelRatio) : info.pixelRatio.toFixed(2)
  return {
    screen: `${info.screenWidth} × ${info.screenHeight}`,
    window: `${info.windowWidth} × ${info.windowHeight}`,
    ratio,
  }
}

/**
 * Median frame interval, as whole hertz.
 * Gaps below 4ms or above 50ms are stalls or a backgrounded tab, not the panel's rate.
 */
export function refreshHertz(deltasMs: readonly number[]): number | null {
  const usable = deltasMs.filter((delta) => delta >= 4 && delta <= 50)
  if (usable.length < 24) return null
  const sorted = [...usable].sort((a, b) => a - b)
  const mid = sorted[Math.floor(sorted.length / 2)]
  return Math.round(1000 / mid)
}

export type Ear = 'left' | 'right' | 'both'

/** Stereo panner position. −1 is the speaker on your left as you face the screen. */
export function stereoPan(ear: Ear): number {
  if (ear === 'left') return -1
  if (ear === 'right') return 1
  return 0
}
