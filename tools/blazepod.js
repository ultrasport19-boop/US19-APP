/* Prueba del Planificador BlazePod.
 *
 * El motor (blzEstimulos / blzGenerar) es puro: entra un plan, sale una lista
 * de estímulos. Esta suite lo extrae del index.html y lo evalúa aislado, igual
 * que circuitos.js, con casos fijos. Lo que no se puede ejecutar sin navegador
 * —los temporizadores, el escapado, la vista de solo lectura, el respaldo—
 * se comprueba sobre el texto del archivo, y esas comprobaciones también
 * tienen su mutante en tools/mutantes_blazepod.json.
 *
 *   node tools/blazepod.js [index.html]
 *
 * Regla de la casa: una prueba que no encuentra lo que buscaba FALLA. Si
 * alguien renombra una función, esto aborta en vez de pasar en verde.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('blazepod: no encuentro el inicio de ' + nombre); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('blazepod: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}
function fn(nombre) { return tramo('function ' + nombre + '(', '\n}\n', nombre) + '\n}\n'; }

/* El motor entero, de la primera constante a las plantillas. */
const motor = tramo('var BLZ_VERSION = 1;', '/* ---------- plantillas de actividad ---------- */', 'el motor BlazePod');
const codigo = [fn('u19Arr'), motor].join('\n');

let m;
try {
  m = new Function(codigo + '\nreturn { BLZ_COLORES: BLZ_COLORES, BLZ_MODOS: BLZ_MODOS, BLZ_MAX_PODS: BLZ_MAX_PODS, BLZ_AVISO: BLZ_AVISO,'
    + ' blzNum: blzNum, blzEnt: blzEnt, blzTexto: blzTexto, blzRnd: blzRnd, blzSemillaNum: blzSemillaNum, blzTomar: blzTomar,'
    + ' blzPlanNuevo: blzPlanNuevo, blzPlanDe: blzPlanDe, blzActivo: blzActivo, blzNormalizar: blzNormalizar,'
    + ' blzColorPorId: blzColorPorId, blzPodPorN: blzPodPorN, blzPodBase: blzPodBase, blzHuerfanos: blzHuerfanos,'
    + ' blzPosAuto: blzPosAuto, blzColocar: blzColocar, blzElegirPods: blzElegirPods, blzEstimulos: blzEstimulos,'
    + ' blzSerieDur: blzSerieDur, blzGenerar: blzGenerar, blzDuracion: blzDuracion, blzSimEnT: blzSimEnT, blzSimTotal: blzSimTotal,'
    + ' blzDistancias: blzDistancias, blzMontaje: blzMontaje, blzMontajeTexto: blzMontajeTexto, blzSeg: blzSeg };')();
} catch (e) {
  console.error('blazepod: el motor no evalúa aislado: ' + e.message);
  process.exit(1);
}

let ok = 0; const fallos = [];
function di(cond, txt) { if (cond) ok++; else fallos.push(txt); }
function igual(txt, a, b) { di(a === b, txt + '  (esperaba ' + JSON.stringify(b) + ', salió ' + JSON.stringify(a) + ')'); }
/* Busca en el archivo; si el trozo no existe, es un fallo, no un silencio. */
function dentro(nombre, aguja, txt) {
  const cuerpo = fn(nombre);
  di(cuerpo.indexOf(aguja) >= 0, txt);
}

/* --- un plan de referencia: el ejemplo de aceptación --- */
function planDemo(extra) {
  const p = {
    activo: true, version: 1, alcance: 'circuito', contexto: 'futbol',
    superficie: { tipo: 'media', anchoM: 25, altoM: 20, rejilla: true },
    pods: [], adornos: [],
    logica: { modo: 'random', duracion: 30, preparacion: 0, intervalo: 3, luz: 3, respuesta: 3,
              disparo: 'intervalo', simultaneos: 1, sinRepetir: true, semilla: 'us19-demo', sonido: false },
    colores: [
      { id: 'verde', hex: '#22c55e', consigna: 'Conducción' },
      { id: 'azul', hex: '#3b82f6', consigna: 'Pase' },
      { id: 'rojo', hex: '#ef4444', consigna: 'Cambio de dirección' },
      { id: 'amarillo', hex: '#eab308', consigna: 'Remate' },
      { id: 'blanco', hex: '#e5e7eb', consigna: 'Volver al centro' },
      { id: 'morado', hex: '#a855f7', consigna: 'Acción personalizada' }
    ],
    objetivo: ['verde'], secuencia: [], series: 1, descanso: 0, notas: ''
  };
  for (let i = 0; i < 6; i++) p.pods.push({ id: 'p' + (i + 1), n: i + 1, x: 0.2 + i * 0.12, y: 0.5, etiqueta: '', base: false });
  if (extra) for (const k in extra) p[k] = extra[k];
  return p;
}
function conLogica(cambios, base) {
  const p = base || planDemo();
  for (const k in cambios) p.logica[k] = cambios[k];
  return p;
}

/* ================= 1. el ejemplo de aceptación ================= */
const demo = planDemo();
const est = m.blzEstimulos(demo, 1);
igual('aceptación · 6 Pods, 30 s e intervalo 3 dan DIEZ estímulos', est.length, 10);
di(est.every(e => e.pods.length === 1), 'aceptación · un solo Pod encendido a la vez');
di(est.every((e, i) => e.t === i * 3), 'aceptación · los estímulos caen cada 3 s exactos');
di(est.every(e => e.dur === 3), 'aceptación · la luz dura los 3 s del intervalo');
igual('aceptación · la serie dura los 30 s pedidos', m.blzSerieDur(demo, est), 30);

/* ================= 2. nunca un Pod que no existe ================= */
const nums = demo.pods.map(p => p.n);
di(est.every(e => e.pods.every(n => nums.indexOf(n) >= 0)), 'nunca se enciende un Pod fuera de la lista');
['random', 'focus', 'base', 'todos'].forEach(modo => {
  const p = conLogica({ modo: modo, duracion: 40, intervalo: 2 }, planDemo());
  if (modo === 'base') p.pods[0].base = true;
  const l = m.blzEstimulos(p, 1);
  di(l.length > 0 && l.every(e => e.pods.length > 0 && e.pods.every(n => nums.indexOf(n) >= 0)),
     'modo ' + modo + ' · todos los Pods encendidos existen');
  di(l.every(e => e.colores.length === e.pods.length), 'modo ' + modo + ' · un color por Pod encendido');
});
/* Un paso de la secuencia que nombra un Pod borrado NO lo enciende. */
const huerf = conLogica({ modo: 'secuencia' }, planDemo());
huerf.secuencia = [
  { id: 's1', pods: [1], color: 'verde', dur: 3, condicion: 'toque', consigna: 'Uno' },
  { id: 's2', pods: [9], color: 'azul', dur: 3, condicion: 'toque', consigna: 'Fantasma' },
  { id: 's3', pods: [4], color: 'rojo', dur: 3, condicion: 'toque', consigna: 'Tres' }
];
const lh = m.blzEstimulos(huerf, 1);
igual('secuencia · el paso que apunta a un Pod inexistente se salta', lh.length, 2);
di(lh.every(e => e.pods.every(n => nums.indexOf(n) >= 0)), 'secuencia · no se cuela el Pod 9');
igual('huérfanos · se detecta y se nombra el paso', m.blzHuerfanos(huerf).length, 1);
igual('huérfanos · dice qué Pod falta', m.blzHuerfanos(huerf)[0].pods[0], 9);
igual('huérfanos · un plan sano no tiene ninguno', m.blzHuerfanos(demo).length, 0);

/* ================= 3. sin repetir el mismo Pod seguido ================= */
let repes = 0;
for (let i = 1; i < est.length; i++) if (est[i].pods[0] === est[i - 1].pods[0]) repes++;
igual('sinRepetir · ningún Pod se repite dos veces seguidas', repes, 0);
let repesVarias = 0;
['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].forEach(s => {
  const l = m.blzEstimulos(conLogica({ semilla: s, duracion: 90 }, planDemo()), 1);
  for (let i = 1; i < l.length; i++) if (l[i].pods[0] === l[i - 1].pods[0]) repesVarias++;
});
igual('sinRepetir · tampoco en 8 semillas distintas y 240 estímulos', repesVarias, 0);
/* Y apagado, se permite: si no, la comprobación de arriba no probaría nada. */
let conRepe = 0;
['a', 'b', 'c', 'd', 'e', 'f'].forEach(s => {
  const l = m.blzEstimulos(conLogica({ semilla: s, duracion: 120, sinRepetir: false }, planDemo()), 1);
  for (let i = 1; i < l.length; i++) if (l[i].pods[0] === l[i - 1].pods[0]) conRepe++;
});
di(conRepe > 0, 'sinRepetir · con la casilla apagada SÍ aparecen repeticiones (' + conRepe + ')');

/* ================= 4. la semilla manda ================= */
const a1 = JSON.stringify(m.blzEstimulos(planDemo(), 1));
const a2 = JSON.stringify(m.blzEstimulos(planDemo(), 1));
di(a1 === a2, 'semilla · la misma semilla da exactamente la misma serie');
const otra = JSON.stringify(m.blzEstimulos(conLogica({ semilla: 'otra-cosa' }, planDemo()), 1));
di(a1 !== otra, 'semilla · una semilla distinta da otra serie');
const distintas = {};
['s1', 's2', 's3', 's4', 's5', 's6'].forEach(s => { distintas[JSON.stringify(m.blzEstimulos(conLogica({ semilla: s }, planDemo()), 1))] = 1; });
di(Object.keys(distintas).length >= 5, 'semilla · seis semillas dan al menos cinco series distintas');
di(JSON.stringify(m.blzEstimulos(planDemo(), 1)) !== JSON.stringify(m.blzEstimulos(planDemo(), 2)),
   'semilla · la serie 2 no es un calco de la serie 1');
di(JSON.stringify(m.blzGenerar(planDemo())) === JSON.stringify(m.blzGenerar(planDemo())),
   'semilla · la línea temporal completa también se repite igual');
igual('semilla · el generador es determinista', m.blzRnd('x')(), m.blzRnd('x')());
di(m.blzRnd('x')() !== m.blzRnd('y')(), 'semilla · dos semillas no arrancan en el mismo número');

/* ================= 5. las modalidades ================= */
/* Secuencia: el orden es el que se escribió. */
const sec = conLogica({ modo: 'secuencia' }, planDemo());
sec.secuencia = [
  { id: 's1', pods: [3], color: 'verde', dur: 3, condicion: 'toque', consigna: 'Inicio' },
  { id: 's2', pods: [1], color: 'rojo', dur: 2, condicion: 'toque', consigna: 'Cambio' },
  { id: 's3', pods: [5], color: 'azul', dur: 4, condicion: 'toque', consigna: 'Pase' },
  { id: 's4', pods: [2], color: 'amarillo', dur: 1, condicion: 'toque', consigna: 'Remate' }
];
const ls = m.blzEstimulos(sec, 1);
igual('secuencia · conserva el orden', ls.map(e => e.pods[0]).join('-'), '3-1-5-2');
igual('secuencia · conserva los colores', ls.map(e => e.colores[0]).join('-'), 'verde-rojo-azul-amarillo');
igual('secuencia · cada paso dura lo suyo', ls.map(e => e.dur).join('-'), '3-2-4-1');
igual('secuencia · los inicios se encadenan', ls.map(e => e.t).join('-'), '0-3-5-9');
igual('secuencia · la serie dura la suma de los pasos', m.blzSerieDur(sec, ls), 10);
igual('secuencia · la misma serie en la serie 2', JSON.stringify(m.blzEstimulos(sec, 2)), JSON.stringify(ls));
igual('secuencia · conserva la instrucción del paso', ls[3].consigna, 'Remate');

/* Base y periferia: alterna base, fuera, base, fuera. */
const base = conLogica({ modo: 'base', duracion: 40, intervalo: 2 }, planDemo());
base.pods[0].base = true;
const lb = m.blzEstimulos(base, 1);
igual('home base · el Pod base está marcado', m.blzPodBase(m.blzNormalizar(base)), 1);
di(lb.filter((e, i) => i % 2 === 0).every(e => e.pods.length === 1 && e.pods[0] === 1), 'home base · los pares son la base');
di(lb.filter((e, i) => i % 2 === 1).every(e => e.pods.length === 1 && e.pods[0] !== 1), 'home base · los impares son periferia');
di(lb.length >= 10, 'home base · salen los estímulos de toda la serie (' + lb.length + ')');
/* Sin base marcada cae en el primero, no revienta. */
const sinBase = conLogica({ modo: 'base', duracion: 12, intervalo: 2 }, planDemo());
di(m.blzEstimulos(sinBase, 1).filter((e, i) => i % 2 === 0).every(e => e.pods[0] === 1), 'home base · sin base marcada usa el Pod 1');

/* Foco: objetivo y distractores, bien etiquetados. */
const foco = conLogica({ modo: 'focus', duracion: 120, intervalo: 2 }, planDemo());
foco.objetivo = ['verde', 'azul'];
const lf = m.blzEstimulos(foco, 1);
di(lf.some(e => e.objetivo === true), 'foco · aparecen estímulos objetivo');
di(lf.some(e => e.objetivo === false), 'foco · aparecen distractores');
di(lf.every(e => e.objetivo === (['verde', 'azul'].indexOf(e.colores[0]) >= 0)), 'foco · la marca de objetivo coincide con el color');
di(m.blzEstimulos(planDemo(), 1).every(e => e.objetivo === true), 'foco · fuera de «foco» todo estímulo es respondible');
const focoVacio = conLogica({ modo: 'focus', duracion: 10, intervalo: 2 }, planDemo());
focoVacio.objetivo = [];
di(m.blzNormalizar(focoVacio).objetivo.length === 1, 'foco · sin objetivo elegido se pone el primer color, no se queda sin ninguno');

/* Todos a la vez. */
const todos = conLogica({ modo: 'todos', duracion: 12, intervalo: 3, simultaneos: 0 }, planDemo());
const lt = m.blzEstimulos(todos, 1);
di(lt.every(e => e.pods.length === 6), 'todos a la vez · con 0 se encienden los seis');
const tres = conLogica({ modo: 'todos', duracion: 12, intervalo: 3, simultaneos: 3 }, planDemo());
di(m.blzEstimulos(tres, 1).every(e => e.pods.length === 3), 'todos a la vez · con 3 se encienden tres');
di(m.blzEstimulos(tres, 1).every(e => new Set(e.pods).size === e.pods.length), 'todos a la vez · sin Pods repetidos dentro del mismo estímulo');
const dosALaVez = conLogica({ modo: 'random', duracion: 12, intervalo: 3, simultaneos: 2 }, planDemo());
di(m.blzEstimulos(dosALaVez, 1).every(e => e.pods.length === 2), 'aleatorio · «2 a la vez» enciende dos');

/* ================= 6. la línea temporal y la simulación ================= */
const conSeries = planDemo();
conSeries.series = 3; conSeries.descanso = 20; conSeries.logica.preparacion = 5;
const ev = m.blzGenerar(conSeries);
igual('línea · tres series traen tres preparaciones', ev.filter(e => e.tipo === 'preparacion').length, 3);
igual('línea · y dos descansos, no tres', ev.filter(e => e.tipo === 'descanso').length, 2);
igual('línea · treinta estímulos en total', ev.filter(e => e.tipo === 'estimulo').length, 30);
igual('línea · termina en «fin»', ev[ev.length - 1].tipo, 'fin');
igual('línea · duración = 3×(5+30) + 2×20', m.blzDuracion(conSeries), 145);
di(ev.every((e, i) => i === 0 || e.t >= ev[i - 1].t), 'línea · los sucesos van en orden de tiempo');
igual('simulación · en el segundo 0 manda el primer suceso', m.blzSimEnT(ev, 0), 0);
igual('simulación · pasado el final no hay suceso vivo', m.blzSimEnT(ev, 10000), -1);
igual('simulación · el total es el tiempo del «fin»', m.blzSimTotal(ev), 145);
/* Pausar y reanudar: la misma línea de índices, con o sin parón. */
const seguido = [], conPausa = [];
for (let t = 0; t <= 145; t += 0.5) seguido.push(m.blzSimEnT(ev, t));
for (let t = 0; t <= 60; t += 0.5) conPausa.push(m.blzSimEnT(ev, t));
for (let t = 60.5; t <= 145; t += 0.5) conPausa.push(m.blzSimEnT(ev, t));
igual('pausa · reanudar no duplica ni salta sucesos', conPausa.join(','), seguido.join(','));
igual('reiniciar · vuelve al primer suceso', m.blzSimEnT(ev, 0), 0);
di(m.blzSimEnT(m.blzGenerar(planDemo()), 0) === 0, 'reiniciar · también sin preparación');

/* ================= 7. normalizar, validar, no romper lo viejo ================= */
igual('viejo · un circuito sin blazePlan no tiene plan', m.blzPlanDe({ id: 'c1', estaciones: [] }), null);
igual('viejo · y no cuenta como activo', m.blzActivo({ id: 'c1', estaciones: [] }), false);
igual('viejo · un plan apagado tampoco', m.blzActivo({ blazePlan: { activo: false, pods: [{ n: 1 }] } }), false);
igual('viejo · un plan activo pero sin Pods tampoco', m.blzActivo({ blazePlan: { activo: true, pods: [] } }), false);
igual('viejo · un plan activo con Pods sí', m.blzActivo({ blazePlan: { activo: true, pods: [{ n: 1, x: 0.5, y: 0.5 }] } }), true);
di(m.blzNormalizar(undefined).pods.length === 0, 'normalizar · sin plan devuelve uno vacío y no revienta');
di(m.blzNormalizar(null).logica.modo === 'random', 'normalizar · null también');
di(m.blzNormalizar({ pods: 'no soy un array' }).pods.length === 0, 'normalizar · una colección corrupta no se recorre letra a letra');
di(m.blzNormalizar({ logica: { modo: 'inventado' } }).logica.modo === 'random', 'normalizar · una modalidad que no existe cae en aleatorio');
di(m.blzNormalizar({ logica: { simultaneos: 99 } }).logica.simultaneos <= m.BLZ_MAX_PODS, 'normalizar · «a la vez» no pasa del máximo de Pods');
di(m.blzNormalizar({ logica: { duracion: -5 } }).logica.duracion >= 1, 'normalizar · una duración negativa se sube a 1');
di(m.blzNormalizar({ logica: { intervalo: 0 } }).logica.intervalo > 0, 'normalizar · un intervalo de cero no puede dividir');
const muchos = { pods: [] };
for (let i = 0; i < 30; i++) muchos.pods.push({ n: i + 1, x: 0.5, y: 0.5 });
igual('normalizar · el máximo son ' + m.BLZ_MAX_PODS + ' Pods', m.blzNormalizar(muchos).pods.length, m.BLZ_MAX_PODS);
di(m.blzNormalizar({ pods: [{ x: 9, y: -4 }] }).pods.every(p => p.x <= 1 && p.x >= 0 && p.y <= 1 && p.y >= 0),
   'normalizar · las posiciones se guardan entre 0 y 1');
igual('normalizar · renumera los Pods de 1 en adelante', m.blzNormalizar({ pods: [{ n: 7 }, { n: 3 }] }).pods.map(p => p.n).join('-'), '1-2');
igual('normalizar · solo puede haber una base', m.blzNormalizar({ pods: [{ base: true }, { base: true }, { base: true }] }).pods.filter(p => p.base).length, 1);
/* Un campo que esta versión no conoce NO se tira: migrar no puede ser destructivo. */
di(m.blzNormalizar({ inventadoPorElFuturo: 42 }).inventadoPorElFuturo === 42, 'normalizar · no borra un campo desconocido');
di(m.blzTexto('hola', 2) === 'ho', 'texto · se recorta a lo que cabe');
di(m.blzTexto(String.fromCharCode(7) + 'x').indexOf(String.fromCharCode(7)) < 0, 'texto · fuera los caracteres de control');
di(m.blzNormalizar({ notas: 'x'.repeat(900) }).notas.length <= 400, 'normalizar · las notas tienen tope');
di(m.blzNormalizar({ pods: [{ etiqueta: 'y'.repeat(200) }] }).pods[0].etiqueta.length <= 24, 'normalizar · las etiquetas también');
/* Nada de temporizadores ni estado de reproducción guardado en el plan. */
const nplan = m.blzNormalizar(planDemo());
di(!('timer' in nplan) && !('t' in nplan) && !('corriendo' in nplan), 'plan · no guarda estado de reproducción');
di(JSON.stringify(nplan) === JSON.stringify(m.blzNormalizar(nplan)), 'plan · normalizar dos veces da lo mismo (idempotente)');

/* ================= 8. montaje y distancias ================= */
const mont = m.blzMontaje(demo);
di(mont.length > 8, 'montaje · sale la lista completa');
const claves = mont.map(x => x.k);
['Pods', 'Distancias', 'Pod base', 'Colocación', 'Colores', 'Modalidad', 'Ritmo', 'Series', 'Duración total', 'Material', 'Seguridad', 'Aviso'].forEach(k => {
  di(claves.indexOf(k) >= 0, 'montaje · incluye «' + k + '»');
});
di(m.blzMontajeTexto(demo).indexOf(m.BLZ_AVISO) >= 0, 'montaje · el texto copiado lleva el aviso de que esto no controla los Pods');
const d = m.blzDistancias(demo);
di(d.min > 0 && d.max >= d.min && d.pares === 15, 'distancias · 6 Pods dan 15 pares, con mínimo y máximo');
igual('distancias · con un solo Pod no hay pares', m.blzDistancias({ pods: [{ n: 1, x: 0.5, y: 0.5 }] }).pares, 0);
di(m.blzSeg(90) === '1 min 30 s', 'tiempos · 90 s se leen como 1 min 30 s');
di(m.blzSeg(45) === '45 s', 'tiempos · 45 s se quedan en segundos');
/* El montaje no promete resultados médicos. */
const textoMontaje = m.blzMontajeTexto(demo).toLowerCase();
di(!/\b(diagn[oó]stic|patolog|lesi[oó]n|tratamiento|terapia|rehabilitaci|d[eé]ficit)/.test(textoMontaje),
   'montaje · sin vocabulario clínico ni promesas médicas');

/* ================= 9. lo que solo se ve en el archivo ================= */
/* Temporizadores: uno solo, y se apaga al salir. */
dentro('blzSimParar', 'clearInterval(_blzSim.timer)', 'temporizador · blzSimParar hace clearInterval de verdad');
dentro('blzSimParar', 'removeEventListener("visibilitychange"', 'temporizador · y se quita el oyente de la pestaña');
dentro('blzSimParar', '_blzSim = null', 'temporizador · y suelta el estado de la simulación');
dentro('renderCircuitos', 'blzSimParar()', 'temporizador · repintar la vista de circuitos lo apaga');
const volver = tramo('window.circVolver = function(){', '\n};\n', 'circVolver');
di(volver.indexOf('blzSimParar();') >= 0, 'temporizador · salir del editor lo apaga');
di(volver.indexOf('_blzSel = 0;') >= 0, 'temporizador · y suelta el Pod seleccionado');
dentro('blzSimVisible', 'document.hidden', 'temporizador · esconder la pestaña pausa la simulación');
const modulo = tramo('var BLZ_VERSION = 1;', '\n/* --- Plantillas --- */', 'el módulo BlazePod entero');
igual('temporizador · un único setInterval en todo el módulo', modulo.split('setInterval(').length - 1, 1);
di(modulo.indexOf('setTimeout(') < 0, 'temporizador · ningún setTimeout suelto');
di(modulo.indexOf('requestAnimationFrame') < 0, 'temporizador · no se pide un frame que nadie cancela');

/* Escapado: todo lo que escribe Diego pasa por escapeHtml. */
dentro('blzMontajeHtml', "'<dt>' + escapeHtml(x.k) + '</dt><dd>' + escapeHtml(x.v) + '</dd>'", 'escapado · el montaje escapa clave y valor');
dentro('blzVistaHtml', "html += '<dt>' + escapeHtml(x.k) + '</dt><dd>' + escapeHtml(x.v) + '</dd>'", 'escapado · la vista compartida también');
dentro('blzLienzoHtml', 'escapeHtml(pod.etiqueta)', 'escapado · la etiqueta del Pod');
dentro('blzLienzoHtml', 'escapeHtml(a.etiqueta)', 'escapado · la etiqueta de un elemento del lienzo');
dentro('blzSelHtml', 'escapeAttr(pod.etiqueta)', 'escapado · la etiqueta en el campo de edición');
dentro('blzPaso2Html', 'escapeAttr(paso.consigna)', 'escapado · la instrucción de cada paso');
dentro('blzHudHtml', "escapeHtml(e.consigna || \"\")", 'escapado · la consigna que se ve durante la simulación');
di(fn('blzImprimirHtml').indexOf('escapeHtml(pod.etiqueta.slice(0, 18))') >= 0, 'escapado · la hoja impresa');
di(fn('blzImprimirHtml').indexOf('escapeHtml(x.v)') >= 0, 'escapado · la tabla de la hoja impresa');
di(fn('blzEditorHtml').indexOf('innerHTML') < 0, 'escapado · el editor no escribe HTML del usuario a pelo');

/* La vista de quien recibe el enlace no edita nada. */
dentro('blzVistaHtml', 'lectura: true', 'compartido · el lienzo va en modo lectura');
di(fn('blzVistaHtml').indexOf('onclick') < 0 && fn('blzVistaHtml').indexOf('oninput') < 0, 'compartido · sin controles que editen');
dentro('blzLienzoHtml', 'opts.lectura ? \' tabindex="-1" disabled\' : \'\'', 'compartido · en lectura los Pods no se pueden tocar');
di(fn('showCircuitoView').indexOf('blzVistaHtml(c.blazePlan)') >= 0, 'compartido · la vista del enlace pinta el esquema');
di(fn('showCircuitoView').indexOf('blzSimPlay') < 0, 'compartido · abrir el enlace NO arranca la simulación sola');
di(fn('circShareData').indexOf('if (blzActivo(c)) d.circuito.blazePlan = blzNormalizar(c.blazePlan);') >= 0,
   'compartido · el enlace lleva la planificación');

/* Respaldo, importación y sincronización mueven el circuito ENTERO. */
igual('respaldo · exportar y subir copian state.circuitos completo', src.split('circuitos: state.circuitos || [],').length - 1, 2);
igual('respaldo · importar y bajar lo devuelven completo', src.split('if (Array.isArray(data.circuitos)) state.circuitos = data.circuitos;').length - 1, 2);
di(src.indexOf('state.circuitos = Array.isArray(parsed.circuitos) ? parsed.circuitos : [];') >= 0, 'respaldo · cargar del disco, igual');
/* Y el viaje de ida y vuelta conserva el plan tal cual. */
const circuito = { id: 'c9', nombre: 'Prueba', estaciones: [], blazePlan: m.blzNormalizar(planDemo()) };
const ida = JSON.parse(JSON.stringify({ circuitos: [circuito] }));
di(!!ida.circuitos[0].blazePlan, 'respaldo · el plan sobrevive al viaje de ida y vuelta');
igual('respaldo · y llega idéntico', JSON.stringify(ida.circuitos[0].blazePlan), JSON.stringify(circuito.blazePlan));
igual('respaldo · con todos sus Pods', ida.circuitos[0].blazePlan.pods.length, 6);

/* Movimiento reducido. */
di(src.indexOf('.blz-pod.pulso{animation:none') >= 0, 'movimiento · con «reducir movimiento» el Pod no late');
dentro('blzSimPintar', 'sinAnim = blzReducirMovimiento()', 'movimiento · el pintado consulta la preferencia del sistema');
dentro('blzSimPintar', 'blzColorPorId(S.plan, e.colores[k])', 'simulación · el color sale de la paleta del plan');
dentro('blzSimPintar', 'enc[e.pods[k]] = c ? c.hex', 'simulación · y el Pod se enciende con ESE color, no con uno fijo');
dentro('blzSimPintar', 'el.classList.toggle("on", !!hex)', 'simulación · el Pod apagado se queda apagado');
dentro('blzReducirMovimiento', 'prefers-reduced-motion: reduce', 'movimiento · se lee la media query del sistema');
di(src.indexOf('onclick="blzSimPaso(-1)"') >= 0 && src.indexOf('onclick="blzSimPaso(1)"') >= 0, 'movimiento · siempre hay avance por pasos, sin animación');

/* Móvil y accesibilidad. */
di(src.indexOf('.blz-lienzo{position:relative') >= 0 && src.indexOf('touch-action:none') >= 0, 'móvil · el lienzo no arrastra la página al mover un Pod');
di(src.indexOf('.blz-pod{position:absolute;width:44px;height:44px') >= 0, 'móvil · los Pods miden 44 px, que es lo mínimo cómodo con el dedo');
dentro('blzSelHtml', 'aria-label="Mover a la izquierda"', 'accesibilidad · hay botones de dirección además del arrastre');
dentro('blzLienzoHtml', 'aria-label="Pod ', 'accesibilidad · cada Pod se anuncia con su número');
di(src.indexOf('@media (max-width:640px){\n  .blz-pod{width:40px') >= 0, 'móvil · hay reglas propias para pantalla estrecha');
di(fn('blzEditorHtml').indexOf('<details class="blz-sec"') >= 0, 'móvil · el editor va por secciones plegables');

/* Seguridad y encaje con la casa. */
di(modulo.indexOf('eval(') < 0 && modulo.indexOf('new Function') < 0, 'seguridad · ni eval ni Function: la CSP no se toca');
di(modulo.indexOf('http://') < 0 && modulo.indexOf('https://') < 0, 'seguridad · ningún recurso remoto: los símbolos son HTML y CSS propios');
di(modulo.indexOf('innerHTML = blzMontajeTexto') < 0, 'seguridad · el texto plano del montaje no se inyecta como HTML');
igual('encaje · el aviso de que esto no controla los Pods está escrito una sola vez', src.split('var BLZ_AVISO = ').length - 1, 1);
di(src.indexOf('Configura esta actividad manualmente en la aplicación oficial de BlazePod') >= 0,
   'encaje · la app dice que la actividad se configura a mano en la app oficial');
di(modulo.indexOf('Bluetooth') < 0 && modulo.indexOf('bluetooth') < 0, 'encaje · no se menciona ninguna conexión que no existe');
di(fn('blzEditorHtml').indexOf('blz-aviso') >= 0, 'encaje · el aviso se ve en el editor, activado o no');

/* La colisión que costó la tarde del 18-sep: en un <script> clásico
   `function blzPodBase(plan)` y `window.blzPodBase = function(n, on)` son LA
   MISMA propiedad de window. La acción de la interfaz pisaba al motor,
   blzMontaje llamaba a la acción, la acción repintaba, el repintado llamaba a
   blzMontaje — pila llena. No lo ve validar_bloques (solo cuenta `function X(`)
   ni una suite que evalúe el motor aislado: hace falta mirar los dos a la vez. */
const declaradas = {};
let md;
const reDecl = /\nfunction (blz[A-Za-z0-9_]*)\(/g;
while ((md = reDecl.exec(modulo)) !== null) declaradas[md[1]] = (declaradas[md[1]] || 0) + 1;
const colisiones = [];
let mw;
const reWin = /\nwindow\.(blz[A-Za-z0-9_]*) = function/g;
while ((mw = reWin.exec(modulo)) !== null) if (declaradas[mw[1]]) colisiones.push(mw[1]);
di(Object.keys(declaradas).length > 30, 'colisiones · se encontraron las funciones del módulo (' + Object.keys(declaradas).length + ')');
di(colisiones.length === 0, 'colisiones · ninguna acción de window pisa una función del motor (' + colisiones.join(', ') + ')');
di(Object.keys(declaradas).every(n => declaradas[n] === 1), 'colisiones · ninguna función del módulo está declarada dos veces');
di(modulo.indexOf('window.blzPodMarcarBase = function') >= 0, 'colisiones · la acción de marcar base lleva nombre propio');
di(modulo.indexOf('window.blzPodBase = function') < 0, 'colisiones · y ya no pisa al motor');

/* Que el circuito de toda la vida no haya cambiado. */
di(fn('circGrupoEn').indexOf('blz') < 0, 'circuito · el reparto de grupos no sabe nada de BlazePod');
di(fn('circPlan').indexOf('blz') < 0, 'circuito · el plan del cronómetro tampoco');
di(fn('circDuracion').indexOf('blz') < 0, 'circuito · ni la duración');
di(fn('circTrabajoDe').indexOf('blz') < 0, 'circuito · ni el tiempo por estación');
di(fn('circNuevo').indexOf('blazePlan') < 0, 'circuito · un circuito nuevo nace sin plan BlazePod, como antes');

/* ================= 10. la v2: la forma de la app oficial ================= */
/* Diez capturas del teléfono de Diego, 18-sep-2026. Su app es un asistente de
   tres pasos y el color se toca encima del Pod. Esto vigila que lo que se
   añadió para parecerse a ella siga funcionando. */

/* --- retardo de luz («Light Delay Time») --- */
const sinRet = m.blzEstimulos(planDemo(), 1);
igual('retardo · sin retardo salen los diez de siempre', sinRet.length, 10);
const retFijo = conLogica({}, planDemo());
retFijo.logica.retardo = { tipo: 'fijo', seg: 2, min: 0, max: 0 };
const lFijo = m.blzEstimulos(retFijo, 1);
di(lFijo.length < sinRet.length, 'retardo fijo · caben menos estímulos en la misma serie (' + lFijo.length + ' < ' + sinRet.length + ')');
di(lFijo.every((e, i) => i === 0 || Math.abs((e.t - lFijo[i - 1].t) - 5) < 1e-6), 'retardo fijo · 3 s de intervalo + 2 s de hueco = 5 s entre luces');
const retAzar = conLogica({}, planDemo());
retAzar.logica.retardo = { tipo: 'aleatorio', seg: 0, min: 0.5, max: 3 };
const lAzar1 = m.blzEstimulos(retAzar, 1), lAzar2 = m.blzEstimulos(retAzar, 1);
igual('retardo aleatorio · la misma semilla repite los mismos huecos', JSON.stringify(lAzar1), JSON.stringify(lAzar2));
const huecos = lAzar1.slice(1).map((e, i) => +(e.t - lAzar1[i].t).toFixed(6));
di(new Set(huecos).size > 1, 'retardo aleatorio · los huecos NO son todos iguales');
di(huecos.every(h => h >= 3.5 - 1e-6 && h <= 6 + 1e-6), 'retardo aleatorio · cada hueco cae entre el mínimo y el máximo');
/* Y en ningún caso se sale de la serie: eso era lo que hacía la cuenta previa. */
[sinRet, lFijo, lAzar1].forEach((l, k) => {
  di(l.every(e => e.t < 30), 'retardo · ningún estímulo empieza fuera de la serie (caso ' + (k + 1) + ')');
});

/* --- base y periferia: el color lo manda el rol, no el azar --- */
const hb = conLogica({ modo: 'base', duracion: 40, intervalo: 2 }, planDemo());
hb.pods[0].base = true;
hb.homebase = { base: 'blanco', esquinas: 'rojo' };
const lHb = m.blzEstimulos(hb, 1);
di(lHb.filter((e, i) => i % 2 === 0).every(e => e.colores[0] === 'blanco'), 'home base · la base se enciende SIEMPRE de su color');
di(lHb.filter((e, i) => i % 2 === 1).every(e => e.colores[0] === 'rojo'), 'home base · las esquinas, del suyo');
di(lHb.every(e => e.colores.length === e.pods.length), 'home base · un color por Pod encendido');

/* --- los campos nuevos, y que un plan de la v1 siga abriendo --- */
const v1 = m.blzNormalizar(planDemo());
igual('v2 · un plan sin montaje recibe una estación', v1.montaje.estaciones, 1);
igual('v2 · y los Pods por estación son los que hay', v1.montaje.podsPorEstacion, 6);
igual('v2 · sin retardo declarado, ninguno', v1.logica.retardo.tipo, 'ninguno');
igual('v2 · la actividad termina por tiempo mientras no se diga otra cosa', v1.fin.por, 'tiempo');
igual('v2 · strikeout apagado de fábrica', v1.strikeout, false);
di(!!m.blzColorPorId(v1, v1.homebase.base) && !!m.blzColorPorId(v1, v1.homebase.esquinas),
   'v2 · los colores de home base salen de la paleta, no inventados');
di(v1.homebase.base !== v1.homebase.esquinas, 'v2 · y la base no es del mismo color que las esquinas');
igual('v2 · un plan de la v1 produce EXACTAMENTE la misma serie que antes',
      JSON.stringify(m.blzEstimulos(planDemo(), 1).map(e => e.pods[0] + ':' + e.colores[0])),
      JSON.stringify(sinRet.map(e => e.pods[0] + ':' + e.colores[0])));
const raro = m.blzNormalizar({ montaje: 'no soy objeto', fin: 7, homebase: null, logica: { retardo: 'tampoco' } });
di(raro.montaje.estaciones === 1 && raro.fin.por === 'tiempo' && raro.logica.retardo.tipo === 'ninguno',
   'v2 · campos corruptos no tumban nada, caen en su valor por defecto');
di(m.blzNormalizar({ logica: { retardo: { tipo: 'aleatorio', min: 5, max: 1 } } }).logica.retardo.max >= 5,
   'v2 · un máximo menor que el mínimo se corrige, no se queda al revés');

/* --- las tres pantallas existen y hacen lo que dicen --- */
['blzPaso1Html', 'blzPaso2Html', 'blzPaso3Html'].forEach(f => {
  di(src.indexOf('function ' + f + '(') >= 0, 'pantallas · existe ' + f);
});
dentro('blzEditorHtml', 'blzPaso1Html(c, p) + blzPaso2Html(p) + blzPaso3Html(p)', 'pantallas · el editor pinta los tres pasos en orden');
dentro('blzPaso1Html', 'montaje.podsPorEstacion', 'paso 1 · el contador de Pods es el de la app');
dentro('blzPaso1Html', 'montaje.estaciones', 'paso 1 · y el de estaciones');
dentro('blzPaso2Html', 'blzCirculoHtml(destino, paso.color', 'paso 2 · cada paso lleva su círculo de color al lado');
dentro('blzPaso2Html', "blzCirculoHtml('foco:objetivo'", 'paso 2 · en foco, el círculo del color objetivo');
dentro('blzPaso2Html', "blzCirculoHtml('base:base'", 'paso 2 · en home base, el círculo de la base');
dentro('blzPaso2Html', 'logica.retardo.tipo', 'paso 2 · el retardo de luz se elige aquí');
dentro('blzPaso3Html', 'fin.por', 'paso 3 · la duración tiene sus tres formas');
dentro('blzPaso3Html', "'Ciclos', 'veces que se repite entera', 'series'", 'paso 3 · los ciclos se llaman ciclos, como en la app');
di(fn('blzPaso3Html').indexOf('strikeout') >= 0, 'paso 3 · el strikeout de foco está');

/* --- tocar el color: es lo que pidió Diego --- */
dentro('blzCirculoHtml', "onclick=\"blzPaleta(", 'color · tocar el círculo abre la paleta');
dentro('blzPaletaHtml', "onclick=\"blzColorPoner(", 'color · y elegir uno lo aplica');
dentro('blzPaletaHtml', 'if (_blzPaleta !== destino) return', 'color · la paleta solo sale bajo el círculo que tocaste');
di(src.indexOf('window.blzColorPoner = function(destino, colorId)') >= 0, 'color · la acción existe');
di(src.indexOf('if (!blzColorPorId(p, ref.id)) p.colores.push(') >= 0,
   'color · un color elegido entra en la paleta, para que el motor lo encuentre');
dentro('blzSegHtml', 'onclick="blzElegir(', 'controles · los segmentados escriben con blzElegir');
di(src.indexOf('window.blzElegir = function(campo, valor)') >= 0, 'controles · y esa acción existe');
di(src.indexOf('window.blzSeg = function') < 0, 'controles · blzSeg sigue siendo SOLO el formateador de segundos');
igual('controles · los ocho colores están en la paleta', m.BLZ_COLORES.length, 8);

/* --- escapado y accesibilidad de lo nuevo --- */
dentro('blzPaso2Html', 'escapeHtml(pod.etiqueta)', 'escapado · la etiqueta del Pod en el selector del paso');
dentro('blzContadorHtml', 'escapeHtml(titulo)', 'escapado · el título de cada contador');
dentro('blzSegHtml', 'escapeHtml(o.nombre)', 'escapado · el texto de cada botón del segmentado');
dentro('blzCirculoHtml', 'aria-label=', 'accesibilidad · el círculo de color se anuncia');
dentro('blzContadorHtml', 'aria-label="Quitar uno"', 'accesibilidad · los ± tienen nombre');
dentro('blzSegHtml', 'aria-pressed=', 'accesibilidad · el segmentado dice cuál está elegido');
di(src.indexOf('.blz-cnt-b{width:40px;height:40px') >= 0, 'móvil · los ± miden 40 px');
di(src.indexOf('.blz-circ{width:38px;height:38px') >= 0, 'móvil · los círculos de color, 38 px');

/* --- resultado --- */
console.log('\nUS19-APP · planificador BlazePod');
console.log('archivo: ' + ruta);
if (fallos.length) {
  fallos.forEach(f => console.log('  ✗ ' + f));
  console.log('\n  comprobaciones OK: ' + ok + '  ·  FALLOS: ' + fallos.length + '\n');
  process.exit(1);
}
console.log('  comprobaciones OK: ' + ok + '  ·  sin fallos\n');
