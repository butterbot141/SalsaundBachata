// Offline-Skript der Tanzschritte-App. Neue index.html wird beim Öffnen mit Internet geladen.
const CACHE = 'tanzschritte-v2';
const INBOX = 'share-inbox';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== INBOX).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Video aus WhatsApp & Co. geteilt (Android): zwischenspeichern und Zuordnung öffnen
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      try {
        const form = await req.formData();
        const file = form.get('video');
        if (file) {
          const inbox = await caches.open(INBOX);
          await inbox.put('./shared-video', new Response(file, {
            headers: { 'content-type': file.type || 'video/mp4', 'x-name': encodeURIComponent(file.name || 'video.mp4') }
          }));
        }
      } catch (err) { /* nichts zu tun */ }
      return Response.redirect('./#/share', 303);
    })());
    return;
  }

  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Erst Netz (aktuellste Version), ohne Internet aus dem Speicher
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
