import { base64ToBytes, bytesToBase64, decodeJwt } from './encode'

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new Error('Enter a secret.')
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

/** HS256 token. The secret never leaves this call. */
export async function signJwt(payload: unknown, secret: string): Promise<string> {
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = base64Url(new TextEncoder().encode(JSON.stringify(payload)))
  const data = `${header}.${body}`
  const key = await hmacKey(secret)
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
  return `${data}.${base64Url(sig)}`
}

export async function verifyJwt(token: string, secret: string): Promise<{ ok: boolean; payload: unknown }> {
  const parts = token.trim().split('.')
  if (parts.length !== 3) throw new Error('A signed JWT has three parts.')
  const view = decodeJwt(token)
  const header = view.header
  if (!header || typeof header !== 'object' || (header as { alg?: string }).alg !== 'HS256') {
    throw new Error('Only HS256 tokens can be checked here.')
  }
  const key = await hmacKey(secret)
  const raw = base64ToBytes(parts[2])
  const signature = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
  const ok = await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
  return { ok, payload: view.payload }
}
