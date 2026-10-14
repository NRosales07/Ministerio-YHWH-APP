// ---- Descarga previa de sonidos: solo guarda los archivos, no los decodifica (no gasta memoria) ----
const prefetchSeen=new Set();
let prefetchRunning=false,prefetchCancel=false;
async function prefetchAudioUrl(url){
  if(prefetchSeen.has(url))return;
  if(url.startsWith(CLOUDINARY_AUDIO_BASE)&&'caches' in window){
    const cache=await caches.open(AUDIO_CACHE_NAME);
    if(!(await cache.match(url))){
      const response=await fetch(url);
      if(!response.ok)throw new Error(`HTTP ${response.status} al descargar ${url}`);
      await cache.put(url,response);
    }
  }else{
    const response=await fetch(url);
    if(!response.ok)throw new Error(`HTTP ${response.status} al descargar ${url}`);
    await response.arrayBuffer();
  }
  prefetchSeen.add(url);
}
async function prefetchInstrumentSounds(instrument,onProgress){
  const tasks=[];
  if(instrument==='strings'){
    STRINGS_SAMPLE_ROOTS.forEach(sample=>tasks.push(async()=>{
      const sources=[...(sample.cloudinaryId?[`${CLOUDINARY_AUDIO_BASE}${sample.cloudinaryId}.wav`]:[]),`audio/strings/${sample.file}`];
      let lastError=null;
      for(const source of sources){try{await prefetchAudioUrl(source);return;}catch(error){lastError=error;}}
      throw lastError;
    }));
  }else if(instrument==='upright-piano-kw'){
    const spec=INSTRUMENTS[instrument],files=[...new Set([...UPRIGHT_KW_REGIONS.soft,...UPRIGHT_KW_REGIONS.strong].map(region=>region[3]))];
    files.forEach(file=>tasks.push(async()=>{let lastError=null;const cloudinaryPath=spec.cloudinaryRoot?file.replace(/[ #]/g,'_'): `${spec.cloudinaryFolder}/${file}`.replace(/[ #]/g,'_');const hosted=`${CLOUDINARY_AUDIO_BASE}${cloudinaryPath.split('/').map(encodeURIComponent).join('/')}`;for(const source of [hosted,`audio/${spec.folder}/${encodeURIComponent(file)}`]){try{await prefetchAudioUrl(source);return;}catch(error){lastError=error;}}throw lastError;}));
  }else if(INSTRUMENTS[instrument]&&instrument!=='grand-piano'){
    const spec=INSTRUMENTS[instrument],reps=VSCO2_TRUMPET_PATCHES[instrument]?.roundRobin?2:instrument==='upright-nr1-vsco2'?3:1;
    for(let midi=spec.first;midi<=spec.last;midi++)for(let r=0;r<reps;r++)tasks.push(()=>getInstrumentSample(midi,instrument,true));
  }
  const total=tasks.length;let next=0,done=0,failed=0;
  const worker=async()=>{
    while(!prefetchCancel&&next<tasks.length){
      const task=tasks[next++];
      try{await task();}catch(error){failed++;console.warn('No se pudo descargar una muestra:',error);}
      done++;if(onProgress)onProgress(done,total);
    }
  };
  await Promise.all([worker(),worker(),worker()]);
  return {done,failed,total};
}
const DOWNLOAD_CATALOG=[
  {section:'Pianos',items:[
    ['steinway-grand','Steinway de cola',164,16.15],['headroom-piano','Headroom · Yamaha C3',312,148.99],['splendid-grand','Splendid Grand Piano',234,73.30],['livingroom-upright-micro','LivingRoom Upright Micro',141,101.75],['maestro-concert-grand','Maestro Concert Grand · Yamaha CF-3',820,256.07],['salamander-grand','Salamander Grand · Yamaha C5',145,331.44],['upright-piano-vsco2','Upright Piano · VSCO 2',69,241.89],['upright-nr1-vsco2','Upright No. 1 · VSCO 2',79,147.89],['upright-piano-kw','Upright Piano KW · Kawai',66,31.28]
  ]},
  {section:'Bajos',items:[
    ['growlybass-clean','Bajo eléctrico · Growlybass',224,170.17],['fashionbass-clean','Bajo eléctrico · Fashionbass Clean',285,315.40]
  ]},
  {section:'Cuerdas',items:[
    ['strings','Ensemble de cuerdas · VSCO 2',13,21.99],['solo-violin','Violín solista · VSCO 2',33,70.92],['sigex-strings','Ensemble de violines · Signal Experiments',17,2.22],['bigcat-cello','Cello solista · Bigcat',17,126.46]
  ]},
  {section:'Vientos y metales',items:[
    ['trumpet-real','Trompeta real',21,6.87],['trumpet-vsco2-sus-vib','Trompeta VSCO · Vibrato',25,20.60],['trumpet-vsco2-sus','Trompeta VSCO · Sostenida',20,38.67],['trumpet-vsco2-stac','Trompeta VSCO · Staccato',66,13.96],['trumpet-vsco2-harmon-mute-sus','Trompeta VSCO · Sordina Harmon',16,17.64],['trumpet-vsco2-straight-mute-sus','Trompeta VSCO · Sordina Straight',16,23.32],['sigex-brass','Sección de cornos · Signal Experiments',15,1.99],['mtg-solo-sax','Saxofón alto · MTG Solo Sax',33,100.14]
  ]},
  {section:'Teclas y percusión',items:[
    ['church-organ','Órgano de iglesia · FreePats',11,12.43],['vibraphone','Vibráfono · MSLP',37,18.95]
  ]},
  {section:'Guitarras',items:[['distorted-guitar','Guitarra eléctrica distorsionada',34,31.59]]}
].map(group=>({...group,items:group.items.map(([id,label,files,mb])=>({id,label,files,bytes:Math.round(mb*1048576)}))}));
const catalogSize=bytes=>bytes>=1048576?`${(bytes/1048576).toFixed(bytes>=104857600?0:1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`;
function selectedCatalogInstruments(){return [...document.querySelectorAll('#prefetchCatalog input[data-instrument]:checked')].map(input=>input.dataset.instrument);}
function updatePrefetchSelection(){
  const selected=selectedCatalogInstruments(),total=DOWNLOAD_CATALOG.flatMap(group=>group.items).filter(item=>selected.includes(item.id)).reduce((sum,item)=>sum+item.bytes,0);
  const summary=$('prefetchSelectionSummary');if(summary)summary.textContent=`${selected.length} instrumento${selected.length===1?'':'s'} seleccionado${selected.length===1?'':'s'} · ${catalogSize(total)} aprox.`;
  document.querySelectorAll('#prefetchCatalog [data-select-section]').forEach(master=>{const inputs=[...document.querySelectorAll(`#prefetchCatalog input[data-section="${CSS.escape(master.dataset.selectSection)}"]`)];master.checked=inputs.length>0&&inputs.every(input=>input.checked);master.indeterminate=inputs.some(input=>input.checked)&&!master.checked;});
}
async function runPrefetch(list){
  const status=$('prefetchStatus'),buttons=[$('prefetchDownloadSelected')];
  if(prefetchRunning){prefetchCancel=true;status.textContent='Cancelando…';return;}
  if(!navigator.onLine){status.textContent='Necesitas conexión a internet para descargar.';return;}
  list=list.filter(instrument=>instrument!=='grand-piano');
  if(!list.length){status.textContent='Marca al menos un instrumento de la lista.';return;}
  prefetchRunning=true;prefetchCancel=false;prefetchSeen.clear();
  const labels=buttons.map(button=>button.textContent);buttons.forEach(button=>{button.textContent='Cancelar';});
  let failedTotal=0;
  try{
    for(let index=0;index<list.length&&!prefetchCancel;index++){
      const instrument=list[index];
      const result=await prefetchInstrumentSounds(instrument,(done,total)=>{status.textContent=`${instrumentLabel(instrument)}: ${done}/${total} · instrumento ${index+1} de ${list.length}`;});
      failedTotal+=result.failed;
    }
    let used='';
    try{const estimate=await navigator.storage.estimate();used=` Espacio usado por la app: ${Math.round(estimate.usage/1048576)} MB.`;}catch(_){}
    status.textContent=(prefetchCancel?'Descarga cancelada.':failedTotal?`Terminó con ${failedTotal} sonidos que no se pudieron descargar. Puedes volver a intentarlo.`:'Listo. Los sonidos quedaron guardados en este dispositivo.')+used;
    navigator.serviceWorker?.controller?.postMessage({type:'GET_AUDIO_CACHE_STATUS'});
    refreshHomeAudioStatus(homeAudioCacheStatus.cached,homeAudioCacheStatus.total,false);
  }finally{
    prefetchRunning=false;prefetchCancel=false;buttons.forEach((button,index)=>{button.textContent=labels[index];});
  }
}
function initPrefetchUI(){
  const host=$('deviceInstrumentLibraryHost');
  if(!host||$('prefetchBlock'))return;
  const block=document.createElement('section');
  block.id='prefetchBlock';block.className='instrument-config-card prefetch-library';
  block.innerHTML='<header class="prefetch-library-heading"><div><h2>Biblioteca de instrumentos</h2><p>Elige por sección qué sonidos quieres guardar en este dispositivo para que carguen más rápido. Los pesos son aproximados; el espacio real depende de las muestras y capas que use la app.</p></div><div class="prefetch-library-tools"><button id="prefetchSelectAll" class="soft" type="button">Marcar todos</button><button id="prefetchClearAll" class="soft" type="button">Quitar marcas</button></div></header><div id="prefetchCatalog" class="prefetch-catalog"></div><footer class="prefetch-library-footer"><span id="prefetchSelectionSummary" aria-live="polite">0 instrumentos seleccionados · 0 KB aprox.</span><button id="prefetchDownloadSelected" class="mode-screen-continue" type="button">Descargar seleccionados</button></footer><small id="prefetchStatus" class="prefetch-status" role="status"></small>';
  const catalog=block.querySelector('#prefetchCatalog');
  catalog.innerHTML=DOWNLOAD_CATALOG.map((group,index)=>`<section class="prefetch-category"><header><h3>${escapeHTML(group.section)}</h3><label><input type="checkbox" data-select-section="${escapeHTML(group.section)}" aria-label="Seleccionar todos: ${escapeHTML(group.section)}"><span>Seleccionar sección</span></label></header><div class="prefetch-instrument-grid">${group.items.map(item=>`<label class="prefetch-instrument"><input type="checkbox" data-instrument="${escapeHTML(item.id)}" data-section="${escapeHTML(group.section)}"><span class="prefetch-instrument-info"><strong>${escapeHTML(item.label)}</strong><small>${item.files} archivos de audio</small></span><span class="prefetch-instrument-size">${catalogSize(item.bytes)}<small>aprox.</small></span></label>`).join('')}</div></section>`).join('');
  host.appendChild(block);
  catalog.addEventListener('change',event=>{const input=event.target;if(input.matches('[data-select-section]'))catalog.querySelectorAll(`input[data-section="${CSS.escape(input.dataset.selectSection)}"]`).forEach(item=>item.checked=input.checked);updatePrefetchSelection();});
  $('prefetchSelectAll').onclick=()=>{catalog.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=true);updatePrefetchSelection();};
  $('prefetchClearAll').onclick=()=>{catalog.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=false);updatePrefetchSelection();};
  $('prefetchDownloadSelected').onclick=()=>runPrefetch(selectedCatalogInstruments());
  updatePrefetchSelection();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPrefetchUI);else initPrefetchUI();
