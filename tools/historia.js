/* Prueba de la historia por componentes (CIF), de la ficha de la persona en
 * Notion y del envio inmediato (11-sep-2026, noche).
 *
 *   node tools/historia.js [index.html]
 *
 * Diego pidio tres cosas: que la historia se base en el modelo CIF y sea
 * mas completa (con lo que ya tiene en su Notion), que la persona que agrega
 * en la app aparezca en Notion, y que lo que cambie en la app se envie a
 * Notion al instante. Lo que se prueba aqui es lo que decide la app:
 *
 *   - QUE GUARDA: guardar la historia FUSIONA; hasta hoy el formulario
 *     reemplazaba el objeto entero y borraba lo que no conocia.
 *   - QUE CUENTA: una sola forma de contar la historia (historiaSecciones_)
 *     para la pestaña, la impresion, el «Copiar» y Notion; lo vacio del CIF
 *     sale como «No evaluado».
 *   - QUE MANDA Y CUANDO: la ficha del gimnasio se escribe sola si la
 *     simulacion sale limpia; la persona se crea sin duplicar; la historia va
 *     a su ficha; Series sube sola; lo pendiente se reintenta callado.
 *
 * Todo se EJECUTA con un mundo de mentira (fetch, estado, modales, DOM,
 * relojes), no se busca como texto. Si no encuentra lo que busca, FALLA.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function muere(t) { console.error('historia: ' + t); process.exit(1); }
function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) muere('no encuentro el inicio de ' + nombre);
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) muere('no encuentro el fin de ' + nombre);
  return src.slice(i, j);
}
/* Una funcion entera: la de una linea si sus llaves cierran en esa linea;
   si no, hasta la primera «}» sola en su linea. */
function fn(nombre) {
  const ini = 'function ' + nombre + '(';
  const i = src.indexOf('\n' + ini);
  if (i < 0) muere('no encuentro ' + nombre);
  const finLinea = src.indexOf('\n', i + 1);
  const linea = src.slice(i + 1, finLinea);
  let prof = 0, q = '';
  for (let k = 0; k < linea.length; k++) {
    const ch = linea[k];
    if (q) { if (ch === '\\') { k++; continue; } if (ch === q) q = ''; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '{') prof++; else if (ch === '}') prof--;
  }
  if (prof === 0 && linea.indexOf('{') >= 0) return linea + '\n';
  return tramo(ini, '\n}\n', nombre) + '\n}\n';
}
/* Una declaracion «var» entera, aunque ocupe varias lineas. */
function varDe(n) {
  const i = src.indexOf('\nvar ' + n + ' = ');
  if (i < 0) muere('no encuentro var ' + n);
  let prof = 0, q = '', j = i + 1;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = ''; continue; }
    if (ch === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j + 2) + 1; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '[' || ch === '{' || ch === '(') prof++;
    else if (ch === ']' || ch === '}' || ch === ')') prof--;
    else if (ch === ';' && prof === 0) break;
  }
  return src.slice(i + 1, j + 1) + '\n';
}

const VARS = ['HC_FASES', 'HC_IRRITA', 'HC_SINO', 'HC_LADO', 'HC_NIVEL', 'HC_ESCALAS', 'HC_PSFS_FILAS', 'HC_SECCIONES', 'HC_NUCLEO', '_hcSubiendo',
  'PERSONA_ESTADOS', 'PERSONA_CAMPOS', '_personaSubiendo', '_u19ReintentoAt', '_u19AlVolverListo',
  'SERIES_LLEGADAS', 'SERIES_ETIQ', 'SERIES_VIAS', 'SERIES_ESTADOS', 'SERIES_AUSENCIAS', 'SERIES_COBROS', 'RC_RED_FLAGS', '_fichaDups',
  '_seriesSubiendo', '_seriesAutoT'];
const FUNCIONES = ['hcTxt_', 'hcNum010_', 'hcPsfs_', 'hcCuest_', 'historiaFusionar_', 'hcEtiquetas_', 'historiaSecciones_', 'hcSeguridadTexto_',
  'historiaCompletitud_', 'historiaProponerSintesis_', 'historiaDoc_', 'historiaTexto_', 'hcControl_', 'hcPsfsHtml_', 'hcCuestHtml_',
  'hcSeguridadHtml_', 'hcEvalsHtml_', 'openFichaClinica', 'hcLeerFormulario_', 'hcGuardar_', 'hcGuardarY_', 'hcProponer_',
  'historiaTrasGuardar_', 'historiaNotionSubir',
  'u19SeriesPedir_', 'personaPendMezclar_', 'personaPayload_', 'personaCrearCuerpo_', 'personaSeccionHtml_', 'personaLeerFormulario_',
  'personaTrasGuardar_', 'personaEnlazarSeries_', 'personaNotionSubir', 'personaAsegurar_', 'personaFallo_', 'personaCrear_',
  'personaActualizar_', 'personaTarjetaHtml_', 'historiaReintentar', 'u19NotionReintentar_',
  'fichaSoloOk_', 'fichaNotionSubir', 'fichaVistaPrevia_', 'fichaEscribir_', 'fichaCuerpo_', 'fichaPedir_', 'fichaLeerRespuesta_',
  'fichaTipoCambia_', '_impNom',
  'seriesPayloadPersona_', 'seriesDeCliente_', 'seriesAutoSubir_', 'seriesSincronizar', 'seriesPendientes_', 'seriesSeSube_',
  'seriesContar_', 'seriesPayloadSerie_', 'seriesPayloadSesion_', 'seriesPayloadOrden_', 'seriesOrdenClave_', 'seriesConNota_', 'rcNum_'];

/* Un mundo de mentira: estado, puente (que tambien falla), modales, DOM y
   relojes. Cada prueba arma el suyo, limpio. */
const CODIGO = [
  'var state = { clients: [], series: [] };',
  'var __t__ = [], __modales__ = [], __pedidos__ = [], __resps__ = [], __dom__ = {}, __confirmar__ = true, __confirms__ = [], __alerts__ = [],',
  '    __cerrados__ = 0, __abiertos__ = [], __sinPuente__ = false, __timers__ = {}, __tn__ = 0;',
  'function toast(t, k){ __t__.push(String(t) + (k ? " [" + k + "]" : "")); }',
  'function u19DashUrl(t){ return __sinPuente__ ? "" : "https://puente/exec?tipo=" + t; }',
  'function fetch(url, o){ var body = o && o.body ? JSON.parse(o.body) : null; __pedidos__.push({ url: url, body: body });',
  '  var r = __resps__.length ? __resps__.shift() : { ok: true };',
  '  if (r === "RED") return Promise.reject(new Error("sin red"));',
  '  if (typeof r === "function") r = r(body);',
  '  return Promise.resolve({ text: function(){ return Promise.resolve(typeof r === "string" ? r : JSON.stringify(r)); } }); }',
  'function saveState(){} function renderClients(){} function renderSeries(){} function closeModal(){ __cerrados__++; }',
  'function openModal(o){ __modales__.push(o); }',
  'function getClient(id){ for (var i = 0; i < state.clients.length; i++) if (state.clients[i].id === id) return state.clients[i]; return null; }',
  'function escapeHtml(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }',
  'function escapeAttr(s){ return escapeHtml(s); }',
  'function u19Arr(x){ return Array.isArray(x) ? x : []; }',
  'function u19Lista(x){ return Array.isArray(x) ? x.filter(function(e){ return e !== null && e !== undefined; }) : []; }',
  'function getClientType(c){ return (c && c.type === "rehab") ? "rehab" : "gym"; }',
  'function formField(l, h){ return "<label>" + escapeHtml(l) + "</label>" + h; }',
  'function seriesHoyISO(){ return "2026-09-11"; }',
  'function seriesLeer(){ if (!Array.isArray(state.series)) state.series = []; return state.series; }',
  'function seriesGuardar(l){ if (Array.isArray(l)) state.series = l; }',
  'function u19IdbLeer(){ return Promise.resolve(null); } function u19IdbBorrar(){ return Promise.resolve(true); }',
  'function openPanelClinico(){} function rehabClinicoOn(){ return true; }',
  'function openRedFlags(id){ __abiertos__.push("banderas:" + id); } function openEvalForm(id){ __abiertos__.push("evaluacion:" + id); }',
  'function setTimeout(f){ var id = ++__tn__; __timers__[id] = f; return id; } function clearTimeout(id){ delete __timers__[id]; }',
  'var window = { confirm: function(m){ __confirms__.push(String(m)); return __confirmar__; }, alert: function(m){ __alerts__.push(String(m)); }, prompt: function(){} };',
  'var navigator = { onLine: true };',
  'var console = { warn: function(){}, log: function(){}, error: function(){} };',
  'var document = { getElementById: function(id){ return __dom__[id] || null; } };',
  VARS.map(varDe).join(''),
  FUNCIONES.map(fn).join('\n'),
  'return { state: state, fn: { ' + FUNCIONES.map(n => n + ':' + n).join(',') + ' },',
  '  set resps(v){ __resps__ = v; }, set confirmar(v){ __confirmar__ = v; }, set dom(v){ __dom__ = v; }, set sinPuente(v){ __sinPuente__ = v; },',
  '  get pedidos(){ return __pedidos__; }, get modales(){ return __modales__; }, get toasts(){ return __t__; }, get confirms(){ return __confirms__; },',
  '  get alerts(){ return __alerts__; }, get cerrados(){ return __cerrados__; }, get abiertos(){ return __abiertos__; },',
  '  timers: function(){ return Object.keys(__timers__).length; },',
  '  correrTimers: function(){ var ks = Object.keys(__timers__); ks.forEach(function(k){ var f = __timers__[k]; delete __timers__[k]; f(); }); return ks.length; },',
  '  get subiendo(){ return _seriesSubiendo; }, set reintentoAt(v){ _u19ReintentoAt = v; },',
  '  HC_SECCIONES: HC_SECCIONES, HC_NUCLEO: HC_NUCLEO, RC_RED_FLAGS: RC_RED_FLAGS, PERSONA_CAMPOS: PERSONA_CAMPOS };'
].join('\n');
function mundo() {
  try { return new Function(CODIGO)(); }
  catch (e) { muere('el código no evalúa aislado: ' + e.message); }
}
const tic = () => new Promise(r => setImmediate(r));
const ticks = async (n) => { for (let i = 0; i < (n || 12); i++) await tic(); };
/* Un DOM de mentira para el formulario de la historia: todos sus campos
   existen, vacios salvo lo que se diga. */
function domHistoria(W, valores) {
  const d = {};
  W.HC_SECCIONES.forEach(s => s.campos.forEach(cp => { d['hc-' + cp.k] = { value: '' }; }));
  for (let i = 0; i < 5; i++) ['a', 'i', 'f'].forEach(x => { d['hc-psfs-' + x + '-' + i] = { value: '' }; });
  for (let i = 0; i < 8; i++) ['e', 'f', 'v', 'n'].forEach(x => { d['hc-cu-' + x + '-' + i] = { value: '' }; });
  Object.keys(valores || {}).forEach(k => { d[k] = { value: valores[k] }; });
  W.dom = d;
  return d;
}

let ok = 0;
const fallos = [], avisos = [];
const falla = (n, d) => fallos.push(n + (d ? '  →  ' + d : ''));
const comprobar = (n, c, d) => { if (c) ok++; else falla(n, d); };
const igual = (n, a, b) => { if (a === b) ok++; else falla(n, 'esperaba ' + JSON.stringify(b) + ', obtuvo ' + JSON.stringify(a)); };
const aviso = (t) => avisos.push(t);

(async () => {

/* --- 1 · Guardar fusiona; leer valida -------------------------------- */
{
  const W = mundo(), M = W.fn;
  const F = M.historiaFusionar_({ dx: 'vieja', algoQueNoConoce: 'se queda' }, { motivo: 'dolor' }, 123);
  igual('fusionar · lo que el formulario no conoce se queda', F.algoQueNoConoce, 'se queda');
  igual('fusionar · lo de antes que no se tocó, también', F.dx, 'vieja');
  igual('fusionar · marca versión y fecha', F.v + '|' + F.updatedAt, '2|123');
  comprobar('fusionar · una ficha rota (lista, nada) no revienta', M.historiaFusionar_([1, 2], { a: 'x' }, 1).a === 'x' && M.historiaFusionar_(null, {}, 1).v === 2);
  const N = M.hcNum010_;
  igual('0-10 · vacío es no evaluado', N(''), '');
  igual('0-10 · el cero vale', N('0'), '0');
  igual('0-10 · con coma', N('7,5'), '7.5');
  comprobar('0-10 · fuera de rango o letras: null', N('11') === null && N('-1') === null && N('abc') === null);

  W.state.clients.push({ id: 'c1', name: 'Ana', type: 'rehab', ficha: { dx: 'hipótesis vieja', loDeOtraVersion: 'no se toca' } });
  domHistoria(W, { 'hc-motivo': 'Dolor de rodilla', 'hc-evaAct': '0', 'hc-psfs-a-0': 'subir escalera', 'hc-psfs-i-0': '3', 'hc-psfs-f-0': '',
    'hc-cu-e-0': 'ODI', 'hc-cu-v-0': '32', 'hc-cu-f-0': '2026-09-01', 'hc-dx': 'hipótesis nueva' });
  W.sinPuente = true;
  const r = M.hcLeerFormulario_();
  igual('leer · sin errores con datos buenos', r.errores.length, 0);
  igual('leer · el cero de dolor se guarda como 0', r.datos.evaAct, '0');
  igual('leer · la actividad del PSFS con su puntaje', JSON.stringify(r.datos.psfs), JSON.stringify([{ a: 'subir escalera', i: '3', f: '' }]));
  igual('leer · el cuestionario con fecha', r.datos.cuest.length + '|' + r.datos.cuest[0].e + '|' + r.datos.cuest[0].f, '1|ODI|2026-09-01');
  comprobar('leer · cada campo del formulario tiene su dato', W.HC_SECCIONES.every(s => s.campos.every(cp => cp.k in r.datos)), 'un campo se pierde al guardar');

  M.hcGuardar_('c1');
  const f = W.state.clients[0].ficha;
  igual('guardar · NO borra lo que el formulario no conoce (el fallo de antes)', f.loDeOtraVersion, 'no se toca');
  igual('guardar · y escribe lo nuevo', f.dx + '|' + f.motivo, 'hipótesis nueva|Dolor de rodilla');
  comprobar('guardar · cierra el formulario y lo dice', W.cerrados === 1 && W.toasts.some(t => /Historia guardada/.test(t)));

  const W2 = mundo();
  W2.state.clients.push({ id: 'c2', name: 'Luis', ficha: { dx: 'x' } });
  domHistoria(W2, { 'hc-evaPeor': '12', 'hc-psfs-a-0': '', 'hc-psfs-i-0': '5', 'hc-cu-e-1': 'NDI', 'hc-cu-f-2': '2026-01-01', 'hc-cu-e-3': 'ODI', 'hc-cu-v-3': '10', 'hc-cu-f-3': '01-09-2026' });
  W2.sinPuente = true;
  const r2 = W2.fn.hcLeerFormulario_();
  comprobar('leer · un dolor de 12 es un error, no un dato', r2.errores.some(e => /peor momento: va de 0 a 10/.test(e)));
  comprobar('leer · un puntaje de PSFS sin actividad se avisa', r2.errores.some(e => /PSFS fila 1: falta la actividad/.test(e)));
  comprobar('leer · una escala sin puntaje se avisa', r2.errores.some(e => /Cuestionario 2: falta el puntaje/.test(e)));
  comprobar('leer · una fila con solo la fecha se avisa (falta la escala)', r2.errores.some(e => /Cuestionario 3: falta la escala/.test(e)));
  comprobar('leer · una fecha al revés se avisa', r2.errores.some(e => /AAAA-MM-DD/.test(e)));
  const okG = W2.fn.hcGuardar_('c2');
  comprobar('guardar · con errores no guarda, no cierra y lo dice', okG === false && W2.state.clients[0].ficha.dx === 'x' && W2.cerrados === 0 && W2.toasts.some(t => /\[error\]/.test(t)));
  aviso('guardar y leer · veintidós casos');
}

/* --- 2 · Una sola forma de contarla ---------------------------------- */
{
  const W = mundo(), M = W.fn;
  igual('contar · una historia vacía no es una historia de «No evaluado»', M.historiaSecciones_({ ficha: {} }).length, 0);
  igual('contar · sin ficha, nada', M.historiaSecciones_({}).length, 0);
  const c = { name: 'Ana', ficha: { motivo: 'Dolor <b>', evaAct: '6', irritabilidad: 'Alta',
    psfs: [{ a: 'subir escalera', i: '3', f: '7' }, { a: 'correr', i: '', f: '' }, { a: '' }],
    cuest: [{ e: 'ODI', f: '2026-09-01', v: '32', n: 'moderada' }, { e: 'NDI', v: '' }] },
    evals: [{ fecha: '2026-09-01' }, { fecha: '2026-09-10' }] };
  const S = M.historiaSecciones_(c);
  const sec = (t) => S.find(s => s.titulo === t) || { filas: [] };
  const fila = (t, k) => (sec(t).filas.find(r => r.k === k) || {}).v;
  igual('contar · el motivo con su etiqueta, sin escapar (se escapa al pintar)', fila('Motivo y meta', 'Consulta por'), 'Dolor <b>');
  igual('contar · el dolor en /10 y la etiqueta sin «(0–10)»', fila('Historia del problema actual (PQRST)', 'S · Dolor ahora'), '6/10');
  igual('contar · la etiqueta corta de la irritabilidad', fila('Historia del problema actual (PQRST)', 'Irritabilidad'), 'Alta');
  igual('contar · el PSFS con ingreso y ahora', fila('Motivo y meta', 'PSFS · subir escalera'), 'ingreso 3/10 · ahora 7/10');
  igual('contar · una actividad sin puntaje lo dice', fila('Motivo y meta', 'PSFS · correr'), 'ingreso sin puntaje');
  igual('contar · y una fila sin actividad no cuenta', sec('Motivo y meta').filas.filter(r => /^PSFS/.test(r.k)).length, 2);
  igual('contar · el cuestionario con su fecha y su nota', fila('Cuestionarios y tests con puntaje', 'ODI · 2026-09-01'), '32 — moderada');
  igual('contar · un cuestionario sin puntaje no cuenta', sec('Cuestionarios y tests con puntaje').filas.length, 1);
  igual('contar · la evaluación funcional, resumida', fila('Examen físico', 'Evaluación funcional'), '2 registrada(s) · última 2026-09-10');
  const cif = sec('Síntesis funcional (CIF)').filas;
  igual('contar · el CIF sale entero aunque esté vacío', cif.length, W.HC_SECCIONES.find(s => s.id === 'cif').campos.length);
  comprobar('contar · y lo vacío del CIF dice «No evaluado»', cif.every(r => r.v === 'No evaluado'));
  igual('contar · la seguridad sin tamizaje dice «No evaluado»', fila('Seguridad (banderas rojas)', 'Tamizaje'), 'No evaluado');
  const iAct = S.findIndex(s => s.id === 'actual'), iSeg = S.findIndex(s => s.id === 'seguridad');
  comprobar('contar · la seguridad va justo después del problema actual, como en su plantilla', iAct >= 0 && iSeg === iAct + 1);
  const conFlags = M.historiaSecciones_({ ficha: { motivo: 'x' }, redFlags: { fecha: '2026-09-11', blocked: true, flags: [0, 12] } });
  const tam = ((conFlags.find(s => s.id === 'seguridad') || { filas: [{}] }).filas[0] || {}).v || '';
  comprobar('contar · con banderas: derivar, con cuáles y la de trombosis nueva', /derivar/.test(tam) && /Dolor nocturno/.test(tam) && /trombosis/.test(tam), tam);
  const D = M.historiaDoc_(c);
  comprobar('a Notion · solo texto: título y filas {k, v} de strings, sin claves de más',
    D.secciones.every(s => Object.keys(s).join() === 'titulo,filas' && s.filas.every(r => typeof r.k === 'string' && typeof r.v === 'string' && Object.keys(r).join() === 'k,v')));
  igual('a Notion · lo mismo que cuenta la pestaña', D.secciones.length, S.length);
  const T = M.historiaTexto_(c);
  comprobar('copiar · encabezado con el nombre y la fecha', T.indexOf('# Historia · Ana · 2026-09-11') === 0);
  comprobar('copiar · con sus títulos y filas en negrita', T.indexOf('## Síntesis funcional (CIF)') > 0 && T.indexOf('- **Consulta por:** Dolor <b>') > 0);
  igual('copiar · vacía no copia nada', M.historiaTexto_({ ficha: {} }), '');
  aviso('contar · diecinueve casos');
}

/* --- 3 · El núcleo y la síntesis ------------------------------------- */
{
  const W = mundo(), M = W.fn;
  const K = M.historiaCompletitud_;
  const k0 = K({ ficha: {} });
  igual('núcleo · diecisiete cosas', k0.total, 17);
  igual('núcleo · vacío, cero', k0.hechos, 0);
  comprobar('núcleo · dice qué falta con las etiquetas del formulario', k0.faltan.indexOf('Consulta por') >= 0 && k0.faltan.indexOf('PSFS con puntaje') >= 0 && k0.faltan.indexOf('banderas rojas') >= 0);
  comprobar('núcleo · con las etiquetas cortas, que se leen en una línea', k0.faltan.indexOf('Irritabilidad') >= 0 && k0.faltan.indexOf('S · Dolor ahora') >= 0,
    k0.faltan.join(' | '));
  igual('núcleo · un PSFS sin puntaje no cuenta', K({ ficha: { psfs: [{ a: 'x', i: '' }] } }).hechos, 0);
  igual('núcleo · con puntaje, sí', K({ ficha: { psfs: [{ a: 'x', i: '0' }] } }).hechos, 1);
  igual('núcleo · el contexto ambiental vale con la barrera sola', K({ ficha: { ambBar: 'escaleras' } }).hechos, 1);
  igual('núcleo · el tamizaje de banderas cuenta', K({ ficha: {}, redFlags: { fecha: '2026-09-11' } }).hechos, 1);
  const P = M.historiaProponerSintesis_;
  igual('síntesis · sin actividades o funciones no propone', P({ funciones: 'dolor' }), '');
  const s = P({ actividades: 'subir escaleras sin apoyo', funciones: 'dolor EVA 6/10; y más', estructuras: 'rodilla derecha',
    perBar: 'miedo a moverse', ambBar: 'escaleras en casa', participacion: 'jugar fútbol', perFac: 'motivación' });
  comprobar('síntesis · la actividad, lo que la explica y lo que la modula', s.indexOf('La limitación de subir escaleras sin apoyo se explica por dolor EVA 6/10 (rodilla derecha)') === 0, s);
  comprobar('síntesis · con las barreras y la participación', s.indexOf('modulada por miedo a moverse y escaleras en casa') > 0 && s.indexOf('hoy le restringe jugar fútbol') > 0, s);
  comprobar('síntesis · y lo que juega a favor, aparte', /A favor: motivación\.$/.test(s), s);
  comprobar('síntesis · un texto largo se corta', P({ actividades: 'a'.repeat(300), funciones: 'b' }).indexOf('a'.repeat(140) + '…') > 0);
  aviso('núcleo y síntesis · once casos');
}

/* --- 4 · El formulario ------------------------------------------------ */
{
  const W = mundo(), M = W.fn;
  W.state.clients.push({ id: 'c1', name: 'Ana <x>', type: 'rehab', ficha: { motivo: '<img src=x onerror=alert(1)>', fase: 'Un valor viejo', meta: '"cita"',
    cuest: [1, 2, 3, 4, 5, 6, 7].map(i => ({ e: 'ODI', v: String(i) })) } });
  M.openFichaClinica('c1');
  const m = W.modales[W.modales.length - 1] || {};
  const h = m.bodyHtml || '';
  igual('formulario · se abre con el nombre', m.title, '📄 Historia clínica · Ana <x>');
  comprobar('formulario · cada campo tiene su control', W.HC_SECCIONES.every(s => s.campos.every(cp => h.indexOf('id="hc-' + cp.k + '"') >= 0)), 'falta un control');
  comprobar('formulario · lo escrito va escapado (sin inyectar HTML)', h.indexOf('<img src=x') < 0 && h.indexOf('&lt;img src=x') > 0 && h.indexOf('&quot;cita&quot;') > 0);
  comprobar('formulario · un valor que ya no está en la lista no se pierde', /<option value="Un valor viejo" selected>/.test(h));
  igual('formulario · cinco filas de PSFS', (h.match(/id="hc-psfs-a-/g) || []).length, 5);
  igual('formulario · con 7 cuestionarios, 9 filas (siempre sobra sitio)', (h.match(/id="hc-cu-e-/g) || []).length, 9);
  comprobar('formulario · dice qué falta del núcleo', /Núcleo \d+ de 17/.test(h));
  comprobar('formulario · la seguridad con su botón, que guarda antes', h.indexOf("hcGuardarY_('c1','banderas')") > 0);
  igual('formulario · cuatro botones', (m.footer || []).length, 4);
  aviso('formulario · nueve casos');
}

/* --- 5 · La historia en Notion ---------------------------------------- */
{
  /* sin puente no se marca nada */
  let W = mundo();
  W.sinPuente = true;
  W.state.clients.push({ id: 'c1', name: 'Ana', type: 'rehab', personaNotionId: 'P1', ficha: { motivo: 'x', updatedAt: 5 } });
  W.fn.historiaTrasGuardar_(W.state.clients[0]);
  comprobar('historia · sin puente no queda pendiente ni se pide nada', !W.state.clients[0].historiaPend && W.pedidos.length === 0);

  /* con su persona: va a Notion al instante */
  W = mundo();
  const c = { id: 'c1', name: 'Ana', type: 'rehab', personaNotionId: 'P1', ficha: { motivo: 'x', updatedAt: 777 } };
  W.state.clients.push(c);
  W.resps = [{ ok: true, accion: 'crear' }];
  W.fn.historiaTrasGuardar_(c);
  await ticks();
  const p0 = (W.pedidos[0] || {}).body || {};
  igual('historia · pide la op «historia» a la persona, con la versión', [p0.op, p0.personaId, p0.version].join('|'), 'historia|P1|777');
  comprobar('historia · manda el documento en secciones', Array.isArray((p0.doc || {}).secciones) && p0.doc.secciones.length > 0);
  comprobar('historia · sin aceptar avisos por su cuenta', !p0.aceptoAvisos);
  comprobar('historia · con el ok, deja de estar pendiente y lo recuerda', !c.historiaPend && c.historiaNotion && c.historiaNotion.version === 777);

  /* asistente sin publicar */
  W = mundo();
  const c2 = { id: 'c2', name: 'Luis', type: 'rehab', personaNotionId: 'P2', ficha: { motivo: 'x', updatedAt: 1 } };
  W.state.clients.push(c2);
  W.resps = [{ ok: false, error: 'operacion desconocida: historia' }];
  W.fn.historiaTrasGuardar_(c2);
  await ticks();
  comprobar('historia · con el asistente sin publicar queda pendiente y dice por qué', c2.historiaPend && c2.historiaPend.motivo === 'falta publicar el asistente');
  comprobar('historia · y lo avisa sin alarmar', W.toasts.some(t => /falta publicar el asistente/.test(t) && /\[warn\]/.test(t)));

  /* editada a mano en Notion: se pregunta */
  W = mundo();
  const c3 = { id: 'c3', name: 'Eva', personaNotionId: 'P3', historiaPend: { version: 9 }, ficha: { motivo: 'x', updatedAt: 9 } };
  W.state.clients.push(c3);
  W.resps = [{ ok: false, avisos: ['La historia en Notion se editó a mano'] }, { ok: true, accion: 'conservar_copia' }];
  await W.fn.historiaNotionSubir('c3');
  await ticks();
  comprobar('historia · editada a mano: pregunta antes de escribir', W.confirms.some(t => /se editó a mano/.test(t)));
  igual('historia · con el sí, reintenta aceptando el aviso', ((W.pedidos[1] || {}).body || {}).aceptoAvisos, true);
  comprobar('historia · y queda al día', !c3.historiaPend);
  W = mundo();
  W.confirmar = false;
  const c4 = { id: 'c4', name: 'Eva', personaNotionId: 'P4', historiaPend: { version: 9 }, ficha: { motivo: 'x', updatedAt: 9 } };
  W.state.clients.push(c4);
  W.resps = [{ ok: false, avisos: ['editada a mano'] }];
  await W.fn.historiaNotionSubir('c4');
  comprobar('historia · con el no, una sola petición y sigue pendiente', W.pedidos.length === 1 && !!c4.historiaPend);

  /* la red cae */
  W = mundo();
  const c5 = { id: 'c5', name: 'Eva', personaNotionId: 'P5', historiaPend: { version: 3 }, ficha: { motivo: 'x', updatedAt: 3 } };
  W.state.clients.push(c5);
  W.resps = ['RED'];
  await W.fn.historiaNotionSubir('c5');
  comprobar('historia · sin red sigue pendiente y dice por qué', c5.historiaPend && /sin conexión/.test(c5.historiaPend.motivo));

  /* se edito otra vez mientras subia: lo nuevo sigue pendiente */
  W = mundo();
  const c6 = { id: 'c6', name: 'Eva', personaNotionId: 'P6', historiaPend: { version: 10 }, ficha: { motivo: 'x', updatedAt: 10 } };
  W.state.clients.push(c6);
  W.resps = [function(){ c6.historiaPend = { version: 11 }; c6.ficha.updatedAt = 11; return { ok: true }; }, { ok: true }];
  await W.fn.historiaNotionSubir('c6');
  comprobar('historia · un ok de la versión vieja no borra lo nuevo', c6.historiaPend && c6.historiaPend.version === 11);

  /* dos a la vez: una peticion, y la otra al terminar */
  W = mundo();
  const c7 = { id: 'c7', name: 'Eva', personaNotionId: 'P7', historiaPend: { version: 1 }, ficha: { motivo: 'x', updatedAt: 1 } };
  W.state.clients.push(c7);
  W.resps = [{ ok: true }, { ok: true }];
  const a1 = W.fn.historiaNotionSubir('c7');
  c7.historiaPend = { version: 2 }; c7.ficha.updatedAt = 2;
  W.fn.historiaNotionSubir('c7');
  igual('historia · dos subidas a la vez: una sola petición en vuelo', W.pedidos.length, 1);
  await a1; await ticks();
  igual('historia · y la segunda sale al terminar, con la versión nueva', ((W.pedidos[1] || {}).body || {}).version, 2);

  /* sin persona: la de readaptacion se crea primero */
  W = mundo();
  const c8 = { id: 'c8', name: 'Rosa Pérez', phone: '+56911112222', type: 'rehab', ficha: { motivo: 'x', updatedAt: 4 } };
  W.state.clients.push(c8);
  W.resps = [{ ok: true, id: 'PNEW' }, { ok: true }];
  W.fn.historiaTrasGuardar_(c8);
  await ticks(20);
  igual('historia · sin persona, primero se crea la persona', ((W.pedidos[0] || {}).body || {}).op, 'crear_persona');
  igual('historia · y después la historia, en la persona nueva', [((W.pedidos[1] || {}).body || {}).op, ((W.pedidos[1] || {}).body || {}).personaId].join('|'), 'historia|PNEW');
  W = mundo();
  W.confirmar = false;
  const c9 = { id: 'c9', name: 'Tomás', type: 'gym', ficha: { motivo: 'x', updatedAt: 4 } };
  W.state.clients.push(c9);
  W.fn.historiaTrasGuardar_(c9);
  await ticks();
  comprobar('historia · a un socio del gimnasio se le pregunta antes de crearle ficha de persona', W.confirms.length === 1 && W.pedidos.length === 0 && !!c9.historiaPend);
  aviso('historia en Notion · diecisiete casos, ejecutados');
}

/* --- 6 · La persona en la base de personas ---------------------------- */
{
  let W = mundo(), M = W.fn;
  const P = M.personaPayload_;
  const nueva = { name: ' Rosa ', phone: '+56911112222', rut: '12.345.678-5', notionNacimiento: '1980-01-02', personaLlegada: 'Derivacion medica',
    personaEstado: 'En tratamiento', personaPrimera: '2026-09-11', notionId: 'GYM1' };
  const d = P({}, nueva, true);
  igual('persona · nueva: manda todo lo que tiene', Object.keys(d).sort().join(), 'comoLlego,estado,nacimiento,nombre,primera,rut,socioId,whatsapp');
  igual('persona · el nombre sin espacios de sobra', d.nombre, 'Rosa');
  comprobar('persona · una llegada o un estado que Notion no tiene no viajan', !('comoLlego' in P({}, { personaLlegada: 'Instagram' }, true)) && !('estado' in P({}, { personaEstado: 'Activo' }, true)));
  igual('persona · en una edición, solo lo que cambió', Object.keys(P(nueva, Object.assign({}, nueva, { phone: '+56933334444' }), false)).join(), 'whatsapp');
  const mz = M.personaPendMezclar_({ datos: { nota: 'uno', estado: 'En tratamiento' } }, { nota: 'dos', estado: 'De alta' }, 5);
  igual('persona · dos notas sin subir se juntan', mz.datos.nota, 'uno · dos');
  igual('persona · y el estado nuevo gana', mz.datos.estado, 'De alta');
  const cc = M.personaCrearCuerpo_(Object.assign({}, nueva, { personaPrimera: '' }));
  igual('persona · crear usa el mismo cuerpo que Series', Object.keys(cc).sort().join(), 'comoLlego,nacimiento,nombre,op,primera,rut,socioId,whatsapp');
  igual('persona · sin primera consulta, la de hoy', cc.primera, '2026-09-11');

  const hR = M.personaSeccionHtml_({ type: 'rehab' }, false);
  comprobar('formulario · readaptación: la sección se ve y la casilla va marcada', hR.indexOf(' hidden') < 0 && /id="cf-persona"[^>]* checked/.test(hR));
  comprobar('formulario · ofrece las llegadas con su nombre legible', hR.indexOf('>Derivación médica<') > 0);
  const hG = M.personaSeccionHtml_({ type: 'gym' }, false);
  comprobar('formulario · gimnasio: la sección está pero escondida', hG.indexOf(' hidden') > 0 && !/id="cf-persona"[^>]* checked/.test(hG));
  const hE = M.personaSeccionHtml_({ type: 'gym', personaNotionId: 'P' }, true);
  comprobar('formulario · con ficha ya enlazada se ve aunque sea del gimnasio', hE.indexOf(' hidden') < 0 && hE.indexOf('data-enlazada="1"') > 0);
  W.sinPuente = true;
  comprobar('formulario · sin puente, la casilla va apagada', /id="cf-persona"[^>]* disabled/.test(M.personaSeccionHtml_({ type: 'rehab' }, false)));
  W.sinPuente = false;
  W.dom = { 'cf-p-llega': { value: '' }, 'cf-p-est': { value: 'Solo evaluado' }, 'cf-p-pri': { value: '' }, 'cf-p-nota': { value: ' ojo ' }, 'cf-persona': { checked: true } };
  const lf = M.personaLeerFormulario_(true);
  comprobar('formulario · en una edición, lo vacío no borra', !('personaLlegada' in lf.campos) && lf.campos.personaEstado === 'Solo evaluado' && lf.nota === 'ojo' && lf.subir === true);

  /* el tipo cambia la seccion */
  const dom = { 'cf-notion': { checked: true, dataset: {} }, 'cf-persona': { checked: false, dataset: {}, disabled: false }, 'cf-persona-sec': { hidden: true, open: false } };
  W.dom = dom;
  M.fichaTipoCambia_('rehab');
  comprobar('tipo · a readaptación: se ve, se abre y se marca; la del gimnasio se desmarca', !dom['cf-persona-sec'].hidden && dom['cf-persona-sec'].open && dom['cf-persona'].checked && !dom['cf-notion'].checked);
  M.fichaTipoCambia_('gym');
  comprobar('tipo · de vuelta a gimnasio: se esconde y se desmarca', dom['cf-persona-sec'].hidden && !dom['cf-persona'].checked);
  dom['cf-persona'].dataset.tocado = '1'; dom['cf-persona'].checked = true;
  M.fichaTipoCambia_('gym');
  igual('tipo · lo que Diego tocó no se cambia solo', dom['cf-persona'].checked, true);

  /* crear al guardar */
  W = mundo(); M = W.fn;
  const c = { id: 'c1', name: 'Rosa Pérez', phone: '+56911112222', type: 'rehab', personaEstado: 'Solo evaluado', personaLlegada: 'Redes' };
  W.state.clients.push(c);
  W.state.series.push({ id: 's1', clienteId: 'c1', notionId: 'S1', sesiones: [] }, { id: 's2', clienteId: 'otro' });
  W.resps = [{ ok: true, id: 'P1' }, { ok: true }];
  M.personaTrasGuardar_(c, {}, { subir: true, nota: 'llegó derivada', campos: {} });
  await ticks(20);
  const b0 = (W.pedidos[0] || {}).body || {};
  igual('crear · pide crear_persona con sus datos', [b0.op, b0.nombre, b0.whatsapp, b0.comoLlego].join('|'), 'crear_persona|Rosa Pérez|+56911112222|Redes');
  igual('crear · guarda el id de su ficha', c.personaNotionId, 'P1');
  comprobar('crear · sus series quedan con esa persona (y la ya subida, por actualizar)', W.state.series[0].personaId === 'P1' && W.state.series[0].notionSucio === true && !W.state.series[1].personaId);
  const b1 = (W.pedidos[1] || {}).body || {};
  igual('crear · el estado y la nota, que crear no escribe, van después', [b1.op, b1.personaId, (b1.datos || {}).estado, (b1.datos || {}).nota].join('|'), 'actualizar_persona|P1|Solo evaluado|llegó derivada');
  comprobar('crear · y no queda nada pendiente', !c.personaPend, JSON.stringify(c.personaPend));
  comprobar('crear · lo dice', W.toasts.some(t => /Ficha creada en Notion/.test(t)));

  W = mundo(); M = W.fn;
  const e = { id: 'e1', name: 'Rosa Pérez', type: 'rehab' };
  W.state.clients.push(e);
  W.resps = [{ ok: true, id: 'P9', existia: true, nombre: 'Rosita Perez', parecidas: [{ id: 'x', nombre: 'Rosa P.' }] }];
  await M.personaNotionSubir('e1', { auto: true });
  comprobar('crear · si ya estaba, se enlaza y avisa si se llama distinto', e.personaNotionId === 'P9' && W.toasts.some(t => /se llama distinto/i.test(t)));
  comprobar('crear · y dice cuál se parece', W.toasts.some(t => /otra parecida \(Rosa P\.\)/.test(t)));

  W = mundo(); M = W.fn;
  const du = { id: 'd1', name: 'Rosa', type: 'rehab' };
  W.state.clients.push(du);
  W.resps = [{ ok: false, dudoso: true, error: 'Notion no confirmó' }];
  await M.personaNotionSubir('d1', { auto: true });
  comprobar('dudoso · queda marcado y sin id', du.personaPend && du.personaPend.dudoso === true && !du.personaNotionId);
  await M.personaNotionSubir('d1', { auto: true });
  igual('dudoso · no se reintenta solo', W.pedidos.length, 1);
  W.confirmar = false;
  await M.personaNotionSubir('d1');
  igual('dudoso · a mano, se pregunta; con el no, nada', W.pedidos.length, 1);
  W.confirmar = true; W.resps = [{ ok: true, id: 'P3', existia: true, nombre: 'Rosa' }];
  await M.personaNotionSubir('d1');
  comprobar('dudoso · con el sí, reintenta (el asistente la reconoce si ya estaba)', W.pedidos.length === 2 && du.personaNotionId === 'P3');

  W = mundo(); M = W.fn;
  const u = { id: 'u1', name: 'Rosa', type: 'rehab', personaNotionId: 'P1', personaPend: { datos: { whatsapp: '+56955556666' }, ts: 1 } };
  W.state.clients.push(u);
  W.resps = [{ ok: true, cambios: [{ columna: 'WhatsApp' }] }];
  await M.personaNotionSubir('u1', { auto: true });
  const bu = (W.pedidos[0] || {}).body || {};
  igual('actualizar · manda solo lo pendiente a su ficha', [bu.op, bu.personaId, Object.keys(bu.datos || {}).join()].join('|'), 'actualizar_persona|P1|whatsapp');
  comprobar('actualizar · y queda al día', !u.personaPend);
  W = mundo(); M = W.fn;
  const u2 = { id: 'u2', name: 'Rosa', type: 'rehab', personaNotionId: 'P1', personaPend: { datos: { estado: 'De alta' }, ts: 1 } };
  W.state.clients.push(u2);
  W.resps = [{ ok: false, error: 'operacion desconocida: actualizar_persona' }];
  await M.personaNotionSubir('u2', { auto: true });
  comprobar('actualizar · sin el asistente publicado, sigue pendiente y dice por qué', u2.personaPend && u2.personaPend.motivo === 'falta publicar el asistente');

  W = mundo(); M = W.fn;
  const l = { id: 'l1', name: 'Rosa', type: 'rehab' };
  W.state.clients.push(l);
  W.resps = [{ ok: true, id: 'PL' }];
  const x1 = M.personaNotionSubir('l1', { auto: true }), x2 = M.personaNotionSubir('l1', { auto: true });
  await x1; await x2;
  igual('candado · dos subidas a la vez crean UNA sola ficha', W.pedidos.length, 1);

  W = mundo(); M = W.fn;
  const T = M.personaTarjetaHtml_;
  comprobar('tarjeta · pendiente, con el motivo escapado', T({ id: 'a', personaPend: { motivo: '<b>x</b>' } }).indexOf('⏳ Notion · persona') > 0 && T({ id: 'a', personaPend: { motivo: '<b>x</b>' } }).indexOf('<b>x</b>') < 0);
  comprobar('tarjeta · enlazada', T({ id: 'a', personaNotionId: 'P' }).indexOf('🟢 Notion · persona') > 0);
  comprobar('tarjeta · de readaptación sin ficha: botón para crearla', T({ id: 'a', type: 'rehab' }).indexOf('Crear en Notion') > 0 && T({ id: 'a', type: 'gym' }) === '');
  comprobar('tarjeta · la historia sin subir se ve', T({ id: 'a', historiaPend: { version: 1 } }).indexOf('⏳ Historia sin subir') > 0);
  aviso('persona · treinta y dos casos, ejecutados');
}

/* --- 7 · El puente, leído con rigor ----------------------------------- */
{
  const W = mundo(), M = W.fn;
  const prueba = async (resp) => { W.resps = [resp]; try { return await M.u19SeriesPedir_({ op: 'x' }); } catch (e) { return 'ERROR: ' + e.message; } };
  comprobar('puente · lo que no es JSON es un error', /no contestó con datos/.test(await prueba('<html>Ultra-Sport19</html>')));
  comprobar('puente · un «status ok» de un asistente viejo NO es un éxito', /falta publicarlo/.test(await prueba({ status: 'ok' })));
  comprobar('puente · la clave mala se dice', /clave de la app no coincide/.test(await prueba({ error: 'clave_invalida' })));
  const des = await prueba({ ok: false, error: 'operacion desconocida: historia' });
  comprobar('puente · una operación desconocida se marca como «sin publicar»', des && des.desconocida === true);
  const bien = await prueba({ ok: true, id: 'Z' });
  comprobar('puente · un ok de verdad pasa tal cual', bien && bien.ok === true && bien.id === 'Z' && !bien.desconocida);
  aviso('puente · cinco casos');
}

/* --- 8 · La ficha del gimnasio se escribe sola si no hay nada que decidir */
{
  let W = mundo(), M = W.fn;
  const S = M.fichaSoloOk_;
  const limpio = { ok: true, cambios: [{ columna: 'WhatsApp' }], avisos: [], errores: [], duplicados: [] };
  comprobar('solo · limpio: sí', S({ op: 'actualizar' }, limpio, 'Ana') === true);
  comprobar('solo · con avisos: no', S({ op: 'actualizar' }, Object.assign({}, limpio, { avisos: ['ojo'] }), 'Ana') === false);
  comprobar('solo · con errores: no', S({ op: 'crear' }, Object.assign({}, limpio, { errores: ['mal'] }), 'Ana') === false);
  comprobar('solo · crear con una ficha parecida: no', S({ op: 'crear' }, Object.assign({}, limpio, { duplicados: [{ id: 'x' }] }), 'Ana') === false);
  comprobar('solo · salvo que Diego ya dijera que es otra persona', S({ op: 'crear', forzar: true }, Object.assign({}, limpio, { duplicados: [{ id: 'x' }] }), 'Ana') === true);
  comprobar('solo · a una ficha de Notion con otro nombre: no', S({ op: 'actualizar' }, Object.assign({}, limpio, { nombreNotion: 'Oliver Gaete' }), 'Axel Gaete') === false);
  comprobar('solo · el mismo nombre con otras tildes o el 📱: sí', S({ op: 'actualizar' }, Object.assign({}, limpio, { nombreNotion: '📱 ÁNA' }), 'Ana') === true);
  comprobar('solo · un «ok:false» o «nada»: no', S({ op: 'actualizar' }, { ok: false }, 'A') === false && S({ op: 'actualizar' }, { ok: true, nada: true }, 'A') === false);

  W = mundo(); M = W.fn;
  const c = { id: 'c1', name: 'Ana', notionId: 'N1', notionPend: { datos: { whatsapp: '+56911112222' }, ts: 7 } };
  W.state.clients.push(c);
  W.resps = [limpio, { ok: true }];
  const r = await M.fichaNotionSubir('c1', { auto: true });
  igual('inmediato · simula y escribe: dos peticiones', W.pedidos.length, 2);
  comprobar('inmediato · la primera simula, la segunda escribe', W.pedidos[0].body.simular === true && !W.pedidos[1].body.simular);
  igual('inmediato · sin vista previa no acepta avisos por Diego', W.pedidos[1].body.aceptoAvisos, false);
  comprobar('inmediato · sin ventana, sin cerrar otras y al día', W.modales.length === 0 && W.cerrados === 0 && !c.notionPend && r === true);
  comprobar('inmediato · lo dice', W.toasts.some(t => /Guardado en Notion ✓/.test(t)));

  W = mundo(); M = W.fn;
  const c2 = { id: 'c2', name: 'Ana', notionId: 'N1', notionPend: { datos: { membresia: 'Inactivo' }, ts: 7 } };
  W.state.clients.push(c2);
  W.resps = [Object.assign({}, limpio, { avisos: ['vence el 30'] })];
  await M.fichaNotionSubir('c2', { auto: true });
  comprobar('inmediato · con un aviso: vista previa, explicando por qué no se escribió solo',
    W.pedidos.length === 1 && W.modales.length === 1 && /no lo escribí solo/.test(W.modales[0].bodyHtml));
  W = mundo(); M = W.fn;
  const c3 = { id: 'c3', name: 'Ana', notionId: 'N1', notionPend: { datos: { membresia: 'Inactivo' }, ts: 7 } };
  W.state.clients.push(c3);
  W.resps = [Object.assign({}, limpio, { avisos: ['vence el 30'] })];
  await M.fichaNotionSubir('c3', { auto: true, silencioso: true });
  comprobar('callado · con un aviso no abre nada ni avisa: espera en la tarjeta', W.modales.length === 0 && W.toasts.length === 0 && !!c3.notionPend);
  W = mundo(); M = W.fn;
  const c4 = { id: 'c4', name: 'Ana', notionId: 'N1', notionPend: { datos: { plan: 'Plan 3x/semana' }, ts: 7 } };
  W.state.clients.push(c4);
  W.resps = [{ ok: true, nada: true }];
  await M.fichaNotionSubir('c4', { auto: true, silencioso: true });
  comprobar('callado · si en Notion ya está así, se limpia sin avisar', !c4.notionPend && W.toasts.length === 0);
  W = mundo(); M = W.fn;
  const c5 = { id: 'c5', name: 'Ana', notionId: 'N1', notionPend: { datos: { plan: 'Plan 3x/semana' }, ts: 7 } };
  W.state.clients.push(c5);
  W.resps = [limpio];
  await M.fichaNotionSubir('c5');
  comprobar('a mano · siempre con vista previa y sin la explicación del envío solo', W.modales.length === 1 && !/no lo escribí solo/.test(W.modales[0].bodyHtml) && W.pedidos.length === 1);
  aviso('ficha inmediata · dieciséis casos, ejecutados');
}

/* --- 9 · Series sube sola --------------------------------------------- */
{
  let W = mundo(), M = W.fn;
  W.state.clients.push({ id: 'c1', name: 'Ana', personaNotionId: 'P1' });
  W.state.series.push({ id: 's1', clienteId: 'c1', nombre: 'Ana', indicadas: 10, creada: '2026-09-11', orden: { adjunta: true },
    sesiones: [{ fecha: '2026-09-11', asistio: true, nota: 'bien' }] });
  M.seriesAutoSubir_(); M.seriesAutoSubir_();
  igual('auto · varios cambios seguidos: una sola subida programada', W.timers(), 1);
  W.resps = [{ ok: true, id: 'S1' }, { ok: true, id: 'SES1' }];
  W.correrTimers();
  await ticks(30);
  comprobar('auto · sin preguntar ni ventanas', W.confirms.length === 0 && W.alerts.length === 0);
  igual('auto · reusa la persona de su ficha y sube serie y sesión', W.pedidos.map(p => p.body.op).join(','), 'crear_serie,crear_sesion');
  comprobar('auto · lo dice con un aviso corto', W.toasts.some(t => /Series en Notion ✓ \(2\)/.test(t)));
  comprobar('auto · y queda al día', M.seriesPendientes_(W.state.series) === 0);

  const s = W.state.series[0];
  s.sesiones = M.seriesConNota_(s.sesiones, '2026-09-11', 'sin dolor al bajar');
  igual('nota · la evolución de una sesión ya subida cuenta como pendiente', M.seriesPendientes_(W.state.series), 1);
  W.resps = [{ ok: true }];
  M.seriesSincronizar({ auto: true });
  await ticks(30);
  const bn = (W.pedidos[2] || {}).body || {};
  igual('nota · se AÑADE a esa sesión con actualizar_sesion', [bn.op, bn.sesionId, (bn.datos || {}).nota].join('|'), 'actualizar_sesion|SES1|sin dolor al bajar');
  comprobar('nota · y deja de estar pendiente', !s.sesiones[0].notaPend && s.sesiones[0].notionSucio === false);

  s.sesiones = M.seriesConNota_(s.sesiones, '2026-09-11', 'otra');
  W.resps = [{ ok: false, error: 'operacion desconocida: actualizar_sesion' }];
  M.seriesSincronizar({ auto: true });
  await ticks(30);
  comprobar('nota · sin el asistente publicado queda pendiente y lo dice', s.sesiones[0].notaPend === 'otra' && W.toasts.some(t => /falta publicar el asistente/.test(t)));

  W = mundo(); M = W.fn;
  W.state.series.push({ id: 's1', nombre: 'Luis', indicadas: 5, creada: '2026-09-11', sesiones: [] });
  let soltar;
  W.resps = [function(){ return { ok: true, id: 'P' }; }];
  const lento = new Promise(r => { soltar = r; });
  const fetchOrig = null; // el mundo no deja cambiar fetch: se usa un segundo auto mientras sube
  M.seriesSincronizar({ auto: true });
  comprobar('auto · marca que está subiendo', W.subiendo === true);
  M.seriesSincronizar({ auto: true });
  await ticks(30);
  comprobar('auto · un cambio a mitad de subida se sube al terminar', W.timers() === 1);
  soltar(); void lento; void fetchOrig;

  /* Una serie borrada mientras sube se salta entera: ni su persona. */
  W = mundo(); M = W.fn;
  const serB = { id: 'sb', nombre: 'Bea', indicadas: 5, creada: '2026-09-11', sesiones: [] };
  const serA = { id: 'sa', nombre: 'Ana', indicadas: 5, creada: '2026-09-11', sesiones: [] };
  W.state.series.push(serB, serA);
  W.resps = [function(){ W.state.series.splice(W.state.series.indexOf(serA), 1); return { ok: true, id: 'PB' }; }, { ok: true, id: 'SB' }];
  M.seriesSincronizar({ auto: true });
  await ticks(40);
  comprobar('borrada · la serie que se borra a mitad de subida no pide nada', W.pedidos.every(p => (p.body || {}).nombre !== 'Ana'),
    W.pedidos.map(p => p.body.op + ':' + (p.body.nombre || '')).join(', '));

  W = mundo(); M = W.fn;
  W.sinPuente = true;
  W.state.series.push({ id: 's1', nombre: 'Luis', indicadas: 5, sesiones: [] });
  M.seriesSincronizar({ auto: true });
  comprobar('auto · sin puente, callado', W.alerts.length === 0 && W.pedidos.length === 0);
  W.sinPuente = false;
  W.confirmar = false;
  M.seriesSincronizar();
  comprobar('a mano · pregunta, y con el no no sube nada', W.confirms.length === 1 && W.pedidos.length === 0);
  aviso('series sola · catorce casos, ejecutados');
}

/* --- 10 · Lo pendiente se reintenta callado ---------------------------- */
{
  const W = mundo(), M = W.fn;
  W.state.clients.push(
    { id: 'a', name: 'Ana', notionId: 'N', notionPend: { datos: { plan: 'Plan 2x/semana' }, ts: 1 } },
    { id: 'b', name: 'Bea', type: 'rehab', personaNotionId: 'P', personaPend: { datos: { estado: 'De alta' }, ts: 1 } },
    { id: 'c', name: 'Cata', type: 'rehab', personaPend: { datos: {}, ts: 1, dudoso: true } },
    { id: 'd', name: 'Dani', personaNotionId: 'PD', historiaPend: { version: 1 }, ficha: { motivo: 'x', updatedAt: 1 } });
  W.resps = [{ ok: true, cambios: [{ columna: 'Plan' }], avisos: [], errores: [] }, { ok: true }, { ok: true }, { ok: true }];
  W.reintentoAt = 0;
  const n = await M.u19NotionReintentar_();
  igual('reintento · la ficha, la persona y la historia; la creación dudosa no', n, 3);
  igual('reintento · en orden y de una en una', W.pedidos.map(p => p.body.op || (p.body.simular ? 'simular' : 'escribir')).join(','), 'actualizar,actualizar,actualizar_persona,historia');
  comprobar('reintento · callado', W.toasts.length === 0 && W.modales.length === 0, W.toasts.join(' / '));
  /* Con algo pendiente otra vez: el freno tiene que pararlo igual. */
  W.state.clients.push({ id: 'e', name: 'Eli', type: 'rehab', personaNotionId: 'PE', personaPend: { datos: { estado: 'Abandono' }, ts: 1 } });
  const antes = W.pedidos.length;
  igual('reintento · como mucho cada dos minutos', await M.u19NotionReintentar_(), 0);
  igual('reintento · y dentro del freno no pide nada', W.pedidos.length, antes);
  aviso('reintento · cuatro casos, ejecutados');
}

/* --- 11 · Arreglos pequeños y lo que no se ve -------------------------- */
{
  const W = mundo(), M = W.fn;
  igual('rango · un 0° es un valor', M.rcNum_('0'), 0);
  igual('rango · vacío es sin dato', M.rcNum_(''), null);
  igual('rango · con coma', M.rcNum_(' 12,5 '), 12.5);
  igual('rango · letras, sin dato', M.rcNum_('x'), null);
  comprobar('rango · la evaluación lee con rcNum_, no con «||null»', src.indexOf('parseFloat(rr[a].querySelector(".rc-grados").value)||null') < 0 && src.indexOf('grados: rcNum_(') > 0);
  igual('banderas · trece, la de trombosis al final', W.RC_RED_FLAGS.length + '|' + /trombosis/.test(W.RC_RED_FLAGS[12]), '13|true');
  igual('banderas · las de antes no se movieron (se guardan índices)', W.RC_RED_FLAGS[11], 'Dolor que no ha cambiado nada tras 4-6 semanas de manejo conservador bien llevado');
  comprobar('avisos · ningún mensaje manda a «Ajustes → Conexión con Notion», que no existe', src.indexOf('Ajustes → Conexión con Notion') < 0);
  comprobar('Notion → app · cada 30 min como mucho', tramo('function u19AutoImportarNotion(', '\n}\n', 'u19AutoImportarNotion').indexOf('30 * 60000') > 0);
  comprobar('arranque · reintenta lo pendiente y mira al volver', src.indexOf('setTimeout(u19NotionReintentar_, 9000)') > 0 && src.indexOf('u19NotionAlVolver_();') > 0);
  comprobar('formulario · crea o actualiza la persona al guardar', tramo('function openClientForm(', '\n}\n', 'openClientForm').indexOf('personaTrasGuardar_(isEdit ? client : data, _fichaAntes, _personaForm)') > 0);
  comprobar('alta · pasa la ficha de la persona a «De alta»', tramo('function _u19FinalizarAlta(', '\n}\n', '_u19FinalizarAlta').indexOf('personaPendMezclar_(c.personaPend, { estado: "De alta" })') > 0);

  /* El repo es publico: vocabulario neutro en lo nuevo. */
  const vetadas = /kinesiolog|kin[eé]sic|paciente|previsi[oó]n|fonasa|isapre/i;
  const h = tramo('/* ===HISTORIA===', '/* ===HISTORIA_END=== */', 'bloque de historia');
  const p = tramo('/* ===PERSONA_NOTION===', '/* ===PERSONA_NOTION_END=== */', 'bloque de persona');
  const sy = fn('seriesSincronizar') + fn('seriesAutoSubir_') + fn('seriesConNota_');
  const m1 = h.match(vetadas), m2 = p.match(vetadas), m3 = sy.match(vetadas);
  comprobar('vocabulario · la historia no usa lenguaje vetado', !m1, m1 ? 'aparece «' + m1[0] + '»' : '');
  comprobar('vocabulario · la persona tampoco', !m2, m2 ? 'aparece «' + m2[0] + '»' : '');
  comprobar('vocabulario · ni la subida de Series', !m3, m3 ? 'aparece «' + m3[0] + '»' : '');
  aviso('arreglos y vocabulario · quince casos');
}

})().catch(e => { falla('las pruebas asíncronas reventaron', String(e && e.stack || e).slice(0, 400)); }).then(imprimir);

function imprimir() {
  console.log('\nUS19-APP · historia CIF, persona en Notion y envío inmediato');
  console.log('archivo: ' + ruta + '\n');
  avisos.forEach(a => console.log('  · ' + a));
  console.log('');
  if (fallos.length) {
    console.log('FALLOS (' + fallos.length + '):');
    fallos.forEach(f => console.log('  ✗ ' + f));
    console.log('\ncomprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + fallos.length);
    process.exit(1);
  }
  console.log('comprobaciones OK: ' + ok + '  ·  sin fallos');
  process.exit(0);
}
