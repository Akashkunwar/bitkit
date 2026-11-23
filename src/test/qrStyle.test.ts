import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import {
  bitcoinPayload,
  eventPayload,
  locationPayload,
  mecardPayload,
  socialPayload,
  vcardPayload,
  type ContactFields,
} from '../lib/qr'
import { contrastRatio, renderStyledQr, type QrLook } from '../lib/qrDraw'

const contact: ContactFields = {
  first: 'Ada',
  last: 'Lovelace',
  org: 'Analytical',
  title: 'Mathematician',
  mobile: '+44 1',
  work: '',
  email: 'ada@example.com',
  url: 'ada.example',
  street: '1 Engine St',
  city: 'London',
  zip: 'SW1',
  country: 'UK',
}

const look: QrLook = {
  body: 'square',
  eye: 'frame0',
  ball: 'ball0',
  dark: '#10201f',
  light: '#ffffff',
  transparent: false,
  gradient: 'none',
  gradientTo: '#1f8a7b',
  gradientOnEyes: true,
  customEyes: false,
  eyeFrameColors: ['#10201f', '#10201f', '#10201f'],
  eyeBallColors: ['#10201f', '#10201f', '#10201f'],
  margin: 2,
  ecLevel: 'M',
}

describe('qr payloads', () => {
  it('builds a vCard and a shorter MeCard from the same contact', () => {
    const card = vcardPayload(contact)
    expect(card.startsWith('BEGIN:VCARD')).toBe(true)
    expect(card).toContain('FN:Ada Lovelace')
    expect(card).toContain('URL:https://ada.example')
    const mecard = mecardPayload(contact)
    expect(mecard.startsWith('MECARD:N:Lovelace,Ada;')).toBe(true)
    expect(mecard).toContain('TEL:+44 1;')
  })

  it('prefers coordinates for a place and falls back to a maps search', () => {
    expect(locationPayload({ query: 'Cafe', lat: '12.9', lng: '77.5' })).toBe('geo:12.9,77.5')
    expect(locationPayload({ query: 'Cakeloo Bengaluru', lat: '', lng: '' })).toBe(
      'https://maps.google.com/?q=Cakeloo%20Bengaluru',
    )
  })

  it('builds a calendar event and a bitcoin request', () => {
    const event = eventPayload({ title: 'Tasting', start: '2026-11-23T09:30', end: '', location: 'Kitchen' })
    expect(event).toContain('DTSTART:20261123T093000')
    expect(event).toContain('LOCATION:Kitchen')
    expect(event).not.toContain('DTEND')
    expect(bitcoinPayload({ address: 'bc1qxy', amount: '0.01', label: 'Tip' })).toBe(
      'bitcoin:bc1qxy?amount=0.01&label=Tip',
    )
  })

  it('turns a handle into a profile link', () => {
    expect(socialPayload('twitter', '@bitkit')).toBe('https://x.com/bitkit')
    expect(socialPayload('youtube', 'https://www.youtube.com/watch?v=abc')).toBe('https://www.youtube.com/watch?v=abc')
  })
})

describe('styled qr', () => {
  it('matches the matrix size and keeps a square body free of curves', () => {
    const text = 'https://bitkit.pages.dev'
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
    const svg = renderStyledQr(text, look)
    expect(svg).toContain(`viewBox="0 0 ${qr.modules.size + 4} ${qr.modules.size + 4}"`)
    expect(svg).toContain('<rect')
    const body = svg.slice(svg.indexOf('<path'), svg.indexOf('fill-rule'))
    expect(body).not.toContain('A')
  })

  it('draws dots as curves, drops the background when clear, and tints each eye', () => {
    const dots = renderStyledQr('https://bitkit.pages.dev', { ...look, body: 'dot', transparent: true })
    expect(dots).not.toContain('<rect')
    expect(dots).toContain('A')
    const eyes = renderStyledQr('https://bitkit.pages.dev', {
      ...look,
      customEyes: true,
      eyeFrameColors: ['#aa0000', '#00aa00', '#0000aa'],
      eyeBallColors: ['#ff00aa', '#00ffaa', '#aaff00'],
    })
    expect(eyes).toContain('#aa0000')
    expect(eyes).toContain('#aaff00')
  })

  it('adds a linear gradient and reports weak contrast', () => {
    const svg = renderStyledQr('https://bitkit.pages.dev', { ...look, gradient: 'linear' })
    expect(svg).toContain('<linearGradient')
    expect(svg).toContain('url(#qr-fill)')
    expect(contrastRatio('#ffffff', '#f4f4f4')).toBeLessThan(1.2)
    expect(contrastRatio('#10201f', '#ffffff')).toBeGreaterThan(10)
  })
})
