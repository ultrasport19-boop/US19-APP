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
  'seriesCasillas_', 'seriesEvolucion_', 'seriesUltima_', 'seriesEsc_'];

let M;
try {
  M = new Function(NOMBRES.map(fn).join('\n')
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
