# Instrucciones para editar Piano YHWH

## Fuente de `piano.js`

El código fuente editable de la lógica principal está en `piano-src/`, dividido en partes numeradas. **No edites `piano.js` directamente**: es un archivo generado y tus cambios se perderán al reconstruirlo.

Antes de modificar la lógica de la app:

1. Lee `piano-src/README.md` y localiza la parte que corresponde a la función que cambiarás.
2. Edita la parte numerada apropiada. Si el cambio cruza responsabilidades, modifica todas las partes necesarias.
3. Ejecuta `node .\build-piano.mjs` desde la carpeta `Piano` para regenerar `piano.js`.
4. Comprueba la sintaxis del bundle generado con `node --check .\piano.js`.

Las partes están ordenadas y se combinan en **un solo módulo de navegador**. No las conviertas en imports independientes sin refactorizar antes las variables y funciones que comparten.

## Mapa de partes

- `00-runtime-and-state.js`: importaciones, estado global y valores compartidos.
- `05-instrument-runtime.js`: funciones de instrumentos que comparten el estado global del reproductor.
- `10-song-library.js`: biblioteca, selección de canciones y letras.
- `20-metronome.js`: controles y sonido del metrónomo.
- `30-track-selection-and-timeline.js`: selección de pistas y línea de tiempo.
- `40-player-visuals-and-settings.js`: visualización, teclado, apariencia y controles del reproductor.
- `50-drum-pad-and-audio-cache.js`: Drum Pad, caché de audio y controles generales de sonido.
- `60-instruments-and-playback.js`: muestras, instrumentos y reproducción.
- `70-recording-auth-and-events.js`: grabación, inicio de sesión y enlace de controles.
- `80-offline-firebase-device-settings.js`: audio sin conexión, Firebase y configuración del dispositivo.
- `90-instrument-download-library.js`: catálogo y descarga previa de instrumentos.

Los archivos independientes `instrument-catalog.js`, `instrument-maps.js`, `tooltips.js` y `sw.js` se editan directamente cuando el cambio corresponde a ellos. Si modificas el contenido precargado o la estrategia de caché de `sw.js`, revisa también si hay que incrementar la versión de caché.

## Hojas de estilo

Los estilos son archivos CSS independientes cargados por `index.html`; edítalos directamente, sin paso de generación:

- `styles/base.css`: variables, estilos base y tipografía.
- `styles/layout.css`: estructura y distribución de pantallas.
- `styles/themes.css`: temas y variantes de color.
- `styles/components-1.css` a `styles/components-4.css`: estilos de componentes y funciones añadidas a la app.
- `piano.css`: hoja de compatibilidad que importa los CSS anteriores; `index.html` carga las hojas de `styles/` directamente.

Al editar CSS, escoge la hoja que corresponde a la función visual. Cada hoja se carga por separado, así que deja cada regla completa dentro del mismo archivo; no dividas un selector o bloque entre dos hojas. Si reorganizas o agregas hojas, actualiza también las referencias de `index.html` y la precarga del `sw.js`.
