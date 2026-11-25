const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** RFC 4648 Base32, ignoring spaces and padding. */
export function decodeBase32(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '')
  if (!clean) throw new Error('Paste the secret from the authenticator setup.')
  if ([...clean].some((char) => !ALPHABET.includes(char))) {
    throw new Error('That secret is not Base32. Use the letters and digits from the setup screen.')
  }
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 0xff)
    }
  }
  if (out.length < 8) throw new Error('That secret is too short to be a one-time password key.')
  return Uint8Array.from(out)
}

export function totpSecondsLeft(timeMs = Date.now(), step = 30): number {
  const elapsed = Math.floor(timeMs / 1000) % step
  return step - elapsed
}

/** RFC 6238, HMAC-SHA1, 6 digits, 30 second step. */
export async function totpCode(secret: Uint8Array, timeMs = Date.now(), step = 30, digits = 6): Promise<string> {
  const counter = Math.floor(timeMs / 1000 / step)
  const bytes = new ArrayBuffer(8)
  const view = new DataView(bytes)
  view.setUint32(0, Math.floor(counter / 2 ** 32))
  view.setUint32(4, counter >>> 0)
  const raw = new Uint8Array(secret.byteLength)
  raw.set(secret)
  const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  // A copied view, not the raw ArrayBuffer. Node 20's WebCrypto rejects a
  // cross-realm ArrayBuffer (jsdom in CI) even though a Uint8Array is fine.
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new Uint8Array(bytes)))
  const offset = mac[mac.length - 1] & 0x0f
  const binary =
    (((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]) >>> 0
  const code = binary % 10 ** digits
  return String(code).padStart(digits, '0')
}
