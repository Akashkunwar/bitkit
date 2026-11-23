import { describe, expect, it } from 'vitest'
import { aesDecrypt, aesEncrypt } from '../lib/aesText'
import { colorShades, mixColors } from '../lib/colorMix'
import { formatJs, minifyCss, minifyJs } from '../lib/codeFormat'
import { decodeEntities, encodeEntities } from '../lib/entities'
import { md5Hex } from '../lib/md5'
import { sha224Hex } from '../lib/sha224'
import { jsonToXml } from '../lib/xml'

describe('codecs added to the existing tools', () => {
  it('matches published MD5 and SHA-224 vectors', () => {
    expect(md5Hex('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5Hex('abc')).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(sha224Hex('abc')).toBe('23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7')
  })

  it('round-trips HTML entities, AES text, and a JSON document', async () => {
    expect(decodeEntities(encodeEntities(`a < b & "c"`))).toBe(`a < b & "c"`)
    const secret = await aesEncrypt('local only', 'correct horse')
    expect(await aesDecrypt(secret, 'correct horse')).toBe('local only')
    expect(jsonToXml({ kit: true })).toContain('<kit>true</kit>')
  })

  it('formats JavaScript, minifies it, and builds a shade ramp', () => {
    expect(formatJs('const a={b:1};')).toContain('\n')
    expect(minifyJs('const a = 1; // note')).toBe('const a=1;')
    expect(minifyCss('a { color: red; }')).toBe('a{color:red}')
    const ramp = colorShades('#888888', 5)
    expect(ramp).toHaveLength(5)
    expect(ramp[2]?.toLowerCase()).toBe('#888888')
    expect(mixColors('#000000', '#ffffff', 3)).toEqual(['#000000', '#808080', '#ffffff'])
  })
})
