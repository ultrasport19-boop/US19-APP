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

/* El motor entero, de la primera constante al marcador de fin. El editor que
   habia debajo se borro el 19-sep-2026 al unificar la planilla; lo que queda es
   puro y sin pantalla, y es lo que hace correr el subcronometro de Pods. */
/* Las acciones de la interfaz se declaran `window.X = function`, no
   `function X`: para leerlas hace falta su propio extractor. */
function win(nombre) { return tramo('window.' + nombre + ' = function', '\n};\n', nombre) + '\n};\n'; }

const motor = tramo('var BLZ_VERSION = 1;', '/* ===BLZ_MOTOR_FIN=== */', 'el motor BlazePod');
const codigo = [fn('u19Arr'), motor].join('\n');

let m;
try {
  m = new Function(codigo + '\nreturn { BLZ_COLORES: BLZ_COLORES, BLZ_MODOS: BLZ_MODOS, BLZ_MAX_PODS: BLZ_MAX_PODS, BLZ_AVISO: BLZ_AVISO,'
    + ' blzNum: blzNum, blzEnt: blzEnt, blzTexto: blzTexto, blzRnd: blzRnd, blzSemillaNum: blzSemillaNum, blzTomar: blzTomar,'
    + ' blzPlanNuevo: blzPlanNuevo, blzNormalizar: blzNormalizar,'
    + ' blzColorPorId: blzColorPorId, blzPodPorN: blzPodPorN, blzPodBase: blzPodBase,'
    + ' blzElegirPods: blzElegirPods, blzEstimulos: blzEstimulos,'
    + ' blzSerieDur: blzSerieDur, blzGenerar: blzGenerar, blzSimEnT: blzSimEnT, blzSimTotal: blzSimTotal,'
    + ' blzSeg: blzSeg, blzM: blzM };')();
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
/* El aviso de Pods huerfanos lo pintaba el editor, que ya no existe. Lo que
   importa de verdad -que un paso que apunta a un Pod inexistente no encienda
   nada- lo cubren las dos comprobaciones de aqui arriba. */

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
/* Lo medimos por el final de la linea de sucesos, que es de donde lee el
   subcronometro, y no por blzDuracion, que era del editor. */
igual('línea · duración = 3×(5+30) + 2×20', m.blzSimTotal(ev), 145);
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
/* El plan ya no cuelga del circuito: los Pods viven en c.pods y el vinculo lo
   lleva estacionId. Quien prueba esa parte es tools/planilla.js, incluida la
   migracion desde un blazePlan de los de antes. */
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

/* ================= 8. como se leen los tiempos y las medidas ================= */
/* La hoja de montaje y las distancias las armaba el editor, que ya no existe:
   ahora esa informacion sale del plano unificado y la prueba tools/planilla.js.
   Lo que sigue aqui son los dos formateadores, que usa la planilla. */
di(m.blzSeg(90) === '1 min 30 s', 'tiempos · 90 s se leen como 1 min 30 s');
di(m.blzSeg(45) === '45 s', 'tiempos · 45 s se quedan en segundos');
di(m.blzSeg(0) === '0 s', 'tiempos · cero segundos no se lee como vacío');
di(m.blzM(5) === '5 m', 'medidas · los metros llevan su unidad');
di(m.blzM(4.5) === '4,5 m', 'medidas · con coma decimal, como se escribe en español');
/* El aviso de que esto NO habla con los Pods sigue existiendo y sigue diciendo
   lo mismo: es lo que evita prometer lo que la app no hace. */
di(typeof m.BLZ_AVISO === 'string' && m.BLZ_AVISO.length > 20, 'aviso · sigue estando');
di(!/\b(diagn[oó]stic|patolog|lesi[oó]n|tratamiento|terapia|rehabilitaci|d[eé]ficit)/.test(m.BLZ_AVISO.toLowerCase()),
   'aviso · sin vocabulario clínico ni promesas médicas');

/* ================= 9. lo que solo se ve en el archivo =================
   El editor BlazePod de antes se borro el 19-sep-2026: los Pods viven ahora
   en la planilla unica y quien los enciende es el subcronometro de la vista
   en vivo. Las garantias son las mismas de siempre —un solo reloj y que se
   apague, escapar lo que escribe Diego, que el enlace compartido no edite ni
   arranque nada— pero se comprueban sobre el codigo que hoy las cumple. */

/* --- el subcronometro de Pods: se apaga, y lo apaga quien debe --- */
dentro('circPodsParar', '_circPods = null', 'subcronometro · pararlo suelta el estado');
dentro('circPodsParar', 'circLivePodsApagar()', 'subcronometro · y deja los Pods apagados en pantalla');
dentro('circPodsArrancar', 'circPodsParar();', 'subcronometro · arrancar apaga antes lo anterior: nunca dos a la vez');
dentro('circLiveAvanzar', 'circPodsParar();', 'subcronometro · al acabar el bloque los Pods se apagan');
di(win('circLiveSalir').indexOf('circPodsParar();') >= 0, 'subcronometro · y al salir de la vista en vivo, tambien');
/* El reloj es el del circuito, no uno propio: esa es la razon de que no haya
   un segundo setInterval que se pueda quedar vivo. */
dentro('circPodsT', 'p.dur - L.restante', 'subcronometro · el segundo lo lee del reloj global, no lleva el suyo');
const modPods = tramo('function circPodsPlan(', '/* ---------- en vivo ---------- */', 'el modulo de Pods en vivo');
igual('subcronometro · ningun setInterval propio', modPods.split('setInterval(').length - 1, 0);
di(modPods.indexOf('setTimeout(') < 0, 'subcronometro · ningun setTimeout suelto');
di(modPods.indexOf('requestAnimationFrame') < 0, 'subcronometro · no se pide un frame que nadie cancela');
/* Los sueltos no los manda el bloque: los enciende el usuario. */
dentro('circPodsGrupos', 'fase.tipo !== "trabajo"', 'subcronometro · fuera del bloque de trabajo no se enciende nada');
di(fn('circPodsGrupos').indexOf('circPodsSueltos') < 0, 'subcronometro · y los Pods sueltos nunca entran solos');

/* --- el Pod se enciende con SU color -------------------------------------
   `colores` va en paralelo a `pods` POR POSICION y guarda el id del color,
   no su hex. Leerlo por el numero del Pod, o meter el id en la variable CSS,
   deja el Pod encendido del color de reposo. Las dos cosas pasaron. */
const vivo = new Function('_circPods', '_live',
  codigo + '\n' + fn('circPodsT') + '\n' + fn('circPodsEstado')
  + '\nfunction circLiveFase(){ return _live.plan[_live.i]; }'
  + '\nreturn circPodsEstado();');
const planPods = m.blzNormalizar(conLogica({ modo: 'random', duracion: 30, intervalo: 3, semilla: 'pods' }, planDemo()));
const evPods = m.blzGenerar(planPods);
const idsPods = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
function encendidos(t) {
  return vivo({ dur: 30, runners: [{ estacionId: 'e1', ids: idsPods, cfg: {}, plan: planPods, eventos: evPods, toques: 0, ultimo: -2 }], sueltos: null },
              { c: null, plan: [{ tipo: 'trabajo', dur: 30 }], i: 0, restante: 30 - t });
}
const est0 = encendidos(0.5);
const ev0 = evPods[m.blzSimEnT(evPods, 0.5)];
di(Object.keys(est0.on).length === ev0.pods.length, 'en vivo · se encienden tantos Pods como dice el estimulo');
di(Object.keys(est0.on).every(k => /^#[0-9a-fA-F]{3,8}$/.test(est0.on[k])),
   'en vivo · cada Pod recibe un HEX, no el nombre del color (' + JSON.stringify(est0.on) + ')');
di(ev0.pods.every((n, k) => est0.on[idsPods[n - 1]] === m.blzColorPorId(planPods, ev0.colores[k]).hex),
   'en vivo · y es el color que le toca a ESE Pod, leido por posicion');
/* Dos Pods a la vez con colores distintos: es donde se ve el fallo del indice. */
const planDos = m.blzNormalizar(conLogica({ modo: 'random', duracion: 30, intervalo: 3, semilla: 'dos', simultaneos: 2, sinRepetir: false }, planDemo()));
const evDos = m.blzGenerar(planDos);
const dosOn = vivo({ dur: 30, runners: [{ estacionId: 'e1', ids: idsPods, cfg: {}, plan: planDos, eventos: evDos, toques: 0, ultimo: -2 }], sueltos: null },
                   { c: null, plan: [{ tipo: 'trabajo', dur: 30 }], i: 0, restante: 29.5 });
const evD = evDos[m.blzSimEnT(evDos, 0.5)];
di(evD.pods.length === 2, 'en vivo · con simultaneos 2 se encienden dos');
di(evD.pods.every((n, k) => dosOn.on[idsPods[n - 1]] === m.blzColorPorId(planDos, evD.colores[k]).hex),
   'en vivo · cada uno con el suyo, aunque sean distintos');
/* Fuera del bloque de trabajo no se enciende nada, pase lo que pase. */
const fuera = vivo({ dur: 30, runners: [{ estacionId: 'e1', ids: idsPods, cfg: {}, plan: planPods, eventos: evPods, toques: 0, ultimo: -2 }], sueltos: null },
                   { c: null, plan: [{ tipo: 'descanso', dur: 30 }], i: 0, restante: 15 });
igual('en vivo · en un descanso no hay ningun Pod encendido', Object.keys(fuera.on).length, 0);
/* Y sin corredores, tampoco: es lo que ve la pantalla antes de empezar. */
igual('en vivo · sin corredores no hay nada encendido', Object.keys(vivo(null, null).on).length, 0);
/* Y el corredor de verdad lo monta circPodsArrancar: si no le pasara el plan,
   no habria paleta que consultar y el Pod se encenderia sin color. */
dentro('circPodsArrancar', 'plan: q.plan', 'en vivo · el corredor de cada grupo lleva su plan');
di(win('circPodsSueltosToggle').indexOf('plan: q.plan') >= 0, 'en vivo · y el de los Pods sueltos, tambien');
/* Los sueltos son la excepcion a la regla de arriba a proposito: no los manda
   el bloque, los enciende el usuario, y llevan su propio reloj. */
const sueltosOn = vivo({ dur: 30, runners: [], sueltos: { estacionId: null, ids: idsPods, cfg: {}, plan: planPods, eventos: evPods, toques: 0, ultimo: -2, t0: Date.now() - 500 } },
                       { c: null, plan: [{ tipo: 'descanso', dur: 30 }], i: 0, restante: 15 });
di(Object.keys(sueltosOn.on).length > 0, 'en vivo · los Pods sueltos siguen corriendo en el descanso: los manda el usuario');

/* --- escapado: todo lo que escribe Diego pasa por escapeHtml --- */
dentro('circPodsHtml', 'escapeHtml(pod.etiqueta)', 'escapado · la etiqueta del Pod en el plano');
dentro('circPodsHtml', 'escapeAttr(pod.id)', 'escapado · y su identificador, que viaja en un atributo');
dentro('circPodsHtml', 'escapeAttr(pod.etiqueta)', 'escapado · la etiqueta tambien dentro del aria-label');
dentro('circElementosHtml', 'escapeHtml(a.etiqueta)', 'escapado · la etiqueta de un elemento del plano');
dentro('circSelPodHtml', 'escapeAttr(pod.etiqueta || "")', 'escapado · la etiqueta en el campo de edicion');
dentro('circMapaHtml', 'escapeHtml(circEstacionNombre(s))', 'escapado · el nombre de la estacion');
dentro('circLivePodsHud', 'escapeHtml(f.consigna)', 'escapado · la consigna que se ve durante el bloque');
dentro('circLivePodsHud', 'escapeHtml(donde)', 'escapado · y el nombre del grupo que la recibe');

/* --- lo que recibe quien abre el enlace no edita ni arranca nada --- */
dentro('circPodsHtml', "opts.lectura ? ' tabindex=\"-1\" disabled' : ''", 'compartido · en lectura los Pods no se pueden tocar');
dentro('circMapaHtml', "opts.lectura ? ' lectura' : ''", 'compartido · el plano se pinta en modo lectura');
di(fn('circElementosHtml').indexOf('!opts.lectura') >= 0, 'compartido · y en lectura no sale el tirador de las lineas');
di(fn('showCircuitoView').indexOf('circMapaHtml(c, { lectura: true') >= 0, 'compartido · la vista del enlace pinta el plano en lectura');
di(fn('showCircuitoView').indexOf('circPodsArrancar') < 0, 'compartido · abrir el enlace NO enciende Pods');
di(fn('circShareData').indexOf('pods:') >= 0 && fn('circShareData').indexOf('elementos:') >= 0 && fn('circShareData').indexOf('podsConfig:') >= 0,
   'compartido · el enlace lleva los Pods, los elementos y su configuracion');

/* --- respaldo, importacion y sincronizacion mueven el circuito ENTERO --- */
igual('respaldo · exportar y subir copian state.circuitos completo', src.split('circuitos: state.circuitos || [],').length - 1, 2);
igual('respaldo · importar y bajar lo devuelven completo', src.split('if (Array.isArray(data.circuitos)) state.circuitos = data.circuitos;').length - 1, 2);
di(src.indexOf('state.circuitos = Array.isArray(parsed.circuitos) ? parsed.circuitos : [];') >= 0, 'respaldo · cargar del disco, igual');
/* Y el viaje de ida y vuelta conserva el plano tal cual. */
const circuito = { id: 'c9', nombre: 'Prueba', estaciones: [{ id: 'e1', nombre: 'Sentadilla', podsConfig: { modo: 'focus' } }],
                   espacio: { plantilla: 'gym', anchoM: 10, largoM: 4.5 },
                   pods: [{ id: 'p1', n: 1, x: 0.3, y: 0.4, estacionId: 'e1', color: 'verde' }, { id: 'p2', n: 2, x: 0.6, y: 0.5, estacionId: null }],
                   elementos: [{ id: 'a1', tipo: 'cono', x: 0.5, y: 0.5 }] };
const ida = JSON.parse(JSON.stringify({ circuitos: [circuito] }));
igual('respaldo · el plano llega identico', JSON.stringify(ida.circuitos[0]), JSON.stringify(circuito));
igual('respaldo · con sus dos Pods', ida.circuitos[0].pods.length, 2);
di(ida.circuitos[0].estaciones[0].podsConfig.modo === 'focus', 'respaldo · y con la configuracion de luz de la estacion');

/* --- movil y accesibilidad --- */
di(src.indexOf('.cm-pod{position:absolute;width:40px;height:40px') >= 0, 'movil · el Pod mide 40 px en el plano');
di(src.indexOf('.cm-pod{width:44px;height:44px;}') >= 0, 'movil · y 44 px en pantalla estrecha, que es lo minimo comodo con el dedo');
di(src.indexOf('touch-action:none') >= 0, 'movil · arrastrar un Pod no arrastra la pagina');
dentro('circPodsHtml', "aria-label=\"Pod '", 'accesibilidad · cada Pod se anuncia con su numero');
dentro('circPodsHtml', "', siempre '", 'accesibilidad · y dice en voz alta si lleva color fijo');
dentro('circSelPodHtml', "onclick=\"circPodMover(", 'accesibilidad · hay flechas ademas del arrastre');

/* --- seguridad y encaje con la casa --- */
di(motor.indexOf('eval(') < 0 && motor.indexOf('new Function') < 0, 'seguridad · ni eval ni Function en el motor: la CSP no se toca');
di(motor.indexOf('http://') < 0 && motor.indexOf('https://') < 0, 'seguridad · ningun recurso remoto');
igual('encaje · el aviso de que esto no controla los Pods esta escrito una sola vez', src.split('var BLZ_AVISO = ').length - 1, 1);
di(src.indexOf('Configura esta actividad manualmente en la aplicación oficial de BlazePod') >= 0,
   'encaje · la app dice que la actividad se configura a mano en la app oficial');
dentro('circLivePodsHud', 'escapeHtml(BLZ_AVISO)', 'encaje · y el aviso se lee durante el bloque, que es cuando importa');
di(modPods.indexOf('Bluetooth') < 0 && modPods.indexOf('bluetooth') < 0, 'encaje · no se menciona ninguna conexion que no existe');

/* --- la colision que costo la tarde del 18-sep, ahora sobre el modulo nuevo
   En un <script> clasico `function circPodBase(c)` y `window.circPodBase =`
   son LA MISMA propiedad de window: la accion pisa a la funcion y la pila se
   llena. No lo ve validar_bloques (solo cuenta `function X(`) ni una suite que
   evalue el motor aislado: hay que mirar los dos a la vez. */
const modCirc = tramo('/* --- Día de rutina ↔ circuito --- */', '/* --- BlazePod --- */', 'el modulo de circuitos');
function colisiones(texto, prefijo) {
  const decl = {};
  let md; const reDecl = new RegExp('\\nfunction (' + prefijo + '[A-Za-z0-9_]*)\\(', 'g');
  while ((md = reDecl.exec(texto)) !== null) decl[md[1]] = (decl[md[1]] || 0) + 1;
  const choca = []; let mw;
  const reWin = new RegExp('\\nwindow\\.(' + prefijo + '[A-Za-z0-9_]*) = function', 'g');
  while ((mw = reWin.exec(texto)) !== null) if (decl[mw[1]]) choca.push(mw[1]);
  return { decl: decl, choca: choca };
}
const colBlz = colisiones(motor, 'blz'), colCirc = colisiones(modCirc, 'circ');
di(Object.keys(colBlz.decl).length > 25, 'colisiones · se encontraron las funciones del motor (' + Object.keys(colBlz.decl).length + ')');
di(Object.keys(colCirc.decl).length > 40, 'colisiones · y las de circuitos (' + Object.keys(colCirc.decl).length + ')');
di(colBlz.choca.length === 0, 'colisiones · ninguna accion de window pisa una funcion del motor (' + colBlz.choca.join(', ') + ')');
di(colCirc.choca.length === 0, 'colisiones · ni una de circuitos (' + colCirc.choca.join(', ') + ')');
di(Object.keys(colBlz.decl).every(n => colBlz.decl[n] === 1), 'colisiones · ninguna funcion del motor esta declarada dos veces');
di(Object.keys(colCirc.decl).every(n => colCirc.decl[n] === 1), 'colisiones · ni una de circuitos');

/* --- el editor viejo se fue entero: ni una llamada colgando --- */
[
  'blzEditorHtml', 'blzLienzoHtml', 'blzSelHtml', 'blzVistaHtml', 'blzMontajeHtml', 'blzImprimirHtml',
  'blzPaso1Html', 'blzPaso2Html', 'blzPaso3Html', 'blzCirculoHtml', 'blzPaletaHtml', 'blzSegHtml',
  'blzContadorHtml', 'blzPodColorHtml', 'blzSimParar', 'blzSimPlay', 'blzSimPintar', 'blzSimPaso',
  'blzMontaje', 'blzActivo', 'blzPlanDe', 'blzDuracion', 'blzDistancias', 'blzHuerfanos', 'blzPosAuto'
].forEach(n => {
  di(src.indexOf(n) < 0, 'retirada · no queda rastro de ' + n);
});
di(src.indexOf('CIRC_BLZ_VIEJO') < 0, 'retirada · y la bandera que lo encendia tampoco');
di(src.indexOf('blazePlan') > 0, 'retirada · pero blazePlan se sigue leyendo: los circuitos guardados migran solos');
di(fn('circMigrarUno').indexOf('c.blazePlan') >= 0, 'retirada · y quien lo lee es la migracion');

/* Que el circuito de toda la vida no haya cambiado. */
di(fn('circGrupoEn').indexOf('blz') < 0, 'circuito · el reparto de grupos no sabe nada de BlazePod');
di(fn('circPlan').indexOf('blz') < 0, 'circuito · el plan del cronometro tampoco');
di(fn('circDuracion').indexOf('blz') < 0, 'circuito · ni la duracion');
di(fn('circTrabajoDe').indexOf('blz') < 0, 'circuito · ni el tiempo por estacion');
di(fn('circNuevo').indexOf('blazePlan') < 0, 'circuito · un circuito nuevo nace sin plan BlazePod, como antes');

/* ================= 10. la v2: la forma de la app oficial =================
   Diez capturas del telefono de Diego, 18-sep-2026. El editor que copiaba sus
   tres pasos ya no esta, pero el MOTOR que hay debajo es el mismo y sigue
   siendo el que corre en la vista en vivo: esto lo vigila. */

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
/* Y la base sale del Pod marcado en el plano, que es lo unico que se toca hoy. */
dentro('circPodsPlan', 'base: p.base', 'home base · el Pod marcado como base viaja al motor');
dentro('circSelPodHtml', 'circPodBase(', 'home base · y se marca desde el panel del Pod');

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

/* ================= 11. Foco con varios Pods encendidos =================
   Diego, 18-sep por la noche: «la idea es poder colocar mas distracciones, no
   que solo 1 pod se prenda; si lo configuro asi que se enciendan 4 pods». */
function planFoco(distractores) {
  const p = conLogica({ modo: 'focus', duracion: 30, intervalo: 3, semilla: 'foco' }, planDemo());
  p.objetivo = ['verde'];
  p.montaje = { estaciones: 1, podsPorEstacion: 6, distractores: distractores, coloresPorJugador: 1 };
  return p;
}
const f0 = m.blzEstimulos(planFoco(0), 1);
di(f0.every(e => e.pods.length === 1), 'foco · sin distractores se enciende UNO, como antes');
const f3 = m.blzEstimulos(planFoco(3), 1);
di(f3.every(e => e.pods.length === 4), 'foco · con 3 distractores se encienden CUATRO Pods (' + f3[0].pods.length + ')');
const f1 = m.blzEstimulos(planFoco(1), 1);
di(f1.every(e => e.pods.length === 2), 'foco · y con 1 distractor, dos');
di(f3.every(e => new Set(e.pods).size === e.pods.length), 'foco · sin repetir el mismo Pod dentro del estimulo');
di(f3.some(e => new Set(e.colores).size > 1), 'foco · los Pods encendidos NO son todos del mismo color');
di(f3.every(e => e.colores.length === e.pods.length), 'foco · un color por Pod encendido');
/* Como maximo UNO lleva el color al que hay que responder: si hubiera dos,
   no habria eleccion que entrenar. */
di(f3.every(e => e.colores.filter(c => c === 'verde').length <= 1), 'foco · a lo sumo un Pod lleva el color objetivo');
di(f3.every(e => e.objetivo === e.colores.some(c => c === 'verde')), 'foco · la marca dice si HAY objetivo en pantalla');
di(f3.some(e => e.objetivo === false), 'foco · a veces no sale el objetivo: entonces no se toca nada');
di(f3.filter(e => !e.objetivo).every(e => !e.consigna), 'foco · sin objetivo no se da consigna, que seria mandar hacer lo contrario');
di(f3.filter(e => e.objetivo).every(e => e.consigna === 'Conducción'), 'foco · con objetivo, la consigna es la del color objetivo, no la de un distractor');
igual('foco · y sigue siendo repetible con la misma semilla',
      JSON.stringify(m.blzEstimulos(planFoco(3), 1)), JSON.stringify(f3));
/* El tope: no se pueden encender mas Pods de los que hay. */
const fTope = m.blzEstimulos(planFoco(20), 1);
di(fTope.every(e => e.pods.length <= 6), 'foco · nunca se encienden mas Pods de los que hay en el lienzo');
dentro('blzElegirPods', 'plan.montaje ? plan.montaje.distractores : 0', 'foco · el contador de distractores es el que manda');

/* ================= 12. Varios colores y color fijo por Pod =================
   Diego: «si quiero escoger mas de un color a la vez, para que sean
   distracciones, necesito colores por pod». */
function planColores(objetivos, distractores, fijos) {
  const p = conLogica({ modo: 'focus', duracion: 30, intervalo: 3, semilla: 'col' }, planDemo());
  p.colores = objetivos.concat(distractores).map(id => ({ id: id, hex: '#000000', consigna: 'hacer ' + id }));
  p.objetivo = objetivos.slice();
  p.montaje = { estaciones: 1, podsPorEstacion: 6, distractores: 3, coloresPorJugador: 1 };
  if (fijos) for (const n in fijos) p.pods[n - 1].color = fijos[n];
  return p;
}
/* Dos colores objetivo a la vez: los dos cuentan como «hay que tocar». */
const dosObj = m.blzEstimulos(planColores(['verde', 'azul'], ['rojo', 'amarillo']), 1);
di(dosObj.every(e => e.objetivo === e.colores.some(c => c === 'verde' || c === 'azul')),
   'colores · con DOS objetivos, cualquiera de los dos cuenta');
di(dosObj.some(e => e.colores.indexOf('verde') >= 0) && dosObj.some(e => e.colores.indexOf('azul') >= 0),
   'colores · y salen los dos a lo largo de la serie');
/* Tres distractores distintos aparecen de verdad. */
const tresDis = m.blzEstimulos(planColores(['verde'], ['rojo', 'azul', 'amarillo']), 1);
const vistos = {};
tresDis.forEach(e => e.colores.forEach(c => { vistos[c] = 1; }));
di(['rojo', 'azul', 'amarillo'].filter(c => vistos[c]).length >= 2,
   'colores · con tres colores de trampa salen varios, no siempre el mismo');
/* El color fijo de un Pod manda sobre lo que decida el modo. */
const fijoCol = m.blzEstimulos(planColores(['verde'], ['rojo', 'azul', 'amarillo'], { 3: 'amarillo' }), 1);
const conP3 = fijoCol.filter(e => e.pods.indexOf(3) >= 0);
di(conP3.length > 0, 'colores · el Pod 3 se enciende alguna vez (' + conP3.length + ')');
di(conP3.every(e => e.colores[e.pods.indexOf(3)] === 'amarillo'),
   'colores · y SIEMPRE con su color fijo, mande lo que mande el modo');
/* Un color fijo que no esta en la paleta se ignora en vez de encender en blanco. */
const raroCol = planColores(['verde'], ['rojo']);
raroCol.pods[0].color = 'no-existe';
di(m.blzEstimulos(raroCol, 1).every(e => e.colores.every(c => c === 'verde' || c === 'rojo')),
   'colores · un color fijo que no está en la paleta se ignora');
/* Sin colores fijos, la serie es EXACTAMENTE la de antes: la semilla vale. */
igual('colores · sin colores fijos no cambia nada de lo anterior',
      JSON.stringify(m.blzEstimulos(planColores(['verde'], ['rojo', 'azul']), 1)),
      JSON.stringify(m.blzEstimulos(planColores(['verde'], ['rojo', 'azul']), 1)));
di(m.blzNormalizar({ pods: [{ n: 1, color: 'verde' }] }).pods[0].color === 'verde',
   'colores · el color del Pod sobrevive a normalizar');
di(m.blzNormalizar({ pods: [{ n: 1, color: 'inventado' }] }).pods[0].color === '',
   'colores · y uno inventado se limpia');
/* Y el color fijo se elige tocando el Pod en el plano, que es lo que pidio:
   «cuando selecciones el puntero poder escojer el color que se encendera». */
dentro('circSelPodHtml', 'BLZ_COLORES.map(', 'pod · en el panel salen los OCHO colores, no una muestra');
dentro('circSelPodHtml', "circPodColor(\\'' + id + '\\',\\'\\')", 'pod · y el «—» lo devuelve a lo que mande el grupo');
di(src.indexOf('window.circPodColor = function(id, colorId)') >= 0, 'pod · con su accion');
dentro('circPodsPlan', 'color: p.color', 'pod · el color fijo viaja del plano al motor');
dentro('circPodsHtml', 'blzColorRef(pod.color)', 'pod · y en el plano se ve su aro de ese color');

/* ================= 13. Lo que decide Diego, no yo =================
   «Que sea variable, que todo eso sea configurable». El motor sigue leyendo
   estos dos numeros del plan, y el subcronometro le pasa el peso de cada Pod.
   OJO: al retirar el editor viejo se quedaron SIN pantalla que los toque —
   probObjetivo, el peso del Pod, los distractores y el retardo corren hoy con
   su valor por defecto. Esta escrito en la entrega de la fase 10. */

/* --- cada cuanto sale el objetivo --- */
function planProb(prob) {
  const p = conLogica({ modo: 'focus', duracion: 300, intervalo: 3, semilla: 'prob' }, planDemo());
  p.objetivo = ['verde'];
  p.logica.probObjetivo = prob;
  p.montaje = { estaciones: 1, podsPorEstacion: 6, distractores: 2, coloresPorJugador: 1 };
  return p;
}
const cien = m.blzEstimulos(planProb(100), 1);
di(cien.every(e => e.objetivo), 'probabilidad · al 100 % el objetivo sale SIEMPRE');
const cero = m.blzEstimulos(planProb(0), 1);
di(cero.every(e => !e.objetivo), 'probabilidad · al 0 % no sale nunca y no hay nada que tocar');
const mitad = m.blzEstimulos(planProb(50), 1);
const conObj = mitad.filter(e => e.objetivo).length;
di(conObj > mitad.length * 0.3 && conObj < mitad.length * 0.7,
   'probabilidad · al 50 % sale mas o menos la mitad (' + conObj + ' de ' + mitad.length + ')');
const alto = m.blzEstimulos(planProb(90), 1).filter(e => e.objetivo).length;
const bajo = m.blzEstimulos(planProb(20), 1).filter(e => e.objetivo).length;
di(alto > bajo, 'probabilidad · al 90 % sale mas veces que al 20 % (' + alto + ' > ' + bajo + ')');
igual('probabilidad · sin decir nada, 70 %', m.blzNormalizar({}).logica.probObjetivo, 70);
di(m.blzNormalizar({ logica: { probObjetivo: 500 } }).logica.probObjetivo <= 100, 'probabilidad · no pasa del 100');
di(m.blzNormalizar({ logica: { probObjetivo: -5 } }).logica.probObjetivo >= 0, 'probabilidad · ni baja de 0');

/* --- cada cuanto sale cada Pod --- */
function planPeso(pesos) {
  const p = conLogica({ modo: 'random', duracion: 600, intervalo: 3, semilla: 'peso', sinRepetir: false }, planDemo());
  for (const n in pesos) p.pods[n - 1].peso = pesos[n];
  return p;
}
const iguales = m.blzEstimulos(planPeso({}), 1);
const cuenta = (lista, n) => lista.filter(e => e.pods.indexOf(n) >= 0).length;
di(Math.abs(cuenta(iguales, 1) - cuenta(iguales, 6)) < iguales.length * 0.15,
   'pesos · sin tocar nada, todos los Pods salen parecido');
const pesado = m.blzEstimulos(planPeso({ 2: 5 }), 1);
di(cuenta(pesado, 2) > cuenta(pesado, 1) * 2,
   'pesos · el Pod 2 con peso 5 sale mucho mas que el 1 (' + cuenta(pesado, 2) + ' contra ' + cuenta(pesado, 1) + ')');
di(cuenta(pesado, 3) > 0, 'pesos · y los demas siguen saliendo, no desaparecen');
igual('pesos · sin decir nada, 1', m.blzNormalizar({ pods: [{ n: 1 }] }).pods[0].peso, 1);
di(m.blzNormalizar({ pods: [{ n: 1, peso: 99 }] }).pods[0].peso <= 5, 'pesos · el tope es 5');
di(m.blzNormalizar({ pods: [{ n: 1, peso: 0 }] }).pods[0].peso >= 1, 'pesos · y el minimo 1: un Pod que no sale nunca sobra del lienzo');
/* Lo que mas importa: con todos los pesos a 1 la serie es EXACTAMENTE la de
   siempre. El sorteo con pesos degenera en el de antes y la semilla vale. */
igual('pesos · con todos a 1, la serie es la de siempre',
      JSON.stringify(m.blzEstimulos(planPeso({}), 1)),
      JSON.stringify(m.blzEstimulos(conLogica({ modo: 'random', duracion: 600, intervalo: 3, semilla: 'peso', sinRepetir: false }, planDemo()), 1)));
dentro('circPodsPlan', 'peso: p.peso', 'pesos · el peso del Pod llega al motor desde el plano');

/* ================= 14. la configuracion del grupo =================
   Hoy la logica de luz vive en `podsConfig` (una por estacion) y en
   `podsSueltos`. Esto vigila que lo que se guarda llegue entero al motor: es
   el camino por el que la pantalla que falta tendra que entrar. */
const cfgIda = ['modo', 'intervalo', 'luz', 'disparo', 'simultaneos', 'semilla', 'sonido', 'tiempoRespuestaMs', 'aleatorio', 'colores', 'objetivo', 'probObjetivo', 'secuencia'];
cfgIda.forEach(k => {
  di(fn('circPodsConfigNueva').indexOf(k) >= 0 || fn('circPodsConfig').indexOf(k) >= 0, 'configuracion · «' + k + '» esta en la del grupo');
});
dentro('circPodsPlan', 'plan.logica.modo = cfg.modo', 'configuracion · el modo llega al motor');
dentro('circPodsPlan', 'plan.logica.intervalo = cfg.intervalo', 'configuracion · el intervalo tambien');
dentro('circPodsPlan', 'plan.logica.simultaneos = cfg.simultaneos', 'configuracion · y cuantos se encienden a la vez');
dentro('circPodsPlan', 'plan.logica.semilla = cfg.semilla', 'configuracion · la semilla, que es lo que hace repetible la serie');
dentro('circPodsPlan', 'plan.logica.preparacion = 0', 'configuracion · el subcronometro no mete preparacion: eso lo lleva el reloj global');
dentro('circPodsPlan', 'plan.series = 1', 'configuracion · ni series: el bloque es uno');
dentro('circPodsPlan', 'plan.objetivo = u19Arr(cfg.objetivo)', 'configuracion · el color objetivo de «Foco» llega al motor');
dentro('circPodsPlan', 'plan.logica.probObjetivo = cfg.probObjetivo', 'configuracion · y cada cuanto sale en vez de un distractor');
dentro('circPodsPlan', 'plan.secuencia = u19Arr(cfg.secuencia)', 'configuracion · los pasos de la secuencia, tambien');

/* Un grupo en «Secuencia» sin pasos no enciende NADA, y no da error: el
   motor devuelve la lista vacia y los Pods se quedan apagados toda la clase.
   Por eso los pasos viajan en la configuracion del grupo y el panel avisa
   cuando faltan. */
const seqVacia = conLogica({ modo: 'secuencia', duracion: 30 }, planDemo());
seqVacia.secuencia = [];
igual('secuencia · sin pasos no hay un solo estimulo', m.blzEstimulos(seqVacia, 1).length, 0);
const seqLlena = conLogica({ modo: 'secuencia', duracion: 30 }, planDemo());
seqLlena.secuencia = [{ id: 's1', pods: [1, 2], color: 'verde', dur: 1.5 },
                      { id: 's2', pods: [3], color: 'rojo', dur: 2 }];
const estSeq = m.blzEstimulos(seqLlena, 1);
igual('secuencia · con pasos, un estimulo por paso', estSeq.length, 2);
igual('secuencia · el primero enciende los dos Pods que dice', estSeq[0].pods.length, 2);
igual('secuencia · y el segundo empieza cuando acaba el primero', estSeq[1].t, 1.5);

/* --- resultado --- */
console.log('\nUS19-APP · planificador BlazePod');
console.log('archivo: ' + ruta);
if (fallos.length) {
  fallos.forEach(f => console.log('  ✗ ' + f));
  console.log('\n  comprobaciones OK: ' + ok + '  ·  FALLOS: ' + fallos.length + '\n');
  process.exit(1);
}
console.log('  comprobaciones OK: ' + ok + '  ·  sin fallos\n');
