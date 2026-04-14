const CACHE_NAME = 'nuroni-v2'
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

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Nuroni'
  const options = {
    body: data.body || "Time to log your steps!",
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'nuroni-reminder',
    renotify: true,
    data: { url: data.url || '/progress' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Tap notification → open app
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

// Scheduled reminder via setTimeout loop
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_REMINDER') {
    const { hour, minute } = event.data
    scheduleDaily(hour, minute)
  }
  if (event.data?.type === 'CANCEL_REMINDER') {
    if (self._reminderTimeout) clearTimeout(self._reminderTimeout)
  }
})

function scheduleDaily(hour, minute) {
  if (self._reminderTimeout) clearTimeout(self._reminderTimeout)

  const now = new Date()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)

  const delay = next.getTime() - now.getTime()

  self._reminderTimeout = setTimeout(() => {
    self.registration.showNotification('Nuroni — Log your steps! 🏃', {
      body: "Don't forget to log your steps and weight today.",
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'nuroni-reminder',
      renotify: true,
      data: { url: '/progress' },
    })
    // Schedule again for tomorrow
    scheduleDaily(hour, minute)
  }, delay)
}
