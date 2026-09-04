# US19-APP — reglas del repositorio

PWA de un solo archivo. Sin build, sin dependencias, sin servidor.
`index.html` ronda las 23.000 líneas y `US19_DASHBOARD_API.gs` es el puente a Notion.

## Trampas de este código

**El hoisting no cruza bloques `<script>`.** Hay cinco. Una función declarada en el
bloque 5 no existe cuando corre el bloque 1. Por eso el arranque va dentro de
`DOMContentLoaded` y no al vuelo. Esto ya provocó una vez que el Panel saliera en blanco
en producción, y ninguna suite lo vio porque `eval` aplana los bloques.

**Vídeo contra imagen.** Tres ayudantes: `isVideoUrl`, `mediaThumb`, `mediaPlayer`.
En **listados siempre `mediaThumb`**, que pinta el póster `.jpg`. `mediaPlayer` (que sí
mete `<video>`) solo en la vista previa y en la ampliación. Un `<video>` en un listado de
cientos de tarjetas tumba el navegador.

**El importador de catálogo empareja por `id`, no por nombre.** Si empareja por nombre,
renombrar un ejercicio duplica la biblioteca del cliente.

**`loadSettings` tiene lista blanca.** Un ajuste nuevo que no se añada ahí se borra solo
en cada recarga, en silencio.

**`(x || [])` no protege de un objeto.** Solo de `null`. Con `localStorage` corrupto,
`(evs || []).forEach` tumbaba la vista entera. Usar `Array.isArray(x) ? x : []`.

## Al parchear

- Anclas de coincidencia exacta con `assert count == 1`. Cero o múltiples → abortar.
- Los heredocs de Bash **mutilan las barras invertidas** (`\n` se vuelve un salto real,
  `\b` un byte 0x08). Escribir los parches como archivo con la herramienta Write, o usar
  `chr(92)` en Python.
- Validar siempre: `node -e` recorriendo los bloques `<script>` con `new Function`.

## Las pruebas

28 suites, ~1.400 comprobaciones. Viven fuera del repo, en el scratchpad de la sesión.
Cada una hace `eval` de un trozo de `index.html` entre marcadores `/* ===XXX_END=== */`.
Si mueves código, comprueba que los cortes sigan encontrando lo que buscan: una suite que
se salta un bloque **pasa en verde sin probar nada**.

Las suites no pueden ver los bugs de arranque (el `eval` aplana los bloques). Para eso
hay que abrir la app en un navegador de verdad.

## Seguridad, tal como quedó

- El puente exige `API_CLAVE`; **sin ella no responde a nadie** (fail-closed).
- La clave se guarda **aparte de la URL**: enseñar la `/exec` no debe regalar el acceso.
- Ningún token vive en el repositorio. Van en Propiedades del script de Apps Script.
- Hay una CSP que acota `connect-src` a los seis hosts que la app usa de verdad.
- Respaldo y sincronización: PBKDF2-SHA256 con 600.000 vueltas. Cada sobre lleva escritas
  sus propias vueltas, así que los antiguos se siguen abriendo y se migran solos.
- **El repositorio es público.** Nunca escribas aquí datos de clientes ni credenciales.
