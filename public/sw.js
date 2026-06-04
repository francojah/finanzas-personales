// Service Worker — Finanzas Personales
const CACHE_NAME = 'finanzas-v1'

// Recursos estáticos a pre-cachear
const STATIC_ASSETS = [
  '/',
  '/transactions',
  '/transactions/new',
  '/investments',
  '/manifest.json',
]

// ── Install: pre-cache assets ──────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// ── Activate: limpiar caches viejas ───────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first para API, cache-first para assets ──
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requests de Supabase y APIs externas (siempre network)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('bluelytics') ||
    url.hostname.includes('finance.yahoo') ||
    url.hostname.includes('coingecko') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  // Para navegación: network-first con fallback a cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Para assets estáticos: cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()))
            return res
          })
      )
    )
  }
})
