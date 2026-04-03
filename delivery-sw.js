const CACHE = 'somar-delivery-v1.0.2';
const STATIC = ['./delivery-app.html', './manifest-delivery.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(()=>{})).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) { e.respondWith(fetch(e.request).catch(()=>new Response('',{status:503}))); return; }
  e.respondWith(fetch(e.request).then(r=>{
    if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));}
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||new Response('',{status:503}))));
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const options = {
    body:    data.body    || 'Tienes un nuevo pedido',
    icon:    'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    badge:   'https://res.cloudinary.com/drkaxsziu/image/upload/v1767871213/Somar_Express_2048_x_2048_px_18_x_18_in__20250623_221102_0000_o0bv7a.png',
    vibrate: [200, 100, 200, 100, 200],
    tag:     data.tag     || 'somar-delivery',
    data:    data.data    || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };
  e.waitUntil(self.registration.showNotification(data.title || 'Somar Express', options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(cs=>{
    const c = cs.find(x=>x.url.includes('delivery-app'));
    if(c) return c.focus();
    return clients.openWindow('./delivery-app.html');
  }));
});

self.addEventListener('message', e => {
  if(e.data==='SKIP_WAITING') self.skipWaiting();
});
