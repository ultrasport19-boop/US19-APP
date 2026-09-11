/* Lo que ve el socio de la readaptación.
 *
 *   node tools/socio.js [index.html]
 *
 * POR QUE EXISTE
 * La readaptación vive en la app de Diego y ahí se trabaja, pero nada de eso
 * se le menciona a un socio ni sale a lo publico (regla del 8-sep-2026,
 * precisada el 11-sep). El 11-sep salian SEIS cosas por los enlaces y los
 * documentos que recibe la gente: «Rutina terapeutica» en la cabecera, el
 * nombre de la condicion en las fases compartidas, el objetivo clinico de la
 * fase, «tu fase de rehabilitacion» en el WhatsApp, la columna «EVA» y
 * «Paciente en rehabilitacion» en el informe impreso. Ninguna suite miraba lo
 * que sale hacia el socio.
 *
 * Aqui se ejecutan de verdad las funciones que construyen lo que sale —con las
 * cinco plantillas base y las 22 condiciones del catalogo— y se barre cada
 * texto que el socio puede leer.
 *
 * Igual que series.js: si no encuentra lo que busca, FALLA.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

let ok = 0;
const fallos = [], avisos = [];
const pasa = () => { ok++; };
const falla = (n, d) => fallos.push(n + (d ? '  →  ' + d : ''));
const comprobar = (n, c, d) => { if (c) pasa(); else falla(n, d); };
const igual = (n, a, b) => {
  if (a === b) pasa();
  else falla(n, 'esperaba ' + JSON.stringify(b) + ', obtuvo ' + JSON.stringify(a));
};
const aviso = (t) => avisos.push(t);

/* --- Sacar codigo del index.html, contando llaves ---------------------
   Varias de estas funciones son de una linea (`function x(){ ... }`): cortar
   en el primer «\n}\n» se llevaria media pagina de mas. */
function fn(nombre) {
  const i = src.indexOf('\nfunction ' + nombre + '(');
  if (i < 0) { console.error('socio: no encuentro la funcion ' + nombre); process.exit(1); }
  const abre = src.indexOf('{', i);
  let d = 0;
  for (let k = abre; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i + 1, k + 1) + '\n'; }
  }
  console.error('socio: llaves sin cerrar en ' + nombre); process.exit(1);
}
function lista(nombre) {
  const i = src.indexOf('\nvar ' + nombre + ' = [');
  if (i < 0) { console.error('socio: no encuentro ' + nombre); process.exit(1); }
  const j = src.indexOf('\n];', i);
  return src.slice(i + 1, j + 3) + '\n';
}
function linea(inicio) {
  const i = src.indexOf('\n' + inicio);
  if (i < 0) { console.error('socio: no encuentro «' + inicio + '»'); process.exit(1); }
  return src.slice(i + 1, src.indexOf('\n', i + 1)) + '\n';
}
function cuerpo(nombre) { return fn(nombre); }

/* --- Montar lo que decide que sale ------------------------------------ */
let M;
const EXS = {};   // la biblioteca fingida: lo que devuelve getExercise
try {
  M = new Function('EXS', [
    fn('escapeHtml'),
    linea('var U19_SOCIO_VETADAS'),
    lista('RC_PATOLOGIAS'),
    lista('RC_EJERCICIOS_BASE'),
    fn('u19EsRehabCat'), fn('u19NombreParaSocio'), fn('u19BadgeSocio'), fn('u19MensajeFaseSocio'),
    fn('rcPe'), fn('rcPh'), fn('rcProto'), fn('rcProtocolosBase'),
    fn('buildShareData'), fn('buildPhaseShareData'),
    'function getClient(id){ return id ? { id: id, name: "Socia de prueba" } : null; }',
    'function getExercise(id){ return EXS[id] || null; }',
    'return { U19_SOCIO_VETADAS, RC_PATOLOGIAS, RC_EJERCICIOS_BASE, u19EsRehabCat, u19NombreParaSocio,',
    '  u19BadgeSocio, u19MensajeFaseSocio, rcProtocolosBase, buildShareData, buildPhaseShareData };'
  ].join('\n'))(EXS);
} catch (e) {
  console.error('socio: el codigo no evalua aislado: ' + e.message);
  process.exit(1);
}

/* La biblioteca: los ejercicios base de verdad, y el resto con su id por nombre
   (el catalogo grande no vive en index.html, y aqui importa lo que se ESCRIBE
   alrededor, no como se llama cada ejercicio). */
M.RC_EJERCICIOS_BASE.forEach(e => { EXS[e.id] = e; });
const BASE = M.rcProtocolosBase();
BASE.forEach(p => p.phases.forEach(ph => ph.exercises.forEach(x => {
  if (!EXS[x.exerciseId]) EXS[x.exerciseId] = { id: x.exerciseId, name: 'Ejercicio ' + x.exerciseId, desc: '' };
})));

/* --- Lo que un socio no puede leer ------------------------------------ */
const PROHIBIDO = /kinesiolog|kin[eé]sic|paciente|rehabilit|diagn[oó]stic|tratamiento|patolog|terap[eé]ut|terapia|lesi[oó]n|cl[ií]nic|fisioter|\bEVA\b/i;
const CONDICIONES = M.RC_PATOLOGIAS.map(p => String(p.nombre).toLowerCase())
  .concat(BASE.map(p => String(p.name).toLowerCase()));
function textoVetado(t) {
  const s = String(t == null ? '' : t);
  const m = PROHIBIDO.exec(s);
  if (m) return '«' + m[0] + '» en «' + s.slice(Math.max(0, m.index - 30), m.index + 40) + '»';
  const low = s.toLowerCase();
  const c = CONDICIONES.find(n => n && low.indexOf(n) >= 0);
  return c ? 'la condicion «' + c + '» en «' + s.slice(0, 80) + '»' : null;
}
/* Todos los textos de un objeto, recorridos. Las CLAVES no se leen (zonaTerap
   es un nombre de campo, no algo que el socio vea); los valores si. */
function textos(o, out) {
  out = out || [];
  if (o == null) return out;
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach(x => textos(x, out));
  else if (typeof o === 'object') Object.keys(o).forEach(k => textos(o[k], out));
  return out;
}
const sinEtiquetas = h => String(h).replace(/<[^>]*>/g, ' ');

/* --- 1 · El nombre de un programa, tal como lo ve el socio ------------ */
{
  comprobar('nombre · hay cinco plantillas base con que probar', BASE.length === 5, 'hay ' + BASE.length);
  BASE.forEach(p => {
    const n = M.u19NombreParaSocio(p);
    comprobar('nombre · «' + p.name + '» no sale tal cual', n !== p.name, 'sale igual');
    igual('nombre · «' + p.name + '» sale como programa de su zona', n, 'Programa de ' + String(p.region).toLowerCase());
  });
  let caen = 0;
  M.RC_PATOLOGIAS.forEach(pa => {
    const n = M.u19NombreParaSocio({ name: pa.nombre, region: pa.region });
    if (!textoVetado(n) && n.indexOf(pa.nombre) < 0) caen++;
    else falla('nombre · la condicion «' + pa.nombre + '» se neutraliza', 'sale «' + n + '»');
  });
  comprobar('nombre · las ' + M.RC_PATOLOGIAS.length + ' condiciones del catalogo se neutralizan', caen === M.RC_PATOLOGIAS.length && caen >= 20,
    caen + ' de ' + M.RC_PATOLOGIAS.length);
  /* Y una condicion que se AÑADA al catalogo con palabras que la expresion no
     conoce: la tiene que cazar el recorrido por RC_PATOLOGIAS. Hoy las 22 las
     caza tambien la expresion, asi que sin este caso el recorrido no se
     probaria nunca (un mutante que lo apagaba escapo). «Bursitis» no esta en
     la expresion a proposito. */
  M.RC_PATOLOGIAS.push({ id: 'prueba', nombre: 'Bursitis subacromial', region: 'Hombro' });
  igual('nombre · una condicion nueva del catalogo se caza aunque la expresion no la conozca',
    M.u19NombreParaSocio({ name: 'Plan bursitis subacromial de Ana', region: 'Hombro' }), 'Programa de hombro');
  comprobar('nombre · y la expresion de verdad no la conoce (si no, este caso no probaria el recorrido)',
    !M.U19_SOCIO_VETADAS.test('Plan bursitis subacromial de Ana'), 'la expresion ya la caza: cambiar el caso por otra palabra');
  M.RC_PATOLOGIAS.pop();
  igual('nombre · un nombre neutro se respeta', M.u19NombreParaSocio({ name: 'Programa hombro Juan', region: 'Hombro' }), 'Programa hombro Juan');
  igual('nombre · con zona «Otro» no inventa zona', M.u19NombreParaSocio({ name: 'Lesión de isquiotibiales', region: 'Otro' }), 'Programa de ejercicios');
  igual('nombre · sin nombre ni zona', M.u19NombreParaSocio({}), 'Programa de ejercicios');
  aviso('nombre · 5 plantillas base y ' + M.RC_PATOLOGIAS.length + ' condiciones, ejecutadas');
}

/* --- 2 · Una etapa compartida, de las cinco plantillas base ------------ */
{
  let etapas = 0;
  BASE.forEach(p => p.phases.forEach((ph, i) => {
    if (!ph.exercises || !ph.exercises.length) return;
    etapas++;
    const d = M.buildPhaseShareData(p, i);
    const quien = p.name + ' · fase ' + (i + 1);
    const malos = textos(d.routine).concat(textos(d.exercises)).map(textoVetado).filter(Boolean);
    comprobar('etapa · ' + quien + ': nada de lo que lee el socio esta vetado', malos.length === 0, malos.slice(0, 3).join('  |  '));
    igual('etapa · ' + quien + ': el titulo es «Etapa N»', d.routine.dayLabels[0], 'Etapa ' + (i + 1));
    igual('etapa · ' + quien + ': no viaja el objetivo de la fase', d.routine.notes, '');
    igual('etapa · ' + quien + ': el nombre es el neutro', d.routine.name, M.u19NombreParaSocio(p) + ' — Etapa ' + (i + 1));
  }));
  comprobar('etapa · se probaron las fases con ejercicios de las cinco plantillas', etapas >= 15, 'solo ' + etapas);
  aviso('etapa · ' + etapas + ' fases compartidas, construidas y barridas');
}

/* --- 3 · El WhatsApp de una etapa ------------------------------------- */
{
  BASE.forEach(p => {
    const t = M.u19MensajeFaseSocio(M.u19NombreParaSocio(p), 2, 'https://x.test/#r/abc');
    comprobar('whatsapp · «' + p.name + '»: nada vetado', !textoVetado(t), textoVetado(t));
  });
  const t = M.u19MensajeFaseSocio('Programa de rodilla', 3, 'https://x.test/#r/abc');
  comprobar('whatsapp · lleva el enlace', t.indexOf('https://x.test/#r/abc') >= 0, 'no aparece el enlace');
  comprobar('whatsapp · dice la etapa', t.indexOf('Etapa 3') >= 0, 'no dice «Etapa 3»');
  comprobar('whatsapp · pide la molestia de 0 a 10', /molestia/i.test(t) && /0 a 10/.test(t), 'no la pide');
  comprobar('whatsapp · firma como la marca', t.indexOf('Ultra-Sport 19') >= 0, 'sin firma');
}

/* --- 4 · El enlace de una rutina de readaptacion ----------------------- */
{
  EXS.e_sent = { id: 'e_sent', name: 'Sentadilla goblet', desc: 'Espalda neutra', terap: 'Pierna', pat: 'Sentadilla', niv: 'Principiante' };
  const rehab = { id: 'r1', name: 'Rutina de Ana', clientId: 'c1', category: 'rehabilitacion', enfoque: 'terap', zonaTerap: 'Pierna',
    days: [{ exercises: [{ exerciseId: 'e_sent', sets: '3', reps: '10' }] }] };
  const d = M.buildShareData(rehab);
  const ej = d.exercises.find(e => e.id === 'e_sent') || {};
  comprobar('enlace · la etiqueta terapeutica del ejercicio no viaja', !('terap' in ej), 'viaja terap=' + ej.terap);
  igual('enlace · la categoria de readaptacion no viaja', d.routine.category, '');
  igual('enlace · el enfoque terapeutico no viaja', d.routine.enfoque, '');
  igual('enlace · la zona a proteger si viaja', d.routine.zonaTerap, 'Pierna');
  igual('enlace · y la otra categoria de readaptacion tampoco', M.buildShareData(Object.assign({}, rehab, { category: 'rehab' })).routine.category, '');
  const malos = textos(d).map(textoVetado).filter(Boolean);
  comprobar('enlace · nada de lo que lleva el enlace esta vetado', malos.length === 0, malos.slice(0, 3).join('  |  '));
  /* Que no se lleve por delante lo que NO es readaptacion. */
  const normal = M.buildShareData(Object.assign({}, rehab, { category: 'fuerza', enfoque: 'equilibrada', zonaTerap: '' }));
  igual('enlace · una rutina de fuerza conserva su categoria', normal.routine.category, 'fuerza');
  igual('enlace · y su enfoque', normal.routine.enfoque, 'equilibrada');
  comprobar('enlace · el patron y el nivel siguen viajando', ej.pat === 'Sentadilla' && ej.niv === 'Principiante', 'se perdieron');
}

/* --- 5 · La cabecera de la rutina que abre el socio -------------------- */
{
  const b = M.u19BadgeSocio({ zonaTerap: 'Pierna' });
  comprobar('cabecera · dice la zona a proteger', sinEtiquetas(b).indexOf('Zona a proteger: Pierna') >= 0, b);
  comprobar('cabecera · y nada vetado', !textoVetado(sinEtiquetas(b)), textoVetado(sinEtiquetas(b)));
  igual('cabecera · sin zona no pinta nada', M.u19BadgeSocio({ category: 'rehabilitacion', enfoque: 'terap' }), '');
  comprobar('cabecera · la zona se escapa', M.u19BadgeSocio({ zonaTerap: '<img src=x onerror=alert(1)>' }).indexOf('<img') < 0, 'la zona entra cruda en el HTML');
  const vista = cuerpo('showClientView');
  comprobar('cabecera · la vista del socio pinta con u19BadgeSocio', vista.indexOf('u19BadgeSocio(r)') >= 0, 'showClientView ya no la usa');
  comprobar('cabecera · y no escribe «Rutina terapéutica» por su cuenta', !/Rutina terap[eé]utica/i.test(vista), 'vuelve la insignia vieja');
}

/* --- 6 · Lo que el socio lee en tablas y documentos -------------------- */
{
  ['buildExerciseBlock', 'showProgressReport', 'renderLivePlayer'].forEach(n => {
    const c = cuerpo(n);
    comprobar('tablas · ' + n + ' no rotula «EVA»', !/>EVA</.test(c), 'la columna vuelve a llamarse EVA');
  });
  const modal = cuerpo('openPhaseShareModal');
  comprobar('etapa · el WhatsApp sale de u19MensajeFaseSocio', modal.indexOf('u19MensajeFaseSocio(') >= 0, 'el modal arma su propio mensaje');
  comprobar('etapa · el PNG y el QR impreso llevan el nombre neutro',
    /downloadQrPng\(currentUrl, nombreSocio/.test(modal) && /printQr\(currentUrl, nombreSocio/.test(modal), 'vuelven a usar protocol.name');
  comprobar('etapa · buildPhaseShareData no manda el objetivo de la fase', cuerpo('buildPhaseShareData').indexOf('phase.objetivo') < 0, 'vuelve phase.objetivo');
  comprobar('bateria · el informe impreso no dice «Paciente en rehabilitación»', src.indexOf('Paciente en rehabilitación') < 0, 'vuelve la etiqueta');
}

/* --- 7 · El repositorio es publico ------------------------------------- */
{
  /* pruebas.js ya barre «kinesiologia». Esto cubre su adjetivo, que se colo
     el 11-sep en una etiqueta del formulario de la ficha. */
  const m = src.match(/kin[eé]sic[oa]s?/gi) || [];
  comprobar('publico · ni «kinésico» ni «kinésica» en el archivo', m.length === 0, m.length + ' vez/veces: ' + m.join(', '));
}

console.log('\nUS19-APP · lo que ve el socio de la readaptación');
console.log('archivo: ' + ruta + '\n');
avisos.forEach(a => console.log('  · ' + a));
if (fallos.length) {
  console.log('\n  FALLOS (' + fallos.length + '):');
  fallos.forEach(f => console.log('    ✗ ' + f));
  console.log('\ncomprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + fallos.length + '\n');
  process.exit(1);
}
console.log('\ncomprobaciones OK: ' + ok + '  ·  sin fallos\n');
