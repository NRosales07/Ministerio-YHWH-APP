const CACHE_NAME = 'alabanzas-v140';
const DATA_CACHE_NAME = 'alabanzas-data-v37';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const recursos = [
        'index.html',
        'Tone.js',
        'Tone.js.map',
        'manifest.json',
        'icon-192.png',
        'icon-512.png',
        'canciones-adoracion.js',
        'canciones-jubilo.js',

        // Archivos opcionales (PDFs, audio de Cloudinary, Firebase CDN).
        'Alabanzas_Acordes.pdf',
        'Alabanzas_Jub_Acordes.pdf',
        'Alabanzas_Jub_Letra.pdf',
        'Alabanzas_Letra.pdf',

        // La alabanza 0 queda disponible sin conexión como activador del piano.
        // Se conserva en Cloudinary, no en el repositorio de GitHub.
        'https://res.cloudinary.com/hie4so71/video/upload/0.m4a',
        'https://res.cloudinary.com/hie4so71/video/upload/0.mp3',

        'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js',
        'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js'
      ];

      // IMPORTANTE: cada recurso se cachea individualmente (cache.add + catch)
      // en vez de un solo cache.addAll(). Con addAll, si UN solo recurso
      // fallaba (ej. el audio de Cloudinary por CORS o un hipo de red), TODA
      // la instalación del Service Worker se rechazaba y el SW nuevo nunca
      // se activaba. Eso dejaba el iPhone atascado sirviendo el caché viejo
      // aunque ya hubieras subido código nuevo. Ahora un fallo puntual solo
      // afecta a ese recurso; el SW nuevo sí se instala y toma control.
      return Promise.all(
        recursos.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] No se pudo cachear en la instalación:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME && key !== DATA_CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
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