// Piano YHWH: lista de canciones primero; Firebase es opcional al arrancar.
const $ = (id) => document.getElementById(id);
const SONGS_ADORACION = Array.isArray(window.SONGS) ? window.SONGS : [];
const SONGS_JUBILO = Array.isArray(window.SONGS_JUBILO) ? window.SONGS_JUBILO : [];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_LATINO = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const NOTE_ROOT_LATINO = { C:'Do', D:'Re', E:'Mi', F:'Fa', G:'Sol', A:'La', B:'Si' };
const state = {
  view: 'adoracion', category: 'adoracion', song: null, admin: false,
  melodies: readMelodyCache(), recording: false, recordStart: 0, notes: [], chords: [], chordTarget: null,
  buffers: new Map(), instrumentBuffers: new Map(), instrument: localStorage.getItem('yhwh_piano_instrument') === 'trumpet' ? 'trumpet' : 'grand-piano', playing: false, playTimers: [], transpose: 0, originalTonic: 'C',
  notation: localStorage.getItem('yhwh_cifrado_latino') === '1' ? 'latino' : 'americano', lastMidi: null, db: null, auth: null,
  ref: null, set: null, onValue: null, signIn: null, signOut: null, authListener: null
};

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
function setView(view) {
  state.view = view;
  stopPlayback();
  $('player').classList.add('hidden');
  $('songView').classList.toggle('hidden', view === 'crear');
  $('createView').classList.toggle('hidden', view !== 'crear');
  document.querySelectorAll('.tab').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  renderLists();
  window.scrollTo(0, 0);
}
function chordNames(song) {
  const content = String(song.content || '').replace(/\[[^\]]*\]/g, ' ');
  const found = content.match(/(?<![A-Za-z0-9])(?:[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?)(?![A-Za-z])/g) || [];
  return [...new Set(found)].slice(0, 32);
}
function openSong(song, category) {
  state.song = { song, category };
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
  $('lyrics').textContent = String(song.content || '').replace(/\[[^\]]*\]/g, '').trim().slice(0, 4000);
  $('playerLabel').textContent = hasMelody(category, song.id) ? 'Melodía guardada' : 'Vista previa del piano';
  $('status').textContent = hasMelody(category, song.id) ? 'Melodía guardada. Pulsa reproducir.' : 'Toca el piano para escuchar. Solo Admin puede grabar y guardar.';
  renderRecorded();
  updateAdminControls();
  $('player').classList.remove('hidden');
  startKeyboardAtC4();
  $('songView').classList.add('hidden');
  $('createView').classList.add('hidden');
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
  $('chordDuration').value = String(chord?.duration || 2);
  $('removeChordBtn').classList.toggle('hidden', !chord);
  document.querySelectorAll('.melody-note-item').forEach((item, i) => item.classList.toggle('selected', i === index));
}
function saveSelectedChord() {
  if (!state.admin || state.chordTarget === null || !state.notes[state.chordTarget]) { toast('Primero elige una nota de la lista.'); return; }
  const chord = { noteIndex: state.chordTarget, root: $('chordRoot').value, quality: $('chordQuality').value, inversion: Number($('chordInversion').value), octave: Number($('chordOctave').value), duration: Number($('chordDuration').value) };
  const existing = state.chords.findIndex(item => Number(item.noteIndex) === state.chordTarget);
  if (existing >= 0) state.chords[existing] = chord; else state.chords.push(chord);
  renderRecorded(); chooseChordTarget(chord.noteIndex);
  $('status').textContent = `Acorde ${chordDisplayName(chord)} asignado a ${noteName(state.notes[chord.noteIndex].midi)}. Pulsa Guardar para sincronizar.`;
}
function removeSelectedChord() {
  if (state.chordTarget === null) return;
  state.chords = state.chords.filter(item => Number(item.noteIndex) !== state.chordTarget);
  renderRecorded(); chooseChordTarget(state.chordTarget);
  $('status').textContent = 'Acorde quitado. Pulsa Guardar para sincronizar.';
}
function chordMidiNotes(chord) {
  const shapes = { major:[0,4,7], minor:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], sus4:[0,5,7], dim:[0,3,6] };
  const rootMidi = Number(chord.octave || 60) + NOTE_NAMES.indexOf(chord.root) + state.transpose;
  const pitches = (shapes[chord.quality] || shapes.major).map(interval => rootMidi + interval);
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
    for (const entry of entries) {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = entry.buffer;
      source.playbackRate.value = 2 ** ((entry.midi - entry.sampleMidi) / 12);
      gain.gain.value = 0.78;
      source.connect(gain); gain.connect(context.destination);
      source.start(when);
      source.stop(when + Math.max(0.25, Number(chord.duration) || 2));
      const key = document.querySelector(`.key[data-midi="${entry.midi}"]`);
      key?.classList.add('playing');
      if (key) setTimeout(() => key.classList.remove('playing'), Math.max(250, Number(chord.duration) * 1000));
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
    gain.gain.value = 0.88;
    source.connect(gain); gain.connect(context.destination);
    source.start(context.currentTime + 0.006);
    source.stop(context.currentTime + duration);
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
  const noteEnd = Math.max(...state.notes.map(note => (Number(note.start) || 0) + (Number(note.duration) || 0.35)));
  const chordEnd = state.chords.reduce((end, chord) => { const note=state.notes[Number(chord.noteIndex)]; return note ? Math.max(end, (Number(note.start)||0)+(Number(chord.duration)||2)) : end; }, 0);
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
    acordes: state.chords.map(chord => ({ noteIndex:Number(chord.noteIndex), root:String(chord.root), quality:String(chord.quality), inversion:Number(chord.inversion)||0, octave:Number(chord.octave)||60, duration:Number(chord.duration)||2 })),
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
  document.querySelectorAll('.tab').forEach(button => button.onclick = () => setView(button.dataset.view));
  $('search').oninput = renderLists;
  $('createSearch').oninput = renderLists;
  $('adminBtn').onclick = showLogin;
  $('loginSubmit').onclick = login;
  $('password').onkeydown = event => { if (event.key === 'Enter') login(); };
  $('closeLogin').onclick = () => $('loginModal').classList.add('hidden');
  $('loginModal').onclick = event => { if (event.target === $('loginModal')) $('loginModal').classList.add('hidden'); };
  $('backBtn').onclick = () => {
    stopPlayback(); $('player').classList.add('hidden');
    if (state.view === 'crear') $('createView').classList.remove('hidden'); else $('songView').classList.remove('hidden');
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
    renderKeyboard(); renderRecorded();
    if (state.lastMidi !== null) $('currentNote').textContent = noteName(state.lastMidi);
    if (state.song) updateTransposeUI();
  };
  $('instrumentSelect').value = state.instrument;
  $('instrumentSelect').onchange = event => {
    state.instrument = event.target.value === 'trumpet' ? 'trumpet' : 'grand-piano';
    try { localStorage.setItem('yhwh_piano_instrument', state.instrument); } catch (_) {}
    $('status').textContent = `Instrumento seleccionado: ${state.instrument === 'trumpet' ? 'Trompeta' : 'Grand Piano'}.`;
  };
  $('recordedNotes').onclick = event => { const chip=event.target.closest('[data-note-index]'); if(chip) chooseChordTarget(Number(chip.dataset.noteIndex)); };
  $('recordedNotes').onkeydown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const chip=event.target.closest('[data-note-index]');
    if (!chip) return;
    event.preventDefault(); chooseChordTarget(Number(chip.dataset.noteIndex));
  };
  $('applyChordBtn').onclick = saveSelectedChord;
  $('removeChordBtn').onclick = removeSelectedChord;
  $('previewChordBtn').onclick = () => {
    if(state.chordTarget === null){ toast('Primero elige una nota de la lista.'); return; }
    playChord({ noteIndex:state.chordTarget, root:$('chordRoot').value, quality:$('chordQuality').value, inversion:Number($('chordInversion').value), octave:Number($('chordOctave').value), duration:Number($('chordDuration').value), preview:true });
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
