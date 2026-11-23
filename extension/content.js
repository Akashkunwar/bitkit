chrome.storage.session.get('bitkitPayload', (stored) => {
  const payload = stored.bitkitPayload
  if (!payload) return
  chrome.storage.session.remove('bitkitPayload')
  window.postMessage({ source: 'bitkit-extension', ...payload }, location.origin)
})
