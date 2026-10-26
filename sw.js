// Offline-Skript der Tanzschritte-App.
// Wichtig: Alle Apps unter <name>.github.io teilen sich Speicher und Caches.
// Deshalb nutzt dieses Skript nur Caches mit dem Präfix "tanzschritte-" und löscht nie fremde Caches.
const PREFIX = 'tanzschritte-';
const CACHE = PREFIX + 'v3';
const INBOX = PREFIX + 'share';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const BASE = new URL('./', self.location).pathname;   // z. B. /SalsaundBachata/

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => (k.startsWith(PREFIX) && k !== CACHE && k !== INBOX) || k === 'share-inbox' || k === 'tanzschritte-v1' || k === 'tanzschritte-v2')
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Nur Anfragen im eigenen Ordner bearbeiten – andere Apps auf derselben Domain bleiben unberührt
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;

  // Video aus WhatsApp & Co. geteilt (Android): zwischenspeichern und Zuordnung öffnen
  if (req.method === 'POST' && url.pathname === BASE + 'share') {
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

  if (req.method !== 'GET') return;
  // Erst Netz (aktuellste Version), ohne Internet aus dem Speicher
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true, cacheName: CACHE })
        .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html', { cacheName: CACHE }) : Response.error())))
  );
});
