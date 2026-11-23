const input = document.querySelector('#origin')
const status = document.querySelector('#status')

chrome.storage.sync.get('origin', (stored) => {
  if (typeof stored.origin === 'string') input.value = stored.origin
})

document.querySelector('#save').addEventListener('click', () => {
  let origin = input.value.trim().replace(/\/$/, '')
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Use http or https.')
    origin = url.origin
  } catch {
    status.textContent = 'Enter a full address, including https://.'
    return
  }
  chrome.runtime.sendMessage({ type: 'set-origin', origin }, (response) => {
    status.textContent = response?.ok
      ? `Saved. Right-click a selection or image, then choose Send to BitKit.`
      : response?.error || 'Could not save.'
  })
})
