import { describe, expect, it } from 'vitest'
import { bytesToHex, desBlock, desDecrypt, desEncrypt, hexToBytes } from '../lib/des'
import { parseHar, sanitizeHar } from '../lib/har'
import { ripemd160Hex } from '../lib/ripemd'
import { certificateText, codeScore, nextWord } from '../lib/codetype'

describe('HAR', () => {
  const fixture = JSON.stringify({
    log: {
      entries: [
        {
          time: 12,
          request: {
            method: 'GET',
            url: 'https://example.com/a?token=secret',
            headers: [{ name: 'Cookie', value: 'session=abc' }],
            queryString: [{ name: 'token', value: 'secret' }],
          },
          response: { status: 200, headers: [{ name: 'Set-Cookie', value: 'id=1' }] },
        },
      ],
    },
  })

  it('lists one request', () => {
    expect(parseHar(fixture)).toEqual([
      { url: 'https://example.com/a?token=secret', method: 'GET', status: 200, timeMs: 12 },
    ])
  })

  it('blanks cookies and the token but keeps the address', () => {
    const clean = sanitizeHar(fixture)
    expect(clean).not.toContain('session=abc')
    expect(clean).not.toContain('id=1')
    expect(clean).toContain('example.com')
    expect(clean).not.toContain('secret')
  })
})

describe('DES', () => {
  it('matches the FIPS one-block vector', () => {
    const out = desBlock(hexToBytes('0123456789ABCDEF'), hexToBytes('133457799BBCDFF1'))
    expect(bytesToHex(out)).toBe('85e813540f0ab405')
  })

  it('round-trips a short message', () => {
    const sealed = desEncrypt('hello', 'password')
    expect(desDecrypt(sealed, 'password')).toBe('hello')
    expect(() => desEncrypt('hello', 'password-extra')).toThrow(/8 bytes/)
  })
})

describe('RIPEMD-160', () => {
  it('matches the empty string and abc', () => {
    expect(ripemd160Hex('')).toBe('9c1185a5c5e9fc54612808977ee8f548b2258d31')
    expect(ripemd160Hex('abc')).toBe('8eb208f7e05d987a9b044a8e98c6b087f15a0bfc')
  })
})

describe('code typing helpers', () => {
  it('scores a prefix, wraps words, and names the certificate', () => {
    expect(codeScore('const', 'con')).toBe(3)
    expect(nextWord(['a', 'b'], 1)).toEqual({ word: 'b', index: 0 })
    expect(certificateText({ name: 'Asha', wpm: 40, accuracy: 98 })).toContain('Asha')
    expect(certificateText({ name: 'Asha', wpm: 40, accuracy: 98 })).toContain('40')
  })
})
