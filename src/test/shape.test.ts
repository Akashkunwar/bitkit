import { describe, expect, it } from 'vitest'
import { krutiToUnicode, unicodeToKruti } from '../lib/kruti'
import { transformLines } from '../lib/lines'
import {
  binaryToText,
  bionicPieces,
  codesToText,
  fixationLength,
  ipv4ToBinary,
  repeatText,
  reverseText,
  textToBinary,
  textToCodes,
} from '../lib/shape'

describe('text shape', () => {
  it('marks the start of each word for bionic reading', () => {
    expect(fixationLength('a')).toBe(1)
    expect(fixationLength('cat')).toBe(1)
    expect(fixationLength('reading')).toBe(3)
    const pieces = bionicPieces('Read this')
    expect(pieces.filter((piece) => piece.bold).map((piece) => piece.text)).toEqual(['Re', 'th'])
    expect(pieces.map((piece) => piece.text).join('')).toBe('Read this')
  })

  it('repeats, reverses, and shuffles without dropping characters', () => {
    expect(repeatText('ha', 3, ' ')).toBe('ha ha ha')
    expect(reverseText('नमस्ते')).toBe('ेत्समन')
    const shuffled = transformLines('a\nb\nc', 'shuffle', 4)
    expect(shuffled.split('\n').sort()).toEqual(['a', 'b', 'c'])
    expect(shuffled).not.toBe('a\nb\nc')
  })

  it('round-trips binary and character codes', () => {
    expect(binaryToText(textToBinary('A©'))).toBe('A©')
    expect(codesToText(textToCodes('कि'))).toBe('कि')
    expect(ipv4ToBinary('192.168.0.1')).toBe('11000000.10101000.00000000.00000001')
  })

  it('converts Kruti Dev 010 both ways', () => {
    expect(krutiToUnicode('d')).toBe('क')
    expect(krutiToUnicode('fd')).toBe('कि')
    expect(krutiToUnicode('dk')).toBe('का')
    expect(krutiToUnicode('dkZ')).toBe('र्का')
    expect(krutiToUnicode('esjk uke')).toBe('मेरा नाम')
    expect(krutiToUnicode('dk;Z')).toBe('कार्य')
    expect(unicodeToKruti('कि')).toBe('fd')
    expect(unicodeToKruti('मेरा नाम')).toBe('esjk uke')
    expect(unicodeToKruti('कार्य')).toBe('dk;Z')
  })
})
