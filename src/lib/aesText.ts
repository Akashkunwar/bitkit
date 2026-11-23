import { bytesToBase64, base64ToBytes } from './encode'

async function keyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Password-based AES-GCM. The result is salt, IV, and ciphertext, as Base64. */
export async function aesEncrypt(text: string, password: string): Promise<string> {
  if (!password) throw new Error('Enter a password.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await keyFromPassword(password, salt)
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)),
  )
  const packed = new Uint8Array(salt.length + iv.length + cipher.length)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(cipher, salt.length + iv.length)
  return bytesToBase64(packed)
}

export async function aesDecrypt(packed: string, password: string): Promise<string> {
  if (!password) throw new Error('Enter a password.')
  const bytes = base64ToBytes(packed)
  if (bytes.length < 29) throw new Error('That is not an AES message from this tool.')
  const salt = bytes.slice(0, 16)
  const iv = bytes.slice(16, 28)
  const cipher = bytes.slice(28)
  const key = await keyFromPassword(password, salt)
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('Wrong password, or the message was damaged.')
  }
}
