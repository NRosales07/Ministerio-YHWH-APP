const CACHE_NAME = 'alabanzas-v141';
const DATA_CACHE_NAME = 'alabanzas-data-v41';

self.addEventListener('install', (e) => {
  // Versión de rescate: no precachear ni interceptar recursos. En las apps
  // instaladas la caché antigua dejó de actualizar lista y botones; mientras
  // se corrige el modo offline, esta PWA debe comportarse como la web normal.
  e.waitUntil(Promise.resolve());
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(key => key !== CACHE_NAME && key !== DATA_CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// Sin manejador fetch: todos los recursos se solicitan a la red igual que
// al abrir la URL en Safari/Chrome. Así evitamos entregar una versión vieja.
