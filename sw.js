// ============================================================
//  Service Worker - Alabanzas (uso sin conexión)
//  Cada vez que cambies canciones o archivos, sube el número
//  de versión correspondiente y cambia también sw.js?v=NNN en
//  index.html.
// ============================================================
const CACHE_NAME = 'alabanzas-v143';        // index, Tone.js, íconos, PDFs, imágenes
const DATA_CACHE_NAME = 'alabanzas-data-v43'; // canciones, Firebase, fuentes
const AUDIO_CACHE_NAME = 'alabanzas-audio-v1'; // solo el audio de la primera alabanza

// ---- Audio que se guarda para uso sin conexión --------------------------
// Solo la primera alabanza (la que el piano usa para "despertar" el audio
// en iPhone). Pon aquí el ID TAL COMO ESTÁ EN CLOUDINARY (ej. '0' o '110_1').
// El resto de audios se reproducen por streaming y NO se guardan.
const CLOUDINARY_BASE = 'https://res.cloudinary.com/hie4so71/video/upload/';
const AUDIO_OFFLINE_IDS = ['0'];
const AUDIO_OFFLINE_URLS = AUDIO_OFFLINE_IDS.flatMap((id) =>
  ['m4a', 'mp3'].map((ext) => CLOUDINARY_BASE + id + '.' + ext)
);

// ---- Archivos críticos: si alguno falla, la instalación falla ----------
const APP_SHELL = [
  'index.html',
  'manifest.json',
  'Tone.js',
  'icon-192.png',
  'icon-512.png'
];
const APP_DATA = ['canciones-adoracion.js', 'canciones-jubilo.js'];

// ---- Opcionales: se intentan bajar, pero si fallan no pasa nada --------
const APP_OPTIONAL = [
  'Alabanzas_Acordes.pdf',
  'Alabanzas_Jub_Acordes.pdf',
  'Alabanzas_Jub_Letra.pdf',
  'Alabanzas_Letra.pdf',
  'Reglamento_Ministerio_YHWH.pdf'
];
const EXTERNAL_OPTIONAL = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Parisienne&display=swap'
];

const abs = (path) => new URL(path, self.registration.scope).href;

function agregarOpcionales(cache, urls) {
  return Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
}

// ============================ INSTALL ==================================
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const [shell, data, audio] = await Promise.all([
      caches.open(CACHE_NAME),
      caches.open(DATA_CACHE_NAME),
      caches.open(AUDIO_CACHE_NAME)
    ]);

    // Críticos (si fallan, se cancela la instalación y se reintenta luego)
    await Promise.all([
      shell.addAll(APP_SHELL.map(abs)),
      data.addAll(APP_DATA.map(abs))
    ]);

    // Opcionales (nunca rompen la instalación)
    await Promise.all([
      agregarOpcionales(shell, APP_OPTIONAL.map(abs)),
      agregarOpcionales(data, EXTERNAL_OPTIONAL),
      agregarOpcionales(audio, AUDIO_OFFLINE_URLS)
    ]);

    await self.skipWaiting();
  })());
});

// ============================ ACTIVATE =================================
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

// ============================ UTILIDADES ===============================
function puedeGuardarse(response) {
  // 206 (parcial) no se puede guardar; "opaque" (sin CORS) sí, ej. CSS de fuentes.
  return response && response.status !== 206 && (response.ok || response.type === 'opaque');
}

function guardar(cacheName, request, response) {
  if (!puedeGuardarse(response)) return;
  const copia = response.clone();
  caches.open(cacheName).then((c) => c.put(request, copia)).catch(() => {});
}

function redConTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      (r) => { clearTimeout(t); resolve(r); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

// Safari/iOS exige respuestas 206 para reproducir audio: si el navegador
// pide un rango y tenemos el archivo completo en caché, lo recortamos.
async function responderConRango(request, cached) {
  const rango = request.headers.get('range');
  if (!rango) return cached;
  const m = /bytes=(\d*)-(\d*)/.exec(rango);
  if (!m) return cached;

  const buf = await cached.arrayBuffer();
  const total = buf.byteLength;
  let start, end;
  if (m[1] === '' && m[2] !== '') {          // bytes=-N (últimos N bytes)
    start = Math.max(0, total - parseInt(m[2], 10));
    end = total - 1;
  } else {
    start = m[1] ? parseInt(m[1], 10) : 0;
    end = m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
  }
  if (start > end || start >= total) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
  }
  const trozo = buf.slice(start, end + 1);
  return new Response(trozo, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Length': String(trozo.byteLength),
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Accept-Ranges': 'bytes'
    }
  });
}

// ------------------------- ESTRATEGIAS ---------------------------------
// Red primero (con límite de espera) y caché como respaldo.
async function redPrimero(cacheName, request, ms) {
  const cache = await caches.open(cacheName);
  try {
    const response = await redConTimeout(request, ms);
    if (response.ok) {
      guardar(cacheName, request, response);
      return response;
    }
    return (await cache.match(request, { ignoreSearch: true })) || response;
  } catch (e) {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Caché primero; si no está, red y se guarda.
async function cachePrimero(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return responderConRango(request, cached);
  try {
    const response = await fetch(request);
    guardar(cacheName, request, response);
    return response;
  } catch (e) {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

// Responde de inmediato con lo guardado y actualiza en segundo plano.
async function cacheYActualizar(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const red = fetch(request).then((response) => {
    guardar(cacheName, request, response);
    return response;
  }).catch(() => null);
  if (cached) return cached;
  return (await red) || new Response('', { status: 503, statusText: 'Offline' });
}

// Audio de la primera alabanza: desde caché si existe; si no, red normal.
async function audioOffline(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cached = await cache.match(request.url);
  if (cached) return responderConRango(request, cached);
  try {
    return await fetch(request);
  } catch (e) {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

function esExternoPermitido(url) {
  return (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
         url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
}

// ============================ FETCH ====================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  // 1) Audio de la primera alabanza
  if (AUDIO_OFFLINE_URLS.includes(url.href)) {
    event.respondWith(audioOffline(request));
    return;
  }

  // 2) Recursos externos permitidos (Firebase y fuentes)
  if (url.origin !== scope.origin) {
    if (esExternoPermitido(url)) {
      event.respondWith(cacheYActualizar(DATA_CACHE_NAME, request));
    }
    return; // cualquier otro externo (Cloudinary, Gemini, etc.) pasa directo a la red
  }
  if (!url.pathname.startsWith(scope.pathname)) return;

  // 3) Navegación (abrir la app)
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const respuesta = await redPrimero(CACHE_NAME, request, 5000);
      if (respuesta && respuesta.status !== 503) return respuesta;
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(abs('index.html'))) || respuesta;
    })());
    return;
  }

  // 4) Canciones y manifest: red primero para recibir actualizaciones
  const path = url.pathname.toLowerCase();
  if (/\/(canciones-adoracion|canciones-jubilo)\.js$/.test(path)) {
    event.respondWith(redPrimero(DATA_CACHE_NAME, request, 4000));
    return;
  }
  if (path.endsWith('/manifest.json')) {
    event.respondWith(redPrimero(CACHE_NAME, request, 4000));
    return;
  }

  // 5) Todo lo demás (Tone.js, íconos, PDFs, imágenes): caché primero
  event.respondWith(cachePrimero(CACHE_NAME, request));
});