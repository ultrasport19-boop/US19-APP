/* =====================================================================
 * US19-APP · Banco de pruebas persistente
 * ---------------------------------------------------------------
 * Uso:  node tools/pruebas.js [ruta/index.html]
 *
 * POR QUE VIVE AQUI Y NO EN EL SCRATCHPAD
 * Las 28 suites anteriores vivian en la carpeta temporal de la sesion y
 * desaparecian al cerrarla. Este archivo esta versionado: sobrevive.
 *
 * LA REGLA DE ORO DE ESTE ARCHIVO
 * Una prueba que no encuentra lo que buscaba NO pasa en verde: falla.
 * El CLAUDE.md ya avisaba de que "una suite que se salta un bloque pasa
 * en verde sin probar nada". Aqui cada extraccion se verifica: si un
 * marcador o una funcion no aparece, o lo extraido no parsea, es FALLO.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');

const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

/* --- Marcador de resultados ---------------------------------------- */
let ok = 0, fallos = [], avisos = [];

function pasa(nombre) { ok++; }
function falla(nombre, detalle) { fallos.push(nombre + (detalle ? '  →  ' + detalle : '')); }
function aviso(txt) { avisos.push(txt); }

function comprobar(nombre, condicion, detalle) {
  if (condicion) pasa(nombre); else falla(nombre, detalle);
}
function igual(nombre, obtenido, esperado) {
  if (obtenido === esperado) pasa(nombre);
  else falla(nombre, 'esperaba ' + JSON.stringify(esperado) + ', obtuvo ' + JSON.stringify(obtenido));
}

/* --- Extraccion verificada ------------------------------------------
   Saca una funcion por nombre contando llaves. Si no la encuentra, o lo
   extraido no parsea, aborta: es exactamente el fallo silencioso que
   este archivo existe para impedir. */
function extraerFuncion(nombre) {
  const re = new RegExp('(^|\\n)\\s*function\\s+' + nombre + '\\s*\\(');
  const m = re.exec(src);
  if (!m) {
    falla('EXTRACCION ' + nombre, 'la funcion no existe en index.html (¿la renombraron?)');
    return null;
  }
  const ini = m.index + m[1].length;
  const abre = src.indexOf('{', ini);
  let d = 0, fin = -1;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === '{') d++;
    else if (src[i] === '}') { d--; if (d === 0) { fin = i; break; } }
  }
  if (fin < 0) { falla('EXTRACCION ' + nombre, 'llaves sin equilibrar'); return null; }
  const codigo = src.slice(ini, fin + 1);
  try { new Function(codigo); }
  catch (e) { falla('EXTRACCION ' + nombre, 'lo extraido no parsea: ' + e.message); return null; }
  return codigo;
}

/* =====================================================================
 * 1 · ESTRUCTURA DEL ARCHIVO
 * ===================================================================== */

(function estructura() {
  const cierres = (src.match(/<\/script>/g) || []).length;
  const bloques = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src)) !== null) bloques.push(m[1]);

  igual('estructura · bloques <script> reales', bloques.length, cierres);
  comprobar('estructura · hay al menos un bloque', bloques.length > 0);

  bloques.forEach(function (b, i) {
    try { new Function(b); pasa('estructura · bloque ' + (i + 1) + ' parsea'); }
    catch (e) { falla('estructura · bloque ' + (i + 1) + ' parsea', e.message); }
  });

  const funcs = src.match(/^function\s+[A-Za-z0-9_$]+/gm) || [];
  const cnt = {};
  funcs.forEach(function (f) {
    const k = f.replace(/^function\s+/, '');
    cnt[k] = (cnt[k] || 0) + 1;
  });
  const dup = Object.keys(cnt).filter(function (k) { return cnt[k] > 1; });
  comprobar('estructura · sin funciones top-level duplicadas', dup.length === 0, dup.join(', '));

  const raros = [...src].filter(function (c) {
    const n = c.charCodeAt(0);
    return n < 32 && c !== '\n' && c !== '\r' && c !== '\t';
  }).length;
  igual('estructura · sin caracteres de control sueltos', raros, 0);

  /* Los marcadores delimitan las regiones que las pruebas cortan.
     Uno duplicado hace que un corte agarre el trozo equivocado. */
  const marcas = src.match(/\/\* *===[A-Z0-9_]+_END=== *\*\//g) || [];
  const vistos = {}, repetidas = [];
  marcas.forEach(function (x) {
    if (vistos[x]) repetidas.push(x); else vistos[x] = 1;
  });
  comprobar('estructura · marcadores END unicos', repetidas.length === 0, repetidas.join(', '));
  comprobar('estructura · hay marcadores END', marcas.length > 0);

  aviso('bloques <script> reales: ' + bloques.length +
        '  ·  funciones top-level: ' + funcs.length +
        '  ·  marcadores END: ' + marcas.length);
})();

/* =====================================================================
 * 2 · VIDEO CONTRA IMAGEN
 * La trampa mas cara del archivo: un <video> en un listado de cientos
 * de tarjetas tumba el navegador. mediaThumb NUNCA puede emitir <video>.
 * ===================================================================== */

(function video() {
  const partes = ['escapeHtml', 'escapeAttr', 'isVideoUrl', 'posterUrl', 'mediaThumb', 'mediaPlayer']
    .map(extraerFuncion);
  if (partes.some(function (p) { return !p; })) return;

  let api;
  try {
    api = new Function(partes.join('\n') +
      '\nreturn { isVideoUrl, posterUrl, mediaThumb, mediaPlayer };')();
  } catch (e) {
    falla('video · las funciones se evaluan', e.message);
    return;
  }

  igual('video · .mp4 es video', api.isVideoUrl('a/b.mp4'), true);
  igual('video · .webm es video', api.isVideoUrl('a/b.webm'), true);
  igual('video · .mov es video', api.isVideoUrl('a/b.MOV'), true);
  igual('video · .mp4 con query es video', api.isVideoUrl('a/b.mp4?v=2'), true);
  igual('video · .mp4 con hash es video', api.isVideoUrl('a/b.mp4#t=1'), true);
  igual('video · .jpg no es video', api.isVideoUrl('a/b.jpg'), false);
  igual('video · .png no es video', api.isVideoUrl('a/b.png'), false);
  igual('video · cadena vacia no es video', api.isVideoUrl(''), false);
  igual('video · null no es video', api.isVideoUrl(null), false);
  igual('video · undefined no es video', api.isVideoUrl(undefined), false);
  igual('video · "video.mp4.jpg" no es video', api.isVideoUrl('video.mp4.jpg'), false);

  igual('video · poster cambia la extension', api.posterUrl('x/y.mp4'), 'x/y.jpg');
  igual('video · poster respeta la query', api.posterUrl('x/y.mp4?v=2'), 'x/y.jpg?v=2');
  igual('video · poster deja las imagenes igual', api.posterUrl('x/y.jpg'), 'x/y.jpg');

  /* LA COMPROBACION QUE IMPORTA */
  const thumbVideo = api.mediaThumb('x/y.mp4', 'class="t"');
  comprobar('video · mediaThumb NUNCA emite <video>', thumbVideo.indexOf('<video') === -1, thumbVideo.slice(0, 120));
  comprobar('video · mediaThumb pinta el poster .jpg', thumbVideo.indexOf('x/y.jpg') !== -1, thumbVideo.slice(0, 120));
  comprobar('video · mediaThumb guarda la url real en data-media', thumbVideo.indexOf('data-media') !== -1);

  const thumbImg = api.mediaThumb('x/y.jpg', '');
  comprobar('video · mediaThumb sin data-media en imagenes', thumbImg.indexOf('data-media') === -1);
  comprobar('video · mediaThumb de imagen sigue siendo <img>', thumbImg.indexOf('<img') === 0);

  const playV = api.mediaPlayer('x/y.mp4', '');
  comprobar('video · mediaPlayer si emite <video>', playV.indexOf('<video') === 0, playV.slice(0, 80));
  comprobar('video · mediaPlayer pone poster', playV.indexOf('poster="x/y.jpg"') !== -1);
  const playI = api.mediaPlayer('x/y.png', '');
  comprobar('video · mediaPlayer de imagen es <img>', playI.indexOf('<img') === 0);
})();

/* =====================================================================
 * 3 · LA LISTA BLANCA DE loadSettings
 * Un ajuste nuevo que no se anada a loadSettings se borra solo en cada
 * recarga, en silencio. Esta prueba compara las claves del objeto
 * settings con las que loadSettings lee de verdad.
 * ===================================================================== */

(function ajustes() {
  const m = /(?:^|\n)\s*var\s+settings\s*=\s*\{([\s\S]*?)\};/.exec(src);
  if (!m) { falla('ajustes · encontrar el objeto settings', 'no aparece "var settings = {"'); return; }

  const claves = [];
  const reClave = /(?:^|[,{])\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g;
  let c;
  while ((c = reClave.exec(m[1])) !== null) claves.push(c[1]);
  comprobar('ajustes · el objeto settings tiene claves', claves.length > 0);

  const cuerpo = extraerFuncion('loadSettings');
  if (!cuerpo) return;

  const leidas = {};
  const reLeida = /\bp\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let l;
  while ((l = reLeida.exec(cuerpo)) !== null) leidas[l[1]] = true;

  const huerfanas = claves.filter(function (k) { return !leidas[k]; });
  comprobar(
    'ajustes · loadSettings lee las ' + claves.length + ' claves de settings',
    huerfanas.length === 0,
    huerfanas.length ? 'se borran solas al recargar: ' + huerfanas.join(', ') : ''
  );

  const sobran = Object.keys(leidas).filter(function (k) { return claves.indexOf(k) === -1; });
  comprobar('ajustes · loadSettings no lee claves inexistentes', sobran.length === 0, sobran.join(', '));

  /* c) La tercera direccion, que es la que faltaba y por donde se colaron
     dos ajustes reales.

     `saveSettings()` guarda el objeto settings ENTERO, asi que un
     `settings.loQueSea = x` escrito en cualquier rincon del archivo se
     graba igual; la lista blanca de `loadSettings` es la que decide que
     vuelve. Un ajuste que se escribe pero no esta declarado se guarda y
     NO vuelve: se pierde en cada recarga, sin decir nada.

     Asi vivieron `calendlyOrgUri` —que costaba una llamada a Calendly por
     recarga, del presupuesto de 100 al dia que se comparte con el bot— y
     `dashPanelsOpen`, que volvia a abrir los paneles del tablero. Las dos
     comprobaciones de arriba pasaban en verde porque ninguna de las dos
     claves estaba declarada en ningun sitio. */
  const usadas = {};
  const reUso = /\bsettings\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let u;
  while ((u = reUso.exec(src)) !== null) usadas[u[1]] = true;
  const sinDeclarar = Object.keys(usadas).filter(function (k) { return claves.indexOf(k) === -1; });
  comprobar('ajustes · no hay ningun settings.X sin declarar arriba',
    sinDeclarar.length === 0,
    'se guardan y NO vuelven al recargar: ' + sinDeclarar.join(', ') +
    ' — anadelos al objeto settings y a loadSettings');

  aviso('ajustes: ' + claves.length + ' claves en settings, ' + Object.keys(leidas).length +
        ' leidas por loadSettings, ' + Object.keys(usadas).length + ' usadas en el archivo');
})();

/* =====================================================================
 * 4 · GUARDAS CONTRA localStorage CORRUPTO
 * "(x || [])" solo protege de null. Con un objeto guardado por error,
 * "(evs || []).forEach" tumbaba la vista entera. El caso documentado no
 * puede volver.
 * ===================================================================== */

(function guardas() {
  const evs = /\(\s*evs\s*\|\|\s*\[\]\s*\)\s*\.\s*(forEach|map|filter|reduce|some|every|sort)/.test(src);
  comprobar('guardas · el caso documentado (evs || []) no ha vuelto', !evs);

  /* Este aviso salia en cada corrida —«146 usos de (x || []).metodo…»— y
     acabo siendo parte del paisaje. El 8-sep se convirtieron a u19Arr() los
     146 que leen datos de disco, asi que deja de ser un aviso y pasa a ser
     una alarma: si vuelve a aparecer uno, es un sitio nuevo donde un objeto
     guardado por error tumba la vista. */
  const rutas = (src.match(/\(\s*[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z0-9_$]+)+\s*\|\|\s*\[\]\s*\)/g) || []);
  comprobar('guardas · ningun dato de disco se protege ya con "(x || [])"',
    rutas.length === 0,
    rutas.slice(0, 4).join('  ') + (rutas.length > 4 ? '  y ' + (rutas.length - 4) + ' mas' : '')
      + '  ← usar u19Arr(x), que si distingue un objeto de un array');

  /* Y que el ayudante haga lo que dice, ejecutandolo de verdad. */
  const desde = src.indexOf('function u19Arr(');
  if (desde < 0) falla('guardas · u19Arr() no esta en index.html');
  else {
    const cuerpo = src.slice(desde);
    const u19Arr = new Function('return ' + cuerpo.slice(0, cuerpo.indexOf('\n}\n') + 3))();
    const dentro = [1, 2];
    comprobar('u19Arr · un array pasa tal cual, sin copiar', u19Arr(dentro) === dentro);
    igual('u19Arr · un objeto guardado por error se vuelve array vacio', u19Arr({ a: 1 }).length, 0);
    igual('u19Arr · una cadena tambien: no se recorre letra a letra', u19Arr('abc').length, 0);
    igual('u19Arr · null', u19Arr(null).length, 0);
    igual('u19Arr · undefined', u19Arr(undefined).length, 0);
    igual('u19Arr · un numero', u19Arr(7).length, 0);
    /* La diferencia con u19Lista es la razon de que existan las dos:
       u19Lista quita los huecos, y eso CORRE LOS INDICES. */
    igual('u19Arr · NO quita los huecos, a diferencia de u19Lista', u19Arr([1, null, 3]).length, 3);
  }

  /* LA FRONTERA. Hay 168 sitios que llaman a state.clients.filter,
     state.routines.forEach y compañía SIN guarda, y estan bien: los
     cuatro caminos que asignan esos arrays —loadState, la reparacion de
     GIFs, importar un respaldo y bajar de la nube— comprueban antes con
     Array.isArray. Ese es el invariante que hace segura toda la app; si
     alguien añade un quinto camino sin comprobar, se cae aqui y no en la
     pantalla de Diego. */
  const CAMPOS = 'clients|routines|exercises|protocols|trash|circuitos|libRec|horasExtra';
  const lineas = src.split('\n');
  const asignaciones = lineas
    .map((l, i) => ({ n: i + 1, l }))
    .filter(x => new RegExp('(?<![\\w.])state\\.(' + CAMPOS + ')\\s*=[^=]').test(x.l));
  const sinGuardia = asignaciones.filter(x => {
    if (/Array\.isArray/.test(x.l)) return false;                          // comprobado en la linea
    if (/=\s*u19(Arr|Lista)\s*\(/.test(x.l)) return false;                 // comprobado por el ayudante
    if (new RegExp('state\\.(' + CAMPOS + ')\\s*=\\s*state\\.').test(x.l)) return false; // filtrado de si mismo
    if (/=\s*\[\s*\]/.test(x.l)) return false;                             // vaciado explicito
    if (/=[^=]*\.(slice|filter|map|concat)\s*\(/.test(x.l)) return false;  // devuelven array siempre
    if (/SEED_DATA\./.test(x.l)) return false;                             // la semilla de la app
    /* Y el caso normal, que la version anterior de esta comprobacion no
       veia: la guarda esta unas lineas ARRIBA, envolviendo la asignacion.
       `if (Array.isArray(data.exercises)){ … state.exercises = data.exercises; }`
       es correcto y se leia como un fallo. Se busca la comprobacion del
       MISMO origen en las seis lineas anteriores. */
    const m = new RegExp('state\\.(?:' + CAMPOS + ')\\s*=\\s*([A-Za-z_$][\\w.$]*)').exec(x.l);
    if (!m) return true;
    const origen = m[1].replace(/[.$]/g, c => '\\' + c);
    const antes = lineas.slice(Math.max(0, x.n - 7), x.n - 1).join('\n');
    /* Y tiene que ser una GUARDA, no un Array.isArray cualquiera. Con solo
       buscar el texto, esto daba por bueno el respaldo: seis lineas mas
       arriba hay un `clients: Array.isArray(data.clients) ? … : 0` dentro
       del objeto que cuenta cuantos vienen, y eso no protege nada. Lo caza
       un mutante que quita la guarda de verdad. */
    return !new RegExp('(if\\s*\\(|&&\\s*|\\|\\|\\s*)!?Array\\.isArray\\(' + origen + '\\)').test(antes);
  });
  comprobar('frontera · todo lo que asigna un array de state comprueba antes que lo sea',
    sinGuardia.length === 0,
    sinGuardia.slice(0, 3).map(x => 'linea ' + x.n + ': ' + x.l.trim().slice(0, 90)).join('  |  '));
  aviso('frontera: ' + asignaciones.length + ' sitios asignan arrays de state; todos comprueban');

  /* LA CICATRIZ DE LA CONVERSION MECANICA. Al cambiar 146 sitios de
     `(x || [])` a `u19Arr(x)`, la expresion regular se comio el parentesis
     de la llamada anterior en tres sitios: `.concat(c.d || [])` quedo como
     `.concatu19Arr(c.d)`. Eso PARSEA —es una propiedad que no existe— asi
     que ni el validador de bloques ni ninguna suite lo vieron. Lo cazo
     `arranque.js`, ejecutando. Aqui queda la alarma barata. */
  const pegadas = [...new Set((src.match(/[A-Za-z_$][\w$]*u19(Arr|Lista)\s*\(/g) || []))]
    .filter(t => !/^u19(Arr|Lista)\s*\($/.test(t));
  igual('guardas · ninguna llamada quedó pegada a u19Arr por la conversión',
    pegadas.join(', '), '');

  const isArr = (src.match(/Array\.isArray/g) || []).length;
  aviso('guardas: ' + (src.split('u19Arr(').length - 1) + ' usos de u19Arr y ' + isArr + ' de Array.isArray');
})();

/* =====================================================================
 * 5 · EL IMPORTADOR EMPAREJA POR id, NO POR NOMBRE
 * Si empareja por nombre, renombrar un ejercicio duplica la biblioteca
 * del cliente.
 * ===================================================================== */

(function importador() {
  const re = /function\s+([A-Za-z0-9_$]*[Ii]mport[A-Za-z0-9_$]*)\s*\(/g;
  const nombres = [];
  let m;
  while ((m = re.exec(src)) !== null) nombres.push(m[1]);
  comprobar('importador · existe alguna funcion de importacion', nombres.length > 0);
  aviso('importador: funciones detectadas → ' + (nombres.join(', ') || 'ninguna'));
})();

/* =====================================================================
 * 6 · NADA DE SECRETOS  →  se mudo a tools/secretos.js
 *
 * Estaba aqui, y aqui tenia un agujero de forma: este archivo solo corre
 * cuando el commit toca index.html. Un token pegado en tools/algo.js, en
 * el .gs del puente o en una nota entraba sin que nadie mirara.
 *
 * Suelto y como primera barrera del hook, corre siempre, toque lo que
 * toque el commit — igual que en US19 y en el asistente.
 *
 *   node tools/secretos.js
 * ===================================================================== */

/* =====================================================================
 * 7 · LO QUE SALE DE ESTE NAVEGADOR
 * Tres agujeros reales, tapados el 8-sep-2026. Cada comprobacion de aqui
 * defiende uno; si alguna se pone roja, se volvio a abrir:
 *   a) el token de GitHub viajaba dentro de cada enlace compartido
 *   b) la sincronizacion subia el estado en claro a una rama publica
 *   c) un enlace de progreso trucado ejecutaba JavaScript en la app
 * ===================================================================== */

(function loQueSale() {

  /* --- a) Ningun token dentro de un enlace --------------------------- */

  comprobar('salida · el enlace compartido no lleva tokens',
    !/maskToken\s*\(\s*settings\./.test(src),
    'maskToken(settings.…) vuelve a meter una llave en el payload que se sube a la rama publica');

  /* maskToken y unmaskToken siguen haciendo falta: los enlaces repartidos
     antes del arreglo todavia traen sc.gt y hay que saber leerlos. */
  comprobar('salida · unmaskToken sigue existiendo (enlaces antiguos)',
    extraerFuncion('unmaskToken') !== null);

  /* --- b) Nunca subir el estado en claro ----------------------------- */

  const prep = extraerFuncion('_syncPrepareContent');
  if (prep) {
    comprobar('salida · _syncPrepareContent no devuelve el estado en claro',
      !/Promise\.resolve\s*\(\s*jsonStr\s*\)/.test(prep),
      'volvio a resolver con el JSON sin cifrar');
    comprobar('salida · _syncPrepareContent rechaza si falta la clave',
      /Promise\.reject/.test(prep));
  }

  const subir = extraerFuncion('syncUploadNow');
  if (subir) {
    comprobar('salida · syncUploadNow aborta sin cifrado activo',
      /!\s*settings\.encEnabled/.test(subir),
      'sin esta guarda, el estado de los socios sube legible a la rama de datos');
  }

  /* --- b bis) El respaldo no reparte las llaves ---------------------- */

  const exp = extraerFuncion('exportBackup');
  if (exp) {
    comprobar('salida · exportBackup no vuelca settings entero',
      !/\bsettings:\s*settings\s*,/.test(exp),
      'el respaldo plano vuelve a llevarse githubToken, bitlyToken, calendlyToken, claudeKey y dashClave');
    comprobar('salida · exportBackup limpia los campos secretos',
      /RESP_SECRETO_CAMPOS/.test(exp));
  }

  const imp = extraerFuncion('importBackup');
  if (imp) {
    /* Si el respaldo ya no trae llaves, restaurarlo no debe borrar las que
       este navegador si tiene. Sin esto, el arreglo de arriba rompe la app. */
    comprobar('salida · importBackup conserva las llaves locales',
      /RESP_SECRETO_CAMPOS/.test(imp),
      'restaurar un respaldo volveria a dejar los tokens en blanco');
  }

  /* --- c) Nada del enlace se pinta sin pasar por un filtro ----------- */

  const rep = extraerFuncion('showProgressReport');
  if (rep) {
    /* stats llega dentro del enlace y pct acaba en un atributo style. */
    comprobar('salida · showProgressReport fuerza stats.pct a numero',
      /Number\s*\(\s*stats\.pct\s*\)/.test(rep),
      'un pct de texto libre dentro de style="width:…" es ejecutable');
    ['done', 'partial', 'total'].forEach(function (c) {
      comprobar('salida · showProgressReport fuerza stats.' + c + ' a numero',
        new RegExp('Number\\s*\\(\\s*stats\\.' + c + '\\s*\\)').test(rep));
    });
    comprobar('salida · la celda Plan escapa las reps del enlace',
      !/plan-cell">'\s*\+\s*\(\s*rowEx\.reps/.test(rep),
      'rowEx.reps vuelve a pintarse sin escapeHtml, y viene del enlace');
  }

})();

/* =====================================================================
 * 8 · PARIDAD DE CLAVES DEL ESTADO
 * La comprobacion que mas perdida de datos evita del repositorio.
 *
 * Cada coleccion de `state` tiene que estar decidida A PROPOSITO en tres
 * sitios: la sincronizacion, el respaldo y el borrado total. Cuando una
 * clave nueva se olvida en alguno, no falla nada visible: simplemente ese
 * dato no viaja, o sobrevive a un borrado. Asi es como horasExtra y trash
 * se quedaron fuera de la sincronizacion sin que nadie lo notara.
 *
 * Aqui se declara la decision. Una clave nueva sin declarar FALLA: obliga
 * a decidir en vez de olvidar.
 * ===================================================================== */

(function paridadDeClaves() {

  const DECIDIDO = {
    clients:    { sync: true,  respaldo: true,  borrado: true },
    routines:   { sync: true,  respaldo: true,  borrado: true },
    exercises:  { sync: true,  respaldo: true,  borrado: true },
    protocols:  { sync: true,  respaldo: true,  borrado: true },
    libFav:     { sync: true,  respaldo: true,  borrado: true },
    libRec:     { sync: true,  respaldo: true,  borrado: true },
    circuitos:  { sync: true,  respaldo: true,  borrado: true },
    /* Las series de sesiones, en el estado desde el 11-sep-2026. Antes vivian
       en una clave suelta de localStorage y no viajaban ni con la
       sincronizacion ni con el respaldo: una serie creada en el PC no existia
       en el telefono. */
    series:     { sync: true,  respaldo: true,  borrado: true },

    /* horasExtra NO se sincroniza, a proposito. Un equipo que solo anadio
       horas no mueve las fechas de rutinas ni clientes; meterlo en el payload
       antes de que localTime sea de fiar convertiria la divergencia de hoy en
       borrado. Viaja en el respaldo, que si es una accion explicita.
       Revisar solo con una prueba de fusion de por medio. */
    horasExtra: { sync: false, respaldo: true,  borrado: true },

    /* trash es el bufer de deshacer, LOCAL por diseno: se autopurga a los 30
       dias y la papelera hace t.routine.name sin comprobar, asi que una
       entrada que no sea una rutina la revienta. Lo que si es obligatorio es
       que un "borrar TODO" se la lleve. */
    trash:      { sync: false, respaldo: false, borrado: true },
  };

  const cuerpos = {
    sync:    extraerFuncion('buildSyncPayload'),
    respaldo: extraerFuncion('exportBackup'),
    borrado: extraerFuncion('wipeAll'),
  };
  const loadState = extraerFuncion('loadState');

  /* a) Ninguna clave del estado puede quedar sin declarar. */
  if (loadState) {
    const asignadas = {};
    (loadState.match(/state\.([A-Za-z0-9_$]+)\s*=/g) || []).forEach(function (m) {
      asignadas[m.replace(/^state\./, '').replace(/\s*=$/, '')] = true;
    });
    /* lastChangeAt es la marca de agua de saveState, no una coleccion. */
    delete asignadas.lastChangeAt;
    const sinDeclarar = Object.keys(asignadas).filter(function (k) { return !DECIDIDO[k]; });
    comprobar('paridad · toda clave de loadState esta declarada arriba',
      sinDeclarar.length === 0,
      'sin decidir: ' + sinDeclarar.join(', ') + ' — anadela a DECIDIDO diciendo si viaja en sync, respaldo y borrado');
  }

  /* b) Y cada una tiene que aparecer donde se declaro que aparece. */
  Object.keys(DECIDIDO).forEach(function (clave) {
    ['sync', 'respaldo', 'borrado'].forEach(function (sitio) {
      const cuerpo = cuerpos[sitio];
      if (!cuerpo) return;                       // extraerFuncion ya marco el fallo
      const esperado = DECIDIDO[clave][sitio];
      const re = new RegExp('(state\\.' + clave + '\\b|\\b' + clave + '\\s*:)');
      const esta = re.test(cuerpo);
      if (esperado) {
        comprobar('paridad · ' + clave + ' aparece en ' + sitio, esta,
          'se declaro que viaja y no esta: ese dato se pierde en ese camino');
      } else {
        comprobar('paridad · ' + clave + ' NO aparece en ' + sitio, !esta,
          'aparece pero se declaro que no debia — lee el motivo en DECIDIDO antes de cambiar la declaracion');
      }
    });
  });

  /* c) La marca de agua que decide quien gana. */
  const saveState = extraerFuncion('saveState');
  if (saveState) {
    comprobar('paridad · saveState escribe state.lastChangeAt',
      /state\.lastChangeAt\s*=/.test(saveState),
      'sin ella, la sincronizacion vuelve a decidir por las fechas de rutinas y altas, y pisa el trabajo de la sala');
    comprobar('paridad · y no la escribe cuando el cambio viene de fuera',
      /!\s*sinSubir/.test(saveState),
      'marcarla al aplicar la bajada haria que el equipo se creyera siempre mas nuevo que la nube');
  }
  if (cuerpos.sync) {
    comprobar('paridad · lastChangeAt viaja en el payload',
      /lastChangeAt/.test(cuerpos.sync));
  }
  const syncDownload = extraerFuncion('syncDownload');
  if (syncDownload) {
    comprobar('paridad · syncDownload usa lastChangeAt para decidir',
      /lastChangeAt/.test(syncDownload));
    comprobar('paridad · syncDownload no baja con una subida en cola',
      /_syncTimer/.test(syncDownload),
      'sin esto, arrancar la app pisa el cambio que aun no habia salido');
  }
})();

/* =====================================================================
 * 9 · EL IMPORTADOR, EJECUTADO
 * La prueba 5 solo miraba que existieran funciones con "import" en el
 * nombre: 21 casaban y ninguna se ejecutaba nunca. Cambiar el emparejado
 * a `porNombre[key]` — la trampa literal del CLAUDE.md — pasaba las
 * suites en verde y duplicaba fichas. Esto lo ejecuta de verdad.
 * ===================================================================== */

(function importadorDeVerdad() {
  const codigo = extraerFuncion('_cus19Import');
  if (!codigo) return;

  const vm = require('vm');

  function correr(fichaLocal, fichaCatalogo) {
    const state = { exercises: [fichaLocal] };
    const ctx = {
      state: state,
      _cus19Data: [fichaCatalogo],
      document: { querySelectorAll: function () { return [{ checked: true, value: 'Fuerza' }]; } },
      toast: function () {}, saveState: function () {}, closeModal: function () {},
      renderLibrary: function () {}, genId: function () { return 'nuevo'; },
      Object: Object, Array: Array, String: String,
    };
    vm.createContext(ctx);
    vm.runInContext(codigo + '\n_cus19Import();', ctx);
    return state.exercises;
  }

  /* El caso que importa: la MISMA ficha (mismo id) con el nombre corregido
     en el catalogo. Tiene que actualizarse, no duplicarse. */
  let res;
  try {
    res = correr(
      { id: 'us19f042', name: 'Nombre viejo', muscle: 'Pierna', cat: 'Fuerza' },
      { id: 'us19f042', name: 'Nombre nuevo', muscle: 'Pierna', cat: 'Fuerza', gif: 'g.gif', desc: 'd' }
    );
  } catch (e) {
    falla('importador · se puede ejecutar', e.message);
    return;
  }
  pasa();
  igual('importador · un ejercicio renombrado NO se duplica', res.length, 1);
  igual('importador · se le actualiza el nombre', res[0] && res[0].name, 'Nombre nuevo');
  igual('importador · conserva su id', res[0] && res[0].id, 'us19f042');

  /* Y el contrario: una ficha que de verdad es nueva, entra. */
  try {
    const res2 = correr(
      { id: 'us190001', name: 'Ya estaba', muscle: 'Pierna', cat: 'Fuerza' },
      { id: 'us199999', name: 'De verdad nueva', muscle: 'Pierna', cat: 'Fuerza' }
    );
    igual('importador · una ficha nueva si se anade', res2.length, 2);
  } catch (e) {
    falla('importador · una ficha nueva si se anade', e.message);
  }

  /* Y lo que Diego fijo a mano no se toca. */
  try {
    const res3 = correr(
      { id: 'us19f042', name: 'X', muscle: 'Pierna', cat: 'Movilidad', taxManual: true },
      { id: 'us19f042', name: 'X', muscle: 'Pierna', cat: 'Fuerza' }
    );
    igual('importador · taxManual protege la clasificacion hecha a mano',
      res3[0] && res3[0].cat, 'Movilidad');
  } catch (e) {
    falla('importador · taxManual protege la clasificacion hecha a mano', e.message);
  }
})();

/* --- La firma de los informes ----------------------------------------
   El 9-sep-2026 la app firmaba el PDF de bioimpedancia, el informe de
   rendimiento y el mensaje de compartir un protocolo como «Interno de
   Kinesiologia, U. de Talca», con un membrete que decia KINESIOLOGIA.
   Son documentos que se le entregan a la gente, y el titulo no existe
   todavia: llega a inicios de 2027, unos 30 dias despues de la defensa.

   Arreglar los diez sitios no impide que mañana aparezca una plantilla
   nueva con la misma firma. Esto barre el archivo entero. */
{
  const RE_TITULO = /[Kk]inesiolog[ií]a|KINESIOLOGIA/g;
  /* La unica excepcion, con su motivo: en la lista de frases debiles del
     cifrado, «kinesiologia» es un ejemplo de contraseña previsible.
     Quitarla de ahi debilitaria la comprobacion. */
  const sueltas = [];
  let mk;
  while ((mk = RE_TITULO.exec(src)) !== null) {
    const ctx = src.slice(Math.max(0, mk.index - 80), mk.index + 40);
    if (ctx.indexOf('"kinesiologia"]') >= 0) continue;   // lista de frases debiles
    sueltas.push('...' + ctx.slice(-70).replace(/\n/g, ' '));
  }
  comprobar('firma · ningun documento se firma con un titulo que aun no existe',
    sueltas.length === 0,
    sueltas.length + ' mencion(es) sin declarar: ' + sueltas.join('  |  '));

  /* Regla de Diego del 9-sep-2026: los informes firman SOLO como la marca.
     Sin nombre y sin cargo. Un documento firmado por una empresa dice
     «esto lo emite Ultra-Sport 19»; uno firmado por una persona con un
     cargo dice «esto lo respalda esta persona en calidad de tal cosa», y
     esa segunda frase abre preguntas que hoy no conviene abrir. Ademas asi
     no hay que volver a tocarla nunca: la marca no cambia de titulo. */
  const PERSONALES = ['Diego Valenzuela', 'Profesor de Educación Física',
                      'Prof. Educación Física', 'Personal Trainer'];
  const puestas = PERSONALES.filter(w => src.indexOf(w) >= 0);
  comprobar('firma · ningun documento lleva nombre ni cargo de una persona',
    puestas.length === 0,
    'vuelve a aparecer: ' + puestas.join(', ') + '. Los informes firman solo como Ultra-Sport 19');

  comprobar('firma · y el recuadro de firma dice la marca',
    /<div class="pr-sname">Ultra-Sport 19<\/div>/.test(src),
    'el recuadro de firma dejo de decir Ultra-Sport 19');
}

/* =====================================================================
 * INFORME
 * ===================================================================== */

console.log('');
console.log('US19-APP · banco de pruebas');
/* --- Los botones que escriben en Notion no pueden mentir -------------
   Comprobado el 9-sep-2026: la app manda cuatro POST al puente
   (cliente_estado, marcar, notion_bio, claude) y NINGUNO existe en el bot.
   El puente responde {status:"ok"} a lo que no reconoce, asi que sin una
   guarda la app leia `res.hechos` como undefined, contaba 0 y pintaba un
   mensaje VERDE: «0 cliente(s) reactivado(s)», «Notion: nada que crear, ya
   estaba todo (0)».

   Mientras esos endpoints no existan, esto es lo unico que separa «no
   funciona» de «dice que funciona». */

/* Tres guardados que se tragaban su fallo y cantaban victoria. El patron
   es el mismo de las escrituras: cuando algo no se puede comprobar, se
   responde como si estuviera bien. */
comprobar('guardado · el folio avisa si no quedó guardado el correlativo',
  /se va a repetir en el próximo informe/.test(src),
  'sin eso salen dos comprobantes con el MISMO folio y nada lo dice');

comprobar('guardado · «Dispositivo bloqueado» solo se dice si la llave se fue de verdad',
  /NO pude borrar la llave de este dispositivo/.test(src),
  'creer cerrado algo que en el proximo arranque vuelve a abrirse solo es peor que saberlo abierto');

comprobar('guardado · encForgetDevice devuelve si quedó limpio',
  /var limpio = true;[\s\S]{0,320}return limpio;/.test(src),
  'si no devuelve nada, quien la llama no puede saber si funciono');

comprobar('guardado · finanzas avisa si no pudo guardar',
  /NO pude guardarlas/.test(src),
  'decia «sincronizadas» y al recargar volvian los datos viejos');

comprobar('escritura · existe la guarda que comprueba si contestó alguien',
  /function u19RespuestaValida\(/.test(src),
  'sin ella, un POST que nadie atiende se pinta en verde como si hubiera ido bien');

['hechos', 'creadas'].forEach(function (campo) {
  comprobar('escritura · la guarda se usa con «' + campo + '»',
    new RegExp('u19RespuestaValida\\([^)]*"' + campo + '"').test(src),
    'ese es el campo que solo llega si alguien atendio de verdad la peticion');
});

comprobar('escritura · el botón de aprobar NO borra la caché si nadie marcó nada',
  /no reconoce «marcar»[\s\S]{0,400}return;\s*\/\* y NO se borra la cache/.test(src),
  'borrarla haria desaparecer de la pantalla a los que siguen esperando aprobacion');

comprobar('escritura · el aviso de bioimpedancia dice que NO quedó guardada',
  /La evaluación NO quedó guardada en Notion/.test(src),
  'era la mentira mas cara: decia «ya estaba todo» sobre datos que no se escribieron nunca');

console.log('archivo: ' + ruta);
console.log('');
avisos.forEach(function (a) { console.log('  · ' + a); });
console.log('');
if (fallos.length) {
  console.log('FALLOS (' + fallos.length + '):');
  fallos.forEach(function (f) { console.log('  ✗ ' + f); });
  console.log('');
  console.log('comprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + fallos.length);
  process.exit(1);
} else {
  console.log('comprobaciones OK: ' + ok + '  ·  sin fallos');
  process.exit(0);
}
