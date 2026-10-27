(() => {
  const $ = (id) => document.getElementById(id);
  const root = $('theoryScreen');
  if (!root) return;
  const content = $('theoryLessonContent');
  const nav = $('theoryLessonNav');
  const STORE = 'piano-yhwh-theory-v2';
  const pitchNames = ['Do', 'Do♯ / Re♭', 'Re', 'Re♯ / Mi♭', 'Mi', 'Fa', 'Fa♯ / Sol♭', 'Sol', 'Sol♯ / La♭', 'La', 'La♯ / Si♭', 'Si'];
  const blackPC = new Set([1, 3, 6, 8, 10]);
  const lessons = [
    { title: 'Ubícate en el teclado', tag: 'Orientación', minutes: '4 min', headline: 'Encuentra Do sin contar todas las teclas', body: 'El teclado repite el mismo patrón. Las teclas negras aparecen en grupos de dos y tres: Do es la tecla blanca inmediatamente a la izquierda de cada grupo de dos.', tip: 'El patrón se repite por todo el instrumento. Una vez que reconoces el grupo de dos negras, puedes encontrar cualquier Do, grave o agudo.', demo: [60, 64, 67], task: 'En el teclado, toca el Do que está justo a la izquierda del grupo de dos teclas negras.', kind: 'find', target: [60], success: '¡Encontraste Do! Mira el grupo de dos negras: Do siempre está justo a su izquierda.' },
    { title: 'Tonos y semitonos', tag: 'Distancias', minutes: '5 min', headline: 'Mide la distancia más pequeña', body: 'Un semitono es el paso entre dos teclas vecinas, blancas o negras. Dos semitonos forman un tono. En el piano no hay tecla negra entre Mi–Fa ni entre Si–Do: esas parejas blancas ya están separadas por un semitono.', tip: 'Do♯ y Re♭ son dos nombres para la misma tecla en el piano. El nombre elegido depende del contexto musical.', demo: [60, 61, 62, 64, 65], task: 'Toca la tecla que está exactamente un semitono arriba de Do central.', kind: 'find', target: [61], success: 'Correcto: Do♯ está a un semitono de Do. Do–Re, en cambio, mide dos semitonos: un tono.' },
    { title: 'Intervalos: los saltos', tag: 'Oído y lectura', minutes: '5 min', headline: 'Compara dos distancias', body: 'Un intervalo es la distancia entre dos notas. Puedes describirlo por cuántas notas abarca (segunda, tercera, cuarta…) y por cuántos semitonos mide. Do–Re es una segunda; Do–Mi es una tercera.', tip: 'Escucha el par completo y compara cuál llega más lejos. Do–Re mide 2 semitonos; Do–Mi mide 4.', demo: [60, 62, 60, 64], task: 'Después de escuchar los dos pares, elige el intervalo más amplio.', kind: 'choice', choices: ['Do–Re (2 semitonos)', 'Do–Mi (4 semitonos)'], answer: 1, success: 'Así es. Do–Mi abarca cuatro semitonos; Do–Re abarca dos.' },
    { title: 'Pulso y ritmo', tag: 'Tiempo', minutes: '5 min', headline: 'Siente un pulso constante', body: 'El pulso es el latido regular de la música. El ritmo organiza sonidos y silencios alrededor de ese pulso. Primero encuentra un pulso cómodo; después prueba a tocar una nota en cada latido.', tip: 'No aceleres para alcanzar el metrónomo. Mantén un pulso parejo y deja que el siguiente clic llegue a ti.', demo: [60, 60, 60, 60], task: 'Escucha cuatro pulsos y toca el botón en cada clic. Intenta mantener el mismo espacio entre golpes.', kind: 'pulse' },
    { title: 'La escala de Do mayor', tag: 'Melodía', minutes: '6 min', headline: 'Construye una escala paso a paso', body: 'Una escala ordena notas dentro de una tonalidad. Do mayor sube por Do, Re, Mi, Fa, Sol, La, Si y llega al Do siguiente. Su patrón de distancias es tono, tono, semitono, tono, tono, tono, semitono.', tip: 'Las teclas blancas de Do a Do forman Do mayor. Eso no significa que todas las escalas usen solo teclas blancas: cada tonalidad tiene su propio patrón.', demo: [60, 62, 64, 65, 67, 69, 71, 72], task: 'Toca la escala ascendente completa desde Do central hasta el siguiente Do, sin saltarte notas.', kind: 'sequence', target: [60, 62, 64, 65, 67, 69, 71, 72], success: '¡Escala completa! Escucha cómo el último Do cierra el recorrido y vuelve a dar sensación de llegada.' },
    { title: 'Acordes para acompañar', tag: 'Armonía', minutes: '6 min', headline: 'Forma el acorde de Do mayor', body: 'Un acorde combina varias notas que suenan juntas. La tríada de Do mayor contiene Do, Mi y Sol: fundamental, tercera y quinta. Para aprender sus notas, tócalas una por una; después puedes probarlas juntas en el piano principal.', tip: 'Las inversiones cambian el orden de las notas, pero Do–Mi–Sol sigue siendo el acorde de Do mayor.', demo: [60, 64, 67], task: 'Toca Do, luego Mi y luego Sol para completar la tríada arpegiada.', kind: 'sequence', target: [60, 64, 67], success: 'Completaste Do–Mi–Sol. Ya puedes usar estas tres notas como base de un acompañamiento sencillo.' },
    { title: 'Lleva la idea a una alabanza', tag: 'Aplicación', minutes: '5 min', headline: 'Escucha, encuentra y reproduce una frase', body: 'Una melodía puede subir, bajar, repetir notas y dejar pausas. Escucha la frase de ejemplo y reprodúcela en el teclado. Luego abre una alabanza de la app e intenta reconocer si su melodía sube, baja o repite.', tip: 'Empieza despacio y con una mano. La meta es seguir la forma de la frase; no hace falta tocar rápido.', demo: [60, 64, 67, 64, 60], task: 'Reproduce la frase Do–Mi–Sol–Mi–Do en el teclado.', kind: 'sequence', target: [60, 64, 67, 64, 60], success: '¡Frase completa! Prueba escuchar una alabanza y seguir sus movimientos antes de buscar las notas.' }
  ];
  let current = 0;
  let attempt = [];
  let rhythm = null;
  let demoTimers = [];
  let state = loadState();
  function loadState() {
    try { const x = JSON.parse(localStorage.getItem(STORE) || '{}'); return { done: Array.isArray(x.done) ? x.done.filter(n => Number.isInteger(n) && n >= 0 && n < lessons.length) : [] }; }
    catch (_) { return { done: [] }; }
  }
  function saveState() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (_) {} }
  function noteLabel(midi) { return pitchNames[midi % 12]; }
  function emitNote(midi, key) {
    window.dispatchEvent(new CustomEvent('yhwh-theory-note', { detail: { midi } }));
    if (key) { key.classList.add('playing'); window.setTimeout(() => key.classList.remove('playing'), 220); }
  }
  function keyMarkup(midi, whiteIndex) {
    const pc = midi % 12, black = blackPC.has(pc);
    const label = noteLabel(midi);
    if (black) return `<button class="theory-black-key" type="button" data-theory-midi="${midi}" aria-label="Tocar ${label}" style="left:calc(${whiteIndex * 52}px - 16px)"><span class="theory-key-label">${label.split(' / ')[0]}</span></button>`;
    return `<button class="theory-white-key" type="button" data-theory-midi="${midi}" aria-label="Tocar ${label}"><span class="theory-key-label">${label}</span></button>`;
  }
  function keyboardMarkup() {
    let html = '', whiteIndex = 0;
    for (let midi = 48; midi <= 84; midi++) { html += keyMarkup(midi, whiteIndex); if (!blackPC.has(midi % 12)) whiteIndex++; }
    return `<section class="theory-instrument" aria-label="Teclado de práctica"><div class="theory-instrument-head"><b>Teclado de práctica</b><small>Haz clic o toca una tecla</small></div><div class="theory-keyboard" role="group" aria-label="Teclado de tres octavas"><div class="theory-keybed">${html}</div></div></section>`;
  }
  function renderNav() {
    nav.innerHTML = `<h2>Tu ruta musical</h2><p class="theory-path-caption">Siete habilidades para pasar del teclado a una alabanza. Tu avance se guarda en este dispositivo.</p><div class="theory-lesson-list">${lessons.map((x, i) => `<button type="button" class="theory-lesson${i === current ? ' active' : ''}${state.done.includes(i) ? ' done' : ''}" data-step="${i}" aria-current="${i === current ? 'step' : 'false'}"><span class="theory-lesson-index">${state.done.includes(i) ? '✓' : String(i + 1).padStart(2, '0')}</span><span class="theory-lesson-name">${x.title}<span class="theory-lesson-meta">${x.tag} · ${x.minutes}</span></span><span class="theory-lesson-check" aria-hidden="true">${state.done.includes(i) ? '✓' : ''}</span></button>`).join('')}</div><div class="theory-side-progress" aria-label="Progreso del curso"><i style="width:${state.done.length / lessons.length * 100}%"></i></div>`;
    nav.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => { current = Number(button.dataset.step); draw(); }));
    $('theoryDoneCount').textContent = `${state.done.length} de ${lessons.length}`;
    $('theoryCourseProgress').textContent = `${Math.round(state.done.length / lessons.length * 100)}%`;
  }
  function feedback(message, type = '') { const el = $('theoryFeedback'); if (!el) return; el.textContent = message; el.className = `theory-feedback${type ? ` ${type}` : ''}`; }
  function playNotes(notes, button) {
    demoTimers.forEach(window.clearTimeout);
    demoTimers = [];
    if (button) { button.disabled = true; button.textContent = '♪ Reproduciendo…'; }
    notes.forEach((midi, i) => demoTimers.push(window.setTimeout(() => {
      const key = content.querySelector(`[data-theory-midi="${midi}"]`);
      emitNote(midi, key);
      if (i === notes.length - 1 && button) demoTimers.push(window.setTimeout(() => { button.disabled = false; button.textContent = '▶ Escuchar ejemplo'; }, 260));
    }, i * 500)));
  }
  function taskMarkup(x) {
    if (x.kind === 'find') return '<p>Elige una tecla. Puedes escuchar el ejemplo otra vez si quieres.</p><div class="theory-task-controls"><button class="theory-answer" id="checkTask" type="button">Comprobar nota</button><button class="theory-reset" id="clearTask" type="button">Borrar intento</button></div>';
    if (x.kind === 'choice') return `<p>Escucha con atención y decide cuál salto es más amplio.</p><div class="theory-task-controls">${x.choices.map((choice, i) => `<button class="theory-answer" type="button" data-answer="${i}">${choice}</button>`).join('')}</div>`;
    if (x.kind === 'pulse') return '<p>Después del conteo, toca una vez por cada clic. Se mide la regularidad de tus cuatro golpes, no la velocidad.</p><div class="theory-task-controls"><button class="theory-answer" id="startPulse" type="button">▶ Iniciar pulso</button><button class="theory-answer" id="tapPulse" type="button" disabled>● Marcar pulso</button></div>';
    const seq = x.target.map(noteLabel).join(' · ');
    return `<p>Toca las notas en este orden: <strong>${seq}</strong></p><div class="theory-task-controls"><button class="theory-answer" id="checkTask" type="button">Comprobar secuencia</button><button class="theory-reset" id="clearTask" type="button">Empezar de nuevo</button></div>`;
  }
  function draw() {
    demoTimers.forEach(window.clearTimeout); demoTimers = [];
    stopRhythm(); attempt = [];
    const x = lessons[current];
    $('theoryStepLabel').textContent = `LECCIÓN ${String(current + 1).padStart(2, '0')} · ${x.tag.toUpperCase()}`;
    $('theoryProgressText').textContent = `${current + 1} / ${lessons.length}`;
    $('theoryProgressBar').style.width = `${(current + 1) / lessons.length * 100}%`;
    $('theoryProgressTrack').setAttribute('aria-valuenow', String(current + 1));
    $('theoryPrev').disabled = current === 0;
    $('theoryNext').textContent = current === lessons.length - 1 ? (state.done.length === lessons.length ? 'Terminar ✓' : 'Volver al inicio') : 'Siguiente lección →';
    renderNav();
    content.innerHTML = `<div class="theory-eyebrow">${x.tag} · ${x.minutes}</div><h2>${x.headline}</h2><p class="theory-description">${x.body}</p><aside class="theory-callout"><span class="theory-callout-icon" aria-hidden="true">i</span><div><b>Idea clave</b><p>${x.tip}</p></div></aside><div class="theory-demo"><button type="button" id="listenExample">▶ Escuchar ejemplo</button><span class="theory-demo-copy">Escucha y observa las teclas para relacionar el sonido con el movimiento.</span></div>${keyboardMarkup()}<section class="theory-task" aria-labelledby="theoryTaskTitle"><div class="theory-task-head"><span class="theory-task-step">✓</span><h3 id="theoryTaskTitle">Tu reto</h3></div><p>${x.task}</p>${taskMarkup(x)}<div class="theory-feedback" id="theoryFeedback" role="status" aria-live="polite">Toca el teclado y comprueba tu respuesta cuando estés listo.</div></section>`;
    content.querySelector('#listenExample').addEventListener('click', event => playNotes(x.demo, event.currentTarget));
    content.querySelectorAll('[data-theory-midi]').forEach(key => key.addEventListener('click', () => onKey(Number(key.dataset.theoryMidi), key)));
    $('clearTask')?.addEventListener('click', () => { attempt = []; content.querySelectorAll('.target').forEach(key => key.classList.remove('target')); feedback('Intento borrado. Prueba otra vez.'); });
    $('checkTask')?.addEventListener('click', () => checkTask(x));
    content.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      content.querySelectorAll('[data-answer]').forEach(b => b.classList.remove('correct', 'wrong'));
      const right = Number(button.dataset.answer) === x.answer;
      button.classList.add(right ? 'correct' : 'wrong');
      if (right) completeCurrent(x.success); else feedback('Escucha los dos pares otra vez y compara cuánto se aleja la segunda nota.', 'error');
    }));
    $('startPulse')?.addEventListener('click', startRhythm);
    $('tapPulse')?.addEventListener('click', recordTap);
  }
  function onKey(midi, key) {
    emitNote(midi, key);
    const x = lessons[current];
    if (x.kind === 'find') { attempt = [midi]; key.classList.add('target'); feedback(`Elegiste ${noteLabel(midi)}. Pulsa «Comprobar nota» para ver cómo vas.`); return; }
    if (x.kind !== 'sequence') { feedback(`Escuchaste ${noteLabel(midi)}.`, ''); return; }
    if (attempt.length >= x.target.length) attempt = [];
    const index = attempt.length;
    attempt.push(midi);
    if (midi !== x.target[index]) {
      feedback(`Esa fue ${noteLabel(midi)}; para este paso busca ${noteLabel(x.target[index])}. Puedes seguir intentando o empezar de nuevo.`, 'error');
      return;
    }
    key.classList.add('target');
    feedback(`Bien: ${noteLabel(midi)}${attempt.length < x.target.length ? ` · ${attempt.length} de ${x.target.length}` : ' · secuencia lista para comprobar'}`, 'success');
  }
  function checkTask(x) {
    if (x.kind === 'find') {
      if (!attempt.length) { feedback('Toca una tecla del teclado antes de comprobar.', 'error'); return; }
      if (attempt[0] === x.target[0]) completeCurrent(x.success);
      else feedback(`Elegiste ${noteLabel(attempt[0])}. Busca la tecla indicada en la explicación y vuelve a probar.`, 'error');
      return;
    }
    const right = attempt.length === x.target.length && attempt.every((midi, i) => midi === x.target[i]);
    if (right) completeCurrent(x.success);
    else {
      let at = 0; while (at < attempt.length && attempt[at] === x.target[at]) at++;
      feedback(attempt.length < x.target.length ? `Llevas ${at} de ${x.target.length} notas correctas. Continúa desde ${noteLabel(x.target[at])}.` : `Revisa el orden desde ${noteLabel(x.target[at] ?? x.target[0])} y vuelve a intentarlo.`, 'error');
    }
  }
  function completeCurrent(message) {
    if (!state.done.includes(current)) state.done.push(current);
    saveState(); renderNav();
    feedback(`${message} Lección completada y guardada.`, 'success');
    const next = $('theoryNext'); next.disabled = false;
  }
  function startRhythm() {
    stopRhythm(); rhythm = { taps: [], timers: [], started: Date.now() };
    $('startPulse').disabled = true; $('tapPulse').disabled = true;
    feedback('Escucha el conteo: 1, 2, 3, 4. Después marca cuatro pulsos parejos.', '');
    const count = [60, 60, 60, 60];
    count.forEach((midi, i) => rhythm.timers.push(setTimeout(() => { if (!rhythm) return; emitNote(midi, null); feedback(i < 3 ? `Conteo: ${i + 1}` : 'Ahora marca cuatro pulsos parejos.', ''); if (i === 3) { rhythm.started = Date.now(); $('tapPulse').disabled = false; $('tapPulse').focus(); } }, i * 650)));
  }
  function recordTap() {
    if (!rhythm) return;
    const now = Date.now(); rhythm.taps.push(now);
    const beat = rhythm.taps.length;
    if (beat < 4) { feedback(`Pulso ${beat} de 4. Mantén el mismo espacio entre golpes.`); return; }
    const gaps = rhythm.taps.slice(1).map((time, i) => time - rhythm.taps[i]);
    const average = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const spread = Math.max(...gaps.map(g => Math.abs(g - average)));
    stopRhythm();
    if (average >= 280 && average <= 1300 && spread <= 260) completeCurrent('¡Buen pulso! Tus cuatro golpes mantuvieron una separación bastante constante.');
    else feedback('El pulso todavía se acelera o se frena. Reinicia, escucha el conteo y deja un espacio parecido entre cada toque.', 'error');
  }
  function stopRhythm() { if (rhythm?.timers) rhythm.timers.forEach(clearTimeout); rhythm = null; const tap = $('tapPulse'), start = $('startPulse'); if (tap) tap.disabled = true; if (start) start.disabled = false; }
  $('theoryPrev').addEventListener('click', () => { if (current > 0) { current--; draw(); } });
  $('theoryNext').addEventListener('click', () => {
    if (current < lessons.length - 1) { current++; draw(); }
    else if (state.done.length === lessons.length) { current = 0; draw(); }
    else { $('homeBtn').click(); }
  });
  $('theoryBackHome').addEventListener('click', () => $('homeBtn').click());
  $('theoryHome').addEventListener('click', () => $('homeBtn').click());
  $('theoryResetProgress').addEventListener('click', () => {
    state.done = []; saveState(); draw(); feedback('Progreso reiniciado. Puedes recorrer la ruta de nuevo.');
  });
  draw();
})();
