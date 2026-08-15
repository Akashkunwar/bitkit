export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const pad = clean.length % 4 === 0 ? clean : clean + '='.repeat(4 - (clean.length % 4))
  const bin = atob(pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

export function encodeTextBase64(text: string, urlSafe = false): string {
  const b64 = bytesToBase64(new TextEncoder().encode(text))
  return urlSafe ? b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') : b64
}

export function decodeTextBase64(input: string): string {
  return new TextDecoder().decode(base64ToBytes(input))
}

export function encodeUriComponentSafe(input: string): string {
  return encodeURIComponent(input)
}

export function decodeUriComponentSafe(input: string): string {
  return decodeURIComponent(input.replaceAll('+', ' '))
}

export type JwtView = {
  header: unknown
  payload: unknown
  parts: number
}

export function decodeJwt(token: string): JwtView {
  const parts = token.trim().split('.')
  if (parts.length < 2) throw new Error('A JWT has two or three dot-separated parts.')
  const header = JSON.parse(decodeTextBase64(parts[0])) as unknown
  const payload = JSON.parse(decodeTextBase64(parts[1])) as unknown
  return { header, payload, parts: parts.length }
}

export async function digestHex(data: BufferSource, algo: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'): Promise<string> {
  const buf = await crypto.subtle.digest(algo, data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
