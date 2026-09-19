/* Prueba de la planilla única: espacio, Pods y elementos en un solo plano.
 *
 * Lo que aquí se comprueba es el MODELO, no la pantalla: la migración desde
 * los dos lienzos de antes (mapa con `ratio` + lienzo de BlazePod con metros),
 * el vínculo Pod ↔ estación, la liberación de huérfanos, la configuración de
 * luz por grupo y que cambiar de plantilla no mueva nada de sitio.
 *
 *   node tools/planilla.js [index.html]
 *
 * Igual que circuitos.js y blazepod.js: extrae las funciones del index.html y
 * las evalúa aisladas. Si no encuentra lo que busca, falla — un banco que no
 * puede aplicar lo que prueba no está avisando de nada.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('planilla: no encuentro el inicio de ' + nombre); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('planilla: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}
function fn(nombre) { return tramo('function ' + nombre + '(', '\n}\n', nombre) + '\n}\n'; }
function lista(nombre) { return tramo('var ' + nombre + ' = [', '\n];', nombre) + '\n];\n'; }
function uno(nombre) { return tramo('var ' + nombre + ' = ', ';', nombre) + ';\n'; }

const codigo = [
  fn('genId'), fn('u19Arr'),
  lista('BLZ_COLORES'), lista('BLZ_MODOS'), lista('BLZ_DISPAROS'), lista('BLZ_ADORNOS'),
  fn('blzNum'), fn('blzEnt'), fn('blzTexto'), fn('blzColorRef'), fn('blzModo'), fn('blzDisparo'), fn('blzAdorno'),
  uno('CIRC_PV'), uno('CIRC_MAX_PODS'), uno('CIRC_MAX_ELEM'), uno('CIRC_RADIO_POD'),
  lista('CIRC_ESPACIOS'), uno('CIRC_RATIO_LEGADO'),
  fn('circNorm'), fn('circEstacionNombre'),
  fn('circEspacioRef'), fn('circMedida'), fn('circEspacioPorMedida'), fn('circEspacio'), fn('circRatio'),
  fn('circPods'), fn('circElementos'), fn('circPodPorId'), fn('circElementoPorId'),
  fn('circEstacionPorId'), fn('circEstacionIdx'), fn('circEstacionPorNombre'),
  fn('circPodsDe'), fn('circPodsSueltos'), fn('circHuerfanos'), fn('circPodsRenumerar'),
  fn('circPodsConfigNueva'), fn('circPodsConfig'), fn('circPodsConfigDe'), fn('circPodsConfigPoner'),
  fn('circPodsConfigDeLogica'), fn('circMigrarUno'),
].join('\n');

const exporta = ['circEspacio', 'circEspacioRef', 'circEspacioPorMedida', 'circRatio', 'circMigrarUno',
  'circPods', 'circElementos', 'circPodsDe', 'circPodsSueltos', 'circHuerfanos', 'circPodsRenumerar',
  'circPodPorId', 'circElementoPorId', 'circEstacionPorId', 'circEstacionPorNombre', 'circEstacionIdx',
  'circPodsConfig', 'circPodsConfigNueva', 'circPodsConfigDe', 'circPodsConfigPoner', 'circPodsConfigDeLogica',
  'CIRC_PV', 'CIRC_ESPACIOS', 'CIRC_MAX_PODS'];

let m;
try {
  m = new Function('var getExercise = function(id){ return id ? { name: "Ficha " + id, equipment: "Mancuernas" } : null; };\n'
    + 'var console = { warn: function(){} };\n' + codigo
    + '\nreturn { ' + exporta.map(function (k) { return k + ': ' + k; }).join(', ') + ' };')();
} catch (e) {
  console.error('planilla: el código no evalúa aislado: ' + e.message);
  process.exit(1);
}

let ok = 0; const fallos = [];
function es(etiqueta, real, esperado) {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  if (a === b) ok++; else fallos.push(etiqueta + '\n      esperado: ' + b + '\n      real:     ' + a);
}
function cierto(etiqueta, v) { if (v) ok++; else fallos.push(etiqueta + ' — se esperaba cierto'); }
function falso(etiqueta, v) { if (!v) ok++; else fallos.push(etiqueta + ' — se esperaba falso'); }
function casi(etiqueta, real, esperado, tol) {
  if (Math.abs(real - esperado) <= (tol == null ? 1e-9 : tol)) ok++;
  else fallos.push(etiqueta + '\n      esperado: ' + esperado + ' ±' + tol + '\n      real:     ' + real);
}

/* --- circuitos de prueba ------------------------------------------------- */
function estaciones(n) {
  const l = [];
  for (let i = 0; i < n; i++) l.push({ id: 'e' + (i + 1), exerciseId: '', nombre: 'Estación ' + (i + 1), nota: '' });
  return l;
}
/* Un circuito tal como los guardaba la versión de antes: `ratio` de texto y el
   plan de Pods colgado en blazePlan, con su propia superficie en metros. */
function viejoConPods() {
  return {
    id: 'c1', nombre: 'Coordinación', modo: 'rotacion', grupos: 4, rondas: 2, ratio: '16:9',
    trabajo: 40, cambio: 15, descansoRonda: 60, estaciones: estaciones(6),
    blazePlan: {
      activo: true, alcance: 'estacion', estacion: 'Estación 3', contexto: 'futbol',
      superficie: { tipo: 'cancha', anchoM: 20, altoM: 15, rejilla: true },
      pods: [
        { id: 'p1', n: 1, x: 0.25, y: 0.30, etiqueta: 'A', base: true, color: 'verde', peso: 1 },
        { id: 'p2', n: 2, x: 0.75, y: 0.70, etiqueta: '', base: false, color: '', peso: 2 },
      ],
      adornos: [
        { id: 'a1', tipo: 'cono', x: 0.10, y: 0.10, etiqueta: 'salida' },
        { id: 'a2', tipo: 'pase', x: 0.40, y: 0.50, x2: 0.60, y2: 0.55, etiqueta: '' },
      ],
      logica: { modo: 'secuencia', duracion: 30, intervalo: 2.5, luz: 2.5, respuesta: 1.8, disparo: 'toque', simultaneos: 1, semilla: 'abc', sonido: false },
      colores: [{ id: 'rojo', hex: '#ef4444', consigna: 'Frenar' }, { id: 'azul', hex: '#3b82f6', consigna: 'Pase' }],
    },
  };
}
/* Un circuito de antes SIN Pods: solo el mapa, con su `ratio`. */
function viejoSinPods(ratio) {
  return { id: 'c2', nombre: 'Clase', modo: 'rotacion', grupos: 4, rondas: 1, ratio: ratio,
           trabajo: 40, cambio: 15, descansoRonda: 60, estaciones: estaciones(4) };
}

/* --- 1. el espacio ------------------------------------------------------- */
{
  const e = m.circEspacio(viejoSinPods('16:9'));
  es('16:9 → plantilla sala169', e.plantilla, 'sala169');
  es('16:9 → 16 × 9 m', [e.anchoM, e.largoM], [16, 9]);
  falso('16:9 no trae medidas reales', e.medidas);
  falso('16:9 no trae cuadrícula', e.cuadricula);
  casi('16:9 → proporción 1,777', m.circRatio(viejoSinPods('16:9')), 16 / 9);

  const b = m.circEspacio(viejoSinPods('4:3'));
  es('4:3 → espacio libre con su forma', [b.plantilla, b.anchoM, b.largoM], ['libre', 4, 3]);
  casi('4:3 → proporción 1,333', m.circRatio(viejoSinPods('4:3')), 4 / 3);
  casi('2:1 → proporción 2', m.circRatio(viejoSinPods('2:1')), 2);
  casi('un ratio desconocido cae en 16:9', m.circRatio(viejoSinPods('7:5')), 16 / 9);

  /* Con Pods manda la superficie del plan: las x,y de los Pods son fracciones
     de ELLA, y si se ignora, los Pods aparecen movidos. */
  const p = m.circEspacio(viejoConPods());
  es('con Pods manda la superficie del plan', [p.plantilla, p.anchoM, p.largoM], ['cancha', 20, 15]);
  cierto('una superficie heredada trae medidas reales', p.medidas);
  cierto('la cuadrícula del plan se conserva', p.cuadricula);

  es('la cancha completa se reconoce por medidas', m.circEspacioPorMedida(40, 25), 'cancha2');
  es('el gym se reconoce con 25 cm de tolerancia', m.circEspacioPorMedida(10.2, 4.4), 'gym');
  es('unas medidas que no son de nadie caen en libre', m.circEspacioPorMedida(7, 3), 'libre');
  es('las plantillas son las seis acordadas', m.CIRC_ESPACIOS.map(function (x) { return x.id; }),
     ['sala169', 'gym', 'cardio', 'cancha', 'cancha2', 'libre']);
  es('gym US19', [m.circEspacioRef('gym').ancho, m.circEspacioRef('gym').largo], [10, 4.5]);
  es('sala cardio', [m.circEspacioRef('cardio').ancho, m.circEspacioRef('cardio').largo], [4.5, 5]);
  es('cancha por defecto 20 × 15', [m.circEspacioRef('cancha').ancho, m.circEspacioRef('cancha').largo], [20, 15]);
  es('una plantilla inventada cae en la primera', m.circEspacioRef('nada').id, 'sala169');
  const e0 = m.circEspacio(null);
  es('sin circuito sigue habiendo plano', [e0.plantilla, e0.anchoM, e0.largoM], ['sala169', 16, 9]);
}

/* --- 2. migración desde blazePlan --------------------------------------- */
{
  const c = m.circMigrarUno(viejoConPods());
  es('queda migrado', c.pv, m.CIRC_PV);
  falso('no queda en solo lectura', c._ro);
  cierto('blazePlan NO se borra', !!c.blazePlan);
  es('los dos Pods llegan', m.circPods(c).length, 2);
  es('los dos elementos llegan', m.circElementos(c).length, 2);

  const p1 = m.circPodPorId(c, 'p1');
  es('el Pod conserva su sitio', [p1.x, p1.y], [0.25, 0.30]);
  cierto('el Pod base sigue siendo base', p1.base);
  es('el color fijo se conserva', p1.color, 'verde');
  es('la etiqueta se conserva', p1.etiqueta, 'A');
  es('el peso se conserva', m.circPodPorId(c, 'p2').peso, 2);

  /* alcance "estacion" con nombre: los Pods eran de esa estación y así siguen. */
  es('los Pods quedan atados a la estación 3', [p1.estacionId, m.circPodPorId(c, 'p2').estacionId], ['e3', 'e3']);
  es('la estación 3 tiene los dos Pods', m.circPodsDe(c, 'e3').length, 2);
  es('no quedan Pods sueltos', m.circPodsSueltos(c).length, 0);
  es('las demás estaciones no tienen Pods', m.circPodsDe(c, 'e1').length, 0);

  const el2 = m.circElementoPorId(c, 'a2');
  es('la línea de pase conserva sus dos puntos', [el2.x, el2.y, el2.x2, el2.y2], [0.40, 0.50, 0.60, 0.55]);
  es('el cono no inventa un segundo punto', m.circElementoPorId(c, 'a1').x2, undefined);
  es('el cono trae rotación 0', m.circElementoPorId(c, 'a1').rotacion, 0);
  es('la etiqueta del elemento se conserva', m.circElementoPorId(c, 'a1').etiqueta, 'salida');

  /* La lógica de luz era una sola para todo el circuito: pasa a la estación
     que tenía los Pods, y `respuesta` en segundos a milisegundos. */
  const cfg = m.circPodsConfigDe(c, 'e3');
  es('el modo se hereda', cfg.modo, 'secuencia');
  es('1,8 s de respuesta son 1800 ms', cfg.tiempoRespuestaMs, 1800);
  falso('una secuencia no es aleatoria', cfg.aleatorio);
  es('los colores del plan se heredan', cfg.colores, ['rojo', 'azul']);
  es('el intervalo se hereda', cfg.intervalo, 2.5);
  es('el disparo se hereda', cfg.disparo, 'toque');
  es('la semilla se hereda', cfg.semilla, 'abc');
  falso('el sonido apagado se hereda apagado', cfg.sonido);
  cierto('una estación sin Pods no recibe configuración', !m.circEstacionPorId(c, 'e1').podsConfig);
  cierto('el grupo de sueltos siempre tiene configuración', !!c.podsSueltos);

  es('la disposición arranca en círculo', c.disposicion, 'circulo');
  es('el espacio queda escrito', [c.espacio.plantilla, c.espacio.anchoM, c.espacio.largoM], ['cancha', 20, 15]);
}

/* --- 3. la migración es idempotente y no pisa lo nuevo ------------------ */
{
  const c = m.circMigrarUno(viejoConPods());
  const antes = JSON.stringify(c);
  m.circMigrarUno(c);
  es('migrar dos veces no cambia nada', JSON.stringify(c), antes);

  /* Un circuito que ya trae Pods nuevos no se rellena desde blazePlan. */
  const d = viejoConPods();
  d.pods = [{ id: 'mio', n: 1, x: 0.5, y: 0.5, estacionId: null, color: '', etiqueta: '', base: false, peso: 1 }];
  m.circMigrarUno(d);
  es('los Pods nuevos ganan sobre blazePlan', m.circPods(d).length, 1);
  es('y siguen sueltos', m.circPods(d)[0].estacionId, null);

  /* Sin blazePlan no se inventa nada, pero el circuito queda migrado. */
  const e = m.circMigrarUno(viejoSinPods('16:9'));
  es('sin plan no hay Pods', m.circPods(e).length, 0);
  es('sin plan no hay elementos', m.circElementos(e).length, 0);
  es('pero queda migrado', e.pv, m.CIRC_PV);
  cierto('y con configuración de sueltos', !!e.podsSueltos);
}

/* --- 4. alcance "circuito": los Pods quedan sueltos --------------------- */
{
  const c = viejoConPods();
  c.blazePlan.alcance = 'circuito';
  m.circMigrarUno(c);
  es('alcance circuito → los dos Pods sueltos', m.circPodsSueltos(c).length, 2);
  cierto('ninguna estación recibe configuración', c.estaciones.every(function (s) { return !s.podsConfig; }));

  /* Un nombre de estación que ya no existe no puede perder los Pods. */
  const d = viejoConPods();
  d.blazePlan.estacion = 'Estación que ya no está';
  m.circMigrarUno(d);
  es('un nombre que no existe deja los Pods sueltos', m.circPodsSueltos(d).length, 2);
}

/* --- 5. huérfanos: un Pod nunca se pierde ------------------------------- */
{
  const c = m.circMigrarUno(viejoConPods());
  c.estaciones = c.estaciones.filter(function (s) { return s.id !== 'e3'; });   /* se borra la estación 3 */
  es('se liberan los dos Pods', m.circHuerfanos(c), 2);
  es('siguen existiendo', m.circPods(c).length, 2);
  es('y ahora están sueltos', m.circPodsSueltos(c).length, 2);
  es('volver a pasar no libera nada', m.circHuerfanos(c), 0);

  /* Renumerar mantiene el id, que es lo que guarda el vínculo. */
  const d = m.circMigrarUno(viejoConPods());
  d.pods.splice(0, 1);
  m.circPodsRenumerar(d);
  es('el que queda se numera 1', m.circPods(d)[0].n, 1);
  es('pero conserva su id', m.circPods(d)[0].id, 'p2');
  es('y su vínculo', m.circPods(d)[0].estacionId, 'e3');
}

/* --- 6. estaciones sin id: se les pone uno ------------------------------ */
{
  const c = viejoConPods();
  c.estaciones.forEach(function (s) { delete s.id; });
  c.blazePlan.estacion = 'Estación 3';
  m.circMigrarUno(c);
  cierto('toda estación acaba con id', c.estaciones.every(function (s) { return !!s.id; }));
  es('los ids son distintos', new Set(c.estaciones.map(function (s) { return s.id; })).size, 6);
  es('y el vínculo apunta a la estación 3', m.circPods(c)[0].estacionId, c.estaciones[2].id);
}

/* --- 7. basura: solo lectura, nunca descartar --------------------------- */
{
  const roto = { id: 'x', nombre: 'Roto', estaciones: { no: 'es un array' } };
  Object.defineProperty(roto, 'espacio', { get: function () { throw new Error('ilegible'); } });
  const c = m.circMigrarUno(roto);
  cierto('el circuito sigue ahí', !!c);
  cierto('marcado como solo lectura', c._ro);
  cierto('y sin marcar como migrado, para reintentarlo', c.pv !== m.CIRC_PV);

  es('null no rompe', m.circMigrarUno(null), null);
  es('un texto no rompe', m.circMigrarUno('hola'), 'hola');
}

/* --- 8. la configuración de luz, acotada -------------------------------- */
{
  const d = m.circPodsConfigNueva();
  es('el modo por defecto', d.modo, 'random');
  es('3 s de respuesta por defecto', d.tiempoRespuestaMs, 3000);
  cierto('aleatorio por defecto', d.aleatorio);
  es('cuatro colores por defecto', d.colores.length, 4);

  const a = m.circPodsConfig({ modo: 'inventado', tiempoRespuestaMs: 0, colores: ['verde', 'nada'], simultaneos: 99, disparo: 'x', semilla: '' });
  es('un modo que no existe cae en random', a.modo, 'random');
  es('un tiempo imposible cae en el defecto', a.tiempoRespuestaMs, 3000);
  es('los colores que no existen se caen', a.colores, ['verde']);
  es('los simultáneos se acotan al tope', a.simultaneos, m.CIRC_MAX_PODS);
  es('un disparo que no existe cae en intervalo', a.disparo, 'intervalo');
  es('una semilla vacía cae en us19', a.semilla, 'us19');

  const b = m.circPodsConfig({ colores: [] });
  es('sin colores válidos se reponen los del defecto', b.colores.length, 4);
  const cc = m.circPodsConfig(null);
  es('null da la configuración por defecto', cc.modo, 'random');
  es('la luz sigue al intervalo si no se dice', m.circPodsConfig({ intervalo: 4 }).luz, 4);

  /* Guardar y leer por grupo, sin que un grupo pise al otro. */
  const c = m.circMigrarUno(viejoConPods());
  m.circPodsConfigPoner(c, 'e3', { modo: 'focus', tiempoRespuestaMs: 900 });
  m.circPodsConfigPoner(c, null, { modo: 'todos' });
  es('la estación guarda la suya', m.circPodsConfigDe(c, 'e3').modo, 'focus');
  es('con su tiempo', m.circPodsConfigDe(c, 'e3').tiempoRespuestaMs, 900);
  es('los sueltos guardan la suya', m.circPodsConfigDe(c, null).modo, 'todos');
  es('y no se pisan', m.circPodsConfigDe(c, 'e3').modo, 'focus');
  es('una estación que no existe da el defecto', m.circPodsConfigDe(c, 'zzz').modo, 'random');
}

/* --- 9. cambiar de plantilla conserva las fracciones -------------------- */
{
  const c = m.circMigrarUno(viejoConPods());
  const antesPods = m.circPods(c).map(function (p) { return [p.x, p.y]; });
  const antesEl = m.circElementos(c).map(function (e) { return [e.x, e.y]; });
  /* Cambiar de plantilla es cambiar los metros: las x,y son fracciones y no se
     tocan. Si algún día alguien las reproyecta, esta prueba lo caza. */
  c.espacio = { plantilla: 'gym', anchoM: 10, largoM: 4.5, cuadricula: true, medidas: true };
  const e = m.circEspacio(c);
  es('el espacio nuevo manda', [e.plantilla, e.anchoM, e.largoM], ['gym', 10, 4.5]);
  casi('y la proporción se recalcula', m.circRatio(c), 10 / 4.5);
  es('los Pods no se mueven', m.circPods(c).map(function (p) { return [p.x, p.y]; }), antesPods);
  es('los elementos no se mueven', m.circElementos(c).map(function (x) { return [x.x, x.y]; }), antesEl);

  /* Las medidas se acotan: nadie define una sala de 0 m ni de 500 m. */
  const d = m.circEspacio({ espacio: { plantilla: 'gym', anchoM: 0, largoM: 900 } });
  es('un ancho de 0 cae en el de la plantilla', d.anchoM, 10);
  es('un largo de 900 m se acota a 200', d.largoM, 200);
}

/* --- 10. el índice de una estación -------------------------------------- */
{
  const c = m.circMigrarUno(viejoConPods());
  es('la estación 3 es el índice 2', m.circEstacionIdx(c, 'e3'), 2);
  es('una que no existe da -1', m.circEstacionIdx(c, 'zzz'), -1);
  es('por nombre, sin tildes ni mayúsculas', m.circEstacionPorNombre(c, 'ESTACION 3').id, 'e3');
  es('un nombre vacío no encuentra nada', m.circEstacionPorNombre(c, ''), null);
}

/* --- salida -------------------------------------------------------------- */
console.log('\nUS19-APP · planilla única (espacio, Pods y elementos)');
console.log('archivo: ' + ruta);
if (fallos.length) {
  console.log('\n  FALLOS: ' + fallos.length + '\n');
  fallos.forEach(function (f, i) { console.log('  ' + (i + 1) + ') ' + f); });
  console.log('\n  comprobaciones OK: ' + ok + '  ·  fallos: ' + fallos.length + '\n');
  process.exit(1);
}
console.log('  comprobaciones OK: ' + ok + '  ·  sin fallos\n');
