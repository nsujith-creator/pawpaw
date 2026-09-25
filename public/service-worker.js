// Shell v2: the picture-book offline page.
const SHELL_CACHE = 'pawpaw-safe-shell'
const PRELOAD = ['/offline.html', '/icons/pawpaw-192.png', '/icons/pawpaw-512.png', '/icons/pawpaw-maskable-512.png']

function isSafeStaticAsset(url) {
  return url.pathname === '/offline.html' || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/_next/static/')
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(PRELOAD)))
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')))
    return
  }

  if (!isSafeStaticAsset(url)) return
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) void caches.open(SHELL_CACHE).then(cache => cache.put(request, response.clone()))
    return response
  })))
})
