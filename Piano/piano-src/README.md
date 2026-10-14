# Código fuente de Piano YHWH

El código está organizado en partes numeradas por responsabilidad. Se concatenan en orden para generar `../piano.js`, que sigue siendo el módulo que carga la app.

Las partes comparten el mismo ámbito de módulo al generarse. Por eso pueden seguir usando el estado y las funciones comunes sin cambiar cómo funciona la app en el navegador.

## Reconstruir `piano.js`

Desde la carpeta `Piano`, ejecuta:

```powershell
node .\build-piano.mjs
```

Edita únicamente las partes numeradas. `piano.js` es un archivo generado; cualquier edición manual se reemplazará en la siguiente generación.

## Orden y contenido

1. `00-runtime-and-state.js`: importaciones, estado global y valores compartidos.
2. `05-instrument-runtime.js`: funciones de instrumentos que comparten el estado global del reproductor.
3. `10-song-library.js`: biblioteca, selección de canciones y letras.
4. `20-theory-and-learning.js`: teoría, lecciones, ejercicios y metrónomo.
5. `30-track-selection-and-timeline.js`: selección de pistas y línea de tiempo.
6. `40-player-visuals-and-settings.js`: visualización, teclado, apariencia y controles del reproductor.
7. `50-drum-pad-and-audio-cache.js`: Drum Pad, caché de audio y controles generales de sonido.
8. `60-instruments-and-playback.js`: muestras, instrumentos y reproducción.
9. `70-recording-auth-and-events.js`: grabación, inicio de sesión y enlace de controles.
10. `80-offline-firebase-device-settings.js`: audio sin conexión, Firebase y configuración del dispositivo.
11. `90-instrument-download-library.js`: catálogo y descarga previa de instrumentos.

El orden es significativo: las primeras partes declaran el estado compartido que usan las siguientes.
