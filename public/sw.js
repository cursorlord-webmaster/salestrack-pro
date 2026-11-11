// SalesTrack Pro — Offline shell cache. Data lives in IndexedDB, NOT here.
const CACHE = 'salestrack-shell-v1'
const SHELL = ['/pos', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Never cache Supabase, auth, or API — only app shell
  if (url.hostname.includes('supabase')) return
  if (url.pathname.startsWith('/api')) return
  if (e.request.method !== 'GET') return

  // Navigation to POS — network first, cache fallback when offline
  if (e.request.mode === 'navigate' && url.pathname.startsWith('/pos')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/pos'))
    )
    return
  }

  // Static assets — cache first, network fallback
  if (url.origin === self.location.origin && (url.pathname.startsWith('/_next/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js'))) {
    e.respondWith(
      caches.match(e.request).then((cached) =>
        cached || fetch(e.request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(e.request, copy))
          return res
        }).catch(() => cached)
      )
    )
  }
})