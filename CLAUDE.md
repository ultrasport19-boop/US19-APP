# US19-APP — reglas del repositorio

PWA de un solo archivo. Sin build, sin dependencias, sin servidor.
`index.html` ronda las 23.000 líneas y `US19_DASHBOARD_API.gs` es el puente a Notion.

## Trampas de este código

**El hoisting no cruza bloques `<script>`.** Hay **tres** (verificado el 6-sep-2026:
7 aperturas `<script>` en el archivo, pero 4 son texto dentro de cadenas — las ventanas
de impresión — y solo hay 3 `</script>` de verdad). Una función declarada en el bloque 3
no existe cuando corre el bloque 1. Por eso el arranque va dentro de `DOMContentLoaded`
y no al vuelo. Esto ya provocó una vez que el Panel saliera en blanco en producción, y
ninguna suite lo vio porque `eval` aplana los bloques.

**Vídeo contra imagen.** Tres ayudantes: `isVideoUrl`, `mediaThumb`, `mediaPlayer`.
En **listados siempre `mediaThumb`**, que pinta el póster `.jpg`. `mediaPlayer` (que sí
mete `<video>`) solo en la vista previa y en la ampliación. Un `<video>` en un listado de
cientos de tarjetas tumba el navegador.

**El importador de catálogo empareja por `id`, no por nombre.** Si empareja por nombre,
renombrar un ejercicio duplica la biblioteca del cliente.

**`loadSettings` tiene lista blanca.** Un ajuste nuevo que no se añada ahí se borra solo
en cada recarga, en silencio.

**La biblioteca tiene tres dimensiones, no una.** `muscle` dice qué músculo; `cat` el tipo
de trabajo (Fuerza, Movilidad, Pliometría, Halterofilia, Strongman, Cardio: `LIB_CATS`);
`pat` el patrón de movimiento (Empuje, Tracción, Sentadilla, Bisagra, Zancada, Core,
Locomoción, Accesorio: `LIB_PATS`); y `niv` el nivel. Son independientes: una sentadilla
con salto es Pierna, Pliometría y Sentadilla a la vez. Los chips filtran por `cat`; los
selectores por patrón, músculo, material y nivel.

**`libTaxDe(e)` es el único sitio que decide tipo, patrón y nivel.** Devuelve lo escrito en
la ficha y, si falta, lo deduce del nombre con las mismas reglas que generaron el catálogo
(`clasificar_v3.py` en el scratchpad de la sesión del 6-sep-2026; la copia en JS es
`LIB_RE` y `LIB_PAT_REGLAS`). Nunca leas `e.cat` o `e.pat` a pelo en una vista: un
ejercicio creado a mano no los trae. Si cambias una regla, cámbiala en los dos sitios.

**El importador pisa la clasificación local, salvo `taxManual`.** Una versión anterior del
catálogo dejó `pat` y `niv` desfasados en los navegadores; por eso `_cus19Import` copia
`cat/niv/mec/pat` del catálogo aunque la ficha ya tuviera valor. La única excepción es
`taxManual: true`, que pone el formulario cuando Diego elige tipo, patrón o nivel a mano.

**El catálogo se amplía sobre el original, nunca sobre el ya ampliado.** Los ids `us19f…`
son los 320 que entraron desde free-exercise-db (dominio público) con GIF propio de dos
fotogramas (`videos/fed-*.gif`). Volver a correr un script de ampliación tomando como
entrada el `us19_catalogo.json` ya ampliado duplica ids en silencio.

**`(x || [])` no protege de un objeto.** Solo de `null`. Con `localStorage` corrupto,
`(evs || []).forEach` tumbaba la vista entera. Usar `Array.isArray(x) ? x : []`.

## Al parchear

- Anclas de coincidencia exacta con `assert count == 1`. Cero o múltiples → abortar.
- Los heredocs de Bash **mutilan las barras invertidas** (`\n` se vuelve un salto real,
  `\b` un byte 0x08). Escribir los parches como archivo con la herramienta Write, o usar
  `chr(92)` en Python.
- Validar siempre: `node -e` recorriendo los bloques `<script>` con `new Function`.

## Las pruebas

Están **en el repositorio**, en `tools/`. Antes vivían en el scratchpad de la sesión y se
perdían al cerrarla; esas 28 suites ya no existen y no se pueden recuperar.

| Comando | Qué comprueba |
|---|---|
| `node tools/validar_bloques.js index.html` | Sintaxis de cada bloque `<script>` por separado |
| `node tools/pruebas.js` | Estructura, vídeo/imagen, lista blanca de `loadSettings`, guardas, secretos |
| `node tools/humo.js --pegar` | El arranque, en un navegador de verdad |
| `sh tools/instalar_hook.sh` | Deja los dos primeros corriendo en cada commit |

**La regla de oro de `pruebas.js`: una prueba que no encuentra lo que buscaba falla, no
pasa en verde.** Si renombras `mediaThumb`, la prueba no se salta silenciosamente: aborta
diciendo que la función no existe. Ese era el fallo del banco anterior. Está verificado
con tres mutantes (meter `<video>` en `mediaThumb`, sacar una clave de la lista blanca,
renombrar una función): los tres se detectan.

`pruebas.js` **no puede ver los fallos de arranque**, porque evalúa trozos sueltos y eso
aplana los bloques. Para eso está `humo.js`, que pulsa las 9 pestañas en un navegador real
y comprueba que cada una se hace visible y pinta contenido. Playwright es opcional y no es
dependencia de la app: sin él, `--pegar` da el código para pegar en la consola (F12).

## Seguridad, tal como quedó

- El puente exige `API_CLAVE`; **sin ella no responde a nadie** (fail-closed).
- La clave se guarda **aparte de la URL**: enseñar la `/exec` no debe regalar el acceso.
- Ningún token vive en el repositorio. Van en Propiedades del script de Apps Script.
- Hay una CSP que acota `connect-src` a los seis hosts que la app usa de verdad.
- Respaldo y sincronización: PBKDF2-SHA256 con 600.000 vueltas. Cada sobre lleva escritas
  sus propias vueltas, así que los antiguos se siguen abriendo y se migran solos.
- **El repositorio es público.** Nunca escribas aquí datos de clientes ni credenciales.
