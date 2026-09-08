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

  aviso('ajustes: ' + claves.length + ' claves en settings, ' + Object.keys(leidas).length + ' leidas por loadSettings');
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

  const total = (src.match(/\|\|\s*\[\]\s*\)\s*\.\s*(forEach|map|filter|reduce|some|every|sort|slice)/g) || []).length;
  const isArr = (src.match(/Array\.isArray/g) || []).length;
  aviso('guardas: ' + total + ' usos de "(x || []).metodo" conviven con ' + isArr +
        ' usos de Array.isArray. No es un fallo, pero cada uno es un sitio donde un objeto guardado por error rompe la vista.');
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
 * 6 · NADA DE SECRETOS EN EL REPOSITORIO
 * El repositorio es publico.
 * ===================================================================== */

(function secretos() {
  const patrones = [
    ['token de Notion', /\bntn_[A-Za-z0-9]{20,}/],
    ['token de Notion (antiguo)', /\bsecret_[A-Za-z0-9]{30,}/],
    ['clave de Anthropic', /\bsk-ant-[A-Za-z0-9_\-]{20,}/],
    ['token de GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
    ['token de GitHub (fine-grained)', /\bgithub_pat_[A-Za-z0-9_]{30,}/],
    ['token de Meta/WhatsApp', /\bEAA[A-Za-z0-9]{60,}/],
  ];
  patrones.forEach(function (p) {
    comprobar('secretos · sin ' + p[0], !p[1].test(src));
  });
})();

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

/* =====================================================================
 * INFORME
 * ===================================================================== */

console.log('');
console.log('US19-APP · banco de pruebas');
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
