const CACHE='yhwh-piano-v89';
const AUDIO_CACHE='yhwh-piano-audio-v1';
const FILES=['./','./index.html','./piano.css','./piano-studio.css','./piano-synthesia.css','./piano.js','./manifest.json','./offline-audio.json','./icon.svg','./icon-512.png','./apple-touch-icon.png','./audio/040.wav','./audio/041.wav','./audio/042.wav','./audio/043.wav','./audio/044.wav','./audio/045.wav','./audio/046.wav','./audio/047.wav','./audio/048.wav','./audio/049.wav','./audio/050.wav','./audio/051.wav','./audio/052.wav','./audio/053.wav','./audio/054.wav','./audio/055.wav','./audio/056.wav','../canciones-adoracion.js','../canciones-jubilo.js'];
let audioDownloadInProgress=false;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('yhwh-piano-')&&key!==CACHE&&key!==AUDIO_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
  if(event.data?.type!=='CACHE_ALL_AUDIO')return;
  event.waitUntil((async()=>{
    const report=async(type,extra={})=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});windows.forEach(client=>client.postMessage({type,...extra}));};
    if(audioDownloadInProgress)return;
    audioDownloadInProgress=true;
    await report('AUDIO_CACHE_STARTED');
    try{
      const cache=await caches.open(AUDIO_CACHE);
      const response=await fetch('./offline-audio.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('No se pudo obtener la lista de sonidos.');
      const files=await response.json();
      let next=0,done=0,failed=0;
      const worker=async()=>{
        while(next<files.length){
          const url=files[next++];
          try{
            const cached=await cache.match(url);
            if(!cached){const audio=await fetch(url,{cache:'reload'});if(!audio.ok)throw new Error(`HTTP ${audio.status}`);await cache.put(url,audio);}
          }catch(error){failed++;console.warn('No se pudo guardar audio para uso sin conexión:',url,error);}
          done++;
          if(done%4===0||done===files.length)await report('AUDIO_CACHE_PROGRESS',{done,total:files.length});
        }
      };
      await Promise.all(Array.from({length:4},worker));
      await report(failed?'AUDIO_CACHE_ERROR':'AUDIO_CACHE_DONE',{done:done-failed,total:files.length,failed});
    }catch(error){console.error('Falló la descarga de audio para uso sin conexión:',error);await report('AUDIO_CACHE_ERROR',{done:0,total:0,failed:1});}
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
  event.respondWith(fetch(request).then(response=>{
    if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
    return response;
  }).catch(()=>caches.match(request).then(response=>response||caches.match('./index.html'))));
});
