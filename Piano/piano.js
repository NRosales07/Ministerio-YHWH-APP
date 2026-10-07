// Piano YHWH: lista de canciones primero; Firebase es opcional al arrancar.
const $ = (id) => document.getElementById(id);
const SONGS_ADORACION = Array.isArray(window.SONGS) ? window.SONGS : [];
const SONGS_JUBILO = Array.isArray(window.SONGS_JUBILO) ? window.SONGS_JUBILO : [];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_LATINO = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTE_ROOT_LATINO = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
const state = {
  view: 'home', category: 'adoracion', song: null, melodyType:'introduccion', voiceMix:{principal:true,segunda:false,tercera:false,acordes:true}, voiceDirection:{segunda:localStorage.getItem('yhwh_voice_second_direction')==='up'?'up':'down',tercera:localStorage.getItem('yhwh_voice_third_direction')==='up'?'up':'down'}, pendingSong:null, pendingPurpose:'listen', admin: false, selectedSongChord:null, theoryChord: { root:'C', quality:'major' }, theoryCircleChord: null, theoryCircleIndex:0, theoryCircleMinor:false, theoryCircleChords:null, theoryScale:'major', theoryInterval:7, theoryPianoIntervals:null, theoryPianoMode:'chord',
  melodies: readMelodyCache(), melodyDirty:false, recording: false, recordStart: 0, notes: [], chords: [], chordTarget: null,
  buffers: new Map(), instrumentBuffers: new Map(), sampleLoads:new Map(), instrumentSampleLoads:new Map(), instrument: ['steinway-grand','trumpet-real'].includes(localStorage.getItem('yhwh_piano_instrument')) ? localStorage.getItem('yhwh_piano_instrument') : 'grand-piano', bassInstrument: ['grand-piano','steinway-grand','trumpet-real'].includes(localStorage.getItem('yhwh_piano_bass_instrument')) ? localStorage.getItem('yhwh_piano_bass_instrument') : 'grand-piano', trumpetIntensity: localStorage.getItem('yhwh_piano_trumpet_intensity') === 'soft' ? 'soft' : 'strong', sustain: localStorage.getItem('yhwh_piano_sustain') === '1', tempo:Math.min(1.5,Math.max(.5,Number(localStorage.getItem('yhwh_piano_tempo'))||1)), playing: false, playTimers: [], activePlaybackSources:[], activePointers: new Map(), keyboardOctaveMidi:60, keyboardZoom:Math.min(1.8,Math.max(0.17,Number(localStorage.getItem('yhwh_piano_keyboard_zoom'))||1)), transpose: 0, originalTonic: 'C', songTonic: null,
  notation: ['ninguno','octavas','americano','latino','movil','grados','simple'].includes(localStorage.getItem('yhwh_piano_note_labels')) ? localStorage.getItem('yhwh_piano_note_labels') : (localStorage.getItem('yhwh_cifrado_latino') === '1' ? 'latino' : 'americano'), showChordNames:localStorage.getItem('yhwh_piano_show_chords')!=='0', showRecordedNotes:localStorage.getItem('yhwh_piano_show_recorded')!=='0', keyColor:/^#[0-9a-f]{6}$/i.test(localStorage.getItem('yhwh_piano_key_color')||'')?localStorage.getItem('yhwh_piano_key_color'):'#90dd4a', lastMidi: null, db: null, auth: null,
  ref: null, set: null, onValue: null, signIn: null, signOut: null, authListener: null
};
let screenTransitionTimer = null;
let songIntroTimer = null;
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
function playbackNow(){
  const context=audioContext;if(!context)return 0;
  const perf=performance.now()/1000,audio=context.currentTime,sample=audio-perf;
  // El desfase audio↔pantalla solo sube cuando el audio avanza (nunca va por delante del tiempo real) y baja muy despacio.
  if(playbackClockOffset===null||sample>playbackClockOffset)playbackClockOffset=sample;
  else playbackClockOffset+=(sample-playbackClockOffset)*.01;
  const value=Math.max(playbackClockLast,audio,Math.min(perf+playbackClockOffset,audio+.4));
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
  return `<button class="song-card" data-song-id="${escapeHTML(song.id)}" data-category="${category}"${action?` title="${action}"`:''}>
    <span class="song-key"${key?` title="Tono ${escapeHTML(key)}"`:''}>${key?escapeHTML(key):'♪'}</span>
    <span class="song-info"><b>${escapeHTML(song.title || 'Alabanza')}</b><small>${song.compositor?escapeHTML(song.compositor):''}</small></span>
    ${chips.length?`<span class="song-chips">${chips.join('')}</span>`:''}</button>`;
}
function renderLists() {
  const category = state.view === 'jubilo' ? 'jubilo' : 'adoracion';
  $('sectionTitle').textContent = category === 'jubilo' ? 'Júbilo' : 'Adoración';
  $('helper').textContent = 'Solo aparecen alabanzas que ya tienen una melodía guardada.';
  $('songView').dataset.category = category;
  if($('songBadge'))$('songBadge').textContent = category === 'jubilo' ? '♪' : '♫';
  const visible = songsFor(category).filter(song => hasMelody(category, song.id) && matches(song, $('search').value));
  if($('songCount'))$('songCount').textContent = `${visible.length} ${visible.length === 1 ? 'alabanza' : 'alabanzas'}`;
  $('songList').innerHTML = visible.length
    ? visible.map(song => createCard(song, category, true)).join('')
    : `<div class="empty">${songsFor(category).length ? 'No hay melodías disponibles aquí todavía. Las melodías guardadas aparecerán aquí.' : 'No se cargó la lista de alabanzas. Abre Piano desde el servidor local de YHWH.'}</div>`;

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
  const createGroup = (cat, label) => {
    const items = createResults.filter(item => item.category === cat);
    if (!items.length) return '';
    const total = allSongs.filter(item => item.category === cat).length;
    return `<h2 class="song-group-title" data-category="${cat}"><span>${label}</span><small>${total}</small></h2>` + items.map(({ song }) => createCard(song, cat, false)).join('');
  };
  $('createList').innerHTML = allSongs.length
    ? createGroup('adoracion', 'Adoración') + createGroup('jubilo', 'Júbilo') + (allSongs.length > createResults.length ? '<div class="empty">Se muestran hasta 40 de cada sección. Escribe el nombre en Buscar para encontrar otra alabanza.</div>' : '')
    : '<div class="empty">No se cargaron las canciones. Comprueba que los archivos canciones-adoracion.js y canciones-jubilo.js estén disponibles.</div>';

  document.querySelectorAll('[data-song-id]').forEach(card => {
    card.onclick = () => {
      const category = card.dataset.category;
      const song = songsFor(category).find(item => String(item.id) === card.dataset.songId);
      if (song) openTrackChooser(song,category,state.view==='crear'?'create':'listen');
    };
  });
}
function transitionScreen(target, candidates) {
  const next=$(target);if(!next)return;
  const current=candidates.map(id=>$(id)).find(element=>element&&!element.classList.contains('hidden'));
  if(current===next)return;
  if(screenTransitionTimer)clearTimeout(screenTransitionTimer);
  const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:145;
  if(current)current.classList.add('screen-fade-out');
  screenTransitionTimer=setTimeout(()=>{
    candidates.forEach(id=>{const element=$(id);if(element&&element!==next){element.classList.add('hidden');element.classList.remove('screen-fade-out','screen-fade-in');}});
    next.classList.remove('hidden','screen-fade-out','screen-fade-in');
    document.body.classList.toggle('player-active',target==='player');
    void next.offsetWidth;next.classList.add('screen-fade-in');
    setTimeout(()=>next.classList.remove('screen-fade-in'),280);
    screenTransitionTimer=null;
  },current?delay:0);
}
function confirmDiscardUnsavedMelody(){
  if(!state.melodyDirty)return true;
  if(!window.confirm('Hay cambios de la melodía que todavía no se han guardado en Firebase. ¿Quieres descartarlos?'))return false;
  state.melodyDirty=false;return true;
}
function setView(view) {
  if(!$('player').classList.contains('hidden')&&!confirmDiscardUnsavedMelody())return;
  stopMetronome();
  state.view = view;
  document.body.classList.toggle('home-active',view==='home');
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
  stopPlayback();stopTheorySequence();stopMetronome();closePlayerPopovers();
  clearSongIntro();
  state.song=null;state.view='libre';state.category='adoracion';state.melodyType='introduccion';state.notes=[];state.chords=[];state.chordTarget=null;state.transpose=0;state.melodyDirty=false;state.recording=false;state.lastMidi=null;chordEditorOpen=false;
  document.body.classList.remove('home-active');
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
    notes.forEach((midi,index)=>{const timer=setTimeout(()=>{const wasRecording=state.recording;state.recording=false;playNote(midi,null,.3);state.recording=wasRecording;},index*260);theorySequenceTimers.push(timer);});
  }catch(error){$('theoryScaleFormula').textContent='No se pudieron cargar las muestras de sonido.';console.error(error);}
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
function changeTheoryTab(tab){document.querySelectorAll('.theory-tab').forEach(button=>button.classList.toggle('active',button.dataset.theoryTab===tab));const panels=['theoryPanelChords','theoryPanelKeys','theoryPanelScales','theoryPanelIntervals','theoryPanelCircle','theoryPanelPiano'];const target=`theoryPanel${tab[0].toUpperCase()}${tab.slice(1)}`;transitionScreen(target,panels);if(tab==='chords')state.theoryPianoMode='chord';if(tab==='scales')state.theoryPianoMode='scale';if(tab==='intervals')state.theoryPianoMode='interval';if(tab==='piano'||tab==='chords'||tab==='scales'||tab==='intervals'){if(state.theoryPianoMode==='chord')renderTheorySelection();else if(state.theoryPianoMode==='scale')renderTheoryScale();else renderTheoryIntervals();}}
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
  const {song,category}=state.pendingSong;state.pendingSong=null;$('trackModal').classList.add('hidden');openSong(song,category,type);
}
function closeTrackChooser(){state.pendingSong=null;$('trackModal').classList.add('hidden');}
function openSong(song, category, trackType='introduccion') {
  if(state.melodyDirty&&!confirmDiscardUnsavedMelody())return;
  clearSongIntro();
  state.song = { song, category };
  primeAudioForInstrument(state.instrument);
  state.melodyType=trackType;
  state.melodyDirty=false;
  state.selectedSongChord=null;document.querySelectorAll('#keyboard .key.chord-selected').forEach(key=>key.classList.remove('chord-selected'));
  state.category = category;
  state.transpose = 0;
  const savedMelody = trackFor(category, song.id,trackType) || {};
  state.songTonic = parseTonic(song.tono);
  state.originalTonic = parseTonic(savedMelody.tono) || state.songTonic || 'C';
  state.notes = (savedMelody.notas || []).map(note => ({ ...note }));
  state.chords = (savedMelody.acordes || []).map(chord => ({ ...chord }));
  state.voiceMix={principal:true,segunda:false,tercera:false,acordes:true};
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
  $('voiceMixer').classList.toggle('hidden',trackType!=='voz'||!state.showRecordedNotes);$('notesPanel').dataset.open='';$('notesPanel').classList.add('hidden');$('lyricsPanel').classList.add('hidden');$('chordEditorPanel').classList.add('hidden');$('activeChordLabel').textContent='';renderVoiceMixer();
  renderChordPresets();
  renderRecorded();
  updateAdminControls();
  transitionScreen('player',['homeView','songView','createView','theoryView','player']);
  setTimeout(showSongIntro,180);
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
  const cache=timelineCache,elapsedText=formatPlaybackTime(current),durationText=formatPlaybackTime(duration);
  if(elapsedText!==cache.elapsed){cache.elapsed=elapsedText;$('playbackElapsed').textContent=elapsedText;}
  if(durationText!==cache.duration){cache.duration=durationText;$('playbackDuration').textContent=durationText;}
  const ratio=duration?current/duration:0;
  if(ratio!==cache.ratio&&(ratio===0||ratio===1||Math.abs(ratio-cache.ratio)>=.002)){cache.ratio=ratio;$('playbackProgressFill').style.transform=`scaleX(${ratio})`;}
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
  const tick=()=>{
    if(!state.playing||!timelineStartedAt)return;
    const elapsed=Math.max(0,(playbackNow()||timelineStartedAt)-timelineStartedAt);
    updatePlaybackTimeline(elapsed,duration);
    if(elapsed<duration)timelineFrame=requestAnimationFrame(tick);else timelineFrame=0;
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
  let counts=keyLightCounts.get(key);if(!counts){counts={};keyLightCounts.set(key,counts);}
  classes.forEach(cls=>{counts[cls]=(counts[cls]||0)+1;key.classList.add(cls);});
  state.playTimers.push(setTimeout(()=>{classes.forEach(cls=>{counts[cls]=Math.max(0,(counts[cls]||0)-1);if(!counts[cls])key.classList.remove(cls);});},Math.max(0,ms)));
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
function drawFallingNotesFrame(timestamp){
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
  const elapsed=Math.max(0,playbackNow()-run.startAt),scrollLeft=scroll.scrollLeft,zoomScale=state.keyboardZoom/geometry.zoom,hits=fnHits;hits.length=0;
  ctx.clearRect(0,0,width,height);
  const oldestStart=elapsed-run.maxVisibleDuration;let low=0,high=run.events.length;
  while(low<high){const mid=(low+high)>>1;if(run.events[mid].start<oldestStart)low=mid+1;else high=mid;}
  for(let index=low;index<run.events.length;index++){
    const event=run.events[index];if(event.start>elapsed+look)break;
    if(elapsed>event.start+event.visualDuration)continue;
    if(style==='melody'&&event.kind==='chord')continue;
    const key=geometry.positions.get(event.midi);if(!key)continue;
    const keyWidth=key.width*zoomScale,center=geometry.left+key.center*zoomScale-scrollLeft;
    const barWidth=Math.max(3,Math.min(keyWidth-2,keyWidth*.72)),barHeight=Math.max(7,event.visualDuration*pps);
    if(style==='drops'){
      if(elapsed>event.start+.05)continue;
      const dw=Math.max(5,Math.min(barWidth,16)),dh=dw*1.4,dBottom=Math.min(baseline,baseline-(event.start-elapsed)*pps),isChord=event.kind==='chord';
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
    if(live&&elapsed-event.start<.5)hits.push({index,center,barWidth,color:chord?geometry.chordColor:geometry.melodyColor,t:(elapsed-event.start)/.5});
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
function startFallingNotes(playbackNotes,playbackChords,startAt,prebuiltEvents){
  stopFallingNotes();
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
function showSongIntro(){
  const canvas=$('noteCanvas');if(!canvas||!state.song)return;
  clearTimeout(songIntroTimer);
  canvas.classList.remove('song-intro-active');
  void canvas.offsetWidth;
  canvas.classList.add('song-intro-active');
  songIntroTimer=setTimeout(()=>canvas.classList.remove('song-intro-active'),2900);
}
function clearSongIntro(){
  if(songIntroTimer){clearTimeout(songIntroTimer);songIntroTimer=null;}
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
  $('voiceMixer').classList.toggle('hidden',!state.song||state.melodyType!=='voz'||!state.showRecordedNotes);
  updateVisualOptions();
  $('adminBtn').textContent = state.admin ? '🔓 Admin activo' : '🔑 Admin';
  $('adminBtn').classList.toggle('active', state.admin);
  syncTrackKeyUI();
}
function updateVisualOptions(){
  $('activeChordLabel').classList.toggle('hidden',!state.showChordNames||!$('activeChordLabel').textContent);
  $('notesPanel').classList.toggle('hidden',!state.showRecordedNotes||!$('notesPanel').dataset.open);
  $('keyColorSwatch').style.background=state.keyColor;
  document.documentElement.style.setProperty('--pressed-key-color',state.keyColor);
  document.documentElement.style.setProperty('--melody-note-color',state.keyColor);
  const color=state.keyColor.match(/^#([0-9a-f]{6})$/i);
  const channels=color?color[1].match(/.{2}/g).map(value=>parseInt(value,16)/255):[0.565,0.867,0.29];
  const luminance=channels.map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[0.2126,0.7152,0.0722][index],0);
  document.documentElement.style.setProperty('--melody-note-ink',luminance>0.42?'#17323b':'#ffffff');
  $('showChordNames').checked=state.showChordNames;$('showRecordedNotes').checked=state.showRecordedNotes;
  $('notationToggle').textContent={ninguno:'∅',octavas:'8va',americano:'C',latino:'La',movil:'Do',grados:'1',simple:'C'}[state.notation]||'C';
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
    const next=sorted.slice(index+1).find(item=>(Number(item.start)||0)>start+.001);
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
  if(state.melodyType!=='voz')return cutAtNextNote(state.notes);
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
  if(!select||!menu||$('instrumentOptions'))return;
  const title=document.createElement('h2');title.textContent='Instrumento';
  const grid=document.createElement('div');grid.id='instrumentOptions';grid.className='instrument-options';grid.setAttribute('role','radiogroup');grid.setAttribute('aria-label','Instrumento');
  [...select.options].forEach(option=>{
    const button=document.createElement('button');button.type='button';button.className='instrument-option';button.dataset.instrument=option.value;button.setAttribute('role','radio');
    const icon=document.createElement('span');icon.className='instrument-icon';icon.innerHTML=INSTRUMENT_ICONS[option.value]||'';
    const name=document.createElement('span');name.className='instrument-name';name.textContent=option.textContent;
    button.append(icon,name);
    button.onclick=()=>{select.value=option.value;select.dispatchEvent(new Event('change'));syncInstrumentButtons();};
    grid.appendChild(button);
  });
  menu.prepend(title,grid);syncInstrumentButtons();
}
function syncInstrumentButtons(){
  document.querySelectorAll('#instrumentOptions [data-instrument]').forEach(button=>{const on=button.dataset.instrument===state.instrument;button.classList.toggle('active',on);button.setAttribute('aria-checked',String(on));});
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
const FALLING_STYLE_OPTIONS=[['bars','Barras completas','Melodía y bajos, con brillo'],['melody','Solo melodía','Barras sin los bajos'],['drops','Gotas','Puntos ligeros que caen'],['off','Sin barras','Solo se iluminan las teclas']];
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
      if (key) state.playTimers.push(setTimeout(()=>lightKey(key,isBassChord?['playing','bass-playing']:['playing'],lightMs),Math.max(0,(noteWhen-context.currentTime)*1000)));
    }
  } catch (error) {
    $('status').textContent = 'No se pudo cargar el sonido del acorde.';
    console.error(error);
  }
}
async function playNote(midi, element, duration = 0.4) {
  if (midi < 21 || midi > 108) return;
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
    source.stop(stopAt + release + 0.02);
    let released = false;
    const stopNote = () => {
      if (released) return;
      released = true;
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
function setStagePlaying(on){document.body.classList.toggle('melody-playing',!!on);}
function stopPlayback({suspendAudio=false}={}) {
  state.playing = false;setStagePlaying(false);
  stopFallingNotes();
  state.playTimers.forEach(clearTimeout);
  state.playTimers = [];
  resetPlaybackTimeline();
  document.querySelectorAll('.piano-panel .key.playing,.piano-panel .key.bass-playing').forEach(key=>key.classList.remove('playing','bass-playing'));
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
  state.playTimers.push(setTimeout(()=>{
    $('currentNote').textContent=noteName(midi);
    $('currentNote').style.opacity='1';
    if(element)lightKey(element,['playing'],(stopAt+release-when)*1000);
  },Math.max(0,(when-context.currentTime)*1000)));
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
  const playbackChords = (state.melodyType !== 'voz' || state.voiceMix.acordes) ? state.chords : [];
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
      const next = all[index + 1];
      return { midi: Number(note.midi), note: canonicalNoteName(Number(note.midi)), start: Number(Number(note.start || 0).toFixed(3)), duration: Number((next ? Math.max(0.12, next.start - note.start) : Math.max(0.35, note.duration || 0.35)).toFixed(3)) };
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
  $('freePlayBtn').onclick = openFreePlay;
  document.querySelectorAll('[data-go-home]').forEach(button => button.onclick = () => setView('home'));
  document.querySelectorAll('[data-track-select]').forEach(button=>button.onclick=()=>chooseTrack(button.dataset.trackSelect));
  $('closeTrackModal').onclick=closeTrackChooser;
  $('trackModal').onclick=event=>{if(event.target===$('trackModal'))closeTrackChooser();};
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
  $('createSearch').oninput = renderLists;
  $('adminBtn').onclick = showLogin;
  $('loginSubmit').onclick = login;
  $('password').onkeydown = event => { if (event.key === 'Enter') login(); };
  $('closeLogin').onclick = () => $('loginModal').classList.add('hidden');
  $('loginModal').onclick = event => { if (event.target === $('loginModal')) $('loginModal').classList.add('hidden'); };
  $('backBtn').onclick = () => {
    if(!confirmDiscardUnsavedMelody())return;
  stopPlayback();stopTheorySequence();stopMetronome();closePlayerPopovers();state.recording=false;
    const returnTo=state.view==='libre'?'homeView':state.view==='crear'?'createView':state.view==='teoria'?'theoryView':'songView';
    document.body.classList.toggle('home-active',returnTo==='homeView');
    transitionScreen(returnTo,['homeView','songView','createView','theoryView','player']);
    renderLists();
  };
  $('playMelody').onclick = playMelody;
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
    stopPlayback(); $('status').textContent = wasPlaying ? 'Reproducción detenida.' : 'No había una melodía reproduciéndose.';
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
  $('showChordNames').onchange=event=>{state.showChordNames=event.target.checked;try{localStorage.setItem('yhwh_piano_show_chords',state.showChordNames?'1':'0');}catch(_){}if(!state.showChordNames)$('activeChordLabel').classList.add('hidden');else updateActiveChordLabel();updateVisualOptions();};
  $('showRecordedNotes').onchange=event=>{state.showRecordedNotes=event.target.checked;try{localStorage.setItem('yhwh_piano_show_recorded',state.showRecordedNotes?'1':'0');}catch(_){}if(!state.showRecordedNotes)$('notesPanel').dataset.open='';updateAdminControls();};
  $('keyboardZoomSlider').oninput=event=>setKeyboardZoom(Number(event.target.value)/100);
  document.querySelectorAll('[data-key-range]').forEach(button=>button.onclick=()=>{
    if(button.dataset.keyRange==='custom'){$('keyboardZoomSlider').focus();return;}
    setKeyboardPreset(Number(button.dataset.keyRange));
  });
  $('keyboardScroll').addEventListener('scroll',syncStageScroll,{passive:true});
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
  $('bassInstrument').onchange = event => {
    state.bassInstrument = ['grand-piano','steinway-grand','trumpet-real'].includes(event.target.value) ? event.target.value : 'grand-piano';
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
      $('connection').textContent = '🌐 Sincronizado con YHWH'; $('connection').className = 'connection online';
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
renderLists();
initializeSplash();
window.addEventListener('load',()=>{if(navigator.onLine)downloadOfflineAudio();},{once:true});
window.addEventListener('beforeunload',event=>{if(state.melodyDirty){event.preventDefault();event.returnValue='';}});
initializeFirebase();