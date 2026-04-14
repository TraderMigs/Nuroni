const CACHE_NAME = 'nuroni-v3'
const STATIC_ASSETS = ['/', '/login', '/signup']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) return
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

// Handle incoming push notifications from server
self.addEventListener('push', (event) => {
  let data = { title: 'Nuroni', body: "Time to log your steps!", url: '/progress' }
  try { if (event.data) data = { ...data, ...event.data.json() } } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'nuroni-reminder',
      renotify: true,
      data: { url: data.url },
    })
  )
})

// Tap notification → open app to /progress
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/progress'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
