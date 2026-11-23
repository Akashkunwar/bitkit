/**
 * IPv4 subnet arithmetic. /31 follows RFC 3021 (two usable addresses, no
 * broadcast reserved) and /32 is a single host.
 */

export type Subnet = {
  input: string
  address: string
  prefix: number
  netmask: string
  wildcard: string
  network: string
  broadcast: string
  first: string
  last: string
  /** Usable hosts. /31 reports 2, /32 reports 1. */
  hosts: number
  total: number
}

function octet(n: number): string {
  return [24, 16, 8, 0].map((shift) => String((n >>> shift) & 255)).join('.')
}

function parseIpv4(text: string): number | null {
  const parts = text.trim().split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    value = (value << 8) | n
  }
  return value >>> 0
}

export function parseSubnet(input: string): Subnet {
  const raw = input.trim()
  const [addrText, prefixText] = raw.split('/')
  const address = parseIpv4(addrText ?? '')
  const prefix = Number(prefixText)
  if (address == null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('Use an IPv4 address and a prefix, like 192.168.1.10/24.')
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const network = (address & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const total = 2 ** (32 - prefix)
  let first = network
  let last = broadcast
  let hosts = total
  if (prefix <= 30) {
    first = (network + 1) >>> 0
    last = (broadcast - 1) >>> 0
    hosts = total - 2
  }
  return {
    input: raw,
    address: octet(address),
    prefix,
    netmask: octet(mask),
    wildcard: octet(~mask >>> 0),
    network: octet(network),
    broadcast: octet(broadcast),
    first: octet(first),
    last: octet(last),
    hosts,
    total,
  }
}
