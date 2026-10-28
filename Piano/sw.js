const CACHE='yhwh-piano-v279';
const AUDIO_CACHE='yhwh-piano-audio-v2';
const FILES=['./','./index.html','./piano.css','./styles/base.css','./styles/layout.css','./styles/themes.css','./styles/components-1.css','./styles/components-2.css','./styles/components-3.css','./styles/components-4.css','./piano.js','./instrument-catalog.js','./assets/home-icons/adoracion.svg','./assets/home-icons/jubilo.svg','./assets/home-icons/piano.svg','./assets/home-icons/drumpad.svg','./assets/home-icons/crear.svg','./assets/home-icons/configuracion.svg','./assets/home-icons/sun.svg','./assets/home-icons/moon.svg','./assets/home-icons/admin.svg','./assets/home-icons/admin-unlocked.svg','./assets/instruments/grand-piano.jpg','./assets/instruments/upright-piano.jpg','./assets/instruments/bass.jpg','./assets/instruments/trumpet.jpg','./assets/instruments/saxophone.jpg','./assets/instruments/violin.jpg','./assets/instruments/strings.jpg','./assets/instruments/cello.jpg','./assets/instruments/guitar.jpg','./assets/instruments/organ.jpg','./assets/instruments/vibraphone.jpg','./assets/instruments/icons/bass.png','./assets/instruments/icons/guitar.png','./assets/instruments/icons/organ.png','./assets/instruments/icons/grand-piano-gray.png','./assets/instruments/icons/grand-piano-black.png','./assets/instruments/icons/upright-piano.png','./assets/instruments/icons/saxophone.png','./assets/instruments/icons/trumpet.png','./assets/instruments/icons/violin.png','./assets/instruments/icons/vibraphone.png','./tooltips.js','./instrument-maps.js','./manifest.json','./offline-audio.json','./iconos-piano-yhwh/web/icon-512.png','./iconos-piano-yhwh/web/apple-touch-icon.png','./iconos-piano-yhwh/web/favicon.ico','./iconos-piano-yhwh/web/favicon-32.png','./iconos-piano-yhwh/web/favicon-16.png','./iconos-piano-yhwh/web/icon-192.png','./iconos-piano-yhwh/web/icon-maskable-192.png','./iconos-piano-yhwh/web/icon-maskable-512.png','./audio/040.wav','./audio/041.wav','./audio/042.wav','./audio/043.wav','./audio/044.wav','./audio/045.wav','./audio/046.wav','./audio/047.wav','./audio/048.wav','./audio/049.wav','./audio/050.wav','./audio/051.wav','./audio/052.wav','./audio/053.wav','./audio/054.wav','./audio/055.wav','./audio/056.wav','../canciones-adoracion.js','../canciones-jubilo.js','./audio/drum-pad/drum_heavy_kick.flac','./audio/drum-pad/drum_snare_hard.flac','./audio/drum-pad/drum_snare_soft.flac','./audio/drum-pad/drum_cymbal_closed.flac','./audio/drum-pad/drum_cymbal_open.flac','./audio/drum-pad/drum_cymbal_soft.flac','./audio/drum-pad/drum_splash_hard.flac','./audio/drum-pad/drum_tom_mid_hard.flac','./audio/drum-pad/LICENSE_SAMPLES.txt'];
let audioDownloadInProgress=false;
async function withAudioCache(operation){
  let cache=await caches.open(AUDIO_CACHE);
  try{return await operation(cache);}
  catch(error){
    if(error?.name!=='NotFoundError')throw error;
    // DevTools puede borrar el almacenamiento mientras una descarga está activa.
    // Reabrir la caché obtiene una referencia nueva y permite reanudarla.
    cache=await caches.open(AUDIO_CACHE);
    return operation(cache);
  }
}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('yhwh-piano-')&&key!==CACHE&&key!==AUDIO_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
  if(event.data?.type==='GET_AUDIO_CACHE_STATUS'){
    event.waitUntil((async()=>{try{const cache=await caches.open(AUDIO_CACHE),manifestUrl=new URL('./offline-audio.json',self.registration.scope),response=await fetch(manifestUrl,{cache:'no-cache'}).catch(()=>caches.match(manifestUrl)),files=response?.ok?await response.json():[],cached=await Promise.all(files.map(url=>cache.match(url)));event.source?.postMessage({type:'AUDIO_CACHE_STATUS',cached:cached.filter(Boolean).length,total:files.length});}catch(error){console.warn('No se pudo leer el estado de los sonidos guardados:',error);}})());
    return;
  }
  if(event.data?.type!=='CACHE_ALL_AUDIO')return;
  event.waitUntil((async()=>{
    const report=async(type,extra={})=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});windows.forEach(client=>client.postMessage({type,...extra}));};
    if(audioDownloadInProgress)return;
    audioDownloadInProgress=true;
    await report('AUDIO_CACHE_STARTED');
    let files=[],next=0,done=0,failed=0;
    try{
      const response=await fetch('./offline-audio.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('No se pudo obtener la lista de sonidos.');
      files=await response.json();
      const worker=async()=>{
        while(next<files.length){
          const url=files[next++];
          try{
            const cached=await withAudioCache(cache=>cache.match(url));
            if(!cached){const audio=await fetch(url,{cache:'reload'});if(!audio.ok)throw new Error(`HTTP ${audio.status}`);await withAudioCache(cache=>cache.put(url,audio.clone()));}
          }catch(error){failed++;console.warn('No se pudo guardar audio para uso sin conexión:',url,error);}
          done++;
          if(done%4===0||done===files.length){const cachedUrls=new Set((await withAudioCache(cache=>cache.keys())).map(request=>request.url)),cached=files.reduce((count,url)=>count+(cachedUrls.has(new URL(url,self.registration.scope).href)?1:0),0);await report('AUDIO_CACHE_PROGRESS',{done,total:files.length,cached});}
        }
      };
      await Promise.all(Array.from({length:4},worker));
      await report(failed?'AUDIO_CACHE_ERROR':'AUDIO_CACHE_DONE',{done:done-failed,total:files.length,failed});
    }catch(error){console.error('Falló la descarga de audio para uso sin conexión:',error);await report('AUDIO_CACHE_ERROR',{done:Math.max(0,done-failed),total:files.length,failed:Math.max(1,failed)});}
    finally{audioDownloadInProgress=false;}
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==location.origin)return;
  const audioPath=new URL('./audio/',self.registration.scope).pathname;
  if(url.pathname.startsWith(audioPath)){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      if(cached)return cached;
      const response=await fetch(request);
      if(response.ok){const cache=await caches.open(AUDIO_CACHE);await cache.put(request,response.clone());}
      return response;
    })());
    return;
  }
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok){const cachedResponse=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,cachedResponse)));}
      return response;
    }catch(_){return (await caches.match(request))||(await caches.match('./index.html'));}
  })());
});
