const CACHE = 'kebiao-v3';
const CORE = ['./', 'index.html', 'styles.css', 'app.js', 'seed.js', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !urlSameOrigin(req.url)) return;
  e.respondWith(
    fetch(req)
      .then((res) => { put(req, res); return res; })
      .catch(() => cached(req) || (req.mode === 'navigate' ? fallback() : Response.error()))
  );
});

function urlSameOrigin(u) { try { return new URL(u).origin === self.location.origin; } catch { return false; } }
function cached(req) { return caches.match(req, { ignoreSearch: true }); }
function fallback() { return caches.match('index.html'); }
function put(req, res) {
  if (!res || res.status !== 200) return;
  caches.open(CACHE).then((c) => c.put(req, res.clone()));
}
