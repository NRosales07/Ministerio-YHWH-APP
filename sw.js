const CACHE_NAME = 'alabanzas-v137';
const DATA_CACHE_NAME = 'alabanzas-data-v36';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const criticos = [
        'index.html',
        'Tone.js',
        'Tone.js.map',
        'manifest.json',
        'icon-192.png',
        'icon-512.png',
        'canciones-adoracion.js',
        'canciones-jubilo.js',
        'piano-samples/A3.mp3',
        'piano-samples/A4.mp3',
        'piano-samples/Ab3.mp3',
        'piano-samples/Ab4.mp3',
        'piano-samples/B3.mp3',
        'piano-samples/B4.mp3',
        'piano-samples/Bb3.mp3',
        'piano-samples/Bb4.mp3',
        'piano-samples/C3.mp3',
        'piano-samples/C4.mp3',
        'piano-samples/C5.mp3',
        'piano-samples/D3.mp3',
        'piano-samples/D4.mp3',
        'piano-samples/Db3.mp3',
        'piano-samples/Db4.mp3',
        'piano-samples/E3.mp3',
        'piano-samples/E4.mp3',
        'piano-samples/Eb3.mp3',
        'piano-samples/Eb4.mp3',
        'piano-samples/F3.mp3',
        'piano-samples/F4.mp3',
        'piano-samples/G3.mp3',
        'piano-samples/G4.mp3',
        'piano-samples/Gb3.mp3',
        'piano-samples/Gb4.mp3',
        // La alabanza 0 queda disponible sin conexión como activador del piano.
        // Se conserva en Cloudinary, no en el repositorio de GitHub.
        'https://res.cloudinary.com/hie4so71/video/upload/0.m4a',
        'https://res.cloudinary.com/hie4so71/video/upload/0.mp3'
      ];

      const opcionales = [
        'Alabanzas_Acordes.pdf',
        'Alabanzas_Jub_Acordes.pdf',
        'Alabanzas_Jub_Letra.pdf',
        'Alabanzas_Letra.pdf',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'
      ];

      return cache.addAll(criticos).then(() => {
        opcionales.forEach(url => {
          cache.add(url).catch(() => {});
        });
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME && key !== DATA_CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isHtmlNav = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  const isAppCode = isSameOrigin && /\.(js|json)(\?.*)?$/.test(url.pathname);

  if (isHtmlNav || isAppCode) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (!response || !response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
          return response;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || (isHtmlNav ? caches.match('index.html') : undefined)))
    );
    return;
  }

  if (!isSameOrigin) {
    e.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(e.request);
        const networkFetch = fetch(e.request).then((response) => {
          if (response && response.ok) cache.put(e.request, response.clone());
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      }).catch(() => fetch(e.request))
    );
    return;
  }

  e.respondWith(
    caches.open(DATA_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request).then((response) => {
        if (response && response.ok) cache.put(e.request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    }).catch(() => caches.match(e.request))
  );
});
