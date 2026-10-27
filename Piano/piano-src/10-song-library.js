function songsFor(category) { return category === 'jubilo' ? SONGS_JUBILO : SONGS_ADORACION; }
function matches(song, query) { const q = query.trim().toLocaleLowerCase('es'); return !q || `${song.title || ''} ${song.compositor || ''}`.toLocaleLowerCase('es').includes(q); }
function stopListPreview(){
  if(!listPreviewRun)return;
  listPreviewRun.sources.forEach(source=>{try{source.stop();}catch(_){}});
  clearTimeout(listPreviewRun.timer);if(listPreviewRun.button){listPreviewRun.button.classList.remove('is-playing');listPreviewRun.button.textContent='▶';listPreviewRun.button.setAttribute('aria-label','Escuchar vista previa');listPreviewRun.button.closest('.selected-audio-preview')?.classList.remove('is-playing');}listPreviewRun=null;
}
function recentPlaybackTime(timestamp){
  const minutes=Math.max(0,Math.floor((Date.now()-(Number(timestamp)||Date.now()))/60000));
  if(minutes<1)return 'Ahora mismo';
  if(minutes<60)return `Hace ${minutes} ${minutes===1?'minuto':'minutos'}`;
  const hours=Math.floor(minutes/60);
  if(hours<24)return `Hace ${hours} ${hours===1?'hora':'horas'}`;
  return new Date(Number(timestamp)).toLocaleDateString('es',{day:'numeric',month:'short'});
}
function renderRecentSongs(){
  const list=$('recentSongsList');if(!list)return;
  let recent=[];try{
    const saved=JSON.parse(safeStorageGetItem(LAST_HEARD_STORAGE_KEY)||'[]');
    if(Array.isArray(saved))recent=saved;
    else if(saved?.title){const category=saved.category==='jubilo'?'jubilo':'adoracion',song=songsFor(category).find(candidate=>candidate.title===saved.title);if(song)recent=[{id:String(song.id),category,playedAt:saved.playedAt||Date.now()}];}
  }catch(_){}
  const entries=recent.map(item=>{
    const category=item.category==='jubilo'?'jubilo':'adoracion';
    const song=songsFor(category).find(candidate=>String(candidate.id)===String(item.id));
    return song?{song,category,playedAt:item.playedAt}:null;
  }).filter(Boolean).slice(0,3);
  list.innerHTML=entries.length?entries.map(({song,category,playedAt})=>`<button class="home-recent-row" type="button" data-recent-song-id="${escapeHTML(song.id)}" data-category="${category}" aria-label="Reproducir ${escapeHTML(song.title||'Alabanza')}"><span class="home-recent-title">${escapeHTML(song.title||'Alabanza')}</span><span class="home-recent-time">${recentPlaybackTime(playedAt)}</span><span class="home-recent-arrow" aria-hidden="true">›</span></button>`).join(''):'<p class="home-recent-empty">Las alabanzas que escuches aparecerán aquí.</p>';
}
function rememberLastHeardSong(song,category){
  if(!song)return;
  const item={id:String(song.id),category:category==='jubilo'?'jubilo':'adoracion',playedAt:Date.now()};
  let recent=[];try{const saved=JSON.parse(safeStorageGetItem(LAST_HEARD_STORAGE_KEY)||'[]');if(Array.isArray(saved))recent=saved;}catch(_){}
  recent=[item,...recent.filter(old=>String(old.id)!==item.id||old.category!==item.category)].slice(0,3);
  try{localStorage.setItem(LAST_HEARD_STORAGE_KEY,JSON.stringify(recent));}catch(_){}
  renderRecentSongs();
}
async function previewSongInList(song,category,button){
  if(listPreviewRun?.songId===String(song.id)&&listPreviewRun?.category===category){stopListPreview();return;}
  stopListPreview();button.classList.add('is-playing');button.textContent='…';
  const tracks=melodyTracks(melodyFor(category,song.id)||{}),mainType=['melodia','voz','introduccion'].find(type=>tracks[type]?.notas?.length)||null;
  const types=[...(mainType?[mainType]:[]),'acompanamiento1','acompanamiento2'];
  const groups=types.flatMap(type=>{const track=tracks[type];if(!track?.notas?.length)return[];const settings=instrumentTrackConfig(category,song.id,type);return[{type,track,settings,notes:shiftRecordedTrackNotes(notesForTrackPlayback(track.notas,type),settings.octaveShift),chords:shiftRecordedTrackChords(track.acordes||[],settings.octaveShift)}];});
  if(!groups.some(group=>group.notes.length)){button.classList.remove('is-playing');button.textContent='▶';return;}
  const run={songId:String(song.id),category,sources:[],button,timer:0};listPreviewRun=run;
  try{
    const context=getAudioContext(),start=context.currentTime+.08,original={instrument:state.instrument,intensity:state.trumpetIntensity,headroomLayer:state.headroomVelocityLayer,layerEnabled:state.stringsLayerEnabled,layerInstrument:state.layerInstrument,layerVolume:state.stringsLayerVolume,chords:state.chords};
    try{
      state.chords=[];
      for(const group of groups){Object.assign(state,{instrument:group.settings.instrument,trumpetIntensity:group.settings.intensity,headroomVelocityLayer:group.settings.instrument==='livingroom-upright-micro'?(group.settings.intensity==='soft'||group.settings.intensity==='medium'?1:2):({ 'very-soft':1,soft:2,medium:3,strong:4,'very-strong':5 }[group.settings.intensity]||4),stringsLayerEnabled:group.settings.layerEnabled,layerInstrument:group.settings.layerInstrument,stringsLayerVolume:group.settings.layerVolume});group.prepared=await prepareMelodyAudio(group.notes);group.preparedChords=await Promise.all(group.chords.map(async chord=>{const instrument=chord.instrument||state.bassInstrument||'grand-piano';return Promise.all(chordMidiNotes(chord).map(async midi=>{const stringsLoad=state.stringsLayerEnabled&&state.stringsLayerVolume>0?getOptionalLayerSample(midi):Promise.resolve(null),thirdLoad=state.thirdLayerEnabled&&state.thirdLayerVolume>0?getOptionalThirdLayerSample(midi):Promise.resolve(null);if(instrument==='grand-piano'){const [buffer,strings,thirdLayer]=await Promise.all([getSample(midi),stringsLoad,thirdLoad]);return{midi,buffer,sampleMidi:Math.max(60,Math.min(76,midi)),strings,thirdLayer};}const [sample,strings,thirdLayer]=await Promise.all([getInstrumentSample(midi,instrument),stringsLoad,thirdLoad]);return{midi,...sample,strings,thirdLayer};}));}));if(listPreviewRun!==run)return;}
    }finally{Object.assign(state,{instrument:original.instrument,trumpetIntensity:original.intensity,headroomVelocityLayer:original.headroomLayer,stringsLayerEnabled:original.layerEnabled,layerInstrument:original.layerInstrument,stringsLayerVolume:original.layerVolume,chords:original.chords});}
    const drumPattern=readSongDrumPattern({category,song});
    if(drumPattern.events.length){try{await loadDrumPadBuffers();}catch(error){console.warn('No se pudo cargar la batería de la vista previa:',error);}}
    if(listPreviewRun!==run)return;if(!button.isConnected){stopListPreview();return;}
    let previewDuration=1.2;
    for(const group of groups){
      Object.assign(state,{instrument:group.settings.instrument,trumpetIntensity:group.settings.intensity,stringsLayerEnabled:group.settings.layerEnabled,layerInstrument:group.settings.layerInstrument,stringsLayerVolume:group.settings.layerVolume});
      const intensityGain={'very-soft':.48,soft:.62,medium:.78,strong:1,'very-strong':1.16}[group.settings.intensity]||1;
      group.notes.forEach(note=>{
        const midi=Number(note.midi),entry=group.prepared.get(midi);if(!entry)return;
        const hold=noteHoldSeconds(note),cut=noteWasCut(note),duration=Math.max(.06,hold/state.tempo),when=start+Math.max(0,Number(note.start)||0)/state.tempo,stopAt=when+duration,release=cut?Math.min(instrumentReleaseTime(group.settings.instrument),.06):instrumentReleaseTime(group.settings.instrument),peak=.88*intensityGain;
        const source=context.createBufferSource(),gain=context.createGain();source.buffer=entry.buffer;source.playbackRate.value=2**((midi-entry.sampleMidi)/12);setInstrumentSampleLoop(source,entry);gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(peak,when+instrumentAttackTime(group.settings.instrument));gain.gain.setValueAtTime(peak,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+release);source.connect(gain);gain.connect(getMasterGain(context));source.start(when);source.stop(stopAt+release+.02);run.sources.push(source);
        const layerSource=scheduleLayerNote(context,midi,entry.strings,when,duration,cut?.35:1.05);if(layerSource)run.sources.push(layerSource);const thirdSource=scheduleThirdLayerNote(context,midi,entry.thirdLayer,when,duration,cut?.35:1.05);if(thirdSource)run.sources.push(thirdSource);
        previewDuration=Math.max(previewDuration,(when-start)+duration+release);
      });
      group.chords.forEach((chord,chordIndex)=>{
        const entries=group.preparedChords[chordIndex]||[],chordInstrument=chord.instrument||state.bassInstrument||'grand-piano',noteIndex=Number(chord.noteIndex),chordStart=Number.isFinite(Number(chord.start))?Math.max(0,Number(chord.start)):Number(group.notes[Math.floor(noteIndex)]?.start)||0,when=start+chordStart/state.tempo,duration=Math.max(.25,Number(chord.duration)||2)/state.tempo,release=instrumentReleaseTime(chordInstrument),arpeggio=!!chord.arpeggio;
        entries.forEach((entry,index)=>{const noteWhen=when+(arpeggio?index*.2:index*.01)/state.tempo,stopAt=noteWhen+duration,source=context.createBufferSource(),gain=context.createGain();source.buffer=entry.buffer;source.playbackRate.value=2**((entry.midi-entry.sampleMidi)/12);setInstrumentSampleLoop(source,entry);if(chordInstrument==='strings'||chordInstrument==='sigex-strings'){gain.gain.setValueAtTime(.0001,noteWhen);gain.gain.linearRampToValueAtTime(.78,noteWhen+instrumentAttackTime(chordInstrument));}else gain.gain.setValueAtTime(.78,noteWhen);gain.gain.setValueAtTime(.78,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+release);source.connect(gain);gain.connect(getMasterGain(context));source.start(noteWhen);source.stop(stopAt+release+.02);run.sources.push(source);const layerSource=scheduleLayerNote(context,entry.midi,entry.strings,noteWhen,duration,1.05);if(layerSource)run.sources.push(layerSource);const thirdSource=scheduleThirdLayerNote(context,entry.midi,entry.thirdLayer,noteWhen,duration,1.05);if(thirdSource)run.sources.push(thirdSource);});
        previewDuration=Math.max(previewDuration,chordStart+(Number(chord.duration)||2)/state.tempo+release);
      });
    }
    Object.assign(state,{instrument:original.instrument,trumpetIntensity:original.intensity,stringsLayerEnabled:original.layerEnabled,layerInstrument:original.layerInstrument,stringsLayerVolume:original.layerVolume});
    if(drumPattern.events.length&&drumPadBuffersByKit.get(selectedDrumPadKit)?.size){const bpm=Number(drumPattern.bpm)||metronomeBpm,beatSeconds=60/bpm,loopSeconds=drumPattern.bars*4*beatSeconds,tempo=Math.max(.5,Number(state.tempo)||1);for(let loopStart=0;loopStart/tempo<previewDuration;loopStart+=loopSeconds)for(const event of drumPattern.events){const offset=(loopStart+event.beat*beatSeconds)/tempo;if(offset<previewDuration){const source=scheduleDrumPadHit(event.pad,start+offset);if(source)run.sources.push(source);}}}
    const previewShell=button.closest('.selected-audio-preview');previewShell?.style.setProperty('--preview-duration',previewDuration+'s');previewShell?.classList.add('is-playing');run.timer=setTimeout(stopListPreview,previewDuration*1000);rememberLastHeardSong(song,category);
    button.textContent='■';button.classList.add('is-playing');button.setAttribute('aria-label','Detener vista previa');
  }catch(error){console.error('Vista previa no disponible',error);if(listPreviewRun===run)stopListPreview();toast('No se pudo cargar el audio de vista previa.');}
}
const SONG_CHIP_ICONS={
  intro:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M8 13v6M12 13v6M16 13v6"/></svg>',
  voz:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>'
};
function createCard(song, category, showMelodyBadge) {
  const tracks=melodyTracks(melodyFor(category,song.id));
  const hasIntro=!!tracks.introduccion?.notas?.length,hasVoice=!!tracks.voz?.notas?.length,hasMelodyTrack=!!tracks.melodia?.notas?.length,hasAccomp1=!!tracks.acompanamiento1?.notas?.length,hasAccomp2=!!tracks.acompanamiento2?.notas?.length;
  const chips=[];
  if(hasMelodyTrack)chips.push('<span class="song-chip voice">Melodía</span>');
  if(hasAccomp1)chips.push('<span class="song-chip intro">Acomp. 1</span>');
  if(hasAccomp2)chips.push('<span class="song-chip intro">Acomp. 2</span>');
  if(hasIntro)chips.push(`<span class="song-chip intro">${SONG_CHIP_ICONS.intro}Intro</span>`);
  if(hasVoice)chips.push(`<span class="song-chip voice">${SONG_CHIP_ICONS.voz}Voz</span>`);
  if(!showMelodyBadge&&!chips.length)chips.push('<span class="song-chip create">＋ Crear</span>');
  const key=String(song.tono||'').trim();
  const action=showMelodyBadge?'':(hasIntro||hasVoice||hasMelodyTrack||hasAccomp1||hasAccomp2?'Grabar o editar pistas completas':'Crear grabación');
  if(showMelodyBadge)return `<article class="song-card song-card-selectable${selectedSongForContinue&&String(selectedSongForContinue.song.id)===String(song.id)&&selectedSongForContinue.category===category?' selected':''}" data-song-id="${escapeHTML(song.id)}" data-category="${category}">
    <button class="song-card-main" type="button" aria-label="Seleccionar ${escapeHTML(song.title||'Alabanza')}"><span class="song-key"${key?` title="Tono ${escapeHTML(key)}"`:''}>${key?escapeHTML(key):'♪'}</span><span class="song-info"><b>${escapeHTML(song.title||'Alabanza')}</b><small>${song.compositor?escapeHTML(song.compositor):''}</small></span>${chips.length?`<span class="song-chips">${chips.join('')}</span>`:''}</button></article>`;
  return `<button class="song-card${selectedCreateSong&&String(selectedCreateSong.song.id)===String(song.id)&&selectedCreateSong.category===category?' selected':''}" data-song-id="${escapeHTML(song.id)}" data-category="${category}"${action?` title="${action}"`:''}>
    <span class="song-key"${key?` title="Tono ${escapeHTML(key)}"`:''}>${key?escapeHTML(key):'♪'}</span>
    <span class="song-info"><b>${escapeHTML(song.title || 'Alabanza')}</b><small>${song.compositor?escapeHTML(song.compositor):''}</small></span>
    ${chips.length?`<span class="song-chips">${chips.join('')}</span>`:''}</button>`;
}
function renderLists() {
  const category = state.view === 'jubilo' ? 'jubilo' : 'adoracion';
  if($('sectionTitle'))$('sectionTitle').textContent = category === 'jubilo' ? 'Júbilo' : 'Adoración';
  $('helper').textContent = 'Solo aparecen alabanzas que ya tienen una melodía guardada.';
  $('songView').dataset.category = category;
  if($('songBadge'))$('songBadge').textContent = category === 'jubilo' ? '♪' : '♫';
  const visible = songsFor(category).filter(song => hasMelody(category, song.id) && matches(song, $('search').value) && (songListFilter==='all'||hasTrack(category,song.id,songListFilter)));
  document.querySelectorAll('[data-song-filter]').forEach(button=>{const active=button.dataset.songFilter===songListFilter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  if($('songCount'))$('songCount').textContent = `${visible.length} ${visible.length === 1 ? 'alabanza' : 'alabanzas'}`;
  if($('songFooterCount'))$('songFooterCount').textContent=`${visible.length} ${visible.length===1?'alabanza':'alabanzas'}`;
  $('songList').innerHTML = visible.length
    ? visible.map(song => createCard(song, category, true)).join('')
     : `<div class="empty">${songsFor(category).length ? 'No hay melodías disponibles aquí todavía. Las melodías guardadas aparecerán aquí.' : 'No se cargó la lista de alabanzas. Abre Piano desde el servidor local de YHWH.'}</div>`;
  if(selectedSongForContinue?.category===category){const selectedCard=$('songList').querySelector(`[data-song-id="${CSS.escape(String(selectedSongForContinue.song.id))}"]`);selectedCard?.classList.add('selected');}
  if(selectedSongForContinue&&selectedSongForContinue.category===category&&!visible.some(song=>String(song.id)===String(selectedSongForContinue.song.id)))selectedSongForContinue=null;
  if($('selectedSongLabel'))$('selectedSongLabel').textContent=selectedSongForContinue?selectedSongForContinue.song.title||'Alabanza':'Selecciona una alabanza';
  if($('continueSongBtn'))$('continueSongBtn').disabled=!selectedSongForContinue;
  if($('selectedPreviewBtn'))$('selectedPreviewBtn').disabled=!selectedSongForContinue;

  const query = $('createSearch').value;
  const allSongs = [
    ...songsFor('adoracion').filter(song => matches(song, query)).map(song => ({ song, category: 'adoracion' })),
    ...songsFor('jubilo').filter(song => matches(song, query)).map(song => ({ song, category: 'jubilo' }))
  ];
  const createResults = [
    ...allSongs.filter(item => item.category === 'adoracion').slice(0, 40),
    ...allSongs.filter(item => item.category === 'jubilo').slice(0, 40)
  ];
  if($('createCount'))$('createCount').textContent = `${allSongs.length} disponibles`;
  if($('createFooterCount'))$('createFooterCount').textContent=`${allSongs.length} ${allSongs.length===1?'alabanza disponible':'alabanzas disponibles'}`;
  if($('createPermissionHint'))$('createPermissionHint').textContent=state.admin?'Busca una alabanza para grabar, reemplazar o eliminar una pista guardada.':'Solo Admin puede grabar, reemplazar o eliminar pistas.';
  const createGroup = (cat, label) => {
    const items = createResults.filter(item => item.category === cat);
    if (!items.length) return '';
    const total = allSongs.filter(item => item.category === cat).length;
    return `<h2 class="song-group-title" data-category="${cat}"><span>${label}</span><small>${total}</small></h2>` + items.map(({ song }) => createCard(song, cat, false)).join('');
  };
  $('createList').innerHTML = allSongs.length
    ? createGroup('adoracion', 'Adoración') + createGroup('jubilo', 'Júbilo') + (allSongs.length > createResults.length ? '<div class="empty">Se muestran hasta 40 de cada sección. Escribe el nombre en Buscar para encontrar otra alabanza.</div>' : '')
    : (songsFor('adoracion').length+songsFor('jubilo').length===0
      ? '<div class="empty">No se cargaron las canciones. Comprueba que canciones-adoracion.js y canciones-jubilo.js estén disponibles.</div>'
      : '<div class="empty">No hay alabanzas que coincidan con la búsqueda.</div>');

  document.querySelectorAll('#createList [data-song-id]').forEach(card => {
    card.onclick = () => {
      const category = card.dataset.category;
      const song = songsFor(category).find(item => String(item.id) === card.dataset.songId);
      if (song) { selectedCreateSong={song,category};document.querySelectorAll('#createList [data-song-id]').forEach(item=>item.classList.toggle('selected',item===card));$('createContinueBtn').disabled=!state.admin; }
    };
  });
  if(selectedCreateSong&&!allSongs.some(item=>item.category===selectedCreateSong.category&&String(item.song.id)===String(selectedCreateSong.song.id)))selectedCreateSong=null;
  $('createContinueBtn').disabled=!state.admin||!selectedCreateSong;
  document.querySelectorAll('#songList .song-card-selectable').forEach(card=>{
    const select=()=>{const category=card.dataset.category,song=songsFor(category).find(item=>String(item.id)===card.dataset.songId);if(!song)return;stopListPreview();selectedSongForContinue={song,category};document.querySelectorAll('#songList .song-card').forEach(item=>item.classList.toggle('selected',item===card));$('selectedSongLabel').textContent=song.title||'Alabanza';$('selectedSongLabel').title=song.title||'Alabanza';$('continueSongBtn').disabled=false;$('selectedPreviewBtn').disabled=false;};
    card.querySelector('.song-card-main').onclick=select;
  });
  renderRecentSongs();
  openRequestedLibrarySong();
}

// La app principal puede abrir Piano con ?category=...&songId=... para mostrar
// directamente la alabanza solicitada cuando sus pistas estén sincronizadas.
let linkedLibrarySongHandled = false;
function openRequestedLibrarySong() {
  if (linkedLibrarySongHandled) return;
  const params = new URLSearchParams(location.search);
  const category = params.get('category') === 'jubilo' ? 'jubilo' : 'adoracion';
  const songId = params.get('songId');
  if (!songId) return;
  const song = songsFor(category).find(item => String(item.id) === String(songId));
  if (!song) return;
  const trackType = ['melodia','introduccion','voz','acompanamiento1','acompanamiento2'].find(type => hasTrack(category, songId, type));
  if (!trackType) return; // Espera el primer snapshot de Firebase si aún no cargó la caché.
  linkedLibrarySongHandled = true;
  openSong(song, category, trackType, false, 'performance');
}

function transitionScreen(target, candidates) {
  const next=$(target);if(!next)return;
  const current=candidates.map(id=>$(id)).find(element=>element&&!element.classList.contains('hidden'));
  if(current===next)return;
  if(screenTransitionTimer)clearTimeout(screenTransitionTimer);
  candidates.forEach(id=>{const element=$(id);if(element&&element!==next){element.classList.add('hidden');element.classList.remove('screen-fade-out','screen-fade-in');}});
  next.classList.remove('hidden','screen-fade-out','screen-fade-in');
  // Every screen that becomes active enters with the shared fade animation.
  next.classList.add('screen-fade-in');
  document.body.classList.toggle('player-active',target==='player');
  if(target==='player')document.body.classList.remove('playback-finished');
  document.body.classList.toggle('free-play-active',target==='player'&&state.view==='libre');
  // Switch immediately; fading exposes the document background while theme
  // specific styles are being recalculated for the newly visible section.
  screenTransitionTimer=null;
}
function openPlayerSettingsScreen(){
  closePlayerPopovers();
  transitionScreen('playerSettingsScreen',['homeView','songView','createView','createTrackScreen','player','playModeModal','instrumentSettingsScreen','deviceSettingsScreen','playerSettingsScreen']);
  settingsToggle?.setAttribute('aria-expanded','true');
}
function closePlayerSettingsScreen(){
  transitionScreen('player',['homeView','songView','createView','createTrackScreen','player','playModeModal','instrumentSettingsScreen','deviceSettingsScreen','playerSettingsScreen']);
  settingsToggle?.setAttribute('aria-expanded','false');
}
function confirmDiscardUnsavedMelody(){
  if(!state.melodyDirty)return true;
  if(!window.confirm('Hay cambios de la melodía que todavía no se han guardado en Firebase. ¿Quieres descartarlos?'))return false;
  state.melodyDirty=false;return true;
}
const GUIDED_TOUR_STEPS={
  home:[
    {selector:'[data-view="adoracion"]',title:'Adoración',text:'Abre el catálogo de alabanzas de adoración. Puedes buscar, filtrar, escuchar una muestra y elegir cómo practicar.'},
    {selector:'[data-view="jubilo"]',title:'Júbilo',text:'Aquí están las alabanzas de celebración. El catálogo funciona igual: busca una canción y elige una forma de escucharla o practicarla.'},
    {selector:'#freePlayBtn',title:'Piano libre',text:'Entra directamente al teclado para tocar, cambiar instrumentos y practicar sin escoger una alabanza.'},
    {selector:'[data-view="crear"]',title:'Crear o editar melodías',text:'Busca una alabanza y abre una pista para grabar o editar sus notas. Algunas acciones requieren acceso de Admin.'},    {selector:'#deviceSettingsBtn',title:'Ajustes para este dispositivo',text:'Personaliza tema, colores, encabezados, teclado, sonido, efectos y descarga de instrumentos.'},
    {selector:'#recentSongsList',title:'Reproducidas recientemente',text:'Las alabanzas que escuches aparecen aquí para que puedas volver a abrirlas rápidamente.'},
    {selector:'.home-info-card',title:'Estado de los sonidos',text:'Consulta el avance de los sonidos guardados para practicar con menos espera y sin conexión.'}
  ],
  adoracion:[
    {selector:'#songFilters',title:'Filtra el catálogo',text:'Muestra todas las alabanzas o limita la lista a las que tienen introducción o voz grabada.'},
    {selector:'#search',title:'Busca por nombre',text:'Escribe parte del título para encontrar una alabanza sin recorrer toda la lista.'},
    {selector:'#songList',title:'Elige una alabanza',text:'Toca una tarjeta para seleccionarla. Puedes escuchar una vista previa antes de continuar.'},
    {selector:'#continueSongBtn',title:'Continúa a la práctica',text:'Con una alabanza seleccionada, este botón abre las opciones de reproducción y práctica.'}
  ],
  jubilo:[
    {selector:'#songFilters',title:'Filtra el catálogo',text:'Muestra todas las alabanzas o limita la lista a las que tienen introducción o voz grabada.'},
    {selector:'#search',title:'Busca por nombre',text:'Escribe parte del título para encontrar una alabanza de júbilo.'},
    {selector:'#songList',title:'Elige una alabanza',text:'Toca una tarjeta para seleccionarla; si quieres, escucha una muestra primero.'},
    {selector:'#continueSongBtn',title:'Continúa a la práctica',text:'Este botón abre las distintas formas de escuchar o practicar la canción elegida.'}
  ],
  libre:[
    {selector:'#keyboard',title:'Toca el piano',text:'Pulsa o toca las teclas. En el teléfono también puedes deslizarte por el teclado para recorrer las octavas.'},
    {selector:'#instrumentToggle',title:'Instrumento y segunda capa',text:'Abre el selector para elegir el sonido principal y mezclar un segundo instrumento.',prepare:()=>guidedOpenPopover('instrumentMenu')},
    {selector:'#stringsLayerToggle',title:'Activa la segunda capa',text:'Activa la casilla para mezclar otro instrumento con el sonido principal.'},
    {selector:'#stringsLayerVolume',title:'Mezcla la capa',text:'Elige el instrumento adicional y ajusta su volumen independientemente.'},
    {selector:'#keyColorToggle',title:'Color al tocar',text:'Cambia los colores con los que se iluminan la melodía y el bajo.'},
    {selector:'#keyboardRangeToggle',title:'Rango y tamaño',text:'Elige 18, 25 o 88 teclas, ajusta su tamaño y desplázate por octavas.',prepare:()=>guidedOpenPopover('keyboardRangeMenu')},
    {selector:'#keyboardNavigation',title:'Desplaza el teclado',text:'Usa las flechas para moverte por octavas y los botones para mostrar más o menos teclas.'},
    {selector:'#notationToggle',title:'Nombres de las notas',text:'Muestra etiquetas en cifrado americano, latino, por octavas o grados.',prepare:()=>guidedOpenPopover('notationMenu')},
    {selector:'#settingsToggle',title:'Volumen y efectos',text:'Abre los ajustes del piano para controlar el volumen general, las barras y sus efectos.',prepare:openPlayerSettingsScreen},
    {selector:'#masterVolume',title:'Volumen del piano',text:'Ajusta el instrumento principal; cada capa conserva su propio volumen.'},
    {selector:'#sustainBtn',title:'Sustain',text:'Mantiene las notas sonando un poco después de soltar la tecla, como el pedal de un piano.'}
  ],
  crear:[
    {selector:'#createView .create-mobile-header',title:'Graba una alabanza completa',text:'Elige una canción para crear la melodía y sus acompañamientos como pistas separadas.'},
    {selector:'#createSearch',title:'Encuentra la alabanza',text:'Busca por título para abrir rápidamente la canción que vas a grabar.'},
    {selector:'#createList',title:'Selecciona una canción',text:'Toca una alabanza de la lista. Luego pulsa Continuar para elegir qué pista grabar.'},
    {selector:'#createContinueBtn',title:'Continúa a las pistas',text:'Aquí eliges entre melodía, dos acompañamientos o configurar sus instrumentos.'}
  ],
  grabar:[
    {selector:'#createTrackScreen [data-record-track="melodia"]',title:'Graba la melodía',text:'Entra al piano y toca la melodía completa en tiempo real. El instrumento escogido queda guardado para esta pista.'},
    {selector:'#createTrackScreen [data-record-track="acompanamiento1"]',title:'Primer acompañamiento',text:'Graba el bajo, acordes u otra parte completa sin asignar acordes nota por nota.'},
    {selector:'#createTrackScreen [data-record-track="acompanamiento2"]',title:'Segundo acompañamiento',text:'Añade otra interpretación independiente, por ejemplo cuerdas o un refuerzo.'},
    {selector:'#createTrackScreen [data-open-song-track-settings]',title:'Ajusta instrumentos y capas',text:'Elige un sonido por pista. La segunda capa está apagada hasta que la actives.'}
  ],
  modo:[
    {selector:'#playModeModal .mode-side-actions',title:'Escucha o configura',text:'Puedes observar la alabanza completa o abrir los ajustes de manos, colores e instrumentos.'},
    {selector:'#playModeModal .mode-cards',title:'Elige qué practicar',text:'Practica la melodía o escucha la segunda y tercera voz por separado.'},
    {selector:'#playModeModal .mode-detail-nav',title:'Más detalles',text:'Consulta las instrucciones, la dirección de las voces y los ajustes de color e instrumentos.'},
    {selector:'#modePanelTitle',title:'Instrucciones del modo',text:'Este panel explica lo que hará la opción que seleccionaste.'},
    {selector:'#modeStartBtn',title:'Entra al piano',text:'Cuando tengas lista tu opción, pulsa Continuar para empezar.'}
  ],
  instrumentos:[
    {selector:'#modeBassInstrument',title:'Acompañamiento 1',text:'Elige el instrumento de la primera pista de acompañamiento.'},
    {selector:'#modeMelodyInstrument',title:'Pista de melodía',text:'Elige el sonido de la melodía principal, que se muestra para la mano derecha.'},
    {selector:'#previewBassSound',title:'Prueba el sonido',text:'Escucha una nota de muestra antes de decidir qué instrumento usar.'},
    {selector:'#modeSecondDirection',title:'Dirección de las armonías',text:'Decide si la segunda y tercera voz deben sonar por encima o por debajo de la melodía.'},
    {selector:'.instrument-settings-footer',title:'Cambios guardados',text:'Los ajustes se guardan automáticamente. Puedes restaurar valores o volver a elegir colores.'}
  ],
  instrumentosGrabacion:[
    {selector:'#songSettingsTrack',title:'Selecciona una pista',text:'Cada alabanza tiene ajustes separados para melodía y sus dos acompañamientos.'},
    {selector:'#songTrackInstrument',title:'Elige el sonido principal',text:'Este instrumento queda asignado a la pista seleccionada y se usa al reproducirla.'},
    {selector:'#songTrackLayerEnabled',title:'Capa opcional',text:'Actívala solo si quieres mezclar otro sonido en esta pista.'},
    {selector:'#songTrackLayerInstrument',title:'Sonido y mezcla',text:'Escoge el instrumento de la capa y ajusta cuánto se escucha.'}
  ],
  configuracion:[
    {selector:'#deviceSettingsScreen .device-settings-nav',title:'Categorías de ajustes',text:'Elige apariencia, colores, textos, teclado, sonido o biblioteca de instrumentos.'},
    {selector:'#deviceSettingsScreen .device-settings-content',title:'Ajusta cada opción',text:'Los controles cambian solo este dispositivo. Los colores se editan por separado para tema claro y oscuro.'},
    {selector:'#deviceSettingsPreview',title:'Vista previa',text:'Cuando una categoría tiene vista previa, aquí puedes ver el efecto de tus cambios antes de salir.'},
    {selector:'#replayQuickGuide',title:'Vuelve a abrir esta guía',text:'Puedes reiniciar aquí los recorridos iniciales y volver a verlos desde el menú.'}
  ],
  piano:[
    {selector:'#keyboard',title:'Teclado y notas',text:'Toca las teclas para practicar. Las barras muestran las notas que tocas o que suenan durante la reproducción.'},
    {selector:'#instrumentToggle',title:'Instrumento y capas',text:'Selecciona un sonido principal y, si quieres, mezcla otro desde Segunda capa.',prepare:()=>guidedOpenPopover('instrumentMenu')},
    {selector:'#stringsLayerToggle',title:'Activa la segunda capa',text:'Marca esta opción para que el segundo instrumento suene junto con el principal.'},
    {selector:'#stringsLayerVolume',title:'Controla la mezcla',text:'Escoge el instrumento de la capa y ajusta cuánto se escucha.',},
    {selector:'#playMelody',title:'Escucha o reproduce',text:'Inicia la melodía guardada. Puedes detenerla o volver a escucharla desde estos controles.'},
    {selector:'#sustainBtn',title:'Sustain y octava',text:'Activa sustain para prolongar el sonido o el doblado a la octava para enriquecer las notas.'},
    {selector:'#keyboardRangeToggle',title:'Ajusta el teclado',text:'Cambia el número y tamaño de las teclas visibles y navega por octavas.',prepare:()=>guidedOpenPopover('keyboardRangeMenu')},
    {selector:'#notationToggle',title:'Elige cómo leer las notas',text:'Activa cifrado americano, latino, nombres de octava, grados u oculta las etiquetas.',prepare:()=>guidedOpenPopover('notationMenu')},
    {selector:'#keyColorToggle',title:'Color de las notas',text:'Personaliza cómo se iluminan las notas de melodía y las del bajo.'},
    {selector:'#settingsToggle',title:'Sonido y efectos',text:'Desde Configuración ajustas volumen general, estilo de barras, destellos y otras opciones.',prepare:openPlayerSettingsScreen},
    {selector:'#masterVolume',title:'Volumen del piano',text:'Sube o baja el instrumento principal sin cambiar el volumen de las capas.'}
  ]
};
let activeGuidedTour=null,guidedTourInitialized=false,guidedTourTimer=0;
function ensureGuidedTour(){
  if(guidedTourInitialized)return;
  const tour=document.createElement('div');tour.id='guidedTour';tour.className='guided-tour hidden';tour.innerHTML='<div class="guided-tour-backdrop"></div><div class="guided-tour-spotlight" aria-hidden="true"></div><section class="guided-tour-card" role="dialog" aria-modal="true" aria-labelledby="guidedTourTitle" aria-describedby="guidedTourText"><div class="guided-tour-kicker"><span class="guided-tour-spark">✦</span> GUÍA RÁPIDA <span id="guidedTourStep"></span></div><button type="button" class="guided-tour-close" aria-label="Cerrar guía">×</button><div class="guided-tour-progress" aria-hidden="true"><i></i></div><h2 id="guidedTourTitle"></h2><p id="guidedTourText"></p><footer><button type="button" class="guided-tour-skip">Saltar recorrido</button><div><button type="button" class="guided-tour-back" aria-label="Paso anterior">Anterior</button><button type="button" class="guided-tour-next">Siguiente</button></div></footer></section>';
  document.body.appendChild(tour);
  tour.querySelector('.guided-tour-skip').onclick=finishGuidedTour;
  tour.querySelector('.guided-tour-close').onclick=finishGuidedTour;
  tour.querySelector('.guided-tour-next').onclick=()=>moveGuidedTour(1);
  tour.querySelector('.guided-tour-back').onclick=()=>moveGuidedTour(-1);
  tour.querySelector('.guided-tour-backdrop').onclick=finishGuidedTour;
  window.addEventListener('resize',positionGuidedSpotlight,{passive:true});
  window.addEventListener('scroll',positionGuidedSpotlight,{passive:true,capture:true});
  document.addEventListener('keydown',event=>{
    if(!activeGuidedTour)return;
    if(event.key==='Escape'){finishGuidedTour();return;}
    if(event.key==='Tab'){
      const focusable=[...$('guidedTour').querySelectorAll('button:not(:disabled)')],first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  guidedTourInitialized=true;
}
function queueGuidedTour(id,delay=420){
  clearTimeout(guidedTourTimer);
  guidedTourTimer=setTimeout(()=>startGuidedTour(id),delay);
}
function startGuidedTour(id){
  let alreadyDone=false;try{alreadyDone=safeStorageGetItem(`yhwh_guided_tour_${id}_v1`)==='done';}catch(_){ }
  if(activeGuidedTour||alreadyDone)return;
  const steps=GUIDED_TOUR_STEPS[id];if(!steps?.length)return;
  ensureGuidedTour();activeGuidedTour={id,steps,index:0};$('guidedTour').classList.remove('hidden');showGuidedTourStep();
}
function guidedOpenPopover(id){
  if(!$(id))return;
  closePlayerPopovers(id);
  $(id).classList.remove('hidden');
}
function guidedStepIsVisible(step){
  const target=document.querySelector(step.selector);if(!target||!target.isConnected)return false;
  const style=getComputedStyle(target);return target.getClientRects().length>0&&style.visibility!=='hidden'&&style.display!=='none';
}
function showGuidedTourStep(){
  if(!activeGuidedTour)return;
  const {steps}=activeGuidedTour;let {index}=activeGuidedTour,step,target;
  while(index>=0&&index<steps.length){step=steps[index];step.prepare?.();if(guidedStepIsVisible(step)){target=document.querySelector(step.selector);break;}index+=1;}
  if(!target){if(index>=steps.length)finishGuidedTour();else finishGuidedTour();return;}
  activeGuidedTour.index=index;
  target.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
  $('guidedTourTitle').textContent=step.title;$('guidedTourText').textContent=step.text;$('guidedTourStep').textContent=`${index+1} / ${steps.length}`;
  $('guidedTour').querySelector('.guided-tour-back').disabled=index===0;
  $('guidedTour').querySelector('.guided-tour-next').textContent=index===steps.length-1?'Terminar':'Siguiente';
  $('guidedTour').querySelector('.guided-tour-progress i').style.width=`${((index+1)/steps.length)*100}%`;
  requestAnimationFrame(()=>setTimeout(()=>{positionGuidedSpotlight();$('guidedTour')?.querySelector('.guided-tour-next')?.focus({preventScroll:true});},80));
}
function positionGuidedSpotlight(){
  if(!activeGuidedTour)return;
  const target=document.querySelector(activeGuidedTour.steps[activeGuidedTour.index].selector),spotlight=$('guidedTour')?.querySelector('.guided-tour-spotlight');
  if(!target||!spotlight)return;
  const rect=target.getBoundingClientRect();Object.assign(spotlight.style,{left:`${Math.max(4,rect.left-4)}px`,top:`${Math.max(4,rect.top-4)}px`,width:`${Math.max(0,rect.width+8)}px`,height:`${Math.max(0,rect.height+8)}px`});
}
function moveGuidedTour(direction){
  if(!activeGuidedTour)return;
  let next=activeGuidedTour.index+direction;
  if(next<0)return;if(next>=activeGuidedTour.steps.length){finishGuidedTour();return;}
  const steps=activeGuidedTour.steps;
  while(next>=0&&next<steps.length){steps[next].prepare?.();if(guidedStepIsVisible(steps[next]))break;next+=direction;}
  if(next<0)return;if(next>=steps.length){finishGuidedTour();return;}
  activeGuidedTour.index=next;showGuidedTourStep();
}
function finishGuidedTour(){
  if(!activeGuidedTour)return;
  try{localStorage.setItem(`yhwh_guided_tour_${activeGuidedTour.id}_v1`,'done');}catch(_){ }
  $('guidedTour')?.classList.add('hidden');const spotlight=$('guidedTour')?.querySelector('.guided-tour-spotlight');if(spotlight)spotlight.removeAttribute('style');activeGuidedTour=null;
}
function replayQuickGuide(){
  clearTimeout(guidedTourTimer);finishGuidedTour();
  try{Object.keys(localStorage).filter(key=>key.startsWith('yhwh_guided_tour_')&&key.endsWith('_v1')).forEach(key=>localStorage.removeItem(key));}catch(_){ }
  $('closeDeviceSettings')?.click();queueGuidedTour('home',520);
}
function setView(view) {
  if(view==='crear'&&!state.admin){toast('Solo Admin puede entrar a Crear melodía.');return;}
  if(!$('player').classList.contains('hidden')&&!confirmDiscardUnsavedMelody())return;
  stopMetronome();
  state.view = view;
  document.body.classList.toggle('home-active',view==='home');
  document.body.classList.toggle('song-list-active',view==='adoracion'||view==='jubilo');
  document.body.classList.toggle('create-list-active',view==='crear');
  stopPlayback({suspendAudio:true});
  
  const target={home:'homeView',adoracion:'songView',jubilo:'songView',crear:'createView',teoria:'theoryScreen'}[view]||'homeView';
  transitionScreen(target,['homeView','songView','createView','createTrackScreen','player','instrumentSettingsScreen','theoryScreen']);
  document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  renderLists();  window.scrollTo(0, 0);
  if(view==='adoracion'||view==='jubilo'||view==='crear')queueGuidedTour(view);
}
function openFreePlay() {
  if(state.melodyDirty&&!confirmDiscardUnsavedMelody())return;
  stopPlayback();stopMetronome();closePlayerPopovers();
  clearSongIntro();
  document.body.classList.remove('song-title-visible');
  state.song=null;state.view='libre';state.category='adoracion';state.melodyType='introduccion';state.notes=[];state.chords=[];state.chordTarget=null;state.transpose=0;state.melodyDirty=false;state.recording=false;state.lastMidi=null;chordEditorOpen=false;applySongTrackInstrument(freePlayInstrumentConfig);
  // Prepara el instrumento y la capa guardados para que Reproducción libre no empiece fría.
  primeAudioForInstrument(state.instrument);if(state.stringsLayerEnabled)primeStringsLayer();
  document.body.classList.remove('home-active');
  document.body.classList.remove('song-list-active');
  document.body.classList.remove('create-list-active');
  $('songTitle').textContent='Reproducción libre';$('songMeta').textContent='Toca, explora acordes y practica a tu ritmo.';
  updateTrackTimeline();
  $('playerLabel').textContent='Reproducción libre';$('activeKeyName').textContent='';$('activeKeyName').disabled=true;$('status').textContent='Toca las teclas para escuchar.';$('currentNote').textContent='';$('activeChordLabel').textContent='';
  $('voiceMixer').classList.add('hidden');$('notesPanel').dataset.open='';$('notesPanel').classList.add('hidden');$('lyricsPanel').classList.add('hidden');$('chordEditorPanel').classList.add('hidden');
  renderRecorded();updateAdminControls();transitionScreen('player',['homeView','songView','createView','player']);
  queueGuidedTour('libre');
  setTimeout(startKeyboardAtC4,170);window.scrollTo(0,0);
}
function chordNames(song) {
  const content = String(song.content || '').replace(/\[[^\]]*\]/g, ' ');
  const found = content.match(/(?<![A-Za-z0-9])(?:[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?)(?![A-Za-z])/g) || [];
  return [...new Set(found)].slice(0, 32);
}
function isChordOnlyLine(line){
  const value=String(line||'').trim();if(!value||value[0]==='['||/^(MELOD|HABLADO)/i.test(value))return false;
  const withoutChords=value.replace(/[A-G][b#]?(?:m(?:aj)?|M|dim|aug|sus[24]?|add[0-9]?|[679]|[24])?/g,'');
  const residue=withoutChords.replace(/[-|\s\[\]X0-9().#]+/g,'');return residue.length/Math.max(value.length,1)<0.22;
}
function renderSongLyrics(){
  const target=$('lyrics');if(!target||!state.song)return;const song=state.song.song;const preferFlats=/b/.test(String(song.tono||''));const lines=String(song.content||'').replace(/\r/g,'').split('\n');
  target.innerHTML=lines.map(raw=>{
    const trimmed=raw.trim();if(!trimmed)return '<span class="lb"></span>';
    if(trimmed[0]==='[')return `<span class="ls">${escapeHTML(trimmed)}</span>`;
    if(isChordOnlyLine(raw)){
      return `<span class="lc">${renderClickableChordLine(raw,preferFlats)}</span>`;
    }
    if(/^[0-9]+\.\s/.test(trimmed)||/^(COMPOSITOR|VERS|ALBU|TONO)/.test(trimmed))return `<span class="lm">${escapeHTML(trimmed)}</span>`;
    return `<span class="ll">${escapeHTML(raw)}</span>`;
  }).join('');
}
function renderClickableChordLine(line,preferFlats){
  const chordLine=transposeChordLineForViewer(line,preferFlats);const expression=/([A-G](?:#|b)?(?:m7b5|mMaj7|maj7|m(?:aj)?7?|dim7?|aug|sus[24]?|add\d*|M|7|6|9|5|4|2)?(?:\/[A-G](?:#|b)?)?)(?=[^a-z]|$)/g;
  return chordLine.replace(expression,shown=>`<button type="button" class="lyrics-chord${state.selectedSongChord===shown?' selected':''}" data-play-chord="${escapeHTML(shown)}" aria-label="Escuchar acorde ${escapeHTML(shown)}">${escapeHTML(shown)}</button>`).replace(/(?<!>)\b(X[0-9]+)\b/g,'<span class="word-repeticion">$1</span>');
}
function transposeChordLineForViewer(line,preferFlats){
  const shift=displayShift();if(!shift)return line;const expression=/([A-G](?:#|b)?(?:m7b5|mMaj7|maj7|m(?:aj)?7?|dim7?|aug|sus[24]?|add\d*|M|7|6|9|5|4|2)?(?:\/[A-G](?:#|b)?)?)(?=[^a-z]|$)/g;let result='',position=0,match;
  while((match=expression.exec(line))!==null){result+=line.slice(position,match.index);if(result.length>match.index){const spaces=result.match(/ *$/)?.[0].length||0;const remove=Math.min(result.length-match.index,Math.max(0,spaces-1));if(remove)result=result.slice(0,-remove);}else if(result.length<match.index)result+=' '.repeat(match.index-result.length);result+=transposeChordName(match[0],shift,preferFlats);position=match.index+match[0].length;}
  return result+line.slice(position);
}
function parsePianoChord(symbol){
  const match=String(symbol||'').replace(/\s/g,'').match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);if(!match)return null;
  const root=FLAT_TO_SHARP[match[1]]||match[1];const suffix=match[2];const qualities={major:'major',m:'minor',min:'minor',minor:'minor',m7b5:'m7b5','ø':'m7b5',dim:'dim',dim7:'dim7',aug:'aug',sus2:'sus2',sus4:'sus4',sus:'sus4',7:'7',maj7:'maj7',m7:'m7',min7:'m7',mMaj7:'mMaj7',M7:'maj7',6:'6',add9:'add9',9:'7',m9:'m7',5:'5'};
  return {root,quality:qualities[suffix]||'major',bass:match[3]?FLAT_TO_SHARP[match[3]]||match[3]:null};
}
function songChordDisplay(chord,symbol){
  if(state.notation!=='latino')return symbol;
  const names={C:'Do',D:'Re',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'};
  const suffix={major:'',minor:'m',dim:'dim',dim7:'dim7',m7b5:'m7♭5',aug:'aum',sus2:'sus2',sus4:'sus4','7':'7',maj7:'maj7',m7:'m7',mMaj7:'mMaj7','6':'6',add9:'add9','5':'5'}[chord.quality]||'';
  return (names[chord.root[0]]||chord.root[0])+chord.root.slice(1)+suffix;
}
function playSongChord(symbol,sourceElement){
  const chord=parsePianoChord(symbol);if(!chord)return;stopPlayback();
  state.selectedSongChord=symbol;document.querySelectorAll('#lyrics .lyrics-chord.selected').forEach(button=>button.classList.remove('selected'));sourceElement?.classList.add('selected');document.querySelectorAll('#keyboard .key.chord-selected').forEach(key=>key.classList.remove('chord-selected'));
  chordMidiNotes({...chord,octave:60,noTranspose:true}).forEach(midi=>document.querySelector(`.key[data-midi="${midi}"]`)?.classList.add('chord-selected'));
  const display=songChordDisplay(chord,symbol);
  $('status').textContent=`Acorde ${display} · sonando en el piano.`;$('currentNote').textContent=display;$('currentNote').style.opacity='1';
  document.querySelector('.piano-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
  playChord({...chord,octave:60,duration:1.8,preview:true,noTranspose:true});
}
