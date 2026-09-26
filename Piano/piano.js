// Piano YHWH: lista de canciones primero; Firebase es opcional al arrancar.
const $ = (id) => document.getElementById(id);
const SONGS_ADORACION = Array.isArray(window.SONGS) ? window.SONGS : [];
const SONGS_JUBILO = Array.isArray(window.SONGS_JUBILO) ? window.SONGS_JUBILO : [];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_LATINO = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTE_ROOT_LATINO = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
const state = {
  view: 'home', category: 'adoracion', song: null, admin: false, selectedSongChord:null, theoryChord: { root:'C', quality:'major' }, theoryCircleChord: null, theoryCircleIndex:0, theoryCircleMinor:false, theoryCircleChords:null, theoryScale:'major', theoryInterval:7, theoryPianoIntervals:null, theoryPianoMode:'chord',
  melodies: readMelodyCache(), recording: false, recordStart: 0, notes: [], chords: [], chordTarget: null,
  buffers: new Map(), instrumentBuffers: new Map(), instrument: localStorage.getItem('yhwh_piano_instrument') === 'trumpet' ? 'trumpet' : 'grand-piano', sustain: localStorage.getItem('yhwh_piano_sustain') === '1', playing: false, playTimers: [], transpose: 0, originalTonic: 'C',
  notation: localStorage.getItem('yhwh_cifrado_latino') === '1' ? 'latino' : 'americano', lastMidi: null, db: null, auth: null,
  ref: null, set: null, onValue: null, signIn: null, signOut: null, authListener: null
};
let screenTransitionTimer = null;
let theorySequenceTimers = [];

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
function melodyFor(category, id) { return state.melodies[category]?.[String(id)] || null; }
function hasMelody(category, id) { const melody = melodyFor(category, id); return !!(melody?.notas?.length); }
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

function songsFor(category) { return category === 'jubilo' ? SONGS_JUBILO : SONGS_ADORACION; }
function matches(song, query) { const q = query.trim().toLocaleLowerCase('es'); return !q || `${song.title || ''} ${song.compositor || ''}`.toLocaleLowerCase('es').includes(q); }
function createCard(song, category, showMelodyBadge) {
  const badge = showMelodyBadge ? (hasMelody(category, song.id) ? '🎼 Tiene melodía' : '') : (hasMelody(category, song.id) ? '🎼 Ver / editar' : '＋ Crear');
  return `<button class="song-card" data-song-id="${escapeHTML(song.id)}" data-category="${category}">
    <span><b>${escapeHTML(song.title || 'Alabanza')}</b><small>${escapeHTML(song.tono || '')}${song.compositor ? ` · ${escapeHTML(song.compositor)}` : ''}</small></span>
    ${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
}
function renderLists() {
  const category = state.view === 'jubilo' ? 'jubilo' : 'adoracion';
  $('sectionTitle').textContent = category === 'jubilo' ? 'Júbilo' : 'Adoración';
  $('helper').textContent = 'Solo aparecen alabanzas que ya tienen una melodía guardada.';
  const visible = songsFor(category).filter(song => hasMelody(category, song.id) && matches(song, $('search').value));
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
  $('createList').innerHTML = allSongs.length
    ? createResults.map(({ song, category: cat }) => createCard(song, cat, false)).join('') + (allSongs.length > createResults.length ? '<div class="empty">Se muestran hasta 40 de cada sección. Escribe el nombre en Buscar para encontrar otra alabanza.</div>' : '')
    : '<div class="empty">No se cargaron las canciones. Comprueba que los archivos canciones-adoracion.js y canciones-jubilo.js estén disponibles.</div>';

  document.querySelectorAll('[data-song-id]').forEach(card => {
    card.onclick = () => {
      const category = card.dataset.category;
      const song = songsFor(category).find(item => String(item.id) === card.dataset.songId);
      if (song) openSong(song, category);
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
    void next.offsetWidth;next.classList.add('screen-fade-in');
    setTimeout(()=>next.classList.remove('screen-fade-in'),280);
    screenTransitionTimer=null;
  },current?delay:0);
}
function setView(view) {
  state.view = view;
  document.body.classList.toggle('home-active',view==='home');
  stopPlayback();
  stopTheorySequence();
  const target={home:'homeView',adoracion:'songView',jubilo:'songView',crear:'createView',teoria:'theoryView'}[view]||'homeView';
  transitionScreen(target,['homeView','songView','createView','theoryView','player']);
  document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  renderLists();
  if (view === 'teoria') renderTheory();
  window.scrollTo(0, 0);
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
  if(!state.transpose)return line;const expression=/([A-G](?:#|b)?(?:m7b5|mMaj7|maj7|m(?:aj)?7?|dim7?|aug|sus[24]?|add\d*|M|7|6|9|5|4|2)?(?:\/[A-G](?:#|b)?)?)(?=[^a-z]|$)/g;let result='',position=0,match;
  while((match=expression.exec(line))!==null){result+=line.slice(position,match.index);if(result.length>match.index){const spaces=result.match(/ *$/)?.[0].length||0;const remove=Math.min(result.length-match.index,Math.max(0,spaces-1));if(remove)result=result.slice(0,-remove);}else if(result.length<match.index)result+=' '.repeat(match.index-result.length);result+=transposeChordName(match[0],state.transpose,preferFlats);position=match.index+match[0].length;}
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
async function playTheoryScale(){
  const scale=THEORY_SCALES[state.theoryScale]||THEORY_SCALES.major;stopTheorySequence();
  const notes=scale.semitones.map(semi=>60+NOTE_NAMES.indexOf(state.theoryChord.root)+semi);
  try{
    getAudioContext();
    if(state.instrument==='grand-piano')await Promise.all(notes.map(midi=>getSample(midi)));
    else await Promise.all(notes.map(midi=>getInstrumentSample(midi)));
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
function openSong(song, category) {
  state.song = { song, category };
  state.selectedSongChord=null;document.querySelectorAll('#keyboard .key.chord-selected').forEach(key=>key.classList.remove('chord-selected'));
  state.category = category;
  state.transpose = 0;
  state.originalTonic = tonicName(song.tono || 'C');
  const savedMelody = melodyFor(category, song.id) || {};
  state.notes = (savedMelody.notas || []).map(note => ({ ...note }));
  state.chords = (savedMelody.acordes || []).map(chord => ({ ...chord }));
  state.chordTarget = null;
  $('songTitle').textContent = song.title || 'Alabanza';
  $('songMeta').textContent = `${category === 'jubilo' ? 'Júbilo' : 'Adoración'}${song.compositor ? ` · ${song.compositor}` : ''}`;
  updateTransposeUI();
  $('chordList').innerHTML = chordNames(song).map(chord => `<span class="chord">${escapeHTML(chord)}</span>`).join('') || '<span class="hint">No se detectaron acordes</span>';
  $('playerLabel').textContent = hasMelody(category, song.id) ? 'Melodía guardada' : 'Vista previa del piano';
  $('status').textContent = hasMelody(category, song.id) ? 'Melodía guardada. Pulsa reproducir.' : 'Toca el piano para escuchar. Solo Admin puede grabar y guardar.';
  renderRecorded();
  updateAdminControls();
  transitionScreen('player',['homeView','songView','createView','theoryView','player']);
  setTimeout(startKeyboardAtC4,170);
  window.scrollTo(0, 0);
}
function startKeyboardAtC4() {
  requestAnimationFrame(() => {
    const scroll = $('keyboardScroll');
    const c4 = document.querySelector('.key.white[data-midi="60"]');
    if (!scroll || !c4) return;
    const left = c4.getBoundingClientRect().left - scroll.getBoundingClientRect().left + scroll.scrollLeft;
    scroll.scrollTo({ left: Math.max(0, left - 8), behavior: 'instant' });
  });
}function updateAdminControls() {
  document.querySelectorAll('.admin-only').forEach(button => button.classList.toggle('hidden', !state.admin));
  $('adminBtn').textContent = state.admin ? '🔓 Admin activo' : '🔑 Admin';
  $('adminBtn').classList.toggle('active', state.admin);
}
function chordDisplayName(chord) {
  const root = state.notation === 'latino' ? (NOTE_ROOT_LATINO[chord.root?.[0]] || chord.root) + (chord.root?.slice(1) || '') : chord.root;
  if(chord.arpeggio)return `${root} 1–5–8`;
  const quality = { major:'', minor:'m', '7':'7', maj7:'maj7', sus4:'sus4', dim:'dim' }[chord.quality] || '';
  return `${root}${quality}`;
}
function renderRecorded() {
  $('recordedNotes').innerHTML = state.notes.map((note, index) => {
    const chord = state.chords.find(item => Number(item.noteIndex) === index);
    const label = chord ? `<span class="note-chord-label">${escapeHTML(chordDisplayName(chord))}</span>` : '<span class="note-chord-label empty" aria-hidden="true"></span>';
    return `<div class="melody-note-item${state.chordTarget === index ? ' selected' : ''}" data-note-index="${index}">${label}<button class="note-chip" type="button" data-note-index="${index}" ${state.admin ? '' : 'disabled'}>${escapeHTML(noteName(note.midi))}</button></div>`;
  }).join('');
}
function chooseChordTarget(index) {
  if (!state.admin) return;
  state.chordTarget = index;
  const note = state.notes[index];
  const chord = state.chords.find(item => Number(item.noteIndex) === index);
  $('chordTarget').textContent = note ? `Acorde sobre ${noteName(note.midi)} · nota ${index + 1}` : 'Selecciona una nota de la melodía.';
  $('chordRoot').value = chord?.root || NOTE_NAMES[note?.midi % 12] || 'C';
  $('chordQuality').value = chord?.quality || 'major';
  $('chordInversion').value = String(chord?.inversion || 0);
  $('chordOctave').value = String(chord?.octave ?? 60);
  $('chordArpeggio').checked = !!chord?.arpeggio;
  syncChordEditorMode();
  $('chordDuration').value = String(chord?.duration || 2);
  $('removeChordBtn').classList.toggle('hidden', !chord);
  document.querySelectorAll('.melody-note-item').forEach((item, i) => item.classList.toggle('selected', i === index));
}
function saveSelectedChord() {
  if (!state.admin || state.chordTarget === null || !state.notes[state.chordTarget]) { toast('Primero elige una nota de la lista.'); return; }
  const chord = { noteIndex: state.chordTarget, root: $('chordRoot').value, quality: $('chordQuality').value, inversion: Number($('chordInversion').value), octave: Number($('chordOctave').value), duration: Number($('chordDuration').value), arpeggio:$('chordArpeggio').checked };
  const existing = state.chords.findIndex(item => Number(item.noteIndex) === state.chordTarget);
  if (existing >= 0) state.chords[existing] = chord; else state.chords.push(chord);
  renderRecorded(); chooseChordTarget(chord.noteIndex);
  $('status').textContent = `Acorde ${chordDisplayName(chord)} asignado a ${noteName(state.notes[chord.noteIndex].midi)}. Pulsa Guardar para sincronizar.`;
}
function syncChordEditorMode(){
  const arpeggio=$('chordArpeggio')?.checked||false;
  $('chordQuality').disabled=arpeggio;$('chordInversion').disabled=arpeggio;
}
function removeSelectedChord() {
  if (state.chordTarget === null) return;
  state.chords = state.chords.filter(item => Number(item.noteIndex) !== state.chordTarget);
  renderRecorded(); chooseChordTarget(state.chordTarget);
  $('status').textContent = 'Acorde quitado. Pulsa Guardar para sincronizar.';
}
function chordMidiNotes(chord) {
  const shapes = { major:[0,4,7], minor:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10], mMaj7:[0,3,7,11], '6':[0,4,7,9], add9:[0,4,7,14], '5':[0,7], dim7:[0,3,6,9], m7b5:[0,3,6,10], sus2:[0,2,7], sus4:[0,5,7], dim:[0,3,6], aug:[0,4,8] };
  const rootMidi = Number(chord.octave || 60) + NOTE_NAMES.indexOf(chord.root) + (chord.noTranspose ? 0 : state.transpose);
  if(chord.arpeggio)return [rootMidi,rootMidi+7,rootMidi+12];
  const pitches = (Array.isArray(chord.intervals) ? chord.intervals : shapes[chord.quality] || shapes.major).map(interval => rootMidi + interval);
  for (let i=0; i<Number(chord.inversion || 0); i++) pitches.push(pitches.shift() + 12);
  return pitches;
}

const CHROMATIC_SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_TO_SHARP = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };
const SHARP_TO_FLAT = { 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' };
const CHROMATIC_FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
function tonicName(value) {
  const m = String(value || 'C').trim().match(/^([A-G](?:#|b)?)(m?)/i);
  if (!m) return 'C';
  const root = m[1][0].toUpperCase() + m[1].slice(1);
  return (FLAT_TO_SHARP[root] || root) + (m[2] || '');
}
function transposedTonic() {
  const minor = state.originalTonic.endsWith('m');
  const root = state.originalTonic.replace(/m$/, '');
  const index = CHROMATIC_SHARPS.indexOf(root);
  return CHROMATIC_SHARPS[(index + state.transpose + 120) % 12] + (minor ? 'm' : '');
}
function updateTransposeUI() {
  if (!state.song) return;
  const tonic = transposedTonic();
  const displayRoot = SHARP_TO_FLAT[tonic.replace(/m$/, '')] || tonic.replace(/m$/, '');
  const shown = displayRoot + (tonic.endsWith('m') ? 'm' : '');
  $('songKey').textContent = `Tono: ${shown}`;
  $('transposeValue').textContent = state.transpose === 0 ? 'Tono original' : `${shown} · ${state.transpose > 0 ? '+' : ''}${state.transpose} st`;
  const flatSpelling = /b/.test(String(state.song.song.tono || ''));
  $('chordList').innerHTML = chordNames(state.song.song).map(chord => `<span class="chord">${escapeHTML(transposeChordName(chord, state.transpose, flatSpelling))}</span>`).join('') || '<span class="hint">No se detectaron acordes</span>';
  renderSongLyrics();
  $('transposeDown').disabled = state.notes.length > 0 && Math.min(...state.notes.map(note => Number(note.midi))) <= 48;
  $('transposeUp').disabled = state.notes.length > 0 && Math.max(...state.notes.map(note => Number(note.midi))) >= 83;
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
  state.notes.forEach(note => note.note = canonicalNoteName(note.midi));
  updateTransposeUI(); renderRecorded();
  toast(state.transpose ? `Melodía transportada ${state.transpose > 0 ? '+' : ''}${state.transpose} semitonos.` : 'Tono original restaurado.');
}
function jumpToMelodyNotes() {
  const target = $('recordedNotes').children.length ? $('recordedNotes') : $('keyboardScroll');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (!$('recordedNotes').children.length) toast('Esta melodía todavía no tiene notas guardadas.');
}

function renderKeyboard() {
  const low = 36, high = 95;
  const scroll = $('keyboardScroll');
  const oldScrollLeft = scroll?.scrollLeft || 0;
  let html = '';
  for (let midi = low; midi <= high; midi++) {
    if (NOTE_NAMES[midi % 12].includes('#')) continue;
    const hasBlack = midi % 12 !== 4 && midi % 12 !== 11;
    const whiteName = noteName(midi);
    const blackName = noteName(midi + 1);
    const octaveClass = midi % 12 === 0 ? ' octave-marker' : '';
    html += `<div class="keys"><button class="key white" data-midi="${midi}" aria-label="${whiteName}"><span class="note-label${octaveClass}">${whiteName}</span></button>${hasBlack ? `<button class="key black" data-midi="${midi + 1}" aria-label="${blackName}"><span class="note-label">${blackName}</span></button>` : ''}</div>`;
  }
  $('keyboard').innerHTML = html;
  if (scroll) scroll.scrollLeft = oldScrollLeft;
  const keys = $('keyboard');
  const playAtPoint = (x, y) => {
    const element = document.elementFromPoint(x, y)?.closest('.key');
    if (!element || !keys.contains(element) || element === state.touchKey) return;
    state.touchKey = element;
    playNote(Number(element.dataset.midi), element);
  };
  keys.onpointerdown = event => {
    const element = event.target.closest('.key');
    if (!element) return;
    event.preventDefault();
    state.touchKey = null;
  
    playAtPoint(event.clientX, event.clientY);
  };
  keys.onpointermove = event => { if (event.buttons || event.pressure > 0) playAtPoint(event.clientX, event.clientY); };
  const endTouch = () => { state.touchKey = null; };
  keys.onpointerup = endTouch;
  keys.onpointercancel = endTouch;
  $('keyboard').ontransitionend = event => {
    if (event.target.tagName !== 'SPAN') event.target.classList.remove('playing');
  };
}
function initializeSplash() {
  const splash = $('splashScreen');
  const enter = $('btnEntrarSplash');
  if (!splash || !enter) return;
  const startedAt = Date.now();
  let autoCloseTimer = null;
  const hide = () => {
    if (splash.dataset.hidden) return;
    splash.dataset.hidden = '1';
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
    splash.classList.add('splash-hide');
    setTimeout(() => splash.remove(), 650);
  };
  const showEnter = () => {
    if (!document.body.contains(splash) || splash.dataset.ready) return;
    splash.dataset.ready = '1';
    setTimeout(() => {
      if (!document.body.contains(splash)) return;
      $('splashLoader').style.display = 'none';
      enter.classList.add('show');
      autoCloseTimer = setTimeout(hide, 4000);
    }, Math.max(0, 1800 - (Date.now() - startedAt)));
  };
  enter.addEventListener('click', hide);
  if (document.readyState === 'complete') showEnter();
  else window.addEventListener('load', showEnter, { once: true });
  setTimeout(showEnter, 9000);
}
let audioContext = null;
function getAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}
async function getSample(midi) {
  const sampleMidi = Math.max(60, Math.min(76, midi));
  if (!state.buffers.has(sampleMidi)) {
    const response = await fetch(`audio/${String(sampleMidi - 20).padStart(3, '0')}.wav`);
    if (!response.ok) throw new Error(`No se pudo cargar audio/${sampleMidi - 20}.wav`);
    state.buffers.set(sampleMidi, await getAudioContext().decodeAudioData(await response.arrayBuffer()));
  }
  return state.buffers.get(sampleMidi);
}
const INSTRUMENTS = {
  'grand-piano': { folder: 'grand-piano', first: 30, last: 96, step: 3, release: 0.4 },
  trumpet: { folder: 'trumpet', first: 27, last: 99, step: 9, release: 0.1 }
};
async function getInstrumentSample(midi) {
  const spec = INSTRUMENTS[state.instrument];
  const sampleMidi = Math.max(spec.first, Math.min(spec.last, Math.round((midi - spec.first) / spec.step) * spec.step + spec.first));
  const key = state.instrument + ':' + sampleMidi;
  if (!state.instrumentBuffers.has(key)) {
    const filename = state.instrument === 'trumpet' ? `trumpet-${sampleMidi}.mp3` : `pno0${sampleMidi}.mp3`;
    const response = await fetch(`audio/${spec.folder}/${filename}`);
    if (!response.ok) throw new Error(`No se pudo cargar la muestra ${filename}`);
    state.instrumentBuffers.set(key, await getAudioContext().decodeAudioData(await response.arrayBuffer()));
  }
  return { buffer: state.instrumentBuffers.get(key), sampleMidi, release: spec.release };
}
async function playChord(chord) {
  if (!state.playing && !chord.preview) return;
  try {
    const context = getAudioContext();
    const entries = await Promise.all(chordMidiNotes(chord).map(async midi => {
      if (state.instrument === 'grand-piano') {
        const sampleMidi = Math.max(60, Math.min(76, midi));
        return { midi, sampleMidi, buffer: await getSample(midi) };
      }
      const sample = await getInstrumentSample(midi);
      return { midi, sampleMidi: sample.sampleMidi, buffer: sample.buffer };
    }));
    if (!state.playing && !chord.preview) return;
    const when = context.currentTime + 0.015;
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = entry.buffer;
      source.playbackRate.value = 2 ** ((entry.midi - entry.sampleMidi) / 12);
      const duration = Math.max(0.25, Number(chord.duration) || 2);
      const noteWhen=when+(chord.arpeggio?index*0.2:index*0.01);
      const release = state.instrument === 'trumpet' ? 0.22 : (state.sustain ? 0.9 : 0.32);
      const stopAt = noteWhen + duration;
      gain.gain.setValueAtTime(0.78, noteWhen);
      gain.gain.setValueAtTime(0.78, stopAt);
      gain.gain.linearRampToValueAtTime(0.0001, stopAt + release);
      source.connect(gain); gain.connect(context.destination);
      source.start(noteWhen);
      source.stop(stopAt + release + 0.02);
      const key = document.querySelector(`.key[data-midi="${entry.midi}"]`);
      key?.classList.add('playing');
      if (key) setTimeout(() => key.classList.remove('playing'), Math.max(250, (Number(chord.duration) + release + (chord.arpeggio?index*0.2:0)) * 1000));
    }
  } catch (error) {
    $('status').textContent = 'No se pudo cargar el sonido del acorde.';
    console.error(error);
  }
}
async function playNote(midi, element, duration = 0.4) {
  if (midi < 36 || midi > 95) return;
  element?.classList.add('playing');
  state.lastMidi = midi;
  $('currentNote').textContent = noteName(midi);
  $('currentNote').style.opacity = '1';
  if (state.recording) {
    state.notes.push({ midi, note: canonicalNoteName(midi), start: (performance.now() - state.recordStart) / 1000, duration: 0.35 });
    renderRecorded();
  }
  try {
    const context = getAudioContext();
    const source = context.createBufferSource();
    const gain = context.createGain();
    if (state.instrument === 'grand-piano') {
      const sampleMidi = Math.max(60, Math.min(76, midi));
      source.buffer = await getSample(midi);
      source.playbackRate.value = 2 ** ((midi - sampleMidi) / 12);
    } else {
      const sample = await getInstrumentSample(midi);
      source.buffer = sample.buffer;
      source.playbackRate.value = 2 ** ((midi - sample.sampleMidi) / 12);
      duration = Math.max(duration, sample.release);
    }
    const contextNow = context.currentTime;
    const attackAt = contextNow + 0.006;
    const noteDuration = Math.max(0.08, duration * (state.sustain ? 2.4 : 1));
    const release = state.instrument === 'trumpet' ? 0.22 : (state.sustain ? 0.9 : 0.32);
    const stopAt = attackAt + noteDuration;
    gain.gain.setValueAtTime(0.0001, contextNow);
    gain.gain.linearRampToValueAtTime(0.88, attackAt + 0.018);
    gain.gain.setValueAtTime(0.88, stopAt);
    gain.gain.linearRampToValueAtTime(0.0001, stopAt + release);
    source.connect(gain); gain.connect(context.destination);
    source.start(attackAt);
    source.stop(stopAt + release + 0.02);
  } catch (error) {
    $('status').textContent = 'No se pudo cargar el sonido. Comprueba la conexión y la carpeta audio.';
    console.error(error);
  }
}
function stopPlayback() {
  state.playing = false;
  state.playTimers.forEach(clearTimeout);
  state.playTimers = [];
  if (audioContext?.state === 'running') audioContext.suspend();
  if ($('playMelody')) $('playMelody').textContent = '▶ Reproducir';
}
function playMelody() {
  if (!state.notes.length) { toast('Esta alabanza todavía no tiene melodía guardada.'); $('status').textContent = 'No hay melodía guardada para reproducir.'; return; }
  stopPlayback();
  state.playing = true;
  $('playMelody').textContent = '⏸ Reproduciendo…';
  $('status').textContent = 'Reproduciendo melodía…';
  // Encuadra una sola vez la primera nota de la melodía. Mantiene fijo el
  // teclado durante el resto de la reproducción para evitar saltos por nota.
  const firstNote = state.notes.reduce((first, note) => Number(note.start) < Number(first.start) ? note : first, state.notes[0]);
  let firstKey = document.querySelector(`.key[data-midi="${Number(firstNote.midi)}"]`);
  const keyboardScroll = $('keyboardScroll');
  if (!firstKey && keyboardScroll) firstKey = document.querySelector('.key[data-midi=60]');
  if (firstKey && keyboardScroll) {
    const keyLeft = firstKey.getBoundingClientRect().left - keyboardScroll.getBoundingClientRect().left + keyboardScroll.scrollLeft;
    const left = keyLeft - (keyboardScroll.clientWidth - firstKey.offsetWidth) / 2;
    keyboardScroll.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
  state.notes.forEach(note => {
    const timer = setTimeout(() => {
      if (!state.playing) return;
      const key = document.querySelector(`.key[data-midi="${Number(note.midi)}"]`);
      playNote(Number(note.midi), key, Number(note.duration) || 0.32);
    }, Math.max(0, Number(note.start) || 0) * 1000);
    state.playTimers.push(timer);
  });
  state.chords.forEach(chord => {
    const anchorNote = state.notes[Number(chord.noteIndex)];
    if (!anchorNote) return;
    const timer = setTimeout(() => { if (state.playing) playChord(chord); }, Math.max(0, Number(anchorNote.start) || 0) * 1000);
    state.playTimers.push(timer);
  });
  const noteRelease = state.instrument === 'trumpet' ? 0.22 : (state.sustain ? 0.9 : 0.32);
  const noteEnd = Math.max(...state.notes.map(note => (Number(note.start) || 0) + (Number(note.duration) || 0.35) * (state.sustain ? 2.4 : 1) + noteRelease));
  const chordEnd = state.chords.reduce((end, chord) => { const note=state.notes[Number(chord.noteIndex)]; return note ? Math.max(end, (Number(note.start)||0)+(Number(chord.duration)||2)+(chord.arpeggio?0.4:0)+(state.instrument === 'trumpet' ? 0.22 : (state.sustain ? 0.9 : 0.32))) : end; }, 0);
  const end = Math.max(noteEnd, chordEnd);
  state.playTimers.push(setTimeout(() => { state.playing = false; $('playMelody').textContent = '▶ Reproducir'; $('status').textContent = 'Melodía terminada.'; }, end * 1000 + 500));
}
function toggleRecord() {
  if (!state.admin) { toast('Solo Admin puede grabar.'); return; }
  if (state.recording) {
    state.recording = false; $('recordBtn').textContent = '⏺ Grabar'; $('status').textContent = 'Grabación detenida. Puedes escucharla y guardarla.'; return;
  }
  state.notes = []; state.chords = []; state.chordTarget = null; state.recordStart = performance.now(); state.recording = true;
  $('recordBtn').textContent = '⏹ Detener'; $('status').textContent = 'Grabando… toca las notas.'; renderRecorded();
}
async function saveMelody() {
  if (!state.admin || !state.song || !state.set || !state.ref || !state.db) { toast('Inicia sesión y conéctate para guardar.'); return; }
  if (!state.notes.length) { toast('Graba al menos una nota.'); return; }
  const { song, category } = state.song;
  const payload = {
    songId: song.id,
    updatedAt: new Date().toISOString(),
    acordes: state.chords.map(chord => ({ noteIndex:Number(chord.noteIndex), root:String(chord.root), quality:String(chord.quality), inversion:Number(chord.inversion)||0, octave:Number(chord.octave)||60, duration:Number(chord.duration)||2, arpeggio:!!chord.arpeggio })),
    notas: state.notes.map((note, index, all) => {
      const next = all[index + 1];
      return { midi: Number(note.midi), note: canonicalNoteName(Number(note.midi)), start: Number(Number(note.start || 0).toFixed(3)), duration: Number((next ? Math.max(0.12, next.start - note.start) : Math.max(0.35, note.duration || 0.35)).toFixed(3)) };
    })
  };
  try {
    await state.set(state.ref(state.db, `melodias/${category}/${song.id}`), payload);
    toast('Melodía guardada y sincronizada.');
    $('status').textContent = 'Melodía guardada.';
  } catch (error) { toast('No se pudo guardar. Comprueba la conexión.'); }
}
async function deleteMelody() {
  if (!state.admin || !state.song || !state.set || !state.ref || !state.db || !hasMelody(state.song.category, state.song.song.id)) return;
  if (!confirm('¿Eliminar la melodía guardada de esta alabanza?')) return;
  try {
    await state.set(state.ref(state.db, `melodias/${state.song.category}/${state.song.song.id}`), null);
    state.notes = []; state.chords = []; state.chordTarget = null; renderRecorded(); toast('Melodía eliminada.');
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
  document.querySelectorAll('[data-go-home]').forEach(button => button.onclick = () => setView('home'));
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
    stopPlayback();stopTheorySequence();
    const returnTo=state.view==='crear'?'createView':state.view==='teoria'?'theoryView':'songView';
    transitionScreen(returnTo,['homeView','songView','createView','theoryView','player']);
    renderLists();
  };
  $('playMelody').onclick = playMelody;
  $('stopMelody').onclick = () => {
    const wasPlaying = state.playing;
    stopPlayback(); $('status').textContent = wasPlaying ? 'Reproducción detenida.' : 'No había una melodía reproduciéndose.';
  };
  $('keyboardNotation').value = state.notation;
  $('keyboardNotation').onchange = event => {
    state.notation = event.target.value === 'latino' ? 'latino' : 'americano';
    try { localStorage.setItem('yhwh_cifrado_latino', state.notation === 'latino' ? '1' : '0'); } catch (_) {}
    renderKeyboard(); renderRecorded(); renderTheory();
    if (state.lastMidi !== null) $('currentNote').textContent = noteName(state.lastMidi);
    if (state.song) updateTransposeUI();
  };
  $('instrumentSelect').value = state.instrument;
  $('instrumentSelect').onchange = event => {
    state.instrument = event.target.value === 'trumpet' ? 'trumpet' : 'grand-piano';
    try { localStorage.setItem('yhwh_piano_instrument', state.instrument); } catch (_) {}
    $('status').textContent = `Instrumento seleccionado: ${state.instrument === 'trumpet' ? 'Trompeta' : 'Grand Piano'}.`;
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
  $('recordedNotes').onclick = event => { const chip=event.target.closest('[data-note-index]'); if(chip) chooseChordTarget(Number(chip.dataset.noteIndex)); };
  $('recordedNotes').onkeydown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const chip=event.target.closest('[data-note-index]');
    if (!chip) return;
    event.preventDefault(); chooseChordTarget(Number(chip.dataset.noteIndex));
  };
  $('applyChordBtn').onclick = saveSelectedChord;
  $('chordArpeggio').onchange = syncChordEditorMode;
  $('removeChordBtn').onclick = removeSelectedChord;
  $('previewChordBtn').onclick = () => {
    if(state.chordTarget === null){ toast('Primero elige una nota de la lista.'); return; }
    playChord({ noteIndex:state.chordTarget, root:$('chordRoot').value, quality:$('chordQuality').value, inversion:Number($('chordInversion').value), octave:Number($('chordOctave').value), duration:Number($('chordDuration').value), arpeggio:$('chordArpeggio').checked, preview:true });
  };
  $('showNotesBtn').onclick = jumpToMelodyNotes;
  $('transposeDown').onclick = () => transposeMelody(-1);
  $('transposeUp').onclick = () => transposeMelody(1);
  $('transposeReset').onclick = () => transposeMelody(-state.transpose);
  $('recordBtn').onclick = toggleRecord;
  $('saveBtn').onclick = saveMelody;
  $('undoBtn').onclick = () => {
    if (!state.admin) { toast('Solo Admin puede quitar notas.'); return; }
    if (!state.notes.length) { toast('No hay notas para quitar.'); return; }
    state.notes.pop(); state.chords=state.chords.filter(chord=>Number(chord.noteIndex)<state.notes.length); if(state.chordTarget!==null&&state.chordTarget>=state.notes.length)state.chordTarget=null; renderRecorded(); $('status').textContent = 'Se quitó la última nota.';
  };
  $('deleteBtn').onclick = deleteMelody;
  window.addEventListener('online', () => { $('connection').textContent = '🌐 Con conexión'; $('connection').className = 'connection online'; });
  window.addEventListener('offline', () => { $('connection').textContent = '📴 Sin conexión'; $('connection').className = 'connection offline'; });
  window.addEventListener('keydown', event => {
    if (event.target.matches('input')) return;
    const map = { a:60, w:61, s:62, e:63, d:64, f:65, t:66, g:67, y:68, h:69, u:70, j:71, k:72, o:73, l:74, p:75, ';':76 };
    const midi = map[event.key.toLowerCase()];
    if (midi) playNote(midi, document.querySelector(`.key[data-midi="${midi}"]`));
  });
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
      if (state.song && hasMelody(state.song.category, state.song.song.id)) {
        const syncedMelody=melodyFor(state.song.category,state.song.song.id);
        state.notes = (syncedMelody.notas||[]).map(note => ({ ...note }));
        state.chords = (syncedMelody.acordes||[]).map(chord => ({ ...chord }));
        renderRecorded(); $('playerLabel').textContent = 'Melodía guardada';
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
initializeFirebase();
