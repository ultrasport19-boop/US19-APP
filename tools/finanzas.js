/* Prueba de los números de Finanzas.
 *
 *   node tools/finanzas.js [index.html]
 *
 * POR QUE EXISTE
 * Finanzas tiene veinte funciones y ninguna tenía prueba. Son las cifras
 * con las que Diego decide —cuánto entra, de cuánta gente depende, cuánto
 * vence este mes— y algunas se las enseña a otros. Una fórmula mal tocada
 * no da error: da un número distinto, y un número distinto se cree.
 *
 * Son funciones puras sobre `state`, así que se extraen y se corren con un
 * plantel inventado. Igual que circuitos.js y taxonomia.js: si no
 * encuentra lo que busca, falla.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('finanzas: no encuentro el inicio de ' + nombre); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('finanzas: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}
function fn(nombre) { return tramo('function ' + nombre + '(', '\n}\n', nombre) + '\n}\n'; }

/* Lo de alrededor se finge: aquí se prueban las cuentas, no el resto de la
   app. `u19ClienteActivo` se sustituye por el campo `activo` del plantel de
   prueba, para que cada caso diga a las claras quién está activo. */
const ENTORNO = [
  'var state = { clients: [], routines: [] };',
  'function u19ClienteActivo(c){ return c && c.activo !== false; }',
  'function u19DiasSinVenir(c){ return (c && c.diasSinVenir != null) ? c.diasSinVenir : null; }',
  'function u19DiasSinReportar(c){ return null; }',
  'function u19AgendaPorCalendly(c){ return !(c && c.sinCalendly); }',
  /* El umbral se usa DE VERDAD, no fingido: son 7 días para todos los
     planes, y eso está alineado a propósito con el bot y con la fórmula
     «Riesgo agenda» de Notion. Con criterios distintos, el mismo cliente
     saldría en riesgo en una pantalla y bien en la otra. */
  'function u19FrecuenciaPlan(p){ return null; }',
  'function daysUntil(iso){',
  '  if (!iso) return null;',
  '  var p = String(iso).slice(0, 10).split("-");',
  '  if (p.length !== 3) return null;',
  '  var a = Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));',
  '  var h = new Date();',
  '  var b = Date.UTC(h.getFullYear(), h.getMonth(), h.getDate());',
  '  return Math.round((a - b) / 86400000);',
  '}',
].join('\n');

const codigo = [ENTORNO, fn('u19Arr'), fn('u19FinNum'), fn('u19FinMes'),
  fn('u19DiasUmbral'), fn('u19FinRiesgo'), fn('u19FinAntiguedad'),
  fn('u19FinConcentracion'), fn('u19FinRenovaciones'),
  fn('u19SvcProy')].join('\n');

let m;
try {
  m = new Function(codigo + '\nreturn { poner: function(cl, rt){ state.clients = cl || []; state.routines = rt || []; },'
    + ' mes: u19FinMes, umbral: u19DiasUmbral, riesgo: u19FinRiesgo, antiguedad: u19FinAntiguedad,'
    + ' concentracion: u19FinConcentracion, renovaciones: u19FinRenovaciones, svc: u19SvcProy };')();
} catch (e) {
  console.error('finanzas: el código no evalúa aislado: ' + e.message);
  process.exit(1);
}

let ok = 0; const fallos = [], avisos = [];
function di(cond, txt) { if (cond) ok++; else fallos.push(txt); }
function muestra(v) {
  /* JSON.stringify(NaN) es «null», e Infinity también: un fallo que dice
     «esperaba 0, obtuvo null» no lleva a ninguna parte. */
  if (typeof v === 'number' && !isFinite(v)) return String(v);
  return JSON.stringify(v);
}
function igual(a, b, txt) {
  if (a === b) ok++;
  else fallos.push(txt + '  →  esperaba ' + muestra(b) + ', obtuvo ' + muestra(a));
}
/* Fechas relativas al día real: una prueba con una fecha escrita a mano
   deja de probar y empieza a mentir. Ya pasó una vez en este banco. */
const HOY = new Date();
const enDias = n => {
  const d = new Date(HOY.getTime()); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
};
const haceMeses = n => {
  const d = new Date(HOY.getTime()); d.setMonth(d.getMonth() - n); d.setDate(15);
  return d.getTime();
};
const cli = (o) => Object.assign({ id: o.n, name: o.n, planPrice: 0, activo: true }, o);

/* --- 1 · CONCENTRACIÓN: de cuánta gente depende el negocio ----------
   Es la cifra de riesgo real de un gimnasio pequeño. Si tres personas
   son el 40% de lo que entra, que se vaya una es otra cosa. */
m.poner([
  cli({ n: 'Ana', planPrice: 35000 }),
  cli({ n: 'Beto', planPrice: 25000 }),
  cli({ n: 'Caro', planPrice: 25000 }),
  cli({ n: 'Dani', planPrice: 15000 }),
  /* Inactivo: no cuenta. */
  cli({ n: 'Eva', planPrice: 35000, activo: false }),
  /* Sin precio: no cuenta, y no debe dividir por cero más abajo. */
  cli({ n: 'Fran', planPrice: 0 }),
]);
const conc = m.concentracion();
igual(conc.total, 100000, 'concentración · suma solo a los activos con precio');
igual(conc.n, 4, 'concentración · cuenta solo a los que pagan');
igual(conc.top3.length, 3, 'concentración · el top son tres');
igual(conc.sumaTop3, 85000, 'concentración · y son los tres que más pagan');
igual(Math.round(conc.pctTop3), 85, 'concentración · el porcentaje sale de esos tres');
igual(conc.top3[0].n, 'Ana', 'concentración · ordenados de más a menos');

m.poner([]);
igual(m.concentracion().pctTop3, 0, 'concentración · sin nadie, 0% y no una división por cero');
m.poner([cli({ n: 'Solo', planPrice: 30000 })]);
igual(Math.round(m.concentracion().pctTop3), 100,
  'concentración · con un solo cliente, el 100% depende de él');

/* --- 2 · ANTIGÜEDAD: y que no se pierda dinero por el camino --------
   El reparto se pinta como una barra. Si un cliente no cae en ningún
   tramo, su dinero desaparece del gráfico sin avisar y la barra deja de
   sumar el MRR. */
m.poner([
  cli({ n: 'Nuevo', planPrice: 10000, createdAt: haceMeses(1) }),
  cli({ n: 'Medio', planPrice: 20000, createdAt: haceMeses(4) }),
  cli({ n: 'Viejo', planPrice: 30000, createdAt: haceMeses(9) }),
  cli({ n: 'Antiguo', planPrice: 40000, createdAt: haceMeses(20) }),
  cli({ n: 'SinFecha', planPrice: 5000 }),
]);
const ant = m.antiguedad();
igual(ant.tramos[0].n, 1, 'antigüedad · el de un mes va al primer tramo');
igual(ant.tramos[1].mrr, 20000, 'antigüedad · el de cuatro meses, al segundo');
igual(ant.tramos[2].mrr, 30000, 'antigüedad · el de nueve, al tercero');
igual(ant.tramos[3].mrr, 40000, 'antigüedad · el de veinte, al último');
igual(ant.sinFecha.mrr, 5000, 'antigüedad · el que no tiene fecha se cuenta aparte');
const sumaTramos = ant.tramos.reduce((a, t) => a + t.mrr, 0) + ant.sinFecha.mrr;
igual(sumaTramos, 105000,
  'antigüedad · TODO el dinero está en algún sitio: los tramos más los sin fecha suman el MRR');

/* Un createdAt en el futuro es un dato roto, pero pasa. Lo que impide que
   ese dinero se evapore del gráfico es el `Math.max(0, ...)` de
   u19FinMes: lo manda al primer tramo en vez de dejarlo fuera de todos.
   Es una guarda deliberada, y por eso se comprueba. */
m.poner([
  cli({ n: 'Normal', planPrice: 10000, createdAt: haceMeses(2) }),
  cli({ n: 'DelFuturo', planPrice: 90000, createdAt: haceMeses(-6) }),
]);
const raro = m.antiguedad();
const sumaRaro = raro.tramos.reduce((a, t) => a + t.mrr, 0) + raro.sinFecha.mrr;
igual(sumaRaro, 100000,
  'antigüedad · una fecha futura no hace desaparecer su dinero del gráfico');
igual(raro.tramos[0].mrr, 100000,
  'antigüedad · y va al primer tramo, que es lo que hace el Math.max(0) de u19FinMes');
igual(m.mes(Date.now() + 90 * 86400000), 0,
  'antigüedad · una fecha del futuro cuenta como cero meses, no como negativa');

/* --- 3 · RENOVACIONES: lo que hay que cobrar ------------------------ */
m.poner([
  cli({ n: 'Vencio', planPrice: 30000, planEndDate: enDias(-3) }),
  cli({ n: 'VenceHoy', planPrice: 25000, planEndDate: enDias(0) }),
  cli({ n: 'Pronto', planPrice: 20000, planEndDate: enDias(10) }),
  cli({ n: 'Justo15', planPrice: 15000, planEndDate: enDias(15) }),
  cli({ n: 'Lejos', planPrice: 40000, planEndDate: enDias(16) }),
  cli({ n: 'SinFecha', planPrice: 10000 }),
  cli({ n: 'SinPrecio', planPrice: 0, planEndDate: enDias(2) }),
]);
const ren = m.renovaciones();
igual(ren.venc.length, 1, 'renovaciones · solo el vencido está vencido');
igual(ren.mVenc, 30000, 'renovaciones · y su monto');
igual(ren.pronto.length, 3, 'renovaciones · hoy, en diez y en quince entran en «pronto»');
igual(ren.mPronto, 60000, 'renovaciones · con su suma');
di(!ren.pronto.some(x => x.c.name === 'Lejos'),
  'renovaciones · el de dieciséis días todavía no aparece');
di(!ren.pronto.concat(ren.venc).some(x => x.c.name === 'SinFecha'),
  'renovaciones · sin fecha no se puede saber, no se inventa');
di(!ren.pronto.concat(ren.venc).some(x => x.c.name === 'SinPrecio'),
  'renovaciones · sin precio no hay nada que cobrar');
igual(ren.pronto[0].c.name, 'VenceHoy', 'renovaciones · primero el que vence antes');

/* --- 4 · RIESGO: dinero de gente que dejó de venir ------------------- */
const rutina = id => ({ clientId: id, status: 'activa' });
m.poner([
  /* Paga, tiene rutina y lleva 30 días sin venir: es dinero en riesgo. */
  cli({ n: 'Perdido', planPrice: 30000, diasSinVenir: 30 }),
  /* Vino ayer: no es abandono aunque no reporte nada. */
  cli({ n: 'Viene', planPrice: 25000, diasSinVenir: 1 }),
  /* Sin rutina no se cuenta: no se le puede reclamar que no venga. */
  cli({ n: 'SinRutina', planPrice: 20000, diasSinVenir: 40 }),
], [rutina('Perdido'), rutina('Viene')]);
const rg = m.riesgo();
igual(rg.mrr, 75000, 'riesgo · el MRR cuenta a TODOS los activos que pagan');
igual(rg.n, 1, 'riesgo · solo uno está en riesgo');
igual(rg.total, 30000, 'riesgo · y es su dinero el que está en juego');
igual(rg.items[0].c.name, 'Perdido', 'riesgo · con nombre y apellido');
igual(rg.items[0].fuente, 'reserva',
  'riesgo · la fuente es la reserva de Notion, no el reporte: venir y no reportar no es abandono');
igual(Math.round(rg.pct), 40, 'riesgo · el porcentaje del MRR que está en juego');

/* El umbral son 7 días para todos los planes: decisión de Diego del
   7-sep-2026, igual que el bot y que la fórmula de Notion. */
igual(m.umbral({}).aviso, 7,
  'riesgo · el aviso son 7 días para todos los planes, como en Notion y en el bot');

/* Sin fecha de última visita pero CON reservas contadas este mes: no es
   fuga. Notion cuenta las reservas de 30 días aunque falte la fecha
   exacta de la última, y es un caso frecuente. Sin esta rama, esa
   persona aparecería como perdida teniendo reservas. */
m.poner([
  cli({ n: 'ConReservas', planPrice: 30000, notionReservas30: 4 }),
  cli({ n: 'SinNada', planPrice: 20000, notionReservas30: 0 }),
], [rutina('ConReservas'), rutina('SinNada')]);
const sinFechaExacta = m.riesgo();
igual(sinFechaExacta.n, 1,
  'riesgo · sin fecha de última visita pero con reservas del mes, NO es fuga');
igual(sinFechaExacta.items[0].c.name, 'SinNada',
  'riesgo · el que no tiene ni fecha ni reservas sí entra');
igual(sinFechaExacta.items[0].fuente, 'reporte',
  'riesgo · y se dice que la fuente no es una reserva, para no dar por cierto lo que no se sabe');

/* Quien no agenda por Calendly no entra: su ausencia no se puede medir. */
m.poner([cli({ n: 'AMano', planPrice: 30000, diasSinVenir: 40, sinCalendly: true })],
  [rutina('AMano')]);
igual(m.riesgo().n, 0,
  'riesgo · a quien no agenda por Calendly no se le mide la ausencia');

/* --- proyeccion de un servicio cobrado por sesion ------------------
   Dinero que todavia no existe y que NO se suma a la cartera. Lo que se
   comprueba aqui es la aritmetica, sobre todo la de las altas
   necesarias, que es la menos evidente de las cinco. */

/* El caso con los numeros que puso Diego: tramo 3 del convenio, diez
   personas en curso, series de diez a dos por semana. */
const p3 = m.svc(7830, 3560, 10, 10, 2);
igual(p3.porSesion, 11390, 'proyeccion · por sesion se suma lo que paga la persona y lo que reembolsa el convenio');
igual(p3.sesMes, 80, 'proyeccion · diez personas a dos sesiones por semana dan ochenta al mes');
igual(p3.mes, 911200, 'proyeccion · el mes son las sesiones por el valor de cada una');
igual(p3.ano, 10934400, 'proyeccion · el año son doce meses del mismo ritmo');
igual(p3.porSerie, 113900, 'proyeccion · la serie completa son diez sesiones');

/* La cifra que decide si la proyeccion se cumple: una serie de diez a
   dos por semana dura cinco semanas, o sea 1,25 meses; para sostener
   diez en curso hay que reponer ocho cada mes. */
igual(p3.semanasSerie, 5, 'proyeccion · una serie de diez a dos por semana dura cinco semanas');
igual(p3.altasMes, 8, 'proyeccion · para sostener diez en curso hacen falta ocho altas nuevas al mes');

/* El tramo 1 tiene que dar bastante menos por la misma cantidad de
   trabajo: es toda la decision del nivel en una linea. */
igual(m.svc(3560, 3560, 10, 10, 2).mes, 569600, 'proyeccion · el tramo 1 da menos por las mismas ochenta sesiones');

/* Vaciar el campo de sesiones por semana no puede reventar dividiendo
   entre cero: es lo primero que pasa cuando alguien borra el numero. */
const p0s = m.svc(7830, 3560, 10, 10, 0);
igual(p0s.sesMes, 0, 'proyeccion · sin sesiones por semana no hay sesiones al mes');
igual(p0s.altasMes, 0, 'proyeccion · y no se dividen altas entre cero');
di(isFinite(p0s.mes), 'proyeccion · el ingreso sigue siendo un numero finito con cero sesiones');
/* Y NINGUN campo puede volver como Infinity. Sin la guardia del divisor,
   semanasSerie sale Infinity y altasMes sigue dando 0, asi que el fallo no
   se ve por ninguna otra puerta: lo caza solo esta comprobacion. La tarjeta
   imprime semanasSerie tal cual y escribiria «Infinity semanas». */
Object.keys(p0s).forEach(function (k) {
  di(isFinite(p0s[k]), 'proyeccion · con cero sesiones por semana el campo «' + k + '» sigue siendo finito');
});

/* Un negativo escrito a mano no puede generar ingresos negativos: en una
   proyeccion eso no significa nada y ensucia la comparacion. */
igual(m.svc(-5000, 3560, 10, 10, 2).porSesion, 3560, 'proyeccion · un valor negativo cuenta como cero');
igual(m.svc(7830, 3560, -4, 10, 2).sesMes, 0, 'proyeccion · personas en curso negativas cuentan como cero');

/* Las sesiones por serie son el divisor de las altas: nunca menos de 1. */
di(isFinite(m.svc(7830, 3560, 10, 0, 2).altasMes),
  'proyeccion · una serie de cero sesiones no rompe la cuenta de altas');

/* --- salida --- */
console.log('\nUS19-APP · números de Finanzas');
console.log('archivo: ' + ruta + '\n');
avisos.forEach(a => console.log('  · ' + a));
if (fallos.length) {
  fallos.forEach(f => console.log('  ✗ ' + f));
  console.log('\ncomprobaciones OK: ' + ok + '  ·  FALLOS: ' + fallos.length + '\n');
  process.exit(1);
}
console.log('  comprobaciones OK: ' + ok + '  ·  sin fallos\n');
