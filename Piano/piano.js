// Piano YHWH: lista de canciones primero; Firebase es opcional al arrancar.
const $ = (id) => document.getElementById(id);
const SONGS_ADORACION = Array.isArray(window.SONGS) ? window.SONGS : [];
const SONGS_JUBILO = Array.isArray(window.SONGS_JUBILO) ? window.SONGS_JUBILO : [];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_LATINO = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTE_ROOT_LATINO = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
const LAST_HEARD_STORAGE_KEY = 'yhwh_last_heard_song';
const state = {
  view: 'home', category: 'adoracion', song: null, melodyType:'introduccion', voiceMix:{principal:true,segunda:false,tercera:false,acordes:true}, voiceDirection:{segunda:localStorage.getItem('yhwh_voice_second_direction')==='up'?'up':'down',tercera:localStorage.getItem('yhwh_voice_third_direction')==='up'?'up':'down'}, pendingSong:null, pendingPurpose:'listen', admin: false, selectedSongChord:null, theoryChord: { root:'C', quality:'major' }, theoryCircleChord: null, theoryCircleIndex:0, theoryCircleMinor:false, theoryCircleChords:null, theoryScale:'major', theoryInterval:7, theoryPianoIntervals:null, theoryPianoMode:'chord',
  melodies: readMelodyCache(), melodyDirty:false, recording: false, recordStart: 0, notes: [], chords: [], chordTarget: null, melodySoundEnabled:localStorage.getItem('yhwh_melody_sound_enabled')!=='0', bassSoundEnabled:localStorage.getItem('yhwh_bass_sound_enabled')!=='0',
  buffers: new Map(), instrumentBuffers: new Map(), sampleLoads:new Map(), instrumentSampleLoads:new Map(), instrument: ['steinway-grand','trumpet-real'].includes(localStorage.getItem('yhwh_piano_instrument')) ? localStorage.getItem('yhwh_piano_instrument') : 'grand-piano', bassInstrument: ['grand-piano','steinway-grand','trumpet-real'].includes(localStorage.getItem('yhwh_piano_bass_instrument')) ? localStorage.getItem('yhwh_piano_bass_instrument') : 'grand-piano', trumpetIntensity: localStorage.getItem('yhwh_piano_trumpet_intensity') === 'soft' ? 'soft' : 'strong', sustain: localStorage.getItem('yhwh_piano_sustain') === '1', tempo:Math.min(1.5,Math.max(.5,Number(localStorage.getItem('yhwh_piano_tempo'))||1)), playing: false, playTimers: [], activePlaybackSources:[], activePointers: new Map(), keyboardOctaveMidi:60, keyboardZoom:Math.min(1.8,Math.max(0.17,Number(localStorage.getItem('yhwh_piano_keyboard_zoom'))||1)), transpose: 0, originalTonic: 'C', songTonic: null,
  notation: ['ninguno','octavas','americano','latino','movil','grados','simple'].includes(localStorage.getItem('yhwh_piano_note_labels')) ? localStorage.getItem('yhwh_piano_note_labels') : (localStorage.getItem('yhwh_cifrado_latino') === '1' ? 'latino' : 'americano'), showChordNames:localStorage.getItem('yhwh_piano_show_chords')!=='0', showRecordedNotes:localStorage.getItem('yhwh_piano_show_recorded')!=='0', keyColor:/^#[0-9a-f]{6}$/i.test(localStorage.getItem('yhwh_piano_key_color')||'')?localStorage.getItem('yhwh_piano_key_color'):'#90dd4a', bassColor:/^#[0-9a-f]{6}$/i.test(localStorage.getItem('yhwh_piano_bass_color')||'')?localStorage.getItem('yhwh_piano_bass_color'):'#bb82ef', lastMidi: null, db: null, auth: null,
  ref: null, set: null, onValue: null, signIn: null, signOut: null, authListener: null
};
let screenTransitionTimer = null;
let selectedSongForContinue = null;
let selectedPlayMode = 'listen';
let selectedModeTab = 'instructions';
let liveTheoryMode = 'key';
let practiceRun = null;
let listPreviewRun = null;
let songListFilter = 'all';
let songIntroTimer = null;
let songIntroStartTimer = null;
let songIntroEndHandler = null;
let songIntroAutoplay = false;
let timelineFrame = 0;
let timelineDuration = 0;
let timelineStartedAt = 0;
let fallingNotesFrame = 0;
let fallingNotesRun = null;
let fallingNotesGeometry = null;
let fallingNotesCanvasInfo = null;
let fallingNotesCanvasDirty = true;
let fallingNotesResizeObserver = null;
let fallingNotesVisibilityBound = false;
let fallingNotesLastFrame = 0;
// Reloj suave: en iPhone AudioContext.currentTime avanza a saltos; se interpola con performance.now().
let playbackClockOffset = null, playbackClockLast = 0;
function resetPlaybackClock(){playbackClockOffset=null;playbackClockLast=0;}
function playbackNow(frameMs){
  const context=audioContext;if(!context)return 0;
  const perf=performance.now()/1000,audio=context.currentTime,sample=audio-perf;
  // El desfase se suaviza en ambos sentidos: currentTime en móvil avanza a saltos y esos saltos no deben mover las barras.
  // Solo se re-sincroniza de golpe si la diferencia es grande (pausa del contexto, cambio de pestaña, etc.).
  if(playbackClockOffset===null||Math.abs(sample-playbackClockOffset)>.15)playbackClockOffset=sample;
  else playbackClockOffset+=(sample-playbackClockOffset)*.03;
  // Se usa la marca de tiempo del frame (vsync) que entrega requestAnimationFrame, no el instante en que arranca el callback:
  // así el avance es uniforme aunque el hilo principal se retrase un poco en el móvil.
  const frame=(typeof frameMs==='number'&&frameMs>0)?frameMs/1000:perf;
  const value=Math.max(playbackClockLast,frame+playbackClockOffset);
  playbackClockLast=value;return value;
}
let keyBaseWidthCache = 0;
let stageGridElement = null, stageLastKeyWidth = -1, stageLastScroll = -1;
let pinchFlush = null;
const timelineCache = { elapsed:'', duration:'', ratio:-1, percent:-1, empty:null };
const FALLING_NOTES_MAX_LOOKAHEAD = 6;
let fallingNotesStyle = (()=>{try{const v=localStorage.getItem('yhwh_piano_barstyle');return v==='melody'||v==='drops'||v==='off'?v:'bars';}catch(_){return 'bars';}})();
let fallingNotesLookahead = (()=>{try{const v=parseFloat(localStorage.getItem('yhwh_piano_lookahead'));return v>=0.8&&v<=6?v:2.1;}catch(_){return 2.1;}})();
const FALLING_NOTES_FRAME_MS = 1000 / 60 - 3;
// Opciones de rendimiento (Ajustes). Por defecto todo queda como estaba; el usuario puede apagar cada efecto.
const SHOW_PLAYER_TIMELINE = true; // línea de tiempo (0:00 ——— 0:00) visible; pon false para quitarla
const perfOption=(key)=>{try{return localStorage.getItem(key)!=='0';}catch(_){return true;}};
let fxGlow=perfOption('yhwh_piano_fx_glow');        // brillo y partículas al impacto de las barras
let lightKeys=perfOption('yhwh_piano_light_keys');  // encender las teclas mientras suena la melodía
let keyEdge=(()=>{try{return localStorage.getItem('yhwh_piano_key_edge')==='1';}catch(_){return false;}})(); // destello ligero solo en el borde de la tecla (apagado por defecto)
let keyColorOn=perfOption('yhwh_piano_key_color_on'); // color en las teclas encendidas (apagado = gris neutro)
let theorySequenceTimers = [];
let offlineAudioDownloadRunning = false;
let metronomeOn = false;
let metronomeTimer = null;
let metronomeNextBeat = 0;
let metronomeBeatIndex = 0;
let metronomeVisualTimers = [];
let metronomeTaps = [];
let chordEditorOpen = false;
const canvasPointers = new Map();
let canvasGesture = null;
let metronomeBpm = Math.min(240, Math.max(40, Number(localStorage.getItem('yhwh_piano_metronome_bpm')) || 100));
let metronomeMeter = ['2', '3', '4', '6'].includes(localStorage.getItem('yhwh_piano_metronome_meter')) ? Number(localStorage.getItem('yhwh_piano_metronome_meter')) : 4;

function readMelodyCache() {
  try { return JSON.parse(localStorage.getItem('yhwh_melodias_cache') || '{}') || {}; }
  catch (_) { return {}; }
}
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); setTimeout(() => $('toast').classList.remove('show'), 2400); }
function canonicalNoteName(midi) { return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1); }
function noteName(midi) {
  const names = state.notation === 'latino' ? NOTE_NAMES_LATINO : NOTE_NAMES;
  return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}
function keyboardLabel(midi) {
  const pitch=((midi%12)+12)%12, octave=Math.floor(midi/12)-1;
  if(state.notation==='ninguno')return '';
  if(state.notation==='octavas')return pitch===0?`C${octave}`:'';
  if(state.notation==='simple')return NOTE_NAMES[pitch].replace('#','♯');
  if(state.notation==='movil'||state.notation==='grados'){
    const tonic=state.song?(transposedTonic()||state.songTonic||'C'):'C', rootName=tonic.replace(/m$/,''), root=NOTE_NAMES.indexOf(rootName);
    const intervals=tonic.endsWith('m')?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];
    const relative=(pitch-root+12)%12, degree=intervals.indexOf(relative);
    const upper=intervals.findIndex(item=>item>relative),lower=Math.max(0,upper-1);
    if(state.notation==='grados')return degree>=0?String(degree+1):upper<0?'♭1':relative-intervals[lower]<(intervals[upper]-relative)?`♯${lower+1}`:`♭${upper+1}`;
    const syllables=tonic.endsWith('m')?['La','Si','Do','Re','Mi','Fa','Sol']:['Do','Re','Mi','Fa','Sol','La','Si'];
    const chromatic=tonic.endsWith('m')?['La','Li','Si','Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Ti']:['Do','Di','Re','Ri','Mi','Fa','Fi','Sol','Si','La','Li','Ti'];
    return degree>=0?syllables[degree]:chromatic[relative]||'Do';
  }
  if(state.notation==='latino'){const name=NOTE_NAMES_LATINO[pitch];return pitch===0?`${name}${octave}`:name;}
  return noteName(midi);
}
function melodyFor(category, id) { return state.melodies[category]?.[String(id)] || null; }
function melodyTracks(record){
  if(!record)return {introduccion:null,voz:null};
  if(Object.prototype.hasOwnProperty.call(record,'introduccion')||Object.prototype.hasOwnProperty.call(record,'voz'))return {introduccion:record.introduccion||null,voz:record.voz||null};
  return {introduccion:Array.isArray(record.notas)?record:null,voz:null};
}
function trackFor(category,id,type=state.melodyType){return melodyTracks(melodyFor(category,id))[type]||null;}
function hasTrack(category,id,type){return !!trackFor(category,id,type)?.notas?.length;}
function hasMelody(category, id) { return hasTrack(category,id,'introduccion')||hasTrack(category,id,'voz'); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

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
    const saved=JSON.parse(localStorage.getItem(LAST_HEARD_STORAGE_KEY)||'[]');
    if(Array.isArray(saved))recent=saved;
    else if(saved?.title){const category=saved.category==='jubilo'?'jubilo':'adoracion',song=songsFor(category).find(candidate=>candidate.title===saved.title);if(song)recent=[{id:String(song.id),category,playedAt:saved.playedAt||Date.now()}];}
  }catch(_){}
  const entries=recent.map(item=>{
    const category=item.category==='jubilo'?'jubilo':'adoracion';
    const song=songsFor(category).find(candidate=>String(candidate.id)===String(item.id));
    return song?{song,category,playedAt:item.playedAt}:null;
  }).filter(Boolean).slice(0,5);
  list.innerHTML=entries.length?entries.map(({song,category,playedAt})=>`<button class="home-recent-row" type="button" data-recent-song-id="${escapeHTML(song.id)}" data-category="${category}" aria-label="Reproducir ${escapeHTML(song.title||'Alabanza')}"><span class="home-recent-title">${escapeHTML(song.title||'Alabanza')}</span><span class="home-recent-time">${recentPlaybackTime(playedAt)}</span><span class="home-recent-arrow" aria-hidden="true">›</span></button>`).join(''):'<p class="home-recent-empty">Las alabanzas que escuches aparecerán aquí.</p>';
}
function rememberLastHeardSong(song,category){
  if(!song)return;
  const item={id:String(song.id),category:category==='jubilo'?'jubilo':'adoracion',playedAt:Date.now()};
  let recent=[];try{const saved=JSON.parse(localStorage.getItem(LAST_HEARD_STORAGE_KEY)||'[]');if(Array.isArray(saved))recent=saved;}catch(_){}
  recent=[item,...recent.filter(old=>String(old.id)!==item.id||old.category!==item.category)].slice(0,5);
  try{localStorage.setItem(LAST_HEARD_STORAGE_KEY,JSON.stringify(recent));}catch(_){}
  renderRecentSongs();
}
async function previewSongInList(song,category,button){
  if(listPreviewRun?.songId===String(song.id)){stopListPreview();return;}
  stopListPreview();button.classList.add('is-playing');button.textContent='…';
  const track=trackFor(category,song.id,'introduccion')||trackFor(category,song.id,'voz');
  const notes=track?.notas||[];if(!notes.length){button.classList.remove('is-playing');button.textContent='▶';return;}
  try{
    const prepared=await prepareMelodyAudio(notes),context=getAudioContext(),start=context.currentTime+.08,sources=[];
    if(!button.isConnected)return;
    notes.forEach(note=>{const midi=Number(note.midi),entry=prepared.get(midi);if(!entry)return;const source=context.createBufferSource(),gain=context.createGain(),when=start+Math.max(0,Number(note.start)||0),duration=Math.max(.08,Number(note.duration)||.3);source.buffer=entry.buffer;source.playbackRate.value=2**((midi-entry.sampleMidi)/12);gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(.72,when+.02);gain.gain.setValueAtTime(.72,when+duration);gain.gain.linearRampToValueAtTime(.0001,when+duration+.28);source.connect(gain);gain.connect(context.destination);source.start(when);source.stop(when+duration+.3);sources.push(source);});
    const previewDuration=Math.max(1.2,...notes.map(note=>((Number(note.start)||0)+(Number(note.duration)||.3)+.4)/state.tempo));button.closest('.selected-audio-preview')?.style.setProperty('--preview-duration',previewDuration+'s');button.closest('.selected-audio-preview')?.classList.add('is-playing');listPreviewRun={songId:String(song.id),sources,button,timer:setTimeout(stopListPreview,previewDuration*1000)};rememberLastHeardSong(song,category);
    button.textContent='■';button.classList.add('is-playing');button.setAttribute('aria-label','Detener vista previa');
  }catch(error){console.error('Vista previa no disponible',error);button.classList.remove('is-playing');button.textContent='▶';toast('No se pudo cargar el audio de vista previa.');}
}
const SONG_CHIP_ICONS={
  intro:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M8 13v6M12 13v6M16 13v6"/></svg>',
  voz:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>'
};
function createCard(song, category, showMelodyBadge) {
  const tracks=melodyTracks(melodyFor(category,song.id));
  const hasIntro=!!tracks.introduccion?.notas?.length,hasVoice=!!tracks.voz?.notas?.length;
  const chips=[];
  if(hasIntro)chips.push(`<span class="song-chip intro">${SONG_CHIP_ICONS.intro}Intro</span>`);
  if(hasVoice)chips.push(`<span class="song-chip voice">${SONG_CHIP_ICONS.voz}Voz</span>`);
  if(!showMelodyBadge&&!chips.length)chips.push('<span class="song-chip create">＋ Crear</span>');
  const key=String(song.tono||'').trim();
  const action=showMelodyBadge?'':(hasIntro||hasVoice?'Editar melodía':'Crear melodía');
  if(showMelodyBadge)return `<article class="song-card song-card-selectable${selectedSongForContinue&&String(selectedSongForContinue.song.id)===String(song.id)&&selectedSongForContinue.category===category?' selected':''}" data-song-id="${escapeHTML(song.id)}" data-category="${category}">
    <button class="song-card-main" type="button" aria-label="Seleccionar ${escapeHTML(song.title||'Alabanza')}"><span class="song-key"${key?` title="Tono ${escapeHTML(key)}"`:''}>${key?escapeHTML(key):'♪'}</span><span class="song-info"><b>${escapeHTML(song.title||'Alabanza')}</b><small>${song.compositor?escapeHTML(song.compositor):''}</small></span>${chips.length?`<span class="song-chips">${chips.join('')}</span>`:''}</button></article>`;
  return `<button class="song-card" data-song-id="${escapeHTML(song.id)}" data-category="${category}"${action?` title="${action}"`:''}>
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
  if($('createCount'))$('createCount').textContent = `${allSongs.length} ${allSongs.length === 1 ? 'alabanza' : 'alabanzas'}`;
  if($('createFooterCount'))$('createFooterCount').textContent=`${allSongs.length} ${allSongs.length===1?'alabanza':'alabanzas'}`;
  const createGroup = (cat, label) => {
    const items = createResults.filter(item => item.category === cat);
    if (!items.length) return '';
    const total = allSongs.filter(item => item.category === cat).length;
    return `<h2 class="song-group-title" data-category="${cat}"><span>${label}</span><small>${total}</small></h2>` + items.map(({ song }) => createCard(song, cat, false)).join('');
  };
  $('createList').innerHTML = allSongs.length
    ? createGroup('adoracion', 'Adoración') + createGroup('jubilo', 'Júbilo') + (allSongs.length > createResults.length ? '<div class="empty">Se muestran hasta 40 de cada sección. Escribe el nombre en Buscar para encontrar otra alabanza.</div>' : '')
    : '<div class="empty">No se cargaron las canciones. Comprueba que los archivos canciones-adoracion.js y canciones-jubilo.js estén disponibles.</div>';

  document.querySelectorAll('#createList [data-song-id]').forEach(card => {
    card.onclick = () => {
      const category = card.dataset.category;
      const song = songsFor(category).find(item => String(item.id) === card.dataset.songId);
      if (song) openTrackChooser(song,category,'create');
    };
  });
  document.querySelectorAll('#songList .song-card-selectable').forEach(card=>{
    const select=()=>{const category=card.dataset.category,song=songsFor(category).find(item=>String(item.id)===card.dataset.songId);if(!song)return;stopListPreview();selectedSongForContinue={song,category};document.querySelectorAll('#songList .song-card').forEach(item=>item.classList.toggle('selected',item===card));$('selectedSongLabel').textContent=song.title||'Alabanza';$('selectedSongLabel').title=song.title||'Alabanza';$('continueSongBtn').disabled=false;$('selectedPreviewBtn').disabled=false;};
    card.querySelector('.song-card-main').onclick=select;
  });
  renderRecentSongs();
}
function transitionScreen(target, candidates) {
  const next=$(target);if(!next)return;
  const current=candidates.map(id=>$(id)).find(element=>element&&!element.classList.contains('hidden'));
  if(current===next)return;
  if(screenTransitionTimer)clearTimeout(screenTransitionTimer);
  candidates.forEach(id=>{const element=$(id);if(element&&element!==next){element.classList.add('hidden');element.classList.remove('screen-fade-out','screen-fade-in');}});
  next.classList.remove('hidden','screen-fade-out','screen-fade-in');
  document.body.classList.toggle('player-active',target==='player');
  // Switch immediately; fading exposes the document background while theme
  // specific styles are being recalculated for the newly visible section.
  screenTransitionTimer=null;
}
function confirmDiscardUnsavedMelody(){
  if(!state.melodyDirty)return true;
  if(!window.confirm('Hay cambios de la melodía que todavía no se han guardado en Firebase. ¿Quieres descartarlos?'))return false;
  state.melodyDirty=false;return true;
}
function setView(view) {
  if(!$('player').classList.contains('hidden')&&!confirmDiscardUnsavedMelody())return;
  stopMetronome();closeLiveTheoryDock();
  state.view = view;
  document.body.classList.toggle('home-active',view==='home');
  document.body.classList.toggle('song-list-active',view==='adoracion'||view==='jubilo');
  document.body.classList.toggle('create-list-active',view==='crear');
  stopPlayback({suspendAudio:true});
  stopTheorySequence();
  const target={home:'homeView',adoracion:'songView',jubilo:'songView',crear:'createView',teoria:'theoryView'}[view]||'homeView';
  transitionScreen(target,['homeView','songView','createView','theoryView','player']);
  document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  renderLists();
  if (view === 'teoria') renderTheory();
  window.scrollTo(0, 0);
}
function openFreePlay() {
  if(state.melodyDirty&&!confirmDiscardUnsavedMelody())return;
  stopPlayback();stopTheorySequence();stopMetronome();closePlayerPopovers();closeLiveTheoryDock();
  clearSongIntro();
  state.song=null;state.view='libre';state.category='adoracion';state.melodyType='introduccion';state.notes=[];state.chords=[];state.chordTarget=null;state.transpose=0;state.melodyDirty=false;state.recording=false;state.lastMidi=null;chordEditorOpen=false;
  document.body.classList.remove('home-active');
  document.body.classList.remove('song-list-active');
  document.body.classList.remove('create-list-active');
  $('songTitle').textContent='Reproducción libre';$('songMeta').textContent='Toca, explora acordes y practica a tu ritmo.';
  updateTrackTimeline();
  primeAudioForInstrument(state.instrument);
  $('playerLabel').textContent='Reproducción libre';$('activeKeyName').textContent='';$('activeKeyName').disabled=true;$('status').textContent='Toca las teclas para escuchar.';$('currentNote').textContent='';$('activeChordLabel').textContent='';
  $('voiceMixer').classList.add('hidden');$('notesPanel').dataset.open='';$('notesPanel').classList.add('hidden');$('lyricsPanel').classList.add('hidden');$('chordEditorPanel').classList.add('hidden');
  renderRecorded();updateAdminControls();transitionScreen('player',['homeView','songView','createView','theoryView','player']);
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
function playSongChord(symbol,sourceElement){
  const chord=parsePianoChord(symbol);if(!chord)return;stopPlayback();
  state.selectedSongChord=symbol;document.querySelectorAll('#lyrics .lyrics-chord.selected').forEach(button=>button.classList.remove('selected'));sourceElement?.classList.add('selected');document.querySelectorAll('#keyboard .key.chord-selected').forEach(key=>key.classList.remove('chord-selected'));
  chordMidiNotes({...chord,octave:60,noTranspose:true}).forEach(midi=>document.querySelector(`.key[data-midi="${midi}"]`)?.classList.add('chord-selected'));
  const display=state.notation==='latino'?theoryLabelChord(chord.root,chord.quality):symbol;
  $('status').textContent=`Acorde ${display} · sonando en el piano.`;$('currentNote').textContent=display;$('currentNote').style.opacity='1';
  document.querySelector('.piano-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
  playChord({...chord,octave:60,duration:1.8,preview:true,noTranspose:true});
}
const THEORY_CHORDS = [
  {name:'Mayor',quality:'major',formula:'1 – 3 – 5',intervals:[0,4,7]},
  {name:'Menor',quality:'minor',formula:'1 – ♭3 – 5',intervals:[0,3,7]},
  {name:'Disminuido',quality:'dim',formula:'1 – ♭3 – ♭5',intervals:[0,3,6]},
  {name:'Disminuido séptima',quality:'dim7',formula:'1 – ♭3 – ♭5 – 𝄫7',intervals:[0,3,6,9]},
  {name:'Semidisminuido',quality:'m7b5',formula:'1 – ♭3 – ♭5 – ♭7',intervals:[0,3,6,10]},
  {name:'Aumentado',quality:'aug',formula:'1 – 3 – #5',intervals:[0,4,8]},
  {name:'Suspendido 2',quality:'sus2',formula:'1 – 2 – 5',intervals:[0,2,7]},
  {name:'Suspendido 4',quality:'sus4',formula:'1 – 4 – 5',intervals:[0,5,7]},
  {name:'Séptima dominante',quality:'7',formula:'1 – 3 – 5 – ♭7',intervals:[0,4,7,10]},
  {name:'Mayor séptima',quality:'maj7',formula:'1 – 3 – 5 – 7',intervals:[0,4,7,11]},
  {name:'Menor séptima',quality:'m7',formula:'1 – ♭3 – 5 – ♭7',intervals:[0,3,7,10]}
  ,{name:'Menor con séptima mayor',quality:'mMaj7',formula:'1 – ♭3 – 5 – 7',intervals:[0,3,7,11]}
  ,{name:'Sexta',quality:'6',formula:'1 – 3 – 5 – 6',intervals:[0,4,7,9]}
  ,{name:'Añadido novena',quality:'add9',formula:'1 – 3 – 5 – 9',intervals:[0,4,7,14]}
  ,{name:'Quinta (power chord)',quality:'5',formula:'1 – 5',intervals:[0,7]}
];
const THEORY_DEGREES=['I','ii','iii','IV','V','vi','vii°'];
const THEORY_SCALE=[{semi:0,quality:'major'},{semi:2,quality:'minor'},{semi:4,quality:'minor'},{semi:5,quality:'major'},{semi:7,quality:'major'},{semi:9,quality:'minor'},{semi:11,quality:'dim'}];
const THEORY_MINOR_SCALE=[{semi:0,quality:'minor'},{semi:2,quality:'dim'},{semi:3,quality:'major'},{semi:5,quality:'minor'},{semi:7,quality:'minor'},{semi:8,quality:'major'},{semi:10,quality:'major'}];
const THEORY_DEGREES_MINOR=['i','ii°','III','iv','v','VI','VII'];
const THEORY_CIRCLE=[0,7,2,9,4,11,6,1,8,3,10,5];
const THEORY_SIG={0:'0 alteraciones',7:'1 sostenido',2:'2 sostenidos',9:'3 sostenidos',4:'4 sostenidos',11:'5 sostenidos',6:'6 sostenidos / 6 bemoles',1:'7 sostenidos / 5 bemoles',8:'4 bemoles',3:'3 bemoles',10:'2 bemoles',5:'1 bemol'};
const THEORY_SCALES={major:{name:'Mayor',formula:'1 – 2 – 3 – 4 – 5 – 6 – 7',semitones:[0,2,4,5,7,9,11,12]},minor:{name:'Menor natural',formula:'1 – 2 – ♭3 – 4 – 5 – ♭6 – ♭7',semitones:[0,2,3,5,7,8,10,12]},majorPentatonic:{name:'Pentatónica mayor',formula:'1 – 2 – 3 – 5 – 6',semitones:[0,2,4,7,9,12]},minorPentatonic:{name:'Pentatónica menor',formula:'1 – ♭3 – 4 – 5 – ♭7',semitones:[0,3,5,7,10,12]},blues:{name:'Blues',formula:'1 – ♭3 – 4 – ♭5 – 5 – ♭7',semitones:[0,3,5,6,7,10,12]}};
const THEORY_INTERVALS=[['Unísono','1 justa',0],['Segunda menor','2ª menor',1],['Segunda mayor','2ª mayor',2],['Tercera menor','3ª menor',3],['Tercera mayor','3ª mayor',4],['Cuarta justa','4ª justa',5],['Tritono','4ª aumentada / 5ª disminuida',6],['Quinta justa','5ª justa',7],['Sexta menor','6ª menor',8],['Sexta mayor','6ª mayor',9],['Séptima menor','7ª menor',10],['Séptima mayor','7ª mayor',11],['Octava','8ª justa',12]];
function theoryRoot(pc){return NOTE_NAMES[((pc%12)+12)%12];}
const THEORY_CHAPTERS=[
  {id:'keyboard',title:'Capítulo 1 · Conoce el teclado',icon:'🗺️',intro:'El piano es un mapa de teclas que se repite. Primero aprenderás qué es una nota, cómo encontrar Do y cómo reconocer cualquier tecla blanca o negra.',goal:'Mirar una tecla y decir su nombre, incluida su octava.'},
  {id:'distance',title:'Capítulo 2 · Pasos entre las notas',icon:'👣',intro:'Las notas están a distintas distancias. Vas a descubrir los pasos pequeños y grandes que luego usaremos para construir escalas y acordes.',goal:'Reconocer un semitono y un tono al mirar y escuchar dos teclas.'},
  {id:'scales',title:'Capítulo 3 · Caminos de notas: las escalas',icon:'🪜',intro:'Una escala es un camino ordenado de notas. Aprenderás su receta y la usarás para construir escalas mayores y conocer La menor.',goal:'Construir y tocar escalas sin memorizar una lista de doce.'},
  {id:'chords',title:'Capítulo 4 · Acordes para acompañar',icon:'🤝',intro:'Los acordes son grupos de notas que suenan juntas. Vas a armar acordes mayores y menores, escuchar la diferencia y probar inversiones útiles para acompañar.',goal:'Encontrar las notas de un acorde y tocarlo en el piano.'},
  {id:'keys',title:'Capítulo 5 · La familia de una tonalidad',icon:'🏡',intro:'Una tonalidad organiza las notas y los acordes alrededor de un centro musical. Aprenderás qué acordes pertenecen juntos y cómo leer sus números romanos.',goal:'Ver la escala y los acordes de una tonalidad, como Do o Sol mayor.'},
  {id:'progressions',title:'Capítulo 6 · Progresiones y canciones',icon:'🎶',intro:'Una progresión es un recorrido de acordes. La practicarás en varias tonalidades para poder acompañar canciones y cambiar la altura sin perder el mismo recorrido.',goal:'Escuchar, tocar y transportar una secuencia sencilla de acordes.'}
];
const THEORY_LESSONS=[
  {chapter:'keyboard',title:'Las notas: nombres para los sonidos',time:'3 min',intro:'Una nota es un sonido al que le damos un nombre para poder encontrarlo y repetirlo.',parts:[['Siete nombres conocidos','En música usamos siete nombres: Do, Re, Mi, Fa, Sol, La y Si. Cada tecla produce un sonido, y estos nombres nos ayudan a hablar de esos sonidos.'],['Un camino que vuelve a empezar','Después de Si viene otra vez Do. Ese Do suena más agudo y empieza un nuevo grupo de siete nombres.'],['Las notas construyen música','Las melodías usan notas una después de otra. Las escalas las ordenan y los acordes juntan varias para que suenen al mismo tiempo.']],remember:'Después de Si, la lista vuelve a Do.',visual:['Do','Re','Mi','Fa','Sol','La','Si','Do'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:430},exercise:{type:'choice',question:'¿Qué nombre viene después de Si?',answers:['Do','Fa','La'],correct:0,why:'El orden vuelve a empezar en Do.'},tab:'piano'},
  {chapter:'keyboard',title:'El patrón de dos y tres teclas negras',time:'3 min',intro:'Los grupos de teclas negras son las señales que te permiten orientarte en cualquier parte del piano.',parts:[['Encuentra un grupo de dos','Mira las teclas negras. Verás grupos de dos y de tres, repetidos por todo el instrumento.'],['Do está junto al par','Busca la tecla blanca pegada a la izquierda de un grupo de dos negras. Esa tecla es Do.'],['Usa el dibujo como mapa','Cuando encuentres Do, las teclas blancas que siguen hacia la derecha son Re, Mi, Fa, Sol, La y Si. El patrón vuelve a repetirse.']],remember:'Dos negras juntas: Do es la tecla blanca que está justo a su izquierda.',visual:['Do','● ●','Re','● ● ●','Mi'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:360},exercise:{type:'find-note',pool:'do',hint:'Busca Do: está justo a la izquierda de un grupo de dos teclas negras.'},tab:'piano'},
  {chapter:'keyboard',title:'Encuentra las notas naturales',time:'3 min',intro:'Las siete teclas blancas principales llevan los nombres Do, Re, Mi, Fa, Sol, La y Si. Practiquemos a encontrarlas en distintas octavas.',parts:[['Empieza desde Do','Localiza un par de teclas negras. La blanca que está a su izquierda es Do.'],['Avanza sin saltarte teclas','Desde Do, sigue por las blancas: Re, Mi, Fa, Sol, La y Si. Luego la próxima blanca se llama Do otra vez.'],['Observa y escucha','En esta práctica aparecerá una nota al azar. Busca su nombre y su número de octava en el teclado, y tócala.']],remember:'Las teclas blancas siguen el mismo orden una y otra vez.',visual:['Do','Re','Mi','Fa','Sol','La','Si'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:360},exercise:{type:'find-note',pool:'natural',hint:'Busca la nota exacta que aparece en el reto. El número también importa.'},tab:'piano'},
  {chapter:'keyboard',title:'Teclas negras: sostenidos y bemoles',time:'4 min',intro:'Entre muchas teclas blancas hay una tecla negra. Esa tecla también es una nota y puede tener dos nombres.',parts:[['Sostenido sube un paso pequeño','El símbolo ♯ se llama sostenido. Do♯, o C♯, es la tecla negra inmediatamente a la derecha de Do.'],['Bemol baja un paso pequeño','El símbolo ♭ se llama bemol. Re♭, o D♭, es la tecla negra inmediatamente a la izquierda de Re.'],['Dos nombres para la misma tecla','C♯ y D♭ son dos maneras de nombrar la misma tecla. En una octava hay doce sonidos: siete naturales y cinco alterados. Por ahora basta saber que ambos nombres señalan el mismo lugar.']],remember:'♯ sube un semitono; ♭ baja un semitono. C♯ y D♭ comparten tecla.',visual:['C','C♯ / D♭','D','D♯ / E♭','E','F','F♯ / G♭','G','G♯ / A♭','A','A♯ / B♭','B'],demo:{notes:[60,61,62,63,64,65,66,67,68,69,70,71,72],spacing:250},exercise:{type:'find-note',pool:'altered',hint:'Las teclas negras tienen nombres con sostenido o bemol. Toca la nota pedida.'},tab:'piano'},
  {chapter:'keyboard',title:'Octavas: Do3, Do4 y Do5',time:'3 min',intro:'Las notas vuelven a aparecer en diferentes alturas. Cada vez que llegas al mismo nombre más arriba, completas una octava.',parts:[['De Do a Do','Cuenta desde Do hasta el Do siguiente: Do, Re, Mi, Fa, Sol, La, Si, Do. El Do de llegada suena más agudo.'],['El número indica la altura','Do3, Do4 y Do5 son todos Do, pero viven en zonas distintas del teclado. En esta app también puedes verlos como C3, C4 y C5.'],['Busca el mismo dibujo','Cada Do está a la izquierda de dos teclas negras. Encuentra el dibujo varias veces y nota cómo el sonido se vuelve más agudo al avanzar.']],remember:'El nombre de nota puede repetirse; el número te dice en qué octava está.',visual:['Do3','Do4','Do5'],demo:{notes:[48,60,72],spacing:700},exercise:{type:'find-note',pool:'do',hint:'Esta vez el número de octava sí cuenta: busca exactamente el Do indicado.'},tab:'piano'},
  {chapter:'keyboard',title:'Reto: encuentra cualquier nota',time:'4 min',intro:'Ya tienes un mapa para buscar notas. Ahora tendrás que encontrar sonidos naturales y alterados sin que el piano te señale la tecla.',parts:[['Lee la nota completa','El reto puede pedir, por ejemplo, Fa♯4 o Si3. El nombre dice qué nota buscar; el número indica qué octava.'],['Busca el patrón','Usa los pares de teclas negras para ubicar Do y cuenta desde allí. En las teclas negras, fíjate en ♯ o ♭.'],['Tócala para comprobar','Si aciertas, escucharás esa nota y el reto cambiará. Si no, la app te dirá qué tecla tocaste para que puedas volver a buscar.']],remember:'Mira el nombre y el número de octava antes de tocar.',visual:['Nombre','Octava','Tecla'],demo:{notes:[66],spacing:0},exercise:{type:'find-note',pool:'all',hint:'Busca la tecla exacta. Puedes pedir otra nota si quieres seguir practicando.'},tab:'piano'},
  {chapter:'distance',title:'Semitono: el paso más pequeño',time:'3 min',intro:'Un semitono es la distancia más corta entre dos teclas vecinas, ya sean blancas o negras.',parts:[['Mira dos vecinas','C y C♯ están una al lado de la otra: entre ellas hay un semitono. Cuenta las teclas negras también.'],['Escucha el pequeño paso','Toca primero una tecla y luego su vecina. Los sonidos cambian poquito porque solo avanzaste un semitono.'],['Piensa en movimiento','Al subir por el teclado vas hacia sonidos más agudos. Al bajar vas hacia sonidos más graves. En ambos sentidos, una tecla vecina está a un semitono.']],remember:'De una tecla a la tecla que está justo a su lado hay un semitono.',visual:['C','C♯','D'],demo:{notes:[60,61,62],spacing:700},exercise:{type:'choice',question:'¿Cuántos semitonos separan dos teclas vecinas?',answers:['Uno','Dos','Siete'],correct:0,why:'Una tecla y su vecina forman un paso pequeño: un semitono.'},tab:'intervals'},
  {chapter:'distance',title:'Mi–Fa y Si–Do: vecinos sin tecla negra',time:'3 min',intro:'Hay dos pares de teclas blancas que ya están pegados. Entre ellas hay un semitono aunque no veas una tecla negra.',parts:[['Mi y Fa están juntos','Toca Mi y después la tecla blanca que sigue, Fa. Son vecinos: la distancia es un semitono.'],['Si y Do también','Haz lo mismo con Si y el siguiente Do. También están a un semitono de distancia.'],['La regla incluye las negras','Entre dos teclas vecinas siempre hay un semitono. A veces una es negra; entre Mi–Fa y Si–Do, las dos son blancas.']],remember:'Mi–Fa y Si–Do son semitonos naturales.',visual:['Mi','Fa','Si','Do'],demo:{notes:[64,65,71,72],spacing:700},exercise:{type:'choice',question:'¿Qué pares están separados por un semitono?',answers:['Mi–Fa y Si–Do','Do–Re y Fa–Sol','Do–Mi y Sol–Si'],correct:0,why:'Mi–Fa y Si–Do son dos pares de teclas vecinas.'},tab:'intervals'},
  {chapter:'distance',title:'Tono: dos pasos pequeños',time:'3 min',intro:'Un tono equivale a dos semitonos. Es como dar dos pasos seguidos en el teclado.',parts:[['De Do a Re','Entre Do y Re pasas por Do♯: Do → Do♯ → Re. Son dos semitonos, es decir, un tono.'],['De Fa a Sol','Entre Fa y Sol está Fa♯. También cuentas dos pasos: Fa → Fa♯ → Sol.'],['Compara las distancias','Do–Do♯ es un semitono. Do–Re es un tono. Cuenta cuántas teclas atraviesas para saber la distancia.']],remember:'Dos semitonos juntos forman un tono.',visual:['Do','Do♯','Re','=','2 semitonos'],demo:{notes:[60,62,65,67],spacing:650},exercise:{type:'choice',question:'¿Cuántos semitonos forman un tono?',answers:['Uno','Dos','Tres'],correct:1,why:'Un tono contiene dos semitonos.'},tab:'intervals'},
  {chapter:'distance',title:'Reto: ¿tono o semitono?',time:'4 min',intro:'Mira dos notas, escucha el intervalo y decide si entre ellas hay un paso o dos.',parts:[['Escucha las dos notas','La app te dará dos notas para comparar, como La y Si o Mi y Fa. Pulsa Escuchar y atiende a la distancia.'],['Cuenta los pasos','Si son teclas vecinas, hay un semitono. Si hay una tecla en medio, hay dos semitonos: un tono.'],['Elige tu respuesta','La práctica cambia los pares, así que no tienes que aprender una lista de memoria. Mira y escucha cada ejemplo.']],remember:'Vecinas: un semitono. Una tecla entre ellas: un tono.',visual:['¿1 paso?','Semitono','¿2 pasos?','Tono'],demo:{notes:[69,71],spacing:800},exercise:{type:'interval',pairs:[[60,61],[64,65],[71,72],[60,62],[65,67],[69,71],[67,69],[60,63]],answers:[{value:1,label:'1 semitono'},{value:2,label:'1 tono'},{value:3,label:'3 semitonos'}],hint:'Mira el teclado y cuenta las teclas entre las dos notas.'},tab:'intervals'},
  {chapter:'scales',title:'Escala: un camino ordenado',time:'3 min',intro:'Una escala es un grupo de notas en orden. Sirve como mapa para crear melodías y aprender qué notas suelen funcionar juntas.',parts:[['Sube o baja por el camino','Puedes empezar en una nota y avanzar paso a paso hacia sonidos más agudos. También puedes recorrer las mismas notas hacia abajo.'],['Do mayor es un buen primer mapa','Do mayor usa Do, Re, Mi, Fa, Sol, La y Si. En el piano puedes tocarla usando las teclas blancas.'],['Los números muestran lugares','A veces verás 1, 2, 3, 4, 5, 6 y 7. Son los puestos de las notas dentro de la escala, en orden.']],remember:'Una escala ordena notas para que tengamos un camino musical.',visual:['1','2','3','4','5','6','7'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:400},exercise:{type:'choice',question:'¿Qué es una escala?',answers:['Un grupo ordenado de notas','Una sola tecla negra','Una canción completa'],correct:0,why:'La escala organiza varias notas en un orden.'},tab:'scales'},
  {chapter:'scales',title:'La receta de la escala mayor',time:'4 min',intro:'La escala mayor se puede construir desde distintas notas siguiendo siempre la misma receta de pasos.',parts:[['T significa tono; S, semitono','El patrón es T–T–S–T–T–T–S. T es un tono, que equivale a dos semitonos; S es un semitono.'],['También puedes contar semitonos','La misma receta se escribe 2–2–1–2–2–2–1. Cada número dice cuántas teclas avanzar antes de la siguiente nota.'],['Termina en el mismo nombre','Después de siete notas, el último semitono te lleva al nombre inicial, una octava más arriba.']],remember:'Escala mayor: tono, tono, semitono, tono, tono, tono, semitono.',visual:['T','T','S','T','T','T','S'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:380},exercise:{type:'choice',question:'¿Cuál es la receta de pasos de la escala mayor?',answers:['T–T–S–T–T–T–S','T–S–T–T–S–T–T','S–T–T–S–T–T–T'],correct:0,why:'La escala mayor sigue tono, tono, semitono, tono, tono, tono, semitono.'},tab:'scales'},
  {chapter:'scales',title:'Construyamos escalas mayores',time:'5 min',intro:'Ahora usaremos la receta para armar una escala. Empieza en Do, escucha el ejemplo y luego toca las notas en orden.',parts:[['Empieza por Do','En Do mayor avanzas usando solo teclas blancas: Do–Re–Mi–Fa–Sol–La–Si–Do.'],['Usa la receta en otros lugares','La receta también funciona en Sol, Fa, Re y La. Algunas escalas necesitan teclas negras para conservar las mismas distancias.'],['Tócala tú','Elige una nota de inicio. La app mostrará la escala que resulta; escucha el ejemplo y luego toca cada nota en orden.']],remember:'No memorices cada escala por separado: aplica la receta desde la nota inicial.',visual:['C mayor','G mayor','F mayor','D mayor','A mayor'],demo:{notes:[60,62,64,65,67,69,71,72],spacing:380},exercise:{type:'scale',roots:['C','G','F','D','A'],hint:'Escucha el ejemplo y toca la escala nota por nota, en orden.'},tab:'scales'},
  {chapter:'scales',title:'La menor y su familiar Do mayor',time:'4 min',intro:'La menor natural y Do mayor usan las mismas teclas blancas, pero comienzan en notas diferentes y se sienten distintas.',parts:[['La menor empieza en La','La escala es La–Si–Do–Re–Mi–Fa–Sol–La. Al recorrerla desde La, ese es el centro que escuchamos.'],['Do mayor empieza en Do','Do mayor usa Do–Re–Mi–Fa–Sol–La–Si–Do. Comparte sus notas con La menor natural.'],['Se llaman relativas','Do mayor y La menor son tonalidades relativas: comparten las notas, pero su nota de descanso es distinta. Por ahora escucha cómo cambia el punto de llegada.']],remember:'Do mayor y La menor natural comparten las teclas blancas, pero no el mismo centro.',visual:['C mayor','C D E F G A B','A menor','A B C D E F G'],demo:{notes:[60,62,64,65,67,69,71,72,69,71,72,74,76,77,79,81],spacing:350},exercise:{type:'choice',question:'¿Qué comparten Do mayor y La menor natural?',answers:['Las mismas siete notas','La misma nota de inicio','Solo las teclas negras'],correct:0,why:'Usan las mismas notas blancas, pero empiezan en centros diferentes.'},tab:'scales'},
  {chapter:'scales',title:'Sol mayor y Fa mayor usan una tecla negra',time:'4 min',intro:'La receta mayor no cambia. Al empezar en Sol o en Fa, una tecla negra ayuda a mantener las distancias correctas.',parts:[['Sol mayor necesita Fa sostenido','Las notas son Sol–La–Si–Do–Re–Mi–Fa♯–Sol. Fa♯ acerca el último paso a Sol y completa la receta.'],['Fa mayor necesita Si bemol','Fa–Sol–La–Si♭–Do–Re–Mi–Fa. Si♭ mantiene los pasos en el orden de una escala mayor.'],['Una fórmula sirve para ambas','Las teclas negras no son una regla aparte: aparecen porque el patrón de tonos y semitonos debe conservarse.']],remember:'Sigue la fórmula; la tonalidad te dirá si hace falta una tecla negra.',visual:['G','A','B','C','D','E','F♯','G'],demo:{notes:[67,69,71,72,74,76,78,79,65,67,69,70,72,74,76,77],spacing:350},exercise:{type:'scale',roots:['G','F'],hint:'Elige Sol o Fa y toca su escala mayor completa.'},tab:'scales'},
  {chapter:'chords',title:'Melodía y acorde: una nota o varias',time:'3 min',intro:'Una melodía suele tocar una nota después de otra. Un acorde junta varias notas y las hace sonar al mismo tiempo.',parts:[['La melodía cuenta una historia','Prueba Do, luego Mi y luego Sol, una tecla a la vez. Cada sonido llega después del anterior.'],['El acorde suena junto','Ahora toca Do, Mi y Sol al mismo tiempo. Las tres notas forman un acorde que puede acompañar una melodía.'],['Las dos cosas trabajan juntas','En una canción, una mano puede tocar la melodía mientras la otra acompaña con acordes. No hace falta usar las dos manos desde el primer día.']],remember:'Melodía: notas en fila. Acorde: varias notas juntas.',visual:['Do','después','Mi','después','Sol','juntas: acorde'],demo:{notes:[60,64,67],spacing:750},exercise:{type:'choice',question:'¿Qué hace que un acorde sea distinto de una melodía?',answers:['Varias notas suenan juntas','Solo usa teclas negras','Siempre se toca rápido'],correct:0,why:'Un acorde junta varias notas al mismo tiempo.'},tab:'chords'},
  {chapter:'chords',title:'Tríada: la forma 1–3–5',time:'4 min',intro:'El acorde básico que aprenderemos tiene tres notas. Por eso también se llama tríada.',parts:[['La nota 1 es el comienzo','La primera nota se llama fundamental o raíz. Si empiezas en Do, el acorde se llamará algún tipo de acorde de Do.'],['La 3 y la 5 cuentan lugares','Desde la raíz buscamos la tercera y la quinta. En Do mayor son Mi y Sol: Do–Mi–Sol.'],['Tócalas juntas','Presiona Do, Mi y Sol a la vez. La fórmula 1–3–5 te recuerda cuáles son los tres puestos.']],remember:'Una tríada tiene tres notas: fundamental, tercera y quinta.',visual:['1','3','5','C','E','G'],demo:{notes:[60,64,67],spacing:0,duration:1.4},exercise:{type:'choice',question:'¿Cuántas notas tiene una tríada básica?',answers:['Dos','Tres','Siete'],correct:1,why:'Tri- significa tres; una tríada reúne tres notas.'},tab:'chords'},
  {chapter:'chords',title:'Acordes mayores: Do, Fa y Sol',time:'4 min',intro:'Un acorde mayor se forma con la raíz, una tercera mayor y una quinta. Empezaremos con tres acordes muy usados.',parts:[['Do mayor: Do–Mi–Sol','Busca Do, Mi y Sol. Tócalos juntos para escuchar el acorde de Do mayor.'],['Fa mayor: Fa–La–Do','Empieza en Fa y cuenta la tercera y la quinta: La y Do. Puedes tocar el Do de arriba del inicio.'],['Sol mayor: Sol–Si–Re','Desde Sol, las notas son Sol, Si y Re. Cada acorde tiene su propio grupo de tres teclas.']],remember:'Los acordes mayores usan las distancias 0, 4 y 7 semitonos desde su raíz.',visual:['C: C–E–G','F: F–A–C','G: G–B–D'],demo:{chords:[[60,64,67],[65,69,72],[67,71,74]],spacing:1100,duration:1},exercise:{type:'chord-builder',targets:[{root:'C',quality:'major'},{root:'F',quality:'major'},{root:'G',quality:'major'}],hint:'Toca las tres notas del acorde que aparece en pantalla. Puedes tocarlas en cualquier orden.'},tab:'chords'},
  {chapter:'chords',title:'Acorde menor: La menor',time:'4 min',intro:'Un acorde menor se parece mucho al mayor. Solo cambia una nota: la tercera baja un semitono.',parts:[['Compara Do mayor y Do menor','Do mayor es Do–Mi–Sol. Do menor es Do–Mi♭–Sol. La nota del medio bajó un paso pequeño.'],['La menor usa La–Do–Mi','El acorde de La menor se forma con La, Do y Mi. En el piano son tres teclas blancas.'],['Escucha la diferencia','Toca Do mayor y Do menor; después toca La menor. Escuchar ayuda a reconocer el color sin memorizar fórmulas a ciegas.']],remember:'En el acorde menor, la tercera está un semitono más baja que en el mayor.',visual:['C mayor: C–E–G','C menor: C–E♭–G','A menor: A–C–E'],demo:{chords:[[60,64,67],[60,63,67],[69,72,76]],spacing:1200,duration:1},exercise:{type:'chord-builder',targets:[{root:'A',quality:'minor'}],hint:'Construye La menor tocando La, Do y Mi.'},tab:'chords'},
  {chapter:'chords',title:'El acorde disminuido: una primera mirada',time:'3 min',intro:'Hay otros tipos de acordes además de mayor y menor. Solo conoceremos por ahora el disminuido, que aparece en el séptimo lugar de Do mayor.',parts:[['B–D–F forman Si disminuido','Toca Si, Re y Fa. La fórmula es 1–♭3–♭5: la tercera y la quinta quedan más cerca que en el acorde mayor.'],['Escúchalo como parte de la familia','En Do mayor, Si disminuido es un acorde especial. No tienes que aprender a usarlo mucho todavía; basta con reconocerlo.'],['Una etiqueta corta','En una lista de acordes puedes verlo como Bdim o B°. Ambos nombres señalan este tipo de acorde.']],remember:'Bdim en Do mayor usa Si, Re y Fa.',visual:['B','D','F','1–♭3–♭5'],demo:{notes:[71,74,77],spacing:0,duration:1.3},exercise:{type:'choice',question:'¿Qué notas forman B disminuido?',answers:['B–D–F','B–D♯–F♯','C–E–G'],correct:0,why:'B disminuido usa Si, Re y Fa.'},tab:'chords'},
  {chapter:'chords',title:'Inversiones: el mismo acorde en otro orden',time:'4 min',intro:'Una inversión conserva las notas del acorde, pero cambia cuál queda abajo. Así la mano puede moverse menos entre acordes.',parts:[['Posición fundamental','Do mayor en su orden inicial es Do–Mi–Sol. Do, la fundamental, queda abajo.'],['Primera inversión: C/E','Sube el Do una octava: Mi–Sol–Do. El acorde sigue siendo Do mayor, pero Mi quedó abajo. C/E significa Do mayor con Mi en el bajo.'],['Segunda inversión','Sube también Mi: Sol–Do–Mi. Las notas siguen siendo Do, Mi y Sol, solo cambió el orden y la altura.']],remember:'Invertir cambia el orden y la nota más grave; el acorde conserva sus notas.',visual:['C–E–G','E–G–C','G–C–E'],demo:{chords:[[60,64,67],[64,67,72],[67,72,76]],spacing:1150,duration:1},exercise:{type:'inversion',root:'C',quality:'major',inversion:1,hint:'Construye C/E: toca Mi4, Sol4 y el Do de la octava siguiente.'},tab:'chords'},
  {chapter:'chords',title:'Reto: construye acordes básicos',time:'5 min',intro:'Ya viste cómo se forman distintos acordes. Ahora la app te pedirá uno para que encuentres sus tres notas en el piano.',parts:[['Lee el nombre del acorde','La letra o nota inicial te dice la raíz. La palabra mayor o menor te dice qué tercera buscar.'],['Mira las notas de ayuda','La app mostrará el acorde y sus notas. Las teclas iluminadas te ayudan a ubicarlas en el teclado.'],['Arma el acorde','Toca las tres notas. Puedes presionarlas una por una; cuando estén las tres, escucharás que completaste el acorde.']],remember:'Raíz, tercera y quinta forman la tríada.',visual:['C','G','F','D','A','Am'],demo:{notes:[67,71,74],spacing:0,duration:1.3},exercise:{type:'chord-builder',targets:[{root:'C',quality:'major'},{root:'G',quality:'major'},{root:'F',quality:'major'},{root:'D',quality:'major'},{root:'A',quality:'major'},{root:'A',quality:'minor'},{root:'D',quality:'minor'}],random:true,hint:'La app eligió un acorde. Toca sus tres notas; puedes cambiar de reto cuando quieras.'},tab:'chords'},
  {chapter:'keys',title:'Tonalidad: el hogar de una canción',time:'3 min',intro:'Una tonalidad es el grupo de notas y acordes que gira alrededor de una nota principal, como si fuera el hogar de la canción.',parts:[['Do mayor descansa en Do','La nota Do suele sentirse como un buen lugar para terminar una canción en Do mayor. Por eso decimos que Do es su centro.'],['La menor descansa en La','La menor usa las mismas notas blancas, pero La es su centro. La música puede sentirse distinta aunque las teclas sean las mismas.'],['La escala organiza la tonalidad','La escala te muestra qué notas pertenecen a ese hogar. De esas notas nacen los acordes que combinan bien.']],remember:'La tonalidad nos dice cuál es el centro musical y qué notas forman su familia.',visual:['Centro','Notas','Acordes','Canción'],demo:{chords:[[60,64,67],[69,72,76]],spacing:1300,duration:1.1},exercise:{type:'choice',question:'¿Qué nos ayuda a entender una tonalidad?',answers:['El centro y la familia de notas y acordes','Solo el volumen de la canción','Cuántas teclas negras hay en el piano'],correct:0,why:'La tonalidad organiza notas y acordes alrededor de un centro.'},tab:'keys'},
  {chapter:'keys',title:'Acordes de Do mayor y La menor',time:'4 min',intro:'Cada nota de una escala puede ser el inicio de un acorde. Así obtenemos una familia de acordes que suenan relacionados.',parts:[['La familia de Do mayor','Do mayor tiene: C, Dm, Em, F, G, Am y Bdim. Se forman usando las notas de la escala de Do mayor.'],['La familia de La menor','La menor natural comparte esas notas: Am, Bdim, C, Dm, Em, F y G. La familia es la misma, pero el centro ahora es La.'],['Se apilan notas alternas','Para formar cada tríada, toma una nota, salta la siguiente de la escala, toma otra, salta una y toma la tercera. Esa es una forma sencilla de entender 1–3–5.']],remember:'Los acordes de una tonalidad se construyen usando las notas de su escala.',visual:['C','Dm','Em','F','G','Am','Bdim'],demo:{chords:[[60,64,67],[62,65,69],[64,67,72],[65,69,72],[67,71,74],[69,72,76],[71,74,77]],spacing:900,duration:.8},exercise:{type:'choice',question:'¿Cuál de estos acordes pertenece a Do mayor?',answers:['Re menor','Re mayor','Fa sostenido mayor'],correct:0,why:'Re menor se forma con las notas de Do mayor.'},tab:'keys'},
  {chapter:'keys',title:'Números romanos: un mapa para los acordes',time:'4 min',intro:'Los números romanos nombran el puesto de cada acorde dentro de una tonalidad. Así podemos hablar del recorrido sin depender de una sola nota inicial.',parts:[['Cada número es un lugar','En Do mayor, I es Do, ii es Re menor, iii es Mi menor y así seguimos hasta vii°.'],['Mayúscula y minúscula','I, IV y V suelen ser acordes mayores. ii, iii y vi son menores. El símbolo ° muestra que el acorde del séptimo lugar es disminuido.'],['El patrón viaja','I–V–vi–IV en Do significa C–G–Am–F. En otra tonalidad, los nombres cambian pero los números conservan su orden.']],remember:'Los números romanos nombran el lugar del acorde, no una tecla fija.',visual:['I','ii','iii','IV','V','vi','vii°'],demo:{chords:[[60,64,67],[67,71,74],[69,72,76],[65,69,72]],spacing:1000,duration:.9},exercise:{type:'choice',question:'En Do mayor, ¿qué acorde representa V?',answers:['Sol mayor','Fa mayor','La menor'],correct:0,why:'V es el quinto acorde: Sol mayor.'},tab:'keys'},
  {chapter:'keys',title:'Explora una tonalidad y su familia',time:'5 min',intro:'Elige una tonalidad y observa cómo la escala produce siete acordes. Escucha cada uno para conectar la teoría con el piano.',parts:[['Mira primero las notas','En Sol mayor, por ejemplo, las notas son G–A–B–C–D–E–F♯.'],['Debajo aparecen sus acordes','La familia de Sol mayor es G, Am, Bm, C, D, Em y F♯dim. Cada acorde empieza en una nota de la escala.'],['Elige un acorde para oírlo','Toca una tarjeta de acorde. La app resaltará sus notas en el piano y lo reproducirá para que veas y escuches de qué está hecho.']],remember:'G mayor incluye F♯; sus acordes salen de las notas G–A–B–C–D–E–F♯.',visual:['G','Am','Bm','C','D','Em','F♯dim'],demo:{chords:[[67,71,74],[69,72,76],[71,74,78],[72,76,79],[74,78,81],[76,79,83],[78,81,84]],spacing:900,duration:.8},exercise:{type:'key-family',roots:['C','G'],targetDegree:6,hint:'Elige Do o Sol mayor y toca la tarjeta del acorde vi.'},tab:'keys'},
  {chapter:'progressions',title:'Progresión: un recorrido de acordes',time:'3 min',intro:'Una progresión es una secuencia de acordes que acompaña una parte de una canción.',parts:[['Sigue el orden','I–IV–V es una progresión: toca el acorde I, luego IV y luego V. En Do mayor sería C–F–G.'],['El número depende de la tonalidad','En Do mayor, I es C. En Sol mayor, I es G. El número siempre indica el puesto en la escala elegida.'],['Vuelve a empezar','Después del último acorde puedes regresar al primero. Así se forma una vuelta que acompaña una estrofa o un coro.']],remember:'Una progresión te dice qué acordes tocar y en qué orden.',visual:['I','IV','V','I'],demo:{chords:[[60,64,67],[65,69,72],[67,71,74],[60,64,67]],spacing:1000,duration:.9},exercise:{type:'choice',question:'¿Qué describe una progresión?',answers:['Una secuencia ordenada de acordes','Una tecla tocada más fuerte','Los nombres de las octavas'],correct:0,why:'Una progresión es un camino de acordes en un orden determinado.'},tab:'keys'},
  {chapter:'progressions',title:'Tres caminos para acompañar canciones',time:'4 min',intro:'Hay progresiones que aparecen en muchas canciones y acompañamientos modernos. No pertenecen a un solo estilo; son caminos útiles para practicar.',parts:[['I–IV–V','En Do mayor: C–F–G. Es un recorrido corto y fácil de escuchar.'],['I–V–vi–IV','En Do: C–G–Am–F. En Sol: G–D–Em–C. El mismo patrón cambia de nombres al cambiar de tonalidad.'],['vi–IV–I–V','En Do: Am–F–C–G. Empezar en vi da otro punto de partida, aunque use la misma familia de acordes.']],remember:'Los números muestran el recorrido; la tonalidad determina los nombres de los acordes.',visual:['I–IV–V','I–V–vi–IV','vi–IV–I–V'],demo:{chords:[[60,64,67],[67,71,74],[69,72,76],[65,69,72]],spacing:1000,duration:.9},exercise:{type:'choice',question:'¿Cuál es I–V–vi–IV en Do mayor?',answers:['C–G–Am–F','C–F–G–C','Am–F–C–G'],correct:0,why:'En Do mayor, I=C, V=G, vi=Am y IV=F.'},tab:'keys'},
  {chapter:'progressions',title:'Cambia de tonalidad, conserva el recorrido',time:'4 min',intro:'Transportar una progresión significa mover todo el recorrido a otra tonalidad manteniendo el mismo orden.',parts:[['El ejemplo en Do','I–V–vi–IV en Do mayor es C–G–Am–F.'],['Ahora en Sol','El mismo patrón en Sol mayor es G–D–Em–C. Cambiaron los nombres y las teclas, pero los puestos siguen iguales.'],['También en Re','En Re mayor queda D–A–Bm–G. Así puedes adaptar una canción a una voz más cómoda sin inventar una progresión nueva.']],remember:'Cambia la tonalidad y los acordes; conserva los números romanos y su orden.',visual:['C: C–G–Am–F','G: G–D–Em–C','D: D–A–Bm–G'],demo:{chords:[[62,66,69],[69,73,76],[71,74,78],[67,71,74]],spacing:1000,duration:.9},exercise:{type:'progression',roots:['C','G','D'],degrees:[1,5,6,4],hint:'Escucha la vuelta y luego toca los cuatro acordes, uno por uno.'},tab:'keys'}
];
let theoryLessonIndex=0,theoryLessonFeedback='',theoryLessonHeard=false,theoryLessonTouched=false,theoryExerciseForIndex=-1,theoryExerciseTarget=null,theoryExerciseRoot='C',theoryExerciseQuality='major',theoryExerciseStep=0,theoryExerciseTapped=new Set(),theoryExerciseStatus='',theoryLessonNotation=localStorage.getItem('yhwh_theory_notation')==='americano'?'americano':'latino',worshipPracticeTimer=0,worshipPracticeRunning=false,worshipPracticeStep=0;
function worshipPitchName(pc){const names=['Do','Do♯','Re','Mi♭','Mi','Fa','Fa♯','Sol','La♭','La','Si♭','Si'];return names[((pc%12)+12)%12];}
function worshipChordPlan(){
  const roots={C:0,Db:1,D:2,Eb:3,E:4,F:5,Gb:6,G:7,Ab:8,A:9,Bb:10,B:11},root=roots[$('worshipKey')?.value]??0,scale=[0,2,4,5,7,9,11],degrees=($('worshipProgression')?.value||'1-5-6-4').split('-').map(Number);
  return degrees.map(degree=>{const index=degree-1,pc=(root+scale[index])%12,minor=[2,3,6].includes(degree),notes=[0,minor?3:4,7].map(offset=>(pc+offset)%12);return{degree,pc,notes,minor,label:`${worshipPitchName(pc)} ${minor?'menor':'mayor'}`};});
}
function renderWorshipPlan(active=-1){
  const plan=worshipChordPlan(),strip=$('worshipChordStrip');if(!strip)return;
  strip.innerHTML=plan.map((chord,index)=>`<div class="worship-chord-chip${index===active?' active':''}"><b>${index+1}</b><strong>${chord.label}</strong><small>${chord.notes.map(worshipPitchName).join(' – ')}</small></div>`).join('');
  const chord=plan[Math.max(0,active)];$('worshipChordName').textContent=chord.label;$('worshipChordNotes').textContent=`Mano izquierda: ${worshipPitchName(chord.pc)} · Mano derecha: ${chord.notes.map(worshipPitchName).join(' – ')}`;
}
function stopWorshipPractice(message='Práctica detenida. Cuando quieras, empezamos otra vuelta.'){
  worshipPracticeRunning=false;clearTimeout(worshipPracticeTimer);worshipPracticeTimer=0;
  if($('worshipStart'))$('worshipStart').disabled=false;if($('worshipStop'))$('worshipStop').disabled=true;
  if($('worshipStatus'))$('worshipStatus').textContent=message;document.querySelectorAll('.worship-chord-chip').forEach(item=>item.classList.remove('active'));
}
function worshipPracticeTick(){
  if(!worshipPracticeRunning)return;const plan=worshipChordPlan(),chordIndex=Math.floor(worshipPracticeStep/4)%plan.length,beat=worshipPracticeStep%4,chord=plan[chordIndex],pattern=$('worshipPattern').value;
  if(beat===0){renderWorshipPlan(chordIndex);$('worshipStatus').textContent=`Acorde ${chordIndex+1} de ${plan.length} · pulso ${beat+1}. Toca junto cuando te sientas lista/o.`;}
  const duration=60/Number($('worshipBpm').value),bass=48+chord.pc,treble=chord.notes.map(note=>60+note);
  const sound=(midi)=>{const wasRecording=state.recording;state.recording=false;playNote(midi,null,Math.min(1.1,duration*.9),Math.min(.9,duration*.82));state.recording=wasRecording;};
  if(pattern==='block'){if(beat===0)[bass,...treble].forEach(sound);}
  else if(pattern==='alternating'){if(beat%2===0)sound(bass);else treble.forEach(sound);}
  else if(beat===0)sound(bass);else sound(treble[beat-1]);
  worshipPracticeStep++;worshipPracticeTimer=setTimeout(worshipPracticeTick,duration*1000);
}
function bindWorshipPractice(){
  ['worshipKey','worshipProgression','worshipPattern'].forEach(id=>$(id).onchange=()=>{stopWorshipPractice('Ajustes actualizados. Pulsa empezar para escuchar la progresión.');worshipPracticeStep=0;renderWorshipPlan();});
  $('worshipBpm').oninput=()=>{$('worshipBpmLabel').textContent=`${$('worshipBpm').value} BPM`;};
  $('worshipStart').onclick=()=>{if(worshipPracticeRunning)return;worshipPracticeRunning=true;worshipPracticeStep=0;$('worshipStart').disabled=true;$('worshipStop').disabled=false;void resumeAudioContext(getAudioContext());worshipPracticeTick();};
  $('worshipStop').onclick=()=>stopWorshipPractice();renderWorshipPlan();
  document.querySelectorAll('[data-go-home]').forEach(button=>button.addEventListener('click',()=>stopWorshipPractice('Práctica detenida al salir del taller.')));
  document.querySelectorAll('[data-theory-mode="explore"]').forEach(button=>button.addEventListener('click',()=>stopWorshipPractice('Práctica detenida al salir del taller.')));
}
function lessonKeyForMidi(midi){
  const focus=$('lessonPianoFocus');
  if(focus&&!focus.classList.contains('hidden'))return focus.querySelector('.lesson-key[data-focus-midi="'+midi+'"]');
  return document.querySelector('#theoryLearning:not(.hidden) .lesson-key[data-lesson-midi="'+midi+'"]');
}
function openLessonExplorer(){const lesson=THEORY_LESSONS[theoryLessonIndex];document.querySelectorAll('[data-theory-mode]').forEach(button=>button.classList.toggle('active',button.dataset.theoryMode==='explore'));$('theoryLearning').classList.add('hidden');$('theoryExplore').classList.remove('hidden');changeTheoryTab(lesson.tab);}
const THEORY_LESSON_PROGRESS_KEY='yhwh_theory_lessons_v2';

const THEORY_MAJOR_STEPS=[0,2,4,5,7,9,11],THEORY_MAJOR_FORMULA=[0,2,4,5,7,9,11,12],THEORY_NATURAL_PCS=[0,2,4,5,7,9,11],THEORY_ALTERED_PCS=[1,3,6,8,10];
const THEORY_FLAT_NAMES_EN=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'],THEORY_FLAT_NAMES_LATINO=['Do','Re♭','Re','Mi♭','Mi','Fa','Sol♭','Sol','La♭','La','Si♭','Si'];
function theoryProgress(){try{const value=JSON.parse(localStorage.getItem(THEORY_LESSON_PROGRESS_KEY)||'[]');return Array.isArray(value)?value.filter(Number.isInteger):[]}catch(_){return[]}}
function theoryPitch(root){const names={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};return names[root]??0}
function theoryNoteLabel(midi,withOctave=true,preferFlat=false){
  const pc=((midi%12)+12)%12,octave=Math.floor(midi/12)-1;
  const names=preferFlat?(theoryLessonNotation==='latino'?THEORY_FLAT_NAMES_LATINO:THEORY_FLAT_NAMES_EN):(theoryLessonNotation==='latino'?NOTE_NAMES_LATINO:NOTE_NAMES);
  const name=String(names[pc]).replace('#','♯');return name+(withOctave?octave:'');
}
function theoryPcLabel(pc,preferFlat=false){return theoryNoteLabel(60+((pc%12)+12)%12,false,preferFlat)}
function theoryEnharmonicLabel(midi){
  const pc=((midi%12)+12)%12;if(![1,3,6,8,10].includes(pc))return '';
  return theoryNoteLabel(midi,true,false)+' / '+theoryNoteLabel(midi,true,true);
}
function theoryQualityLabel(quality){return quality==='minor'?'menor':quality==='dim'?'disminuido':'mayor'}
function theoryChordShortName(root,quality='major'){return theoryPcLabel(theoryPitch(root))+(quality==='minor'?'m':quality==='dim'?'dim':'')}
function theoryChordTitle(root,quality='major'){return theoryPcLabel(theoryPitch(root))+' '+theoryQualityLabel(quality)}
function theoryChordIntervals(quality){return quality==='minor'?[0,3,7]:quality==='dim'?[0,3,6]:[0,4,7]}
function theoryChordMidis(root,quality='major',inversion=0){
  const rootMidi=60+theoryPitch(root),notes=theoryChordIntervals(quality).map(semitone=>rootMidi+semitone);
  if(inversion===1)return[notes[1],notes[2],notes[0]+12];
  if(inversion===2)return[notes[2],notes[0]+12,notes[1]+12];
  return notes;
}
function theoryScaleMidis(root,mode='major'){const steps=mode==='minor'?[0,2,3,5,7,8,10,12]:THEORY_MAJOR_FORMULA,base=60+theoryPitch(root);return steps.map(semitone=>base+semitone)}
function theoryDiatonicFamily(root,mode='major'){
  const pc=theoryPitch(root),minor=mode==='minor',scale=minor?[0,2,3,5,7,8,10]:THEORY_MAJOR_STEPS;
  const qualities=minor?['minor','dim','major','minor','minor','major','major']:['major','minor','minor','major','major','minor','dim'];
  const roman=minor?['i','ii°','III','iv','v','VI','VII']:['I','ii','iii','IV','V','vi','vii°'];
  const chords=scale.map((step,index)=>{const chordRoot=NOTE_NAMES[(pc+step)%12],quality=qualities[index],intervals=theoryChordIntervals(quality);return{degree:index+1,roman:roman[index],root:chordRoot,quality,notes:intervals.map(interval=>(pc+step+interval)%12),label:theoryChordShortName(chordRoot,quality)}});
  return{scale:scale.map(step=>(pc+step)%12),chords};
}
function theoryAllowedPitches(pool){
  const pcs=pool==='do'?[0]:pool==='natural'?THEORY_NATURAL_PCS:pool==='altered'?THEORY_ALTERED_PCS:Array.from({length:12},(_,index)=>index);
  return[3,4,5].flatMap(octave=>pcs.map(pc=>(octave+1)*12+pc)).filter(midi=>midi>=48&&midi<=83);
}
function prepareTheoryExercise(){
  if(theoryExerciseForIndex===theoryLessonIndex)return;
  theoryExerciseForIndex=theoryLessonIndex;theoryExerciseTarget=null;theoryExerciseStep=0;theoryExerciseTapped=new Set();theoryExerciseStatus='';theoryLessonHeard=false;
  const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{};theoryExerciseRoot=exercise.roots?.[0]||'C';theoryExerciseQuality=exercise.quality||'major';
  if(exercise.type==='find-note'){const pitches=theoryAllowedPitches(exercise.pool||'all');theoryExerciseTarget=pitches[Math.floor(Math.random()*pitches.length)]||60;}
  else if(exercise.type==='interval'){const pairs=exercise.pairs||[[60,62]];theoryExerciseTarget=pairs[Math.floor(Math.random()*pairs.length)];}
  else if(exercise.type==='chord-builder'){const targets=exercise.targets||[{root:'C',quality:'major'}];theoryExerciseTarget=exercise.random?targets[Math.floor(Math.random()*targets.length)]:targets[0];theoryExerciseRoot=theoryExerciseTarget.root;theoryExerciseQuality=theoryExerciseTarget.quality;}
  else if(exercise.type==='inversion'){theoryExerciseTarget={root:exercise.root||'C',quality:exercise.quality||'major',inversion:exercise.inversion||1};theoryExerciseRoot=theoryExerciseTarget.root;theoryExerciseQuality=theoryExerciseTarget.quality;}
}
function theoryExerciseScaleTarget(){const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{},root=theoryExerciseRoot||exercise.roots?.[0]||'C';return{root,notes:theoryScaleMidis(root)}}
function theoryScaleNoteLabel(midi,root){return theoryNoteLabel(midi,true,root==='F')}
function theoryExerciseChordTarget(){
  const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{};
  if(exercise.type==='inversion'){const target=theoryExerciseTarget||{root:exercise.root||'C',quality:exercise.quality||'major',inversion:exercise.inversion||1};return{...target,midis:theoryChordMidis(target.root,target.quality,target.inversion)}}
  const target=theoryExerciseTarget||exercise.targets?.[0]||{root:'C',quality:'major'};return{...target,midis:theoryChordMidis(target.root,target.quality)};
}
function theoryExerciseProgression(){
  const exercise=THEORY_LESSONS[theoryLessonIndex]?.exercise||{},root=theoryExerciseRoot||exercise.roots?.[0]||'C',family=theoryDiatonicFamily(root,'major'),degrees=exercise.degrees||[1,5,6,4];
  return{root,family,chords:degrees.map(degree=>family.chords[degree-1]).filter(Boolean)};
}
function theoryExerciseActivePcs(lesson){
  const exercise=lesson.exercise||{};
  if(exercise.type==='find-note')return[];
  if(exercise.type==='interval')return theoryExerciseTarget||[];
  if(exercise.type==='scale'){const notes=theoryExerciseScaleTarget().notes;return theoryLessonHeard?notes.map(midi=>midi%12):[notes[Math.min(theoryExerciseStep,notes.length-1)]%12]}
  if(exercise.type==='chord-builder'||exercise.type==='inversion')return theoryExerciseChordTarget().midis.map(midi=>midi%12);
  if(exercise.type==='progression'){if(!theoryLessonHeard)return[];const progression=theoryExerciseProgression(),chord=progression.chords[Math.min(theoryExerciseStep,progression.chords.length-1)];return chord?.notes||[]}
  return(lesson.demo?.notes||lesson.demo?.chords?.[0]||[]).map(midi=>midi%12);
}
function theoryChapterNumber(id){return Math.max(1,THEORY_CHAPTERS.findIndex(chapter=>chapter.id===id)+1)}
function theoryRenderAnswerButtons(exercise){return(exercise.answers||[]).map((answer,index)=>'<button type="button" class="lesson-answer" data-answer-index="'+index+'">'+escapeHTML(answer.label||answer)+'</button>').join('')}
function theoryRenderExercise(lesson){
  const exercise=lesson.exercise||{},status=theoryExerciseStatus||exercise.hint||'Tómate tu tiempo. Puedes volver a escuchar el ejemplo cuando quieras.';
  if(exercise.type==='find-note'){
    const target=Number(theoryExerciseTarget)||60,display=theoryNoteLabel(target,true),alias=theoryEnharmonicLabel(target);
    return'<div class="lesson-task"><small>RETO EN EL TECLADO</small><h3>Encuentra '+escapeHTML(display)+'</h3>'+(alias?'<p class="lesson-task-alias">Esta tecla también puede llamarse '+escapeHTML(alias)+'.</p>':'')+'<p>Busca la tecla exacta. La octava indicada también cuenta.</p><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p><button type="button" class="lesson-task-secondary" data-exercise-reset>🎲 Pedir otra nota</button></div>';
  }
  if(exercise.type==='interval'){
    const pair=theoryExerciseTarget||[60,62],options=exercise.answers||[];
    return'<div class="lesson-task"><small>ESCUCHA Y COMPARA</small><h3>¿Qué distancia hay entre '+escapeHTML(theoryNoteLabel(pair[0],true))+' y '+escapeHTML(theoryNoteLabel(pair[1],true))+'?</h3><p>Toca Escuchar, mira cuántas teclas hay entre las notas y elige una respuesta.</p><button type="button" class="lesson-task-secondary" data-exercise-listen>▶ Escuchar las dos notas</button><div class="lesson-answers">'+options.map(answer=>'<button type="button" class="lesson-answer" data-interval-answer="'+answer.value+'">'+escapeHTML(answer.label)+'</button>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p></div>';
  }
  if(exercise.type==='scale'){
    const roots=exercise.roots||['C'],target=theoryExerciseScaleTarget(),notes=target.notes,next=notes[Math.min(theoryExerciseStep,notes.length-1)];
    return'<div class="lesson-task"><small>CONSTRUYE Y TOCA</small><h3>Escala mayor de '+escapeHTML(theoryPcLabel(theoryPitch(target.root)))+'</h3><p>Elige el punto de partida y toca las ocho notas en orden, hasta llegar a la siguiente octava.</p><label class="lesson-task-select">Nota de inicio<select data-theory-exercise-root>'+roots.map(root=>'<option value="'+escapeHTML(root)+'"'+(root===theoryExerciseRoot?' selected':'')+'>'+escapeHTML(theoryPcLabel(theoryPitch(root)))+'</option>').join('')+'</select></label><p class="lesson-task-formula">Receta: tono · tono · semitono · tono · tono · tono · semitono</p><div class="lesson-task-note-row theory-scale-note-row'+(theoryLessonHeard?'':' hidden')+'" id="theoryScaleNoteRow">'+notes.map(note=>'<span>'+escapeHTML(theoryScaleNoteLabel(note,target.root))+'</span>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||('Paso '+Math.min(theoryExerciseStep+1,notes.length)+' de '+notes.length+' · toca '+theoryScaleNoteLabel(next,target.root)))+'</p><button type="button" class="lesson-task-secondary" data-lesson-demo>▶ Escuchar esta escala</button></div>';
  }
  if(exercise.type==='chord-builder'){
    const target=theoryExerciseChordTarget(),names=target.midis.map(midi=>theoryNoteLabel(midi,true));
    return'<div class="lesson-task"><small>CONSTRUYE EL ACORDE</small><h3>Toca '+escapeHTML(theoryChordTitle(target.root,target.quality))+'</h3><p>Fórmula: '+escapeHTML(target.quality==='minor'?'1 – ♭3 – 5':target.quality==='dim'?'1 – ♭3 – ♭5':'1 – 3 – 5')+'. Busca sus tres notas en el teclado.</p><div class="lesson-task-note-row">'+names.map(name=>'<span>'+escapeHTML(name)+'</span>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p><button type="button" class="lesson-task-secondary" data-lesson-demo>▶ Escuchar el acorde</button>'+(exercise.random?'<button type="button" class="lesson-task-secondary" data-exercise-reset>🎲 Pedir otro acorde</button>':'')+'</div>';
  }
  if(exercise.type==='inversion'){
    const target=theoryExerciseChordTarget(),names=target.midis.map(midi=>theoryNoteLabel(midi,true));
    return'<div class="lesson-task"><small>PRUEBA UNA INVERSIÓN</small><h3>Construye '+escapeHTML(theoryChordShortName(target.root,target.quality)+'/'+theoryPcLabel(target.midis[0]%12))+'</h3><p>Estas son las notas exactas de la primera inversión. Tócalas en el orden que prefieras.</p><div class="lesson-task-note-row">'+names.map(name=>'<span>'+escapeHTML(name)+'</span>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p><button type="button" class="lesson-task-secondary" data-lesson-demo>▶ Escuchar las tres posiciones</button></div>';
  }
  if(exercise.type==='key-family'){
    const roots=exercise.roots||['C','G'],root=theoryExerciseRoot||roots[0],family=theoryDiatonicFamily(root,'major'),targetDegree=Number(exercise.targetDegree)||6;
    return'<div class="lesson-task"><small>ESCALA Y FAMILIA DE ACORDES</small><h3>Explora una tonalidad mayor</h3><p>Elige una tonalidad: verás sus siete notas y los acordes que nacen de ellas. Después encuentra el acorde vi.</p><label class="lesson-task-select">Tonalidad<select data-theory-exercise-root>'+roots.map(item=>'<option value="'+escapeHTML(item)+'"'+(item===root?' selected':'')+'>'+escapeHTML(theoryPcLabel(theoryPitch(item)))+' mayor</option>').join('')+'</select></label><div class="lesson-task-note-row">'+family.scale.map(pc=>'<span>'+escapeHTML(theoryPcLabel(pc,true))+'</span>').join('')+'</div><div class="lesson-family-chords">'+family.chords.map(chord=>'<button type="button" data-family-degree="'+chord.degree+'" data-family-root="'+escapeHTML(chord.root)+'" data-family-quality="'+chord.quality+'" data-family-roman="'+escapeHTML(chord.roman)+'" aria-label="'+escapeHTML(chord.roman+' '+chord.label)+'"><small>'+escapeHTML(chord.roman)+'</small><b>'+escapeHTML(chord.label)+'</b></button>').join('')+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||('En '+theoryPcLabel(theoryPitch(root))+' mayor, toca el acorde '+(family.chords[targetDegree-1]?.roman||'vi')+'.'))+'</p></div>';
  }
  if(exercise.type==='progression'){
    const roots=exercise.roots||['C','G','D'],progression=theoryExerciseProgression(),current=progression.chords[Math.min(theoryExerciseStep,progression.chords.length-1)];
    return'<div class="lesson-task"><small>ESCUCHA Y PRACTICA LA PROGRESIÓN</small><h3>El mismo recorrido en otra tonalidad</h3><label class="lesson-task-select">Tonalidad<select data-theory-exercise-root>'+roots.map(root=>'<option value="'+escapeHTML(root)+'"'+(root===theoryExerciseRoot?' selected':'')+'>'+escapeHTML(theoryPcLabel(theoryPitch(root)))+' mayor</option>').join('')+'</select></label><p class="lesson-task-formula">I – V – vi – IV</p><div class="lesson-progression-chords">'+progression.chords.map((chord,index)=>'<span class="'+(index===theoryExerciseStep?'current':'')+'"><small>'+escapeHTML(chord.roman)+'</small><b>'+escapeHTML(chord.label)+'</b></span>').join('')+'</div><button type="button" class="lesson-task-secondary" data-progression-listen>▶ Escuchar primero</button><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||(theoryLessonHeard?'Ahora toca '+(current?.label||'el acorde indicado')+'.':'Escucha una vuelta completa antes de practicar.'))+'</p></div>';
  }
  if(exercise.type==='choice')return'<div class="lesson-task"><small>COMPRUEBA LA IDEA</small><h3>'+escapeHTML(exercise.question||'¿Qué aprendiste?')+'</h3><div class="lesson-answers">'+theoryRenderAnswerButtons(exercise)+'</div><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(theoryExerciseStatus||'Elige una respuesta. Si quieres, escucha el ejemplo otra vez.')+'</p></div>';
  return'<div class="lesson-task"><small>PRUEBA LO APRENDIDO</small><p class="lesson-task-status" id="theoryExerciseStatus" role="status">'+escapeHTML(status)+'</p></div>';
}
function lessonKeyboardMarkup(lesson){
  const activePcs=new Set(theoryExerciseActivePcs(lesson).map(pc=>((pc%12)+12)%12)),preferFlat=lesson.exercise?.type==='scale'&&theoryExerciseRoot==='F',start=48,end=85,totalWhites=22;let whiteKeys='',blackKeys='',whiteBefore=0;
  for(let midi=start;midi<end;midi++){const pc=midi%12,name=NOTE_NAMES[pc];if(name.includes('#'))continue;const active=activePcs.has(pc),label=theoryNoteLabel(midi,true,preferFlat);whiteKeys+='<button type="button" class="lesson-key white'+(active?' active':'')+'" data-lesson-midi="'+midi+'" aria-label="Tocar '+escapeHTML(label)+'" title="'+escapeHTML(label)+'"><span>'+escapeHTML(label)+'</span></button>';whiteBefore++;}
  whiteBefore=0;
  for(let midi=start;midi<end;midi++){const pc=midi%12,name=NOTE_NAMES[pc];if(!name.includes('#')){whiteBefore++;continue;}const left=(whiteBefore/totalWhites)*100,active=activePcs.has(pc),label=theoryNoteLabel(midi,true,preferFlat);blackKeys+='<button type="button" class="lesson-key black'+(active?' active':'')+'" data-lesson-midi="'+midi+'" style="left:'+left+'%" aria-label="Tocar '+escapeHTML(label)+'" title="'+escapeHTML(label)+'"><span>'+escapeHTML(label)+'</span></button>';}
  return'<div class="lesson-keyboard">'+whiteKeys+blackKeys+'</div>';
}
function renderTheoryLessons(){
  stopTheorySequence();const list=$('theoryLessonList'),stage=$('theoryLessonStage');if(!list||!stage)return;prepareTheoryExercise();
  const done=theoryProgress(),lesson=THEORY_LESSONS[Math.min(theoryLessonIndex,THEORY_LESSONS.length-1)],chapter=THEORY_CHAPTERS.find(item=>item.id===lesson.chapter)||THEORY_CHAPTERS[0],chapterIndex=theoryChapterNumber(lesson.chapter),lessonNumber=String(theoryLessonIndex+1).padStart(2,'0'),lessonTotal=String(THEORY_LESSONS.length).padStart(2,'0'),complete=done.includes(theoryLessonIndex);
  list.innerHTML='<details class="lesson-syllabus"><summary>Capítulos y clases · '+done.length+' de '+THEORY_LESSONS.length+' completadas</summary>'+THEORY_CHAPTERS.map(item=>'<details class="lesson-level"'+(item.id===lesson.chapter?' open':'')+'><summary><span>'+escapeHTML(item.icon)+'</span><div><b>'+escapeHTML(item.title)+'</b><small>'+escapeHTML(item.goal)+'</small></div></summary><p class="lesson-syllabus-intro">'+escapeHTML(item.intro)+'</p>'+THEORY_LESSONS.map((entry,index)=>({entry,index})).filter(row=>row.entry.chapter===item.id).map(row=>'<button type="button" class="lesson-link'+(row.index===theoryLessonIndex?' active':'')+(done.includes(row.index)?' complete':'')+'" data-lesson-index="'+row.index+'"><span>'+(done.includes(row.index)?'✓':String(row.index+1).padStart(2,'0'))+'</span><b>'+escapeHTML(row.entry.title)+'</b><small>'+escapeHTML(row.entry.time)+'</small></button>').join('')+'</details>').join('')+'</details>';
  const percent=Math.round(done.length/THEORY_LESSONS.length*100),progressBar=$('theoryProgressFill')?.parentElement;if(progressBar)progressBar.setAttribute('aria-valuenow',String(percent));
  const welcomeTitle=$('theoryWelcomeTitle'),welcomeCopy=$('theoryWelcomeCopy'),welcomeLesson=$('theoryWelcomeLesson'),welcomeTime=$('theoryWelcomeTime'),welcomeButton=$('theoryJumpToLesson');
  if(done.length>=THEORY_LESSONS.length){if(welcomeTitle)welcomeTitle.textContent='¡Ya recorriste los seis capítulos!';if(welcomeCopy)welcomeCopy.textContent='Ya sabes orientarte en el teclado, construir escalas y acordes, y seguir progresiones. Puedes volver a cualquier capítulo para practicar otra vez.';if(welcomeButton)welcomeButton.innerHTML='Volver a practicar <span aria-hidden="true">→</span>';}
  else if(done.length){if(welcomeTitle)welcomeTitle.textContent='Sigamos con la siguiente clase';if(welcomeCopy)welcomeCopy.textContent='Tu avance se guarda en este dispositivo. Sigue a tu ritmo: observa, escucha, toca las teclas y repite cada práctica cuando la necesites.';if(welcomeButton)welcomeButton.innerHTML='Ir a mi clase <span aria-hidden="true">→</span>';}
  else{if(welcomeTitle)welcomeTitle.textContent='¡Hola! Vamos a conocer el piano desde el principio';if(welcomeCopy)welcomeCopy.textContent='El piano es un mapa de sonidos: las teclas de la izquierda suenan más graves y las de la derecha más agudas. Cada tecla produce una nota. Las notas tienen nombres —Do, Re, Mi, Fa, Sol, La y Si— y después de Si el orden vuelve a empezar en Do. Las teclas negras ayudan a orientarte: aparecen en grupos de dos y de tres, y Do está justo a la izquierda de cada grupo de dos. El dibujo se repite por todo el teclado.\n\nEn una vuelta de Do a Do hay doce pasos pequeños: siete teclas blancas naturales y cinco teclas negras alteradas. A esa vuelta la llamamos octava. Una nota puede repetirse en varias alturas, por ejemplo Do3, Do4 y Do5. El nombre te dice qué sonido buscas; el número te dice en qué zona del piano está. También puedes cambiar la forma de ver los nombres entre Do–Re–Mi y C–D–E.\n\nPrimero aprenderás a encontrar y tocar notas. Luego compararás las distancias entre ellas, construirás escalas y juntarás notas para formar acordes. Al final verás cómo los acordes pertenecen a una tonalidad y cómo seguir una progresión para acompañar canciones. Para empezar, toca con un dedo, despacio y con la mano relajada; no hace falta tocar fuerte, rápido ni usar ambas manos. No necesitas leer partituras ni memorizar todo antes de empezar: cada capítulo explica una idea, te la muestra y te deja probarla en el teclado.';}
  if(welcomeLesson)welcomeLesson.textContent=lesson.title;if(welcomeTime)welcomeTime.textContent=lesson.time+' · explicación y práctica';
  $('theoryProgressText').textContent=done.length+' de '+THEORY_LESSONS.length+' clases completadas';$('theoryProgressFill').style.width=percent+'%';
  const topicMarkup='<section class="lesson-chapter-banner" aria-label="Introducción al capítulo"><div class="lesson-chapter-icon" aria-hidden="true">'+escapeHTML(chapter.icon)+'</div><div class="lesson-chapter-copy"><small>INTRODUCCIÓN DEL CAPÍTULO '+chapterIndex+'</small><h3>'+escapeHTML(chapter.title)+'</h3><p>'+escapeHTML(chapter.intro)+'</p><div class="lesson-chapter-goal"><b>Al terminar:</b> '+escapeHTML(chapter.goal)+'</div></div></section>';
  const partsMarkup=lesson.parts.map((part,index)=>'<article class="lesson-explain-card"><span>'+String(index+1)+'</span><div><h3>'+escapeHTML(part[0])+'</h3><p>'+escapeHTML(part[1])+'</p></div></article>').join('');
  const visualMarkup=lesson.visual.map((item,index)=>'<span>'+escapeHTML(item)+'</span>'+(index<lesson.visual.length-1?'<i aria-hidden="true">›</i>':'')).join('');
  const notationMarkup=lesson.chapter==='keyboard'?'<div class="lesson-note-mode" aria-label="Forma de mostrar los nombres de las notas"><span>Ver los nombres como:</span><button type="button" data-course-notation="latino" aria-pressed="'+(theoryLessonNotation==='latino')+'">Do · Re · Mi</button><button type="button" data-course-notation="americano" aria-pressed="'+(theoryLessonNotation==='americano')+'">C · D · E</button></div>':'';
  const keyboard=lessonKeyboardMarkup(lesson),exerciseMarkup=theoryRenderExercise(lesson),statusText=complete?(theoryLessonFeedback||'Esta clase ya está completada. Puedes repetirla cuando quieras.'):'Completa la práctica de esta clase para guardar tu avance.';
  stage.innerHTML=topicMarkup+'<div class="lesson-stage-top"><span class="lesson-level-tag">CAPÍTULO '+chapterIndex+' · CLASE '+lessonNumber+'</span><span>'+lessonNumber+' de '+lessonTotal+' · '+escapeHTML(lesson.time)+'</span></div><h2 class="lesson-title">'+escapeHTML(lesson.title)+'</h2><p class="lesson-copy lesson-opening">'+escapeHTML(lesson.intro)+'</p><div class="lesson-explain-grid" aria-label="Explicación paso a paso">'+partsMarkup+'</div><aside class="lesson-remember"><span aria-hidden="true">💡</span><p><b>Recuerda:</b> '+escapeHTML(lesson.remember)+'</p></aside><section class="lesson-example"><div class="lesson-example-heading"><small>VEAMOS Y ESCUCHEMOS</small><span>'+escapeHTML(lesson.visualNote||'Sigue el ejemplo de izquierda a derecha.')+'</span></div><div class="lesson-visual" aria-label="Ejemplo del capítulo">'+visualMarkup+'</div><button type="button" class="lesson-listen" data-lesson-demo>▶ Escuchar ejemplo</button></section><section class="lesson-practice-bench"><div class="lesson-practice-heading"><small>AHORA PRUEBA TÚ</small><h3>Usa el piano para practicar</h3><p>Toca una tecla para escucharla. En los retos, la app te dirá qué buscar y cómo vas.</p></div>'+notationMarkup+'<div class="lesson-task-wrap">'+exerciseMarkup+'</div><div class="lesson-keyboard-scroll" aria-label="Teclado de práctica, Do3 a Do6">'+keyboard+'</div><div class="lesson-stage-actions lesson-practice-actions"><button type="button" class="lesson-open-piano" data-open-piano>⛶ Hacer el piano más grande</button><span id="lessonTouchStatus" aria-live="polite">Teclado de Do3 a Do6 · toca cualquier tecla</span></div></section><p class="lesson-gate-hint" id="lessonGateHint" aria-live="polite">'+escapeHTML(statusText)+'</p><div class="lesson-stage-actions lesson-next-actions"><button type="button" class="lesson-next" data-lesson-next '+(complete?'':'disabled')+'>'+(theoryLessonIndex===THEORY_LESSONS.length-1?'Volver al capítulo 1':'Continuar a la siguiente clase')+' →</button></div>';
  const focusPiano=$('lessonPianoFocus'),focusKeyboard=$('lessonPianoFocusKeyboard');if(focusPiano)focusPiano.classList.add('hidden');
  if(focusKeyboard)focusKeyboard.innerHTML=keyboard.replace(/data-lesson-midi=/g,'data-focus-midi=');
  const focusStep=$('lessonFocusStep'),focusTitle=$('lessonFocusTitle'),focusPrompt=$('lessonFocusPrompt'),focusStatus=$('lessonFocusStatus');
  if(focusStep)focusStep.textContent='CAPÍTULO '+chapterIndex+' · CLASE '+lessonNumber+' / '+lessonTotal;if(focusTitle)focusTitle.textContent=lesson.title;
  if(focusPrompt)focusPrompt.textContent=lesson.exercise?.type==='find-note'?'Encuentra '+theoryNoteLabel(Number(theoryExerciseTarget)||60,true)+'. El número de octava también cuenta.':'Escucha el ejemplo y prueba las teclas indicadas en la clase.';
  if(focusStatus)focusStatus.textContent=theoryExerciseStatus||'Toca una tecla para escucharla.';
}
function theoryUpdateExerciseStatus(message){
  theoryExerciseStatus=message||'';const main=$('theoryExerciseStatus'),focus=$('lessonFocusStatus'),touch=$('lessonTouchStatus');
  if(main)main.textContent=theoryExerciseStatus;if(focus)focus.textContent=theoryExerciseStatus||'Toca una tecla para escucharla.';if(touch)touch.textContent=theoryExerciseStatus||'Teclado de Do3 a Do6 · toca cualquier tecla';
}
function theoryUpdateHighlights(){
  const lesson=THEORY_LESSONS[theoryLessonIndex];if(!lesson)return;const active=new Set(theoryExerciseActivePcs(lesson).map(pc=>((pc%12)+12)%12));
  document.querySelectorAll('#theoryLessonStage .lesson-key[data-lesson-midi],#lessonPianoFocus .lesson-key[data-focus-midi]').forEach(key=>{const midi=Number(key.dataset.lessonMidi||key.dataset.focusMidi);key.classList.toggle('active',active.has(midi%12));});
}
function theoryCompleteLesson(message){
  const done=theoryProgress();if(!done.includes(theoryLessonIndex)){done.push(theoryLessonIndex);try{localStorage.setItem(THEORY_LESSON_PROGRESS_KEY,JSON.stringify(done));}catch(_){}}
  theoryLessonFeedback=message||'¡Muy bien! Completaste esta clase.';theoryExerciseStatus=theoryLessonFeedback;
  const next=$('theoryLessonStage')?.querySelector('[data-lesson-next]');if(next)next.disabled=false;
  const gate=$('lessonGateHint'),status=$('theoryExerciseStatus'),focus=$('lessonFocusStatus');if(gate)gate.textContent=theoryLessonFeedback;if(status)status.textContent=theoryLessonFeedback;if(focus)focus.textContent=theoryLessonFeedback;
  const percent=Math.round(done.length/THEORY_LESSONS.length*100);$('theoryProgressText').textContent=done.length+' de '+THEORY_LESSONS.length+' clases completadas';$('theoryProgressFill').style.width=percent+'%';
  const progressBar=$('theoryProgressFill')?.parentElement;if(progressBar)progressBar.setAttribute('aria-valuenow',String(percent));
  const link=document.querySelector('#theoryLessonList [data-lesson-index="'+theoryLessonIndex+'"]');if(link){link.classList.add('complete');const marker=link.querySelector('span');if(marker)marker.textContent='✓';}
}
function playLessonNotes(notes,spacing=0,duration=.9,visualDuration=.85){
  stopTheorySequence();void resumeAudioContext(getAudioContext());notes.forEach((midi,index)=>{const timer=setTimeout(()=>{const key=lessonKeyForMidi(midi),wasRecording=state.recording;state.recording=false;playNote(midi,key,duration,visualDuration);state.recording=wasRecording;},index*spacing);theorySequenceTimers.push(timer);});
}
function playLessonChordSequence(chords,spacing=1000,duration=1){
  stopTheorySequence();void resumeAudioContext(getAudioContext());chords.forEach((chord,index)=>chord.forEach(midi=>{const timer=setTimeout(()=>{const key=lessonKeyForMidi(midi),wasRecording=state.recording;state.recording=false;playNote(midi,key,duration,.9);state.recording=wasRecording;},index*spacing);theorySequenceTimers.push(timer);}));
}
function playExerciseProgression(){
  const progression=theoryExerciseProgression(),chords=progression.chords.map(chord=>theoryChordMidis(chord.root,chord.quality));playLessonChordSequence(chords,1050,.95);theoryLessonHeard=true;
  theoryUpdateExerciseStatus('Escucha la vuelta completa. Después toca '+(progression.chords[0]?.label||'el primer acorde')+'.');
}
function playLessonDemo(){
  const lesson=THEORY_LESSONS[theoryLessonIndex],exercise=lesson.exercise||{};
  if(exercise.type==='progression')return playExerciseProgression();if(exercise.type==='scale')return playLessonNotes(theoryExerciseScaleTarget().notes,420,.75,.7);
  if(exercise.type==='interval')return playLessonNotes(theoryExerciseTarget||[60,62],800,.95,.85);
  if(exercise.type==='chord-builder'||exercise.type==='inversion'){const target=theoryExerciseChordTarget();return playLessonNotes(target.midis,0,1.2,1);}
  const demo=lesson.demo||{};if(demo.chords)return playLessonChordSequence(demo.chords,demo.spacing||1000,demo.duration||.9);if(demo.notes)return playLessonNotes(demo.notes,demo.spacing||0,demo.duration||.8,demo.visualDuration||.7);
}
function theoryPlayFamilyChord(button){
  const chord={root:button.dataset.familyRoot,quality:button.dataset.familyQuality},midis=theoryChordMidis(chord.root,chord.quality),pcs=theoryChordIntervals(chord.quality).map(interval=>(theoryPitch(chord.root)+interval)%12);
  document.querySelectorAll('#theoryLessonStage .lesson-key').forEach(key=>key.classList.toggle('active',pcs.includes(Number(key.dataset.lessonMidi)%12)));playLessonNotes(midis,0,1.05,.95);
  const exercise=THEORY_LESSONS[theoryLessonIndex].exercise,degree=Number(button.dataset.familyDegree),root=theoryExerciseRoot;
  if(degree===Number(exercise.targetDegree||6))theoryCompleteLesson('¡Correcto! '+button.dataset.familyRoman+' en '+theoryPcLabel(theoryPitch(root))+' mayor es '+theoryChordShortName(chord.root,chord.quality)+'.');
  else theoryUpdateExerciseStatus('Escuchaste '+theoryChordShortName(chord.root,chord.quality)+'. Sigue buscando el acorde '+(theoryDiatonicFamily(root).chords[(Number(exercise.targetDegree)||6)-1]?.roman||'vi')+'.');
}
function theoryCheckKeyTap(midi){
  const lesson=THEORY_LESSONS[theoryLessonIndex],exercise=lesson.exercise||{},targetNote=theoryNoteLabel(midi,true);
  if(exercise.type==='find-note'){
    if(midi===Number(theoryExerciseTarget))theoryCompleteLesson('¡Encontraste '+theoryNoteLabel(midi,true)+'! Ya puedes buscar otra nota o seguir a la próxima clase.');
    else theoryUpdateExerciseStatus('Tocaste '+targetNote+'. Busca '+theoryNoteLabel(Number(theoryExerciseTarget)||60,true)+' y revisa también su octava.');return;
  }
  if(exercise.type==='scale'){
    const scale=theoryExerciseScaleTarget(),notes=scale.notes,expected=notes[theoryExerciseStep];if(midi!==expected){theoryUpdateExerciseStatus('Tocaste '+theoryScaleNoteLabel(midi,scale.root)+'. El siguiente paso es '+theoryScaleNoteLabel(expected,scale.root)+'. Prueba otra vez.');return;}
    theoryExerciseStep++;if(theoryExerciseStep>=notes.length){theoryCompleteLesson('¡Tocaste la escala de '+theoryPcLabel(theoryPitch(theoryExerciseRoot))+' mayor de principio a fin!');return;}
    theoryUpdateHighlights();theoryUpdateExerciseStatus('¡Bien! Ahora toca '+theoryScaleNoteLabel(notes[theoryExerciseStep],scale.root)+' ('+theoryExerciseStep+' de '+notes.length+').');return;
  }
  if(exercise.type==='chord-builder'){
    const target=theoryExerciseChordTarget(),required=new Set(target.midis.map(note=>note%12)),pc=midi%12;if(!required.has(pc)){theoryUpdateExerciseStatus(targetNote+' no forma parte de '+theoryChordTitle(target.root,target.quality)+'. Busca las tres notas indicadas.');return;}
    theoryExerciseTapped.add(pc);if(theoryExerciseTapped.size>=required.size){theoryCompleteLesson('¡Acorde completo! Tocaste '+theoryChordTitle(target.root,target.quality)+'.');return;}
    theoryUpdateExerciseStatus('¡Sí! Ya encontraste '+theoryPcLabel(pc)+'. Busca las otras '+(required.size-theoryExerciseTapped.size)+' notas del acorde.');return;
  }
  if(exercise.type==='inversion'){
    const target=theoryExerciseChordTarget(),required=new Set(target.midis),note=Number(midi);if(!required.has(note)){theoryUpdateExerciseStatus('Tocaste '+targetNote+'. En esta inversión también importa la octava; revisa las notas indicadas.');return;}
    theoryExerciseTapped.add(note);if(theoryExerciseTapped.size>=required.size){theoryCompleteLesson('¡Muy bien! Construiste C/E: Do mayor con Mi como nota más grave.');return;}
    theoryUpdateExerciseStatus('¡Esa nota está bien! Te falta tocar '+(required.size-theoryExerciseTapped.size)+' nota(s) de la inversión.');return;
  }
  if(exercise.type==='progression'){
    if(!theoryLessonHeard){theoryUpdateExerciseStatus('Primero pulsa «Escuchar primero» para oír la progresión.');return;}
    const progression=theoryExerciseProgression(),chord=progression.chords[theoryExerciseStep];if(!chord)return;const required=new Set(chord.notes),pc=midi%12;
    if(!required.has(pc)){theoryUpdateExerciseStatus(targetNote+' no forma parte del acorde '+chord.label+'. Prueba las tres notas del acorde actual.');return;}
    theoryExerciseTapped.add(pc);if(theoryExerciseTapped.size>=required.size){theoryExerciseStep++;theoryExerciseTapped.clear();if(theoryExerciseStep>=progression.chords.length){theoryCompleteLesson('¡Acompañaste toda la progresión en '+theoryPcLabel(theoryPitch(progression.root))+' mayor!');return;}
      theoryUpdateHighlights();const next=progression.chords[theoryExerciseStep];theoryUpdateExerciseStatus('¡Acorde '+theoryExerciseStep+' de '+progression.chords.length+' listo! Ahora toca '+next.label+'.');return;}
    theoryUpdateExerciseStatus('¡Sí! '+theoryPcLabel(pc)+' pertenece a '+chord.label+'. Completa sus tres notas.');return;
  }
  theoryUpdateExerciseStatus('Tocaste '+targetNote+'. Usa las teclas y opciones de la práctica para seguir.');
}
function handleLessonKeyTap(key,midi){playNote(midi,key);theoryLessonTouched=true;theoryCheckKeyTap(midi)}
function theoryResetExercise(){theoryExerciseForIndex=-1;theoryExerciseTarget=null;theoryExerciseStep=0;theoryExerciseTapped=new Set();theoryExerciseStatus='';theoryLessonHeard=false;prepareTheoryExercise();renderTheoryLessons()}
function theoryResetExerciseProgress(){theoryExerciseStep=0;theoryExerciseTapped=new Set();theoryExerciseStatus='';theoryLessonHeard=false}
function closeLessonPiano(){stopTheorySequence();const panel=$('lessonPianoFocus');if(panel)panel.classList.add('hidden');document.querySelector('[data-open-piano]')?.focus()}
function bindTheoryLearning(){
  const savedProgress=theoryProgress();if(savedProgress.length){const resumeAt=THEORY_LESSONS.findIndex((_,index)=>!savedProgress.includes(index));theoryLessonIndex=resumeAt<0?0:resumeAt;}
  document.querySelectorAll('[data-theory-mode]').forEach(button=>button.onclick=()=>{const learning=button.dataset.theoryMode==='learn';document.querySelectorAll('[data-theory-mode]').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});$('theoryLearning').classList.toggle('hidden',!learning);$('theoryExplore').classList.toggle('hidden',learning);if(learning)renderTheoryLessons();});
  const theoryJump=$('theoryJumpToLesson');if(theoryJump)theoryJump.onclick=()=>{const stage=$('theoryLessonStage');stage.scrollIntoView({behavior:'smooth',block:'start'});stage.setAttribute('tabindex','-1');stage.focus({preventScroll:true});};
  $('theoryLearning').addEventListener('click',event=>{
    if(event.target.closest('#lessonPianoFocusClose,#lessonPianoFocusDone')){closeLessonPiano();return;}
    if(event.target.closest('#lessonFocusListen')){$('theoryLessonStage').querySelector('[data-progression-listen],[data-lesson-demo]')?.click();return;}
    const focusKey=event.target.closest('[data-focus-midi]');if(focusKey){handleLessonKeyTap(focusKey,Number(focusKey.dataset.focusMidi));return;}
  });
  document.addEventListener('keydown',event=>{const panel=$('lessonPianoFocus');if(event.key==='Escape'&&panel&&!panel.classList.contains('hidden'))closeLessonPiano();});
  $('theoryLessonList').onclick=event=>{const button=event.target.closest('[data-lesson-index]');if(!button)return;theoryLessonIndex=Number(button.dataset.lessonIndex);theoryLessonFeedback='';theoryExerciseForIndex=-1;theoryLessonHeard=false;theoryLessonTouched=false;renderTheoryLessons();$('theoryLessonStage').scrollIntoView({behavior:'smooth',block:'start'});};
  $('theoryLessonStage').onchange=event=>{const root=event.target.closest('[data-theory-exercise-root]');if(root){theoryExerciseRoot=root.value;theoryResetExerciseProgress();renderTheoryLessons();}};
  $('theoryLessonStage').onclick=event=>{
    if(event.target.closest('[data-open-piano]')){const panel=$('lessonPianoFocus'),lesson=THEORY_LESSONS[theoryLessonIndex];panel?.classList.remove('hidden');const prompt=$('lessonFocusPrompt'),status=$('lessonFocusStatus');if(prompt)prompt.textContent=lesson.exercise?.type==='find-note'?'Encuentra '+theoryNoteLabel(Number(theoryExerciseTarget)||60,true)+'. El número de octava también cuenta.':'Escucha el ejemplo y sigue las instrucciones de la clase.';if(status)status.textContent=theoryExerciseStatus||'Toca una tecla para escucharla.';$('lessonPianoFocusClose')?.focus();return;}
    if(event.target.closest('[data-lesson-demo]')){playLessonDemo();theoryLessonHeard=true;const lesson=THEORY_LESSONS[theoryLessonIndex],button=event.target.closest('[data-lesson-demo]');if(button)button.textContent='↻ Escuchar otra vez';if(lesson.exercise?.type==='scale'){const scaleRow=$('theoryScaleNoteRow');if(scaleRow)scaleRow.classList.remove('hidden');theoryUpdateHighlights();theoryUpdateExerciseStatus('Escuchaste la escala. Ahora tócala nota por nota, empezando en '+theoryScaleNoteLabel(theoryExerciseScaleTarget().notes[0],theoryExerciseRoot)+'.');}return;}
    if(event.target.closest('[data-progression-listen]')){playExerciseProgression();return;}
    if(event.target.closest('[data-exercise-listen]')){const pair=theoryExerciseTarget||[60,62];playLessonNotes(pair,800,.9,.85);theoryLessonHeard=true;theoryUpdateExerciseStatus('Escuchaste el par. Cuenta los pasos entre las dos notas y elige la respuesta.');return;}
    if(event.target.closest('[data-exercise-reset]')){theoryResetExercise();return;}
    const familyButton=event.target.closest('[data-family-degree]');if(familyButton){theoryPlayFamilyChord(familyButton);return;}
    const next=event.target.closest('[data-lesson-next]');if(next&&!next.disabled){theoryLessonIndex=theoryLessonIndex<THEORY_LESSONS.length-1?theoryLessonIndex+1:0;theoryLessonFeedback='';theoryExerciseForIndex=-1;theoryLessonHeard=false;theoryLessonTouched=false;renderTheoryLessons();$('theoryLessonStage').scrollIntoView({behavior:'smooth',block:'start'});return;}
    const answer=event.target.closest('[data-answer-index]');if(answer){const exercise=THEORY_LESSONS[theoryLessonIndex].exercise,correct=Number(answer.dataset.answerIndex)===Number(exercise.correct);if(correct)theoryCompleteLesson('¡Correcto! '+(exercise.why||'Ya entendiste esta idea.'));else theoryUpdateExerciseStatus('Todavía no. Vuelve a leer la explicación y prueba otra respuesta. '+(exercise.why||''));return;}
    const intervalAnswer=event.target.closest('[data-interval-answer]');if(intervalAnswer){const pair=theoryExerciseTarget||[60,62],distance=Math.abs(pair[1]-pair[0]),selected=Number(intervalAnswer.dataset.intervalAnswer);if(selected===distance)theoryCompleteLesson('¡Correcto! Entre '+theoryNoteLabel(pair[0],true)+' y '+theoryNoteLabel(pair[1],true)+' hay '+(distance===1?'un semitono':distance===2?'un tono':'tres semitonos')+'.');else theoryUpdateExerciseStatus('No son '+intervalAnswer.textContent+'. Cuenta las teclas desde la primera nota hasta la segunda y vuelve a probar.');return;}
    const notation=event.target.closest('[data-course-notation]');if(notation){theoryLessonNotation=notation.dataset.courseNotation;try{localStorage.setItem('yhwh_theory_notation',theoryLessonNotation)}catch(_){}renderTheoryLessons();return;}
    const key=event.target.closest('[data-lesson-midi]');if(key){handleLessonKeyTap(key,Number(key.dataset.lessonMidi));return;}
  };
}
function stageEnableNext(){const button=$('theoryLessonStage')?.querySelector('[data-lesson-next]');if(button)button.disabled=false;}
function theoryLabelChord(root,quality){const suffix={major:'',minor:'m',dim:'dim',dim7:'dim7',m7b5:'m7♭5',aug:'aum',sus2:'sus2',sus4:'sus4','7':'7',maj7:'maj7',m7:'m7',mMaj7:'mMaj7','6':'6',add9:'add9','5':'5'}[quality]||'';const latino=state.notation==='latino'?({C:'Do',D:'Re',E:'Mi',F:'Fa',G:'Sol',A:'La',B:'Si'}[root[0]]||root[0])+root.slice(1):root;return latino+suffix;}
function setTheoryChord(root,quality,keepMode=false){const mode=state.theoryPianoMode;state.theoryChord={root:theoryRoot(NOTE_NAMES.indexOf(root)>=0?NOTE_NAMES.indexOf(root):Number(root)),quality};state.theoryPianoIntervals=null;state.theoryPianoMode=keepMode?mode:'chord';if($('theoryRoot'))$('theoryRoot').value=state.theoryChord.root;renderTheorySelection();if(keepMode&&mode==='scale')renderTheoryScale();if(keepMode&&mode==='interval')renderTheoryIntervals();}
function renderTheorySelection(){
  const selected=state.theoryChord;const shape=THEORY_CHORDS.find(item=>item.quality===selected.quality)||THEORY_CHORDS[0];const label=theoryLabelChord(selected.root,selected.quality);
  const title=$('theoryChordTitle');if(title)title.textContent=`${label} · ${shape.name}`;
  const formula=$('theoryChordFormula');if(formula)formula.textContent=`Fórmula: ${shape.formula}`;
  const notes=shape.intervals.map(semi=>NOTE_NAMES[(NOTE_NAMES.indexOf(selected.root)+semi)%12]);
  const noteHtml=notes.map(note=>`<span class="theory-note">${escapeHTML(state.notation==='latino'?theoryLabelChord(note,''):note)}</span>`).join('');
  if($('theoryChordNotes'))$('theoryChordNotes').innerHTML=noteHtml;
  if(state.theoryPianoMode==='chord'){
    if($('theoryPianoNotes'))$('theoryPianoNotes').innerHTML=noteHtml;
    if($('theoryPianoTitle'))$('theoryPianoTitle').textContent=`${label} · ${shape.name}`;
    if($('theoryPianoPlay'))$('theoryPianoPlay').textContent='▶ Escuchar acorde';
    renderTheoryKeyboard(shape.intervals);
  }
}
function renderTheoryKeyboard(intervals){
  const holder=$('theoryPianoKeyboard');if(!holder)return;const rootPc=NOTE_NAMES.indexOf(state.theoryChord.root);let whites='',blacks='',whiteIndex=0;
  for(let midi=48;midi<72;midi++){
    if(NOTE_NAMES[midi%12].includes('#'))continue;
    const active=intervals.some(semi=>(rootPc+semi)%12===midi%12);const name=noteName(midi);const index=whiteIndex++;
    whites+=`<button class="theory-key white${active?' active':''}${midi%12===0?' octave':''}" data-midi="${midi}"><span>${escapeHTML(name)}</span></button>`;
  }
  whiteIndex=0;
  for(let midi=48;midi<72;midi++){
    if(!NOTE_NAMES[midi%12].includes('#')){whiteIndex++;continue;}
    const active=intervals.some(semi=>(rootPc+semi)%12===midi%12);const name=noteName(midi);const left=((whiteIndex/14)*100).toFixed(4);
    blacks+=`<button class="theory-key black${active?' active':''}" data-midi="${midi}" style="left:calc(${left}% - 10px)"><span>${escapeHTML(name)}</span></button>`;
  }
  holder.innerHTML=`<div class="theory-piano-keys">${whites}${blacks}</div>`;
}
function renderTheoryCircle(){
  const holder=$('theoryCircle');if(!holder)return;const cx=150,cy=150,r=112;let svg=`<svg viewBox="0 0 300 300" role="img" aria-label="Círculo de quintas">`;
  svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#3c3b55" stroke-width="2"/>`;
  const minor=state.theoryCircleMinor;const majorPc=THEORY_CIRCLE[state.theoryCircleIndex]||0;const tonicPc=minor?(majorPc+9)%12:majorPc;const degrees=minor?THEORY_MINOR_SCALE:THEORY_SCALE;const degreeNames=minor?THEORY_DEGREES_MINOR:THEORY_DEGREES;const roles=new Map();
  degrees.slice(0,6).forEach((degree,d)=>{const rootPc=(tonicPc+degree.semi)%12;const role=degree.quality==='minor'?'minor':'major';const circleIndex=THEORY_CIRCLE.findIndex(pc=>role==='major'?pc===rootPc:(pc+9)%12===rootPc);if(circleIndex>=0)roles.set(`${circleIndex}:${role}`,{degree:d+1,label:degreeNames[d],root:theoryRoot(rootPc),quality:degree.quality});});
  THEORY_CIRCLE.forEach((pc,i)=>{const angle=i*Math.PI/6-Math.PI/2;const x=cx+r*Math.cos(angle),y=cy+r*Math.sin(angle);const minorX=cx+(r-48)*Math.cos(angle),minorY=cy+(r-48)*Math.sin(angle);const majorRole=roles.get(`${i}:major`),minorRole=roles.get(`${i}:minor`);const chosenMajor=!minor&&state.theoryCircleIndex===i,chosenMinor=minor&&state.theoryCircleIndex===i;
    svg+=`<g class="theory-circle-node${majorRole?` degree-${majorRole.degree}`:''}${chosenMajor?' selected':''}" data-circle-index="${i}" tabindex="0" role="button" aria-label="${escapeHTML(theoryLabelChord(theoryRoot(pc),'major'))}${majorRole?`, grado ${majorRole.label}`:''}"><circle cx="${x}" cy="${y}" r="20"/><text x="${x}" y="${y+4}">${escapeHTML(theoryRoot(pc))}</text>${majorRole?`<title>${escapeHTML(`${majorRole.label} · ${theoryLabelChord(majorRole.root,majorRole.quality)}`)}</title>`:''}</g>`;
    const minorRoot=theoryRoot((pc+9)%12);svg+=`<g class="theory-circle-node minor${minorRole?` degree-${minorRole.degree}`:''}${chosenMinor?' selected':''}" data-circle-index="${i}" data-minor="1" tabindex="0" role="button" aria-label="${escapeHTML(theoryLabelChord(minorRoot,'minor'))}${minorRole?`, grado ${minorRole.label}`:''}"><circle cx="${minorX}" cy="${minorY}" r="15"/><text x="${minorX}" y="${minorY+3}">${escapeHTML(minorRoot)}m</text>${minorRole?`<title>${escapeHTML(`${minorRole.label} · ${theoryLabelChord(minorRole.root,minorRole.quality)}`)}</title>`:''}</g>`;
  });svg+='</svg>';holder.innerHTML=svg;
  holder.querySelectorAll('.theory-circle-node').forEach(node=>{
    const select=()=>selectTheoryCircle(Number(node.dataset.circleIndex),node.dataset.minor==='1',true);
    node.onclick=select;node.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}};
  });
}
function theoryNoteAt(semitones){return theoryLabelChord(theoryRoot(NOTE_NAMES.indexOf(state.theoryChord.root)+semitones),'');}
function theoryNotesHTML(semitones){return semitones.map(semi=>`<span class="theory-note">${escapeHTML(theoryNoteAt(semi))}</span>`).join('');}
function renderTheoryScale(){
  const select=$('theoryScaleType');if(select)select.value=state.theoryScale;
  const scale=THEORY_SCALES[state.theoryScale]||THEORY_SCALES.major;
  if($('theoryScaleFormula'))$('theoryScaleFormula').textContent=`${scale.name}: ${scale.formula}`;
  if($('theoryScaleNotes'))$('theoryScaleNotes').innerHTML=theoryNotesHTML(scale.semitones);
  if(state.theoryPianoMode==='scale'){
    if($('theoryPianoTitle'))$('theoryPianoTitle').textContent=`${theoryLabelChord(state.theoryChord.root,'')} ${scale.name}`;
    if($('theoryPianoNotes'))$('theoryPianoNotes').innerHTML=theoryNotesHTML(scale.semitones);
    if($('theoryPianoPlay'))$('theoryPianoPlay').textContent='▶ Escuchar escala';
    renderTheoryKeyboard(scale.semitones);
  }
}
function renderTheoryIntervals(){
  const cards=$('theoryIntervalCards');if(cards)cards.innerHTML=THEORY_INTERVALS.map(([name,label,semi])=>`<button class="theory-interval-card${state.theoryInterval===semi?' selected':''}" data-interval="${semi}"><b>${label}</b><small>${semi} ${semi===1?'semitono':'semitonos'}</small></button>`).join('');
  const interval=THEORY_INTERVALS.find(item=>item[2]===state.theoryInterval)||THEORY_INTERVALS[7];
  if($('theoryIntervalTitle'))$('theoryIntervalTitle').textContent=interval[0];
  if($('theoryIntervalInfo'))$('theoryIntervalInfo').textContent=`${interval[1]} · ${interval[2]} ${interval[2]===1?'semitono':'semitonos'} desde ${theoryLabelChord(state.theoryChord.root,'')}.`;
  const semitones=[0,interval[2]];if($('theoryIntervalNotes'))$('theoryIntervalNotes').innerHTML=theoryNotesHTML(semitones);
  if(state.theoryPianoMode==='interval'){
    if($('theoryPianoTitle'))$('theoryPianoTitle').textContent=`${theoryLabelChord(state.theoryChord.root,'')} · ${interval[0]}`;
    if($('theoryPianoNotes'))$('theoryPianoNotes').innerHTML=theoryNotesHTML(semitones);
    if($('theoryPianoPlay'))$('theoryPianoPlay').textContent='▶ Escuchar intervalo';
    renderTheoryKeyboard(semitones);
  }
}
function selectTheoryInterval(semitone){state.theoryInterval=Number(semitone);state.theoryPianoMode='interval';renderTheoryIntervals();}
function stopTheorySequence(){theorySequenceTimers.forEach(clearTimeout);theorySequenceTimers=[];}
function syncMetronomeUI(){
  const bpm=$('metronomeBpm'),meter=$('metronomeMeter'),value=$('metronomeBpmValue');
  if(bpm)bpm.value=String(metronomeBpm);
  if(meter)meter.value=String(metronomeMeter);
  if(value)value.textContent=`${metronomeBpm} BPM`;
  document.querySelectorAll('#metronomeBeats i').forEach((beat,index)=>{beat.style.display=index<metronomeMeter?'block':'none';beat.classList.remove('active');});
}
function setMetronomeBpm(value,save=false){
  metronomeBpm=Math.min(240,Math.max(40,Math.round(Number(value)||100)));
  syncMetronomeUI();
  if(save)try{localStorage.setItem('yhwh_piano_metronome_bpm',String(metronomeBpm));}catch(_){}
  if(metronomeOn){metronomeBeatIndex=0;metronomeNextBeat=getAudioContext().currentTime+.025;}
}
function setMetronomeMeter(value){
  metronomeMeter=[2,3,4,6].includes(Number(value))?Number(value):4;
  metronomeBeatIndex=0;syncMetronomeUI();
  try{localStorage.setItem('yhwh_piano_metronome_meter',String(metronomeMeter));}catch(_){}
}
function scheduleMetronomeBeat(context,time,beatIndex){
  const oscillator=context.createOscillator(),gain=context.createGain();
  oscillator.type='sine';oscillator.frequency.setValueAtTime(beatIndex===0?1760:1175,time);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(beatIndex===0?.16:.105,time+.002);gain.gain.exponentialRampToValueAtTime(.0001,time+.055);
  oscillator.connect(gain);gain.connect(context.destination);oscillator.start(time);oscillator.stop(time+.06);
  const visualTimer=setTimeout(()=>{
    metronomeVisualTimers=metronomeVisualTimers.filter(timer=>timer!==visualTimer);
    if(!metronomeOn)return;
    document.querySelectorAll('#metronomeBeats i').forEach((beat,index)=>beat.classList.toggle('active',index===beatIndex));
  },Math.max(0,(time-context.currentTime)*1000));
  metronomeVisualTimers.push(visualTimer);
}
function runMetronomeScheduler(){
  if(!metronomeOn)return;
  const context=getAudioContext(),step=60/metronomeBpm;
  while(metronomeNextBeat<context.currentTime+.12){
    scheduleMetronomeBeat(context,metronomeNextBeat,metronomeBeatIndex);
    metronomeNextBeat+=step;metronomeBeatIndex=(metronomeBeatIndex+1)%metronomeMeter;
  }
}
function startMetronome(){
  if(metronomeOn)return;
  const context=getAudioContext();metronomeOn=true;metronomeBeatIndex=0;
  $('metronomeToggle').setAttribute('aria-pressed','true');$('metronomeToggle').setAttribute('aria-label','Detener metrónomo');$('metronomeToggle').title='Detener metrónomo';$('metronomeToggle').textContent='■';
  resumeAudioContext(context).then(()=>{
    if(!metronomeOn)return;
    metronomeNextBeat=context.currentTime+.05;runMetronomeScheduler();metronomeTimer=setInterval(runMetronomeScheduler,25);
  }).catch(()=>{stopMetronome();toast('No se pudo iniciar el metrónomo. Vuelve a tocar el botón.');});
}
function stopMetronome(){
  metronomeOn=false;if(metronomeTimer){clearInterval(metronomeTimer);metronomeTimer=null;}
  metronomeVisualTimers.forEach(clearTimeout);metronomeVisualTimers=[];
  document.querySelectorAll('#metronomeBeats i').forEach(beat=>beat.classList.remove('active'));
  const button=$('metronomeToggle');if(button){button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Iniciar metrónomo');button.title='Metrónomo';button.textContent='♩';}
}
function toggleMetronome(){metronomeOn?stopMetronome():startMetronome();}
function tapMetronomeTempo(){
  const now=performance.now(),last=metronomeTaps[metronomeTaps.length-1];
  if(last&&now-last>2200)metronomeTaps=[];
  metronomeTaps.push(now);metronomeTaps=metronomeTaps.slice(-5);
  if(metronomeTaps.length<2)return;
  const gaps=metronomeTaps.slice(1).map((tap,index)=>tap-metronomeTaps[index]);
  setMetronomeBpm(60000/(gaps.reduce((sum,gap)=>sum+gap,0)/gaps.length),true);
}
async function playTheoryScale(){
  const scale=THEORY_SCALES[state.theoryScale]||THEORY_SCALES.major;stopTheorySequence();
  const notes=scale.semitones.map(semi=>60+NOTE_NAMES.indexOf(state.theoryChord.root)+semi);
  try{
    const context=getAudioContext(),resumePromise=resumeAudioContext(context);
    if(state.instrument==='grand-piano')await Promise.all([...notes.map(midi=>getSample(midi)),resumePromise]);
    else await Promise.all([...notes.map(midi=>getInstrumentSample(midi)),resumePromise]);
    notes.forEach((midi,index)=>{const timer=setTimeout(()=>{const wasRecording=state.recording;state.recording=false;playNote(midi,document.querySelector('.piano-panel .key[data-midi="'+midi+'"]'),.36,.18);state.recording=wasRecording;},index*320);theorySequenceTimers.push(timer);});
  }catch(error){$('theoryScaleFormula').textContent='No se pudieron cargar las muestras de sonido.';console.error(error);}
}
function liveKeyChords(root,keyMode){
  const degrees=keyMode==='minor'?THEORY_MINOR_SCALE:THEORY_SCALE;
  const labels=keyMode==='minor'?THEORY_DEGREES_MINOR:THEORY_DEGREES;
  const rootPc=NOTE_NAMES.indexOf(root);
  return degrees.map((degree,index)=>({degree:labels[index],root:theoryRoot(rootPc+degree.semi),quality:degree.quality}));
}
function playLiveKeyProgression(){
  stopTheorySequence();
  const chords=liveKeyChords($('liveTheoryRoot')?.value||'C',$('liveTheoryKeyMode')?.value==='minor'?'minor':'major');
  const startAt=getAudioContext().currentTime+.08;
  chords.forEach((chord,index)=>playChord({...chord,octave:60,duration:.56,tempo:.9,instrument:state.instrument,lightDurations:[.2,.2,.2],startAt:startAt+index*.72,preview:true,noTranspose:true}));
}
function playTheoryPianoSelection(){
  if(state.theoryPianoMode==='scale')return playTheoryScale();
  if(state.theoryPianoMode==='interval')return playChord({root:state.theoryChord.root,octave:60,intervals:[0,state.theoryInterval],duration:1.1,preview:true,noTranspose:true});
  return playChord({...state.theoryChord,octave:60,duration:2,preview:true,noTranspose:true});
}
function renderTheory(){
  if($('theoryRoot'))$('theoryRoot').value=state.theoryChord.root;
  const cards=$('theoryChordCards');if(cards)cards.innerHTML=THEORY_CHORDS.map(chord=>`<button class="theory-chord-card${state.theoryChord.quality===chord.quality?' selected':''}" data-theory-quality="${chord.quality}"><b>${chord.name}</b><span>Ejemplo: ${theoryLabelChord(state.theoryChord.root,chord.quality)}</span><small>Grados ${chord.formula}</small></button>`).join('');
  const minor=$('theoryMode')?.value==='minor';const degrees=minor?THEORY_MINOR_SCALE:THEORY_SCALE;const degreeNames=minor?THEORY_DEGREES_MINOR:THEORY_DEGREES;
  const keys=$('theoryKeyCards');if(keys)keys.innerHTML=NOTE_NAMES.map((root,rootPc)=>`<article class="theory-key-card"><h3>${theoryLabelChord(root,'')} ${minor?'menor natural':'mayor'}</h3><div>${degrees.map((degree,i)=>{const chordRoot=theoryRoot(rootPc+degree.semi);return `<button data-key-root="${chordRoot}" data-key-quality="${degree.quality}"><small>${degreeNames[i]}</small><b>${theoryLabelChord(chordRoot,degree.quality)}</b></button>`}).join('')}</div></article>`).join('');
  renderTheoryCircle();renderTheorySelection();
  renderTheoryScale();renderTheoryIntervals();
  if(!state.theoryCircleChords)selectTheoryCircle(0,false);
}
function selectTheoryCircle(index,minor,play=false){
  state.theoryCircleIndex=index;state.theoryCircleMinor=minor;const majorPc=THEORY_CIRCLE[index];const rootPc=minor?(majorPc+9)%12:majorPc;const root=theoryRoot(rootPc);const degrees=minor?THEORY_MINOR_SCALE:THEORY_SCALE;const degreeNames=minor?THEORY_DEGREES_MINOR:THEORY_DEGREES;const chords={};
  degrees.slice(0,6).forEach((degree,d)=>{const chordRoot=theoryRoot(rootPc+degree.semi);chords[degreeNames[d]]={root:chordRoot,quality:degree.quality,degree:degreeNames[d]};});state.theoryCircleChords=chords;state.theoryCircleChord=degreeNames[0];
  $('theoryCircleName').textContent=`${theoryLabelChord(root,'')} ${minor?'menor natural':'mayor'}`;$('theoryCircleSig').textContent=`Armadura: ${THEORY_SIG[majorPc]}${minor?' (relativa mayor: '+theoryLabelChord(theoryRoot(majorPc),'')+')':''}`;
  const results=$('theoryCircleResults');if(results)results.innerHTML=Object.entries(chords).map(([degree,chord],i)=>`<button class="circle-degree degree-${i+1}${i===0?' active':''}" data-circle-chord="${degree}" aria-label="${degree}, ${theoryLabelChord(chord.root,chord.quality)}"><span class="degree-badge">${degree}</span><small>${['Tónica','Supertonica','Mediante','Subdominante','Dominante','Submediante'][i]}</small><b>${theoryLabelChord(chord.root,chord.quality)}</b></button>`).join('');
  setTheoryChord(root,minor?'minor':'major');renderTheoryCircle();if(play)playChord({...chords[degreeNames[0]],octave:60,duration:2,preview:true,noTranspose:true});
}
function renderLiveTheoryDock(){
  const rootSelect=$('liveTheoryRoot'),info=$('liveTheoryInfo'),notesEl=$('liveTheoryNotes');
  if(!rootSelect||!info||!notesEl)return;
  const root=rootSelect.value||'C',rootPc=NOTE_NAMES.indexOf(root),rootName=theoryLabelChord(root,''),keyMode=$('liveTheoryKeyMode')?.value==='minor'?'minor':'major';
  let intervals=[],noteText='',description='';
  if(liveTheoryMode==='key'){
    const chords=liveKeyChords(root,keyMode);
    noteText=chords.map(chord=>`${chord.degree} ${theoryLabelChord(chord.root,chord.quality)}`);
    description=`${rootName} ${keyMode==='minor'?'menor':'mayor'} · acordes de la tonalidad.`;
    state.theoryPianoMode='chord';
  }else if(liveTheoryMode==='scale'){
    const scale=THEORY_SCALES[$('liveTheoryScale')?.value]||THEORY_SCALES.major;
    intervals=scale.semitones;description=`${rootName} ${scale.name}: ${scale.formula}.`;
    state.theoryScale=$('liveTheoryScale')?.value||'major';
  }else{
    const selectedInterval=Number($('liveTheoryInterval')?.value),semi=Number.isFinite(selectedInterval)?selectedInterval:7;
    const interval=THEORY_INTERVALS.find(item=>item[2]===semi)||THEORY_INTERVALS[7];
    intervals=[0,semi];description=`${interval[0]}: ${interval[1]}, a ${semi} ${semi===1?'semitono':'semitonos'} de ${rootName}.`;
    state.theoryInterval=semi;
  }
  state.theoryChord.root=root;state.theoryPianoMode=liveTheoryMode==='interval'?'interval':liveTheoryMode==='scale'?'scale':'chord';
  document.querySelectorAll('[data-live-theory]').forEach(button=>button.classList.toggle('active',button.dataset.liveTheory===liveTheoryMode));
  $('liveTheoryKeyModeWrap')?.classList.toggle('hidden',liveTheoryMode!=='key');
  $('liveTheoryScaleWrap')?.classList.toggle('hidden',liveTheoryMode!=='scale');
  $('liveTheoryIntervalWrap')?.classList.toggle('hidden',liveTheoryMode!=='interval');
  info.textContent=description;
  if(liveTheoryMode!=='key'){
    const names=[...new Set(intervals.map(semi=>NOTE_NAMES[(rootPc+semi)%12]))];
    noteText=names.map(name=>theoryLabelChord(name,''));
  }
  notesEl.innerHTML=noteText.map(name=>`<span>${escapeHTML(name)}</span>`).join('');
  $('liveTheoryPlayKey')?.classList.remove('hidden');
}
function closeLiveTheoryDock({clear=true}={}){
  $('liveTheoryDock')?.classList.add('hidden');$('theoryLiveToggle')?.setAttribute('aria-expanded','false');
  if(clear){document.querySelectorAll('#keyboard .key.theory-highlight').forEach(key=>{key.classList.remove('theory-highlight');delete key.dataset.theoryName;});$('liveTheoryPlayKey')?.classList.add('hidden');}
}
function bindLiveTheoryDockDrag(){
  const dock=$('liveTheoryDock'),handle=dock?.querySelector('.live-theory-head'),canvas=$('noteCanvas');
  if(!dock||!handle||!canvas||handle.dataset.dragBound)return;
  handle.dataset.dragBound='true';handle.title='Arrastra para mover el panel';
  const storageKey='yhwh_live_theory_position';
  const applyPosition=(xRatio,yRatio)=>{
    const maxX=Math.max(0,canvas.clientWidth-dock.offsetWidth),maxY=Math.max(0,canvas.clientHeight-dock.offsetHeight);
    const left=Math.min(maxX,Math.max(0,xRatio*maxX)),top=Math.min(maxY,Math.max(0,yRatio*maxY));
    dock.style.setProperty('left',`${left}px`,'important');dock.style.setProperty('top',`${top}px`,'important');
    dock.style.setProperty('right','auto','important');dock.style.setProperty('bottom','auto','important');
  };
  let saved=null;
  try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch(_){}
  if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))requestAnimationFrame(()=>applyPosition(saved.x,saved.y));
  let drag=null;
  handle.addEventListener('pointerdown',event=>{
    if(event.target.closest('button,select,input')||event.button!==0)return;
    const box=dock.getBoundingClientRect(),area=canvas.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:box.left-area.left,top:box.top-area.top,moved:false};
    handle.setPointerCapture(event.pointerId);event.preventDefault();dock.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const area=canvas.getBoundingClientRect(),maxX=Math.max(0,canvas.clientWidth-dock.offsetWidth),maxY=Math.max(0,canvas.clientHeight-dock.offsetHeight);
    const left=Math.min(maxX,Math.max(0,drag.left+event.clientX-drag.x)),top=Math.min(maxY,Math.max(0,drag.top+event.clientY-drag.y));
    drag.moved=true;dock.style.setProperty('left',`${left}px`,'important');dock.style.setProperty('top',`${top}px`,'important');dock.style.setProperty('right','auto','important');dock.style.setProperty('bottom','auto','important');
  });
  const finish=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const moved=drag.moved;drag=null;dock.classList.remove('is-dragging');
    if(moved){const maxX=Math.max(1,canvas.clientWidth-dock.offsetWidth),maxY=Math.max(1,canvas.clientHeight-dock.offsetHeight);try{localStorage.setItem(storageKey,JSON.stringify({x:dock.offsetLeft/maxX,y:dock.offsetTop/maxY}));}catch(_){}}
  };
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
  window.addEventListener('resize',()=>{try{const position=JSON.parse(localStorage.getItem(storageKey)||'null');if(position)applyPosition(position.x,position.y);}catch(_){}});
}
async function playLiveTheory(){
  renderLiveTheoryDock();
  if(liveTheoryMode==='key'){playLiveKeyProgression();return;}
  if(liveTheoryMode==='interval'){
    const root=$('liveTheoryRoot').value,selectedInterval=Number($('liveTheoryInterval').value),semi=Number.isFinite(selectedInterval)?selectedInterval:7;
    playChord({root,octave:60,intervals:[0,semi],duration:1.3,tempo:.9,lightDurations:[.18,.18],preview:true,noTranspose:true});return;
  }
  playTheoryScale();
}
function changeTheoryTab(tab){document.querySelectorAll('.theory-tab').forEach(button=>button.classList.toggle('active',button.dataset.theoryTab===tab));const panels=['theoryPanelChords','theoryPanelKeys','theoryPanelScales','theoryPanelIntervals','theoryPanelCircle','theoryPanelPiano'];const target=`theoryPanel${tab[0].toUpperCase()}${tab.slice(1)}`;transitionScreen(target,panels);if(tab==='chords')state.theoryPianoMode='chord';if(tab==='scales')state.theoryPianoMode='scale';if(tab==='intervals')state.theoryPianoMode='interval';if(tab==='chords'||tab==='scales'||tab==='intervals'||tab==='piano'){if(state.theoryPianoMode==='chord')renderTheorySelection();else if(state.theoryPianoMode==='scale')renderTheoryScale();else renderTheoryIntervals();}}
function openTrackChooser(song,category,purpose='listen'){
  if(state.melodyDirty&&!confirmDiscardUnsavedMelody())return;
  state.pendingSong={song,category};state.pendingPurpose=purpose;
  $('trackModalTitle').textContent=purpose==='create'?'¿Qué pista quieres crear o editar?':'¿Qué pista quieres escuchar?';
  $('trackModalHint').textContent=purpose==='create'?'Elige dónde guardar la melodía que vas a grabar.':'Elige una pista de esta alabanza.';
  const introExists=hasTrack(category,song.id,'introduccion'),voiceExists=hasTrack(category,song.id,'voz');
  $('introTrackState').textContent=introExists?'Melodía guardada':state.admin?'Aún no grabada · puedes crearla como Admin':'Aún no grabada';
  $('voiceTrackState').textContent=voiceExists?'Voz principal y armonías guardadas':state.admin?'Aún no grabada · puedes crearla como Admin':'Aún no grabada';
  $('trackModal').classList.remove('hidden');
}
function chooseTrack(type){
  if(!state.pendingSong)return;
  const {song,category}=state.pendingSong,autoPlay=state.pendingPurpose==='listen';state.pendingSong=null;$('trackModal').classList.add('hidden');openSong(song,category,type,autoPlay);
}
function closeTrackChooser(){state.pendingSong=null;$('trackModal').classList.add('hidden');}
function syncModeScreen(){
  const pairs=[['modeMelodyInstrument','instrumentSelect'],['modeBassInstrument','bassInstrumentQuick'],['modeMelodyColor','keyColorPicker'],['modeBassColor','bassColorPicker'],['modeSecondDirection','secondVoiceDirection'],['modeThirdDirection','thirdVoiceDirection']];
  pairs.forEach(([targetId,sourceId])=>{const target=$(targetId),source=$(sourceId);if(target&&source)target.value=source.value;});
  selectPlayMode('listen');showModeScreenTab('instructions');
  const track=selectedSongForContinue&&trackFor(selectedSongForContinue.category,selectedSongForContinue.song.id,'introduccion');
  if($('modeMelodyCount'))$('modeMelodyCount').textContent=`${track?.notas?.length||0} notas`;
}
function applyInstrumentSettingsPreset(settings){
  const pairs={instrument:'modeMelodyInstrument',bassInstrument:'modeBassInstrument',keyColor:'modeMelodyColor',bassColor:'modeBassColor',second:'modeSecondDirection',third:'modeThirdDirection'};
  Object.entries(settings).forEach(([key,value])=>{const control=$(pairs[key]);if(!control)return;control.value=value;control.dispatchEvent(new Event(control.type==='color'?'input':'change',{bubbles:true}));});
}
function updateInstrumentSoundToggle(track,enabled){
  const melody=track==='melody',id=melody?'melodySoundToggle':'bassSoundToggle';
  state[melody?'melodySoundEnabled':'bassSoundEnabled']=!!enabled;
  try{localStorage.setItem(melody?'yhwh_melody_sound_enabled':'yhwh_bass_sound_enabled',enabled?'1':'0');}catch(_){}
  const button=$(id);if(button){button.setAttribute('aria-checked',String(!!enabled));button.classList.toggle('muted',!enabled);const label=button.querySelector('small');if(label)label.textContent=enabled?'Sonido activado':'Sonido desactivado';}
}
function syncInstrumentSoundToggles(){updateInstrumentSoundToggle('melody',state.melodySoundEnabled);updateInstrumentSoundToggle('bass',state.bassSoundEnabled);}
function selectPlayMode(mode){
  if(!['listen','practice','second','third','settings'].includes(mode))return;
  selectedPlayMode=mode;
  const labels={listen:['Solo observar y escuchar','La alabanza se reproducirá automáticamente para que puedas verla y escucharla.'],practice:['Practicar la melodía','La melodía espera a que toques cada nota para avanzar.'],second:['Escuchar la segunda voz','Escucharás la segunda voz por separado con la dirección elegida.'],third:['Escuchar la tercera voz','Escucharás la tercera voz por separado con la dirección elegida.'],settings:['Manos, colores e instrumentos','Abre los ajustes de instrumentos, colores y dirección de las voces.']};
  const [title,description]=labels[mode];
  document.querySelectorAll('[data-play-mode]').forEach(button=>{const active=button.dataset.playMode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  if($('modePanelTitle'))$('modePanelTitle').textContent=title;
  if($('modeInfoText'))$('modeInfoText').textContent=description;
}
function showModeScreenTab(tab){
  if(!['instructions','directions'].includes(tab))return;
  selectedModeTab=tab;
  const ids={instructions:'modeInstructionsPanel',directions:'modeDirectionsPanel'};
  document.querySelectorAll('[data-mode-tab]').forEach(button=>{const active=button.dataset.modeTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
  Object.entries(ids).forEach(([name,id])=>$(id)?.classList.toggle('hidden',name!==tab));
  const titles={instructions:'Instrucciones',directions:'Dirección de las voces'};
  if($('modePanelTitle'))$('modePanelTitle').textContent=tab==='instructions'?({listen:'Solo observar y escuchar',practice:'Practicar la melodía',second:'Escuchar la segunda voz',third:'Escuchar la tercera voz',settings:'Manos, colores e instrumentos'}[selectedPlayMode]):titles[tab];
}
function beginSelectedSong(mode='listen'){
  if(!selectedSongForContinue)return;
  stopListPreview();
  const {song,category}=selectedSongForContinue;
  const trackType=(mode==='second'||mode==='third')&&hasTrack(category,song.id,'voz')?'voz':hasTrack(category,song.id,'introduccion')?'introduccion':'voz';
  openSong(song,category,trackType,true,mode);
}
function openSong(song, category, trackType='introduccion',autoPlay=false,playMode='listen') {
  if(state.melodyDirty&&!confirmDiscardUnsavedMelody())return;
  clearSongIntro();
  document.body.classList.remove('song-list-active','create-list-active');
  state.song = { song, category };
  if(autoPlay)rememberLastHeardSong(song,category);
  primeAudioForInstrument(state.instrument);
  state.melodyType=trackType;
  state.playMode=playMode;
  state.melodyDirty=false;
  state.selectedSongChord=null;document.querySelectorAll('#keyboard .key.chord-selected').forEach(key=>key.classList.remove('chord-selected'));
  state.category = category;
  state.transpose = 0;
  const savedMelody = trackFor(category, song.id,trackType) || {};
  state.songTonic = parseTonic(song.tono);
  state.originalTonic = parseTonic(savedMelody.tono) || state.songTonic || 'C';
  state.notes = (savedMelody.notas || []).map(note => ({ ...note }));
  state.chords = (savedMelody.acordes || []).map(chord => ({ ...chord }));
  state.voiceMix=playMode==='second'?{principal:false,segunda:true,tercera:false,acordes:false}:playMode==='third'?{principal:false,segunda:false,tercera:true,acordes:false}:{principal:true,segunda:false,tercera:false,acordes:true};
  state.chordTarget = null;
  state.recording=false;chordEditorOpen=false;closePlayerPopovers();
  $('songTitle').textContent = song.title || 'Alabanza';
  $('songMeta').textContent = `${category === 'jubilo' ? 'Júbilo' : 'Adoración'}${song.compositor ? ` · ${song.compositor}` : ''}`;
  updateTrackTimeline();
  $('activeKeyName').textContent=state.songTonic?`Tono ${state.songTonic}`:'';
  updateTransposeUI();
  const trackLabel=trackType==='voz'?'Voz principal':'Introducción';
  $('playerLabel').textContent = `${trackLabel}${savedMelody.notas?.length?' · Guardada':''}`;
  $('status').textContent = savedMelody.notas?.length ? (trackType==='voz'?'Voz principal guardada. Activa las voces que quieras escuchar.':'Introducción guardada. Pulsa reproducir.') : `Todavía no hay ${trackType==='voz'?'voz principal':'introducción'} grabada. Toca el piano o graba si tienes acceso de Admin.`;
  $('voiceMixer').classList.toggle('hidden',!state.showRecordedNotes);$('notesPanel').dataset.open='';$('notesPanel').classList.add('hidden');$('lyricsPanel').classList.add('hidden');$('chordEditorPanel').classList.add('hidden');$('activeChordLabel').textContent='';renderVoiceMixer();
  renderChordPresets();
  renderRecorded();
  updateAdminControls();
  transitionScreen('player',['homeView','songView','createView','theoryView','playModeModal','instrumentSettingsScreen','player']);
  songIntroStartTimer=setTimeout(()=>{songIntroStartTimer=null;showSongIntro(autoPlay,playMode);},180);
  setTimeout(startKeyboardAtC4,170);
  window.scrollTo(0, 0);
}
function formatPlaybackTime(seconds){
  const value=Math.max(0,Math.floor(Number(seconds)||0));
  return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
}
function updatePlaybackTimeline(elapsed=0,total=timelineDuration){
  const duration=Math.max(0,Number(total)||0),current=Math.min(duration,Math.max(0,Number(elapsed)||0));
  timelineDuration=duration;
  if(!SHOW_PLAYER_TIMELINE)return;
  const cache=timelineCache,elapsedText=formatPlaybackTime(current),durationText=formatPlaybackTime(duration);
  if(elapsedText!==cache.elapsed){cache.elapsed=elapsedText;$('playbackElapsed').textContent=elapsedText;}
  if(durationText!==cache.duration){cache.duration=durationText;$('playbackDuration').textContent=durationText;}
  const ratio=duration?current/duration:0;
  if(ratio!==cache.ratio&&(ratio===0||ratio===1||Math.abs(ratio-cache.ratio)>=.0004)){cache.ratio=ratio;$('playbackProgressFill').style.transform=`scaleX(${ratio})`;}
  const percent=Math.round(ratio*100);
  if(percent!==cache.percent){cache.percent=percent;$('playbackProgressTrack').setAttribute('aria-valuenow',String(percent));}
  const empty=duration<=0;
  if(empty!==cache.empty){cache.empty=empty;$('playerTimeline').classList.toggle('is-empty',empty);}
}
function estimateTrackDuration(){
  const noteEnd=state.notes.reduce((end,note)=>Math.max(end,(Number(note.start)||0)+(Number(note.duration)||.35)),0);
  const chordEnd=state.chords.reduce((end,chord)=>{
    const start=chordStartTime(chord);
    return start===null?end:Math.max(end,start+chordSpanForPlayback(chord));
  },0);
  return Math.max(noteEnd,chordEnd);
}
function updateTrackTimeline(){ updatePlaybackTimeline(0,estimateTrackDuration()/state.tempo); }
function startPlaybackTimeline(startAt,duration){
  if(timelineFrame)cancelAnimationFrame(timelineFrame);
  resetPlaybackClock();
  timelineStartedAt=startAt;
  updatePlaybackTimeline(0,duration);
  const tick=(frameTime)=>{
    if(!state.playing||!timelineStartedAt)return;
    const now=playbackNow(frameTime)||timelineStartedAt,elapsed=Math.max(0,now-timelineStartedAt);
    const probeStart=perfProbe.on?performance.now():0;
    flushVisualQueue(now,false);
    updatePlaybackTimeline(elapsed,duration);
    if(probeStart){const d=performance.now()-probeStart;perfProbe.tickSum+=d;perfProbe.tickN++;if(d>perfProbe.tickMax)perfProbe.tickMax=d;}
    if(elapsed<duration)timelineFrame=requestAnimationFrame(tick);else{timelineFrame=0;flushVisualQueue(now,true);}
  };
  timelineFrame=requestAnimationFrame(tick);
}
function resetPlaybackTimeline(){
  if(timelineFrame)cancelAnimationFrame(timelineFrame);
  timelineFrame=0;timelineStartedAt=0;
  updatePlaybackTimeline(0,timelineDuration);
}
function ensureFallingNotesObservers(){
  if(!fallingNotesVisibilityBound){
    fallingNotesVisibilityBound=true;
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);fallingNotesFrame=0;return;}
      if(state.playing&&fallingNotesRun&&!fallingNotesFrame&&fallingNotesStyle!=='off')fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
    });
  }
  if(typeof ResizeObserver==='undefined'||fallingNotesResizeObserver)return;
  fallingNotesResizeObserver=new ResizeObserver(()=>{fallingNotesCanvasDirty=true;fallingNotesGeometry=null;keyBaseWidthCache=0;});
  ['noteCanvas','keyboardScroll'].forEach(id=>{const element=$(id);if(element)fallingNotesResizeObserver.observe(element);});
}
function resizeFallingNotesCanvas(){
  const canvas=$('fallingNotesCanvas'),stage=$('noteCanvas');
  if(!canvas||!stage)return false;
  const rect=stage.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)return false;
  const dpr=Math.min(1.5,Math.max(1,window.devicePixelRatio||1));
  const pixelWidth=Math.max(1,Math.round(rect.width*dpr)),pixelHeight=Math.max(1,Math.round(rect.height*dpr));
  if(!fallingNotesCanvasInfo||canvas.width!==pixelWidth||canvas.height!==pixelHeight||fallingNotesCanvasInfo.dpr!==dpr){
    canvas.width=pixelWidth;canvas.height=pixelHeight;
    const context=canvas.getContext('2d');
    if(!context)return false;
    context.setTransform(dpr,0,0,dpr,0,0);
    fallingNotesCanvasInfo={context,width:rect.width,height:rect.height,dpr};
    fallingNotesGeometry=null;
  }else{
    fallingNotesCanvasInfo.width=rect.width;fallingNotesCanvasInfo.height=rect.height;
  }
  fallingNotesCanvasDirty=false;
  return true;
}
const keyLightCounts=new Map();
function lightKey(key,classes,ms){
  if(!key)return;
  classes=[...new Set([...classes,'note-sounding'])];
  let counts=keyLightCounts.get(key);if(!counts){counts={};keyLightCounts.set(key,counts);}
  classes.forEach(cls=>{counts[cls]=(counts[cls]||0)+1;key.classList.add(cls);});
  state.playTimers.push(setTimeout(()=>{classes.forEach(cls=>{counts[cls]=Math.max(0,(counts[cls]||0)-1);if(!counts[cls])key.classList.remove(cls);});},Math.max(0,ms)));
}
// Cola de eventos visuales de la reproducción (teclas encendidas y nota actual). Sustituye a un setTimeout por nota:
// se procesa en el mismo bucle y con el mismo reloj que las barras y la línea de tiempo, así todo cambia en el mismo frame.
const visualQueue={pending:[],index:0,sorted:true,offs:[]};
function resetVisualQueue(){visualQueue.pending.length=0;visualQueue.index=0;visualQueue.sorted=true;visualQueue.offs.length=0;}
function queueVisualEvent(at,fn){visualQueue.pending.push({at,fn});visualQueue.sorted=false;}
function lightKeyOn(key,classes){
  let counts=keyLightCounts.get(key);if(!counts){counts={};keyLightCounts.set(key,counts);}
  classes.forEach(cls=>{counts[cls]=(counts[cls]||0)+1;key.classList.add(cls);});
}
function lightKeyOff(key,classes){
  const counts=keyLightCounts.get(key);if(!counts)return;
  classes.forEach(cls=>{counts[cls]=Math.max(0,(counts[cls]||0)-1);if(!counts[cls])key.classList.remove(cls);});
}
function queueKeyLight(at,key,classes,ms){
  if(!key)return;
  const visibleClasses=lightKeys||keyEdge?classes:[];
  const activeClasses=[...new Set([...visibleClasses,'note-sounding'])];
  queueVisualEvent(at,()=>{lightKeyOn(key,activeClasses);visualQueue.offs.push({at:at+Math.max(0,ms)/1000,key,classes:activeClasses});});
}
function flushVisualQueue(now,finish){
  const q=visualQueue;
  if(!q.sorted){q.pending.splice(0,q.index);q.index=0;q.pending.sort((a,b)=>a.at-b.at);q.sorted=true;}
  if(finish)q.index=q.pending.length;
  else while(q.index<q.pending.length&&q.pending[q.index].at<=now){const event=q.pending[q.index++];event.fn();}
  for(let i=q.offs.length-1;i>=0;i--){const off=q.offs[i];if(finish||off.at<=now){lightKeyOff(off.key,off.classes);q.offs.splice(i,1);}}
}
function makeFallingNotesEvents(playbackNotes,playbackChords){
  const events=[];
  const chordStarts=playbackChords.map(chord=>chordStartTime(chord)).filter(value=>value!==null).map(value=>value/state.tempo).sort((a,b)=>a-b);
  playbackNotes.forEach(note=>{
    const midi=Number(note.midi),start=Math.max(0,Number(note.start)||0)/state.tempo;
    const held=noteHoldSeconds(note)/state.tempo;
    if(Number.isFinite(midi)&&midi>=21&&midi<=108)events.push({midi,start,duration:Math.max(.06,held),kind:'melody'});
  });
  playbackChords.forEach(chord=>{
    const start=chordStartTime(chord);if(start===null)return;
    const duration=Math.max(.06,(Number(chordSpanForPlayback(chord))||2)/state.tempo);
    chordMidiNotes(chord).forEach((midi,index)=>{
      const arpeggioOffset=(chord.arpeggio?index*.2:index*.01)/state.tempo;
      if(Number.isFinite(midi)&&midi>=21&&midi<=108){const eventStart=start/state.tempo+arpeggioOffset,nextChord=chordStarts.find(value=>value>start/state.tempo+.001);events.push({midi,start:eventStart,duration:nextChord===undefined?duration:Math.max(.06,Math.min(duration,nextChord-eventStart-.04)),kind:'chord',chord,index});};
    });
  });
  events.sort((a,b)=>a.start-b.start);
  events.forEach(event=>{event.visualDuration=Math.min(event.duration,FALLING_NOTES_MAX_LOOKAHEAD*.85);});
  return events;
}
function rebuildFallingNotesGeometry(){
  const stage=$('noteCanvas'),scroll=$('keyboardScroll');
  if(!stage||!scroll)return null;
  const stageRect=stage.getBoundingClientRect(),scrollRect=scroll.getBoundingClientRect(),scrollLeft=scroll.scrollLeft,positions=new Map();
  document.querySelectorAll('.piano-panel .key[data-midi]').forEach(key=>{
    const rect=key.getBoundingClientRect();
    positions.set(Number(key.dataset.midi),{center:rect.left-scrollRect.left+scrollLeft+rect.width/2,width:rect.width});
  });
  if(!positions.size)return null;
  const colors=getComputedStyle($('player')||stage);
  // zoom: el zoom con el que se midió; al hacer pinch las posiciones se escalan sin tocar el DOM.
  return {left:scrollRect.left-stageRect.left,zoom:state.keyboardZoom,positions,melodyColor:colors.getPropertyValue('--melody-note-color').trim()||'#29b6e6',chordColor:colors.getPropertyValue('--bass-note-color').trim()||'#bb82ef'};
}
function clearFallingNotesCanvas(){
  const info=fallingNotesCanvasInfo;
  if(info){info.context.clearRect(0,0,info.width,info.height);info.context.globalAlpha=1;}
}
function stopFallingNotes(){
  if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);
  fallingNotesFrame=0;fallingNotesRun=null;fallingNotesLastFrame=0;clearFallingNotesCanvas();
}
function fnRoundRect(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
const fnHits=[],fnGlowCache=new Map();
function fnGlow(ctx,color,baseline){
  const key=color+'|'+baseline;let g=fnGlowCache.get(key);
  if(!g){if(fnGlowCache.size>24)fnGlowCache.clear();g=ctx.createLinearGradient(0,baseline,0,baseline-46);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');fnGlowCache.set(key,g);}
  return g;
}
function fnRand(n){const v=Math.sin(n*12.9898)*43758.5453;return v-Math.floor(v);}
// Medidor de rendimiento opcional: se activa con ?perf=1 en la URL o manteniendo pulsada la línea de tiempo 0,7 s.
const perfProbe={on:false,el:null,last:0,since:0,frames:0,slow:0,worst:0,drawSum:0,drawMax:0,tickSum:0,tickMax:0,tickN:0,longTasks:0,observer:null};
function perfProbeEnable(on){
  perfProbe.on=!!on;
  if(!perfProbe.on){if(perfProbe.el)perfProbe.el.remove();perfProbe.el=null;if(perfProbe.observer){try{perfProbe.observer.disconnect();}catch(_){}perfProbe.observer=null;}return;}
  if(!perfProbe.el){
    const el=document.createElement('pre');
    el.style.cssText='position:fixed;left:4px;bottom:4px;z-index:99999;margin:0;padding:5px 7px;border-radius:6px;background:rgba(0,0,0,.78);color:#7cfc9a;font:10px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre';
    el.textContent='medidor activo: toca ▶';document.body.appendChild(el);perfProbe.el=el;
  }
  perfProbe.since=0;perfProbe.last=0;
  try{if(window.PerformanceObserver&&!perfProbe.observer){perfProbe.observer=new PerformanceObserver(list=>{perfProbe.longTasks+=list.getEntries().length;});perfProbe.observer.observe({entryTypes:['longtask']});}}catch(_){}
}
function perfProbeFrame(ts){
  const p=perfProbe;
  if(p.last){const dt=ts-p.last;p.frames++;if(dt>24)p.slow++;if(dt>p.worst)p.worst=dt;}
  p.last=ts;
}
function perfProbeReport(now){
  const p=perfProbe;
  if(!p.since){p.since=now;return;}
  if(now-p.since<1000||!p.el)return;
  const secs=(now-p.since)/1000,frames=Math.max(1,p.frames),info=fallingNotesCanvasInfo,ctx=audioContext;
  p.el.textContent=[
    `${Math.round(p.frames/secs)} fps · frames lentos (>24ms): ${p.slow} · peor: ${p.worst.toFixed(0)}ms`,
    `dibujo: ${(p.drawSum/frames).toFixed(1)}ms medio · ${p.drawMax.toFixed(1)}ms máx`,
    `línea de tiempo+teclas: ${(p.tickSum/Math.max(1,p.tickN)).toFixed(1)}ms medio · ${p.tickMax.toFixed(1)}ms máx`,
    `tareas largas (>50ms): ${p.longTasks} · fuentes de audio activas: ${state.activePlaybackSources.length}`,
    `canvas ${info?Math.round(info.width*info.dpr)+'x'+Math.round(info.height*info.dpr):'-'} · dpr ${window.devicePixelRatio||1} · estilo ${fallingNotesStyle} · latencia salida ${ctx&&ctx.outputLatency?Math.round(ctx.outputLatency*1000)+'ms':'n/d'}`
  ].join('\n');
  p.since=now;p.frames=0;p.slow=0;p.worst=0;p.drawSum=0;p.drawMax=0;p.tickSum=0;p.tickMax=0;p.tickN=0;p.longTasks=0;
}
function drawFallingNotesFrameInner(timestamp){
  if(!state.playing||!fallingNotesRun){stopFallingNotes();return;}
  if(document.hidden){fallingNotesFrame=0;return;}
  fallingNotesLastFrame=timestamp;
  if(pinchFlush)pinchFlush();
  if(fallingNotesCanvasDirty&&!resizeFallingNotesCanvas()){fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);return;}
  const run=fallingNotesRun,info=fallingNotesCanvasInfo,scroll=$('keyboardScroll');
  if(!info||!scroll){stopFallingNotes();return;}
  if(!fallingNotesGeometry)fallingNotesGeometry=rebuildFallingNotesGeometry();
  const geometry=fallingNotesGeometry;if(!geometry){stopFallingNotes();return;}
  const ctx=info.context,height=info.height,width=info.width,baseline=height-2,look=fallingNotesLookahead,pps=height/look,style=fallingNotesStyle;
  let elapsed=practiceRun?0:Math.max(0,playbackNow(timestamp)-run.startAt);
  if(practiceRun){
    const target=practiceRun.events[practiceRun.index]?.start;
    if(target!==undefined){
      // Practice is driven by the visual clock, not AudioContext.currentTime:
      // mobile browsers may suspend/jump the audio clock between manual taps.
      const visualNow=(typeof timestamp==='number'&&timestamp>0?timestamp:performance.now())/1000;
      elapsed=Math.max(0,visualNow-run.startAt);
      if(practiceRun.waiting){
        // Waiting is latched until the matching manual key press advances it.
        elapsed=target;run.startAt=visualNow-target;
      }else if(elapsed>=target){
        elapsed=target;run.startAt=visualNow-target;practiceRun.waiting=true;
      }
    }
  }
  const scrollLeft=scroll.scrollLeft,zoomScale=state.keyboardZoom/geometry.zoom,hits=fnHits;hits.length=0;
  ctx.clearRect(0,0,width,height);
  const oldestStart=elapsed-run.maxVisibleDuration;let low=0,high=run.events.length;
  while(low<high){const mid=(low+high)>>1;if(run.events[mid].start<oldestStart)low=mid+1;else high=mid;}
  for(let index=low;index<run.events.length;index++){
    const event=run.events[index];if(event.start>elapsed+look)break;
    if(practiceRun&&event.start<(practiceRun.events[practiceRun.index]?.start??Infinity)-.001)continue;
    if(elapsed>event.start+event.visualDuration+(style==='drops'&&fxGlow ? .5 : 0))continue;
    if(style==='melody'&&event.kind==='chord')continue;
    const key=geometry.positions.get(event.midi);if(!key)continue;
    const keyWidth=key.width*zoomScale,center=geometry.left+key.center*zoomScale-scrollLeft;
    const barWidth=Math.max(3,Math.min(keyWidth-2,keyWidth*.72)),barHeight=Math.max(7,event.visualDuration*pps);
    if(style==='drops'){
      const dw=Math.max(5,Math.min(barWidth,16)),dh=dw*1.4,dBottom=Math.min(baseline,baseline-(event.start-elapsed)*pps),isChord=event.kind==='chord';
      const age=elapsed-event.start;
      if(fxGlow&&age>=0&&age<.5)hits.push({index,center,barWidth,color:isChord?geometry.chordColor:geometry.melodyColor,t:age/.5});
      if(age>.05&&!practiceRun)continue;
      if(dBottom<0||center<-dw||center>width+dw)continue;
      ctx.fillStyle=isChord?geometry.chordColor:geometry.melodyColor;ctx.globalAlpha=isChord?.8:.95;
      fnRoundRect(ctx,center-dw/2,dBottom-dh,dw,dh,dw/2);ctx.fill();
      continue;
    }
    const front=baseline-(event.start-elapsed)*pps,bottom=Math.min(front,baseline),top=front-barHeight,x=center-barWidth/2,h=bottom-top;
    if(h<=0||x+barWidth<0||x>width||top>height||bottom<0)continue;
    const chord=event.kind==='chord',live=elapsed>=event.start,fade=1,r=Math.min(7,barWidth/2,h/2);
    ctx.fillStyle=chord?geometry.chordColor:geometry.melodyColor;
    ctx.globalAlpha=(chord?.72:.94)*fade;fnRoundRect(ctx,x,top,barWidth,h,r);ctx.fill();
    ctx.fillStyle='#fff';
    if(barWidth>=6){ctx.globalAlpha=(live?.34:.2)*fade;ctx.fillRect(x+barWidth*.14,top+3,Math.max(1.5,barWidth*.2),Math.max(0,h-6));}
    ctx.globalAlpha=.9*fade;ctx.fillRect(x+r*.6,bottom-2,barWidth-r*1.2,2);
    if(fxGlow&&live&&elapsed-event.start<.5)hits.push({index,center,barWidth,color:chord?geometry.chordColor:geometry.melodyColor,t:(elapsed-event.start)/.5});
  }
  for(const k of hits){
    const life=1-k.t,w=k.barWidth*1.8,glow=fnGlow(ctx,k.color,baseline);
    ctx.fillStyle=glow;ctx.globalAlpha=life*.7;ctx.fillRect(k.center-w/2,baseline-46,w,46);
    ctx.fillStyle='#fff';ctx.globalAlpha=life*.85;ctx.fillRect(k.center-w*.35,baseline-2.5,w*.7,2.5);
    if(run.calm)continue;
    ctx.globalAlpha=life*.9;ctx.beginPath();
    for(let i=0;i<4;i++){
      const px=k.center+(fnRand(k.index*7+i)-.5)*k.barWidth*1.5,py=baseline-(14+fnRand(k.index*13+i*3+1)*44)*k.t,pr=.7+1.6*life;
      ctx.moveTo(px+pr,py);ctx.arc(px,py,pr,0,6.283);
    }
    ctx.fill();
  }
  ctx.globalAlpha=1;
  if(elapsed<=run.end+look)fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
  else stopFallingNotes();
}
function drawFallingNotesFrame(timestamp){
  if(!perfProbe.on){drawFallingNotesFrameInner(timestamp);return;}
  const t0=performance.now();perfProbeFrame(timestamp);
  drawFallingNotesFrameInner(timestamp);
  const dt=performance.now()-t0;perfProbe.drawSum+=dt;if(dt>perfProbe.drawMax)perfProbe.drawMax=dt;
  perfProbeReport(t0);
}
function startFallingNotes(playbackNotes,playbackChords,startAt,prebuiltEvents){
  stopFallingNotes();perfProbe.last=0;
  const events=prebuiltEvents||makeFallingNotesEvents(playbackNotes,playbackChords);
  if(!events.length)return;
  ensureFallingNotesObservers();fallingNotesCanvasDirty=true;
  if(!resizeFallingNotesCanvas())return;
  const maxVisibleDuration=events.reduce((max,event)=>Math.max(max,event.visualDuration),0);
  const end=events.reduce((last,event)=>Math.max(last,event.start+event.visualDuration),0);
  fallingNotesRun={events,startAt,maxVisibleDuration,end,calm:!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)};
  resetPlaybackClock();fallingNotesGeometry=rebuildFallingNotesGeometry();fallingNotesLastFrame=0;
  if(!document.hidden&&fallingNotesStyle!=='off')fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
}
function showSongIntro(autoPlay=false,playMode='listen'){
  const canvas=$('noteCanvas'),overlay=$('songIntroOverlay');if(!canvas||!overlay||!state.song)return;
  clearSongIntro();
  document.body.classList.remove('song-list-active');
  canvas.classList.remove('song-intro-active');
  void canvas.offsetWidth;
  canvas.classList.add('song-intro-active');
  songIntroAutoplay=!!autoPlay;
  let completed=false;
  const finish=event=>{
    if(event&&event.target!==overlay||completed)return;
    completed=true;canvas.classList.remove('song-intro-active');clearTimeout(songIntroTimer);songIntroTimer=null;
    overlay.removeEventListener('animationend',songIntroEndHandler);songIntroEndHandler=null;
    const shouldPlay=songIntroAutoplay;songIntroAutoplay=false;
    if(shouldPlay&&state.song&&state.notes.length&&!state.playing){if(playMode==='practice')startPracticeMelody();else playMelody();}
  };
  songIntroEndHandler=finish;overlay.addEventListener('animationend',finish);
  songIntroTimer=setTimeout(()=>finish(),2900);
  if(autoPlay&&state.notes.length)void prepareMelodyAudio(notesForCurrentMix()).catch(()=>{});
}
async function startPracticeMelody(){
  const notes=cutAtNextNote(state.notes);if(!notes.length){toast('Esta alabanza no tiene notas para practicar.');return;}
  stopPlayback();
  try{await prepareMelodyAudio(notes);}catch(error){console.error(error);toast('No se pudieron preparar los sonidos para practicar.');return;}
  const events=makeFallingNotesEvents(notes,[]).sort((a,b)=>a.start-b.start);if(!events.length)return;
  // Give the first falling bar time to travel from the top of the stage.
  events.forEach(event=>{event.start+=1.2;});
  const groups=[];events.forEach(event=>{let group=groups[groups.length-1];if(!group||Math.abs(group.start-event.start)>.035){group={start:event.start,events:[]};groups.push(group);}group.events.push(event);});
  state.playing=true;setStagePlaying(true);practiceRun={events:groups,index:0,waiting:false,remaining:null};
  startFallingNotes(notes,[],performance.now()/1000+.35,events);
  $('practiceGuide').classList.remove('hidden');updatePracticeGuide();
  $('status').textContent='Toca en el piano la nota que aparece en la guía. Puedes escucharla antes de intentarlo.';setPlayerControl('playMelody','⏹','Salir de práctica');
}
function updatePracticeGuide(message=''){
  if(!practiceRun)return;
  const group=practiceRun.events[practiceRun.index];if(!group)return;
  if(!(practiceRun.remaining instanceof Set))practiceRun.remaining=new Set(group.events.map(event=>Number(event.midi)).filter(Number.isFinite));
  const names=[...practiceRun.remaining].map(noteName);
  $('practiceStep').textContent=`PASO ${practiceRun.index+1} DE ${practiceRun.events.length}`;
  $('practiceTarget').textContent=names.join(' + ')||'Listo';
  $('practiceHint').textContent=message|| (names.length>1?'Toca todas las notas indicadas.':'Toca esta nota en el piano.');
}
async function hearPracticeNote(){
  if(!practiceRun)return;
  const pending=[...practiceRun.remaining];if(!pending.length)return;
  try{await Promise.all(pending.map(midi=>previewInstrumentNote(state.instrument,midi)));}
  catch(error){console.error(error);}
}
function advancePracticeNote(){
  if(!practiceRun)return;
  const current=practiceRun.events[practiceRun.index];
  if(current&&fallingNotesRun)fallingNotesRun.startAt=performance.now()/1000-current.start;
  practiceRun.index++;practiceRun.remaining=null;practiceRun.waiting=false;
  if(practiceRun.index>=practiceRun.events.length){stopPlayback();$('status').textContent='¡Práctica completada!';toast('¡Muy bien! Completaste la melodía.');return;}
  updatePracticeGuide();$('status').textContent=`Práctica: paso ${practiceRun.index+1} de ${practiceRun.events.length}.`;
}
function handlePracticeInput(midi){
  const practice=practiceRun;
  const playedMidi=Number(midi);
  if(!practice||!Number.isFinite(playedMidi))return;

  const group=practice.events[practice.index];
  if(!group)return;

  // Build the pending pitches once per group. Simultaneous notes must all be
  // played, but repeated copies of the same pitch only need one key press.
  if(!(practice.remaining instanceof Set)){
    practice.remaining=new Set(group.events.map(event=>Number(event.midi)).filter(Number.isFinite));
  }

  if(!practice.remaining.has(playedMidi)){
    const expected=[...practice.remaining].map(noteName).join(' y ');
    const message=expected?`Esa fue ${noteName(playedMidi)}. Intenta ${expected}.`:'No se pudo identificar la nota pendiente.';
    updatePracticeGuide(message);$('status').textContent=message;
    return;
  }

  // Latch the current bar at the keyboard as soon as its correct key is touched.
  const run=fallingNotesRun;
  if(run&&Number.isFinite(group.start))run.startAt=performance.now()/1000-group.start;
  practice.waiting=true;
  practice.remaining.delete(playedMidi);
  if(practice.remaining.size){
    updatePracticeGuide(`Bien. Falta ${[...practice.remaining].map(noteName).join(' y ')}.`);
    return;
  }
  advancePracticeNote();
}
function clearSongIntro(){
  if(songIntroStartTimer){clearTimeout(songIntroStartTimer);songIntroStartTimer=null;}
  if(songIntroTimer){clearTimeout(songIntroTimer);songIntroTimer=null;}
  if(songIntroEndHandler){$('songIntroOverlay')?.removeEventListener('animationend',songIntroEndHandler);songIntroEndHandler=null;}
  songIntroAutoplay=false;
  $('noteCanvas')?.classList.remove('song-intro-active');
}
function startKeyboardAtC4() {
  state.keyboardOctaveMidi = 60;
  $('keyboardOctaveLabel').textContent = 'C4';
  requestAnimationFrame(() => {
    const scroll = $('keyboardScroll');
    const c4 = document.querySelector('.key.white[data-midi="60"]');
    if (!scroll || !c4) return;
    const left = c4.getBoundingClientRect().left - scroll.getBoundingClientRect().left + scroll.scrollLeft;
    scroll.scrollTo({ left: Math.max(0, Math.min(scroll.scrollWidth-scroll.clientWidth,left-(scroll.clientWidth-c4.offsetWidth)/2)), behavior: 'instant' });syncStageScroll();
  });
}function updateAdminControls() {
  if(!state.admin||!state.song)chordEditorOpen=false;
  document.querySelectorAll('.admin-only:not(#chordEditor):not(#chordEditorToggle)').forEach(button => button.classList.toggle('hidden', !state.admin||!state.song));
  $('chordEditorToggle').classList.toggle('hidden',!state.admin||!state.song);
  $('chordEditorToggle').setAttribute('aria-expanded',String(chordEditorOpen&&state.admin&&!!state.song));
  $('chordsViewToggle').classList.toggle('hidden',!state.song);
  $('chordEditorPanel').classList.toggle('hidden',!state.admin||!state.song||!chordEditorOpen);
  $('chordEditor').classList.toggle('hidden',!state.admin||!state.song);
  $('deleteBtn').classList.toggle('hidden',!state.admin||!state.song||!hasTrack(state.song.category,state.song.song.id,state.melodyType));
  $('recordBtn').classList.toggle('active',state.recording);
  $('playMelody').classList.toggle('hidden',!state.song||!state.notes.length);
  $('showNotesBtn').classList.toggle('hidden',!state.song||!state.notes.length||!state.showRecordedNotes);
  $('voiceMixer').classList.toggle('hidden',!state.song||!state.showRecordedNotes);
  updateVisualOptions();
  $('adminBtn').textContent = state.admin ? '🔓 Admin activo' : '🔑 Admin';
  $('adminBtn').classList.toggle('active', state.admin);
  syncTrackKeyUI();
}
function updateVisualOptions(){
  $('activeChordLabel').classList.toggle('hidden',!state.showChordNames||!$('activeChordLabel').textContent);
  $('notesPanel').classList.toggle('hidden',!state.showRecordedNotes||!$('notesPanel').dataset.open);
  $('showNotesBtn').classList.toggle('is-on',!!state.showRecordedNotes&&!!$('notesPanel').dataset.open);
  $('keyColorSwatch').style.background=state.keyColor;
  document.documentElement.style.setProperty('--pressed-key-color',state.keyColor);
  document.documentElement.style.setProperty('--melody-note-color',state.keyColor);
  document.documentElement.style.setProperty('--bass-note-color',state.bassColor);
  $('player')?.style.setProperty('--bass-note-color',state.bassColor);
  const bassPicker=$('bassColorPicker');if(bassPicker)bassPicker.value=state.bassColor;
  const color=state.keyColor.match(/^#([0-9a-f]{6})$/i);
  const channels=color?color[1].match(/.{2}/g).map(value=>parseInt(value,16)/255):[0.565,0.867,0.29];
  const luminance=channels.map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[0.2126,0.7152,0.0722][index],0);
  document.documentElement.style.setProperty('--melody-note-ink',luminance>0.42?'#17323b':'#ffffff');
  $('showChordNames').checked=state.showChordNames;$('showRecordedNotes').checked=state.showRecordedNotes;
  $('notationToggle').textContent={ninguno:'∅',octavas:'8va',americano:'C',latino:'La',movil:'Do',grados:'1',simple:'C'}[state.notation]||'C';
}
function showManualNoteEffect(midi,key){
  if(state.playing||fallingNotesStyle==='off'||!key)return;
  if(!key.closest('.piano-panel'))key=document.querySelector(`.piano-panel .key[data-midi="${midi}"]`);
  if(!key)return;
  const stage=$('noteCanvas'),stageRect=stage?.getBoundingClientRect(),keyRect=key.getBoundingClientRect();if(!stageRect||!keyRect)return;
  const effect=document.createElement('span');effect.className=`manual-note-effect ${fallingNotesStyle==='drops'?'is-drop':'is-bar'}`;
  const isDrop=fallingNotesStyle==='drops';
  const barWidth=Math.max(3,Math.min(keyRect.width-2,keyRect.width*.72)),effectWidth=isDrop?Math.max(5,Math.min(barWidth,16)):barWidth;
  effect.style.width=`${effectWidth}px`;
  if(isDrop)effect.style.height=`${effectWidth*1.4}px`;
  effect.style.setProperty('--note-fx-color',midi<=48?state.bassColor:state.keyColor);
  effect.style.left=`${keyRect.left-stageRect.left+keyRect.width/2}px`;
  stage.appendChild(effect);
  if(fxGlow){
    const impact=document.createElement('span');impact.className='manual-note-impact';impact.style.left=effect.style.left;impact.style.setProperty('--note-fx-color',midi<=48?state.bassColor:state.keyColor);
    for(let i=0;i<6;i++){const particle=document.createElement('i');particle.style.setProperty('--particle-angle',`${i*60}deg`);particle.style.setProperty('--particle-distance',`${18+(i%2)*9}px`);impact.appendChild(particle);}
    stage.appendChild(impact);impact.addEventListener('animationend',()=>impact.remove(),{once:true});
  }
  const started=performance.now(),maxRise=Math.max(60,stage.clientHeight-(isDrop?20:8)),speed=stage.clientHeight/Math.max(.8,fallingNotesLookahead);let frame=0,releasedAt=null,heldRise=0,atTop=false;
  const grow=now=>{
    const rise=releasedAt===null?Math.min(maxRise,(now-started)/1000*speed):heldRise;
    const offset=releasedAt===null?0:Math.max(0,(now-releasedAt)/1000*speed),progress=Math.min(1,(rise+offset)/maxRise);
    effect.style.setProperty('--manual-rise',`${rise}px`);effect.style.setProperty('--manual-offset',`${offset}px`);effect.style.opacity=String(Math.max(0,Math.min(1,(1-progress)/.18)));
    if(rise+offset<maxRise)frame=requestAnimationFrame(grow);else{frame=0;atTop=true;effect.remove();}
  };
  frame=requestAnimationFrame(grow);
  const finish=()=>{if(releasedAt!==null)return;releasedAt=performance.now();heldRise=Math.min(maxRise,(releasedAt-started)/1000*speed);effect.classList.add('is-released');if(atTop)effect.remove();else if(!frame)frame=requestAnimationFrame(grow);};
  return finish;
}
function chordDisplayName(chord) {
  const shownRoot=transposeChordName(String(chord.root||'C'),Number(state.transpose)||0,false);
  const root = state.notation === 'latino' ? (NOTE_ROOT_LATINO[shownRoot?.[0]] || shownRoot) + (shownRoot?.slice(1) || '') : shownRoot;
  if(chord.arpeggio)return `${root} 1–5–8`;
  const quality = { major:'', minor:'m', '7':'7', maj7:'maj7', m7:'m7', mMaj7:'mMaj7', '6':'6', add9:'add9', '5':'5', sus2:'sus2', sus4:'sus4', dim:'dim', dim7:'dim7', m7b5:'m7♭5', aug:'aum' }[chord.quality] || '';
  return `${root}${quality}`;
}
function renderRecorded() {
  const voiceParts=state.melodyType==='voz'?generatedVoiceParts():null;
  $('recordedNotes').innerHTML = state.notes.map((note, index) => {
    const chord = state.chords.find(item => Number(item.noteIndex) === index);
    const label = chord ? `<span class="note-chord-label">${escapeHTML(chordDisplayName(chord))}</span>` : '<span class="note-chord-label empty" aria-hidden="true"></span>';
    const suggested=voiceParts?`<span class="suggested-voice-notes">2ª ${voiceParts.segunda[index]?noteName(voiceParts.segunda[index].midi):'—'} · 3ª ${voiceParts.tercera[index]?noteName(voiceParts.tercera[index].midi):'—'}</span>`:'';
    const item=`<div class="melody-note-item${state.chordTarget === index ? ' selected' : ''}" data-note-index="${index}">${label}${suggested}<button class="note-chip" type="button" data-note-index="${index}" title="${voiceParts?`Principal ${noteName(note.midi)}; segunda ${noteName(voiceParts.segunda[index]?.midi??note.midi)}; tercera ${noteName(voiceParts.tercera[index]?.midi??note.midi)}`:''}" ${state.admin ? '' : 'disabled'}>${escapeHTML(noteName(note.midi))}</button></div>`;
    const gapTarget=index+0.5,gapChord=state.chords.find(item=>Number(item.noteIndex)===gapTarget);
    const gap=index<state.notes.length-1?`<button type="button" class="chord-gap-target${state.chordTarget===gapTarget?' selected':''}" data-chord-target="${gapTarget}" ${state.admin?'':'disabled'} aria-label="Colocar acorde entre las notas ${index+1} y ${index+2}">${gapChord?`<span>${escapeHTML(chordDisplayName(gapChord))}</span>`:'+'}</button>`:'';
    return item+gap;
  }).join('');
}
function renderVoiceMixer(){
  if(!$('voiceMixer'))return;
  [['principal','voiceMain'],['segunda','voiceSecond'],['tercera','voiceThird'],['acordes','voiceChords']].forEach(([name,id])=>{if($(id))$(id).checked=!!state.voiceMix[name];});
  if($('secondVoiceDirection'))$('secondVoiceDirection').value=state.voiceDirection.segunda;
  if($('thirdVoiceDirection'))$('thirdVoiceDirection').value=state.voiceDirection.tercera;
}
function generatedVoiceParts(){
  // Voces diatónicas: segunda = tercera y tercera = quinta, arriba o abajo según el selector.
  // Se cuentan posiciones de la escala y no semitonos; los acordes no alteran estas armonías.
  const minor=state.originalTonic.endsWith('m');
  const tonicIndex=NOTE_NAMES.indexOf(state.originalTonic.replace(/m$/,''));
  const tonicPc=((Math.max(0,tonicIndex)+(Number(state.transpose)||0))%12+12)%12;
  const scalePcs=(minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11]).map(interval=>(tonicPc+interval)%12);
  const scaleMidis=[];
  for(let midi=12;midi<=108;midi++)if(scalePcs.includes(midi%12))scaleMidis.push(midi);
  const voiceAt=(lead,steps,direction)=>{
    // Nota de la escala más cercana a la melodía (si está entre dos, la de abajo).
    let index=0,best=Infinity;
    scaleMidis.forEach((midi,i)=>{const distance=Math.abs(midi-lead);if(distance<best){best=distance;index=i;}});
    let midi=scaleMidis[Math.max(0,Math.min(scaleMidis.length-1,index+(direction==='up'?steps:-steps)))];
    while(midi<36)midi+=12;
    return midi;
  };
  const second=[],third=[];
  state.notes.forEach(note=>{
    const lead=Number(note.midi);
    second.push({...note,midi:voiceAt(lead,2,state.voiceDirection.segunda)});
    third.push({...note,midi:voiceAt(lead,4,state.voiceDirection.tercera)});
  });
  return {segunda:second,tercera:third};
}
// Igual que en el Bajo: cuando aparece otra nota de la misma voz, la anterior se quita.
function cutAtNextNote(list){
  const sorted=list.map(note=>({...note})).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
  sorted.forEach((note,index)=>{
    const start=Number(note.start)||0;
    const next=sorted.slice(index+1).find(item=>(Number(item.start)||0)>start+.035);
    const belongsToChord=sorted.some((item,otherIndex)=>otherIndex!==index&&Math.abs((Number(item.start)||0)-start)<=.035);
    // Older saves gave simultaneous notes the 0.12s minimum because the next
    // array item belonged to the same chord. Recover the shared held duration.
    if(belongsToChord&&(Number(note.duration)||0)<=.121){
      note.duration=next?Math.max(.12,(Number(next.start)||0)-start):Math.max(.35,Number(note.duration)||.35);
    }
    if(next)note.cutAt=Math.max(.06,(Number(next.start)||0)-start-.04);
  });
  return sorted;
}
function noteHoldSeconds(note){
  // Trompeta: solo el toque, sin alargar con sustain. Los demás respetan el sustain.
  const base=(Number(note.duration)||.32)*(state.instrument==='trumpet-real'?1:(state.sustain?2.4:1));
  const limit=Number(note.cutAt);
  return Number.isFinite(limit)?Math.max(.06,Math.min(base,limit)):base;
}
function noteWasCut(note){
  const limit=Number(note.cutAt);
  return Number.isFinite(limit)&&limit<(Number(note.duration)||.32)*(state.instrument==='trumpet-real'?1:(state.sustain?2.4:1));
}
function notesForCurrentMix(){
  const parts=generatedVoiceParts(),selected=[];
  if(state.voiceMix.principal)selected.push(...cutAtNextNote(state.notes));
  if(state.voiceMix.segunda)selected.push(...cutAtNextNote(parts.segunda.filter(Boolean)));
  if(state.voiceMix.tercera)selected.push(...cutAtNextNote(parts.tercera.filter(Boolean)));
  return selected.sort((a,b)=>Number(a.start)-Number(b.start));
}
function chordSpanForPlayback(chord){
  const start=chordStartTime(chord);
  if(start===null||state.melodyType!=='voz')return Number(chord.duration)||2;
  const next=state.chords.filter(item=>chordStartTime(item)>start).sort((a,b)=>chordStartTime(a)-chordStartTime(b))[0];
  const nextStart=next&&chordStartTime(next);
  return nextStart!==null&&nextStart!==undefined?Math.max(.25,nextStart-start):Number(chord.duration)||2;
}
function chordStartTime(chord){
  if(Number.isFinite(Number(chord.start)))return Math.max(0,Number(chord.start));
  const index=Number(chord.noteIndex);if(!Number.isFinite(index)||!state.notes.length)return null;
  const left=Math.floor(index),right=Math.ceil(index),a=state.notes[left],b=state.notes[right];
  if(!a)return null;if(left===right||!b)return Math.max(0,Number(a.start)||0);
  const fraction=index-left;return Math.max(0,(Number(a.start)||0)+((Number(b.start)||0)-(Number(a.start)||0))*fraction);
}
function chooseChordTarget(index) {
  if (!state.admin) return;
  state.chordTarget = index;
  const note = state.notes[Math.floor(index)];
  const chord = state.chords.find(item => Number(item.noteIndex) === index);
  $('chordTarget').textContent = note ? (Number.isInteger(index)?`Este acorde empieza en ${noteName(note.midi)} · nota ${index + 1}`:`Este acorde empieza entre las notas ${Math.floor(index)+1} y ${Math.ceil(index)+1}.`) : 'Selecciona la primera nota del tramo.';
  $('chordRoot').value = chord?.root || NOTE_NAMES[note?.midi % 12] || 'C';
  $('chordQuality').value = chord?.quality || 'major';
  $('chordInversion').value = String(chord?.inversion || 0);
  { const octaveValue = String(chord?.octave ?? 36); if (![...$('chordOctave').options].some(option => option.value === octaveValue)) $('chordOctave').add(new Option('C' + (Number(octaveValue) / 12 - 1), octaveValue)); $('chordOctave').value = octaveValue; }
  $('bassInstrument').value = chord?.instrument || state.bassInstrument;
  $('chordArpeggio').checked = !!chord?.arpeggio;
  syncChordEditorMode();
  $('chordDuration').value = String(chord?.duration || 2);
  $('chordPreset').value=chord?chordSymbol(chord):'';
  $('removeChordBtn').classList.toggle('hidden', !chord);
  document.querySelectorAll('.melody-note-item').forEach((item, i) => item.classList.toggle('selected', i === index));
  document.querySelectorAll('.chord-gap-target').forEach(item=>item.classList.toggle('selected',Number(item.dataset.chordTarget)===index));
}
function saveSelectedChord() {
  if (!state.admin || state.chordTarget === null || !state.notes[Math.floor(state.chordTarget)]) { toast('Primero elige una nota o un espacio entre notas.'); return; }
  const chord = { noteIndex: state.chordTarget, start: chordStartTime({noteIndex:state.chordTarget}), root: $('chordRoot').value, quality: $('chordQuality').value, inversion: Number($('chordInversion').value), octave: Number($('chordOctave').value), duration: Number($('chordDuration').value), arpeggio:$('chordArpeggio').checked, instrument:$('bassInstrument').value };
  const existing = state.chords.findIndex(item => Number(item.noteIndex) === state.chordTarget);
  if (existing >= 0) state.chords[existing] = chord; else state.chords.push(chord);
  state.melodyDirty=true;
  updateTrackTimeline();
  renderRecorded(); chooseChordTarget(chord.noteIndex);
  $('status').textContent = `Acorde ${chordDisplayName(chord)} asignado ${Number.isInteger(chord.noteIndex)?`a ${noteName(state.notes[chord.noteIndex].midi)}`:'entre dos notas'}. Pulsa “Guardar melodía” para subir todos los cambios a Firebase.`;
}
function chordSymbol(chord){const suffix={major:'',minor:'m','7':'7',maj7:'maj7',m7:'m7',mMaj7:'mMaj7','6':'6',add9:'add9','5':'5',dim:'dim',dim7:'dim7',m7b5:'m7b5',aug:'aug',sus2:'sus2',sus4:'sus4'}[chord.quality]||'';return `${chord.root||''}${suffix}`;}
function applyChordPreset(symbol){
  const chord=parsePianoChord(symbol);if(!chord)return;
  $('chordRoot').value=chord.root;$('chordQuality').value=chord.quality;
}
function syncChordEditorMode(){
  const arpeggio=$('chordArpeggio')?.checked||false;
  $('chordQuality').disabled=arpeggio;$('chordInversion').disabled=arpeggio;
}
function removeSelectedChord() {
  if (state.chordTarget === null) return;
  state.chords = state.chords.filter(item => Number(item.noteIndex) !== state.chordTarget);
  state.melodyDirty=true;
  updateTrackTimeline();
  renderRecorded(); chooseChordTarget(state.chordTarget);
  $('status').textContent = 'Acorde quitado de la melodía. Pulsa “Guardar melodía” para subir los cambios a Firebase.';
}
function chordMidiNotes(chord) {
  const shapes = { major:[0,4,7], minor:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10], mMaj7:[0,3,7,11], '6':[0,4,7,9], add9:[0,4,7,14], '5':[0,7], dim7:[0,3,6,9], m7b5:[0,3,6,10], sus2:[0,2,7], sus4:[0,5,7], dim:[0,3,6], aug:[0,4,8] };
  const rootMidi = Number(chord.octave || 36) + NOTE_NAMES.indexOf(chord.root) + (chord.noTranspose ? 0 : state.transpose);
  if(chord.arpeggio)return [rootMidi,rootMidi+7,rootMidi+12];
  const pitches = (Array.isArray(chord.intervals) ? chord.intervals : shapes[chord.quality] || shapes.major).map(interval => rootMidi + interval);
  for (let i=0; i<Number(chord.inversion || 0); i++) pitches.push(pitches.shift() + 12);
  return pitches;
}

const CHROMATIC_SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_TO_SHARP = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };
const SHARP_TO_FLAT = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
const CHROMATIC_FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const LATIN_TO_LETTER = { do:'C', re:'D', mi:'E', fa:'F', sol:'G', la:'A', si:'B' };
const LETTER_PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
// Entiende: A, Am, A menor, Bb, F#m, La, Sol, Do#, Mib, Sim, La menor, Amaj7 (mayor)…
// Devuelve null si el texto no trae un tono reconocible.
function parseTonic(value) {
  const text = String(value || '').trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const m = text.match(/^(do|re|mi|fa|sol|la|si|[a-g])\s*([#b]?)(.*)$/i);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const letter = LATIN_TO_LETTER[word] || word.toUpperCase();
  if (!(letter in LETTER_PC)) return null;
  const pc = (LETTER_PC[letter] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const minor = /^\s*(m(?!aj)|[Mm]in|[Mm]enor)/.test(m[3]);
  return CHROMATIC_SHARPS[pc] + (minor ? 'm' : '');
}
function tonicName(value) { return parseTonic(value) || 'C'; }
function tonicPc(tonic) { return CHROMATIC_SHARPS.indexOf(String(tonic || '').replace(/m$/, '')); }
// Diferencia entre el tono de la pista y el tono escrito en la canción (para letra y acordes).
function lyricsBaseShift() {
  if (!state.songTonic) return 0;
  const track = tonicPc(state.originalTonic), written = tonicPc(state.songTonic);
  return track < 0 || written < 0 ? 0 : ((track - written) % 12 + 12) % 12;
}
function displayShift() { return lyricsBaseShift() + (Number(state.transpose) || 0); }
function syncTrackKeyUI() {
  if (!$('trackRoot') || !$('trackMode')) return;
  $('trackRoot').value = state.originalTonic.replace(/m$/, '');
  $('trackMode').value = state.originalTonic.endsWith('m') ? 'minor' : 'major';
  const locked = !state.admin || !state.song;
  $('trackRoot').disabled = locked; $('trackMode').disabled = locked;
}
function changeTrackTonic() {
  if (!state.admin || !state.song) { syncTrackKeyUI(); return; }
  if (state.transpose) {
    // El tono de la pista se elige con el transporte en "Tono original": primero se restaura.
    transposeMelody(-state.transpose);
    if (state.transpose) { syncTrackKeyUI(); return; }
  }
  state.originalTonic = $('trackRoot').value + ($('trackMode').value === 'minor' ? 'm' : '');
  state.melodyDirty = true;
  renderChordPresets(); updateTransposeUI(); renderRecorded();
  $('status').textContent = 'Tono de la pista cambiado. Pulsa “Guardar melodía” para guardarlo en Firebase.';
  toast('Tono de la pista: ' + $('trackRoot').selectedOptions[0].textContent.split(' · ')[0] + ($('trackMode').value === 'minor' ? ' menor' : ' mayor'));
}
function renderChordPresets() {
  if (!state.song || !$('chordPreset')) return;
  const flat = /b/.test(String(state.song.song.tono || '')), shift = lyricsBaseShift();
  const presets = chordNames(state.song.song).map(chord => transposeChordName(chord, shift, flat));
  $('chordPreset').innerHTML = '<option value="">Elegir acorde escrito en la canción…</option>' + presets.map(chord => `<option value="${escapeHTML(chord)}">${escapeHTML(chord)}</option>`).join('');
}
// Al guardar, el transporte queda "cocinado" en los acordes para que coincidan con las notas guardadas.
function bakeChordTranspose(chord, semitones) {
  const index = NOTE_NAMES.indexOf(chord.root), octave = Number(chord.octave) || 36;
  if (index < 0 || !semitones) return { root: String(chord.root), octave };
  const total = index + semitones;
  return { root: NOTE_NAMES[((total % 12) + 12) % 12], octave: octave + 12 * Math.floor(total / 12) };
}
function transposedTonic() {
  const minor = state.originalTonic.endsWith('m');
  const root = state.originalTonic.replace(/m$/, '');
  const index = CHROMATIC_SHARPS.indexOf(root);
  return CHROMATIC_SHARPS[(index + state.transpose + 120) % 12] + (minor ? 'm' : '');
}
function updateTransposeUI() {
  if (!state.song) { $('activeKeyName').disabled=true; return; }
  $('activeKeyName').disabled=false;
  const tonic = transposedTonic();
  $('activeKeyName').textContent=`Tono ${tonic}`;
  $('transposeTargetKey').value=tonic.replace(/m$/,'');
  const displayRoot = SHARP_TO_FLAT[tonic.replace(/m$/, '')] || tonic.replace(/m$/, '');
  const shown = displayRoot + (tonic.endsWith('m') ? 'm' : '');
  $('songKey').textContent = `Tono: ${shown}`;
  const flatSpelling = /b/.test(String(state.song.song.tono || ''));
  $('chordList').innerHTML = chordNames(state.song.song).map(chord => `<span class="chord">${escapeHTML(transposeChordName(chord, displayShift(), flatSpelling))}</span>`).join('') || '<span class="hint">No se detectaron acordes</span>';
  syncTrackKeyUI();
  renderSongLyrics();
}
function transposeChordName(chord, semitones, preferFlats) {
  if (!semitones) return chord;
  const match = String(chord).match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);
  if (!match) return chord;
  const shiftRoot = root => {
    const index = CHROMATIC_SHARPS.indexOf(FLAT_TO_SHARP[root] || root);
    if (index < 0) return root;
    const shifted = (index + semitones % 12 + 12) % 12;
    return (preferFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS)[shifted];
  };
  return shiftRoot(match[1]) + match[2] + (match[3] ? `/${shiftRoot(match[3])}` : '');
}
function transposeMelody(delta) {
  if (!state.song) return;
  const nextShift = state.transpose + delta;
  if (state.notes.some(note => Number(note.midi) + delta < 48 || Number(note.midi) + delta > 83)) {
    toast('No se puede transportar más: una nota saldría del rango del teclado.'); return;
  }
  state.transpose = nextShift;
  state.notes = state.notes.map(note => ({ ...note, midi: Math.max(36, Math.min(95, Number(note.midi) + delta)) }));
  state.melodyDirty=true;
  state.notes.forEach(note => note.note = canonicalNoteName(note.midi));
  updateTransposeUI(); renderRecorded();
  toast(state.transpose ? `Melodía transportada ${state.transpose > 0 ? '+' : ''}${state.transpose} semitonos.` : 'Tono original restaurado.');
}
function transposeMelodyToKey(targetRoot) {
  if (!state.song) return;
  const targetIndex=CHROMATIC_SHARPS.indexOf(targetRoot), currentIndex=tonicPc(transposedTonic());
  if(targetIndex<0||currentIndex<0)return;
  const delta=((targetIndex-currentIndex+18)%12)-6;
  if(delta)transposeMelody(delta);
  closePlayerPopovers();
}function jumpToMelodyNotes() {
  toggleNotesPanel();
}

function renderKeyboard() {
  const low = 21, high = 108;
  const scroll = $('keyboardScroll');
  const oldScrollLeft = scroll?.scrollLeft || 0;
  let html = '';
  for (let midi = low; midi <= high; midi++) {
    if (NOTE_NAMES[midi % 12].includes('#')) continue;
    const hasBlack = midi % 12 !== 4 && midi % 12 !== 11;
    const whiteName = keyboardLabel(midi);
    const blackName = keyboardLabel(midi + 1);
    const whiteAria = noteName(midi);
    const blackAria = noteName(midi + 1);
    const octaveClass = midi % 12 === 0 ? ' octave-marker' : '';
    html += `<div class="keys"><button class="key white" data-midi="${midi}" aria-label="${whiteAria}"><span class="note-label${octaveClass}${whiteName?'':' label-empty'}">${whiteName}</span></button>${hasBlack&&midi+1<=high ? `<button class="key black" data-midi="${midi + 1}" aria-label="${blackAria}"><span class="note-label${blackName?'':' label-empty'}">${blackName}</span></button>` : ''}</div>`;
  }
  $('keyboard').innerHTML = html;
  fallingNotesGeometry = null;keyBaseWidthCache = 0;stageLastKeyWidth = -1;
  if (scroll) scroll.scrollLeft = oldScrollLeft;
  const keys = $('keyboard');
  keys.onselectstart = event => event.preventDefault();
  keys.ondragstart = event => event.preventDefault();
  const playAtPoint = (pointerId, x, y) => {
    const element = document.elementFromPoint(x, y)?.closest('.key');
    if (!element || !keys.contains(element) || state.activePointers.get(pointerId)?.element === element) return;
    const previous = state.activePointers.get(pointerId);
    if (previous) { previous.element.classList.remove('playing'); previous.stopNote?.(); }
    const active = { element, stopNote:null };
    state.activePointers.set(pointerId, active);
    updateActiveChordLabel();
    const asTouch = state.recording && state.instrument === 'trumpet-real';
    playNote(Number(element.dataset.midi), element, asTouch ? .35 : Infinity).then(stopNote => {
      if (state.activePointers.get(pointerId) === active) active.stopNote = stopNote;
      else stopNote?.();
    });
  };
  keys.onpointerdown = event => {
    const element = event.target.closest('.key');
    if (!element) return;
    event.preventDefault();
    keys.setPointerCapture?.(event.pointerId);
    playAtPoint(event.pointerId, event.clientX, event.clientY);
  };
  keys.onpointermove = event => { if (state.activePointers.has(event.pointerId)) { event.preventDefault(); playAtPoint(event.pointerId, event.clientX, event.clientY); } };
  const endTouch = event => {
    const active = state.activePointers.get(event.pointerId);
    if (!active) return;
    active.element.classList.remove('playing');
    active.stopNote?.();
    state.activePointers.delete(event.pointerId);
    updateActiveChordLabel();
  };
  keys.onpointerup = endTouch;
  keys.onpointercancel = endTouch;
  keys.onlostpointercapture = endTouch;
  $('keyboard').ontransitionend = event => {
    if (event.target.tagName !== 'SPAN') event.target.classList.remove('playing');
  };
  syncStageScroll();
  if($('liveTheoryDock')&&!$('liveTheoryDock').classList.contains('hidden'))renderLiveTheoryDock();
}
function updateActiveChordLabel(){
  if(!state.showChordNames)return;
  const pitches=[...new Set([...state.activePointers.values()].map(active=>Number(active.element.dataset.midi)%12))];
  if(pitches.length<3){$('activeChordLabel').textContent='';$('activeChordLabel').classList.add('hidden');return;}
  const qualities={'0,3,6':'dim','0,3,7':'minor','0,4,7':'major','0,4,8':'aug','0,2,7':'sus2','0,5,7':'sus4','0,3,6,9':'dim7','0,3,6,10':'m7♭5','0,3,7,10':'m7','0,4,7,10':'7','0,4,7,11':'maj7'};
  let match=null;
  for(const root of pitches){const intervals=pitches.map(pitch=>(pitch-root+12)%12).sort((a,b)=>a-b),quality=qualities[intervals.join(',')];if(quality){match={root,quality};break;}}
  if(!match){$('activeChordLabel').textContent='';$('activeChordLabel').classList.add('hidden');return;}
  const rootName=state.notation==='latino'?(NOTE_ROOT_LATINO[NOTE_NAMES[match.root]]||NOTE_NAMES_LATINO[match.root]):NOTE_NAMES[match.root];
  const suffix={major:'',minor:'m',dim:'dim',aug:'aug',sus2:'sus2',sus4:'sus4',dim7:'dim7','m7♭5':'m7♭5',m7:'m7','7':'7',maj7:'maj7'}[match.quality]||'';
  $('activeChordLabel').textContent=`${rootName}${suffix}`;$('activeChordLabel').classList.remove('hidden');
}
function syncStageScroll(){
  const scroll=$('keyboardScroll');if(!scroll)return;
  if(!stageGridElement)stageGridElement=document.querySelector('#noteCanvas .canvas-grid');
  const grid=stageGridElement;if(!grid)return;
  const base=keyboardBaseKeyWidth();
  const width=base?base*state.keyboardZoom:0;
  if(width>0&&Math.abs(width-stageLastKeyWidth)>.01){grid.style.setProperty('--stage-key-width',`${width}px`);stageLastKeyWidth=width;}
  const left=scroll.scrollLeft;
  if(left!==stageLastScroll){grid.style.setProperty('--stage-scroll',`${left}px`);stageLastScroll=left;}
}
const INSTRUMENT_ICONS={
  'grand-piano':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M8 13v6M12 13v6M16 13v6"/><path d="M6.5 5v8h3V5zM10.5 5v8h3V5zM14.5 5v8h3V5z" fill="currentColor" stroke="none"/></svg>',
  'steinway-grand':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12V8.6C2.5 7.7 3.2 7 4.1 7H10c4.2 0 7.4 1.3 9.4 3.5.6.7 1.3 1.1 2.1 1.5V12z"/><path d="M5 12v7.5M12 12v7.5M19.5 12v7.5"/><path d="M2.5 9.5H7"/></svg>',
  'trumpet-real':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 11h11"/><path d="M5 11v4.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11"/><path d="M14.5 11 21.5 7v10l-7-4z"/><path d="M7.5 11V7M10.5 11V7M13 11V7.5"/></svg>'
};
function buildInstrumentButtons(){
  const select=$('instrumentSelect'),menu=$('instrumentMenu');
  if(!select||!menu||menu.querySelector('.instrument-browser'))return;
  const title=document.createElement('h2');title.textContent='Instrumento';
  const browser=document.createElement('div');browser.className='instrument-browser';
  const categories=document.createElement('div');categories.className='instrument-categories';categories.setAttribute('role','tablist');categories.setAttribute('aria-label','Familia de instrumentos');
  const panels=document.createElement('div');panels.className='instrument-category-panels';
  const groups=[{id:'piano',name:'Piano',instruments:['grand-piano','steinway-grand']},{id:'brass',name:'Brass',instruments:['trumpet-real']}];
  groups.forEach((group,index)=>{
    const tab=document.createElement('button');tab.type='button';tab.className='instrument-category-tab';tab.id=`instrument-tab-${group.id}`;tab.textContent=group.name;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',`instrument-panel-${group.id}`);tab.setAttribute('aria-selected',String(index===0));
    const panel=document.createElement('div');panel.id=`instrument-panel-${group.id}`;panel.className='instrument-category-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);panel.hidden=index!==0;
    const list=document.createElement('div');list.className='instrument-options';list.setAttribute('role','radiogroup');list.setAttribute('aria-label',group.name);
    group.instruments.forEach(value=>{
      const option=[...select.options].find(item=>item.value===value);if(!option)return;
      const button=document.createElement('button');button.type='button';button.className='instrument-option';button.dataset.instrument=option.value;button.setAttribute('role','radio');
      const icon=document.createElement('span');icon.className='instrument-icon';icon.innerHTML=INSTRUMENT_ICONS[option.value]||'';
      const name=document.createElement('span');name.className='instrument-name';name.textContent=option.textContent;
      button.append(icon,name);
      button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change'));syncInstrumentButtons();};
      list.appendChild(button);
    });
    panel.appendChild(list);categories.appendChild(tab);panels.appendChild(panel);
    tab.onclick=()=>{
      categories.querySelectorAll('[role="tab"]').forEach(item=>item.setAttribute('aria-selected',String(item===tab)));
      panels.querySelectorAll('[role="tabpanel"]').forEach(item=>item.hidden=item!==panel);
    };
  });
  browser.append(categories,panels);menu.prepend(title,browser);syncInstrumentButtons();
}
function syncInstrumentButtons(){
  document.querySelectorAll('#instrumentMenu [data-instrument]').forEach(button=>{const on=button.dataset.instrument===state.instrument;button.classList.toggle('active',on);button.setAttribute('aria-checked',String(on));});
  const group=state.instrument==='trumpet-real'?'brass':'piano';
  const tab=$(`instrument-tab-${group}`),panel=$(`instrument-panel-${group}`);
  if(tab&&panel){document.querySelectorAll('#instrumentMenu [role="tab"]').forEach(item=>item.setAttribute('aria-selected',String(item===tab)));document.querySelectorAll('#instrumentMenu [role="tabpanel"]').forEach(item=>item.hidden=item!==panel);}
}
function buildNotationButtons(){
  const select=$('keyboardNotation'),menu=$('notationMenu');
  if(!select||!menu||$('notationOptions'))return;
  const grid=document.createElement('div');grid.id='notationOptions';grid.className='range-presets notation-presets';grid.setAttribute('role','group');grid.setAttribute('aria-label','Etiquetas de las teclas');
  [...select.options].forEach(option=>{
    const [title,detail]=option.textContent.split(' · ');
    const button=document.createElement('button');button.type='button';button.dataset.notation=option.value;button.textContent=title;
    if(detail){const small=document.createElement('small');small.textContent=detail;button.appendChild(small);}
    button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change'));syncNotationButtons();};
    grid.appendChild(button);
  });
  menu.appendChild(grid);syncNotationButtons();
}
function syncNotationButtons(){
  document.querySelectorAll('#notationOptions [data-notation]').forEach(button=>{const on=button.dataset.notation===state.notation;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
}
const playerPopoverIds=['instrumentMenu','colorMenu','keyboardRangeMenu','notationMenu','lyricsPanel','playerSettings','keyTransposePopover'];
function closePlayerPopovers(except=''){
  if(except!=='chordEditorPanel')chordEditorOpen=false;
  playerPopoverIds.forEach(id=>{if(id!==except)$(id)?.classList.add('hidden');});
  if(except!=='chordEditorPanel')$('chordEditorPanel')?.classList.add('hidden');
  [['instrumentToggle','instrumentMenu'],['keyColorToggle','colorMenu'],['keyboardRangeToggle','keyboardRangeMenu'],['notationToggle','notationMenu'],['chordsViewToggle','lyricsPanel'],['settingsToggle','playerSettings'],['chordEditorToggle','chordEditorPanel'],['activeKeyName','keyTransposePopover']].forEach(([button,panel])=>$(button)?.setAttribute('aria-expanded',String(panel===except||panel==='chordEditorPanel'&&except==='chordEditorPanel')));
}
function togglePlayerPopover(id){
  const panel=$(id),willOpen=panel.classList.contains('hidden');closePlayerPopovers(willOpen?id:'');
  if(willOpen)panel.classList.remove('hidden');
  return willOpen;
}
function toggleChordEditor(){
  if(!state.admin||!state.song){toast('El editor de acordes está disponible al editar una melodía como Admin.');return;}
  chordEditorOpen=!chordEditorOpen;closePlayerPopovers(chordEditorOpen?'chordEditorPanel':'');
  $('chordEditorPanel').classList.toggle('hidden',!chordEditorOpen);$('chordEditorToggle').setAttribute('aria-expanded',String(chordEditorOpen));
}
function toggleLyricsPanel(){
  const open=togglePlayerPopover('lyricsPanel');
  if(open){$('mobileSongDetails').open=true;}
}
function toggleNotesPanel(){
  if(!state.showRecordedNotes||!state.notes.length){toast('Esta pista todavía no tiene notas grabadas.');return;}
  const panel=$('notesPanel'),open=panel.classList.contains('hidden');panel.dataset.open=open?'1':'';updateVisualOptions();
  if(open)$('recordedNotes').scrollIntoView({behavior:'smooth',block:'nearest'});
}
const FALLING_STYLE_OPTIONS=[['bars','Barras completas','Melodía y bajos; al tocar suben desde la tecla'],['melody','Solo melodía','Sin bajos; al tocar suben desde la tecla'],['drops','Gotas','Al tocar suben gotas; en melodías siguen cayendo'],['off','Sin barras','Solo se iluminan las teclas']];
function syncFallingStyleButtons(){
  document.querySelectorAll('[data-fall-style]').forEach(button=>{const on=button.dataset.fallStyle===fallingNotesStyle;button.classList.toggle('active',on);button.setAttribute('aria-pressed',on?'true':'false');});
}
function setFallingNotesStyle(value){
  if(!FALLING_STYLE_OPTIONS.some(option=>option[0]===value))value='bars';
  fallingNotesStyle=value;
  try{localStorage.setItem('yhwh_piano_barstyle',value);}catch(_){}
  if(value==='off'){
    if(fallingNotesFrame)cancelAnimationFrame(fallingNotesFrame);
    fallingNotesFrame=0;clearFallingNotesCanvas();
  }else if(state.playing&&fallingNotesRun&&!fallingNotesFrame&&!document.hidden){
    fallingNotesLastFrame=0;fallingNotesFrame=requestAnimationFrame(drawFallingNotesFrame);
  }
  syncFallingStyleButtons();
}
function initFallingStyleSetting(){
  const sheet=$('playerSettings');if(!sheet||$('fallingStyleBlock'))return;
  const block=document.createElement('div');block.id='fallingStyleBlock';block.className='settings-block';
  block.innerHTML='<h3>Notas que caen</h3><div class="range-presets" role="group" aria-label="Estilo de las notas que caen">'+FALLING_STYLE_OPTIONS.map(option=>`<button type="button" data-fall-style="${option[0]}"><span>${option[1]}</span><small style="display:block;margin-top:2px;font-size:.68rem;font-weight:400;opacity:.75">${option[2]}</small></button>`).join('')+'</div>';
  const switches=sheet.querySelector('.settings-switches');
  if(switches)switches.insertAdjacentElement('afterend',block);else sheet.appendChild(block);
  block.addEventListener('click',event=>{const button=event.target.closest('[data-fall-style]');if(button)setFallingNotesStyle(button.dataset.fallStyle);});
  syncFallingStyleButtons();
}
function setFallingNotesLookahead(value){fallingNotesLookahead=Math.min(FALLING_NOTES_MAX_LOOKAHEAD,Math.max(.8,value));}
function bindCanvasGestures(){
  const canvas=$('noteCanvas'),scroll=$('keyboardScroll');
  if(!canvas||!scroll)return;
  const IGNORE='button,input,select,textarea,summary,.stage-popover,.player-sheet,.notes-panel';
  let frame=0,pending=null;
  const spread=()=>{const [a,b]=[...canvasPointers.values()];return{dx:Math.max(28,Math.abs(a.x-b.x)),dy:Math.max(28,Math.abs(a.y-b.y)),mid:(a.x+b.x)/2};};
  // Un solo cambio por fotograma: primero zoom/scroll y luego dibujo, para que barras y teclas no se desfasen.
  const apply=()=>{
    frame=0;
    const g=canvasGesture,p=pending;pending=null;
    if(!g||!p||!g.axis)return;
    if(g.axis==='x'){
      setKeyboardZoom(g.zoom*p.dx/g.dx,{preserveCenter:false,persist:false,fast:true});
      scroll.scrollLeft=g.anchor*(state.keyboardZoom/g.zoom)-(p.mid-g.left);
      syncStageScroll();
    }else setFallingNotesLookahead(g.look*g.dy/p.dy);
  };
  pinchFlush=()=>{if(pending)apply();};
  canvas.addEventListener('pointerdown',event=>{
    if(event.target.closest(IGNORE)||canvasPointers.size>=2)return;
    try{canvas.setPointerCapture?.(event.pointerId);}catch(_){}
    canvasPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(canvasPointers.size===2){
      keyboardBaseKeyWidth();
      const s=spread(),left=scroll.getBoundingClientRect().left;
      canvasGesture={axis:null,dx:s.dx,dy:s.dy,zoom:state.keyboardZoom,look:fallingNotesLookahead,left,anchor:scroll.scrollLeft+s.mid-left};
    }
  });
  canvas.addEventListener('pointermove',event=>{
    if(!canvasPointers.has(event.pointerId))return;
    canvasPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const g=canvasGesture;if(canvasPointers.size<2||!g)return;
    event.preventDefault();
    const s=spread();
    if(!g.axis){
      // El eje se decide por lo que realmente se mueven los dedos, no por cómo se apoyaron.
      const moveX=Math.abs(s.dx-g.dx),moveY=Math.abs(s.dy-g.dy);
      if(Math.max(moveX,moveY)<10)return;
      g.axis=moveX>=moveY?'x':'y';
      g.dx=s.dx;g.dy=s.dy;g.zoom=state.keyboardZoom;g.look=fallingNotesLookahead;g.anchor=scroll.scrollLeft+s.mid-g.left;
      return;
    }
    pending=s;if(!frame)frame=requestAnimationFrame(apply);
  });
  const endGesture=event=>{
    if(!canvasPointers.has(event.pointerId))return;
    canvasPointers.delete(event.pointerId);
    const g=canvasGesture;
    if(canvasPointers.size<2&&g){
      if(pending)apply();
      if(frame){cancelAnimationFrame(frame);frame=0;}
      canvasGesture=null;pending=null;
      if(g.axis==='x')setKeyboardZoom(state.keyboardZoom,{preserveCenter:false});
      fallingNotesGeometry=null;
      try{localStorage.setItem('yhwh_piano_lookahead',String(fallingNotesLookahead));}catch(_){}
    }
  };
  canvas.addEventListener('pointerup',endGesture);canvas.addEventListener('pointercancel',endGesture);canvas.addEventListener('lostpointercapture',endGesture);
  ['gesturestart','gesturechange','gestureend'].forEach(type=>canvas.addEventListener(type,event=>event.preventDefault()));
}
function initializeSplash() {
  const splash = $('splashScreen');
  const enter = $('btnEntrarSplash');
  if (!splash || !enter) return;
  let autoCloseTimer = null;
  const hide = () => {
    if (splash.dataset.hidden) return;
    splash.dataset.hidden = '1';
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    splash.classList.add('splash-hide');
    setTimeout(() => splash.remove(), 650);
  };
  const reveal = () => {
    if (!document.body.contains(splash) || splash.dataset.ready) return;
    splash.dataset.ready = '1';
    $('splashLoader').style.display = 'none';
    enter.classList.add('show');
    autoCloseTimer = setTimeout(hide, 950);
  };
  enter.addEventListener('click', hide);
  setTimeout(reveal, 350);
}
let audioContext = null;
function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}
function resumeAudioContext(context=getAudioContext()){
  if(context.state==='running')return Promise.resolve();
  return context.resume();
}
async function getSample(midi) {
  const sampleMidi = Math.max(60, Math.min(76, midi));
  if (!state.buffers.has(sampleMidi)) {
    let pending=state.sampleLoads.get(sampleMidi);
    if(!pending){
      pending=(async()=>{const response=await fetch(`audio/${String(sampleMidi-20).padStart(3,'0')}.wav`);if(!response.ok)throw new Error(`No se pudo cargar audio/${sampleMidi-20}.wav`);state.buffers.set(sampleMidi,await getAudioContext().decodeAudioData(await response.arrayBuffer()));})();
      state.sampleLoads.set(sampleMidi,pending);
    }
    try{await pending;}finally{state.sampleLoads.delete(sampleMidi);}
  }
  return state.buffers.get(sampleMidi);
}
const INSTRUMENTS = {
  'grand-piano': { folder: 'grand-piano', first: 30, last: 96, step: 3, release: 0.4 },
  'steinway-grand': { folder: 'steinway-grand', first: 36, last: 95, step: 1, release: 0.7 },
  'trumpet-real': { folder: 'trumpet-vsco', first: 41, last: 72, step: 1, release: 0.25 },
};
const STEINWAY_PREFIX = 'Mp';
const STEINWAY_SAMPLE_NAMES = ["FF-A#2.m4a","FF-A#4.m4a","FF-A0.m4a","FF-A1.m4a","FF-A2.m4a","FF-A3.m4a","FF-A4.m4a","FF-A5.m4a","FF-B-1.m4a","FF-B0.m4a","FF-B1.m4a","FF-B2.m4a","FF-B3.m4a","FF-B4.m4a","FF-C#1.m4a","FF-C#5.m4a","FF-C2.m4a","FF-C3.m4a","FF-C4.m4a","FF-D#0.m4a","FF-D1.m4a","FF-D2.m4a","FF-D3.m4a","FF-D4.m4a","FF-D5.m4a","FF-E1.m4a","FF-E2.m4a","FF-E3.m4a","FF-E4.m4a","FF-E5.m4a","FF-F0.m4a","FF-F1.m4a","FF-F2.m4a","FF-F3.m4a","FF-F4.m4a","FF-F5.m4a","FF-G#2.m4a","FF-G#4.m4a","FF-G0.m4a","FF-G1.m4a","FF-G2.m4a","FF-G3.m4a","FF-G4.m4a","FF-G5.m4a","Mp-A#2.m4a","Mp-A#4.m4a","Mp-A#5.m4a","Mp-A#6.m4a","Mp-A0.m4a","Mp-A1.m4a","Mp-A2.m4a","Mp-A3.m4a","Mp-A4.m4a","Mp-A5.m4a","Mp-A6.m4a","Mp-B-1.m4a","Mp-B0.m4a","Mp-B1.m4a","Mp-B2.m4a","Mp-B3.m4a","Mp-B4.m4a","Mp-B5.m4a","Mp-C#1.m4a","Mp-C#5.m4a","Mp-C#6.m4a","Mp-C2.m4a","Mp-C3.m4a","Mp-C4.m4a","Mp-C6.m4a","Mp-D#0.m4a","Mp-D#5.m4a","Mp-D#6.m4a","Mp-D1.m4a","Mp-D2.m4a","Mp-D3.m4a","Mp-D4.m4a","Mp-D5.m4a","Mp-D6.m4a","Mp-E1.m4a","Mp-E2.m4a","Mp-E3.m4a","Mp-E4.m4a","Mp-E5.m4a","Mp-F#5.m4a","Mp-F#6.m4a","Mp-F0.m4a","Mp-F1.m4a","Mp-F2.m4a","Mp-F3.m4a","Mp-F4.m4a","Mp-F5.m4a","Mp-F6.m4a","Mp-G#2.m4a","Mp-G#4.m4a","Mp-G#5.m4a","Mp-G#6.m4a","Mp-G0.m4a","Mp-G1.m4a","Mp-G2.m4a","Mp-G3.m4a","Mp-G4.m4a","Mp-G5.m4a","Mp-G6.m4a","PP-A#2.m4a","PP-A#4.m4a","PP-A#5.m4a","PP-A#6.m4a","PP-A0.m4a","PP-A1.m4a","PP-A2.m4a","PP-A3.m4a","PP-A4.m4a","PP-A5.m4a","PP-A6.m4a","PP-B-1.m4a","PP-B0.m4a","PP-B1.m4a","PP-B2.m4a","PP-B3.m4a","PP-B4.m4a","PP-B5.m4a","PP-B6.m4a","PP-C#1.m4a","PP-C#5.m4a","PP-C#6.m4a","PP-C2.m4a","PP-C3.m4a","PP-C4.m4a","PP-C6.m4a","PP-C7.m4a","PP-D#0.m4a","PP-D#5.m4a","PP-D#6.m4a","PP-D1.m4a","PP-D2.m4a","PP-D3.m4a","PP-D4.m4a","PP-D5.m4a","PP-D6.m4a","PP-E1.m4a","PP-E2.m4a","PP-E3.m4a","PP-E4.m4a","PP-E6.m4a","PP-F#5.m4a","PP-F#6.m4a","PP-F0.m4a","PP-F1.m4a","PP-F2.m4a","PP-F3.m4a","PP-F4.m4a","PP-F5.m4a","PP-F6.m4a","PP-G#2.m4a","PP-G#4.m4a","PP-G#5.m4a","PP-G#6.m4a","PP-G0.m4a","PP-G1.m4a","PP-G2.m4a","PP-G3.m4a","PP-G4.m4a","PP-G5.m4a","PP-G6.m4a"];
function steinwayMidi(name) { const octave = Number(name.slice(-1)); const pitch = name.slice(0, -1); return (octave + 1) * 12 + NOTE_NAMES.indexOf(pitch); }
function steinwayNoteName(midi) {
  const semitones = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const candidates = STEINWAY_SAMPLE_NAMES.filter(file => file.startsWith(STEINWAY_PREFIX + '-')).map(file => file.slice(STEINWAY_PREFIX.length + 1, -4));
  const toMidi = value => {
    const octave = Number(value.slice(-1));
    const pitch = value.slice(0, -1);
    return (octave + 1) * 12 + semitones.indexOf(pitch);
  };
  return candidates.reduce((best, candidate) => Math.abs(toMidi(candidate) - midi) < Math.abs(toMidi(best) - midi) ? candidate : best, candidates[0] || 'C4');
}
async function getInstrumentSample(midi, instrument = state.instrument) {
  const spec = INSTRUMENTS[instrument];
  const sample = spec.samples?.find(item => midi >= item[0] && midi <= item[1]);
  const trumpetRoots = [41,45,48,51,55,58,62,65,69,72];
  const sampleMidi = instrument === 'trumpet-real' ? trumpetRoots.reduce((best, root) => Math.abs(root - midi) < Math.abs(best - midi) ? root : best, trumpetRoots[0]) : sample ? sample[2] : Math.max(spec.first, Math.min(spec.last, Math.round((midi - spec.first) / spec.step) * spec.step + spec.first));
  const actualSampleMidi = instrument === 'steinway-grand' ? steinwayMidi(steinwayNoteName(midi)) : sampleMidi;
  const key = instrument + ':' + actualSampleMidi + (instrument === 'trumpet-real' ? ':' + state.trumpetIntensity : '');
  if (!state.instrumentBuffers.has(key)) {
    let pending=state.instrumentSampleLoads.get(key);
    if(!pending){
      pending=(async()=>{const sampleName=sample?.[3],trumpetLayer=state.trumpetIntensity==='soft'?'v0-63':'v64-127';const filename=instrument==='steinway-grand'?`${STEINWAY_PREFIX}-${steinwayNoteName(actualSampleMidi)}.m4a`:instrument==='trumpet-real'?`${sampleMidi}_${trumpetLayer}_rr1.wav`:sampleName?`${sampleName}vH.flac`:`pno0${sampleMidi}.mp3`;const response=await fetch(`audio/${spec.folder}/${filename.split('/').map(encodeURIComponent).join('/')}`);if(!response.ok)throw new Error(`No se pudo cargar la muestra ${filename}`);state.instrumentBuffers.set(key,await getAudioContext().decodeAudioData(await response.arrayBuffer()));})();
      state.instrumentSampleLoads.set(key,pending);
    }
    try{await pending;}finally{state.instrumentSampleLoads.delete(key);}
  }
  return { buffer: state.instrumentBuffers.get(key), sampleMidi: actualSampleMidi, release: spec.release };
}
function primeAudioForInstrument(instrument=state.instrument){
  // Carga muestras antes del primer toque; el piano Grand usa solo 17 archivos
  // pequeños para cubrir todo el teclado. Otros instrumentos calientan la zona central.
  void resumeAudioContext(getAudioContext()).catch(()=>{});
  const midis=instrument==='grand-piano'
    ? [60,64,67,62,65,69,72,...Array.from({length:17},(_,i)=>60+i).filter(midi=>![60,64,67,62,65,69,72].includes(midi))]
    : instrument==='trumpet-real' ? [60,41,45,48,51,55,58,62,65,69,72]
    : [60,64,67,62,65,69,72,59,61,63,66,68];
  let next=0;
  const worker=async()=>{while(next<midis.length){const midi=midis[next++];try{if(instrument==='grand-piano')await getSample(midi);else await getInstrumentSample(midi,instrument);}catch(error){console.warn('No se pudo preparar una muestra de audio:',error);}}};
  void Promise.all([worker(),worker()]);
}
async function playChord(chord) {
  if(!chord.preview&&!state.bassSoundEnabled)return;
  if (!state.playing && !chord.preview) return;

  try {
    const context = getAudioContext();
    const resumePromise=resumeAudioContext(context);
    const chordInstrument = chord.instrument || state.bassInstrument || 'grand-piano';
    const entries = await Promise.all([resumePromise,...chordMidiNotes(chord).map(async midi => {
      if (chordInstrument === 'grand-piano') {
        const sampleMidi = Math.max(60, Math.min(76, midi));
        return { midi, sampleMidi, buffer: await getSample(midi) };
      }
      const sample = await getInstrumentSample(midi, chordInstrument);
      return { midi, sampleMidi: sample.sampleMidi, buffer: sample.buffer };
    })]).then(([, ...loaded])=>loaded);
    if (!state.playing && !chord.preview) return;
    const when = Number(chord.startAt) || context.currentTime + 0.015;
    if (!chord.preview && state.showChordNames && chord.root) {
      const updateChordReadout = () => {
        if (!state.playing || !state.showChordNames) return;
        $('activeChordLabel').textContent = chordDisplayName(chord);
        $('activeChordLabel').classList.remove('hidden');
      };
      const chordDelay = Math.max(0, (when - context.currentTime) * 1000);
      if (chordDelay) state.playTimers.push(setTimeout(updateChordReadout, chordDelay));
      else updateChordReadout();
    }
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = entry.buffer;
      source.playbackRate.value = 2 ** ((entry.midi - entry.sampleMidi) / 12);
      const tempo = Math.min(1.5,Math.max(.5,Number(chord.tempo)||1));
      const duration = Math.max(0.25, Number(chord.duration) || 2) / tempo;
      const noteWhen=when+(chord.arpeggio?index*0.2:index*0.01)/tempo;
      const release = chordInstrument === 'trumpet-real' ? 0.25 : chordInstrument === 'steinway-grand' ? 0.7 : (state.sustain ? 0.9 : 0.32);
      const stopAt = noteWhen + duration;
      gain.gain.setValueAtTime(0.78, noteWhen);
      gain.gain.setValueAtTime(0.78, stopAt);
      gain.gain.linearRampToValueAtTime(0.0001, stopAt + release);
      source.connect(gain); gain.connect(context.destination);
      source.start(noteWhen);
      source.stop(stopAt + release + 0.02);
      if(state.playing&&!chord.preview){state.activePlaybackSources.push(source);source.addEventListener('ended',()=>{state.activePlaybackSources=state.activePlaybackSources.filter(active=>active!==source);},{once:true});}
      const key = document.querySelector(`.key[data-midi="${entry.midi}"]`);
      const isBassChord=(chord.noteIndex!==undefined&&chord.noteIndex!==null)||(!chord.preview&&!!state.song);
      const barSeconds=Array.isArray(chord.lightDurations)&&Number.isFinite(chord.lightDurations[index])?chord.lightDurations[index]:null;
      const lightMs=barSeconds!==null?barSeconds*1000:Math.max(250,(duration+release)*1000);
      if (key) {
        const lightClasses=isBassChord?['playing','bass-playing']:['playing'];
        if (state.playing&&!chord.preview&&Number.isFinite(Number(chord.startAt))) queueKeyLight(noteWhen,key,lightClasses,lightMs);
        else state.playTimers.push(setTimeout(()=>lightKey(key,lightClasses,lightMs),Math.max(0,(noteWhen-context.currentTime)*1000)));
      }
    }
  } catch (error) {
    $('status').textContent = 'No se pudo cargar el sonido del acorde.';
    console.error(error);
  }
}
async function playNote(midi, element, duration = 0.4, visualDuration = null) {
  if (midi < 21 || midi > 108) return;
  handlePracticeInput(midi);
  element?.classList.add('playing');
  state.lastMidi = midi;
  $('currentNote').textContent = noteName(midi);
  $('currentNote').style.opacity = '1';
  if (state.recording) {
    state.notes.push({ midi, note: canonicalNoteName(midi), start: (performance.now() - state.recordStart) / 1000, duration: 0.35 });
    state.melodyDirty=true;
    renderRecorded();
  }
  try {
    const context = getAudioContext();
    // Llama resume antes del primer await para conservar el gesto táctil en iOS.
    const resumePromise=resumeAudioContext(context);
    const source = context.createBufferSource();
    const gain = context.createGain();
    if (state.instrument === 'grand-piano') {
      const sampleMidi = Math.max(60, Math.min(76, midi));
      const [buffer]=await Promise.all([getSample(midi),resumePromise]);
      source.buffer = buffer;
      source.playbackRate.value = 2 ** ((midi - sampleMidi) / 12);
    } else {
      const [sample]=await Promise.all([getInstrumentSample(midi),resumePromise]);
      source.buffer = sample.buffer;
      source.playbackRate.value = 2 ** ((midi - sample.sampleMidi) / 12);
      duration = Math.max(duration, sample.release);
    }
    const contextNow = context.currentTime;
    const attackAt = contextNow + 0.006;
    const held = duration === Infinity;
    const noteDuration = held ? 60 : Math.max(0.08, duration * (state.sustain ? 2.4 : 1));
    const release = state.instrument === 'trumpet-real' ? 0.25 : state.instrument === 'steinway-grand' ? 0.7 : (state.sustain ? 0.9 : 0.32);
    const stopAt = attackAt + noteDuration;
    gain.gain.setValueAtTime(0.0001, contextNow);
    gain.gain.linearRampToValueAtTime(0.88, attackAt + 0.018);
    gain.gain.setValueAtTime(0.88, stopAt);
    gain.gain.linearRampToValueAtTime(0.0001, stopAt + release);
    source.connect(gain); gain.connect(context.destination);
    source.start(attackAt);
    const finishNoteEffect=showManualNoteEffect(midi,element||document.querySelector(`.piano-panel .key[data-midi="${midi}"]`));
    source.stop(stopAt + release + 0.02);
    if(!held)setTimeout(()=>{finishNoteEffect?.();element?.classList.remove('playing');},visualDuration===null?noteDuration:Math.min(noteDuration,Math.max(.08,visualDuration)));
    let released = false;
    const stopNote = () => {
      if (released) return;
      released = true;
      finishNoteEffect?.();
      const releaseAt = context.currentTime;
      try {
        gain.gain.cancelScheduledValues(releaseAt);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), releaseAt);
        gain.gain.linearRampToValueAtTime(0.0001, releaseAt + release);
        source.stop(releaseAt + release + 0.03);
      } catch (_) {}
      element?.classList.remove('playing');
    };
    if (held) return stopNote;
  } catch (error) {
    $('status').textContent = 'No se pudo cargar el sonido. Comprueba la conexión y la carpeta audio.';
    console.error(error);
  }
}
async function previewInstrumentNote(instrument,midi){
  const context=getAudioContext(),resumePromise=resumeAudioContext(context);
  try{
    const sample=instrument==='grand-piano'?{buffer:await getSample(midi),sampleMidi:Math.max(60,Math.min(76,midi))}:await getInstrumentSample(midi,instrument);
    await resumePromise;
    const source=context.createBufferSource(),gain=context.createGain(),start=context.currentTime+.01;
    source.buffer=sample.buffer;source.playbackRate.value=2**((midi-sample.sampleMidi)/12);
    const release=instrument==='trumpet-real'?.25:instrument==='steinway-grand'?.7:.32,stopAt=start+.55;
    gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.linearRampToValueAtTime(.78,start+.02);gain.gain.setValueAtTime(.78,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+release);
    source.connect(gain);gain.connect(context.destination);source.start(start);source.stop(stopAt+release+.02);
  }catch(error){console.error('No se pudo reproducir la muestra del instrumento:',error);toast('No se pudo cargar el sonido de prueba. Revisa la conexión.');}
}
function setStagePlaying(on){document.body.classList.toggle('melody-playing',!!on);}
function stopPlayback({suspendAudio=false}={}) {
  state.playing = false;practiceRun=null;$('practiceGuide')?.classList.add('hidden');setStagePlaying(false);
  stopFallingNotes();
  state.playTimers.forEach(clearTimeout);
  state.playTimers = [];
  resetVisualQueue();
  resetPlaybackTimeline();
  document.querySelectorAll('.piano-panel .key.playing,.piano-panel .key.bass-playing,.piano-panel .key.note-sounding').forEach(key=>key.classList.remove('playing','bass-playing','note-sounding'));
  keyLightCounts.clear();
  state.activePlaybackSources.forEach(source=>{try{source.stop()}catch(_){}});
  state.activePlaybackSources=[];
  if (suspendAudio && audioContext?.state === 'running') audioContext.suspend().catch(()=>{});
  if($('tempoControl'))$('tempoControl').disabled=false;
  setPlayerControl('playMelody','▶','Reproducir');
}
function setPlayerControl(id,icon,label){
  const button=$(id);if(!button)return;
  button.innerHTML=`${icon}<small>${label}</small>`;
  button.setAttribute('aria-label',label);
}
async function prepareMelodyAudio(notesToPrepare=state.notes) {
  const context=getAudioContext();
  const resumePromise=resumeAudioContext(context);
  const noteMidis = [...new Set(notesToPrepare.map(note => Number(note.midi)).filter(Number.isFinite))];
  const entries=await Promise.all(noteMidis.map(async midi=>{
    if(state.instrument==='grand-piano'){const sampleMidi=Math.max(60,Math.min(76,midi));return [midi,{buffer:await getSample(midi),sampleMidi,release:.4}];}
    return [midi,await getInstrumentSample(midi,state.instrument)];
  }));
  const loads = [];
  state.chords.forEach(chord => {
    const instrument = chord.instrument || state.bassInstrument || 'grand-piano';
    chordMidiNotes(chord).forEach(midi => loads.push(instrument === 'grand-piano' ? getSample(midi) : getInstrumentSample(midi, instrument)));
  });
  await Promise.all([...loads,resumePromise]);
  return new Map(entries);
}
function schedulePlaybackNote(midi,element,duration,when,prepared,cut){
  if(!state.melodySoundEnabled)return;
  const context=getAudioContext(),entry=prepared.get(midi);
  if(!entry)return;
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=entry.buffer;source.playbackRate.value=2**((midi-entry.sampleMidi)/12);
  const noteDuration=Math.max(.06,duration/state.tempo);
  const baseRelease=state.instrument==='trumpet-real'?.25:state.instrument==='steinway-grand'?.7:(state.sustain?.9:.32);
  const release=cut?Math.min(baseRelease,.06):baseRelease;
  const stopAt=when+noteDuration;
  gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(.88,when+.018);
  gain.gain.setValueAtTime(.88,stopAt);gain.gain.linearRampToValueAtTime(.0001,stopAt+release);
  source.connect(gain);gain.connect(context.destination);source.start(when);source.stop(stopAt+release+.02);
  state.activePlaybackSources.push(source);source.addEventListener('ended',()=>{state.activePlaybackSources=state.activePlaybackSources.filter(active=>active!==source);},{once:true});
  queueVisualEvent(when,()=>{
    const readout=$('currentNote'),name=noteName(midi);
    if(readout.textContent!==name)readout.textContent=name;
    if(readout.style.opacity!=='1')readout.style.opacity='1';
  });
  if(element)queueKeyLight(when,element,['playing'],(stopAt+release-when)*1000);
}
async function playMelody() {
  const playbackNotes=notesForCurrentMix();
  if (!playbackNotes.length) { toast(state.melodyType==='voz'?'Activa al menos una voz para escucharla.':'Esta pista todavía no tiene melodía grabada.'); $('status').textContent = 'No hay notas seleccionadas para reproducir.'; return; }
  stopPlayback();
  state.selectedSongChord=null;
  document.querySelectorAll('#keyboard .key.chord-selected,#lyrics .lyrics-chord.selected').forEach(element=>element.classList.remove('chord-selected','selected'));
  state.playing = true;setStagePlaying(true);closePlayerPopovers();
  setPlayerControl('playMelody','⏸','Reproduciendo');
  $('status').textContent = 'Preparando sonido…';
  try {
    var prepared=await prepareMelodyAudio(playbackNotes);
  } catch (error) {
    state.playing = false;setStagePlaying(false);
    stopFallingNotes();
    resetPlaybackTimeline();
    setPlayerControl('playMelody','▶','Reproducir');
    $('status').textContent = 'No se pudieron preparar los sonidos. Conéctate una vez para descargarlos.';
    console.error('No se pudieron precargar las muestras de la melodía:',error);
    return;
  }
  if (!state.playing) return;
  $('tempoControl').disabled=true;
  $('status').textContent = `Reproduciendo melodía · ${Math.round(state.tempo*100)}%`;
  const playbackStart=getAudioContext().currentTime+.12;
  // Encuadra una sola vez la primera nota de la melodía. Mantiene fijo el
  // teclado durante el resto de la reproducción para evitar saltos por nota.
  const firstNote = playbackNotes.reduce((first, note) => Number(note.start) < Number(first.start) ? note : first, playbackNotes[0]);
  let firstKey = document.querySelector(`.key[data-midi="${Number(firstNote.midi)}"]`);
  const keyboardScroll = $('keyboardScroll');
  if (!firstKey && keyboardScroll) firstKey = document.querySelector('.key[data-midi=60]');
  if (firstKey && keyboardScroll) {
    const keyLeft = firstKey.getBoundingClientRect().left - keyboardScroll.getBoundingClientRect().left + keyboardScroll.scrollLeft;
    const left = keyLeft - (keyboardScroll.clientWidth - firstKey.offsetWidth) / 2;
    keyboardScroll.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
  playbackNotes.forEach(note => {
    const midi=Number(note.midi),key=document.querySelector(`.key[data-midi="${midi}"]`);
    schedulePlaybackNote(midi,key,noteHoldSeconds(note),playbackStart+Math.max(0,Number(note.start)||0)/state.tempo,prepared,noteWasCut(note));
  });
  const playbackChords = state.voiceMix.acordes ? state.chords : [];
  const fallingEvents=makeFallingNotesEvents(playbackNotes,playbackChords),chordLights=new Map();
  fallingEvents.forEach(event=>{if(event.kind!=='chord')return;if(!chordLights.has(event.chord))chordLights.set(event.chord,[]);chordLights.get(event.chord)[event.index]=event.visualDuration;});
  playbackChords.forEach(chord => {
    const start=chordStartTime(chord);
    if (start===null) return;
    playChord({...chord,duration:chordSpanForPlayback(chord),tempo:state.tempo,startAt:playbackStart+start/state.tempo,lightDurations:chordLights.get(chord)});
  });
  const noteRelease = state.instrument === 'trumpet-real' ? 0.25 : state.instrument === 'steinway-grand' ? 0.7 : (state.sustain ? 0.9 : 0.32);
  const noteEnd = Math.max(...playbackNotes.map(note => ((Number(note.start) || 0) + noteHoldSeconds(note)) / state.tempo + (noteWasCut(note) ? Math.min(noteRelease, .06) : noteRelease)));
  const chordEnd = playbackChords.reduce((end, chord) => { const start=chordStartTime(chord); const instrument=chord.instrument||state.bassInstrument; const release=instrument==='trumpet-real'?0.25:instrument==='steinway-grand'?0.7:(state.sustain?0.9:0.32); return start!==null ? Math.max(end, (start+chordSpanForPlayback(chord)+(chord.arpeggio?0.4:0))/state.tempo+release) : end; }, 0);
  const end = Math.max(noteEnd, chordEnd);
  startPlaybackTimeline(playbackStart,end);
  startFallingNotes(playbackNotes,playbackChords,playbackStart,fallingEvents);
  state.playTimers.push(setTimeout(() => { state.playing = false; setStagePlaying(false); stopFallingNotes(); if(timelineFrame)cancelAnimationFrame(timelineFrame);timelineFrame=0;timelineStartedAt=0;updatePlaybackTimeline(end,end);$('tempoControl').disabled=false; setPlayerControl('playMelody','▶','Reproducir'); $('status').textContent = 'Melodía terminada.'; }, end * 1000 + 500));
}
function toggleRecord() {
  if (!state.admin) { toast('Solo Admin puede grabar.'); return; }
  if (state.recording) {
    state.recording = false; setPlayerControl('recordBtn','⏺','Grabar'); $('status').textContent = `${state.melodyType==='voz'?'Voz principal':'Introducción'} grabada. Asigna los acordes de cada tramo y guarda la pista.`; renderRecorded(); updateTrackTimeline(); return;
  }
  state.notes = []; state.chords = []; state.chordTarget = null; updateTrackTimeline(); state.recordStart = performance.now(); state.recording = true;
  state.melodyDirty=true;
  setPlayerControl('recordBtn','⏹','Detener grabación'); $('status').textContent = `Grabando ${state.melodyType==='voz'?'voz principal':'introducción'}… toca las notas.`; renderRecorded();
}
async function saveMelody() {
  if (!state.admin || !state.song || !state.set || !state.ref || !state.db) { toast('Inicia sesión y conéctate para guardar.'); return; }
  if (!state.notes.length) { toast('Graba al menos una nota.'); return; }
  const { song, category } = state.song;
  $('status').textContent='Guardando melodía y acordes en Firebase…';
  const payload = {
    songId: song.id,
    updatedAt: new Date().toISOString(),
    tono: transposedTonic(),
    acordes: state.chords.map(chord => { const baked = chord.noTranspose ? { root:String(chord.root), octave:Number(chord.octave)||36 } : bakeChordTranspose(chord, state.transpose); return { noteIndex:Number(chord.noteIndex), start:Number(chordStartTime(chord)?.toFixed(3)||0), root:baked.root, quality:String(chord.quality), inversion:Number(chord.inversion)||0, octave:baked.octave, duration:Number(chord.duration)||2, arpeggio:!!chord.arpeggio, instrument:chord.instrument||state.bassInstrument }; }),
    notas: state.notes.map((note, index, all) => {
      const start=Number(note.start)||0;
      const next=all.slice(index+1).find(item=>(Number(item.start)||0)>start+.035);
      return { midi: Number(note.midi), note: canonicalNoteName(Number(note.midi)), start: Number(start.toFixed(3)), duration: Number((next ? Math.max(0.12, Number(next.start)-start) : Math.max(0.35, Number(note.duration)||0.35)).toFixed(3)) };
    })
  };
  try {
    const tracks=melodyTracks(melodyFor(category,song.id));tracks[state.melodyType]=payload;
    const storedRecord={};if(tracks.introduccion)storedRecord.introduccion=tracks.introduccion;if(tracks.voz)storedRecord.voz=tracks.voz;
    await state.set(state.ref(state.db, `melodias/${category}/${song.id}`), storedRecord);
    state.melodies[category] ||= {};
    state.melodies[category][String(song.id)] = storedRecord;
    try { localStorage.setItem('yhwh_melodias_cache', JSON.stringify(state.melodies)); } catch (_) {}
    state.melodyDirty=false;
    updateTrackTimeline();
    // Lo guardado ya está en el tono transportado: ese pasa a ser el tono de la pista.
    state.originalTonic = payload.tono; state.transpose = 0; state.chords = payload.acordes.map(chord => ({ ...chord }));
    renderChordPresets(); updateTransposeUI(); renderRecorded();
    $('playerLabel').textContent=`${state.melodyType==='voz'?'Voz principal':'Introducción'} · Guardada`;
    renderLists();
    toast('Melodía guardada y sincronizada.');
    $('status').textContent = 'Melodía guardada.';
  } catch (error) {
    $('status').textContent=`Error al guardar en Firebase${error?.code?`: ${error.code}`:''}. Revisa la conexión e inténtalo de nuevo.`;
    toast('No se pudo guardar en Firebase.');
    console.error('Error al guardar la melodía:',error);
  }
}
async function deleteMelody() {
  if (!state.admin || !state.song || !state.set || !state.ref || !state.db || !hasTrack(state.song.category,state.song.song.id,state.melodyType)) return;
  if (!confirm(`¿Eliminar la pista ${state.melodyType==='voz'?'de voz principal':'de introducción'} de esta alabanza?`)) return;
  try {
    const tracks=melodyTracks(melodyFor(state.song.category,state.song.song.id));tracks[state.melodyType]=null;
    const storedRecord={};if(tracks.introduccion)storedRecord.introduccion=tracks.introduccion;if(tracks.voz)storedRecord.voz=tracks.voz;
    await state.set(state.ref(state.db, `melodias/${state.song.category}/${state.song.song.id}`), Object.keys(storedRecord).length?storedRecord:null);
    if(Object.keys(storedRecord).length)state.melodies[state.song.category][String(state.song.song.id)]=storedRecord;else delete state.melodies[state.song.category][String(state.song.song.id)];
    state.notes = []; state.chords = []; state.chordTarget = null; state.melodyDirty=false; renderRecorded(); updateTrackTimeline(); updateAdminControls();
    $('playerLabel').textContent=state.melodyType==='voz'?'Voz principal':'Introducción';
    $('status').textContent=`Se eliminó la pista de ${state.melodyType==='voz'?'voz principal':'introducción'}.`;
    try{localStorage.setItem('yhwh_melodias_cache',JSON.stringify(state.melodies));}catch(_){}
    renderLists();toast('Pista eliminada.');
  } catch (_) { toast('No se pudo eliminar.'); }
}

function showLogin() {
  if (state.admin && state.signOut) { state.signOut(state.auth); return; }
  $('loginError').textContent = '';
  $('password').value = '';
  $('loginModal').classList.remove('hidden');
  $('password').focus();
}
async function login() {
  if (!state.signIn || !state.auth) { $('loginError').textContent = 'Firebase no está conectado. Abre la app con internet.'; return; }
  const password = $('password').value.trim();
  if (!password) { $('loginError').textContent = 'Escribe tu contraseña.'; return; }
  try {
    await state.signIn(state.auth, 'rosalesjrnain07@gmail.com', password);
    $('loginModal').classList.add('hidden');
    $('password').value = '';
    toast('Modo Admin activado.');
  } catch (_) { $('loginError').textContent = 'Contraseña incorrecta o sin conexión.'; $('password').value = ''; }
}

function bindInterface() {
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => setView(button.dataset.view));
  $('homeBtn').onclick = () => setView('home');
  $('recentSongsList').onclick=event=>{
    const row=event.target.closest('[data-recent-song-id]');if(!row)return;
    const category=row.dataset.category,song=songsFor(category).find(item=>String(item.id)===row.dataset.recentSongId);if(!song)return;
    selectedSongForContinue={song,category};
    // Recent songs open the same chooser as the song list. Set the list view
    // state first so returning from the chooser restores its full-screen layout.
    state.view=category==='jubilo'?'jubilo':'adoracion';
    document.body.classList.remove('home-active','create-list-active');
    document.body.classList.add('song-list-active');
    renderLists();
    $('playModeSongTitle').textContent=song.title||'Alabanza';
    syncModeScreen();
    transitionScreen('playModeModal',['homeView','songView','createView','theoryView','player','playModeModal']);
  };
  $('freePlayBtn').onclick = openFreePlay;
  document.querySelectorAll('[data-go-home]').forEach(button => button.onclick = () => setView('home'));
  document.querySelectorAll('[data-track-select]').forEach(button=>button.onclick=()=>chooseTrack(button.dataset.trackSelect));
  $('closeTrackModal').onclick=closeTrackChooser;
  $('trackModal').onclick=event=>{if(event.target===$('trackModal'))closeTrackChooser();};
  $('continueSongBtn').onclick=()=>{if(!selectedSongForContinue)return;$('playModeSongTitle').textContent=selectedSongForContinue.song.title||'Alabanza';syncModeScreen();transitionScreen('playModeModal',['homeView','songView','createView','theoryView','player','playModeModal']);};
  $('selectedPreviewBtn').onclick=()=>{if(!selectedSongForContinue){toast('Selecciona una alabanza primero.');return;}previewSongInList(selectedSongForContinue.song,selectedSongForContinue.category,$('selectedPreviewBtn'));};
  $('closePlayMode').onclick=()=>transitionScreen('songView',['homeView','songView','createView','theoryView','player','playModeModal']);
  document.querySelectorAll('[data-screen-settings]').forEach(button=>button.onclick=()=>{
    const track=selectedSongForContinue&&trackFor(selectedSongForContinue.category,selectedSongForContinue.song.id,'introduccion');
    if($('modeMelodyMeta'))$('modeMelodyMeta').textContent=`${track?.notas?.length||0} notas · Canal 1`;
    transitionScreen('instrumentSettingsScreen',['homeView','songView','createView','theoryView','player','playModeModal','instrumentSettingsScreen']);
  });
  $('closeInstrumentSettings').onclick=()=>transitionScreen('playModeModal',['homeView','songView','createView','theoryView','player','playModeModal','instrumentSettingsScreen']);
  $('instrumentHelpButton').onclick=()=>{const dialog=$('instrumentHelpDialog');if(dialog?.showModal)dialog.showModal();};
  $('instrumentSettingsReset').onclick=()=>{applyInstrumentSettingsPreset({instrument:'grand-piano',bassInstrument:'grand-piano',keyColor:'#90dd4a',bassColor:'#bb82ef',second:'down',third:'down'});updateInstrumentSoundToggle('melody',true);updateInstrumentSoundToggle('bass',true);};
  $('instrumentColorAuto').onclick=()=>applyInstrumentSettingsPreset({keyColor:'#90dd4a',bassColor:'#bb82ef'});
  $('previewBassSound').onclick=()=>previewInstrumentNote($('bassInstrument').value,48);
  $('previewMelodySound').onclick=()=>previewInstrumentNote($('instrumentSelect').value,72);
  $('melodySoundToggle').onclick=()=>updateInstrumentSoundToggle('melody',!state.melodySoundEnabled);
  $('bassSoundToggle').onclick=()=>updateInstrumentSoundToggle('bass',!state.bassSoundEnabled);
  syncInstrumentSoundToggles();
  document.querySelectorAll('[data-play-mode]').forEach(button=>button.onclick=()=>selectPlayMode(button.dataset.playMode));
  $('modeStartBtn').onclick=()=>{
    if(selectedPlayMode==='settings'){
      const track=selectedSongForContinue&&trackFor(selectedSongForContinue.category,selectedSongForContinue.song.id,'introduccion');
      if($('modeMelodyMeta'))$('modeMelodyMeta').textContent=`${track?.notas?.length||0} notas · Canal 1`;
      transitionScreen('instrumentSettingsScreen',['homeView','songView','createView','theoryView','player','playModeModal','instrumentSettingsScreen']);
      return;
    }
    beginSelectedSong(selectedPlayMode);
  };
  document.querySelectorAll('[data-mode-tab]').forEach(button=>button.onclick=()=>showModeScreenTab(button.dataset.modeTab));
  document.querySelectorAll('[data-play-mode]').forEach(button=>['focus','pointerenter'].forEach(signal=>button.addEventListener(signal,()=>{
    const copy={listen:['Solo ver y escuchar','Reproduce automáticamente la alabanza completa.'],practice:['Practicar melodía','Las notas de la melodía esperan a que las toques para avanzar.'],second:['Escuchar segunda voz','Reproduce únicamente la segunda voz generada según la dirección elegida.'],third:['Escuchar tercera voz','Reproduce únicamente la tercera voz generada según la dirección elegida.']}[button.dataset.playMode];
    if(copy)selectPlayMode(button.dataset.playMode);
  })));
  const bindModeScreenSetting=(controlId,sourceId)=>{
    const control=$(controlId),source=$(sourceId);if(!control||!source)return;
    control.value=source.value;
    control.addEventListener('input',event=>{source.value=event.target.value;source.dispatchEvent(new Event(source.type==='color'?'input':'change',{bubbles:true}));});
    control.addEventListener('change',event=>{source.value=event.target.value;source.dispatchEvent(new Event('change',{bubbles:true}));});
  };
  bindModeScreenSetting('modeMelodyInstrument','instrumentSelect');
  bindModeScreenSetting('modeBassInstrument','bassInstrumentQuick');
  bindModeScreenSetting('modeMelodyColor','keyColorPicker');
  bindModeScreenSetting('modeBassColor','bassColorPicker');
  bindModeScreenSetting('modeSecondDirection','secondVoiceDirection');
  bindModeScreenSetting('modeThirdDirection','thirdVoiceDirection');
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeTrackChooser();});
  [['voiceMain','principal'],['voiceSecond','segunda'],['voiceThird','tercera'],['voiceChords','acordes']].forEach(([id,name])=>$(id)&&($(id).onchange=event=>{
    state.voiceMix[name]=event.target.checked;
    if(state.playing)stopPlayback();
    $('status').textContent='Mezcla de voces actualizada. Pulsa reproducir para escuchar la selección.';
  }));
  [['secondVoiceDirection','segunda','yhwh_voice_second_direction'],['thirdVoiceDirection','tercera','yhwh_voice_third_direction']].forEach(([id,name,key])=>$(id)&&($(id).onchange=event=>{
    state.voiceDirection[name]=event.target.value==='up'?'up':'down';
    localStorage.setItem(key,state.voiceDirection[name]);
    if(state.playing)stopPlayback();
    $('status').textContent='Dirección de armonía actualizada. Pulsa reproducir para escucharla.';
  }));
  document.querySelectorAll('.theory-tab').forEach(button => button.onclick = () => changeTheoryTab(button.dataset.theoryTab));
  bindTheoryLearning();bindWorshipPractice();renderTheoryLessons();
  $('liveTheoryInterval').innerHTML=THEORY_INTERVALS.map(([name,label,semi])=>`<option value="${semi}">${label} · ${name}</option>`).join('');
  $('liveTheoryInterval').value='7';
  $('theoryLiveToggle').onclick=()=>{
    const dock=$('liveTheoryDock'),opening=dock.classList.contains('hidden');
    if(opening){dock.classList.remove('hidden');$('theoryLiveToggle').setAttribute('aria-expanded','true');renderLiveTheoryDock();}
    else closeLiveTheoryDock({clear:false});
  };
  $('closeLiveTheory').onclick=()=>closeLiveTheoryDock({clear:false});
  const theorySizeSelect=document.getElementById('liveTheorySize'),savedTheorySize=localStorage.getItem('yhwh_live_theory_size');if(theorySizeSelect){theorySizeSelect.value=['small','medium','large'].includes(savedTheorySize)?savedTheorySize:'medium';$('liveTheoryDock').dataset.size=theorySizeSelect.value;theorySizeSelect.onchange=()=>{$('liveTheoryDock').dataset.size=theorySizeSelect.value;try{localStorage.setItem('yhwh_live_theory_size',theorySizeSelect.value);}catch(_){}};}
  bindLiveTheoryDockDrag();
  document.querySelectorAll('[data-live-theory]').forEach(button=>button.onclick=()=>{liveTheoryMode=button.dataset.liveTheory;renderLiveTheoryDock();});
  ['liveTheoryRoot','liveTheoryKeyMode','liveTheoryScale','liveTheoryInterval'].forEach(id=>$(id).onchange=renderLiveTheoryDock);
  $('liveTheoryPlayKey').onclick=playLiveTheory;
  $('lyrics').onclick = event => {const chord=event.target.closest('[data-play-chord]');if(chord)playSongChord(chord.dataset.playChord,chord);};
  $('theoryRoot').onchange = event => { setTheoryChord(event.target.value,state.theoryChord.quality,true);renderTheory(); };
  $('theoryMode').onchange = renderTheory;
  $('theoryScaleType').onchange = event => { state.theoryScale=event.target.value;state.theoryPianoMode='scale';renderTheoryScale(); };
  $('theoryChordCards').onclick = event => { const card=event.target.closest('[data-theory-quality]');if(!card)return;setTheoryChord(state.theoryChord.root,card.dataset.theoryQuality);renderTheory(); };
  $('theoryKeyCards').onclick = event => { const chord=event.target.closest('[data-key-root]');if(!chord)return;setTheoryChord(chord.dataset.keyRoot,chord.dataset.keyQuality);changeTheoryTab('piano');renderTheory(); };
  $('theoryPlayChord').onclick = () => playChord({ ...state.theoryChord, octave:60, duration:2, preview:true, noTranspose:true });
  $('theoryPianoPlay').onclick = playTheoryPianoSelection;
  $('theoryPlayScale').onclick = playTheoryScale;
  $('theoryIntervalCards').onclick = event => { const card=event.target.closest('[data-interval]');if(card)selectTheoryInterval(card.dataset.interval); };
  $('theoryPlayInterval').onclick = () => playChord({root:state.theoryChord.root,octave:60,intervals:[0,state.theoryInterval],duration:1.1,preview:true,noTranspose:true});
  $('theoryCircleResults').onclick = event => {const button=event.target.closest('[data-circle-chord]');if(!button)return;const chord=state.theoryCircleChords?.[button.dataset.circleChord];if(!chord)return;state.theoryCircleChord=button.dataset.circleChord;$('theoryCircleResults').querySelectorAll('[data-circle-chord]').forEach(item=>item.classList.toggle('active',item===button));setTheoryChord(chord.root,chord.quality);renderTheoryCircle();playChord({...chord,octave:60,duration:2,preview:true,noTranspose:true});};
  $('theoryPianoKeyboard').onclick = event => { const key=event.target.closest('[data-midi]');if(!key)return;const recording=state.recording;state.recording=false;playNote(Number(key.dataset.midi),key);state.recording=recording; };
  $('search').oninput = renderLists;
  $('songFilters').onclick=event=>{const button=event.target.closest('[data-song-filter]');if(!button)return;songListFilter=button.dataset.songFilter;renderLists();};
  $('createSearch').oninput = renderLists;
  $('adminBtn').onclick = showLogin;
  $('loginSubmit').onclick = login;
  $('password').onkeydown = event => { if (event.key === 'Enter') login(); };
  $('closeLogin').onclick = () => $('loginModal').classList.add('hidden');
  $('loginModal').onclick = event => { if (event.target === $('loginModal')) $('loginModal').classList.add('hidden'); };
  $('backBtn').onclick = () => {
    if(!confirmDiscardUnsavedMelody())return;
  clearSongIntro();stopPlayback();stopTheorySequence();stopMetronome();closePlayerPopovers();closeLiveTheoryDock();state.recording=false;
    const returnTo=state.view==='libre'?'homeView':state.view==='crear'?'createView':state.view==='teoria'?'theoryView':'songView';
    document.body.classList.toggle('song-list-active',returnTo==='songView');
    document.body.classList.toggle('create-list-active',returnTo==='createView');
    document.body.classList.toggle('home-active',returnTo==='homeView');
    transitionScreen(returnTo,['homeView','songView','createView','theoryView','player']);
    renderLists();
  };
  $('playMelody').onclick = () => practiceRun ? stopPlayback() : state.playMode==='practice' ? startPracticeMelody() : playMelody();
  $('practiceHearBtn').onclick=hearPracticeNote;
  $('practiceSkipBtn').onclick=advancePracticeNote;
  $('tempoControl').value = String(Math.round(state.tempo*100));
  $('tempoValue').textContent = `${Math.round(state.tempo*100)}%`;
  $('tempoControl').oninput = event => {
    state.tempo = Math.min(1.5,Math.max(.5,Number(event.target.value)/100));
    $('tempoValue').textContent = `${Math.round(state.tempo*100)}%`;
    updateTrackTimeline();
    try { localStorage.setItem('yhwh_piano_tempo',String(state.tempo)); } catch (_) {}
  };
  syncMetronomeUI();
  $('metronomeBpm').oninput = event => setMetronomeBpm(event.target.value);
  $('metronomeBpm').onchange = event => setMetronomeBpm(event.target.value,true);
  $('metronomeMeter').onchange = event => setMetronomeMeter(event.target.value);
  $('metronomeToggle').onclick = toggleMetronome;
  $('metronomeTempoDown').onclick=()=>setMetronomeBpm(metronomeBpm-1,true);
  $('metronomeTempoUp').onclick=()=>setMetronomeBpm(metronomeBpm+1,true);
  $('tapTempo').onclick = tapMetronomeTempo;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopMetronome();});
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'AUDIO_CACHE_STARTED') $('offlineStatus').textContent = 'Descargando sonidos para usar sin conexión…';
    if (event.data?.type === 'AUDIO_CACHE_PROGRESS') $('offlineStatus').textContent = `Descargando sonidos para usar sin conexión… ${event.data.done}/${event.data.total}`;
    if (event.data?.type === 'AUDIO_CACHE_DONE') { offlineAudioDownloadRunning=false; $('offlineStatus').textContent = `Listo. ${event.data.done} sonidos guardados para usar sin conexión.`; }
    if (event.data?.type === 'AUDIO_CACHE_ERROR') { offlineAudioDownloadRunning=false; $('offlineStatus').textContent = `La descarga quedó incompleta (${event.data.done}/${event.data.total}). Se reanudará cuando haya conexión.`; }
  });
  $('stopMelody').onclick = () => {
    const wasPlaying = state.playing;
    clearSongIntro();stopPlayback(); $('status').textContent = wasPlaying ? 'Reproducción detenida.' : 'No había una melodía reproduciéndose.';
  };
  $('keyboardNotation').value = state.notation;
  buildNotationButtons();
  setKeyboardZoom(state.keyboardZoom);
  $('keyboardOctaveLabel').textContent = canonicalNoteName(state.keyboardOctaveMidi);
  $('octaveDown').onclick = () => moveKeyboardOctave(-1);
  $('octaveUp').onclick = () => moveKeyboardOctave(1);
  $('keyboardZoomOut').onclick = () => setKeyboardZoom(state.keyboardZoom - 0.15);
  $('keyboardZoomIn').onclick = () => setKeyboardZoom(state.keyboardZoom + 0.15);
  window.addEventListener('resize',()=>{keyBaseWidthCache=0;stageLastKeyWidth=-1;fallingNotesGeometry=null;syncStageScroll();},{passive:true});
  $('keyboardNotation').onchange = event => {
    state.notation = ['ninguno','octavas','americano','latino','movil','grados','simple'].includes(event.target.value)?event.target.value:'americano';
    try { localStorage.setItem('yhwh_piano_note_labels',state.notation);localStorage.setItem('yhwh_cifrado_latino', state.notation === 'latino' ? '1' : '0'); } catch (_) {}
    renderKeyboard(); renderRecorded(); renderTheory();
    if (state.lastMidi !== null) $('currentNote').textContent = noteName(state.lastMidi);
    if (state.song) updateTransposeUI();
    updateActiveChordLabel();
    updateVisualOptions();
  };
  $('instrumentToggle').onclick=()=>{togglePlayerPopover('instrumentMenu');syncInstrumentButtons();};
  $('keyColorToggle').onclick=()=>togglePlayerPopover('colorMenu');
  $('keyboardRangeToggle').onclick=()=>togglePlayerPopover('keyboardRangeMenu');
  $('notationToggle').onclick=()=>{togglePlayerPopover('notationMenu');$('keyboardNotation').value=state.notation;syncNotationButtons();};
  $('chordsViewToggle').onclick=toggleLyricsPanel;
  $('settingsToggle').onclick=()=>togglePlayerPopover('playerSettings');
  $('closeSettings').onclick=()=>closePlayerPopovers();
  $('chordEditorToggle').onclick=toggleChordEditor;
  $('closeChordEditor').onclick=()=>{chordEditorOpen=false;closePlayerPopovers();};
  $('closeNotes').onclick=()=>{$('notesPanel').dataset.open='';updateVisualOptions();};
  $('keyColorPicker').value=state.keyColor;
  $('keyColorPicker').oninput=event=>{state.keyColor=event.target.value;try{localStorage.setItem('yhwh_piano_key_color',state.keyColor);}catch(_){}updateVisualOptions();};
  $('bassColorPicker').oninput=event=>{state.bassColor=event.target.value;try{localStorage.setItem('yhwh_piano_bass_color',state.bassColor);}catch(_){}updateVisualOptions();};
  $('showChordNames').onchange=event=>{state.showChordNames=event.target.checked;try{localStorage.setItem('yhwh_piano_show_chords',state.showChordNames?'1':'0');}catch(_){}if(!state.showChordNames)$('activeChordLabel').classList.add('hidden');else updateActiveChordLabel();updateVisualOptions();};
  {const glowSwitch=$('fxGlowSwitch'),lightSwitch=$('lightKeysSwitch'),colorSwitch=$('keyColorOnSwitch'),edgeSwitch=$('keyEdgeSwitch');
    const save=(key,on)=>{try{localStorage.setItem(key,on?'1':'0');}catch(_){}};
    const applyKeyLook=()=>{document.body.classList.toggle('keys-no-color',!keyColorOn);document.body.classList.toggle('keys-edge',keyEdge);document.body.classList.toggle('keys-fill-off',!lightKeys);if(colorSwitch)colorSwitch.disabled=!(lightKeys||keyEdge);};
    if(glowSwitch){glowSwitch.checked=fxGlow;glowSwitch.onchange=event=>{fxGlow=event.target.checked;save('yhwh_piano_fx_glow',fxGlow);};}
    if(lightSwitch){lightSwitch.checked=lightKeys;lightSwitch.onchange=event=>{lightKeys=event.target.checked;save('yhwh_piano_light_keys',lightKeys);applyKeyLook();};}
    if(colorSwitch){colorSwitch.checked=keyColorOn;colorSwitch.onchange=event=>{keyColorOn=event.target.checked;save('yhwh_piano_key_color_on',keyColorOn);applyKeyLook();};}
    if(edgeSwitch){edgeSwitch.checked=keyEdge;edgeSwitch.onchange=event=>{keyEdge=event.target.checked;save('yhwh_piano_key_edge',keyEdge);applyKeyLook();};}
    applyKeyLook();}
  $('showRecordedNotes').onchange=event=>{state.showRecordedNotes=event.target.checked;try{localStorage.setItem('yhwh_piano_show_recorded',state.showRecordedNotes?'1':'0');}catch(_){}if(!state.showRecordedNotes)$('notesPanel').dataset.open='';updateAdminControls();};
  $('keyboardZoomSlider').oninput=event=>setKeyboardZoom(Number(event.target.value)/100);
  document.querySelectorAll('[data-key-range]').forEach(button=>button.onclick=()=>{
    if(button.dataset.keyRange==='custom'){$('keyboardZoomSlider').focus();return;}
    setKeyboardPreset(Number(button.dataset.keyRange));
  });
  $('keyboardScroll').addEventListener('scroll',syncStageScroll,{passive:true});
  try{if(/[?&]perf=1/.test(location.search)||localStorage.getItem('yhwh_perf')==='1')perfProbeEnable(true);}catch(_){}
  {const strip=$('playerTimeline');if(strip){let pressTimer=0;const cancelPress=()=>{clearTimeout(pressTimer);pressTimer=0;};
    strip.addEventListener('pointerdown',()=>{cancelPress();pressTimer=setTimeout(()=>{pressTimer=0;perfProbeEnable(!perfProbe.on);try{localStorage.setItem('yhwh_perf',perfProbe.on?'1':'0');}catch(_){}},700);},{passive:true});
    ['pointerup','pointercancel','pointerleave'].forEach(type=>strip.addEventListener(type,cancelPress,{passive:true}));}}
  {const tempoBox=document.querySelector('.stage-metronome-controls'),playGroup=document.querySelector('.player-playback-group');if(tempoBox&&playGroup&&tempoBox.parentElement!==playGroup)playGroup.appendChild(tempoBox);}
  initFallingStyleSetting();
  bindCanvasGestures();
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.stage-popover,.player-sheet,.toolbar-icon,.top-tempo,.stage-tool-rail'))closePlayerPopovers();});
  $('instrumentSelect').value = state.instrument;
  buildInstrumentButtons();
  $('trumpetIntensity').value = state.trumpetIntensity;
  $('trumpetIntensitySetting').classList.toggle('hidden', state.instrument !== 'trumpet-real');
  $('trumpetIntensity').onchange = event => { state.trumpetIntensity = event.target.value === 'soft' ? 'soft' : 'strong'; try { localStorage.setItem('yhwh_piano_trumpet_intensity', state.trumpetIntensity); } catch (_) {} };
  $('instrumentSelect').onchange = event => {
    state.instrument = ['steinway-grand','trumpet-real'].includes(event.target.value) ? event.target.value : 'grand-piano';
    $('trumpetIntensitySetting').classList.toggle('hidden', state.instrument !== 'trumpet-real');
    try { localStorage.setItem('yhwh_piano_instrument', state.instrument); } catch (_) {}
    primeAudioForInstrument(state.instrument);
    $('status').textContent = `Instrumento seleccionado: ${{'steinway-grand':'Steinway de cola','trumpet-real':'Trompeta real','grand-piano':'Grand Piano'}[state.instrument]}.`;
  };
  const sustainButton = $('sustainBtn');
  if (sustainButton) {
    sustainButton.classList.toggle('active', state.sustain);
    sustainButton.setAttribute('aria-pressed', String(state.sustain));
    sustainButton.onclick = () => {
      state.sustain = !state.sustain;
      try { localStorage.setItem('yhwh_piano_sustain', state.sustain ? '1' : '0'); } catch (_) {}
      sustainButton.classList.toggle('active', state.sustain);
      sustainButton.setAttribute('aria-pressed', String(state.sustain));
      $('status').textContent = state.sustain ? 'Sustain activado: las notas duran más y se desvanecen suavemente.' : 'Sustain desactivado: desvanecimiento suave al soltar cada nota.';
    };
  }
  $('recordedNotes').onclick = event => { const gap=event.target.closest('[data-chord-target]');if(gap){chooseChordTarget(Number(gap.dataset.chordTarget));return;}const chip=event.target.closest('[data-note-index]'); if(chip) chooseChordTarget(Number(chip.dataset.noteIndex)); };
  $('recordedNotes').onkeydown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const chip=event.target.closest('[data-note-index],[data-chord-target]');
    if (!chip) return;
    event.preventDefault(); chooseChordTarget(Number(chip.dataset.chordTarget??chip.dataset.noteIndex));
  };
  $('applyChordBtn').onclick = saveSelectedChord;
  $('chordPreset').onchange=event=>applyChordPreset(event.target.value);
  $('chordArpeggio').onchange = syncChordEditorMode;
  $('bassInstrument').value = state.bassInstrument;
  if($('bassInstrumentQuick')){$('bassInstrumentQuick').value=state.bassInstrument;$('bassInstrumentQuick').onchange=event=>{$('bassInstrument').value=event.target.value;$('bassInstrument').dispatchEvent(new Event('change'));};}
  $('bassInstrument').onchange = event => {
    state.bassInstrument = ['grand-piano','steinway-grand','trumpet-real'].includes(event.target.value) ? event.target.value : 'grand-piano';
    if($('bassInstrumentQuick'))$('bassInstrumentQuick').value=state.bassInstrument;
    try { localStorage.setItem('yhwh_piano_bass_instrument', state.bassInstrument); } catch (_) {}
  };
  $('removeChordBtn').onclick = removeSelectedChord;
  $('previewChordBtn').onclick = () => {
    if(state.chordTarget === null){ toast('Primero elige una nota de la lista.'); return; }
    playChord({ noteIndex:state.chordTarget, root:$('chordRoot').value, quality:$('chordQuality').value, inversion:Number($('chordInversion').value), octave:Number($('chordOctave').value), duration:Number($('chordDuration').value), arpeggio:$('chordArpeggio').checked, instrument:$('bassInstrument').value, preview:true });
  };
  $('showNotesBtn').onclick = jumpToMelodyNotes;
  $('activeKeyName').onclick=()=>togglePlayerPopover('keyTransposePopover');
  $('transposeTargetKey').onchange=event=>transposeMelodyToKey(event.target.value);
  $('transposeToOriginal').onclick=()=>{if(state.transpose)transposeMelody(-state.transpose);closePlayerPopovers();};
  $('trackRoot').onchange = changeTrackTonic; $('trackMode').onchange = changeTrackTonic;
  $('recordBtn').onclick = toggleRecord;
  $('saveBtn').onclick = saveMelody;
  $('undoBtn').onclick = () => {
    if (!state.admin) { toast('Solo Admin puede quitar notas.'); return; }
    if (!state.notes.length) { toast('No hay notas para quitar.'); return; }
    state.notes.pop(); state.chords=state.chords.filter(chord=>Number(chord.noteIndex)<state.notes.length); if(state.chordTarget!==null&&state.chordTarget>=state.notes.length)state.chordTarget=null; state.melodyDirty=true; renderRecorded(); updateTrackTimeline(); $('status').textContent = 'Se quitó la última nota. Pulsa “Guardar melodía” para sincronizar.';
  };
  $('deleteBtn').onclick = deleteMelody;
  window.addEventListener('online', () => { $('connection').textContent = '🌐 Con conexión'; $('connection').className = 'connection online'; downloadOfflineAudio(); });
  window.addEventListener('offline', () => { $('connection').textContent = '📴 Sin conexión'; $('connection').className = 'connection offline'; });
  window.addEventListener('keydown', event => {
    if (event.target.matches('input')) return;
    const map = { a:60, w:61, s:62, e:63, d:64, f:65, t:66, g:67, y:68, h:69, u:70, j:71, k:72, o:73, l:74, p:75, ';':76 };
    const midi = map[event.key.toLowerCase()];
    if (midi) playNote(midi, document.querySelector(`.key[data-midi="${midi}"]`));
  });
}
async function downloadOfflineAudio() {
  const status=$('offlineStatus');
  if (!navigator.onLine) { status.textContent='Los sonidos se descargarán automáticamente cuando vuelva la conexión.'; return; }
  if (offlineAudioDownloadRunning) return;
  if (!('serviceWorker' in navigator)) { status.textContent='Este navegador no permite guardar sonidos para usarlos sin conexión.'; return; }
  offlineAudioDownloadRunning=true; status.textContent='Preparando descarga automática de sonidos…';
  try {
    const registration=await navigator.serviceWorker.ready;
    await registration.update();
    if(registration.installing){
      const installing=registration.installing;
      await new Promise(resolve=>{
        const check=()=>{if(installing.state==='activated'||installing.state==='redundant'){installing.removeEventListener('statechange',check);resolve();}};
        installing.addEventListener('statechange',check);check();
      });
    }
    const worker=registration.active||navigator.serviceWorker.controller;
    if (!worker) throw new Error('El trabajador sin conexión no está disponible.');
    worker.postMessage({type:'CACHE_ALL_AUDIO'});
  } catch(error) {
    offlineAudioDownloadRunning=false;
    status.textContent='La descarga automática se reintentará cuando haya conexión.';
    console.error('Error iniciando la descarga sin conexión:',error);
  }
}
function moveKeyboardOctave(direction) {
  state.keyboardOctaveMidi = Math.max(24, Math.min(96, state.keyboardOctaveMidi + direction * 12));
  const scroll = $('keyboardScroll');
  const targetKey = document.querySelector(`.key.white[data-midi="${state.keyboardOctaveMidi}"]`);
  $('keyboardOctaveLabel').textContent = canonicalNoteName(state.keyboardOctaveMidi);
  if (!scroll || !targetKey) return;
  const keyLeft = targetKey.getBoundingClientRect().left - scroll.getBoundingClientRect().left + scroll.scrollLeft;
  const left = keyLeft - (scroll.clientWidth - targetKey.offsetWidth) / 2;
  scroll.scrollTo({ left: Math.max(0, Math.min(scroll.scrollWidth-scroll.clientWidth, left)), behavior:'smooth' });syncStageScroll();
}
function setKeyboardPreset(keyCount){
  const scroll=$('keyboardScroll'),first=$('keyboard').querySelector('.keys');if(!scroll||!first)return;
  if(keyCount===88){setKeyboardZoom(scroll.clientWidth/(first.getBoundingClientRect().width/state.keyboardZoom*52));}
  else {const whites=Math.ceil(keyCount*7/12),baseWidth=first.getBoundingClientRect().width/state.keyboardZoom;setKeyboardZoom(scroll.clientWidth/(baseWidth*whites));}
}
function keyboardBaseKeyWidth() {
  if(keyBaseWidthCache>0)return keyBaseWidthCache;
  const first=$('keyboard').querySelector('.keys');
  const width=first&&state.keyboardZoom?first.getBoundingClientRect().width/state.keyboardZoom:0;
  if(width>0)keyBaseWidthCache=width;
  return width;
}
function setKeyboardZoom(nextZoom,{preserveCenter=true,persist=true,fast=false}={}) {
  const scroll=$('keyboardScroll'),previousZoom=state.keyboardZoom,base=keyboardBaseKeyWidth();
  const minZoom=base>0&&scroll&&scroll.clientWidth>0?Math.min(1,Math.max(.17,scroll.clientWidth/(base*52))):.17;
  const oldCenter=!fast&&scroll?scroll.scrollLeft+scroll.clientWidth/2:0;
  state.keyboardZoom = Math.min(1.8, Math.max(minZoom, Math.round(nextZoom * 1000) / 1000));
  $('keyboard').style.setProperty('--keyboard-zoom', state.keyboardZoom);
  if(fast)return; // durante el pinch solo se aplica el zoom; la interfaz se actualiza al soltar
  const slider=$('keyboardZoomSlider');if(slider){slider.min=String(Math.floor(minZoom*100));slider.value=String(Math.round(state.keyboardZoom*100));}
  if($('keyboardZoomValue'))$('keyboardZoomValue').textContent=`${Math.round(state.keyboardZoom*100)}%`;
  const visibleCount=scroll&&base?scroll.clientWidth/(base*state.keyboardZoom)*12/7:0;
  document.querySelectorAll('[data-key-range]').forEach(button=>{const value=Number(button.dataset.keyRange);button.classList.toggle('active',value>0&&Math.abs(visibleCount-value)<Math.max(2,value*.09));});
  if(persist){try { localStorage.setItem('yhwh_piano_keyboard_zoom', String(state.keyboardZoom)); } catch (_) {}}
  if(scroll){requestAnimationFrame(()=>{if(preserveCenter)scroll.scrollLeft=Math.max(0,oldCenter*(state.keyboardZoom/previousZoom)-scroll.clientWidth/2);syncStageScroll();});}
}
function initializeFirebase() {
  import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js').then(async appModule => {
    const [database, firebaseAuth] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
    ]);
    const config = {
      apiKey: 'AIzaSyB6JmsE_hV2WUGysjIavaVA-h6gmR3F8q4',
      authDomain: 'ministerio-yhwh.firebaseapp.com',
      databaseURL: 'https://ministerio-yhwh-default-rtdb.firebaseio.com',
      projectId: 'ministerio-yhwh', storageBucket: 'ministerio-yhwh.firebasestorage.app',
      messagingSenderId: '791956376967', appId: '1:791956376967:web:b2b0a30fb5e302213f9722'
    };
    const app = appModule.initializeApp(config, 'piano-app');
    state.db = database.getDatabase(app); state.ref = database.ref; state.set = database.set; state.onValue = database.onValue;
    state.auth = firebaseAuth.getAuth(app); state.signIn = firebaseAuth.signInWithEmailAndPassword; state.signOut = firebaseAuth.signOut;
    state.authListener = firebaseAuth.onAuthStateChanged;
    state.authListener(state.auth, user => {
      state.admin = !!(user && user.email === 'rosalesjrnain07@gmail.com');
      updateAdminControls(); renderLists();
    });
    state.onValue(state.ref(state.db, 'melodias'), snapshot => {
      state.melodies = snapshot.val() || {};
      try { localStorage.setItem('yhwh_melodias_cache', JSON.stringify(state.melodies)); } catch (_) {}
      $('connection').textContent = '🌐 Sincronizado con la web'; $('connection').className = 'connection online';
      renderLists();
      if (state.song && !state.melodyDirty) {
        const syncedMelody=trackFor(state.song.category,state.song.song.id,state.melodyType)||{};
        state.notes = (syncedMelody.notas||[]).map(note => ({ ...note }));
        state.chords = (syncedMelody.acordes||[]).map(chord => ({ ...chord }));
        state.originalTonic = parseTonic(syncedMelody.tono) || state.songTonic || 'C'; state.transpose = 0;
        updateTrackTimeline();
        renderChordPresets(); updateTransposeUI(); renderRecorded(); $('playerLabel').textContent = `${state.melodyType==='voz'?'Voz principal':'Introducción'}${syncedMelody.notas?.length?' · Guardada':''}`; updateAdminControls();
      }
    }, () => {
      $('connection').textContent = '📴 Sin conexión con Firebase'; $('connection').className = 'connection offline';
    });
  }).catch(error => {
    $('connection').textContent = '📴 Sin conexión con Firebase; puedes navegar las canciones.';
    $('connection').className = 'connection offline';
    console.warn('Firebase no disponible:', error);
  });
}

renderKeyboard();
bindInterface();
updateAdminControls();
renderRecentSongs();
renderLists();
initializeSplash();
window.addEventListener('load',()=>{if(navigator.onLine)downloadOfflineAudio();},{once:true});
window.addEventListener('beforeunload',event=>{if(state.melodyDirty){event.preventDefault();event.returnValue='';}});
initializeFirebase();
