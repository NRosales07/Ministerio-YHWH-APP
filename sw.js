const CACHE_NAME = 'alabanzas-v142';
const DATA_CACHE_NAME = 'alabanzas-data-v42';
const AUDIO_CACHE_NAME = 'alabanzas-audio-v1';

const APP_SHELL = [
  'index.html',
  'manifest.json',
  'Tone.js',
  'icon-192.png',
  'icon-512.png'
];
const APP_DATA = ['canciones-adoracion.js', 'canciones-jubilo.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL.map((path) => new URL(path, self.registration.scope).href))),
      caches.open(DATA_CACHE_NAME).then((cache) => cache.addAll(APP_DATA.map((path) => new URL(path, self.registration.scope).href)))
    ])
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('alabanzas-') &&
        key !== CACHE_NAME && key !== DATA_CACHE_NAME && key !== AUDIO_CACHE_NAME)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function guardarRespuesta(cacheName, request, response) {
  if (!response || !response.ok) return Promise.resolve(response);
  return caches.open(cacheName).then((cache) => {
    return cache.put(request, response.clone()).then(() => response).catch(() => response);
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => guardarRespuesta(CACHE_NAME, request, response))
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) ||
            (await cache.match(new URL('index.html', self.registration.scope).href));
        })
    );
    return;
  }

  const path = url.pathname.toLowerCase();
  const isAppData = /\/(canciones-adoracion|canciones-jubilo)\.js$/.test(path);
  const cacheName = isAppData ? DATA_CACHE_NAME : CACHE_NAME;

  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        return await guardarRespuesta(cacheName, request, response);
      } catch (error) {
        return new Response('', { status: 503, statusText: 'Offline' });
      }
    })
  );
});
