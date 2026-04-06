// SERVICE WORKER — Somar Rider PWA
const CACHE = 'somar-rider-v3.27';
const STATIC = ['./index.html', './manifest-delivery.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(STATIC.map(url => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('cloudinary.com')) return;
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached ||
      fetch(e.request).then(r => {
        if (r && r.status === 200) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        return r;
      }).catch(() => new Response('', { status: 503 }))
    )
  );
});

// ─── Push notifications (pedidos, mensajes) ──────────────────
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  // No mostrar push si es la notificación de turno (es sticky, no push)
  if(data.tag === 'turno-activo') return;
  e.waitUntil(self.registration.showNotification(data.title || 'Somar Express', {
    body:    data.body    || 'Tienes un nuevo pedido',
    icon:    'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    badge:   'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    vibrate: [200, 100, 200, 100, 200],
    tag:     data.tag     || 'somar-rider',
    requireInteraction: data.requireInteraction || false,
  }));
});

// ─── Click en notificaciones ─────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  // Si es la notificación de turno — solo llevar al foreground, no cerrar turno
  if(e.notification.tag === 'turno-activo') {
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
        const c = cs.find(x => x.url.includes('index.html') || x.url.endsWith('/Riders_Somar/'));
        if(c) return c.focus();
        return clients.openWindow('./index.html');
      })
    );
    return;
  }
  // Otras notificaciones
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      const c = cs.find(x => x.url.includes('index.html'));
      if(c) return c.focus();
      return clients.openWindow('./index.html');
    })
  );
});

self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});
