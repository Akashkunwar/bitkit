const KEY = 'bitkit-cdn-engines'

/** OCR and cutout fetch WASM/models from a CDN on first use. Consent is local. */
export function hasEngineConsent(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function grantEngineConsent(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* private mode — consent lasts this session only */
  }
}
