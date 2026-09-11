/* Prueba del apartado «Series» (rehabilitación) del index.html.
 *
 * Una serie es un bloque cerrado de N sesiones con su orden médica. Las
 * funciones que deciden algo son puras y viven dentro del index.html: esta
 * prueba las extrae y las ejecuta aisladas, sin navegador.
 *
 *   node tools/series.js [index.html]
 *
 * Igual que circuitos.js y taxonomia.js: si no encuentra lo que busca, FALLA.
 * Un cero silencioso aquí sería peor que no tener prueba.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('series: no encuentro el inicio de ' + nombre); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('series: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}
function fn(nombre) { return tramo('function ' + nombre + '(', '\n}\n', nombre) + '\n}\n'; }

const NOMBRES = ['seriesDias_', 'seriesContar_', 'seriesSemaforo_', 'seriesOrden_',
  'seriesCasillas_', 'seriesEvolucion_', 'seriesUltima_', 'seriesEsc_',
  'seriesConNota_', 'seriesSeSube_', 'u19DolorDe',
  'seriesMigrar_', 'seriesDeCliente_', 'u19MolestiaMax_',
  'seriesAbierta_', 'seriesCobroDefecto_', 'seriesResumenMes_', 'seriesPayloadSerie_', 'seriesPayloadSesion_', 'seriesTocar_'];
/* Las cuatro listas de opciones, que son los nombres exactos de Notion. */
function lineaVar(n) { const i = src.indexOf('\nvar ' + n + ' = '); if (i < 0) { console.error('series: no encuentro ' + n); process.exit(1); } return src.slice(i + 1, src.indexOf('\n', i + 1)) + '\n'; }
const LISTAS = ['SERIES_VIAS', 'SERIES_ESTADOS', 'SERIES_AUSENCIAS', 'SERIES_COBROS'].map(lineaVar).join('');

let M;
try {
  /* u19Arr es de una linea: se da hecha, igual que en la app. */
  M = new Function('function u19Arr(x){ return Array.isArray(x) ? x : []; }\n' + LISTAS + NOMBRES.map(fn).join('\n')
    + '\nreturn {' + NOMBRES.map(n => n + ':' + n).join(',') + '};')();
} catch (e) {
  console.error('series: el código no evalúa aislado: ' + e.message);
  process.exit(1);
}

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

/* --- 1 · El contador ------------------------------------------------- */
{
  const c = M.seriesContar_;
  const S = (a) => a.map((x, i) => ({ fecha: '2026-09-' + String(i + 1).padStart(2, '0'), asistio: x }));

  igual('serie · tres asistidas de diez, quedan siete', c(S([true, true, true]), 10).quedan, 7);
  igual('serie · y las hechas son tres', c(S([true, true, true]), 10).hechas, 3);

  /* LO IMPORTANTE: una sesión a la que no fue se anota, pero NO gasta
     sesión. Es la misma regla que el rollup de Notion, que cuenta números
     de sesión y no filas. Si aquí se contaran filas, la app y Notion darían
     números distintos para lo mismo. */
  const conFalta = c(S([true, false, true]), 10);
  igual('serie · la sesión a la que no fue NO gasta sesión', conFalta.hechas, 2);
  igual('serie · pero se cuenta aparte', conFalta.faltas, 1);
  igual('serie · y quedan ocho, no siete', conFalta.quedan, 8);

  igual('serie · diez hechas es serie completa', c(S(Array(10).fill(true)), 10).completa, true);
  igual('serie · nueve hechas todavía no', c(S(Array(9).fill(true)), 10).completa, false);
  igual('serie · once anotadas no pasan de diez', c(S(Array(11).fill(true)), 10).hechas, 10);
  igual('serie · y quedan cero, nunca negativo', c(S(Array(11).fill(true)), 10).quedan, 0);
  igual('serie · sin sesiones quedan las diez', c([], 10).quedan, 10);
  igual('serie · una serie de 6 tiene 6, no 10', c(S([true]), 6).indicadas, 6);
  igual('serie · indicadas basura cuenta como cero', c(S([true]), 'diez').indicadas, 0);
  aviso('serie · el contador, ejecutado en 12 casos');
}

/* --- 2 · Los días, que no se cuentan en milisegundos ------------------ */
{
  const d = M.seriesDias_;
  igual('días · del 1 al 11 van diez', d('2026-09-01', '2026-09-11'), 10);
  igual('días · el mismo día son cero', d('2026-09-01', '2026-09-01'), 0);
  igual('días · hacia atrás sale negativo', d('2026-09-11', '2026-09-01'), -10);

  /* Chile adelanta el reloj el primer domingo de septiembre. Entre estas
     dos fechas hay 7 días y 23 horas si se restan instantes, y 8 días de
     verdad. Es la única clase de prueba con fechas escritas a mano, y a
     propósito: con fechas relativas el fallo no aparece. */
  igual('días · el cambio de hora de Chile no mueve el resultado', d('2026-09-01', '2026-09-09'), 8);
  igual('días · y tampoco al revés', d('2026-09-09', '2026-09-01'), -8);

  igual('días · una fecha ilegible da null, no cero', d('mañana', '2026-09-01'), null);
  igual('días · y vacía también', d('', '2026-09-01'), null);
  aviso('días · siete casos, incluido el cambio de hora');
}

/* --- 3 · La orden médica bloquea, no avisa --------------------------- */
{
  const o = M.seriesOrden_;
  const HOY = '2026-09-10';
  igual('orden · sin orden, la serie está BLOQUEADA', o(null, HOY).bloquea, true);
  igual('orden · adjunta en false también bloquea', o({ adjunta: false }, HOY).bloquea, true);
  igual('orden · adjunta y sin vencimiento, no bloquea', o({ adjunta: true }, HOY).bloquea, false);
  igual('orden · vencida ayer bloquea', o({ adjunta: true, vence: '2026-09-09' }, HOY).bloquea, true);
  igual('orden · que vence hoy todavía no bloquea', o({ adjunta: true, vence: '2026-09-10' }, HOY).bloquea, false);
  igual('orden · a quince días avisa pero no bloquea', o({ adjunta: true, vence: '2026-09-25' }, HOY).clase, 'warn');
  igual('orden · a dieciséis días ya no avisa', o({ adjunta: true, vence: '2026-09-26' }, HOY).clase, 'ok');
  igual('orden · una fecha ilegible bloquea, no se ignora', o({ adjunta: true, vence: 'pronto' }, HOY).bloquea, true);
  comprobar('orden · la vencida y la ausente se distinguen en el texto',
    o({ adjunta: true, vence: '2026-08-01' }, HOY).texto.indexOf('renovar') > 0 &&
    o(null, HOY).texto.indexOf('FALTA') === 0,
    'una hay que pedirla y la otra renovarla: no se arreglan igual');
  aviso('orden · nueve casos, y bloquea de verdad');
}

/* --- 4 · El semáforo por ritmo --------------------------------------- */
{
  const s = M.seriesSemaforo_;
  const HOY = '2026-09-30';
  igual('semáforo · completa es verde pase lo que pase', s('2026-07-01', HOY, true).color, 'v');
  igual('semáforo · sin ninguna sesión es ámbar, no rojo', s('', HOY, false).color, 'a');
  igual('semáforo · hace cinco días, verde', s('2026-09-25', HOY, false).color, 'v');
  igual('semáforo · a los diez justos, todavía verde', s('2026-09-20', HOY, false).color, 'v');
  igual('semáforo · a los once, ámbar', s('2026-09-19', HOY, false).color, 'a');
  igual('semáforo · a los veintiuno, ámbar', s('2026-09-09', HOY, false).color, 'a');
  igual('semáforo · a los veintidós, rojo', s('2026-09-08', HOY, false).color, 'r');
  igual('semáforo · fecha ilegible no se pinta de verde', s('cuando sea', HOY, false).color, 'a');
  aviso('semáforo · ocho casos en los tres colores');
}

/* --- 5 · Casillas, evolución y última -------------------------------- */
{
  const k = M.seriesCasillas_;
  const S = (a) => a.map((x, i) => ({ fecha: '2026-09-0' + (i + 1), asistio: x }));
  igual('casillas · una serie de diez tiene diez casillas', k(S([true, true]), 10).length, 10);
  igual('casillas · las dos primeras están hechas', k(S([true, true]), 10).filter(c => c.estado === 'hecha').length, 2);
  igual('casillas · la tercera es la que toca', k(S([true, true]), 10)[2].estado, 'hoy');
  igual('casillas · con la serie llena no hay «la que toca»',
    k(S(Array(10).fill(true)), 10).filter(c => c.estado === 'hoy').length, 0);
  igual('casillas · una falta no adelanta la casilla', k(S([true, false]), 10)[1].estado, 'hoy');

  const e = M.seriesEvolucion_;
  const notas = [{ fecha: '2026-09-05', nota: 'b' }, { fecha: '2026-09-20', nota: 'c' },
                 { fecha: '2026-09-01', nota: 'a' }, { fecha: '2026-09-30' }];
  igual('evolución · solo las que tienen nota', e(notas).length, 3);
  igual('evolución · la más nueva primero', e(notas)[0].fecha, '2026-09-20');
  igual('evolución · sin notas devuelve lista vacía, no inventa', e([]).length, 0);
  igual('evolución · y con null tampoco revienta', e(null).length, 0);

  const u = M.seriesUltima_;
  igual('última · es la más reciente de las asistidas', u(S([true, true, true])), '2026-09-03');
  igual('última · una falta posterior no cuenta como última', u([{ fecha: '2026-09-01', asistio: true }, { fecha: '2026-09-08', asistio: false }]), '2026-09-01');
  igual('última · sin ninguna asistida devuelve vacío', u([{ fecha: '2026-09-01', asistio: false }]), '');
  aviso('casillas, evolución y última · doce casos');
}

/* --- 6 · Lo que entra de la base se escapa --------------------------- */
{
  const esc = M.seriesEsc_;
  igual('escape · el menor que no pasa', esc('<b>x</b>'), '&lt;b&gt;x&lt;/b&gt;');
  igual('escape · las comillas tampoco', esc('dijo "hola"'), 'dijo &quot;hola&quot;');
  igual('escape · el ampersand va primero', esc('&lt;'), '&amp;lt;');
  igual('escape · null no escribe «null»', esc(null), '');
  igual('escape · undefined tampoco', esc(undefined), '');
  aviso('escape · cinco casos');
}

/* --- 7 · La forma: lo que no se puede comprobar ejecutando ----------- */
{
  comprobar('forma · los días se cuentan con Date.UTC',
    src.indexOf('Date.UTC(Number(a[0])') > 0 && src.indexOf('Date.UTC(Number(b[0])') > 0,
    'restar instantes mueve el resultado un día en la semana del cambio de hora');

  comprobar('forma · la vista escapa el nombre de la persona',
    src.indexOf('seriesEsc_(p.nombre)') > 0,
    'aquí entran nombres de personas y notas escritas a mano');
  comprobar('forma · y también la nota de evolución',
    src.indexOf('seriesEsc_(s.nota)') > 0);

  comprobar('forma · la casilla no se puede marcar con la orden médica bloqueando',
    src.indexOf('var puede = !o.bloquea && k.estado === "hoy";') > 0,
    'la orden médica bloquea de verdad, no solo pinta de rojo');

  comprobar('forma · el apartado está enchufado a su pestaña y a su vista',
    src.indexOf('data-tab="series"') > 0 &&
    src.indexOf('id="view-series"') > 0 &&
    src.indexOf('else if (name==="series") renderSeries();') > 0,
    'sin las tres cosas el apartado existe pero no se abre');
}

/* --- 8 · Una nota de evolucion no es una sesion (11-sep-2026) --------
   Hasta ese dia contaba como falta y, al subirla, el puente la habria
   guardado en Notion como «No aviso»: una ausencia que no ocurrio. */
{
  const c = M.seriesContar_, H = '2026-09-11';
  const suelta = { fecha: '2026-09-05', asistio: null, nota: 'mejor', soloNota: true };
  const r = c([{ fecha: '2026-09-01', asistio: true }, suelta], 10);
  igual('nota · una nota suelta no cuenta como falta', r.faltas, 0);
  igual('nota · ni como sesion hecha', r.hechas, 1);
  igual('nota · y una falta de verdad sigue contando', c([{ fecha: H, asistio: false }], 10).faltas, 1);

  const orig = [{ fecha: H, asistio: true, nota: '' }];
  const pegada = M.seriesConNota_(orig, H, 'sin molestias');
  igual('nota · con una sesion de hoy sin subir, se le pega', pegada.length, 1);
  igual('nota · y queda como su nota', pegada[0].nota, 'sin molestias');
  igual('nota · la sesion sigue siendo asistida', pegada[0].asistio, true);
  igual('nota · no toca la lista original', orig[0].nota, '');
  igual('nota · una falta de hoy tambien la recibe', M.seriesConNota_([{ fecha: H, asistio: false, nota: '' }], H, 'aviso tarde')[0].nota, 'aviso tarde');
  const yaSubida = M.seriesConNota_([{ fecha: H, asistio: true, nota: '', notionId: 'x' }], H, 'n');
  igual('nota · si la sesion ya subio, no se toca: va suelta', yaSubida.length, 2);
  igual('nota · de otro dia, va suelta', M.seriesConNota_([{ fecha: '2026-09-10', asistio: true, nota: '' }], H, 'n').length, 2);
  igual('nota · si la sesion ya tenia nota, no la pisa', M.seriesConNota_([{ fecha: H, asistio: true, nota: 'vieja' }], H, 'nueva')[0].nota, 'vieja');
  igual('nota · sin sesiones, va suelta', M.seriesConNota_([], H, 'n')[0].soloNota, true);

  igual('subida · una sesion sin id se sube', M.seriesSeSube_({ fecha: H, asistio: true }), true);
  igual('subida · una ya subida no', M.seriesSeSube_({ fecha: H, asistio: true, notionId: 'x' }), false);
  igual('subida · una nota suelta NO se sube como sesion', M.seriesSeSube_(yaSubida[1]), false);
  igual('subida · nada no se sube', M.seriesSeSube_(null), false);

  const sync = tramo('function seriesSincronizar(', '\n}\n', 'seriesSincronizar');
  comprobar('subida · el sincronizador pregunta a seriesSeSube_ al contar y al subir',
    (sync.match(/seriesSeSube_\(/g) || []).length >= 2, 'vuelve a subir todo lo que no tiene id, notas sueltas incluidas');
  comprobar('nota · el boton de evolucion usa seriesConNota_',
    tramo('function seriesNota(', '\n}\n', 'seriesNota').indexOf('seriesConNota_(') >= 0, 'vuelve a empujar la nota como una sesion');
  aviso('nota · dieciseis casos');
}

/* --- 9 · El dolor que se escribe es el que se lee (11-sep-2026) ------- */
{
  const D = M.u19DolorDe;
  const x = D({ fecha: '2026-09-11', durante: 4, despues: 2, notas: 'ultima serie' });
  igual('dolor · lee «durante»', x.durante, 4);
  igual('dolor · lee «despues»', x.despues, 2);
  igual('dolor · manda el mayor', x.max, 4);
  igual('dolor · la nota se llama «notas»', x.nota, 'ultima serie');
  igual('dolor · la fecha se llama «fecha»', x.fecha, '2026-09-11');
  igual('dolor · un cero es un valor, no un vacio', D({ durante: 0 }).max, 0);
  igual('dolor · sin nada no inventa', D({ fecha: '2026-09-11' }).max, null);
  igual('dolor · solo el de 24 h', D({ despues: 5 }).texto, '24 h después 5/10');
  igual('dolor · la forma vieja se sigue leyendo', D({ eva: 6 }).max, 6);
  igual('dolor · un texto numerico cuenta', D({ durante: '3' }).max, 3);

  comprobar('dolor · nadie vuelve a leer eva/valor por su cuenta',
    /* Los tres lectores viejos, tal cual estaban. «x.eva» a secas no sirve de
       patron: u19DolorDe lo lee a proposito, para los registros importados. */
    src.indexOf('(u.eva!=null)?u.eva:u.valor') < 0 && src.indexOf("pl.eva != null ? 'EVA '") < 0 && src.indexOf('var eva = x.eva != null') < 0,
    'un lector vuelve a buscar campos que no escribe nadie');
  comprobar('dolor · ficha, linea de tiempo y buscador leen con u19DolorDe',
    (src.match(/u19DolorDe\(/g) || []).length >= 4, 'hay ' + (src.match(/u19DolorDe\(/g) || []).length + ' usos (definicion incluida)');
  comprobar('ficha · muestra etiquetas, no claves internas',
    src.indexOf('escapeHtml(ETQ[k] || k)') > 0 && src.indexOf('dx:"Hipótesis de trabajo"') > 0, 'vuelven «dx» y «objCorto»');
  aviso('dolor · diez casos');
}

/* --- 10 · Las series en el estado y enlazadas a su ficha (11-sep-2026)
   Hasta ese dia vivian en una clave suelta de localStorage: no viajaban
   con la sincronizacion ni con el respaldo, y no se enlazaban a nadie. */
{
  const mig = M.seriesMigrar_;
  const ana = { id: 's1', nombre: 'Ana', creada: '2026-09-10', indicadas: 10, sesiones: [] };
  const vieja = () => ({ nombre: 'Luis', creada: '2026-09-10', indicadas: 8, sesiones: [{ fecha: '2026-09-10', asistio: true }] });
  const r = mig([ana], [vieja(), { nombre: 'Ana', creada: '2026-09-10', indicadas: 10 }]);
  igual('migrar · entra la que no estaba', r.length, 2);
  igual('migrar · no duplica la que ya estaba', r.filter(x => x.nombre === 'Ana').length, 1);
  comprobar('migrar · todas quedan con id', r.every(x => !!x.id), 'alguna sin id');
  igual('migrar · conserva sus sesiones', (r.find(x => x.nombre === 'Luis') || {}).sesiones.length, 1);
  igual('migrar · lo que no es serie no entra', mig([], [null, 'x', [1], 5]).length, 0);
  igual('migrar · sin nada viejo, lo del estado queda', mig([ana], null).length, 1);
  igual('migrar · dos cargas seguidas no duplican', mig(mig([], [vieja()]), [vieja()]).length, 1);
  igual('migrar · dos series de la misma persona el mismo dia siguen siendo dos',
    mig([], [{ nombre: 'Ana', creada: '2026-09-10', indicadas: 10 }, { nombre: 'Ana', creada: '2026-09-10', indicadas: 6 }]).length, 2);

  const L = [{ id: 'a', clienteId: 'c1' }, { id: 'b', clienteId: 'c2' }, { id: 'c', clienteId: '' }, null];
  igual('ficha · solo las suyas', M.seriesDeCliente_(L, 'c1').length, 1);
  igual('ficha · sin cliente no devuelve las sueltas', M.seriesDeCliente_(L, '').length, 0);
  igual('ficha · con basura no revienta', M.seriesDeCliente_(null, 'c1').length, 0);

  const P = (evas) => ({ ejercicios: [{ series: evas.map(e => ({ eva: e })) }] });
  igual('molestia · la mas alta', M.u19MolestiaMax_(P([2, 5, 3])), 5);
  igual('molestia · un cero es un valor', M.u19MolestiaMax_(P([0, null])), 0);
  igual('molestia · sin anotar, null', M.u19MolestiaMax_(P([null, null])), null);
  igual('molestia · entre ejercicios', M.u19MolestiaMax_({ ejercicios: [{ series: [{ eva: 1 }] }, { series: [{ eva: 7 }] }] }), 7);
  igual('molestia · con basura no revienta', M.u19MolestiaMax_(null), null);
  aviso('estado y ficha · dieciseis casos');

  /* La forma: que todo este enchufado. La paridad de sync, respaldo y
     borrado total la vigila pruebas.js; aqui, lo propio de las series. */
  comprobar('estado · state nace con series', /var state = \{[^}]*series: \[\]/.test(src), 'state no declara series');
  const leer = tramo('function seriesLeer(', '\n}\n', 'seriesLeer');
  comprobar('estado · seriesLeer lee el estado, no localStorage', leer.indexOf('state.series') > 0 && leer.indexOf('localStorage') < 0,
    'vuelve la clave suelta: no viaja con nada');
  const mg = src.slice(src.indexOf('var _sv = localStorage.getItem(SERIES_KEY);'), src.indexOf('} catch(eSer){}'));
  comprobar('estado · la migracion usa seriesMigrar_', mg.indexOf('seriesMigrar_(state.series') > 0, 'la migracion no deduplica');
  comprobar('estado · y borra la clave vieja DESPUES de guardar, con copia',
    mg.indexOf('saveState()') > 0 && mg.indexOf('saveState()') < mg.indexOf('removeItem(SERIES_KEY)') && mg.indexOf('_migradas') > 0,
    'si el guardado fallara se perderian las series');
  comprobar('estado · bajar de la nube e importar un respaldo traen las series',
    (src.match(/if \(Array\.isArray\(data\.series\)\) state\.series = data\.series;/g) || []).length >= 2, 'falta en alguno de los dos');
  comprobar('ficha · eliminar a la persona y borrar sus datos se llevan sus series',
    (src.match(/state\.series = state\.series\.filter\(function\(s\)\{ return !s \|\| s\.clienteId !== /g) || []).length >= 2,
    'quedan datos de salud de alguien que pidio borrarlos');
  comprobar('ficha · exportar sus datos incluye sus series', src.indexOf('series: seriesDeCliente_(u19Arr(state.series), c.id),') > 0,
    'la «copia integra» deja fuera las series');
  comprobar('ficha · la pestaña clinica muestra sus series', tramo('function fichaClinico(', '\n}\n', 'fichaClinico').indexOf('seriesDeCliente_(u19Arr(state.series), c.id)') > 0,
    'la ficha no ve la readaptacion en curso');
  comprobar('ficha · una serie nueva guarda a quien pertenece', tramo('function seriesNueva(', '\n}\n', 'seriesNueva').indexOf('clienteId: c ? c.id : ""') > 0,
    'vuelve a ser solo un nombre escrito');
  comprobar('molestia · lo que anota la persona entra al registro de dolor',
    src.indexOf('var _mol = u19MolestiaMax_(nueva);') > 0 && src.indexOf('if (_mol !== null && _enRead){') > 0 && src.indexOf('origen: "enlace"') > 0,
    'la molestia del enlace vuelve a quedarse solo en la progresion');
}

/* --- 11 · Series v2: lo que Notion ya pedia (11-sep-2026) -------------
   Las dos bases de Notion tenian columnas que la app no guardaba: tres
   tipos de inasistencia, como se cobro, el valor, el estado y el alta. Y
   el puente escribia el VENCIMIENTO en «Fecha de la orden». */
{
  const c = M.seriesContar_;
  const aus = (a) => c([{ fecha: '2026-09-10', asistio: false, ausencia: a }], 10);
  igual('inasistencia · «avisó y reagendó» no es falta', aus('Aviso y reagendo').faltas, 0);
  igual('inasistencia · pero se cuenta aparte', aus('Aviso y reagendo').avisadas, 1);
  igual('inasistencia · «la cancelé yo» no es falta', aus('Cancelo el prestador').faltas, 0);
  igual('inasistencia · y se cuenta aparte', aus('Cancelo el prestador').canceladas, 1);
  igual('inasistencia · «no avisó» sí es falta', aus('No aviso').faltas, 1);
  igual('inasistencia · ninguna gasta sesión', aus('Aviso y reagendo').quedan, 10);

  const cd = M.seriesCobroDefecto_;
  igual('cobro · con bono, Bono', cd('Bono libre eleccion'), 'Bono');
  igual('cobro · particular por sesión, Particular', cd('Particular por sesion'), 'Particular');
  igual('cobro · pack, incluida en el pack', cd('Pack particular'), 'Incluido en el pack');
  igual('cobro · convenio queda pendiente', cd('Convenio socio'), 'Pendiente');
  igual('cobro · sin vía, pendiente', cd(undefined), 'Pendiente');

  const ab = M.seriesAbierta_;
  igual('estado · sin estado (las de antes) está abierta', ab({}), true);
  igual('estado · Abierta está abierta', ab({ estado: 'Abierta' }), true);
  igual('estado · Terminada no', ab({ estado: 'Terminada' }), false);
  igual('estado · Abandonada no', ab({ estado: 'Abandonada' }), false);
  igual('estado · nada no', ab(null), false);

  const lista = [
    { valor: 11390, sesiones: [
      { fecha: '2026-09-02', asistio: true, cobro: 'Bono', monto: 11390 },
      { fecha: '2026-09-05', asistio: true, cobro: 'Pendiente', monto: 0 },
      { fecha: '2026-08-30', asistio: true, cobro: 'Particular', monto: 5000 },
      { fecha: '2026-09-06', asistio: false, ausencia: 'No aviso' } ] },
    { estado: 'Anulada', sesiones: [{ fecha: '2026-09-03', asistio: true, cobro: 'Particular', monto: 9999 }] },
    { pack: { monto: 100000, fecha: '2026-09-01' }, sesiones: [{ fecha: '2026-09-04', asistio: true, cobro: 'Incluido en el pack', monto: 0 }] },
    { pack: { monto: 70000, fecha: '2026-08-20' }, sesiones: [] }
  ];
  const r = M.seriesResumenMes_(lista, '2026-09');
  igual('mes · cuenta las sesiones hechas del mes', r.asistidas, 3);
  igual('mes · lo recibido: la sesión con bono y el pack pagado este mes', r.recibido, 111390);
  igual('mes · una pendiente de cobro', r.pendientes, 1);
  /* El valor por sesion es PROYECCION (Diego, 11-sep-2026): nunca recibido. */
  igual('mes · la proyección usa el valor solo donde no hay monto anotado', r.proyeccion, 22780);
  const soloValor = M.seriesResumenMes_([{ valor: 5000, sesiones: [{ fecha: '2026-09-02', asistio: true, cobro: 'Particular', monto: 0 }] }], '2026-09');
  igual('mes · el valor de la serie NUNCA cuenta como recibido', soloValor.recibido, 0);
  igual('mes · pero sí como proyección', soloValor.proyeccion, 5000);
  comprobar('forma · el registro de la sesión no rellena el monto con la proyección',
    tramo('function seriesSesion(', '\n}\n', 'seriesSesion').indexOf('id="sr-s-monto" value=""') > 0, 'vuelve a rellenarse: una proyección parecería dinero recibido');
  igual('mes · con basura no revienta', M.seriesResumenMes_(null, '2026-09').asistidas, 0);

  const ps = M.seriesPayloadSerie_({ nombre: 'Ana', indicadas: 10, creada: '2026-09-10', orden: { adjunta: true, fecha: '2026-09-01', vence: '2026-12-01' },
    medico: 'Dra. Soto', motivo: 'rodilla', via: 'Bono libre eleccion', valor: 11390 });
  igual('puente · la fecha de la orden es la de EMISIÓN', ps.fechaOrden, '2026-09-01');
  comprobar('puente · el vencimiento NO viaja (el puente lo escribía en «Fecha de la orden»)', !('vence' in ps), 'vuelve a viajar vence');
  igual('puente · nace Abierta', ps.estado, 'Abierta');
  igual('puente · el médico viaja', ps.medico, 'Dra. Soto');
  igual('puente · la vía viaja con su nombre de Notion', ps.via, 'Bono libre eleccion');
  igual('puente · una vía que Notion no tiene no viaja', M.seriesPayloadSerie_({ via: 'Fonasa' }).via, '');
  igual('puente · un estado raro vuelve a Abierta', M.seriesPayloadSerie_({ estado: 'cerrada' }).estado, 'Abierta');
  igual('puente · el valor es un número', ps.valor, 11390);

  const pv = M.seriesPayloadSesion_({ nombre: 'Ana' }, { fecha: '2026-09-10', asistio: true, dolorAntes: 0, dolorDespues: 11, cobro: 'Bono', bono: 'F-1', monto: 11390, aplicado: 'puente' }, 3);
  igual('sesión · la que vino no lleva motivo de ausencia', pv.ausencia, '');
  igual('sesión · un dolor 0 es un valor', pv.dolorAntes, 0);
  igual('sesión · un dolor 11 no se manda', pv.dolorDespues, null);
  igual('sesión · el bono viaja', pv.bono, 'F-1');
  igual('sesión · lo aplicado viaja', pv.aplicado, 'puente');
  igual('sesión · el título lleva el número', pv.titulo, 'Ana · sesión 3 · 2026-09-10');
  const pn = M.seriesPayloadSesion_({ nombre: 'Ana' }, { fecha: '2026-09-10', asistio: false }, 3);
  igual('sesión · sin motivo, la inasistencia va como «No aviso»', pn.ausencia, 'No aviso');
  igual('sesión · un cobro que Notion no tiene no viaja', M.seriesPayloadSesion_({}, { asistio: true, cobro: 'Transferencia' }, 1).cobro, '');
  igual('sesión · un monto negativo es cero', M.seriesPayloadSesion_({}, { asistio: true, monto: -5 }, 1).monto, 0);

  const sub = { notionId: 'x' }, nueva = {};
  M.seriesTocar_(sub); M.seriesTocar_(nueva);
  igual('actualizar · una serie ya subida queda por actualizar', sub.notionSucio, true);
  igual('actualizar · una sin subir no se marca: se creará entera', nueva.notionSucio, undefined);
  aviso('series v2 · cuarenta y dos casos');

  const sync = tramo('function seriesSincronizar(', '\n}\n', 'seriesSincronizar');
  comprobar('forma · la subida manda seriesPayloadSerie_ y seriesPayloadSesion_',
    sync.indexOf('seriesPayloadSerie_(s)') > 0 && sync.indexOf('seriesPayloadSesion_(s, x, c.hechas)') > 0, 'vuelve a armar el cuerpo a mano');
  comprobar('forma · y ya no manda el vencimiento', sync.indexOf('vence:') < 0, 'vuelve vence: el puente lo escribiría como fecha de la orden');
  comprobar('forma · una serie cambiada se actualiza en Notion',
    sync.indexOf('op:"actualizar_serie"') > 0 && sync.indexOf('if (!s.notionSucio) return null;') > 0 && sync.indexOf('lista[i].notionSucio = false') > 0,
    'el alta y el estado se quedarían solo en la app');
  const ses = tramo('function seriesSesion(', '\n}\n', 'seriesSesion');
  comprobar('forma · registrar una sesión también respeta la orden médica', ses.indexOf('seriesOrden_(s.orden, seriesHoyISO()).bloquea') > 0,
    'la regla dependería de que un botón esté deshabilitado');
  comprobar('forma · la casilla abre el registro de la sesión', src.indexOf('onclick="seriesSesion(\' + idx + \')"') > 0, 'la casilla ya no registra la sesión');
  comprobar('forma · no queda el marcado de un clic', src.indexOf('function seriesMarcar(') < 0, 'vuelve seriesMarcar');
}

/* --- salida ---------------------------------------------------------- */

console.log('\nUS19-APP · apartado Series');
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
