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
  fn('u19SvcProy'), fn('u19PagoHoyISO'), fn('u19TermRenovado'),
  /* Deudas (15-sep-2026): los valores de partida, las tres constantes y las
     funciones puras de la tarjeta. Nada de pantalla. */
  tramo('var U19_DEUDAS_INICIAL = {', '\n};\n', 'U19_DEUDAS_INICIAL') + '\n};\n',
  tramo('var U19_DEU_TIPOS = [', '\n\n', 'constantes de deudas'),
  fn('u19DeuNumONull'), fn('u19DeuId'), fn('u19DeuIdLimpio'), fn('u19DeuNormalizarDeuda'), fn('u19DeuNormalizar'),
  fn('u19DeuSaldoCLP'), fn('u19DeuPctCupo'), fn('u19DeuAlertaCupo'), fn('u19DeuTotales'), fn('u19DeuCapacidad'),
  fn('u19DeuFechaMas'), fn('u19DeuFechaCorta'), fn('u19DeuLibre'), fn('u19DeuUSD'), fn('u19DeuPesosDec'),
  fn('u19DeuAbonoCalc'), fn('u19DeuAjusteCalc'), fn('u19DeuDeshacerCalc'), fn('u19DeuHacerUrgente'),
  /* Asistencia (16-sep-2026): las cuentas y el gráfico de la pestaña. */
  'function escapeHtml(s){ return String(s); }', 'function escapeAttr(s){ return String(s); }',
  fn('u19AsisSumarDias'), fn('u19AsisDiaSemana'), fn('u19AsisLunes'), fn('u19AsisNorm'), fn('u19AsisCubo'), fn('u19AsisResumen'),
  fn('u19AsisActivo'), fn('u19AsisFicha'), fn('u19AsisMotivos'), fn('u19AsisBarrasSVG'),
  /* Simulador financiero (19-sep-2026): las cuatro listas, los escenarios y
     las cuentas. Nada de pantalla. `u19SimReal` NO se extrae —lee Notion,
     settings y las deudas—: aqui la realidad se pasa a mano, que es como se
     prueba que el simulador la respeta en vez de inventarsela. */
  'function genId(){ return "id" + (genId._n = (genId._n || 0) + 1); }',
  tramo('var SIM_ESCENARIOS = [', '\n];\n', 'SIM_ESCENARIOS') + '\n];\n',
  tramo('var SIM_LISTAS = [', '\n];\n', 'SIM_LISTAS') + '\n];\n',
  tramo('var SIM_PERS_INICIAL = ', ';\n', 'SIM_PERS_INICIAL') + ';',
  tramo('var SIM_MESES_CORTOS = ', ';\n', 'SIM_MESES_CORTOS') + ';',
  fn('u19SimEnt'), fn('u19SimFilaNorm'), fn('u19SimNorm'), fn('u19SimInicial'),
  fn('u19SimSuma'), fn('u19SimTotales'), fn('u19SimPuntual'), fn('u19SimProy')].join('\n');

let m;
try {
  m = new Function(codigo + '\nreturn { poner: function(cl, rt){ state.clients = cl || []; state.routines = rt || []; },'
    + ' mes: u19FinMes, umbral: u19DiasUmbral, riesgo: u19FinRiesgo, antiguedad: u19FinAntiguedad,'
    + ' concentracion: u19FinConcentracion, renovaciones: u19FinRenovaciones, svc: u19SvcProy, term: u19TermRenovado,'
    + ' deuInicial: U19_DEUDAS_INICIAL, deuNormalizar: u19DeuNormalizar, deuNormalizarDeuda: u19DeuNormalizarDeuda,'
    + ' deuSaldoCLP: u19DeuSaldoCLP, deuPctCupo: u19DeuPctCupo, deuAlertaCupo: u19DeuAlertaCupo, deuTotales: u19DeuTotales,'
    + ' deuCapacidad: u19DeuCapacidad, deuLibre: u19DeuLibre, deuUSD: u19DeuUSD, deuPesosDec: u19DeuPesosDec,'
    + ' deuAbonoCalc: u19DeuAbonoCalc, deuAjusteCalc: u19DeuAjusteCalc, deuDeshacerCalc: u19DeuDeshacerCalc,'
    + ' deuUrgente: u19DeuHacerUrgente, deuFechaMas: u19DeuFechaMas,'
    + ' simEnt: u19SimEnt, simFilaNorm: u19SimFilaNorm, simNorm: u19SimNorm, simInicial: u19SimInicial,'
    + ' simSuma: u19SimSuma, simTotales: u19SimTotales, simPuntual: u19SimPuntual, simProy: u19SimProy,'
    + ' simListas: SIM_LISTAS, simEscenarios: SIM_ESCENARIOS, simPers: SIM_PERS_INICIAL,'
    + ' asisCubo: u19AsisCubo,'
    + ' asisResumen: u19AsisResumen, asisLunes: u19AsisLunes, asisFicha: u19AsisFicha, asisMotivos: u19AsisMotivos, asisBarras: u19AsisBarrasSVG };')();
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

/* --- «Marcar pagado»: pagar antes no puede restar días ---------------
   El término nuevo es +30 días desde el vencimiento si el plan sigue
   vigente, o desde hoy si ya venció: la misma regla del asistente. Antes
   era hoy + 1 mes y quien pagaba con días por delante los perdía. */
igual(m.term('2026-10-01', '2026-09-13').termino, '2026-10-31', 'pago · vigente: +30 días sobre su vencimiento');
di(m.term('2026-10-01', '2026-09-13').vigente === true, 'pago · el diálogo sabe que seguía vigente');
igual(m.term('2026-09-25', '2026-09-14').termino, '2026-10-25', 'pago · quien paga 11 días antes no pierde esos 11 días');
igual(m.term('2026-09-01', '2026-09-13').termino, '2026-10-13', 'pago · vencido: +30 días desde hoy');
igual(m.term('2026-09-13', '2026-09-13').termino, '2026-10-13', 'pago · vence hoy: +30 días desde hoy');
igual(m.term('', '2026-09-13').termino, '2026-10-13', 'pago · sin término: +30 días desde hoy');
igual(m.term('pronto', '2026-09-13').termino, '2026-10-13', 'pago · término ilegible: +30 días desde hoy');
igual(m.term('2026-09-05', '2026-09-01').termino, '2026-10-05', 'pago · cruza el cambio de hora sin correrse');
igual(m.term('2026-12-20', '2026-12-10').termino, '2027-01-19', 'pago · cruza el año');
di(/^\d{4}-\d{2}-\d{2}$/.test(m.term('2026-10-01', '').termino), 'pago · sin un hoy legible usa la fecha del equipo, no NaN');

/* Y que el botón use esa regla: si vuelve a calcular por su cuenta, las
   comprobaciones de arriba siguen verdes y el socio pierde días igual. */
const iMP = src.indexOf('window.u19MarcarPagado = function');
const cuerpoMP = iMP >= 0 ? src.slice(iMP, src.indexOf('\n};\n', iMP)) : '';
di(/u19TermRenovado\(item\.terminoActual, fechaPago\)/.test(cuerpoMP) && /var termino = renov\.termino;/.test(cuerpoMP),
  'pago · «Marcar pagado» calcula el término con u19TermRenovado sobre el término actual');
avisos.push('pago · «Marcar pagado» suma 30 días al vencimiento vigente, ejecutado en 11 casos');

/* --- 5 · DEUDAS: la cuarta tarjeta de Finanzas (15-sep-2026) -------
   Con los valores de partida de Diego y hoy fijo en 2026-09-15. Se prueba
   la aritmética, no la pantalla: total, neto, capacidad, fecha, cupo,
   abonos en las dos monedas, el ajuste desde el portal y deshacer. */
const HOY_DEU = '2026-09-15';
const md = m.deuNormalizar(JSON.parse(JSON.stringify(m.deuInicial)));
const NAC = md.deudas[0], INT = md.deudas[1], TROT = md.deudas[2], DELEX = md.deudas[3];
igual(NAC.id, 'tc-nacional', 'deudas · los valores de partida traen la nacional primero');
igual(TROT.tipo, 'no_urgente', 'deudas · la trotadora es «no urgente»');
igual(DELEX.tipo, 'por_venir', 'deudas · Delex es «por venir»');
const tot = m.deuTotales(md);
igual(tot.n, 2, 'deudas · solo las urgentes cuentan: nacional e internacional');
igual(m.deuSaldoCLP(INT), 575837, 'deudas · USD 612 × 940,91 = $575.837, redondeado a peso');
igual(tot.total, 993752, 'deudas · total $993.752 = 417.915 + 575.837');
igual(tot.comprometidos, 300000, 'deudas · ingresos comprometidos: 100.000 + 200.000');
igual(tot.neto, 693752, 'deudas · neto = total − comprometidos');
igual(m.deuCapacidad(800000, md), 725000, 'deudas · capacidad = utilidad 800.000 − sistema 75.000');
const libre = m.deuLibre(tot.neto, 725000, HOY_DEU);
igual(libre.dias, 29, 'deudas · ceil(693.752 / 725.000 × 30) = 29 días');
igual(libre.fecha, '2026-10-14', 'deudas · 29 días desde el 15-sep es el 14-oct');
igual(libre.etiqueta, '~14 oct 2026', 'deudas · «Libre de deuda urgente: ~14 oct 2026»');
igual(Math.round(m.deuPctCupo(NAC)), 84, 'cupo · la nacional va al 84 %');
di(m.deuAlertaCupo(m.deuPctCupo(NAC)) === true, 'cupo · y su barra va en rojo (≥ 80 %)');
igual(Math.round(m.deuPctCupo(INT)), 51, 'cupo · la internacional va al 51 %');
di(m.deuAlertaCupo(m.deuPctCupo(INT)) === false, 'cupo · al 51 % la barra no alarma');
di(m.deuAlertaCupo(79.9) === false && m.deuAlertaCupo(80) === true, 'cupo · el umbral es exactamente 80 %');
igual(m.deuPctCupo(TROT), null, 'cupo · sin cupo no hay porcentaje');
igual(INT.estado, 'CONFIRMADO', 'deudas · la internacional está CONFIRMADA');
igual(m.deuUSD(INT.saldo), 'USD 612,00', 'formato · «USD 612,00», con coma decimal');
igual(m.deuUSD(1200), 'USD 1.200,00', 'formato · miles con punto');
igual(m.deuPesosDec(INT.tipoCambio), '$940,91', 'formato · el dólar se muestra «$940,91»');

/* Abono de $100.000 a la nacional */
const ab = m.deuAbonoCalc(NAC, 100000, 'CLP', HOY_DEU, 'prueba');
igual(ab.saldo, 317915, 'abono · 417.915 − 100.000 = 317.915');
igual(ab.mov.montoCLP, 100000, 'abono · queda registrado en pesos');
igual(ab.mov.tipo, 'abono', 'abono · el movimiento es un abono');
igual(ab.mov.saldoAntes, 417915, 'abono · guarda el saldo anterior para poder deshacerlo');
NAC.saldo = ab.saldo; NAC.abonos = NAC.abonos.concat([ab.mov]);
const tot2 = m.deuTotales(md);
igual(tot2.total, 893752, 'abono · el total baja a $893.752');
const libre2 = m.deuLibre(tot2.neto, 725000, HOY_DEU);
igual(libre2.dias, 25, 'abono · 593.752 / 725.000 × 30 → 25 días');
igual(libre2.etiqueta, '~10 oct 2026', 'abono · «~10 oct 2026»');

/* Deshacer el abono */
const des = m.deuDeshacerCalc(NAC);
igual(des.saldo, 417915, 'deshacer · vuelve al saldo anterior');
igual(des.abonos.length, 0, 'deshacer · y quita el movimiento del historial');
NAC.saldo = des.saldo; NAC.abonos = des.abonos;
igual(m.deuDeshacerCalc(NAC), null, 'deshacer · sin historial no hay nada que deshacer');

/* La internacional: abonar en USD o en CLP */
const abU = m.deuAbonoCalc(INT, 100, 'USD', HOY_DEU, '');
igual(abU.saldo, 512, 'abono USD · 612 − 100 = 512');
igual(abU.mov.montoCLP, 94091, 'abono USD · en pesos, con el dólar guardado: $94.091');
const abC = m.deuAbonoCalc(INT, 94091, 'CLP', HOY_DEU, '');
igual(abC.mov.montoOriginal, 100, 'abono en CLP a una deuda en USD · $94.091 / 940,91 = USD 100,00');
igual(abC.saldo, 512, 'abono en CLP a una deuda en USD · el saldo baja en dólares');

/* Abono mayor que el saldo */
igual(m.deuAbonoCalc(NAC, 999999, 'CLP', HOY_DEU, '').saldo, 0, 'abono · mayor que el saldo deja 0, nunca negativo');
igual(m.deuAbonoCalc(INT, 5000, 'USD', HOY_DEU, '').saldo, 0, 'abono · lo mismo en dólares');

/* Ajuste desde el portal */
const ajN = m.deuAjusteCalc(NAC, 82085, HOY_DEU);
igual(ajN.saldo, 417915, 'portal · nacional: cupo 500.000 − disponible 82.085 = 417.915');
igual(ajN.mov.tipo, 'ajuste', 'portal · se registra como AJUSTE, no como abono');
igual(ajN.mov.saldoAntes, 417915, 'portal · guarda el saldo anterior');
const ajI = m.deuAjusteCalc(INT, 588, HOY_DEU);
igual(ajI.saldo, 612, 'portal · internacional: cupo 1.200 − disponible 588 = 612');
igual(m.deuAjusteCalc(TROT, 100, HOY_DEU), null, 'portal · sin cupo no hay ajuste');
igual(m.deuAjusteCalc(NAC, 999999, HOY_DEU).saldo, 0, 'portal · un disponible mayor que el cupo deja saldo 0');
/* Deshacer un ajuste */
const dTmp = JSON.parse(JSON.stringify(NAC)); dTmp.saldo = 300000;
const ajT = m.deuAjusteCalc(dTmp, 0, HOY_DEU);
dTmp.saldo = ajT.saldo; dTmp.abonos = dTmp.abonos.concat([ajT.mov]);
igual(dTmp.saldo, 500000, 'portal · disponible 0 = todo el cupo usado');
igual(m.deuDeshacerCalc(dTmp).saldo, 300000, 'deshacer · también revierte un ajuste');

/* La trotadora pasa a urgente */
m.deuUrgente(TROT);
di(TROT.incluirEnTotal === true && TROT.tipo === 'credito', 'urgente · la trotadora pasa a crédito urgente');
const tot3 = m.deuTotales(md);
igual(tot3.total, 2493752, 'urgente · con la trotadora el total es $2.493.752');
igual(tot3.n, 3, 'urgente · y son 3 urgentes');
m.deuUrgente(DELEX);
di(DELEX.estado === 'CONFIRMADO' && DELEX.tipo === 'credito' && DELEX.incluirEnTotal === true, 'urgente · un «por venir» se vuelve deuda real CONFIRMADA');

/* Sin capacidad, neto cero, comprometidos mayores que la deuda */
igual(m.deuLibre(693752, 0, HOY_DEU), null, 'capacidad · sin capacidad de pago devuelve null (la tarjeta lo dice en rojo)');
igual(m.deuLibre(693752, -5000, HOY_DEU), null, 'capacidad · negativa también');
igual(m.deuLibre(0, 725000, HOY_DEU).etiqueta, 'ya', 'capacidad · neto 0 → «ya»');
igual(m.deuTotales({ deudas: [{ incluirEnTotal: true, moneda: 'CLP', saldo: 100000 }], ingresosComprometidos: [{ monto: 300000 }] }).neto, 0,
  'neto · nunca negativo aunque los comprometidos superen la deuda');
igual(m.deuNormalizar({}).deudas.length, 0, 'normalizar · un modelo vacío no revienta');
igual(m.deuNormalizar({ deudas: { a: 1 } }).deudas.length, 0, 'normalizar · un objeto donde va un array queda vacío, no revienta');
igual(m.deuNormalizarDeuda({ id: 'a b/c', moneda: 'EUR' }).moneda, 'CLP', 'normalizar · moneda desconocida → CLP');
igual(m.deuNormalizarDeuda({ id: 'a b/c', saldo: -5 }).saldo, 0, 'normalizar · un saldo negativo queda en 0');
igual(m.deuNormalizarDeuda({ id: 'a b/c' }).id, 'abc', 'normalizar · el id se limpia para ir dentro de onclick');
igual(m.deuFechaMas('2026-12-25', 10), '2027-01-04', 'fecha · cruza el año');
avisos.push('deudas · la cuarta tarjeta: total, fecha, cupo, abonos en CLP y USD, ajuste desde el portal y deshacer, ejecutados con los valores del 15-sep');

/* --- Asistencia (16-sep-2026): las cuentas de la pestaña ------------------
   Fechas escritas a mano a propósito: las cuentas reciben «hoy» como
   argumento, así que no dependen del reloj. El 16-sep-2026 es miércoles. */
{
  const HOYA = '2026-09-16';
  const F = (f, h, n, t, v) => ({ f: f, h: h, n: n, t: t, v: v, m: '…4544' });
  const filas = [
    F('2026-09-16', '18:00', 'Ana Pérez', '12345678', 1),
    F('2026-09-16', '18:00', 'Bruno Soto', '22223333', 0),
    F('2026-09-15', '19:00', 'Bruno Soto', '22223333', 0),
    F('2026-09-15', '19:00', 'Carla Díaz', '', 1),
    F('2026-09-14', '07:00', 'Ana Pérez', '12345678', 1),
    F('2026-09-12', '10:00', 'Carla Díaz', '', 1),
    F('2026-08-10', '18:00', 'Diego Mena', '44445555', 0),
    F('2026-08-17', '18:00', 'Elisa Rojas', '55556666', 0),   // día 31 contando hoy: ya no entra en los 30
    F('2026-09-17', '18:00', 'Mañana', '99998888', 0),
    { f: 'basura', h: '18:00', n: 'X', t: '', v: 0 }
  ];
  const r = m.asisResumen(filas, HOYA, 12);
  igual(JSON.stringify([r.vino30, r.falto30, r.pct30, r.dias30]), '[4,2,67,4]',
    'asistencia · 30 días: vinieron, faltaron, % y días con lista (sin lo de mañana, lo viejo ni la basura)');
  igual(r.semanas.length, 12, 'asistencia · 12 semanas, también las vacías');
  igual(r.semanas[11].lunes, '2026-09-14', 'asistencia · la última semana empieza el lunes de hoy');
  igual(JSON.stringify([r.semanas[11].vino, r.semanas[11].falto, r.semanas[11].pct]), '[3,2,60]', 'asistencia · la semana de hoy');
  di(r.semanas.some(s => s.lunes === '2026-08-10' && s.falto === 1 && s.pct === 0), 'asistencia · la falta del 10-ago cae en su semana aunque quede fuera de 30 días');
  di(r.semanas.some(s => s.pct === null), 'asistencia · una semana sin lista tiene % null, no cero');
  igual(r.horas.map(x => x.h + ':' + x.vino + '/' + x.falto).join(','), '07:1/0,10:1/0,18:1/1,19:1/1', 'asistencia · por hora');
  igual(r.diasSemana.map(x => x.d).join(','), '1,2,3,4,5,6', 'asistencia · lunes a viernes siempre, y el sábado porque hubo lista');
  igual(r.top.length, 1, 'asistencia · «quién falta más» trae solo a quien faltó');
  igual(JSON.stringify([r.top[0].nombre, r.top[0].falto, r.top[0].vino, r.top[0].pct, r.top[0].ultima]), '["Bruno Soto",2,0,0,"2026-09-16"]',
    'asistencia · con sus faltas, lo que vino, su % y la última falta');
  igual(m.asisResumen([], HOYA).hayDatos, false, 'asistencia · sin filas no hay datos');
  igual(m.asisResumen(null, HOYA).pct30, null, 'asistencia · sin filas el % es null, no NaN');
  igual(m.asisLunes('2026-09-20'), '2026-09-14', 'asistencia · el domingo es de la semana que empezó el lunes');
  igual(m.asisLunes('2026-09-01'), '2026-08-31', 'asistencia · la semana cruza el mes');

  const cl2 = [
    { name: 'Ana', notionEstado: 'Activo', notionFichaIngreso: 'Aceptada' },
    { name: 'Carla', notionEstado: 'Activo' },
    { name: 'Bruno', notionEstado: 'Activo', notionFichaIngreso: 'Pedida' },
    { name: 'Diego', notionEstado: 'Inactivo', notionMotivoSalida: 'Horario' },
    { name: 'Elisa', notionEstado: 'Inactivo', notionMotivoSalida: 'Horario' },
    { name: 'Fede', notionEstado: 'Inactivo', notionMotivoSalida: 'Precio' },
    { name: 'Gabi', notionEstado: 'Inactivo' },
    { name: 'Hugo', activo: false, notionEstado: 'Activo', notionFichaIngreso: '' }
  ];
  const fi = m.asisFicha(cl2);
  igual(JSON.stringify([fi.activos, fi.aceptada, fi.pedida, fi.sin, fi.faltan.join('|')]), '[3,1,1,1,"Bruno|Carla"]',
    'ficha · activos, aceptada, pedida, sin pedir y a quién le falta, en orden');
  const mo = m.asisMotivos(cl2);
  igual(JSON.stringify(mo.lista), '[{"motivo":"Horario","n":2},{"motivo":"Precio","n":1}]', 'motivos · ordenados de más a menos');
  igual(JSON.stringify([mo.total, mo.sinMotivo]), '[3,2]', 'motivos · los activos no cuentan; marcado inactivo en la app cuenta como sin motivo');

  const svg = m.asisBarras([{ lbl: 'Lu', vino: 3, falto: 1, top: '1' }, { lbl: 'Ma', vino: 0, falto: 0, top: '' }]);
  di(/<svg/.test(svg) && (svg.match(/<rect/g) || []).length === 2 && /Lu: 3 vinieron/.test(svg) && /Lu: 1 faltaron/.test(svg),
    'barras · una barra verde y una roja, con su detalle al pasar el dedo');
  di(!/<svg/.test(m.asisBarras([{ lbl: 'Lu', vino: 0, falto: 0 }])), 'barras · sin datos no dibuja un gráfico vacío');

  /* --- 19-sep-2026 · Fase 8: avisar no es faltar ------------------------
     La hoja del asistente distingue cinco estados desde el 18-sep. Hasta hoy
     la app solo recibía vino/no vino, así que quien avisaba que no podía
     venir contaba igual que quien dejaba la hora plantada. Eso mueve el
     número que Diego mira y señala al socio equivocado en «quién falta más».

     Lo que más se vigila aquí: que los datos VIEJOS —los que solo traen `v`—
     sigan dando exactamente los mismos números que antes. Un cambio que
     mejora el futuro y reescribe el pasado no es una mejora. */
  igual(m.asisCubo({ e: 'aviso' }), 'aviso', 'estados · un aviso es un aviso');
  igual(m.asisCubo({ e: 'CANCELO' }), 'cancelo', 'estados · da igual cómo venga escrito');
  igual(m.asisCubo({ e: 'anulado' }), '', 'estados · lo anulado no cae en ninguna casilla');
  igual(m.asisCubo({ e: 'lo que sea', v: 0 }), '',
    'estados · un estado que no conocemos NO se cuenta: antes que sumarlo mal, no sumarlo');
  igual(m.asisCubo({ v: 1 }), 'vino', 'estados · una fila vieja sin estado se deduce de v');
  igual(m.asisCubo({ v: 0 }), 'falta', 'estados · y un v:0 viejo sigue siendo una falta');
  igual(m.asisCubo(null), '', 'estados · una fila nula no revienta');

  const HOYB = '2026-09-19';
  const f = (dia, nombre, cubo, hora) => ({ f: dia, h: hora || '18:00', n: nombre, t: nombre === 'Ana' ? '11111111' : '22222222',
    v: cubo === 'vino' ? 1 : 0, e: cubo });
  const BASE = [f('2026-09-15', 'Ana', 'vino'), f('2026-09-16', 'Ana', 'vino'),
                f('2026-09-17', 'Ana', 'falta'), f('2026-09-18', 'Bruno', 'vino')];
  const CON_AVISOS = BASE.concat([f('2026-09-18', 'Ana', 'aviso'), f('2026-09-19', 'Bruno', 'cancelo')]);

  const rB = m.asisResumen(BASE, HOYB, 12);
  const rA = m.asisResumen(CON_AVISOS, HOYB, 12);
  igual(JSON.stringify([rB.vino30, rB.falto30, rB.pct30]), '[3,1,75]', 'estados · el caso de partida: 3 de 4');
  igual(JSON.stringify([rA.vino30, rA.falto30, rA.pct30]), '[3,1,75]',
    'estados · dos avisos más NO mueven el porcentaje: no cuentan ni a favor ni en contra');
  igual(JSON.stringify([rA.aviso30, rA.cancelo30]), '[1,1]', 'estados · pero se cuentan aparte, uno de cada');
  igual(rA.dias30, 5, 'estados · un día en que solo hubo un aviso SÍ es un día con lista');

  /* El error que esto viene a deshacer, escrito como prueba: si el aviso se
     colara como falta, serían 3 de 6 = 50 %, y Ana saldría con 2 faltas. */
  const COMO_ANTES = m.asisResumen(CON_AVISOS.map(x => ({ f: x.f, h: x.h, n: x.n, t: x.t, v: x.v })), HOYB, 12);
  igual(COMO_ANTES.pct30, 50, 'estados · sin el estado, los mismos datos dan 50 % (era el error)');
  di(rA.pct30 !== COMO_ANTES.pct30, 'estados · o sea que la diferencia no es cosmética: son 25 puntos');

  const ana = rA.top.filter(p => p.nombre === 'Ana')[0];
  igual(JSON.stringify([ana.falto, ana.aviso, ana.vino]), '[1,1,2]',
    'estados · en «quién falta más», el aviso de Ana va en su columna, no en sus faltas');
  igual(ana.ultima, '2026-09-17', 'estados · y su última falta es la falta, no el aviso del día siguiente');
  di(!rA.top.some(p => p.nombre === 'Bruno'),
    'estados · quien solo canceló no aparece en «quién falta más»: no ha faltado');

  /* Las seis filas caen en la MISMA semana (lunes 2026-09-14): lo que se
     comprueba es que el aviso va en su propia cuenta y no se mezcla con las
     otras dos, no que caigan en semanas distintas. */
  const semA = rA.semanas.filter(s => s.aviso > 0);
  di(semA.length === 1 && JSON.stringify([semA[0].vino, semA[0].falto, semA[0].aviso]) === '[3,1,2]',
    'estados · la semana lleva su propio recuento de avisos, aparte de vino y faltó');
  igual(semA[0].pct, 75, 'estados · y el % de la semana tampoco se mueve por los avisos');
  const dia18 = rA.horas.filter(x => x.h === '18')[0];
  igual(JSON.stringify([dia18.vino, dia18.falto, dia18.aviso]), '[3,1,2]', 'estados · y la hora también');

  /* Las barras: tres tramos, y la escala tiene que contar el de en medio o el
     ámbar se sale del gráfico por arriba. */
  const svg3 = m.asisBarras([{ lbl: 'Lu', vino: 2, falto: 1, aviso: 3, top: '' }]);
  igual((svg3.match(/<rect/g) || []).length, 3, 'barras · tres tramos cuando hay avisos');
  di(/avisaron o cancelaron/.test(svg3), 'barras · y el tramo ámbar se explica al pasar el dedo');
  const alturas = (svg3.match(/height="([\d.]+)"/g) || []).map(s => Number(s.match(/[\d.]+/)[0]));
  di(Math.abs(alturas.reduce((a, b) => a + b, 0) - (150 - 16 - 22)) < 0.5,
    'barras · los tres tramos juntos llenan la barra: la escala cuenta el ámbar');
  igual((m.asisBarras([{ lbl: 'Lu', vino: 2, falto: 1, top: '' }]).match(/<rect/g) || []).length, 2,
    'barras · sin avisos siguen siendo dos, como antes');


  /* Tres agujeros que encontraron los mutantes, no yo leyendo: */

  /* a) que el clasificador sepa qué es ANULADO no sirve de nada si el resumen
        no lo saltaba: una hora anulada volvía a las cuentas como falta. */
  const CON_ANULADO = CON_AVISOS.concat([f('2026-09-19', 'Ana', 'anulado'), { f: '2026-09-19', h: '18:00', n: 'Ana', t: '11111111', v: 0, e: 'inventado' }]);
  igual(JSON.stringify([m.asisResumen(CON_ANULADO, HOYB, 12).vino30, m.asisResumen(CON_ANULADO, HOYB, 12).falto30]),
    '[3,1]', 'estados · una hora anulada, y una con un estado desconocido, no entran en ninguna cuenta');

  /* b) con un aviso y una cancelación no se puede ver si están cambiados:
        salen [1,1] igual. Hacen falta cantidades distintas. */
  const ASIM = BASE.concat([f('2026-09-18', 'Ana', 'aviso'), f('2026-09-18', 'Bruno', 'aviso'), f('2026-09-19', 'Bruno', 'cancelo')]);
  igual(JSON.stringify([m.asisResumen(ASIM, HOYB, 12).aviso30, m.asisResumen(ASIM, HOYB, 12).cancelo30]),
    '[2,1]', 'estados · dos avisos y UNA cancelación: cada uno en su cuenta, sin cambiarse');

  /* c) y que la app se lo pida al asistente. Sin `est=1` el puente manda solo
        vino/no vino y toda esta pestaña se queda como estaba, sin decir nada. */
  di(/u19DashUrl\("asistencia"\) \+ "&dias=90&est=1"/.test(src),
    'estados · la app le avisa al asistente de que sabe contarlos (est=1)');
  avisos.push('estados · los cinco de la hoja, con el caso que prueba que los datos viejos no cambian de número');
  avisos.push('asistencia · la pestaña: 30 días, semanas, horas, días, quién falta más, ficha de ingreso y motivos, ejecutados con listas inventadas');
}

/* =====================================================================
 * 6 - SIMULADOR FINANCIERO  (19-sep-2026)
 *
 * Es la pestana donde Diego decide cuanto sacarse del gimnasio y en
 * cuanto liquida la deuda. Las cuentas son puras, asi que se ejecutan
 * enteras con un plantel inventado y cifras redondas a mano.
 *
 * Lo que mas se vigila aqui no es una formula: son las TRES PROMESAS que
 * la pantalla le hace por escrito.
 *   1. "No toca ningun dato real"  -> el escenario no cambia los gastos.
 *   2. "El retiro no crea plata"   -> mover el retiro no mueve el excedente.
 *   3. "Solo el gimnasio entra en el equilibrio" -> lo personal no cuenta.
 * Si alguna deja de ser cierta, la pantalla miente, y eso es peor que un
 * numero mal: es un numero mal en el que se confia.
 * ===================================================================== */
{
  /* La realidad que la app YA sabe. Se pasa a mano a proposito: asi se
     comprueba que el simulador parte de ella en vez de inventarsela. */
  const REAL = { ingresoGym: 1000000, ticket: 50000, clientes: 20, costoFijo: 600000, deuda: 900000, hayNotion: true };
  const POBRE = { ingresoGym: 0, ticket: 0, clientes: 0, costoFijo: 0, deuda: null, hayNotion: false };

  const filas = (arr) => arr.map((f, i) => ({ id: 'f' + i, concepto: f[0], monto: f[1], tipo: f[2] || 'rec', mes: f[3] || 1 }));
  const MODELO = m.simNorm({
    ingExtra:  filas([['Clases fuera', 200000]]),
    gastoFijo: filas([['Arriendo', 400000], ['Luz y agua', 100000]]),
    gastoVar:  filas([['Insumos', 100000]]),
    gastoPers: filas([['Casa', 300000]]),
    retiro: 400000, fondoActual: 500000
  }, REAL);

  /* --- normalizacion: lo guardado puede venir de cualquier version --- */
  igual(m.simNorm(null, REAL).ingGym, 1000000, 'sim - sin nada guardado, el ingreso del gym es el REAL');
  igual(m.simNorm([], REAL).escenario, 'base', 'sim - un array donde iba un objeto no tumba Finanzas');
  igual(m.simNorm({ escenario: 'inventado' }, REAL).escenario, 'base', 'sim - un escenario que no existe cae en base');
  igual(m.simNorm({ ingGym: 5, ingGymManual: false }, REAL).ingGym, 1000000,
    'sim - sin sobrescritura manual manda SIEMPRE el dato real, aunque hubiera otro guardado');
  igual(m.simNorm({ ingGym: 5, ingGymManual: true }, REAL).ingGym, 5,
    'sim - con sobrescritura manual manda el numero de Diego');
  igual(m.simNorm({ bajasPct: 500 }, REAL).bajasPct, 100, 'sim - un porcentaje de bajas de 500 se recorta a 100');
  igual(m.simNorm({ nuevosMes: -3 }, REAL).nuevosMes, 0, 'sim - no se pueden captar socios negativos');
  igual(m.simNorm({ gastoFijo: 'esto no es una lista' }, REAL).gastoFijo.length, 0,
    'sim - una lista que no es lista queda vacia, no revienta');
  igual(m.simNorm({ gastoPers: new Array(60).fill({ concepto: 'x', monto: 1 }) }, REAL).gastoPers.length, 40,
    'sim - el tope de 40 filas se aplica al leer, no solo al anadir');
  igual(m.simFilaNorm({ monto: -500 }).monto, 0, 'sim - un monto negativo queda en cero');
  igual(m.simFilaNorm({ mes: 99 }).mes, 12, 'sim - el mes de un gasto puntual no se sale del ano');
  igual(m.simFilaNorm({ tipo: 'loquesea' }).tipo, 'rec', 'sim - un tipo desconocido es "cada mes"');
  igual(m.simFilaNorm({ concepto: 'x'.repeat(80) }).concepto.length, 40, 'sim - el concepto se corta en 40');
  di(m.simFilaNorm({}).id.length > 0, 'sim - una fila sin id se lleva uno propio');
  igual(m.simEnt('no es un numero', 7, 0, 10), 7, 'sim - texto en un campo de numero cae en el valor por defecto');

  /* --- lo que se precarga la primera vez --- */
  const INI = m.simInicial(REAL);
  igual(JSON.stringify([INI.gastoFijo.length, INI.gastoFijo[0].monto]), '[1,600000]',
    'sim - de partida, UNA fila de gasto fijo con el costo fijo real de la app');
  igual(INI.gastoPers.length, m.simPers.length, 'sim - las etiquetas del bolsillo vienen puestas');
  di(INI.gastoPers.every(f => f.monto === 0),
    'sim - el bolsillo viene en CERO: se precarga el nombre, nunca una cifra inventada');
  igual(JSON.stringify([INI.ingExtra.length, INI.gastoVar.length]), '[0,0]',
    'sim - lo que la app no sabe (ingresos por fuera, gastos variables) entra vacio');

  /* --- las cuentas --- */
  const T = m.simTotales(MODELO, REAL);
  igual(JSON.stringify([T.ingTotal, T.gastoGym, T.egTotal, T.excedente]), '[1200000,600000,900000,300000]',
    'sim - entra 1.200.000, sale 900.000 (600.000 del gym + 300.000 del bolsillo), sobran 300.000');
  igual(T.utilGym, 400000, 'sim - el gimnasio solo produce 400.000: 1.000.000 menos sus propios 600.000');
  igual(T.tasaAhorro, 25, 'sim - se ahorra el 25% de lo que entra');
  igual(T.equilibrio, 12, 'sim - con 20 socios a 50.000, 12 pagan los 600.000 del gimnasio');
  igual(T.mesesDeuda, 3, 'sim - 900.000 de deuda a 300.000 al mes son 3 meses');
  igual(JSON.stringify([T.fondoMeta, T.fondoFalta, T.fondoMeses]), '[1500000,1000000,4]',
    'sim - el fondo son 3 meses de gasto FIJO (1.500.000); faltan 1.000.000 y son 4 meses');

  /* PROMESA 2 - el retiro mueve la plata de bolsillo, no la crea. */
  const SIN_RETIRO = m.simTotales(Object.assign({}, MODELO, { retiro: 0 }), REAL);
  igual(SIN_RETIRO.excedente, T.excedente, 'sim - PROMESA: subir el retiro NO cambia el excedente total');
  igual(JSON.stringify([T.cajaGym, T.bolsillo]), '[0,300000]',
    'sim - con 400.000 de retiro la caja del gym queda en 0 y al bolsillo llegan 300.000');
  igual(JSON.stringify([SIN_RETIRO.cajaGym, SIN_RETIRO.bolsillo]), '[400000,-100000]',
    'sim - sin retiro el gym se queda los 400.000 y el bolsillo entra en rojo: la misma plata, otro lado');
  igual(T.cajaGym + T.bolsillo, SIN_RETIRO.cajaGym + SIN_RETIRO.bolsillo,
    'sim - los dos bolsillos suman siempre lo mismo, se reparta como se reparta');

  /* PROMESA 3 - lo personal no entra en el equilibrio del gimnasio. */
  const CARO = m.simTotales(m.simNorm(Object.assign({}, MODELO, {
    gastoPers: filas([['Casa', 300000], ['Un gasto enorme', 9000000]])
  }), REAL), REAL);
  igual(CARO.equilibrio, T.equilibrio,
    'sim - PROMESA: un gasto personal gigante no cambia el equilibrio (el gimnasio no lo paga)');
  di(CARO.excedente < 0, 'sim - pero si hunde el excedente, que es de los dos');

  /* Divisiones por cero, que es donde estas cuentas revientan de verdad. */
  const CERO = m.simTotales(m.simNorm({ gastoFijo: filas([['Arriendo', 400000]]) }, POBRE), POBRE);
  igual(CERO.equilibrio, null, 'sim - sin socios y sin ticket el equilibrio es "-", nunca Infinity');
  /* El caso que de verdad muerde, y que la primera version de esta prueba no
     cubria: SIN Notion la app estima un ingreso pero el numero de socios
     puede ser 0. Dividir por cero da Infinity, y el equilibrio saldria «0
     socios pagan el gimnasio», que es mentira y suena a buena noticia. Lo
     encontro un mutante que escapaba, no yo leyendo el codigo. */
  const SIN_SOCIOS = { ingresoGym: 1000000, ticket: 50000, clientes: 0, costoFijo: 600000, deuda: null, hayNotion: false };
  const TS = m.simTotales(m.simNorm({ gastoFijo: filas([['Arriendo', 400000]]) }, SIN_SOCIOS), SIN_SOCIOS);
  igual(TS.porSocio, 50000, 'sim - sin socios contados, cada socio aporta el TICKET, no una division por cero');
  igual(TS.equilibrio, 8, 'sim - y el equilibrio son 8 socios de verdad, nunca 0 por haber dividido por Infinity');
  igual(CERO.mesesDeuda, null, 'sim - sin dato de deuda no se inventa un plazo');
  igual(CERO.tasaAhorro, null, 'sim - sin ingresos la tasa de ahorro es "-", no NaN');
  igual(CERO.fondoMeses, null, 'sim - sin excedente el fondo no se llena "nunca", no en Infinity meses');
  const AHOGADO = m.simTotales(m.simNorm(Object.assign({}, MODELO, { gastoPers: filas([['Casa', 5000000]]) }), REAL), REAL);
  igual(AHOGADO.mesesDeuda, null, 'sim - con el excedente en rojo la deuda no se paga "en X meses": no se paga');

  /* --- gastos de una sola vez --- */
  const PUNT = m.simNorm(Object.assign({}, MODELO, {
    gastoVar: filas([['Insumos', 100000], ['Maquina nueva', 1200000, 'unico', 5]])
  }), REAL);
  const TP = m.simTotales(PUNT, REAL);
  igual(TP.gastoVar, 100000, 'sim - lo de una sola vez NO se suma al gasto de cada mes');
  igual(TP.puntualesEg, 1200000, 'sim - pero se cuenta aparte, para que se vea que existe');
  igual(m.simPuntual(PUNT.gastoVar, 5), 1200000, 'sim - y cae en su mes');
  igual(m.simPuntual(PUNT.gastoVar, 6), 0, 'sim - y en ningun otro');
  const P12 = m.simProy(PUNT, REAL, 'base');
  igual(P12.reduce((s, f) => s + f.egresos, 0) - P12.length * TP.egTotal, 1200000,
    'sim - en los doce meses la maquina aparece UNA vez, ni cero ni doce');

  /* --- la proyeccion --- */
  const BASE = m.simProy(MODELO, REAL, 'base');
  igual(BASE.length, 12, 'sim - la proyeccion son doce meses');
  igual(JSON.stringify([BASE[0].excedente, BASE[11].acumulado]), '[300000,3600000]',
    'sim - en base se repite el mismo mes: 300.000 doce veces son 3.600.000');
  igual(BASE[11].socios, 20, 'sim - en base no entra ni se va nadie');

  const OPT = m.simProy(m.simNorm(Object.assign({}, MODELO, { nuevosMes: 2, precioNuevo: 50000 }), REAL), REAL, 'optimista');
  igual(JSON.stringify([OPT[11].socios, OPT[11].ingresos]), '[44,2400000]',
    'sim - optimista: 2 socios al mes son 44 en el mes doce y 2.400.000 entrando');
  igual(OPT[11].acumulado, 11400000, 'sim - y el acumulado sale de sumar los doce, no de multiplicar el ultimo');

  const PES = m.simProy(m.simNorm(Object.assign({}, MODELO, { bajasPct: 10 }), REAL), REAL, 'pesimista');
  igual(PES[0].socios, 18, 'sim - pesimista: se va el 10% de los que QUEDAN, no del total de partida');
  igual(PES[11].socios, 6, 'sim - y en el mes doce quedan 6 de los 20');
  di(PES[11].ingresos < PES[0].ingresos && PES[11].excedente < BASE[11].excedente,
    'sim - perdiendo socios se cobra menos y sobra menos');

  /* PROMESA 1 - los escenarios no son tres modelos distintos: son el MISMO
     supuesto mirado de tres maneras. Si el optimista cambiara los gastos,
     comparar no serviria de nada. */
  igual(JSON.stringify([BASE[0].egresos, OPT[0].egresos, PES[0].egresos]),
    JSON.stringify([900000, 900000, 900000]),
    'sim - PROMESA: los tres escenarios gastan lo mismo; solo cambia lo que entra');

  avisos.push('simulador - cuatro listas, tres escenarios, doce meses y las tres promesas de la pantalla, ejecutados con cifras inventadas');
}

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
