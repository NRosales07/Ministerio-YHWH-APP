let audioContext = null,masterGainNode = null,masterLimiterNode = null,stringsLayerGainNode = null,instrumentPrimeGeneration=0;
function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  getMasterGain(audioContext);
  return audioContext;
}
function getMasterGain(context=audioContext){
  if(!context)context=getAudioContext();
  if(!masterGainNode){
    masterGainNode=context.createGain();masterGainNode.gain.value=state.masterVolume;
    if(typeof context.createDynamicsCompressor==='function'){
      masterLimiterNode=context.createDynamicsCompressor();masterLimiterNode.threshold.value=-1;masterLimiterNode.knee.value=0;masterLimiterNode.ratio.value=20;masterLimiterNode.attack.value=.003;masterLimiterNode.release.value=.18;
      masterGainNode.connect(masterLimiterNode);masterLimiterNode.connect(context.destination);
    }else masterGainNode.connect(context.destination);
  }
  return masterGainNode;
}
const DRUM_PAD_SOUNDS=[
  {id:'kick',label:'Bombo',file:'drum_heavy_kick.flac',key:'q'},
  {id:'snare',label:'Caja',file:'drum_snare_hard.flac',key:'w'},
  {id:'snareSoft',label:'Caja suave',file:'drum_snare_soft.flac',key:'e'},
  {id:'hatClosed',label:'Hi-hat cerrado',file:'drum_cymbal_closed.flac',key:'r'},
  {id:'hatOpen',label:'Hi-hat abierto',file:'drum_cymbal_open.flac',key:'a'},
  {id:'ride',label:'Ride',file:'drum_cymbal_soft.flac',key:'s'},
  {id:'crash',label:'Crash',file:'drum_splash_hard.flac',key:'d'},
  {id:'tom',label:'Tom',file:'drum_tom_mid_hard.flac',key:'f'}
];
const MULDJORD_PAD_FILES={kick:'kick.flac',snare:'snare.flac',snareSoft:'snare-soft.flac',hatClosed:'hat-closed.flac',hatOpen:'hat-open.flac',ride:'ride.flac',crash:'crash.flac',tom:'tom.flac'};
const MULDJORD_PAD_GAIN={snare:1.55,snareSoft:1.55,hatClosed:1.8};
let selectedDrumPadKit=safeStorageGetItem('yhwh_drum_pad_kit_v1')==='muldjord'?'muldjord':'electronic';
const DRUM_PAD_DEFAULT_KEY='yhwh_drum_pad_pattern_default_v1';
let drumPadBuffersByKit=new Map(),drumPadLoadPromises=new Map(),drumPadPattern={bpm:metronomeBpm,bars:2,events:[]},drumPadReturnScreen='homeView',drumPadContextSong=null,drumPadReturnFocus=null,drumPadResumeMetronome=false;
let drumPadRecording=false,drumPadRecordingPreviousPattern=null,drumPadRecordStart=0,drumPadRecordBpm=100,drumPadRecordTimer=0,drumPadPlaybackTimer=0,drumPadNextLoopAt=0,drumPadRecordLoopTimer=0,drumPadRecordLoopAt=0,drumPadSources=[],drumPadCountInSources=[],drumPadRecordAlongPending=false,drumPadRecordAlongPlayback=false;
function drumPadSongKey(song=state.song){return song?`yhwh_drum_pad_pattern_${song.category}_${encodeURIComponent(String(song.song.id))}_v1`:DRUM_PAD_DEFAULT_KEY;}
function readDrumPadPattern(song=state.song){
  const read=key=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');if(!value||!Array.isArray(value.events))return null;return {bpm:Math.min(240,Math.max(40,Math.round(Number(value.bpm)||100))),bars:Math.min(256,Math.max(1,Math.round(Number(value.bars)||2))),loop:value.loop!==false,durationBeats:Number(value.durationBeats)||0,events:value.events.filter(event=>DRUM_PAD_SOUNDS.some(sound=>sound.id===event.pad)&&Number.isFinite(Number(event.beat))).map(event=>({pad:event.pad,beat:Math.max(0,Number(event.beat))}))};}catch(_){return null;}};
  return (song&&read(drumPadSongKey(song)))||read(DRUM_PAD_DEFAULT_KEY)||{bpm:metronomeBpm,bars:2,events:[]};
}
function saveDrumPadPattern(){
  drumPadPattern.bpm=metronomeBpm;const selectedBars=Number($('drumPadBars')?.value);if(drumPadPattern.loop!==false&&[1,2,4].includes(selectedBars))drumPadPattern.bars=selectedBars;
  try{localStorage.setItem(drumPadSongKey(drumPadContextSong),JSON.stringify(drumPadPattern));const status=$('drumPadPatternStatus');if(status)status.textContent=`Patrón guardado${drumPadContextSong?` para ${drumPadContextSong.song.title||'esta alabanza'}`:' en este dispositivo'} · ${drumPadPattern.events.length} golpes.`;queueSongDrumPublish();return true;}catch(_){toast('No se pudo guardar el patrón en este dispositivo.');return false;}
}
function drumPadEnabledKey(song){return `yhwh_drum_pad_enabled_${song.category}_${encodeURIComponent(String(song.song.id))}_v1`;}
function isDrumPadEnabledForSong(song=state.song){if(!song)return false;try{return localStorage.getItem(drumPadEnabledKey(song))!=='0';}catch(_){return true;}}
function setDrumPadEnabledForSong(song,on){if(!song)return;try{localStorage.setItem(drumPadEnabledKey(song),on?'1':'0');}catch(_){}}
function sharedDrumPattern(song){
  const raw=song&&state.melodies?.[song.category]?.[String(song.song.id)]?.bateria;
  if(!raw||typeof raw!=='object')return null;
  const list=Array.isArray(raw.events)?raw.events:(raw.events&&typeof raw.events==='object'?Object.values(raw.events):[]);
  const events=list.filter(event=>event&&DRUM_PAD_SOUNDS.some(sound=>sound.id===event.pad)&&Number.isFinite(Number(event.beat))).map(event=>({pad:event.pad,beat:Math.max(0,Number(event.beat))}));
  if(!events.length)return null;
  return {bpm:Math.min(240,Math.max(40,Math.round(Number(raw.bpm)||100))),bars:Math.min(256,Math.max(1,Math.round(Number(raw.bars)||2))),loop:raw.loop!==false,durationBeats:Number(raw.durationBeats)||0,events,activa:raw.activa!==false};
}
function songHasOwnDrumPattern(song){
  if(!song)return false;if(sharedDrumPattern(song))return true;
  try{const value=JSON.parse(localStorage.getItem(drumPadSongKey(song))||'null');return !!(value&&Array.isArray(value.events));}catch(_){return false;}
}
// Al reproducir o grabar una alabanza: 1) la batería publicada en Firebase (suena en todos los teléfonos), 2) la guardada en este teléfono. El patrón general es solo plantilla.
function readSongDrumPattern(song=state.song){
  const empty={bpm:metronomeBpm,bars:2,events:[]};
  if(!song||drumPadRecordAlongPending||!isDrumPadEnabledForSong(song))return empty;
  const shared=sharedDrumPattern(song);
  if(shared)return shared.activa?{bpm:shared.bpm,bars:shared.bars,events:shared.events}:empty;
  if(!songHasOwnDrumPattern(song))return empty;
  return readDrumPadPattern(song);
}
function readDrumPadEditable(song){const shared=song&&sharedDrumPattern(song);return shared?{bpm:shared.bpm,bars:shared.bars,events:shared.events}:readDrumPadPattern(song);}
let drumPublishTimer=0;
function queueSongDrumPublish(){
  const context=drumPadContextSong;if(!context)return;
  const snapshot={bpm:drumPadPattern.bpm,bars:drumPadPattern.bars,loop:drumPadPattern.loop!==false,durationBeats:Number(drumPadPattern.durationBeats)||0,events:drumPadPattern.events.map(event=>({pad:event.pad,beat:Number(event.beat)}))};
  clearTimeout(drumPublishTimer);drumPublishTimer=setTimeout(()=>void publishSongDrums(context,snapshot),700);
}
async function publishSongDrums(context,pattern){
  const status=$('drumPadPatternStatus');
  if(!(state.admin&&state.db&&state.ref&&state.set)){if(status)status.textContent='Guardado en este teléfono. Solo quien administra puede publicarlo para todos los teléfonos.';return;}
  const {category,song}=context,key=String(song.id),data=pattern.events.length?{bpm:pattern.bpm,bars:pattern.bars,loop:pattern.loop!==false,durationBeats:Number(pattern.durationBeats)||0,activa:isDrumPadEnabledForSong(context),events:pattern.events,updatedAt:new Date().toISOString()}:null;
  try{
    await state.set(state.ref(state.db,`melodias/${category}/${song.id}/bateria`),data);
    state.melodies[category]||={};const record={...(state.melodies[category][key]||{})};
    if(data)record.bateria=data;else delete record.bateria;
    if(Object.keys(record).length)state.melodies[category][key]=record;else delete state.melodies[category][key];
    try{localStorage.setItem('yhwh_melodias_cache',JSON.stringify(state.melodies));}catch(_){}
    if(status)status.textContent=data?`Batería publicada: suena en todos los teléfonos · ${pattern.events.length} golpes.`:'Batería quitada de esta alabanza para todos.';
  }catch(error){console.warn('No se pudo publicar la batería',error);if(status)status.textContent=`No se pudo publicar la batería${error?.code?` (${error.code})`:''}. Quedó guardada en este teléfono; revisa la conexión o las reglas de Firebase.`;}
}
async function loadDrumPadBuffers(){
  const kit=selectedDrumPadKit;
  if(drumPadBuffersByKit.get(kit)?.size===DRUM_PAD_SOUNDS.length)return drumPadBuffersByKit.get(kit);
  if(drumPadLoadPromises.has(kit))return drumPadLoadPromises.get(kit);
  const context=getAudioContext(),resume=resumeAudioContext(context);
  const promise=Promise.all(DRUM_PAD_SOUNDS.map(async sound=>{const file=kit==='muldjord'?`audio/drum-pad/muldjord/${MULDJORD_PAD_FILES[sound.id]}`:`audio/drum-pad/${sound.file}`;const response=await fetch(file);if(!response.ok)throw new Error(`No se pudo cargar ${sound.label}`);const buffer=await context.decodeAudioData(await response.arrayBuffer());return [sound.id,buffer];})).then(entries=>{const buffers=new Map(entries);drumPadBuffersByKit.set(kit,buffers);return buffers;}).finally(()=>drumPadLoadPromises.delete(kit));
  drumPadLoadPromises.set(kit,promise);await Promise.all([promise,resume]);return drumPadBuffersByKit.get(kit);
}
function scheduleDrumPadHit(pad,when,trackPlayback=false){
  const buffer=drumPadBuffersByKit.get(selectedDrumPadKit)?.get(pad);if(!buffer)return null;
  const context=getAudioContext(),source=context.createBufferSource(),gain=context.createGain(),padGain=selectedDrumPadKit==='muldjord'?(MULDJORD_PAD_GAIN[pad]||1):1;source.buffer=buffer;gain.gain.setValueAtTime(Math.min(1.35,.82*padGain),when);source.connect(gain);gain.connect(getMasterGain(context));source.start(Math.max(context.currentTime,when));
  const target=trackPlayback?state.activePlaybackSources:drumPadSources;target.push(source);source.addEventListener('ended',()=>{const index=target.indexOf(source);if(index>=0)target.splice(index,1);},{once:true});return source;
}
async function triggerDrumPad(pad){
  const tapTime=performance.now();
  const context=getAudioContext(),resume=resumeAudioContext(context);
  try{await Promise.all([loadDrumPadBuffers(),resume]);scheduleDrumPadHit(pad,context.currentTime+.012);const button=document.querySelector(`[data-drum-pad="${pad}"]`);button?.classList.add('is-hit');setTimeout(()=>button?.classList.remove('is-hit'),110);
    if(drumPadRecording){const latency=Math.min(.25,Number(context.outputLatency||context.baseLatency)||0),rawBeat=((tapTime-drumPadRecordStart)/1000-latency)*drumPadRecordBpm/60,beat=rawBeat<0&&rawBeat>-.15?0:rawBeat,totalBeats=drumPadPattern.bars*4;if(beat>=0&&beat<totalBeats){drumPadPattern.events.push({pad,beat:Number(beat.toFixed(3))});const status=$('drumPadPatternStatus');if(status)status.textContent=`Grabando · ${drumPadPattern.events.length} golpes`;}}
  }catch(error){console.error('No se pudo cargar el Drum Pad:',error);toast('No se pudieron cargar los sonidos de batería.');}
}
const DRUM_STEPS_PER_BEAT=4;
function drumGridStepOf(event){return Math.round(Number(event.beat)*DRUM_STEPS_PER_BEAT);}
function renderDrumPadGrid(){
  const host=$('drumPadStepGrid');if(!host)return;
  if(drumPadPattern.loop===false){host.innerHTML='<p class="drum-pad-hint">Grabación completa · '+drumPadPattern.events.length+' golpes a lo largo de la alabanza. El patrón se reproduce una vez junto con la canción.</p>';host.style.removeProperty('--drum-steps');host.classList.remove('is-recording');if($('drumPadQuantize'))$('drumPadQuantize').disabled=true;if($('drumPadBars'))$('drumPadBars').disabled=true;return;}
  if($('drumPadQuantize'))$('drumPadQuantize').disabled=false;if($('drumPadBars'))$('drumPadBars').disabled=!!drumPadRecording;
  const bars=[1,2,4].includes(Number(drumPadPattern.bars))?Number(drumPadPattern.bars):2,steps=bars*16,active=new Set(drumPadPattern.events.map(event=>event.pad+':'+drumGridStepOf(event)));
  host.style.setProperty('--drum-steps',String(steps));host.classList.toggle('is-recording',!!drumPadRecording);
  host.innerHTML=DRUM_PAD_SOUNDS.map(sound=>{
    let cells='';
    for(let step=0;step<steps;step++){
      const on=active.has(sound.id+':'+step),bar=Math.floor(step/16)+1,beat=Math.floor((step%16)/4)+1,sub=step%4;
      cells+='<button type="button" class="drum-step'+(on?' on':'')+(step%16===0?' bar-start':step%4===0?' beat-start':'')+'" role="gridcell" data-drum-step="'+step+'" data-drum-step-pad="'+sound.id+'" aria-pressed="'+on+'" aria-label="'+escapeHTML(sound.label)+', compás '+bar+', tiempo '+beat+(sub?', parte '+(sub+1):'')+'"></button>';
    }
    return '<div class="drum-step-row" role="row"><span class="drum-step-label" role="rowheader">'+escapeHTML(sound.label)+'</span>'+cells+'</div>';
  }).join('');
}
function toggleDrumPadStep(pad,step){
  if(drumPadRecording)return;
  const hits=drumPadPattern.events.filter(event=>event.pad===pad&&drumGridStepOf(event)===step);
  if(hits.length)drumPadPattern.events=drumPadPattern.events.filter(event=>!hits.includes(event));
  else{drumPadPattern.events.push({pad,beat:step/DRUM_STEPS_PER_BEAT});void triggerDrumPad(pad);}
  drumPadPattern.events.sort((a,b)=>a.beat-b.beat);saveDrumPadPattern();renderDrumPadGrid();
}
function quantizeDrumPadPattern(){
  if(drumPadRecording)return;
  if(!drumPadPattern.events.length){toast('Aún no hay golpes para ajustar.');return;}
  const total=drumPadPattern.bars*16,seen=new Set(),events=[];
  [...drumPadPattern.events].sort((a,b)=>a.beat-b.beat).forEach(event=>{const step=((drumGridStepOf(event)%total)+total)%total,key=event.pad+':'+step;if(seen.has(key))return;seen.add(key);events.push({pad:event.pad,beat:step/DRUM_STEPS_PER_BEAT});});
  events.sort((a,b)=>a.beat-b.beat);drumPadPattern.events=events;
  if(saveDrumPadPattern()){const status=$('drumPadPatternStatus');if(status)status.textContent='Ritmo ajustado al tiempo · '+events.length+' golpes.';}
  renderDrumPadGrid();
}
function syncDrumPadSongToggle(){
  const label=$('drumPadSongToggle'),input=$('drumPadSongEnabled');if(!label||!input)return;
  label.classList.toggle('hidden',!drumPadContextSong);if(!drumPadContextSong)return;
  input.checked=isDrumPadEnabledForSong(drumPadContextSong)&&sharedDrumPattern(drumPadContextSong)?.activa!==false;
  const status=$('drumPadPatternStatus');
  if(status&&drumPadPattern.events.length&&!songHasOwnDrumPattern(drumPadContextSong))status.textContent='Este patrón es la plantilla general: pulsa «Guardar patrón» para asignarlo a esta alabanza.';
}
function stopDrumPadPlayback(){
  if(drumPadPlaybackTimer){clearInterval(drumPadPlaybackTimer);drumPadPlaybackTimer=0;}drumPadNextLoopAt=0;
  drumPadSources.forEach(source=>{try{source.stop();}catch(_){}});drumPadSources=[];if($('drumPadPlay'))$('drumPadPlay').setAttribute('aria-pressed','false');if(!drumPadRecording){if($('drumPadBpm'))$('drumPadBpm').disabled=false;if($('drumPadBars'))$('drumPadBars').disabled=drumPadPattern.loop===false;}
}
function stopDrumPadRecordPlayback(){if(drumPadRecordLoopTimer){clearInterval(drumPadRecordLoopTimer);drumPadRecordLoopTimer=0;}drumPadRecordLoopAt=0;drumPadSources.forEach(source=>{try{source.stop();}catch(_){}});drumPadSources=[];}
function startDrumPadRecordPlayback(pattern,startAt,duration=Infinity){
  stopDrumPadRecordPlayback();if(!pattern?.events?.length||!drumPadBuffersByKit.get(selectedDrumPadKit)?.size)return;
  const context=getAudioContext(),bpm=Number(pattern.bpm)||metronomeBpm,tempo=Math.max(.5,Number(state.tempo)||1),beatSeconds=60/bpm/tempo;
  if(pattern.loop===false){for(const event of pattern.events){const when=startAt+event.beat*beatSeconds;if(when-startAt<duration)scheduleDrumPadHit(event.pad,when);}return;}
  const loopSeconds=pattern.bars*4*beatSeconds;
  drumPadRecordLoopAt=startAt;
  drumPadRecordLoopTimer=setInterval(()=>{const now=context.currentTime;while((drumPadRecordLoopAt-startAt)<duration&&drumPadRecordLoopAt<now+.16){for(const event of pattern.events){const when=drumPadRecordLoopAt+event.beat*beatSeconds;if(when-startAt<duration)scheduleDrumPadHit(event.pad,when);}drumPadRecordLoopAt+=loopSeconds;}},25);
}
function updateDrumPadSongLabel(){const label=$('drumPadSongLabel');if(label)label.textContent=drumPadContextSong?`Patrón para: ${drumPadContextSong.song.title||'esta alabanza'}`:'Patrón general · plantilla: ábrelo desde una alabanza para asignárselo';}
function armDrumPadRecordAlongSong(){
  const button=$('drumPadRecordAlongSong'),status=$('drumPadPatternStatus');
  if(!drumPadContextSong||!state.song||state.song.category!==drumPadContextSong.category||String(state.song.song.id)!==String(drumPadContextSong.song.id)||!state.notes.length){toast('Abre una pista guardada de esta alabanza para usarla como guía.');return;}
  if(drumPadRecording||drumPadRecordAlongPending)return;
  stopDrumPadPlayback();drumPadRecordingPreviousPattern={...drumPadPattern,events:drumPadPattern.events.map(event=>({...event}))};
  drumPadPattern={bpm:metronomeBpm,bars:2,loop:false,durationBeats:0,events:[]};drumPadRecordAlongPending=true;drumPadRecordAlongPlayback=false;
  if(button){button.disabled=true;button.textContent='Preparando alabanza…';}if(status)status.textContent='Preparando la alabanza y los sonidos de batería…';
  void loadDrumPadBuffers().then(()=>{if(!drumPadRecordAlongPending)return;void playMelody();}).catch(error=>{console.warn('No se pudo preparar la grabación con alabanza:',error);cancelDrumPadRecordAlong();toast('No se pudieron preparar los sonidos de batería.');});
}
function beginDrumPadRecordAlongSong(playbackStart,duration){
  if(!drumPadRecordAlongPending)return;
  drumPadRecordAlongPending=false;drumPadRecordAlongPlayback=true;drumPadRecording=true;
  const button=$('drumPadRecordAlongSong'),status=$('drumPadPatternStatus'),context=getAudioContext(),baseBpm=Math.min(240,Math.max(40,Number(metronomeBpm)||100)),tempo=Math.max(.5,Number(state.tempo)||1);
  drumPadPattern={bpm:baseBpm,bars:Math.min(256,Math.max(1,Math.ceil(duration*tempo*baseBpm/240))),loop:false,durationBeats:duration*tempo*baseBpm/60,events:[]};
  drumPadRecordBpm=baseBpm*tempo;drumPadRecordStart=performance.now()+(playbackStart-context.currentTime)*1000;
  if($('drumPadBpm'))$('drumPadBpm').disabled=true;if($('drumPadBars'))$('drumPadBars').disabled=true;
  if(button){button.disabled=false;button.textContent='⏹ Detener grabación';}if(status)status.textContent='Grabando con la alabanza · toca los pads mientras suena.';
  renderDrumPadGrid();drumPadRecordTimer=setTimeout(()=>stopDrumPadRecording(),Math.max(0,(playbackStart-context.currentTime+duration)*1000+150));
}
function cancelDrumPadRecordAlong(){
  drumPadRecordAlongPending=false;drumPadRecordAlongPlayback=false;
  if(drumPadRecording)stopDrumPadRecording();else if(drumPadRecordingPreviousPattern){drumPadPattern=drumPadRecordingPreviousPattern;drumPadRecordingPreviousPattern=null;renderDrumPadGrid();}
  const button=$('drumPadRecordAlongSong');if(button){button.disabled=false;button.textContent='🎵 Grabar siguiendo la alabanza';}
}
function openDrumPadScreen(){
  const playerVisible=$('player')&&!$('player').classList.contains('hidden'),createTrackVisible=$('createTrackScreen')&&!$('createTrackScreen').classList.contains('hidden');if(state.recording){toast('Detén la grabación del piano antes de abrir el Drum Pad.');return;}
  drumPadReturnFocus=document.activeElement;drumPadReturnScreen=playerVisible?'player':createTrackVisible?'createTrackScreen':'homeView';drumPadContextSong=playerVisible?state.song:createTrackVisible?selectedCreateSong:null;drumPadResumeMetronome=playerVisible&&metronomeOn;
  stopPlayback();stopMetronome();stopDrumPadPlayback();drumPadPattern=readDrumPadEditable(drumPadContextSong);
  updateDrumPadSongLabel();$('drumPadKit').value=selectedDrumPadKit;renderDrumPadGrid();$('drumPadBpm').value=String(drumPadPattern.bpm);$('drumPadBars').value=String(drumPadPattern.bars);setMetronomeBpm(drumPadPattern.bpm,true);
  const status=$('drumPadPatternStatus');if(status)status.textContent=drumPadPattern.events.length?(drumPadPattern.loop===false?`Grabación completa lista · ${drumPadPattern.events.length} golpes · ${drumPadPattern.bars} compases.`:`Patrón listo · ${drumPadPattern.events.length} golpes · ${drumPadPattern.bars} compases.`):'Toca los cuadros para probar los sonidos.';
  transitionScreen('drumPadScreen',['homeView','songView','createView','createTrackScreen','theoryView','player','playModeModal','instrumentSettingsScreen','deviceSettingsScreen','playerSettingsScreen','drumPadScreen']);window.scrollTo(0,0);setTimeout(()=>document.querySelector('#drumPadScreen [data-drum-pad]')?.focus({preventScroll:true}),0);
  syncDrumPadSongToggle();
  const recordAlong=$('drumPadRecordAlongSong');if(recordAlong){recordAlong.disabled=!drumPadContextSong||!state.song||state.song.category!==drumPadContextSong.category||String(state.song.song.id)!==String(drumPadContextSong.song.id)||!state.notes.length;recordAlong.textContent='🎵 Grabar siguiendo la alabanza';}
  if($('drumPadBars'))$('drumPadBars').disabled=drumPadPattern.loop===false;
  void loadDrumPadBuffers().catch(error=>{console.warn('El Drum Pad cargará los sonidos al primer toque:',error);});
}
function closeDrumPadScreen(){
  const stopGuide=drumPadRecordAlongPending||drumPadRecordAlongPlayback;if(drumPadRecordAlongPending)cancelDrumPadRecordAlong();if(drumPadRecording)stopDrumPadRecording();if(stopGuide&&state.playing)stopPlayback();stopDrumPadPlayback();transitionScreen(drumPadReturnScreen,['homeView','songView','createView','createTrackScreen','theoryView','player','playModeModal','instrumentSettingsScreen','deviceSettingsScreen','playerSettingsScreen','drumPadScreen']);
  if(drumPadResumeMetronome){drumPadResumeMetronome=false;startMetronome();}drumPadReturnFocus?.focus?.({preventScroll:true});drumPadReturnFocus=null;drumPadContextSong=null;
}
function stopDrumPadRecording(){
  if(!drumPadRecording)return;drumPadRecording=false;if(drumPadRecordTimer){clearTimeout(drumPadRecordTimer);drumPadRecordTimer=0;}if($('drumPadBpm'))$('drumPadBpm').disabled=false;if($('drumPadBars'))$('drumPadBars').disabled=false;
  const wasRecordingAlong=drumPadRecordAlongPlayback;drumPadRecordAlongPlayback=false;drumPadRecordAlongPending=false;const alongButton=$('drumPadRecordAlongSong');if(alongButton){alongButton.disabled=false;alongButton.textContent='🎵 Grabar siguiendo la alabanza';}
  drumPadCountInSources.forEach(source=>{try{source.stop();}catch(_){}});drumPadCountInSources=[];
  const button=$('drumPadRecord');if(button){button.disabled=false;button.textContent='⏺ Grabar ritmo';}
  const status=$('drumPadPatternStatus');
  if(!drumPadPattern.events.length){
    const previous=drumPadRecordingPreviousPattern;drumPadRecordingPreviousPattern=null;
    if(previous)drumPadPattern=previous;renderDrumPadGrid();
    if($('drumPadBpm'))$('drumPadBpm').value=String(drumPadPattern.bpm);
    if($('drumPadBars'))$('drumPadBars').value=String(drumPadPattern.bars);
    if(status)status.textContent=previous?'No se grabaron golpes; se conservó el patrón anterior.':'No se grabaron golpes. Inténtalo de nuevo.';
    toast(previous?'No se grabaron golpes. Tu patrón anterior sigue guardado.':'No se grabó ningún golpe. Toca los pads durante la grabación.');
    return;
  }
  drumPadRecordingPreviousPattern=null;
  const saved=saveDrumPadPattern();renderDrumPadGrid();
  if(saved){if(status)status.textContent=wasRecordingAlong?`Grabación completa lista · ${drumPadPattern.events.length} golpes · guardada para esta alabanza.`:`Grabación lista · ${drumPadPattern.events.length} golpes · guardada en este dispositivo.`;toast(wasRecordingAlong?`Batería grabada con la alabanza · ${drumPadPattern.events.length} golpes.`:`Ritmo grabado y guardado · ${drumPadPattern.events.length} golpes.`);}
  else if(status)status.textContent='La grabación terminó, pero no se pudo guardar en este dispositivo.';
}
async function startDrumPadRecording(){
  if(drumPadRecording){stopDrumPadRecording();return;}
  stopDrumPadPlayback();stopMetronome();drumPadRecordingPreviousPattern={...drumPadPattern,events:drumPadPattern.events.map(event=>({...event}))};drumPadPattern={bpm:metronomeBpm,bars:Number($('drumPadBars').value)||2,loop:true,durationBeats:0,events:[]};
  const button=$('drumPadRecord'),status=$('drumPadPatternStatus');if(button)button.disabled=true;if(status)status.textContent='Preparando sonidos…';
  const context=getAudioContext();try{const resume=resumeAudioContext(context);await Promise.all([loadDrumPadBuffers(),resume]);}catch(error){drumPadPattern=drumPadRecordingPreviousPattern||drumPadPattern;renderDrumPadGrid();drumPadRecordingPreviousPattern=null;if(button)button.disabled=false;if($('drumPadBpm'))$('drumPadBpm').value=String(drumPadPattern.bpm);if($('drumPadBars'))$('drumPadBars').value=String(drumPadPattern.bars);const status=$('drumPadPatternStatus');if(status)status.textContent='No se pudo iniciar la grabación. Revisa la conexión e inténtalo de nuevo.';toast('No se pudieron preparar los sonidos de batería. Revisa la conexión e inténtalo de nuevo.');return;}
  const bpm=Math.min(240,Math.max(40,Number($('drumPadBpm').value)||100));setMetronomeBpm(bpm,true);drumPadPattern.bpm=bpm;drumPadPattern.bars=Number($('drumPadBars').value)||2;
  const beat=60/bpm,countInStart=context.currentTime+.08,recordAt=countInStart+4*beat;drumPadRecordBpm=bpm;drumPadRecordStart=performance.now()+(recordAt-context.currentTime)*1000;drumPadRecording=true;$('drumPadBpm').disabled=true;$('drumPadBars').disabled=true;if(button){button.disabled=false;button.textContent='⏹ Detener grabación';}
  drumPadCountInSources=[];for(let index=0;index<4;index++){const click=scheduleMetronomeBeat(context,countInStart+index*beat,index===0?0:1,true);if(click){drumPadCountInSources.push(click);drumPadSources.push(click);click.addEventListener('ended',()=>{drumPadCountInSources=drumPadCountInSources.filter(source=>source!==click);drumPadSources=drumPadSources.filter(source=>source!==click);},{once:true});}setTimeout(()=>{if(status&&drumPadRecording)status.textContent=`Cuenta de entrada · ${4-index}`;},Math.max(0,(countInStart+index*beat-context.currentTime)*1000));}
  renderDrumPadGrid();if(status)status.textContent='Cuenta de entrada · 4';drumPadRecordTimer=setTimeout(stopDrumPadRecording,(recordAt-context.currentTime+drumPadPattern.bars*4*beat)*1000);
}
async function playDrumPadPattern(){
  if(!drumPadPattern.events.length){toast('Graba primero un patrón de batería.');return;}
  stopDrumPadPlayback();const context=getAudioContext();try{const resume=resumeAudioContext(context);await Promise.all([loadDrumPadBuffers(),resume]);}catch(_){toast('No se pudieron cargar los sonidos de batería.');return;}
  const bpm=Math.min(240,Math.max(40,Number($('drumPadBpm').value)||drumPadPattern.bpm||100));setMetronomeBpm(bpm,true);drumPadPattern.bpm=bpm;
  if(drumPadPattern.loop===false){const context=getAudioContext(),tempo=Math.max(.5,Number(state.tempo)||1);for(const event of drumPadPattern.events)scheduleDrumPadHit(event.pad,context.currentTime+.06+event.beat*60/bpm/tempo);$('drumPadBpm').disabled=true;$('drumPadBars').disabled=true;$('drumPadPlay').setAttribute('aria-pressed','true');const status=$('drumPadPatternStatus');if(status)status.textContent='Reproduciendo la grabación completa una vez.';drumPadPlaybackTimer=setTimeout(()=>{drumPadPlaybackTimer=0;drumPadSources=[];$('drumPadPlay').setAttribute('aria-pressed','false');$('drumPadBpm').disabled=false;$('drumPadBars').disabled=true;if(status)status.textContent='Grabación completa terminada.';},Math.max(500,drumPadPattern.durationBeats*60/bpm/tempo*1000));return;}
  const loopSeconds=drumPadPattern.bars*4*60/bpm;drumPadNextLoopAt=context.currentTime+.06;
  $('drumPadBpm').disabled=true;$('drumPadBars').disabled=true;$('drumPadPlay').setAttribute('aria-pressed','true');
  drumPadPlaybackTimer=setInterval(()=>{const now=context.currentTime;while(drumPadNextLoopAt<now+.16){for(const event of drumPadPattern.events)scheduleDrumPadHit(event.pad,drumPadNextLoopAt+event.beat*60/bpm);drumPadNextLoopAt+=loopSeconds;}},25);
  const status=$('drumPadPatternStatus');if(status)status.textContent=`Reproduciendo en bucle · ${bpm} BPM`;
}
function scheduleSongDrumPattern(pattern,startAt,duration){
  if(!pattern?.events?.length||!drumPadBuffersByKit.get(selectedDrumPadKit)?.size)return;const bpm=Number(pattern.bpm)||metronomeBpm,beatSeconds=60/bpm,loopBeats=pattern.bars*4,loopSeconds=loopBeats*beatSeconds,stateTempo=Math.max(.5,Number(state.tempo)||1);
  if(pattern.loop===false){for(const event of pattern.events){const offset=event.beat*beatSeconds/stateTempo;if(offset<duration)scheduleDrumPadHit(event.pad,startAt+offset,true);}return;}
  for(let loopStart=0;loopStart/stateTempo<duration;loopStart+=loopSeconds){for(const event of pattern.events){const offset=(loopStart+event.beat*beatSeconds)/stateTempo;if(offset<duration)scheduleDrumPadHit(event.pad,startAt+offset,true);}}
}
function setMasterVolume(percent){
  const value=Math.round(Math.max(0,Math.min(200,Number(percent)||0)));
  state.masterVolume=value/100;
  if(typeof deviceSettings==='object'){deviceSettings.masterVolume=value;if($('deviceMasterVolume'))$('deviceMasterVolume').value=String(value);if($('deviceMasterVolumeValue'))$('deviceMasterVolumeValue').textContent=`${value}%`;}
  const slider=$('masterVolume'),output=$('masterVolumeValue'),picker=$('pickerMasterVolume'),pickerOutput=$('pickerMasterVolumeValue');
  if(slider&&slider.value!==String(value))slider.value=String(value);
  if(output)output.value=`${value}%`;if(picker&&picker.value!==String(value))picker.value=String(value);if(pickerOutput)pickerOutput.value=`${value}%`;
  if(masterGainNode&&audioContext){const now=audioContext.currentTime;masterGainNode.gain.cancelScheduledValues(now);masterGainNode.gain.setTargetAtTime(state.masterVolume,now,.025);}
  try{localStorage.setItem('yhwh_piano_master_volume',String(state.masterVolume));}catch(_){}
}
const CLOUDINARY_AUDIO_BASE='https://res.cloudinary.com/hie4so71/video/upload/';
const AUDIO_CACHE_NAME='yhwh-cloudinary-audio-v1';
let homeAudioCacheStatus={cached:0,total:0,progress:false};
async function refreshHomeAudioStatus(cached=homeAudioCacheStatus.cached,total=homeAudioCacheStatus.total,progress=homeAudioCacheStatus.progress){
  homeAudioCacheStatus={cached,total,progress};
  let instrumentSamples=0;
  try{if('caches' in window){const cache=await caches.open(AUDIO_CACHE_NAME);instrumentSamples=(await cache.keys()).length;}}catch(_){ }
  const text=`${cached}/${total} audios guardados · ${instrumentSamples} muestras en caché${progress?' · descargando…':''}.`;
  ['offlineStatus','devicePreviewOffline'].forEach(id=>{const target=$(id);if(!target)return;if(id==='devicePreviewOffline'){const span=target.querySelector('span');if(span)span.textContent=text;}else target.textContent=text;});
}
// Guarda en el dispositivo cada muestra de Cloudinary la primera vez que se descarga;
// las siguientes aperturas de la app la leen del disco en vez de la red.
async function fetchAudioCached(url){
  if(typeof url!=='string'||!url.startsWith(CLOUDINARY_AUDIO_BASE)||!('caches' in window))return fetch(url);
  try{
    if(!fetchAudioCached.persistAsked){fetchAudioCached.persistAsked=true;try{navigator.storage?.persist?.();}catch(_){}}
    const cache=await caches.open(AUDIO_CACHE_NAME);
    const hit=await cache.match(url);
    if(hit)return hit;
    const response=await fetch(url);
    if(response.ok)cache.put(url,response.clone()).catch(()=>{});
    return response;
  }catch(_){return fetch(url);}
}
