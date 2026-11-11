// Lock In — service worker : l'appli s'ouvre même sans connexion.
// Stratégie « réseau d'abord » : la version en ligne est toujours prise si possible
// (les mises à jour arrivent tout de suite), sinon on sert la copie gardée en cache.
const CACHE = 'lockin-v20';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './ciqual.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('lockin-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Seulement les fichiers de l'appli : les recherches Open Food Facts passent directement par internet
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
        .then(hit => hit || new Response('Hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
  );
});
