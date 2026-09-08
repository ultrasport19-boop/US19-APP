# US19-APP — reglas del repositorio

PWA de un solo archivo. Sin build, sin dependencias, sin servidor.
`index.html` es el archivo; `US19_DASHBOARD_API.gs` es el puente a Notion.

> **Las cifras de este documento envejecen.** No las copies: recuéntalas.
> ```sh
> wc -l < index.html                       # tamaño del archivo
> grep -o '<script'   index.html | wc -l   # aperturas (incluye las de dentro de cadenas)
> grep -o '</script>' index.html | wc -l   # bloques REALES
> node -e "console.log(JSON.parse(require('fs').readFileSync('us19_catalogo.json','utf8')).length)"
> node tools/validar_bloques.js index.html # los bloques, con sus líneas
> ```
> Al 8-sep-2026: 31.675 líneas · 8 aperturas · **3 bloques reales** · 2.377 fichas.

> **Los mutantes se aplican sobre una COPIA, nunca sobre `index.html`.** El 8-sep un script
> que mutaba el archivo de verdad tardó más de dos minutos, se fue a segundo plano y siguió
> escribiendo encima mientras yo editaba; al matarlo, su `finally` no llegó a correr y el
> archivo se quedó con un `if (false)` dentro. Para eso está `tools/mutantes.js`.

## Trampas de este código

**El hoisting no cruza bloques `<script>`.** Hay **tres**. Las aperturas `<script>` son
más que los bloques: las de más son texto dentro de cadenas (las ventanas de impresión) y
una vive en un comentario; los `</script>` son los que cuentan. Una función declarada en
el bloque 3 no existe cuando corre el bloque 1. Por eso el arranque va dentro de
`DOMContentLoaded` y no al vuelo. Esto ya provocó una vez que el Panel saliera en blanco
en producción, y ninguna suite lo vio porque `eval` aplana los bloques.

**Desde el 8-sep hay una prueba que SÍ lo ve:** `node tools/arranque.js` carga los tres
bloques **en orden y en el mismo contexto**, como el navegador, y dispara `DOMContentLoaded`.
Si un bloque llama al cargar a algo declarado más abajo, falla diciendo qué función y en qué
bloque está. También recoge lo que revienta dentro de un `setTimeout` — ahí vive el arranque
de esta app, y un error así tumbaba el proceso sin decir nada. No sustituye a `humo.js`:
aquí no hay pintado ni CSS, solo el orden de carga.

**Vídeo contra imagen.** Tres ayudantes: `isVideoUrl`, `mediaThumb`, `mediaPlayer`.
En **listados siempre `mediaThumb`**, que pinta el póster `.jpg`. `mediaPlayer` (que sí
mete `<video>`) solo en la vista previa y en la ampliación. Un `<video>` en un listado de
cientos de tarjetas tumba el navegador.

**El importador de catálogo empareja por `id`, no por nombre.** Si empareja por nombre,
renombrar un ejercicio duplica la biblioteca del cliente.

**`loadSettings` tiene lista blanca.** Un ajuste nuevo que no se añada ahí se borra solo
en cada recarga, en silencio.

**`encRestoreFromCache()` ya no es síncrona.** Desenvolver la llave pasa por IndexedDB,
así que devuelve una promesa y deja `_encRestaurando` en alto mientras tanto.
`syncUploadNow` y `_syncMaybeDecrypt` **esperan a `_encListo`** en vez de dar por
bloqueado el equipo; sin esa espera, cada arranque pedía la contraseña maestra por nada.
Quien añada otro camino que cifre o descifre tiene que esperar igual.

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

**`(x || [])` no protege de un objeto.** Solo de `null`, y con el `localStorage` corrupto
eso tumbó una vista entera. **Usa `u19Arr(x)`**, que es exactamente `Array.isArray(x) ? x : []`.
El 8-sep se convirtieron los **146** sitios que leían datos de disco (`c.informes`, `r.days`,
`c.estaciones`…); las variables locales se quedaron como estaban, porque nacen en la misma
función. `tools/pruebas.js` ya no lo avisa: **falla** si aparece uno nuevo.

**No confundas `u19Arr` con `u19Lista`.** `u19Lista` además quita los huecos, y eso **corre
los índices**: recorrer los días de una rutina con `forEach(function(d, i){…})` cambiaría de
significado si uno fuera nulo. Para un cambio mecánico hace falta la que no toca nada más.

**Los arrays de `state` SÍ están garantizados.** Los 168 sitios que llaman a
`state.clients.filter` sin guarda están bien: los cuatro caminos que los asignan —`loadState`,
la reparación de GIFs, importar un respaldo y bajar de la nube— comprueban con
`Array.isArray`. Ese invariante lo vigila `tools/pruebas.js` sobre los **75** sitios que asignan, y
exige que la comprobación sea una **guarda** (`if`, `&&`, `||`): un `Array.isArray` suelto
dentro de un objeto literal no protege nada, y dar eso por bueno ya escondió un mutante.

**Circuitos, pizarra y «en vivo» (7-sep-2026)** viven en el bloque 1, justo antes de
`/* --- Plantillas --- */`, en este orden: Búsqueda (`busqCoincide`, el único motor de
texto de la app), Pizarra, Rutina en vivo, Día ↔ circuito y Circuitos. `state.circuitos`
se espeja en **seis** puntos (carga, semilla, respaldo exportar/importar, sincronización
subir/bajar y borrado total): cualquier dato nuevo del estado va a esos seis sitios o se
pierde en algún camino. El editor de circuitos va en la vista, no en modal, porque el
selector de ejercicios ya es un modal. Los enlaces de circuito usan `#circuito/` y `#k/`
(nube con prefijo `k`); las vistas de quien recibe trabajan con objetos sueltos
(`circEnVivoObj`, `pizarraCircuitoObj`, `circImprimirObj`), nunca con `circGet`. En el
enlace del socio los ejercicios viajan como **array** (`findExerciseInShare`); para la
pizarra y el en vivo se vuelven mapa con `pzMapaCompartido`. La app tiene CSP sin
`unsafe-eval`: para pasar el humo en navegador se carga como `<script>` servido, no con
`eval`. Y la trampa que más ha mordido al parchear: una línea que cierra cadena (`…'`)
a la que se añade otra debajo pierde la comilla final, si no el bloque no parsea.
`tools/circuitos.js` fija el reparto de grupos, el plan del cronómetro y la búsqueda.

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
| `node tools/taxonomia.js` | Tipo, patrón y nivel de 22 ejercicios conocidos: las trampas de las reglas («pino», «tibial», «lat») |
| `node tools/circuitos.js` | Circuitos y búsqueda: reparto de grupos por estación, plan de fases, duración, tiempo por estación, plurales y sinónimos |
| `node tools/cifrado.js` | **Ejecuta** el cifrado, no lo lee: activar, cifrar/descifrar, sobre alterado, desbloquear en otro equipo, clave de recuperación y migración de los sobres de 150.000 vueltas |
| `node tools/humo.js --pegar` | El arranque, en un navegador de verdad |
| `node tools/humo_cifrado.js` | La caja fuerte **en el navegador de Diego**: que la llave esté en IndexedDB, no sea exportable y no quede nada en claro. Solo lee |
| `node tools/escalera.js` | **«Cómo construirlo» contra el catálogo real**: que la progresión ordene de menos a más, que no mezcle gestos distintos (un peso muerto no es una progresión de un puente), que toda familia tenga primer y último peldaño, y que la guía **no use lenguaje clínico** |
| `node tools/mutantes.js <lista>` | **Pone a prueba las pruebas**: aplica cada mutante y comprueba que la suite se pone roja. Trabaja sobre una COPIA — nunca toca `index.html`. Listas: `mutantes_escalera.json` (24), `mutantes_guardas.json` (7) y `mutantes_arranque.json` (8) |
| `node tools/telefono.js` | **El teléfono, contra la nube de verdad**: sin token y sin repositorio en ajustes, que el sobre de llaves se lea igual y que un secreto malo falle por cripto y no por «no encuentro la llave». Usa red, por eso no está en el hook |
| `node tools/arranque.js` | **La app EJECUTADA, sin navegador**: los tres bloques en orden, `DOMContentLoaded`, las **10 pestañas pintadas**, la ficha de un cliente con sus 4 solapas, el constructor, la escalera, los sustitutos y la biblioteca filtrada. Lo único que ve el fallo del hoisting **y** una llamada mal formada que parsea: así apareció el `concatu19Arr` |
| `sh tools/instalar_hook.sh` | Deja **las siete primeras** corriendo en cada commit que toque `index.html` |

**Leer el código no basta.** El 8-sep una conversión mecánica dejó tres
`out.concat(x || [])` convertidos en `out.concatu19Arr(x)`. **Eso parsea** —es una propiedad
que no existe— así que ni el validador de bloques ni las seis suites lo vieron: todas leen.
Lo cazó `arranque.js` **ejecutando**, a los diez minutos de existir. Cuando dudes entre una
prueba que lee y una que ejecuta, la que ejecuta encuentra otra clase de cosas.

**La regla de oro de `pruebas.js`: una prueba que no encuentra lo que buscaba falla, no
pasa en verde.** Si renombras `mediaThumb`, la prueba no se salta silenciosamente: aborta
diciendo que la función no existe. Ese era el fallo del banco anterior. Está verificado
con mutantes: meter `<video>` en `mediaThumb`, sacar una clave de la lista blanca,
renombrar una función, y los cuatro de la sección 7 (volver a meter el token en el enlace,
volver a subir en claro, quitar un `escapeHtml`, volcar `settings` entero). Todos se
detectan. `cifrado.js` aborta igual si no encuentra el módulo entre sus dos marcadores.

`pruebas.js` **no puede ver los fallos de arranque**, porque evalúa trozos sueltos y eso
aplana los bloques. Para eso está `humo.js`, que pulsa las 9 pestañas en un navegador real
y comprueba que cada una se hace visible y pinta contenido. Playwright es opcional y no es
dependencia de la app: sin él, `--pegar` da el código para pegar en la consola (F12).

## Seguridad, tal como quedó

- El puente exige `API_CLAVE`; **sin ella no responde a nadie** (fail-closed).
- La clave se guarda **aparte de la URL**: enseñar la `/exec` no debe regalar el acceso.
- Ningún token vive en el **código fuente**. Van en Propiedades del script de Apps Script.
- Hay una CSP que acota `connect-src` a los **siete** hosts que la app usa de verdad
  (github, raw.githubusercontent, calendly, script.google, script.googleusercontent,
  api.anthropic, api-ssl.bitly). Recuéntalos: `grep -oE "connect-src[^;\"]*" index.html`.
- Respaldo y sincronización: PBKDF2-SHA256 con **1.200.000 vueltas** (el doble de lo que
  pide OWASP, porque el sobre de llaves viaja en un repo público y se puede atacar sin
  límite desde casa). Cada sobre lleva escritas sus propias vueltas, así que los antiguos
  (600.000 y 150.000) se siguen abriendo y se migran solos la primera vez que se usan.
- **La master key no está en claro en ningún sitio.** Vive envuelta en `ultrasport19_mk2`
  por una AES-GCM 256 generada con `extractable:false` y guardada en IndexedDB
  (`us19_llave_dispositivo`): el navegador la usa, ningún JS puede exportarla, y un
  volcado de `localStorage` —una captura, una extensión, un respaldo— ya no descifra
  nada. `ultrasport19_mk` es el rastro de la v1 y se retira solo, pero **solo después de
  verificar que el envoltorio nuevo vuelve a abrir y da los mismos bytes**.
- **Segundo factor opcional con el PIN del entrenador** (`settings.encPinRequerido`, por
  dispositivo, no se sincroniza): debajo de la llave del equipo va otra capa derivada del
  PIN, así un perfil de navegador copiado entero tampoco abre. El PIN vive **solo en
  memoria** (`window._u19PinMem`); en disco está su SHA-256, que no descifra. Con el
  segundo factor puesto, `_encGuardarMK` **se niega a guardar sin el PIN**: antes que
  rebajar la protección en silencio, no guarda nada y el desbloqueo lo vuelve a pedir.
  Si se cambia el PIN, `u19CandadoCrear` vuelve a envolver la llave con el nuevo.
- La contraseña maestra exige 12 caracteres con mezcla (o 16 sin ella) y rechaza las
  obvias; se puede **cambiar sin regenerar la master key** (`encCambiarFrase`), que era la
  razón por la que nunca se cambiaba. La clave de recuperación son 20 caracteres de un
  alfabeto de 30 con descarte de muestras: 98 bits y sin el sesgo del `% 31` de antes.
  Todo esto, con siete mutantes que lo prueban, en `tools/cifrado.js`.
- **El sobre de llaves se lee sin token, a propósito.** `encFetchEnvelope` lo pide primero
  a la API con el token y, si eso no responde, por la vía pública de la rama `data`. Suena
  a rebaja y no lo es: el sobre son las dos llaves **envueltas** con PBKDF2 y esa rama ya
  es pública, así que no expone nada nuevo. Lo que arregla es un teléfono recién estrenado,
  que **no podía desbloquear nunca** porque sin token la API devolvía 401 y la función se
  tragaba el fallo. No lo vuelvas a atar al token.
- **Los errores del desbloqueo dicen la verdad.** El modal llamaba «contraseña incorrecta»
  a *cualquier* fallo, incluido no haber podido leer la llave; por eso en el móvil no había
  forma de saber qué pasaba. Ahora los errores propios llevan `encMotivo` y se muestran
  tal cual; «contraseña o clave incorrecta» queda solo para lo que de verdad lo es.
- **En el móvil manda lo que el usuario abrió, no qué campo tiene texto.** El gestor de
  contraseñas rellena solo el campo de contraseña, y la regla vieja —usar la clave de
  recuperación *solo* si ese campo estaba vacío— hacía que la clave buena no se probara
  jamás, sumando castigo en cada intento. Está en `encOrdenSecretos`, con sus mutantes.
- **Ningún respaldo se descarga solo en claro.** Hasta el 8-sep-2026 `_autoBackup` dejaba
  cada 7 días en Descargas un JSON sin cifrar con todos los socios. Ahora avisa; la copia
  buena es la cifrada de Ajustes, y `exportBackup` pide confirmación diciendo lo que se
  lleva. El resumen de «Datos y respaldos» enseña **los dos** relojes: antes miraba solo
  el cifrado y decía «nunca respaldado» aunque hubiera copias simples recientes.
- **La sincronización no sube sin cifrar.** `syncUploadNow` aborta si `encEnabled` es
  falso y `_syncPrepareContent` rechaza en vez de devolver el JSON plano. Antes el cifrado
  era opcional y venía apagado de fábrica, y por eso el estado entero acabó legible en la
  rama `data`.
- **Ningún token viaja dentro de un enlace compartido.** El bloque `sc` de los enlaces
  `#r/` llevaba `gt`/`bt` "enmascarados" con base64 invertido, que se deshace en una
  línea, y esos archivos viven en la rama pública. Sin ellos el socio sigue enviando su
  progreso: la vista cae sola al enlace largo `#progreso/`.
- **El repositorio es público.** Nunca escribas aquí datos de clientes ni credenciales.

## Cómo construirlo: la escalera

`u19ComoConstruir(id)` propone por dónde empezar un ejercicio y cómo ir subiendo. Está en
el bloque 3, junto a `u19Sustitutos`, y sale de tres piezas:

- **`u19EscPuntos`** puntúa la dificultad leyendo el **nombre**, con las reglas de
  `U19_ESC_REGLAS` a la vista (unilateral suma, palanca larga suma, carga suma; asistido
  resta, de rodillas resta, isométrico resta). `niv` no servía para esto: las 17 variantes
  de puente del catálogo son todas «Principiante», del puente en el suelo al de una pierna
  en banco con barra.
- **`u19EscRaiz`** saca el gesto del nombre. **Mismo patrón no es mismo gesto:** un peso
  muerto comparte patrón (Bisagra) y músculo (Glúteos) con un puente y no es una progresión
  suya. Sin la raíz, la escalera del puente salían **85 peldaños**.
- **`u19EscBanda(e, familia)`** reparte los cuatro escalones **sobre el rango de la propia
  familia**. Con una escala absoluta, «Dominadas asistidas» caía en el segundo escalón y el
  primero se quedaba vacío — o sea que «si no puede hacerlo, por dónde empieza», que es
  justo para lo que se hizo esto, no aparecía.

**Dos trampas ya pagadas.** El guion largo **no** basta para reconocer un clip de técnica:
«Puente de glúteos con banda — activación» lo lleva y es una regresión de verdad, de las
más útiles. Manda la cola (`U19_ESC_COLA_CLIP`), y «activación» nunca es clip. Y la lista
de palabras genéricas no puede incluir movimientos que ya son concretos: con «plancha»
dentro, «Plancha lateral» contaba como otro ejercicio y «Plancha» se quedaba sin escalera.

Lo que Diego mueve a mano vive en `escManual` sobre la ficha, y el importador del catálogo
no lo pisa (solo toca los campos de `TAXO` y solo si no hay `taxManual`).

**En la ficha del cliente** («Entrenamiento» → «Cómo entrena») la escalera contesta algo que
antes no se podía mirar: qué patrones toca esa persona **y en qué escalón**. Solo rutinas
activas. El escalón se memoriza por id dentro del render: `u19EscEscalera` recorre las 2.377
fichas en cada llamada, así que sin memorizar una ficha de 30 ejercicios haría 30 recorridos.

**Desde el constructor de rutinas** (botón 🪜 en cada fila del día) la escalera gana un
«Poner» en cada peldaño: `u19EscPonerEnRutina` cambia el ejercicio **conservando series,
repeticiones, peso, descanso, RIR y notas**. Eso es lo que hace que se use: borrar la fila
y volver a añadirla desde el selector pierde la prescripción entera, y por eso bajar un
escalón daba pereza.

**Y en «En vivo»** (botón 🪜 en los controles), con la persona delante:
`rlPonerEscalon` **no rehace el plan** —eso perdería el cronómetro, la serie en curso y el
progreso—, solo muta la fila y reapunta las fases que miraban a ella, incluido el
`siguiente` del descanso. Si la rutina es una de las guardadas, el cambio se queda y se
dice. **No aparece en la vista del socio**: con `_rlFichas` la rutina llegó por un enlace
compartido y eso es modo lectura.

**La trampa de «En vivo» no es de lógica, es de CSS.** `.circ-live` va a `z-index:9000` y
`.modal-overlay` a `100`: sin `body.circ-live-open .modal-overlay{z-index:9500}` la
escalera se abre **detrás** de la pantalla negra y el botón parece no hacer nada. Cualquier
otro modal que se abra desde una vista viva tiene el mismo problema.

`tools/escalera.js`: **153 comprobaciones** contra el catálogo real —el modal, el constructor,
la sesión en vivo y la ficha del cliente, ejecutados con un navegador de mentira— y
**24 mutantes** en `tools/mutantes_escalera.json` que caen todos, el del `z-index` incluido.

**Cuidado con el coste:** `u19EscEscalera` recorre las 2.377 fichas en cada llamada. Dos
comprobaciones que la llamaban dentro de un bucle sobre el catálogo hicieron que la suite
pasara de 3 s a **más de dos minutos** — y corre en cada commit. Se agrupa por
raíz+músculo+patrón en una pasada, con una comprobación que verifica contra la función real
que agrupar así da lo mismo. El hook completo tarda **12,6 s**, de los cuales 10 son el
cifrado (PBKDF2 a 1,2 M de vueltas, que es coste buscado).

## Dos reglas que no son código

**NUNCA subas `SEED_VERSION`.** `loadState` no distingue «no hay nada» de «hay datos con
semilla vieja»: en los dos casos planta `SEED_DATA` y llama a `saveState()`, que programa
subida. Subir esa constante borra clientes, rutinas y circuitos en todos los navegadores.
Para refrescar el catálogo, migración explícita.

**No muevas a `u19Arrancar()` los `document.getElementById` del nivel superior del
bloque 1.** Hoy funcionan por el orden del DOM. Moverlos toca justo el orden de arranque,
que es la trampa que ya dejó el Panel en blanco una vez.
