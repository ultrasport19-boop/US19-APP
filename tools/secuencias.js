/* Prueba de las secuencias: cadenas de ejercicios que se arman a mano en
 * Circuitos (Fase 14, 22-sep-2026).
 *
 * EJECUTA el módulo, no lo lee: saca del index.html el motor de BlazePod y el
 * módulo de circuitos entero (planilla, secuencias y en vivo), los monta con
 * un navegador de mentira y los hace trabajar. Así se ve lo que una prueba que
 * lee no puede ver: que una flecha no ramifica, que un ciclo no entra, que
 * borrar un ejercicio no deja una flecha colgando, que el cronómetro espera a
 * «Hecho» en una serie por repeticiones, y que un circuito de los de siempre
 * se pinta y se ejecuta EXACTAMENTE igual que antes de que esto existiera.
 *
 *   node tools/secuencias.js [index.html]
 *
 * Igual que planilla.js y blazepod.js: si no encuentra lo que busca, falla.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('secuencias: no encuentro el inicio de ' + nombre); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('secuencias: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}
function fn(nombre) { return tramo('function ' + nombre + '(', '\n}\n', nombre) + '\n}\n'; }
function win(nombre) { return tramo('window.' + nombre + ' = function', '\n};\n', nombre) + '\n};\n'; }

/* El catálogo de verdad, para las plantillas: junto al index o en la raíz. */
let catalogo = [];
for (const p of [path.join(path.dirname(ruta), 'us19_catalogo.json'), path.join(__dirname, '..', 'us19_catalogo.json')]) {
  if (fs.existsSync(p)) { catalogo = JSON.parse(fs.readFileSync(p, 'utf8')); break; }
}

const motor = tramo('var BLZ_VERSION = 1;', '/* ===BLZ_MOTOR_FIN=== */', 'el motor BlazePod');
const modCirc = tramo('/* --- Día de rutina ↔ circuito --- */', '/* --- BlazePod --- */', 'el modulo de circuitos');
const modSec = tramo('/* --- Secuencias: cadenas que se arman a mano', '/* --- BlazePod --- */', 'el modulo de secuencias');

/* Un elemento de mentira: lo justo para que las funciones de pintar escriban
   sin romper. Lo que se escribe queda en innerHTML y se puede mirar. */
const ENTORNO = `
var __toasts = [], __oyentes = {}, __els = {};
function __el(id){
  return { id: id, innerHTML: "", hidden: true, className: "", style: {}, value: "", textContent: "",
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    querySelector: function(){ return null; }, querySelectorAll: function(){ return []; },
    addEventListener: function(){}, removeEventListener: function(){}, setAttribute: function(){}, getAttribute: function(){ return null; },
    appendChild: function(){}, getBoundingClientRect: function(){ return { left: 0, top: 0, width: 0, height: 0 }; } };
}
var document = {
  addEventListener: function(t, f){ (__oyentes[t] = __oyentes[t] || []).push(f); },
  removeEventListener: function(t, f){ var l = __oyentes[t] || []; var i = l.indexOf(f); if (i >= 0) l.splice(i, 1); },
  getElementById: function(id){ return __els[id] || (__els[id] = __el(id)); },
  querySelector: function(){ return null; }, querySelectorAll: function(){ return []; },
  createElement: function(){ return __el(""); }, body: { classList: { add: function(){}, remove: function(){} } }
};
window.confirm = function(){ return true; };
window.open = function(){ return null; };
window.addEventListener = function(){}; window.removeEventListener = function(){};
var navigator = {};
var localStorage = { getItem: function(){ return null; }, setItem: function(){} };
var setInterval = function(){ return 1; }, clearInterval = function(){}, setTimeout = function(){ return 1; };
var console = { log: function(){}, warn: function(){}, error: function(){} };
var state = { circuitos: [], exercises: [], routines: [] };
var settings = {};
var LOGO_DATA_URI = "";
var __cat = {};
function getExercise(id){ return __cat[id] || null; }
function toast(m, t){ __toasts.push([String(m), t]); }
function saveState(){} function showView(){} function openModal(){} function closeModal(){} function hideTrainerUI(){}
function legacyCopy(){} function libRegistrarReciente(){} function openExercisePicker(){}
function newEmptyRoutine(){ return { id: "r1", name: "", notes: "", days: [{ exercises: [] }] }; }
function openRoutineBuilder(){}
`;
const codigo = [ENTORNO, fn('genId'), fn('u19Arr'), fn('escapeHtml'), fn('escapeAttr'), fn('isVideoUrl'), fn('posterUrl'), fn('mediaThumb'),
  motor, modCirc,
  'function __setEdit(v){ _circEdit = v; } function __edit(){ return _circEdit; }',
  'function __setLive(v){ _live = v; } function __live(){ return _live; }',
  'function __estadoSec(){ return { sel: _circSecSel, flecha: _circSecFlecha, origen: _circSecOrigen, oferta: _circSecOferta }; }',
  'function __toastsL(){ return __toasts; } function __oyentesN(t){ return (__oyentes[t] || []).length; }',
  'function __elPor(id){ return document.getElementById(id); } function __catPoner(o){ __cat = o; }'
].join('\n');

const EXPORTA = ['circSecActivo', 'circSecNormalizar', 'circSecNumeracion', 'circSecEnlaces', 'circSecEnlazar', 'circSecSacar',
  'circSecInsertar', 'circSecInsertarEnFlecha', 'circSecQuitarEnlace', 'circSecDesencadenar', 'circSecMoverCadena', 'circSecLetra',
  'circSecTexto', 'circPlanSec', 'circSecDuracion', 'circSecIndiceSoltar', 'circDuracionTexto', 'circNumEstacion', 'circSecFlechaCerca', 'circSecCompartir',
  'circSecRecibir', 'circCopiaConIdsNuevos', 'circSecAplicarPlantilla', 'circSecListaHtml', 'circSecSelHtml', 'circSecHojaHtml',
  'circLiveSecHtml', 'circSecPizarraSecciones', 'circSecFilasRutina', 'circSecMotivoTexto', 'circSecDosis',
  'circMapaHtml', 'circMapaSvgImprimir', 'circPlan', 'circDuracion', 'circFmt', 'circShareData', 'showCircuitoView', 'circMigrarUno',
  'circGuardar', 'circLiveTick', 'circLiveTeclas', 'circPodsGrupos', 'circMapaToolsHtml', 'circSelHtml',
  'CIRC_SEC_PLANTILLAS', 'CIRC_SEC_NOMBRE', 'CIRC_COLORES',
  '__setEdit', '__edit', '__setLive', '__live', '__estadoSec'];

/* Como en el navegador: `window` ES el objeto global. Así `window.circX =
   function` se puede llamar por su nombre desde otra función, que es como lo
   hace el código de verdad; con un `window = {}` aparte no se podría. */
function montar() {
  const ctx = {};
  ctx.window = ctx;
  vm.createContext(ctx);
  try { vm.runInContext(codigo, ctx, { filename: 'secuencias-entorno.js' }); }
  catch (e) {
    console.error('secuencias: el módulo no evalúa aislado: ' + e.message);
    process.exit(1);
  }
  const env = {};
  EXPORTA.forEach(k => {
    if (ctx[k] === undefined) { console.error('secuencias: falta ' + k + ' (¿se renombró?)'); process.exit(1); }
    env[k] = ctx[k];
  });
  env.window = ctx;
  env.toasts = ctx.__toastsL; env.oyentes = ctx.__oyentesN; env.el = ctx.__elPor; env.cat = ctx.__catPoner;
  const cat = {};
  catalogo.forEach(e => { cat[e.id] = e; });
  env.cat(cat);
  return env;
}
const m = montar();

let ok = 0; const fallos = [];
function di(cond, txt, detalle) { if (cond) ok++; else fallos.push(txt + (detalle !== undefined ? '\n      ' + String(detalle).slice(0, 400) : '')); }
function igual(txt, real, esperado) {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) ok++; else fallos.push(txt + '\n      esperado: ' + b + '\n      real:     ' + a);
}

/* --- circuitos de prueba ------------------------------------------------- */
function estaciones(nombres) {
  return nombres.map((n, i) => ({ id: 'e' + (i + 1), exerciseId: '', nombre: n, nota: '', x: 0.15 + 0.17 * i, y: 0.5 }));
}
function circuito(nombres, extra) {
  return Object.assign({ id: 'c1', nombre: 'Prueba', grupo: '', notas: '', modo: 'rotacion', grupos: 3, rondas: 2, ratio: '16:9',
    trabajo: 40, cambio: 15, descansoRonda: 60, estaciones: estaciones(nombres), pv: 2, disposicion: 'libre',
    espacio: { plantilla: 'gym', anchoM: 10, largoM: 4.5, cuadricula: false, medidas: true },
    pods: [], elementos: [], podsSueltos: null }, extra || {});
}
function conSec(c, cadenas) {
  c.planSec = { modo: 'secuencias', version: 1, notas: '', cadenas: cadenas || [] };
  m.circSecNormalizar(c);
  return c;
}
const nodos = c => c.planSec.cadenas.map(k => k.nodos.slice());
const rotulos = c => { const n = m.circSecNumeracion(c); return c.estaciones.map(s => n.por[s.id] ? n.por[s.id].rotulo : '?'); };
const CINCO = ['Sentadilla sumo', 'Remo posterior de deltoides con mancuernas', 'Jalón al pecho', 'Plancha', 'Flexiones'];

/* === 1. un circuito de antes no se entera ================================= */
{
  const c = circuito(CINCO);
  const antesJSON = JSON.stringify(c);
  di(!m.circSecActivo(c), 'antes · sin planSec no está en secuencias');
  igual('antes · normalizar no le crea nada', m.circSecNormalizar(c), 0);
  di(JSON.stringify(c) === antesJSON, 'antes · y el circuito queda idéntico, sin planSec');
  const html = m.circMapaHtml(c, {});
  di(html.indexOf('cm-capa-sec') < 0 && html.indexOf('cm-puerto') < 0 && html.indexOf('cm-num sec') < 0, 'antes · el plano no trae nada de secuencias');
  di(/<span class="cm-num" style="background:#a8d139;">1<\/span>/.test(html) && />5<\/span>/.test(html), 'antes · las estaciones siguen numeradas 1..5');
  di(html.indexOf('marker-end="url(#cm-arr)"') > 0, 'antes · con las flechas de rotación');
  igual('antes · la duración que se enseña es la de siempre', m.circDuracionTexto(c), m.circFmt(m.circDuracion(c)));
  di(!m.circShareData(c).circuito.planSec, 'antes · el enlace compartido no lleva planSec');
  di(m.circPlan(c).every(p => !p.manual), 'antes · el plan del circuito no tiene ninguna fase manual');
  di(m.circMapaToolsHtml(c).indexOf('aria-pressed="false"') > 0, 'antes · el botón de secuencias sale sin marcar');
}

/* === 2. EN CÍRCULO y EN FILAS no cambian ================================== */
{
  /* El mismo circuito, con y sin cadenas guardadas en modo circuito (así queda
     después de volver de «Secuencias»): tiene que pintarse y ejecutarse IGUAL,
     carácter a carácter. */
  const a = circuito(CINCO), b = circuito(CINCO);
  b.estaciones[0].rep = '10'; b.estaciones[1].carga = '12 kg'; b.estaciones[2].lado = 'alternado';
  b.planSec = { modo: 'circuito', version: 1, notas: 'x', cadenas: [{ id: 'k1', etiqueta: 'Superserie', vueltas: 3, descansoEntreEjerciciosSeg: 0, descansoEntreVueltasSeg: 90, nodos: ['e1', 'e2'] }] };
  di(!m.circSecActivo(b), 'circuito · con planSec en modo circuito no está en secuencias');
  igual('circuito · el plano se pinta igual, con cadenas guardadas o sin ellas', m.circMapaHtml(b, {}), m.circMapaHtml(a, {}));
  igual('circuito · también en vivo, con el turno', m.circMapaHtml(b, { turno: 2, compacto: true, clase: 'cl-mapa' }), m.circMapaHtml(a, { turno: 2, compacto: true, clase: 'cl-mapa' }));
  igual('circuito · y en la hoja', m.circMapaSvgImprimir(b), m.circMapaSvgImprimir(a));
  igual('circuito · el plan del cronómetro es el mismo', m.circPlan(b), m.circPlan(a));
  igual('circuito · y la duración', m.circDuracionTexto(b), m.circDuracionTexto(a));
  /* Volver con los botones de siempre: el modo pasa a circuito y las cadenas se quedan. */
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2');
  m.__setEdit(c);
  m.window.circOrdenar('filas');
  di(c.planSec.modo === 'circuito' && c.disposicion === 'filas', '«En filas» sale de secuencias y ordena en filas');
  igual('y las cadenas siguen ahí para cuando se vuelva', nodos(c)[0], ['e1', 'e2']);
  m.window.circSecActivar();
  di(m.circSecActivo(c) && nodos(c)[0].join() === 'e1,e2', 'volver a «Secuencias» las trae tal cual');
  m.__setEdit(null);
}

/* === 3. una flecha forma una cadena de dos =============================== */
{
  const c = conSec(circuito(CINCO));
  igual('cada ejercicio suelto es una cadena de uno', rotulos(c), ['A1', 'B1', 'C1', 'D1', 'E1']);
  di(m.circSecEnlazar(c, 'e1', 'e2').ok, 'A→B se crea');
  igual('A→B forma una cadena de dos', nodos(c)[0], ['e1', 'e2']);
  igual('con letras y posiciones', rotulos(c), ['A1', 'A2', 'B1', 'C1', 'D1']);
  igual('la flecha sale del modelo, no se guarda aparte', m.circSecEnlaces(c).map(e => e.de + '>' + e.a), ['e1>e2']);
  di(!('enlaces' in c.planSec), 'no hay una segunda verdad de flechas guardada');
  igual('enlazar dos veces lo mismo no hace nada', m.circSecEnlazar(c, 'e1', 'e2').motivo, 'ya');
}

/* === 4. no se ramifica ==================================================== */
{
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2');
  const antes = JSON.stringify(c.planSec);
  const r = m.circSecEnlazar(c, 'e1', 'e3');
  di(!r.ok && r.motivo === 'bifurcacion', 'una segunda flecha desde A avisa: bifurcación', JSON.stringify(r));
  di(JSON.stringify(c.planSec) === antes, 'y no crea nada a medias');
  igual('ofrece meter C entre A1 y A2', r.oferta, { tipo: 'tras', nodo: 'e3', ref: 'e1' });
  di(/ya tiene una flecha de salida/.test(m.circSecMotivoTexto(c, r, 'e1', 'e3')), 'y lo dice en una línea');
  m.circSecInsertar(c, r.oferta.nodo, r.oferta.ref, false);
  igual('aceptar la oferta mete el nodo en medio', nodos(c)[0], ['e1', 'e3', 'e2']);
  /* Llegar a un nodo que ya tiene anterior tampoco ramifica. */
  const d = conSec(circuito(CINCO));
  m.circSecEnlazar(d, 'e1', 'e2');
  const r2 = m.circSecEnlazar(d, 'e3', 'e2');
  di(!r2.ok && r2.motivo === 'bifurcacion' && r2.oferta.tipo === 'antes', 'dos flechas que llegan a B: tampoco', JSON.stringify(r2));
}

/* === 5. sin ciclos ========================================================= */
{
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2');
  const antes = JSON.stringify(c.planSec);
  const r = m.circSecEnlazar(c, 'e2', 'e1');
  di(!r.ok && r.motivo === 'ciclo', 'A→B y después B→A: ciclo rechazado', JSON.stringify(r));
  di(JSON.stringify(c.planSec) === antes, 'sin tocar nada');
  di(/cerraría un círculo/.test(m.circSecMotivoTexto(c, r, 'e2', 'e1')), 'y explica por qué');
  m.circSecEnlazar(c, 'e2', 'e3');
  const r3 = m.circSecEnlazar(c, 'e3', 'e1');
  di(!r3.ok && r3.motivo === 'ciclo' && nodos(c)[0].join() === 'e1,e2,e3', 'A→B→C y C→A: también');
  igual('una tarjeta no se enlaza consigo misma', m.circSecEnlazar(c, 'e2', 'e2').motivo, 'mismo');
}

/* === 6. soltar una tarjeta sobre una flecha la mete en medio ============== */
{
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2');
  di(m.circSecInsertarEnFlecha(c, 'e4', 'e1', 'e2'), 'la tarjeta entra en la flecha');
  igual('y renumera', rotulos(c), ['A1', 'A3', 'B1', 'A2', 'C1']);
  di(!m.circSecInsertarEnFlecha(c, 'e1', 'e1', 'e4'), 'una tarjeta no entra en su propia flecha');
  /* La flecha más cercana, en píxeles de pantalla. */
  const d = conSec(circuito(['A', 'B', 'C']));
  d.estaciones[0].x = 0.1; d.estaciones[0].y = 0.5; d.estaciones[1].x = 0.9; d.estaciones[1].y = 0.5;
  m.circSecEnlazar(d, 'e1', 'e2');
  const f = m.circSecFlechaCerca(d, 0.5, 0.52, 1000, 450, 20, 'e3');
  di(f && f.de === 'e1' && f.a === 'e2', 'soltar a 9 px de la flecha la encuentra');
  di(!m.circSecFlechaCerca(d, 0.5, 0.62, 1000, 450, 20, 'e3'), 'a 54 px, no');
  di(!m.circSecFlechaCerca(d, 0.5, 0.5, 1000, 450, 20, 'e1'), 'ni la de la propia tarjeta que se suelta');
}

/* === 7. quitar el del medio une los extremos ============================== */
{
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2'); m.circSecEnlazar(c, 'e2', 'e3');
  di(m.circSecDesencadenar(c, 'e2'), 'desencadenar el del medio');
  igual('los extremos quedan unidos y él, solo justo detrás', nodos(c).slice(0, 2), [['e1', 'e3'], ['e2']]);
  igual('renumerado', rotulos(c).slice(0, 3), ['A1', 'B1', 'A2']);
  const d = conSec(circuito(CINCO));
  m.circSecEnlazar(d, 'e1', 'e2'); m.circSecEnlazar(d, 'e2', 'e3');
  di(m.circSecQuitarEnlace(d, 'e1', 'e2'), 'quitar la flecha A1→A2');
  igual('parte la cadena en dos', nodos(d).slice(0, 2), [['e1'], ['e2', 'e3']]);
  di(!m.circSecQuitarEnlace(d, 'e1', 'e3'), 'una flecha que no existe no se quita');
}

/* === 8. borrar un ejercicio no deja una flecha huérfana =================== */
{
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2'); m.circSecEnlazar(c, 'e2', 'e3');
  c.estaciones.splice(1, 1);              // se borra el del medio, como circQuitar
  m.circSecNormalizar(c);
  igual('la cadena se cierra: A1→A2 con los que quedaban', nodos(c)[0], ['e1', 'e3']);
  di(m.circSecEnlaces(c).every(e => e.de !== 'e2' && e.a !== 'e2'), 'ninguna flecha nombra al borrado');
  /* Borrar una cadena de uno entera: las letras de detrás suben. */
  const d = conSec(circuito(CINCO));
  d.estaciones.splice(1, 1);              // era B1, sola
  m.circSecNormalizar(d);
  igual('sin su único ejercicio la cadena se va y las letras suben', rotulos(d), ['A1', 'B1', 'C1', 'D1']);
  /* Desde la pantalla, igual. */
  const e = conSec(circuito(CINCO));
  m.circSecEnlazar(e, 'e1', 'e2'); m.circSecEnlazar(e, 'e2', 'e3');
  m.__setEdit(e);
  m.window.circQuitar(1);
  igual('circQuitar cierra el hueco al momento', m.__edit().planSec.cadenas[0].nodos, ['e1', 'e3']);
  m.__setEdit(null);
}

/* === 9. un enlace a un nodo que ya no está se descarta al cargar ========== */
{
  const c = circuito(['A', 'B', 'C']);
  c.planSec = { modo: 'secuencias', cadenas: [{ id: 'k', etiqueta: 'Superserie', vueltas: 2, nodos: ['e1', 'zz', 'e2', 'e1'] }, 'basura', null, { nodos: 'no' }] };
  let tiradas = -1, html = '';
  try { tiradas = m.circSecNormalizar(c); html = m.circMapaHtml(c, {}); } catch (e) { html = 'REVENTO ' + e.message; }
  igual('se tiran el id muerto y el repetido, y se anota cuántos', tiradas, 2);
  igual('la cadena queda con lo que existe', nodos(c), [['e1', 'e2'], ['e3']]);
  di(html.indexOf('REVENTO') < 0 && html.indexOf('cm-est') > 0, 'y la vista no se cae por un dato viejo', html.slice(0, 120));
  const d = circuito(['A']);
  d.planSec = 'texto';
  let r2 = 'ok';
  try { m.circSecNormalizar(d); m.circMapaHtml(d, {}); m.circPlan(d); } catch (e) { r2 = e.message; }
  igual('un planSec que no es un objeto no rompe nada', r2, 'ok');
  const e2 = circuito(['A', 'B']);
  e2.planSec = { modo: 'secuencias', cadenas: [{ nodos: ['e1'], vueltas: -4, descansoEntreVueltasSeg: 99999, etiqueta: '<b>x</b>', futuro: 'se queda' }] };
  m.circSecNormalizar(e2);
  const k = e2.planSec.cadenas[0];
  di(k.vueltas === 1 && k.descansoEntreVueltasSeg === 900 && k.etiqueta === 'Bloque', 'los parámetros fuera de rango se acotan', JSON.stringify(k));
  igual('y un campo desconocido no se pisa', k.futuro, 'se queda');
}

/* === 10. una cadena de uno también se ejecuta ============================ */
{
  const c = conSec(circuito(['Jalón al pecho']));
  c.estaciones[0].rep = '12';
  const plan = m.circPlanSec(c);
  igual('sin flechas: listos, tres series y dos descansos, fin', plan.map(p => p.tipo), ['listos', 'trabajo', 'descanso', 'trabajo', 'descanso', 'trabajo', 'fin']);
  di(plan.filter(p => p.tipo === 'trabajo').every(p => p.manual && p.rep === '12' && p.rotulo === 'A1'), 'por repeticiones: manuales, con su rótulo');
}

/* === 11. tres cadenas: letras, orden y renumeración ======================= */
{
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2');         // A: e1 e2 ; B: e3 ; C: e4 ; D: e5
  m.circSecEnlazar(c, 'e4', 'e5');         // A: e1 e2 ; B: e3 ; C: e4 e5
  igual('tres cadenas', rotulos(c), ['A1', 'A2', 'B1', 'C1', 'C2']);
  m.circSecMoverCadena(c, 2, 0);
  igual('subir la C al principio la hace A; las otras corren una', rotulos(c), ['B1', 'B2', 'C1', 'A1', 'A2']);
  m.circSecMoverCadena(c, 1, 2);
  igual('cambiar B y C solo toca esas dos letras', rotulos(c), ['C1', 'C2', 'B1', 'A1', 'A2']);
  di(!m.circSecMoverCadena(c, 0, 0), 'mover a su mismo sitio no hace nada');
  /* Arrastrar por el asa: filas con el centro en 10, 30 y 50 px. */
  igual('arrastre · la última, soltada arriba del todo, pasa a ser la primera', m.circSecIndiceSoltar([10, 30, 50], 2, 5), 0);
  igual('arrastre · la primera, soltada entre la 2.ª y la 3.ª, queda segunda', m.circSecIndiceSoltar([10, 30, 50], 0, 40), 1);
  igual('arrastre · la primera, soltada abajo del todo, queda la última', m.circSecIndiceSoltar([10, 30, 50], 0, 60), 2);
  igual('arrastre · soltada donde estaba, no se mueve', m.circSecIndiceSoltar([10, 30, 50], 1, 25), 1);
  const plan = m.circPlanSec(c).filter(p => p.tipo === 'trabajo');
  igual('el cronómetro recorre en el MISMO orden que se ve', plan.map(p => p.rotulo), ['A1', 'A2', 'A1', 'A2', 'A1', 'A2', 'B1', 'B1', 'B1', 'C1', 'C2', 'C1', 'C2', 'C1', 'C2']);
  igual('letras más allá de la Z', [m.circSecLetra(25), m.circSecLetra(26), m.circSecLetra(27)], ['Z', 'AA', 'AB']);
}

/* === 12. el recorrido en vivo: vueltas, descansos y repeticiones ========== */
{
  const c = conSec(circuito(['Sentadilla sumo', 'Remo posterior de deltoides con mancuernas', 'Jalón al pecho']));
  c.estaciones[0].rep = '10'; c.estaciones[1].rep = '12'; c.estaciones[2].rep = '12';
  m.circSecEnlazar(c, 'e1', 'e2');
  Object.assign(c.planSec.cadenas[0], { etiqueta: 'Superserie', vueltas: 3, descansoEntreEjerciciosSeg: 0, descansoEntreVueltasSeg: 90 });
  Object.assign(c.planSec.cadenas[1], { etiqueta: 'Bloque', vueltas: 3, descansoEntreVueltasSeg: 60 });
  const plan = m.circPlanSec(c);
  igual('superserie: A1, A2 y el descanso de la vuelta; después la B', plan.map(p => p.tipo + (p.dur ? p.dur : '')),
    ['listos5', 'trabajo', 'trabajo', 'descanso90', 'trabajo', 'trabajo', 'descanso90', 'trabajo', 'trabajo', 'descanso90',
     'trabajo', 'descanso60', 'trabajo', 'descanso60', 'trabajo', 'fin']);
  /* Con descanso entre ejercicios y un ejercicio por tiempo. */
  c.planSec.cadenas[0].descansoEntreEjerciciosSeg = 20;
  c.estaciones[1].trabajo = 40;
  const p2 = m.circPlanSec(c).slice(0, 5);
  igual('20 s entre A1 y A2, y A2 por tiempo cuenta sola', p2.map(p => [p.tipo, p.dur, !!p.manual]),
    [['listos', 5, false], ['trabajo', 0, true], ['cambio', 20, false], ['trabajo', 40, false], ['descanso', 90, false]]);
  const d = m.circSecDuracion(c);
  igual('la duración cuenta lo que tiene reloj y aparte las series por repeticiones', [d.seg, d.manuales], [3 * 20 + 3 * 40 + 3 * 90 + 2 * 60, 6]);
  /* El cronómetro espera a «Hecho» y no pasa solo una serie por repeticiones. */
  const L = { c: c, plan: m.circPlanSec(c), i: 1, fin: 0, restante: 0, corriendo: true, sonido: 'off', total: 0, hecho: 0, ultimoSeg: -1, timer: 1 };
  m.__setLive(L);
  m.circLiveTick();
  igual('una serie por repeticiones no avanza sola', m.__live().i, 1);
  m.circLiveTeclas({ key: ' ', code: 'Space', preventDefault: function () {} });
  igual('la barra espaciadora la marca hecha', m.__live().i, 2);
  m.__live().i = 1; m.__live().corriendo = false;
  m.window.circLiveHecho();
  di(m.__live().i === 2 && m.__live().corriendo, '«Hecho» avanza y, si estaba en pausa, arranca');
  m.__live().i = 2; m.__live().fin = Date.now() - 1000; m.__live().corriendo = true;
  m.circLiveTick();
  igual('una fase con reloj sí pasa sola al acabarse', m.__live().i, 3);
  di(m.circPodsGrupos(c, { tipo: 'trabajo', manual: true, estacion: 0 }).length === 0, 'en una serie por repeticiones no se encienden Pods');
  m.__setLive(null);
}

/* === 13. la lectura de la sesión ========================================== */
{
  const c = conSec(circuito(['Sentadilla sumo', 'Remo posterior de deltoides con mancuernas', 'Jalón al pecho']));
  c.estaciones[0].rep = '10'; c.estaciones[1].rep = '12'; c.estaciones[2].rep = '12';
  m.circSecEnlazar(c, 'e1', 'e2');
  Object.assign(c.planSec.cadenas[0], { etiqueta: 'Superserie', vueltas: 3, descansoEntreEjerciciosSeg: 0, descansoEntreVueltasSeg: 90 });
  Object.assign(c.planSec.cadenas[1], { etiqueta: 'Bloque', vueltas: 3, descansoEntreVueltasSeg: 60 });
  const t = m.circSecTexto(c);
  igual('el texto dice vueltas, descansos y orden reales', t.split('\n'), [
    'A — Superserie, 3 vueltas, 90 s entre vueltas',
    '  A1 Sentadilla sumo: 10 rep',
    '  A2 Remo posterior de deltoides con mancuernas: 12 rep',
    '  Sin descanso entre A1 y A2',
    '',
    'B — Bloque, 3 vueltas, 60 s entre vueltas',
    '  B1 Jalón al pecho: 12 rep',
    '',
    /* 3 × 90 de la A (la última vuelta también descansa: detrás va la B) y 2 × 60 de la B. */
    'Duración aproximada: 6:30, más 9 series por repeticiones']);
  di(t.indexOf('·') < 0, 'sin «·» como separador (regla de Diego, 21-sep)');
  c.estaciones[1].carga = '8 kg'; c.estaciones[1].tempo = '3-1-1'; c.estaciones[1].lado = 'alternado'; c.estaciones[1].nota = 'codos altos';
  di(m.circSecTexto(c).indexOf('A2 Remo posterior de deltoides con mancuernas: 12 rep, 8 kg, tempo 3-1-1, alternado (codos altos)') > 0, 'con carga, tempo, lado y nota');
  const hoja = m.circSecHojaHtml(c);
  di(hoja.indexOf('A — Superserie') > 0 && hoja.indexOf('>A2<') > 0, 'la hoja lleva las mismas cadenas');
  const piz = m.circSecPizarraSecciones(c);
  di(piz.length === 2 && piz[0].items.length === 2 && /^A1 /.test(piz[0].items[0].nombre), 'la pizarra, cadena por cadena');
  const filas = m.circSecFilasRutina(conSec(circuito(['x'])));
  igual('«A rutina» sin ejercicios de biblioteca no inventa filas', filas.length, 0);
}

/* === 14. respaldo, sincronización y enlace conservan las cadenas ========= */
{
  /* Los seis caminos de state.circuitos llevan el array ENTERO: nada filtra
     campo a campo, así que planSec viaja solo. Si alguien los cambia a una
     lista blanca, esto lo ve. */
  igual('exportar y subir a la nube: el array entero (2 sitios)', src.split('    circuitos: state.circuitos || [],\n').length - 1, 2);
  igual('cargar: el array entero', src.split('state.circuitos = Array.isArray(parsed.circuitos) ? parsed.circuitos : [];').length - 1, 1);
  igual('importar y bajar de la nube: el array entero (2 sitios)', src.split('if (Array.isArray(data.circuitos)) state.circuitos = data.circuitos;').length - 1, 2);
  di(src.split('state.circuitos = [];').length - 1 >= 2, 'semilla y borrado total vacían el array, no lo recortan');
  const c = conSec(circuito(CINCO));
  m.circSecEnlazar(c, 'e1', 'e2');
  c.estaciones[0].rep = '10'; c.estaciones[0].lado = 'derecho';
  const ida = JSON.parse(JSON.stringify(c));
  igual('un respaldo (JSON ida y vuelta) conserva cadenas, parámetros y dosis', [ida.planSec, ida.estaciones[0].rep, ida.estaciones[0].lado], [c.planSec, '10', 'derecho']);
  const viejo = JSON.parse(JSON.stringify(c)); viejo.pv = 1;
  m.circMigrarUno(viejo);
  igual('la migración de la planilla no toca planSec', viejo.planSec, c.planSec);
  /* Guardar desde el editor. */
  m.__setEdit(JSON.parse(JSON.stringify(c)));
  const g = m.circGuardar(true);
  di(g && g.planSec && g.planSec.cadenas[0].nodos.join() === 'e1,e2', 'guardar conserva las cadenas');
  m.__setEdit(null);
  /* El enlace compartido: las cadenas viajan con índices y vuelven con ids nuevos. */
  const d = m.circShareData(c);
  di(d.circuito.planSec && d.circuito.planSec.cadenas[0].nodos.join() === '0,1', 'el enlace lleva las cadenas por índice', JSON.stringify(d.circuito.planSec));
  m.showCircuitoView(JSON.parse(JSON.stringify(d)));
  const vista = m.el('view-client').innerHTML;
  di(vista.indexOf('A1 Sentadilla sumo: 10 rep, lado derecho') > 0, 'y al otro lado se leen igual', vista.slice(0, 200));
  di(vista.indexOf('cm-puerto') < 0 && vista.indexOf('cm-capa-sec') < 0, 'la vista compartida es de solo lectura: sin puntos ni zonas de flecha');
  di(!m.__live(), 'y abrirla no arranca nada solo');
  /* Duplicar: las cadenas y los Pods atados apuntan a las estaciones nuevas. */
  c.pods = [{ id: 'p1', n: 1, x: 0.2, y: 0.5, estacionId: 'e1' }];
  const copia = m.circCopiaConIdsNuevos(c);
  const nuevos = copia.estaciones.map(s => s.id);
  di(copia.id !== c.id && nuevos.every(id => !/^e\d$/.test(id)), 'duplicar da ids nuevos');
  igual('y la cadena de la copia apunta a sus estaciones', copia.planSec.cadenas[0].nodos, [nuevos[0], nuevos[1]]);
  igual('el Pod atado de la copia sigue atado a su estación', copia.pods[0].estacionId, nuevos[0]);
  igual('el original no se toca', c.planSec.cadenas[0].nodos, ['e1', 'e2']);
}

/* === 15. todo lo que se escribe va escapado =============================== */
{
  const X = '<img src=x onerror=alert(1)>';
  const c = conSec(circuito([X, 'B']));
  c.estaciones[0].nota = X; c.estaciones[0].rep = X; c.estaciones[0].carga = X; c.estaciones[0].tempo = X;
  m.circSecEnlazar(c, 'e1', 'e2');
  c.planSec.cadenas[0].etiqueta = 'Personalizado'; c.planSec.cadenas[0].nombre = X; c.planSec.notas = X;
  m.__setEdit(c);
  const sucio = h => h.indexOf('<img src=x') >= 0;
  di(!sucio(m.circMapaHtml(c, { selSec: 'e1' })), 'escapado · el plano');
  di(!sucio(m.circSecListaHtml(c)), 'escapado · la lista de cadenas y la lectura de la sesión');
  m.window.circSecSel('e1');
  di(!sucio(m.circSecSelHtml(c)), 'escapado · el panel del ejercicio (nota, repeticiones, carga, tempo)');
  di(!sucio(m.circSecHojaHtml(c)), 'escapado · la hoja');
  di(!sucio(m.circMapaSvgImprimir(c)), 'escapado · el plano de la hoja');
  const L = { c: c, plan: m.circPlanSec(c), i: 1, restante: 0, corriendo: false, sonido: 'off', total: 0, hecho: 0 };
  m.__setLive(L);
  di(!sucio(m.circLiveSecHtml(c, L.plan[1])), 'escapado · la pantalla en vivo');
  m.__setLive(null);
  m.showCircuitoView(JSON.parse(JSON.stringify(m.circShareData(c))));
  di(!sucio(m.el('view-client').innerHTML), 'escapado · la vista compartida');
  m.__setEdit(null);
}

/* === 16. el editor: modo enlace, oferta y lo que queda vivo al salir ====== */
{
  const c = conSec(circuito(CINCO));
  c.id = 'nuevo-sin-guardar';
  m.__setEdit(c);
  m.window.circSecEnlazarDesde('e1');
  igual('el modo enlace escucha Escape', m.oyentes('keydown'), 1);
  di(/Toca la tarjeta a la que va la flecha desde A1/.test(m.circSecSelHtml(c)), 'y dice qué espera');
  m.window.circSecSel('e2');              // la lista hace de destino
  igual('tocar el destino pone la flecha', nodos(c)[0], ['e1', 'e2']);
  igual('y suelta Escape', m.oyentes('keydown'), 0);
  m.window.circSecEnlazarDesde('e1');
  m.window.circSecSel('e3');              // A1 ya tiene siguiente
  const o = m.__estadoSec().oferta;
  di(o && o.nodo === 'e3' && /no se ramifica/.test(o.texto), 'una bifurcación deja la oferta en pantalla', JSON.stringify(o));
  di(/Meter B1 entre A1 y A2/.test(m.circSecSelHtml(c)), 'con el botón de meterlo en medio', m.circSecSelHtml(c).slice(0, 300));
  m.window.circSecAceptarOferta();
  igual('aceptarla lo mete', nodos(c)[0], ['e1', 'e3', 'e2']);
  m.window.circSecEnlazarDesde('e4');
  m.window.circVolver();
  igual('salir del editor no deja ningún oyente vivo', m.oyentes('keydown'), 0);
  di(!m.__estadoSec().origen, 'ni el modo enlace a medias');
  m.__setEdit(null);
}

/* === 17. plantillas ======================================================== */
{
  di(m.CIRC_SEC_PLANTILLAS.length === 5, 'cinco plantillas de la casa');
  const ids = {}; catalogo.forEach(e => { ids[e.id] = e; });
  const faltan = [];
  m.CIRC_SEC_PLANTILLAS.forEach(t => t.pasos.forEach(p => { if (!ids[p.ex]) faltan.push(t.id + ':' + p.ex); }));
  di(catalogo.length > 1000 && faltan.length === 0, 'todos sus ejercicios existen en el catálogo', faltan.join(', '));
  const clinico = /diagn|tratamient|paciente|lesi[oó]n|rehabilit|terap|dolor|kinesi/i;
  di(!clinico.test(JSON.stringify(m.CIRC_SEC_PLANTILLAS)), 'sin lenguaje clínico');
  const c = circuito(['Ya estaba']);
  const antes = JSON.stringify(c.estaciones[0]);
  const nuevos = m.circSecAplicarPlantilla(c, m.CIRC_SEC_PLANTILLAS[0]);
  di(nuevos.length === 2 && JSON.stringify(c.estaciones[0]) === antes, 'una plantilla añade al final y no toca lo que había');
  igual('entra como una cadena con sus parámetros', [c.planSec.cadenas[1].etiqueta, c.planSec.cadenas[1].vueltas, c.planSec.cadenas[1].descansoEntreVueltasSeg, c.planSec.cadenas[1].nodos], ['Superserie', 3, 90, nuevos]);
  di(c.estaciones[1].exerciseId === 'us196407' && c.estaciones[1].rep === '10', 'con el ejercicio de la biblioteca y su dosis');
}

/* === 18. nombres: nada nuevo pisa algo de window ========================== */
{
  const decl = {}, winA = {};
  let x; const reD = /\nfunction ([A-Za-z0-9_$]+)\(/g, reW = /\nwindow\.([A-Za-z0-9_$]+) = function/g;
  while ((x = reD.exec(src)) !== null) decl[x[1]] = (decl[x[1]] || 0) + 1;
  while ((x = reW.exec(src)) !== null) winA[x[1]] = (winA[x[1]] || 0) + 1;
  const nuevas = [], reN = /\n(?:function |window\.)([A-Za-z0-9_$]+)[ (]/g;
  while ((x = reN.exec(modSec)) !== null) nuevas.push(x[1]);
  di(nuevas.length > 50, 'se encontraron las funciones del módulo (' + nuevas.length + ')');
  const choca = nuevas.filter(n => (decl[n] || 0) + (winA[n] || 0) !== 1);
  di(choca.length === 0, 'cada nombre nuevo existe una sola vez en todo el archivo, como función O como acción de window', choca.join(', '));
  const vars = modSec.match(/\nvar ([A-Za-z0-9_$]+)/g) || [];
  const repes = vars.map(v => v.replace('\nvar ', '')).filter(n => src.split('\nvar ' + n + ' ').length - 1 !== 1);
  di(vars.length >= 10 && repes.length === 0, 'y cada variable del módulo, también', repes.join(', '));
  /* Sin relojes propios: lo único que late es el cronómetro de siempre. */
  di(modSec.indexOf('setInterval(circLiveTick') >= 0 && modSec.split('setInterval(').length - 1 === 1, 'el módulo solo usa el reloj del cronómetro (al marcar «Hecho»)');
  di(modSec.indexOf('requestAnimationFrame') < 0 && modSec.indexOf('setTimeout(') < 0, 'ningún frame ni timeout suelto');
  igual('el oyente de Escape se pone y se quita en el mismo sitio', [modSec.split('document.addEventListener("keydown", circSecTeclas)').length - 1, modSec.split('document.removeEventListener("keydown", circSecTeclas)').length - 1], [1, 2]);
  di(/\.circ-mapa \.cm-capa-sec\{[^}]*pointer-events:none/.test(src), 'la capa de flechas nace transparente al toque');
  di(/\.circ-mapa \.cm-capa-sec\{[^}]*z-index:2/.test(src) && /\.circ-mapa \.cm-est\{z-index:3;\}/.test(src), 'y va por debajo de las tarjetas');
  di(/prefers-reduced-motion:reduce\)\{ \.cm-est\.enlazando\{animation:none;\}/.test(src), 'el pulso del modo enlace respeta «reducir movimiento»');
  const clinico = /diagn[oó]stic|tratamient|paciente|rehabilit|kinesi/i;
  di(!clinico.test(modSec), 'el módulo no usa lenguaje clínico (el repositorio es público)');
}

console.log('\nUS19-APP · secuencias (cadenas a mano en Circuitos)');
console.log('archivo: ' + path.basename(ruta));
if (fallos.length) {
  fallos.forEach(f => console.log('  ✗ ' + f));
  console.log('\n  ' + ok + ' bien, ' + fallos.length + ' MAL\n');
  process.exit(1);
}
console.log('  comprobaciones OK: ' + ok + '  ·  sin fallos\n');
