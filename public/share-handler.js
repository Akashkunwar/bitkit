self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return
  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData()
        const files = formData.getAll('media').filter((item) => item instanceof File)
        const cache = await caches.open('kit-share')
        const stored = new FormData()
        files.forEach((file, index) => stored.append(`f${index}`, file))
        await cache.put('files', new Response(stored))
        const text = String(formData.get('text') || formData.get('url') || formData.get('title') || '')
        if (text) await cache.put('text', new Response(text))
        else await cache.delete('text')
      } catch {
        /* ignore and still open the app */
      }
      return Response.redirect('/share', 303)
    })(),
  )
})
