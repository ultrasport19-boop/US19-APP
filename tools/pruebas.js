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
    ['token de Meta/WhatsApp', /\bEAA[A-Za-z0-9]{60,}/],
  ];
  patrones.forEach(function (p) {
    comprobar('secretos · sin ' + p[0], !p[1].test(src));
  });
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
