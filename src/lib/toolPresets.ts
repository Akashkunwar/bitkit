import type { Preset } from './actions'

export type ShrinkPresetState = { limit?: string }

export function shrinkStateFromPreset(preset: Preset): ShrinkPresetState {
  if (typeof preset.limit === 'string') return { limit: preset.limit }
  return {}
}

export type PasswordPresetState = {
  mode?: 'password' | 'token' | 'pin'
  length?: number
  tokenFormat?: 'hex' | 'base64url' | 'uuid'
}

export function passwordStateFromPreset(preset: Preset): PasswordPresetState {
  const next: PasswordPresetState = {}
  if (preset.mode === 'password' || preset.mode === 'token' || preset.mode === 'pin') next.mode = preset.mode
  if (typeof preset.length === 'number') next.length = preset.length
  if (preset.tokenFormat === 'hex' || preset.tokenFormat === 'base64url' || preset.tokenFormat === 'uuid') {
    next.tokenFormat = preset.tokenFormat
    next.mode = 'token'
  }
  return next
}
