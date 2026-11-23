import { describe, expect, it } from 'vitest'
import {
  addWheel,
  appendTrail,
  buttonActive,
  buttonFill,
  detectKeyboard,
  detectOs,
  EMPTY_KEYS,
  EMPTY_WHEEL,
  formatDisplay,
  formatKeyName,
  isKeyboardChoice,
  keyboardBoard,
  layoutCodes,
  notePadActivity,
  padLabel,
  padSignature,
  pointerButtonName,
  readingFromPad,
  reduceKeys,
  refreshHertz,
  releaseHeld,
  SCREEN_COLOURS,
  seenOnBoard,
  STANDARD_PAD,
  stereoPan,
  stickPercent,
  tallyPress,
} from '../lib/diagnose'

describe('keyboard check', () => {
  it('lists each physical key once', () => {
    const codes = keyboardBoard('windows', 'us').codes
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toEqual(expect.arrayContaining(['KeyA', 'Space', 'Escape', 'ArrowLeft', 'Numpad0']))
    expect(
      layoutCodes([
        [
          { code: '', label: '' },
          { code: 'KeyA', label: 'A' },
        ],
      ]),
    ).toEqual(['KeyA'])
  })

  it('keeps a key held until it is released, and remembers that it worked', () => {
    const down = reduceKeys(EMPTY_KEYS, 'KeyA', 'down')
    const repeat = reduceKeys(down, 'KeyA', 'down')
    expect(repeat).toBe(down)
    expect(down).toEqual({ held: ['KeyA'], seen: ['KeyA'] })

    const up = reduceKeys(down, 'KeyA', 'up')
    expect(up).toEqual({ held: [], seen: ['KeyA'] })
    expect(reduceKeys(up, 'KeyA', 'up')).toBe(up)
    expect(reduceKeys(up, '', 'down')).toBe(up)
  })

  it('drops held keys on blur without forgetting which ones responded', () => {
    const held = reduceKeys(reduceKeys(EMPTY_KEYS, 'ShiftLeft', 'down'), 'KeyB', 'down')
    expect(releaseHeld(held)).toEqual({ held: [], seen: ['ShiftLeft', 'KeyB'] })
    expect(releaseHeld(EMPTY_KEYS)).toBe(EMPTY_KEYS)
  })

  it('counts only keys that are drawn on the board', () => {
    expect(seenOnBoard(['KeyA', 'IntlRo'], keyboardBoard('windows', 'us').codes)).toBe(1)
    expect(formatKeyName(' ')).toBe('Space')
    expect(formatKeyName('a')).toBe('a')
  })

  it('changes the modifier row and the printed letters with the operating system and keyboard', () => {
    const label = (os: 'mac' | 'windows' | 'linux', keyboard: 'us' | 'uk' | 'fr' | 'de', code: string) =>
      keyboardBoard(os, keyboard)
        .letters.flat()
        .find((key) => key.code === code)?.label

    expect(label('windows', 'us', 'MetaLeft')).toBe('Win')
    expect(label('windows', 'us', 'Backspace')).toBe('Back')
    expect(label('mac', 'us', 'MetaLeft')).toBe('Cmd')
    expect(label('mac', 'us', 'AltLeft')).toBe('Opt')
    expect(label('mac', 'us', 'Backspace')).toBe('Delete')
    expect(label('linux', 'us', 'MetaLeft')).toBe('Super')
    expect(label('linux', 'us', 'AltRight')).toBe('AltGr')

    const macCodes = keyboardBoard('mac', 'us').codes
    expect(macCodes).not.toContain('ContextMenu')
    expect(macCodes).not.toContain('PrintScreen')
    expect(keyboardBoard('windows', 'us').codes).toContain('ContextMenu')
    expect(keyboardBoard('windows', 'us').codes).not.toContain('IntlBackslash')
    expect(keyboardBoard('windows', 'uk').codes).toContain('IntlBackslash')

    expect(label('windows', 'fr', 'KeyQ')).toBe('A')
    expect(label('windows', 'fr', 'KeyA')).toBe('Q')
    expect(label('windows', 'fr', 'KeyZ')).toBe('W')
    expect(label('windows', 'de', 'KeyY')).toBe('Z')
    expect(label('windows', 'de', 'KeyZ')).toBe('Y')

    for (const os of ['mac', 'windows', 'linux'] as const) {
      for (const keyboard of ['us', 'uk', 'fr', 'de'] as const) {
        const codes = keyboardBoard(os, keyboard).codes
        expect(new Set(codes).size, `${os} ${keyboard}`).toBe(codes.length)
      }
    }
  })

  it('guesses an operating system and keyboard, and rejects a stored choice it does not recognise', () => {
    expect(detectOs('MacIntel')).toBe('mac')
    expect(detectOs('Win32')).toBe('windows')
    expect(detectOs('Linux x86_64')).toBe('linux')
    expect(detectKeyboard('fr-FR')).toBe('fr')
    expect(detectKeyboard('de-AT')).toBe('de')
    expect(detectKeyboard('en-GB')).toBe('uk')
    expect(detectKeyboard('en-US')).toBe('us')
    expect(isKeyboardChoice({ os: 'linux', keyboard: 'de' })).toBe(true)
    expect(isKeyboardChoice({ os: 'dos', keyboard: 'us' })).toBe(false)
    expect(isKeyboardChoice(null)).toBe(false)
  })
})

describe('pointer check', () => {
  it('names the five buttons a page can hear', () => {
    expect(pointerButtonName(2)).toBe('Right')
    expect(pointerButtonName(8)).toBe('Button 8')
    expect(tallyPress(tallyPress({}, 0), 0)).toEqual({ 0: 2 })
  })

  it('counts wheel direction and caps the trail', () => {
    expect(addWheel(EMPTY_WHEEL, 0, -1)).toEqual({ up: 1, down: 0, left: 0, right: 0 })
    expect(addWheel(EMPTY_WHEEL, 4, 2)).toEqual({ up: 0, down: 1, left: 0, right: 1 })
    const trail = appendTrail(
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      { x: 2, y: 2 },
      2,
    )
    expect(trail).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ])
  })
})

describe('controller check', () => {
  it('copies a pad so later mutation does not rewrite the snapshot', () => {
    const source = {
      id: 'Pad',
      index: 0,
      mapping: 'standard',
      buttons: [{ pressed: true, value: 1 }],
      axes: [0.2],
    }
    const reading = readingFromPad(source)
    source.buttons[0].pressed = false
    source.axes[0] = 1
    expect(reading.buttons[0]).toEqual({ pressed: true, value: 1 })
    expect(reading.axes).toEqual([0.2])
  })

  it('treats a half-pulled trigger as active and clamps the stick', () => {
    expect(buttonActive({ pressed: false, value: 0.5 })).toBe(true)
    expect(buttonActive({ pressed: false, value: 0.2 })).toBe(false)
    expect(buttonFill({ pressed: true, value: Number.NaN })).toBe(1)
    expect(buttonFill(undefined)).toBe(0)
    expect(stickPercent(-2)).toBe(0)
    expect(stickPercent(0)).toBe(50)
    expect(stickPercent(Number.NaN)).toBe(50)
    expect(padLabel(0)).toBe('A / Cross')
    expect(padLabel(20)).toBe('Button 20')
  })

  it('remembers a button or a moved stick, and ignores a resting axis', () => {
    const pad = readingFromPad({
      id: 'Pad',
      index: 0,
      mapping: 'standard',
      buttons: [
        { pressed: true, value: 1 },
        { pressed: false, value: 0 },
      ],
      axes: [0.1, -0.8],
    })
    const once = notePadActivity({}, [pad])
    expect(once.Pad).toEqual({ buttons: [0], axes: [1] })
    expect(notePadActivity(once, [pad])).toBe(once)
    expect(STANDARD_PAD.map((button) => button.index)).toEqual([...Array(STANDARD_PAD.length).keys()])
  })

  it('changes signature when a stick moves a visible step', () => {
    const still = readingFromPad({
      id: 'Pad',
      index: 0,
      mapping: '',
      buttons: [{ pressed: false, value: 0 }],
      axes: [0],
    })
    const moved = { ...still, axes: [0.2] }
    expect(padSignature([still])).not.toBe(padSignature([moved]))
    expect(padSignature([still])).toBe(padSignature([{ ...still, axes: [0.005] }]))
  })
})

describe('screen and speaker check', () => {
  it('formats the sizes the browser reports', () => {
    expect(
      formatDisplay({ screenWidth: 1920, screenHeight: 1080, windowWidth: 1440, windowHeight: 900, pixelRatio: 2 }),
    ).toEqual({ screen: '1920 × 1080', window: '1440 × 900', ratio: '2' })
    expect(SCREEN_COLOURS.map((colour) => colour.id)).toEqual(['black', 'white', 'red', 'green', 'blue', 'gray'])
  })

  it('reads refresh from the median frame, and ignores stalls', () => {
    expect(refreshHertz(Array.from({ length: 40 }, () => 1000 / 60))).toBe(60)
    expect(refreshHertz(Array.from({ length: 40 }, () => 1000 / 144))).toBe(144)
    expect(refreshHertz([0, 0, 800, ...Array.from({ length: 30 }, () => 1000 / 120)])).toBe(120)
    expect(refreshHertz(Array.from({ length: 10 }, () => 16))).toBeNull()
  })

  it('places a tone fully left, fully right, or in the middle', () => {
    expect(stereoPan('left')).toBe(-1)
    expect(stereoPan('right')).toBe(1)
    expect(stereoPan('both')).toBe(0)
  })
})
