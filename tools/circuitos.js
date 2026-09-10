/* Prueba de los circuitos y del motor de búsqueda.
 *
 * Los dos son funciones puras que viven dentro del index.html: el reparto de
 * grupos por estación, el plan de fases del cronómetro, la duración, el
 * tiempo por estación, y la búsqueda con plurales y sinónimos. Esta prueba
 * los extrae y los evalúa aislados, con veinte casos fijos. Si alguien toca
 * una fórmula y rompe una clase de niños, aquí se ve antes del commit.
 *
 *   node tools/circuitos.js [index.html]
 *
 * Igual que pruebas.js y taxonomia.js: si no encuentra lo que busca, falla.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('circuitos: no encuentro el inicio de ' + nombre); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('circuitos: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}
function fn(nombre) { return tramo('function ' + nombre + '(', '\n}\n', nombre) + '\n}\n'; }

const codigo = [
  fn('u19Arr'),
  fn('musNorm'),
  tramo('/* --- Búsqueda --- */', '/* --- Pizarra --- */', 'el motor de búsqueda'),
  fn('circNum'), fn('circFmt'), fn('circRatio'), fn('circPosAuto'), fn('circGruposNombres'), fn('circNombreGrupo'),
  fn('circGrupoEn'), fn('circTrabajoDe'), fn('circDuracion'), fn('circPlan'),
].join('\n');

let m;
try {
  m = new Function('var getExercise = function(){ return null; };\n' + codigo
    + '\nreturn { busqRaiz: busqRaiz, busqCoincide: busqCoincide, busqPuntua: busqPuntua, musNorm: musNorm, circFmt: circFmt, circPosAuto: circPosAuto,'
    + ' circNombreGrupo: circNombreGrupo, circGrupoEn: circGrupoEn, circTrabajoDe: circTrabajoDe, circDuracion: circDuracion, circPlan: circPlan };')();
} catch (e) {
  console.error('circuitos: el código no evalúa aislado: ' + e.message);
  process.exit(1);
}

let ok = 0; const fallos = [];
function di(cond, txt) { if (cond) ok++; else fallos.push(txt); }

/* --- búsqueda --- */
di(m.busqRaiz('flexiones') === 'flexion', 'raíz: flexiones → flexion');
di(m.busqRaiz('sentadillas') === 'sentadilla', 'raíz: sentadillas → sentadilla');
di(m.busqRaiz('press') === 'press', 'raíz: press se queda (termina en ss)');
di(m.busqRaiz('pies') === 'pies', 'raíz: pies se queda (corta)');
const banca = m.musNorm('Press de banca con barra Pecho Barra túmbate en un banco');
di(m.busqCoincide(banca, 'press banca'), '«press banca» encuentra «press de banca»');
di(m.busqCoincide(banca, 'banca press'), '«banca press» también (orden libre)');
di(m.busqCoincide(banca, 'prés dé bánca'), 'sin acentos');
di(!m.busqCoincide(m.musNorm('Dominadas agarre supino'), 'pino'), '«pino» no encuentra «supino»');
di(m.busqCoincide(m.musNorm('Flexiones pike Pecho'), 'lagartijas', m.musNorm('Flexiones pike Pecho')), 'sinónimo: lagartijas → flexiones (en el nombre)');
di(!m.busqCoincide(m.musNorm('Remo con barra flexiona los codos'), 'lagartijas', m.musNorm('Remo con barra')), 'el sinónimo no vale en la descripción');
di(m.busqCoincide(m.musNorm('Zancada frontal Pierna'), 'estocadas', m.musNorm('Zancada frontal Pierna')), 'estocadas → zancada, con plural');
di(m.busqCoincide('cualquier cosa', ''), 'consulta vacía pasa todo');
const pA = m.busqPuntua(m.musNorm('Salto lateral'), m.musNorm('Salto lateral pierna'), 'salto');
const pB = m.busqPuntua(m.musNorm('Sentadilla con salto'), m.musNorm('Sentadilla con salto pierna'), 'salto');
const pC = m.busqPuntua(m.musNorm('Burpee'), m.musNorm('Burpee cardio termina con un salto'), 'salto');
di(pA > pB && pB > pC, 'ranking: empieza igual > lo contiene en el nombre > solo en la descripción (' + pA + ' > ' + pB + ' > ' + pC + ')');

/* --- circuitos --- */
const c4 = { modo: 'rotacion', grupos: 4, rondas: 2, trabajo: 40, cambio: 15, descansoRonda: 60, estaciones: [{}, {}, {}, {}] };
di(m.circGrupoEn(c4, 0, 0) === 0 && m.circGrupoEn(c4, 3, 0) === 3, 'turno 0: cada grupo en su estación');
di(m.circGrupoEn(c4, 0, 1) === 3 && m.circGrupoEn(c4, 1, 1) === 0, 'turno 1: todos rotan una estación (el 4 vuelve a la 1)');
const c3g = { modo: 'rotacion', grupos: 3, estaciones: [{}, {}, {}, {}] };
di(m.circGrupoEn(c3g, 0, 1) === -1, 'con 3 grupos y 4 estaciones, una queda libre');
di(m.circNombreGrupo({ nombresGrupos: 'Leones, Tigres' }, 0) === 'Leones' && m.circNombreGrupo({ nombresGrupos: 'Leones, Tigres' }, 2) === 'Grupo 3', 'nombres de grupo y «Grupo N» de reserva');
const c3 = { modo: 'rotacion', grupos: 3, rondas: 2, trabajo: 40, cambio: 15, descansoRonda: 60, estaciones: [{}, {}, {}] };
di(m.circDuracion(c3) === 360, 'duración: 2 vueltas × 3 × 40 + 2 × 2 × 15 + 60 = 360 (da ' + m.circDuracion(c3) + ')');
const cs = { modo: 'secuencia', rondas: 1, trabajo: 40, cambio: 10, descansoRonda: 0, estaciones: [{ trabajo: 20 }, {}] };
di(m.circTrabajoDe(cs, 0) === 20 && m.circTrabajoDe(cs, 1) === 40, 'secuencia: tiempo propio de la estación o el general');
di(m.circTrabajoDe({ modo: 'rotacion', trabajo: 40, estaciones: [{ trabajo: 20 }] }, 0) === 40, 'rotación: manda el general (todos a la vez)');
const plan = m.circPlan({ modo: 'rotacion', rondas: 2, trabajo: 5, cambio: 2, descansoRonda: 3, estaciones: [{}, {}] });
di(plan.map(p => p.tipo).join(',') === 'listos,trabajo,cambio,trabajo,descanso,trabajo,cambio,trabajo,fin', 'plan de fases: listos · trabajo · cambio · … · descanso entre vueltas · fin (da ' + plan.map(p => p.tipo).join(',') + ')');
di(plan.filter(p => p.tipo === 'trabajo').map(p => p.turno).join(',') === '0,1,2,3', 'los turnos se numeran seguidos entre vueltas');
di(plan.reduce((a, p) => a + p.dur, 0) === 5 + 4 * 5 + 2 * 2 + 3, 'la suma de fases cuadra con la duración más los 5 s de «listos»');
const p0 = m.circPosAuto(0, 4, 'circulo'), p1 = m.circPosAuto(1, 4, 'circulo');
di(p0.y < 0.2 && Math.abs(p0.x - 0.5) < 0.01 && p1.x > 0.85, 'en círculo: la estación 1 arriba y la 2 a la derecha (sentido horario)');
di(m.circFmt(65) === '1:05' && m.circFmt(0) === '0:00', 'formato de tiempo m:ss');

/* Los dos bordes de abajo salieron el 10-sep-2026 al escribir los mutantes:
   dos guardas que ningun caso tocaba. Las dos protegen la clase en vivo. */
di(m.circDuracion({ modo: 'rotacion', rondas: 2, trabajo: 40, cambio: 15, estaciones: [] }) === 0,
  'un circuito sin estaciones dura cero, no un numero raro');
di(m.circTrabajoDe({ modo: 'secuencia', trabajo: 0, estaciones: [{ trabajo: 0 }] }, 0) === 1,
  'una estacion nunca baja de 1 segundo: con cero, el cronometro no avanzaria');

console.log('\nUS19-APP · circuitos y búsqueda');
console.log('archivo: ' + ruta);
console.log('  comprobaciones OK: ' + ok + (fallos.length ? '  ·  FALLOS: ' + fallos.length : '  ·  sin fallos'));
fallos.forEach(function (f) { console.log('  ✗ ' + f); });
process.exit(fallos.length ? 1 : 0);
