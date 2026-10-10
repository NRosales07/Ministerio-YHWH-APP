/*! tooltips.js — Tooltips enriquecidos · Ministerio YHWH
 *
 * Qué hace:
 *  - Convierte automáticamente todos los `title` nativos (también los que piano.js
 *    asigna después con `button.title = ...`) y los `aria-label` de botones de solo
 *    icono en tooltips propios. No hay que tocar piano.js.
 *  - Contenido rico: título + descripción + estado (Activado/Desactivado/Abierto)
 *    + atajo de teclado opcional. El estado se lee en vivo de aria-pressed/checked/expanded.
 *  - Escritorio: aparece con retraso, "modo caliente" entre botones vecinos,
 *    también con el teclado (Tab) y se cierra con Escape.
 *  - Celular/tablet: mantén pulsado ~0.5 s sobre un botón para ver la ayuda
 *    (sin activarlo).
 *  - Se posiciona solo (arriba/abajo/izquierda/derecha), con flecha y dentro de la
 *    pantalla, respetando el notch del iPhone. Funciona sobre <dialog> modales.
 *
 * Atributos opcionales en cualquier elemento:
 *    data-tip="Título"        data-tip-desc="Descripción"
 *    data-tip-kbd="Ctrl+S"    data-tip-pos="top|bottom|left|right"
 *    data-tip-nolong          (desactiva el pulsado largo en táctil)
 */
(() => {
  'use strict';
  if (window.yhwhTips) return;

  const doc = document;
  const HOVER_DELAY = 420;     // ms antes de mostrar con el mouse
  const WARM_DELAY = 40;       // ms si acabas de ver otro tooltip
  const WARM_WINDOW = 500;     // ventana "caliente" tras ocultar uno
  const FOCUS_DELAY = 80;
  const LONG_PRESS = 450;      // ms de pulsado largo en táctil
  const TOUCH_LIFETIME = 3200; // el tooltip táctil se oculta solo
  const FADE = 140;
  const GAP = 11;              // separación al elemento (incluye la flecha)
  const EDGE = 8;              // margen mínimo con el borde de pantalla
  const MOVE_TOLERANCE = 10;   // px que cancelan el pulsado largo

  const POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const NO_LONGPRESS = 'input,select,textarea,[contenteditable="true"],[data-tip-nolong]';
  const AUTO_SELECTOR = 'button[aria-label],[role="button"][aria-label],summary[aria-label]';
  const SKIP_TAGS = new Set(['TITLE', 'IFRAME', 'FRAME', 'OBJECT', 'EMBED', 'LINK', 'STYLE', 'SCRIPT', 'META', 'HEAD', 'HTML', 'OPTION', 'OPTGROUP']);
  const XHTML = 'http://www.w3.org/1999/xhtml';

  /* Descripciones por id. `t` = título si el elemento no trae uno propio;
     `d` = descripción; `k` = atajo de teclado (solo si existe de verdad). */
  const RICH = {
    homeBtn: { d: 'Vuelve a la pantalla de inicio.' },
    themeToggle: { d: 'Alterna entre tema claro y oscuro. Se recuerda en este dispositivo.' },
    songThemeToggle: { d: 'Alterna entre tema claro y oscuro. Se recuerda en este dispositivo.' },
    createThemeToggle: { d: 'Alterna entre tema claro y oscuro. Se recuerda en este dispositivo.' },
    adminBtn: { t: 'Acceso de Admin', d: 'Inicia sesión para grabar y guardar melodías.' },
    selectedPreviewBtn: { d: 'Escucha un fragmento de la alabanza elegida antes de abrirla.' },
    playMelody: { d: 'Reproduce la melodía de la alabanza.' },
    stopMelody: { d: 'Detiene la reproducción.' },
    showNotesBtn: { d: 'Lleva el teclado a la zona donde están las notas de la melodía.' },
    sustainBtn: { d: 'Mantiene las notas sonando al soltarlas, como el pedal del piano.' },
    octaveModeToggle: { d: 'Dobla cada nota a la octava para un sonido más lleno.' },
    recordBtn: { d: 'Graba lo que toques en el teclado como una nueva melodía.' },
    chordEditorToggle: { d: 'Asigna un acorde y su bajo de fondo a partir de una nota de la melodía.' },
    saveBtn: { d: 'Guarda la melodía en Firebase para que todo el equipo la vea.' },
    undoBtn: { d: 'Quita la última nota grabada.' },
    deleteBtn: { d: 'Elimina la melodía de esta alabanza.' },
    theoryLiveToggle: { d: 'Muestra ayuda de teoría musical directamente sobre el teclado.' },
    liveTheoryPlayKey: { d: 'Escucha la teoría que seleccionaste en el teclado.' },
    settingsToggle: { d: 'Abre los ajustes del piano.' },
    keyboardRangeToggle: { d: 'Elige cuántas teclas ver (18, 25 o las 88) y ajusta el tamaño.' },
    notationToggle: { d: 'Cambia las etiquetas de las notas entre cifrado americano (C, D, E) y latino (Do, Re, Mi).' },
    instrumentToggle: { d: 'Elige el instrumento con el que suenan las notas.' },
    keyColorToggle: { d: 'Cambia el color de las teclas al presionarlas.' },
    chordsViewToggle: { d: 'Muestra la letra y los acordes de la alabanza.' },
    metronomeToggle: { d: 'Marca el pulso con clics al tempo elegido.' },
    metronomeTempoDown: { t: 'Bajar tempo', d: 'Resta 1 BPM al metrónomo.' },
    metronomeTempoUp: { t: 'Subir tempo', d: 'Suma 1 BPM al metrónomo.' },
    activeKeyName: { d: 'Transpone la melodía a otra tonalidad. Puedes volver al tono original.' },
    practiceHearBtn: { d: 'Escucha la nota que debes tocar.' },
    practiceSkipBtn: { d: 'Salta a la siguiente nota de la práctica.' },
    octaveDown: { d: 'Desplaza el teclado una octava hacia los graves.' },
    octaveUp: { d: 'Desplaza el teclado una octava hacia los agudos.' },
    keyboardZoomOut: { d: 'Muestra más teclas en pantalla (más pequeñas).' },
    keyboardZoomIn: { d: 'Muestra menos teclas en pantalla (más grandes).' },
    previewBassSound: { d: 'Toca una nota de prueba con el instrumento del bajo.' },
    previewMelodySound: { d: 'Toca una nota de prueba con el instrumento de la melodía.' },
    closeChordEditor: { t: 'Cerrar editor' }
  };

  const SCAN_SELECTOR = ['[title]', AUTO_SELECTOR]
    .concat(Object.keys(RICH).map(id => '#' + id)).join(',');

  /* ───────────── Utilidades ───────────── */

  const iconOnly = el => (el.textContent || '').replace(/[\s\u200b]+/g, '').length <= 2;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));
  const tipTarget = node => (node && node.closest ? node.closest('[data-tip]') : null);

  function adopt(el) {
    if (!(el instanceof Element) || el.namespaceURI !== XHTML || SKIP_TAGS.has(el.tagName)) return;

    // Las teclas del piano ya muestran la nota directamente; el globo de ayuda
    // tapa la barra y la etiqueta cuando se mantiene pulsada en móvil.
    if (el.matches('.piano-panel .key')) {
      el.removeAttribute('title');
      el.removeAttribute('data-tip');
      el.removeAttribute('data-tip-auto');
      return;
    }

    const raw = el.getAttribute('title');
    if (raw !== null) {
      const value = raw.trim();
      el.removeAttribute('title'); // evita el tooltip nativo duplicado
      if (value) {
        el.setAttribute('data-tip', value);
        el.removeAttribute('data-tip-auto');
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && iconOnly(el)) {
          el.setAttribute('aria-label', value);
        }
        return;
      }
    }

    if (el.hasAttribute('data-tip-auto')) {
      const label = el.getAttribute('aria-label');
      if (label && label !== el.getAttribute('data-tip')) el.setAttribute('data-tip', label);
      return;
    }

    if (!el.hasAttribute('data-tip')) {
      const rich = el.id && RICH[el.id];
      if (rich && rich.t) {
        el.setAttribute('data-tip', rich.t);
      } else if ((rich || (el.matches(AUTO_SELECTOR) && iconOnly(el))) && el.getAttribute('aria-label')) {
        el.setAttribute('data-tip', el.getAttribute('aria-label'));
        el.setAttribute('data-tip-auto', '');
      }
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    adopt(root);
    root.querySelectorAll(SCAN_SELECTOR).forEach(adopt);
  }

  function read(el) {
    const rich = (el.id && RICH[el.id]) || {};
    const title = (el.getAttribute('data-tip') || rich.t || '').trim();
    if (!title) return null;

    let desc = (el.getAttribute('data-tip-desc') || rich.d || '').trim();
    if (desc.toLowerCase() === title.toLowerCase()) desc = '';
    const kbd = (el.getAttribute('data-tip-kbd') || rich.k || '').trim();

    let state = null;
    const pressed = el.getAttribute('aria-pressed');
    const checked = el.getAttribute('aria-checked');
    const expanded = el.getAttribute('aria-expanded');
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      state = { on: el.checked, label: el.checked ? 'Activado' : 'Desactivado' };
    } else if (pressed === 'true' || checked === 'true') {
      state = { on: true, label: 'Activado' };
    } else if (pressed === 'false' || checked === 'false') {
      state = { on: false, label: 'Desactivado' };
    } else if (expanded === 'true') {
      state = { on: true, label: 'Abierto' };
    }

    const disabled = el.disabled === true || el.getAttribute('aria-disabled') === 'true';
    return { title, desc, kbd, state, disabled };
  }

  /* ───────────── DOM del tooltip (se crea al primer uso) ───────────── */

  let tip, elTitle, elState, elDesc, elFoot, elKbd, elHint, probe;

  function build() {
    if (tip) return;
    tip = doc.createElement('div');
    tip.id = 'yhwhTip';
    tip.className = 'yhwh-tip';
    tip.setAttribute('role', 'tooltip');
    if (POPOVER) tip.setAttribute('popover', 'manual'); else tip.setAttribute('data-fallback', '');
    tip.innerHTML =
      '<div class="yhwh-tip-card">' +
        '<div class="yhwh-tip-head"><span class="yhwh-tip-title"></span><span class="yhwh-tip-state" hidden></span></div>' +
        '<div class="yhwh-tip-desc" hidden></div>' +
        '<div class="yhwh-tip-foot" hidden><span class="yhwh-tip-keys"></span><span class="yhwh-tip-hint"></span></div>' +
      '</div><span class="yhwh-tip-arrow"></span>';
    elTitle = tip.querySelector('.yhwh-tip-title');
    elState = tip.querySelector('.yhwh-tip-state');
    elDesc = tip.querySelector('.yhwh-tip-desc');
    elFoot = tip.querySelector('.yhwh-tip-foot');
    elKbd = tip.querySelector('.yhwh-tip-keys');
    elHint = tip.querySelector('.yhwh-tip-hint');

    probe = doc.createElement('div'); // mide los safe-area-inset del iPhone
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;' +
      'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    doc.body.append(probe);
    doc.body.append(tip);
  }

  function safeInsets() {
    const s = getComputedStyle(probe);
    return {
      t: parseFloat(s.paddingTop) || 0, r: parseFloat(s.paddingRight) || 0,
      b: parseFloat(s.paddingBottom) || 0, l: parseFloat(s.paddingLeft) || 0
    };
  }

  function render(d) {
    elTitle.textContent = d.title;

    if (d.state) {
      elState.hidden = false;
      elState.textContent = d.state.label;
      elState.dataset.on = String(d.state.on);
    } else {
      elState.hidden = true;
    }

    elDesc.hidden = !d.desc;
    elDesc.textContent = d.desc;

    elKbd.replaceChildren();
    if (d.kbd) {
      d.kbd.split('+').forEach(k => {
        const key = doc.createElement('kbd');
        key.textContent = k.trim();
        elKbd.append(key);
      });
    }
    elHint.textContent = d.disabled ? 'No disponible por ahora' : '';
    elFoot.hidden = !(d.kbd || d.disabled);
  }

  /* ───────────── Posicionamiento ───────────── */

  function place(el) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) { hide(true); return; }

    const inset = safeInsets();
    const vw = doc.documentElement.clientWidth;
    const vh = window.innerHeight;
    const minX = EDGE + inset.l, maxX = vw - EDGE - inset.r;
    const minY = EDGE + inset.t, maxY = vh - EDGE - inset.b;

    tip.style.left = '0px';
    tip.style.top = '0px';
    const w = tip.offsetWidth, h = tip.offsetHeight;

    // En elementos anchos, apunta a donde está el puntero en vez del centro.
    let cx = r.left + r.width / 2;
    if (curVia === 'mouse' && r.width > 240) cx = clamp(lastPX, r.left + 16, r.right - 16);
    const cy = r.top + r.height / 2;

    const room = {
      top: r.top - minY, bottom: maxY - r.bottom,
      left: r.left - minX, right: maxX - r.right
    };
    const need = { top: h + GAP, bottom: h + GAP, left: w + GAP, right: w + GAP };
    const pref = el.getAttribute('data-tip-pos');
    const order = pref && room[pref] !== undefined
      ? [pref, 'top', 'bottom', 'right', 'left']
      : ['top', 'bottom', 'right', 'left'];

    let side = order.find(p => room[p] >= need[p]);
    if (!side) side = room.top >= room.bottom ? 'top' : 'bottom';

    let x, y;
    if (side === 'top' || side === 'bottom') {
      x = cx - w / 2;
      y = side === 'top' ? r.top - h - GAP : r.bottom + GAP;
    } else {
      y = cy - h / 2;
      x = side === 'left' ? r.left - w - GAP : r.right + GAP;
    }
    x = clamp(x, minX, maxX - w);
    y = clamp(y, minY, maxY - h);

    tip.dataset.place = side;
    tip.style.left = Math.round(x) + 'px';
    tip.style.top = Math.round(y) + 'px';
    tip.style.setProperty('--ax', clamp(cx - x, 16, w - 16) + 'px');
    tip.style.setProperty('--ay', clamp(cy - y, 16, h - 16) + 'px');
    tip.style.setProperty('--sx', side === 'left' ? '6px' : side === 'right' ? '-6px' : '0px');
    tip.style.setProperty('--sy', side === 'top' ? '6px' : side === 'bottom' ? '-6px' : '0px');
  }

  /* ───────────── Mostrar / ocultar ───────────── */

  let current = null, curVia = '', pending = null;
  let showTimer = 0, hideTimer = 0, fadeTimer = 0, touchTimer = 0, watchTimer = 0;
  let lastHideAt = -1e9, lastPX = 0, suppressEl = null;
  let described = null;

  const warm = () => performance.now() - lastHideAt < WARM_WINDOW;

  function describe(el, d) {
    undescribe();
    if (!(d.desc || d.state || d.disabled)) return;
    const prev = el.getAttribute('aria-describedby');
    described = { el, prev };
    el.setAttribute('aria-describedby', prev ? prev + ' ' + tip.id : tip.id);
  }

  function undescribe() {
    if (!described) return;
    const { el, prev } = described;
    if (prev === null) el.removeAttribute('aria-describedby'); else el.setAttribute('aria-describedby', prev);
    described = null;
  }

  function show(el, via) {
    clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(touchTimer);
    pending = null;
    if (!el || !el.isConnected) return;
    const d = read(el);
    if (!d) { hide(true); return; }
    build();

    // Dentro de un <dialog> modal, el tooltip debe vivir dentro para no quedar detrás.
    const host = el.closest('dialog[open]') || doc.body;
    if (tip.parentNode !== host) {
      try { if (POPOVER) tip.hidePopover(); } catch (_) { /* ya estaba cerrado */ }
      host.append(tip);
    }

    current = el;
    curVia = via;
    clearTimeout(fadeTimer);
    render(d);
    describe(el, d);

    if (POPOVER) {
      try { if (!tip.matches(':popover-open')) tip.showPopover(); } catch (_) { /* sin soporte real */ }
    } else {
      tip.classList.add('is-mounted');
    }
    place(el);
    requestAnimationFrame(() => { if (current === el) tip.classList.add('is-visible'); });

    clearInterval(watchTimer);
    watchTimer = setInterval(() => {
      if (!current || !current.isConnected || !current.getClientRects().length) hide(true);
      else place(current);
    }, 250);

    if (via === 'touch') touchTimer = setTimeout(() => hide(), TOUCH_LIFETIME);
  }

  function hide(now) {
    clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(touchTimer);
    pending = null;
    if (!tip) return;
    clearInterval(watchTimer);
    undescribe();
    if (current) lastHideAt = performance.now();
    current = null;
    tip.classList.remove('is-visible');
    clearTimeout(fadeTimer);
    const done = () => {
      if (current) return;
      try { if (POPOVER) tip.hidePopover(); } catch (_) { /* ya cerrado */ }
      tip.classList.remove('is-mounted');
    };
    if (now === true || reduceMotion.matches) done(); else fadeTimer = setTimeout(done, FADE + 20);
  }

  function refresh() {
    if (!current) return;
    const d = read(current);
    if (!d) { hide(true); return; }
    render(d);
    describe(current, d);
    place(current);
  }

  function scheduleShow(el, delay, via) {
    clearTimeout(showTimer); clearTimeout(hideTimer);
    pending = { el, via };
    const wait = current ? 0 : delay;
    if (wait === 0) show(el, via); else showTimer = setTimeout(() => show(el, via), wait);
  }

  function scheduleHide(delay) {
    clearTimeout(showTimer);
    pending = null;
    if (!current) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hide(), delay);
  }

  /* ───────────── Mouse / lápiz ───────────── */

  let hoverEl = null;

  doc.addEventListener('pointerover', e => {
    lastPX = e.clientX;
    if (e.pointerType === 'touch') return;
    const el = tipTarget(e.target);
    if (el === hoverEl) return;
    hoverEl = el;
    if (el !== suppressEl) suppressEl = null;
    if (!el) { scheduleHide(90); return; }
    if (el === suppressEl) return;
    scheduleShow(el, warm() ? WARM_DELAY : HOVER_DELAY, 'mouse');
  }, true);

  doc.addEventListener('pointermove', e => {
    lastPX = e.clientX;
    if (lp) {
      const dist = Math.hypot(e.clientX - lp.x, e.clientY - lp.y);
      if (!lp.fired && dist > MOVE_TOLERANCE) { clearTimeout(lp.timer); lp = null; }
      else if (lp.fired && dist > MOVE_TOLERANCE * 1.5) hide(true);
    }
  }, true);

  doc.addEventListener('pointerleave', e => {
    if (e.target === doc.documentElement || e.target === doc) { hoverEl = null; scheduleHide(40); }
  }, true);

  /* ───────────── Táctil: pulsado largo ───────────── */

  let lp = null, swallowEl = null, swallowUntil = 0;

  doc.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') {
      suppressEl = tipTarget(e.target);   // no reaparece hasta salir y volver a entrar
      if (current || pending) hide(true);
      return;
    }
    if (current) hide(true);
    const el = tipTarget(e.target);
    if (!el || el.matches(NO_LONGPRESS) || el.closest('[data-tip-nolong]')) return;
    lp = {
      el, x: e.clientX, y: e.clientY, fired: false,
      timer: setTimeout(() => {
        if (!lp) return;
        lp.fired = true;
        lastPX = lp.x;
        show(el, 'touch');
        if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) { /* iOS */ } }
      }, LONG_PRESS)
    };
  }, true);

  function endPress() {
    if (!lp) return;
    clearTimeout(lp.timer);
    if (lp.fired) { swallowEl = lp.el; swallowUntil = performance.now() + 600; }
    lp = null;
  }
  doc.addEventListener('pointerup', endPress, true);
  doc.addEventListener('pointercancel', endPress, true);

  // Tras un pulsado largo, el botón NO debe activarse al soltar.
  doc.addEventListener('click', e => {
    if (swallowEl && performance.now() < swallowUntil && swallowEl.contains(e.target)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    swallowEl = null;
  }, true);

  doc.addEventListener('contextmenu', e => {
    if (lp || (swallowEl && performance.now() < swallowUntil + 400)) e.preventDefault();
  }, true);

  /* ───────────── Teclado ───────────── */

  doc.addEventListener('focusin', e => {
    const el = tipTarget(e.target);
    if (!el) return;
    let visible = true;
    try { visible = el.matches(':focus-visible'); } catch (_) { /* navegador viejo */ }
    if (visible) scheduleShow(el, FOCUS_DELAY, 'focus');
  }, true);

  doc.addEventListener('focusout', e => {
    const el = tipTarget(e.target);
    if (!el) return;
    if (current === el && curVia === 'focus') hide();
    else if (pending && pending.el === el) { clearTimeout(showTimer); pending = null; }
  }, true);

  doc.addEventListener('keydown', e => {
    if (e.key === 'Escape' && current) hide(true); // sin detener otros manejadores de Escape
  });

  /* ───────────── Cierre por contexto ───────────── */

  doc.addEventListener('scroll', () => {
    if (!current) return;
    if (curVia === 'focus') place(current); else hide(true);
  }, { capture: true, passive: true });

  addEventListener('resize', () => { if (current) place(current); });
  addEventListener('orientationchange', () => hide(true));
  addEventListener('blur', () => hide(true));
  addEventListener('pagehide', () => hide(true));
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) hide(true); });

  /* ───────────── Observador: títulos dinámicos y nodos nuevos ───────────── */

  const mo = new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => { if (n.nodeType === 1 && n !== tip && n !== probe) scan(n); });
        continue;
      }
      const t = m.target;
      if (tip && (t === tip || tip.contains(t))) continue;
      if (m.attributeName === 'title' || m.attributeName === 'aria-label') adopt(t);
      if (t === current) refresh();
    }
  });

  function init() {
    scan(doc.documentElement);
    mo.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['title', 'aria-label', 'aria-pressed', 'aria-checked', 'aria-expanded',
        'disabled', 'data-tip', 'data-tip-desc', 'data-tip-kbd']
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.yhwhTips = {
    version: '1.0',
    show: el => show(el, 'api'),
    hide: () => hide(true),
    scan
  };
})();
