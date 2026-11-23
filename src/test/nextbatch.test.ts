import { describe, expect, it } from 'vitest'
import { AIM_YAW, cmPer360, convertSensitivity, edpi } from '../lib/aim'
import { signJwt, verifyJwt } from '../lib/jwtSign'
import { seatNames, wordBingo } from '../lib/party'
import { linkNotes, parseWifiPayload, wifiPayload } from '../lib/qr'
import { randomIpv4, randomObject } from '../lib/sample'
import { blobSvg, patternSvg } from '../lib/shapes'

describe('aim', () => {
  it('matches a known CS2 full turn and converts into Valorant', () => {
    expect(edpi(800, 1)).toBe(800)
    expect(cmPer360(800, 1, AIM_YAW.cs2)).toBeCloseTo(51.95, 1)
    expect(convertSensitivity(1, AIM_YAW.cs2, AIM_YAW.valorant)).toBeCloseTo(0.314, 2)
  })
})

describe('sample data', () => {
  it('repeats the same object and a four-part address for a seed', () => {
    expect(randomObject(4)).toEqual(randomObject(4))
    expect(randomIpv4(4).split('.')).toHaveLength(4)
    expect(randomIpv4(4)).toBe(randomIpv4(4))
  })
})

describe('svg shapes', () => {
  it('returns svg markup', () => {
    expect(blobSvg(2)).toContain('<svg')
    expect(patternSvg('dots', '#112233')).toContain('#112233')
    expect(() => patternSvg('grid', 'red')).toThrow(/hex/)
  })
})

describe('jwt sign', () => {
  it('accepts the secret that signed the token', async () => {
    const token = await signJwt({ sub: 'kit' }, 'local-secret')
    expect((await verifyJwt(token, 'local-secret')).ok).toBe(true)
    expect((await verifyJwt(token, 'other')).ok).toBe(false)
  })
})

describe('qr reading', () => {
  it('reads a Wi-Fi payload and notes a raw-IP link', () => {
    const raw = wifiPayload({ ssid: 'Cafe', password: 'secret', encryption: 'WPA', hidden: false })
    expect(parseWifiPayload(raw)).toMatchObject({ ssid: 'Cafe', password: 'secret', encryption: 'WPA' })
    expect(linkNotes('http://10.0.0.1/login')).toEqual(
      expect.arrayContaining(['The link is plain HTTP.', 'The host is a raw IP address.']),
    )
  })
})

describe('more party sheets', () => {
  it('seats people and fills a word card', () => {
    const tables = seatNames(['A', 'B', 'C', 'D', 'E'], 2, 3)
    expect(tables.flat()).toHaveLength(5)
    const words = Array.from({ length: 24 }, (_, i) => `word${i}`)
    const card = wordBingo(words, 1)
    expect(card[2][2]).toBeNull()
    expect(card.flat().filter(Boolean)).toHaveLength(24)
  })
})
