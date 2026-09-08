/* =====================================================================
 * US19-APP · la escalera de un ejercicio, contra el catálogo real
 *
 *   node tools/escalera.js [ruta/index.html]
 *
 * «Cómo construirlo» propone por dónde empezar y cómo ir subiendo. Lo
 * propone una cuenta hecha sobre el NOMBRE del ejercicio, así que puede
 * salir mal de dos maneras: ordenando al revés, o llamando familia a lo
 * que no lo es. Las dos se ven aquí, sobre los 2.377 ejercicios de
 * verdad y no sobre ejemplos inventados.
 *
 * Y hay una tercera cosa que comprobar y que no es técnica: que la guía
 * no use vocabulario clínico. Diego es interno hasta que llegue el
 * título, a inicios de 2027, y la app tiene superficie que ve el socio.
 *
 * Regla de oro, la de siempre: si algo no se encuentra, esto FALLA.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');
const rutaCat = path.join(path.dirname(ruta), 'us19_catalogo.json');

let ok = 0, fallos = [];
const pasa = () => ok++;
const falla = (n, d) => fallos.push(n + (d ? '  →  ' + d : ''));
const comprobar = (n, c, d) => (c ? pasa() : falla(n, d));
const igual = (n, a, b) => (a === b ? pasa() : falla(n, 'esperaba ' + JSON.stringify(b) + ', obtuvo ' + JSON.stringify(a)));

function abortar(motivo) {
  console.log('\nUS19-APP · escalera de ejercicios\narchivo: ' + ruta + '\n');
  console.log('  ✗ ' + motivo + '\n');
  console.log('comprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + (fallos.length + 1));
  process.exit(1);
}

/* --- 1 · Sacar las piezas del archivo ------------------------------- */

function trozo(ini, fin, comoSeLlama) {
  const a = src.indexOf(ini), b = src.indexOf(fin);
  if (a < 0) abortar('no encuentro "' + ini + '" (¿se movió ' + comoSeLlama + '?)');
  if (b < 0) abortar('no encuentro "' + fin + '" (¿se movió el final de ' + comoSeLlama + '?)');
  if (b < a) abortar('los marcadores de ' + comoSeLlama + ' están al revés');
  return src.slice(a, b);
}

const modulo = trozo('var U19_ESC_REGLAS', 'window.u19ComoConstruir', 'el módulo de la escalera');
const normalizador = trozo('function musNorm(s){', '/* Coincide si la consulta', 'musNorm');
const guiaTxt = trozo('var U19_ESC_GUIA = {', 'function u19EscGuia', 'la guía de patrones');

['u19EscPuntos', 'u19EscBanda', 'u19EscEscalera', 'u19EscGuia', 'u19EscRaiz', 'u19EscEsClip', 'u19EscClips'].forEach(f => {
  if (modulo.indexOf('function ' + f) < 0) abortar('el módulo extraído no contiene ' + f + '()');
});

/* --- 2 · El catálogo de verdad -------------------------------------- */

if (!fs.existsSync(rutaCat)) abortar('no encuentro us19_catalogo.json junto a index.html');
const catalogo = JSON.parse(fs.readFileSync(rutaCat, 'utf8'));
if (!Array.isArray(catalogo) || catalogo.length < 2000) abortar('el catálogo trae ' + (catalogo.length || 0) + ' ejercicios; esperaba más de 2.000');

const ctx = {
  state: { exercises: catalogo },
  /* libTaxDe de verdad usa deducción por nombre cuando faltan campos. En
     el catálogo están los tres puestos en las 2.377 fichas, así que aquí
     basta leerlos — y si algún día faltaran, la comprobación de abajo lo
     dice en vez de pasar en verde. */
  libTaxDe: e => ({ cat: e.cat || '', pat: e.pat || '', niv: e.niv || '' }),
  console, Math, JSON, String, Object, RegExp, Array,
};
vm.createContext(ctx);
vm.runInContext(normalizador + '\n' + modulo, ctx);
const api = vm.runInContext('({ u19EscPuntos, u19EscBanda, u19EscEscalera, u19EscGuia, u19EscRaiz, u19EscEsClip, u19EscClips, U19_ESC_BANDAS, U19_ESC_REGLAS, U19_ESC_GUIA })', ctx);

const porNombre = n => catalogo.find(e => e.name === n);
const nombre = e => e.name;

/* --- 3 · El caso que pidió Diego: el puente ------------------------- */

const sinTax = catalogo.filter(e => !e.cat || !e.niv).length;
comprobar('catálogo · las fichas traen cat y niv (si no, libTaxDe deduce y esta suite mide otra cosa)',
  sinTax === 0, sinTax + ' fichas sin clasificar');

const puente = porNombre('Puente de glúteos');
comprobar('puente · «Puente de glúteos» sigue en el catálogo', !!puente);
if (!puente) abortar('sin el puente base no se puede probar el caso que pidió Diego');

const base = { name: 'Puente de glúteos', muscle: 'Glúteos', pat: 'Bisagra', cat: 'Fuerza', niv: 'Principiante' };
const escaleraPuente = api.u19EscEscalera(puente).map(nombre);
comprobar('puente · la escalera tiene varios escalones de verdad', escaleraPuente.length >= 8,
  'salieron ' + escaleraPuente.length);

/* Lo que importa no es el orden exacto, es que lo fácil quede por debajo
   de lo difícil. Estos tres pares son los que se usarían en la sala. */
const pos = n => escaleraPuente.indexOf(n);
[
  ['Puente de glúteos con banda — activación', 'Puente de glúteos'],
  ['Puente de glúteos', 'Puente de glúteos a una pierna'],
  ['Puente de glúteos', 'Puente de glúteos dos piernas en banco con barra'],
  ['Puente de glúteos', 'Puente de glúteos con piernas extendidas'],
].forEach(([facil, dificil]) => {
  const a = pos(facil), b = pos(dificil);
  comprobar('puente · «' + facil + '» va antes que «' + dificil + '»',
    a >= 0 && b >= 0 && a < b, 'posiciones ' + a + ' y ' + b);
});

const famPuente = api.u19EscEscalera(puente);
const banda = (nom, fam) => api.u19EscBanda(porNombre(nom), fam || famPuente);
igual('puente · la activación con banda cae en el primer escalón',
  banda('Puente de glúteos con banda — activación'), 1);
comprobar('puente · el de una pierna sube de escalón respecto al base',
  banda('Puente de glúteos a una pierna') > banda('Puente de glúteos'));

/* --- 3 quater · Los escalones son RELATIVOS a la familia ------------
   Con una escala absoluta, «Dominadas asistidas» caía en el segundo
   escalón y el primero se quedaba VACÍO: justo lo que pidió Diego —«si
   no puede hacerlo, por dónde empieza»— no aparecía. Una dominada
   asistida es difícil en absoluto y fácil dentro de las dominadas, y
   aquí solo importa lo segundo. */

const conPrimerPeldano = [];
const sinPrimerPeldano = [];
['Puente de glúteos', 'Flexiones', 'Sentadilla', 'Dominadas', 'Peso muerto', 'Plancha'].forEach(nm => {
  const b = porNombre(nm);
  if (!b) { falla('relativo · «' + nm + '» ya no está en el catálogo'); return; }
  const fam = api.u19EscEscalera(b);
  comprobar('relativo · «' + nm + '» tiene escalera', fam.length >= 5, fam.length + ' peldaños');
  const bandas = fam.map(e => api.u19EscBanda(e, fam));
  (bandas.indexOf(1) >= 0 ? conPrimerPeldano : sinPrimerPeldano).push(nm);
  comprobar('relativo · «' + nm + '» tiene último peldaño (escalón 4)', bandas.indexOf(4) >= 0);
});
igual('relativo · TODAS las familias grandes tienen por dónde empezar', sinPrimerPeldano.join(', '), '');

const famDom = api.u19EscEscalera(porNombre('Dominadas'));
igual('relativo · «Dominadas asistidas» es el primer peldaño de las dominadas',
  api.u19EscBanda(porNombre('Dominadas asistidas'), famDom), 1);
comprobar('relativo · y en absoluto NO lo sería: por eso hacía falta relativizar',
  api.u19EscBanda(porNombre('Dominadas asistidas')) > 1,
  'absoluto = ' + api.u19EscBanda(porNombre('Dominadas asistidas')));

igual('relativo · sin familia se cae a los cortes absolutos',
  api.u19EscBanda(porNombre('Dominadas asistidas'), null),
  api.u19EscBanda(porNombre('Dominadas asistidas')));
igual('relativo · si toda la familia cuesta lo mismo, todos al escalón 2',
  api.u19EscBanda(base, [base, Object.assign({}, base, { name: 'Puente de glúteos otro' })]), 2);

/* --- 3 bis · Mismo patrón NO es mismo gesto ------------------------
   La primera versión hacía familia con patrón + músculo. Contra el
   catálogo real eso daba 85 peldaños para el puente y terminaba en «Peso
   muerto a una mano lateral con barra»: mismo patrón (Bisagra), mismo
   músculo (Glúteos), otro ejercicio. */

igual('raíz · una palabra basta cuando no es genérica', api.u19EscRaiz('Puente de glúteos a una pierna'), 'puente');
igual('raíz · si la primera es genérica, se toma la segunda', api.u19EscRaiz('Elevación lateral con mancuernas'), 'elevacion lateral');
igual('raíz · y si esa es preposición, la tercera', api.u19EscRaiz('Press de banca con barra'), 'press de banca');
igual('raíz · las tildes y los signos no cambian la raíz',
  api.u19EscRaiz('Dominadas — activación del dorsal'), api.u19EscRaiz('dominadas asistidas'));

comprobar('gesto · el peso muerto NO entra en la escalera del puente',
  escaleraPuente.every(n => !/peso muerto/i.test(n)),
  escaleraPuente.filter(n => /peso muerto/i.test(n)).join(' · '));
comprobar('gesto · y la escalera del puente es de tamaño usable, no un cajón',
  escaleraPuente.length >= 8 && escaleraPuente.length <= 25, escaleraPuente.length + ' peldaños');

/* --- 3 ter · Clips de técnica: fuera de la escalera, dentro de la guía */

comprobar('clip · «(2.ª demostración)» es un clip', api.u19EscEsClip({ name: 'Abdominales — zona trabajada (2.ª demostración)' }));
comprobar('clip · «(2.ª versión)» es un clip', api.u19EscEsClip({ name: 'Abdominal bicicleta (2.ª versión)' }));
comprobar('clip · «— anchura de agarre» es un clip', api.u19EscEsClip({ name: 'Press de banca — anchura de agarre' }));
comprobar('clip · «— recorrido completo» es un clip', api.u19EscEsClip({ name: 'Remo — recorrido y control' }));
/* LA TRAMPA: el guion largo NO basta. Esta es una regresión de verdad y
   de las más útiles; si se cuela como clip, desaparece del primer
   escalón justo del caso que pidió Diego. */
comprobar('clip · «— activación» NO es un clip, es una regresión',
  !api.u19EscEsClip({ name: 'Puente de glúteos con banda — activación' }));
comprobar('clip · un nombre normal tampoco lo es',
  !api.u19EscEsClip({ name: 'Puente de glúteos a una pierna' }));

comprobar('clip · la activación con banda sigue DENTRO de la escalera del puente',
  escaleraPuente.indexOf('Puente de glúteos con banda — activación') >= 0);
const clipsEnEscalera = api.u19EscEscalera(puente).filter(api.u19EscEsClip);
igual('clip · y ningún clip se cuela en la escalera', clipsEnEscalera.length, 0);

const clipsPuente = api.u19EscClips(puente);
comprobar('clip · los clips que salen son del mismo movimiento',
  clipsPuente.every(e => api.u19EscRaiz(e.name) === api.u19EscRaiz(puente.name)),
  clipsPuente.map(nombre).join(' · '));

const totalClips = catalogo.filter(api.u19EscEsClip).length;
comprobar('clip · el catálogo tiene un buen puñado (si baja a cero, la regla dejó de reconocerlos)',
  totalClips > 200 && totalClips < 600, totalClips + ' clips');

/* --- 4 · La escalera es familia, no un cajón ------------------------ */

const mezcla = api.u19EscEscalera(puente).filter(e =>
  e.muscle !== puente.muscle || e.pat !== puente.pat || api.u19EscRaiz(e.name) !== api.u19EscRaiz(puente.name));
igual('familia · en la escalera no se cuela otro músculo, otro patrón ni otro gesto', mezcla.length, 0);
comprobar('familia · el propio ejercicio está en su escalera', escaleraPuente.indexOf(puente.name) >= 0);

/* Un ejercicio sin vecinos no debe inventarse una escalera de uno. */
const solitarios = catalogo.filter(e => {
  if (api.u19EscEsClip(e)) return false;
  const fam = catalogo.filter(o => !api.u19EscEsClip(o) && o.muscle === e.muscle
    && api.u19EscRaiz(o.name) === api.u19EscRaiz(e.name) && (e.pat ? o.pat === e.pat : o.cat === e.cat));
  return fam.length === 1;
});
if (solitarios.length) {
  igual('familia · un ejercicio sin vecinos devuelve escalera vacía, no una de uno',
    api.u19EscEscalera(solitarios[0]).length, 0);
} else { pasa(); }

/* --- 5 · Las reglas hacen lo que dicen ------------------------------ */

const con = extra => api.u19EscPuntos(Object.assign({}, base, { name: base.name + ' ' + extra })).p;
const p0 = api.u19EscPuntos(base).p;
comprobar('reglas · «a una pierna» sube', con('a una pierna') > p0);
comprobar('reglas · «con barra» sube', con('con barra') > p0);
comprobar('reglas · «con salto» sube', con('con salto') > p0);
comprobar('reglas · «asistido» baja', con('asistido') < p0);
comprobar('reglas · «de rodillas» baja', con('de rodillas') < p0);
comprobar('reglas · «isométrico» baja', con('isometrico') < p0);
comprobar('reglas · las tildes no despistan (musNorm normaliza)',
  con('isométrico') === con('isometrico'));
comprobar('reglas · el nivel del catálogo pesa',
  api.u19EscPuntos(Object.assign({}, base, { niv: 'Avanzado' })).p >
  api.u19EscPuntos(Object.assign({}, base, { niv: 'Principiante' })).p);

const porQue = api.u19EscPuntos(Object.assign({}, base, { name: 'Puente de glúteos a una pierna con barra' }));
igual('reglas · cada punto trae su por qué, para poder discutirlo', porQue.por.length, 2);
comprobar('reglas · y el por qué está escrito en cristiano, no es la expresión',
  porQue.por.every(x => x.txt.length > 15 && x.txt.indexOf('|') < 0));

/* --- 6 · Lo que pone Diego a mano manda ----------------------------- */

const aMano = Object.assign({}, base, { escManual: 4 });
igual('a mano · escManual manda sobre la cuenta', api.u19EscBanda(aMano), 4);
igual('a mano · un escManual fuera de rango se ignora',
  api.u19EscBanda(Object.assign({}, base, { escManual: 9 })), api.u19EscBanda(base));

/* --- 7 · Los cuatro escalones cubren toda la recta ------------------ */

const bandas = api.U19_ESC_BANDAS.map(b => b.n);
igual('escalones · son cuatro y van del 1 al 4', bandas.join(','), '1,2,3,4');
const fuera = catalogo.filter(e => { const b = api.u19EscBanda(e); return !(b >= 1 && b <= 4); });
igual('escalones · los 2.377 ejercicios del catálogo caen en un escalón válido', fuera.length, 0);

const reparto = {};
catalogo.forEach(e => { const b = api.u19EscBanda(e); reparto[b] = (reparto[b] || 0) + 1; });
comprobar('escalones · ninguno se queda vacío (una escalera de un solo peldaño no sirve)',
  [1, 2, 3, 4].every(b => (reparto[b] || 0) > 0), JSON.stringify(reparto));

/* --- 8 · La guía existe para cada patrón del catálogo --------------- */

const patrones = [...new Set(catalogo.map(e => e.pat).filter(Boolean))];
const sinGuia = patrones.filter(p => !api.U19_ESC_GUIA[p]);
igual('guía · todos los patrones del catálogo tienen la suya', sinGuia.join(', '), '');
comprobar('guía · y un ejercicio sin patrón cae en la genérica en vez de romperse',
  !!api.u19EscGuia({ name: 'x', pat: '', cat: '' }).pasos);

Object.keys(api.U19_ESC_GUIA).forEach(p => {
  const g = api.U19_ESC_GUIA[p];
  comprobar('guía · ' + p + ' · cuatro pasos, en orden', Array.isArray(g.pasos) && g.pasos.length === 4,
    g.pasos && g.pasos.length);
  comprobar('guía · ' + p + ' · dice qué mirar', Array.isArray(g.mirar) && g.mirar.length >= 3);
  comprobar('guía · ' + p + ' · el criterio para subir es medible (trae un número)',
    /\b(dos|tres|ocho|diez|doce|quince|treinta|\d)\b/i.test(g.subir || ''), g.subir);
});

/* --- 9 · Nada de vocabulario clínico -------------------------------- */
/* Regla de Diego, 8-sep-2026. No es cosmética: la web, la ficha y el bot
   dicen por escrito que Ultra-Sport 19 no presta atención de salud, y la
   app tiene superficie que ve el socio. */

const PROHIBIDAS = /\b(paciente|pacientes|lesion|lesión|lesiones|lesionad|rehabilitaci|tratamiento|tratar|diagnostic|diagnóstic|patolog|terapia|fisioterap|kinesiolog|dolencia|deficit funcional)/i;
const zonas = [
  ['la guía de patrones', guiaTxt],
  ['el módulo entero', modulo],
];
zonas.forEach(([comoSeLlama, txt]) => {
  const linea = txt.split('\n').find(l => PROHIBIDAS.test(l) && l.indexOf('PROHIBIDAS') < 0);
  comprobar('vocabulario · ' + comoSeLlama + ' no usa lenguaje clínico',
    !linea, linea && linea.trim().slice(0, 110));
});

/* --- 10 · Y el botón está donde se ve ------------------------------- */

comprobar('interfaz · el botón está en la tarjeta de la biblioteca',
  /onclick="u19ComoConstruir/.test(src));
comprobar('interfaz · y en la ficha del ejercicio',
  src.indexOf('data-act="construir"') > 0 && src.indexOf('act === "construir"') > 0);

/* --- 11 · El modal, ejecutado de verdad ------------------------------
   Todo lo de arriba prueba la lógica. Lo que Diego toca es el modal, y
   ahí un escapeHtml mal escrito o una variable que no existe no se ve
   hasta que se pulsa el botón. Así que se ejecuta con un navegador de
   mentira y se mira el HTML que produce. */

const moduloUI = trozo('var U19_ESC_REGLAS', '/* ------------------------------------------------------------\n   E · PORTABILIDAD', 'el módulo con su modal');
if (moduloUI.indexOf('u19ComoConstruir') < 0) abortar('el trozo con el modal no contiene u19ComoConstruir');

let pintado = null, avisos = [];
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ctxUI = {
  state: { exercises: catalogo },
  libTaxDe: ctx.libTaxDe,
  libThumbHtml: () => '<i>gif</i>',
  escapeHtml: esc, escapeAttr: esc,
  openModal: o => { pintado = o; },
  closeModal: () => {},
  toast: (t) => avisos.push(t),
  saveState: () => {},
  u19Sustitutos: () => {},
  showExercisePreview: () => {},
  window: {},
  console, Math, JSON, String, Object, RegExp, Array, Infinity, Number,
};
ctxUI.window = ctxUI;
vm.createContext(ctxUI);
vm.runInContext(normalizador + '\n' + moduloUI, ctxUI);

try {
  vm.runInContext('u19ComoConstruir(' + JSON.stringify(puente.id) + ')', ctxUI);
  pasa();
} catch (e) {
  falla('modal · u19ComoConstruir revienta al abrirlo', e && e.message);
}
if (pintado) {
  const html = pintado.bodyHtml || '';
  comprobar('modal · el título lleva el nombre del ejercicio', (pintado.title || '').indexOf(puente.name) > 0, pintado.title);
  comprobar('modal · trae la guía de cómo se construye', /Cómo se construye/.test(html));
  comprobar('modal · trae la escalera', /La escalera/.test(html));
  comprobar('modal · marca dónde está el ejercicio actual', /estás aquí/.test(html));
  comprobar('modal · dice qué mirar', /Qué mirar mientras/.test(html));
  comprobar('modal · dice cuándo subir', /Cuándo pasar al escalón siguiente/.test(html));
  comprobar('modal · explica por qué está en ese escalón', /Por qué está en el escalón/.test(html));
  comprobar('modal · deja moverlo a mano', /u19EscMover/.test(html));
  comprobar('modal · nombra los cuatro pasos de la guía del patrón',
    (html.match(/<li>/g) || []).length >= 7);
  comprobar('modal · el primer peldaño de la escalera del puente sale nombrado',
    html.indexOf('activación') > 0);
  /* Que no se cuele HTML sin escapar desde el nombre de un ejercicio. */
  const conComillas = { id: 'zz-test', name: 'Puente <img src=x onerror=alert(1)> "raro"', muscle: puente.muscle, pat: puente.pat, cat: puente.cat, niv: 'Principiante' };
  catalogo.push(conComillas);
  try {
    vm.runInContext('u19ComoConstruir("zz-test")', ctxUI);
    comprobar('modal · un nombre con HTML dentro sale escapado, no interpretado',
      (pintado.bodyHtml || '').indexOf('<img src=x') < 0);
  } catch (e) {
    falla('modal · revienta con un nombre raro', e && e.message);
  }
  catalogo.pop();
} else {
  falla('modal · no llegó a pintar nada');
}

/* Y mover un escalón a mano no debe reventar. */
try {
  vm.runInContext('u19EscMover(' + JSON.stringify(puente.id) + ', 1)', ctxUI);
  comprobar('modal · subirlo a mano deja escManual puesto', puente.escManual >= 1 && puente.escManual <= 4, puente.escManual);
  vm.runInContext('u19EscMover(' + JSON.stringify(puente.id) + ', 0)', ctxUI);
  igual('modal · y volver al automático lo quita', puente.escManual, undefined);
} catch (e) {
  falla('modal · u19EscMover revienta', e && e.message);
}

/* --- salida ---------------------------------------------------------- */

console.log('\nUS19-APP · escalera de ejercicios');
console.log('archivo: ' + ruta);
console.log('  · catálogo: ' + catalogo.length + ' ejercicios · reparto por escalón: '
  + [1, 2, 3, 4].map(b => b + ':' + (reparto[b] || 0)).join(' · '));
console.log('  · clips de técnica reconocidos: ' + totalClips);
console.log('  · la escalera del puente, que es el caso que pidió Diego:');
famPuente.forEach(e => console.log('      ' + api.u19EscBanda(e, famPuente) + ' · ' + e.name));
console.log('');
if (fallos.length) {
  console.log('FALLOS (' + fallos.length + '):');
  fallos.forEach(f => console.log('  ✗ ' + f));
  console.log('\ncomprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + fallos.length);
  process.exit(1);
}
console.log('comprobaciones OK: ' + ok + '  ·  sin fallos');
process.exit(0);
