const SCRIPT_ID = 'bitkit-bridge'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-selection',
    title: 'Send selection to BitKit',
    contexts: ['selection'],
  })
  chrome.contextMenus.create({
    id: 'send-image',
    title: 'Send image to BitKit',
    contexts: ['image'],
  })
})

async function originOrOptions() {
  const stored = await chrome.storage.sync.get('origin')
  const origin = typeof stored.origin === 'string' ? stored.origin.replace(/\/$/, '') : ''
  if (!origin) {
    await chrome.runtime.openOptionsPage()
    return ''
  }
  return origin
}

async function registerBridge(origin) {
  await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] }).catch(() => {})
  await chrome.scripting.registerContentScripts([
    {
      id: SCRIPT_ID,
      matches: [`${origin}/*`],
      js: ['content.js'],
      persistAcrossSessions: true,
      runAt: 'document_idle',
    },
  ])
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'set-origin') return
  const origin = String(message.origin || '').replace(/\/$/, '')
  chrome.storage.sync
    .set({ origin })
    .then(() => registerBridge(origin))
    .then(() => sendResponse({ ok: true }))
    .catch((err) =>
      sendResponse({ ok: false, error: err instanceof Error ? err.message : 'Could not save that address.' }),
    )
  return true
})

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.readAsDataURL(blob)
  })
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  const origin = await originOrOptions()
  if (!origin) return
  /** @type {{ text?: string, dataUrl?: string, name?: string }} */
  const payload = {}
  if (info.menuItemId === 'send-selection') payload.text = info.selectionText || ''
  if (info.menuItemId === 'send-image' && info.srcUrl) {
    const response = await fetch(info.srcUrl)
    const blob = await response.blob()
    payload.dataUrl = await blobToDataUrl(blob)
    payload.name = 'image'
  }
  if (!payload.text && !payload.dataUrl) return
  await chrome.storage.session.set({ bitkitPayload: payload })
  const [existing] = await chrome.tabs.query({ url: `${origin}/*` })
  if (existing?.id) await chrome.tabs.update(existing.id, { active: true, url: `${origin}/share` })
  else await chrome.tabs.create({ url: `${origin}/share` })
})
