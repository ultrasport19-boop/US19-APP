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

/* Quién tiene familia, en UNA pasada. Preguntárselo a `u19EscEscalera`
   ejercicio por ejercicio son 2.377 × 2.377 con expresiones regulares
   dentro: la suite pasaba de tres segundos a más de dos minutos, y esto
   corre en cada commit. Se agrupa por la misma clave que usa la función
   —raíz + músculo + patrón (o tipo, si no hay patrón)— y más abajo se
   comprueba contra la función de verdad que agrupar así es equivalente. */
const claveFamilia = e => api.u19EscRaiz(e.name) + '|' + (e.muscle || '')
  + '|' + (e.pat ? 'P:' + e.pat : 'C:' + (e.cat || ''));
const noClips = catalogo.filter(e => !api.u19EscEsClip(e));
const tamFamilia = new Map();
noClips.forEach(e => { const k = claveFamilia(e); tamFamilia.set(k, (tamFamilia.get(k) || 0) + 1); });
const tieneFamilia = e => !api.u19EscEsClip(e) && (tamFamilia.get(claveFamilia(e)) || 0) >= 2;

/* Y que ese atajo diga lo mismo que la función, no lo que me convenga. */
const desacuerdos = noClips.filter((e, i) => i % 37 === 0)
  .filter(e => tieneFamilia(e) !== (api.u19EscEscalera(e).length > 0));
igual('atajo · agrupar por raíz+músculo+patrón da lo mismo que preguntar una a una',
  desacuerdos.length, 0);

const conFamilia = noClips.filter(tieneFamilia);

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
/* Con el mapa de familias ya calculado: filtrar el catálogo dentro de un
   filtro del catálogo son 2.377² con expresiones regulares, y esto corre
   en el hook de cada commit. */
const solitarios = noClips.filter(e => !tieneFamilia(e));
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
  /* El constructor de rutinas, de mentira: lo justo para que la escalera
     pueda cambiar un ejercicio sin salir. */
  _builderRoutine: { days: [{ day: 1, exercises: [] }] },
  _builderActiveDay: 0,
  renderDayPanel: () => {},
  updateDayTabBadge: () => {},
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

/* --- 12 · La escalera dentro del constructor de rutinas -------------
   El momento en que hace falta bajar un escalón no es mirando la
   biblioteca: es escribiendo la rutina de alguien y viendo que el
   ejercicio le queda grande. Y lo que hace que se use de verdad es que
   NO haya que volver a escribir series, pesos y descansos. */

const otroPeldano = famPuente.find(e => e.id !== puente.id);

vm.runInContext('u19ComoConstruir(' + JSON.stringify(puente.id) + ')', ctxUI);
comprobar('rutina · desde la biblioteca NO aparece «Poner»',
  (pintado.bodyHtml || '').indexOf('u19EscPonerEnRutina') < 0);

vm.runInContext(`_builderRoutine.days[0].exercises = [{
  exerciseId: ${JSON.stringify(puente.id)}, sets: "4", reps: "12", weight: "20", rest: "90s", rir: "2", notes: "ojo con la cadera"
}];`, ctxUI);
try {
  vm.runInContext('u19EscDesdeRutina(0)', ctxUI);
  pasa();
} catch (e) { falla('rutina · u19EscDesdeRutina revienta', e && e.message); }

const htmlRut = pintado.bodyHtml || '';
comprobar('rutina · desde una fila SÍ aparece «Poner»', htmlRut.indexOf('u19EscPonerEnRutina(0,') > 0);
comprobar('rutina · y el aviso explica que conserva series y pesos', /conservando series/.test(htmlRut));
const ponerEnElActual = new RegExp('u19EscPonerEnRutina\\(0,.?' + puente.id).test(htmlRut);
comprobar('rutina · el ejercicio actual no lleva «Poner» (ya está puesto)', !ponerEnElActual);

/* LO QUE IMPORTA: cambiar el peldaño sin perder la prescripción. Borrar
   la fila y volver a añadirla desde el selector la pierde entera, y por
   eso bajar un escalón daba pereza. */
try {
  vm.runInContext('u19EscPonerEnRutina(0, ' + JSON.stringify(otroPeldano.id) + ')', ctxUI);
  const fila = vm.runInContext('_builderRoutine.days[0].exercises[0]', ctxUI);
  igual('rutina · el ejercicio cambia al peldaño elegido', fila.exerciseId, otroPeldano.id);
  igual('rutina · conserva las series', fila.sets, '4');
  igual('rutina · conserva las repeticiones', fila.reps, '12');
  igual('rutina · conserva el peso', fila.weight, '20');
  igual('rutina · conserva el descanso', fila.rest, '90s');
  igual('rutina · conserva el RIR', fila.rir, '2');
  igual('rutina · conserva las notas', fila.notes, 'ojo con la cadera');
} catch (e) {
  falla('rutina · u19EscPonerEnRutina revienta', e && e.message);
}

/* Y no debe romperse si la fila ya no está — ni callarse, que es peor:
   el ejercicio se quedaría como estaba sin que nadie lo supiera.
   OJO: hay que vaciar los avisos antes, porque el cambio de arriba dejó
   el suyo y «hay algún aviso» pasaría en verde sin probar nada. */
avisos.length = 0;
try {
  vm.runInContext('u19EscPonerEnRutina(9, ' + JSON.stringify(otroPeldano.id) + ')', ctxUI);
  comprobar('rutina · una fila que no existe avisa, en vez de reventar o callarse',
    avisos.some(a => /no encuentro/i.test(String(a))), JSON.stringify(avisos));
} catch (e) {
  falla('rutina · revienta con una fila que no existe', e && e.message);
}
avisos.length = 0;
try {
  vm.runInContext('u19EscPonerEnRutina(0, "no-existe-este-id")', ctxUI);
  comprobar('rutina · un ejercicio que no existe también avisa',
    avisos.some(a => /no encontrado/i.test(String(a))), JSON.stringify(avisos));
} catch (e) {
  falla('rutina · revienta con un ejercicio que no existe', e && e.message);
}

/* --- 13 · La escalera dentro de «En vivo» ---------------------------
   El momento en que más se necesita: la serie empezada, la persona
   delante, y se ve que el ejercicio le queda grande. */

vm.runInContext('u19ComoConstruir(' + JSON.stringify(puente.id) + ', "vivo")', ctxUI);
const htmlVivo = pintado.bodyHtml || '';
comprobar('vivo · el «Poner» llama a la sesión, no al constructor',
  htmlVivo.indexOf('rlPonerEscalon(') > 0 && htmlVivo.indexOf('u19EscPonerEnRutina') < 0);
comprobar('vivo · el aviso dice que no se pierde la sesión', /sin salir de la sesión/.test(htmlVivo));

/* EL FALLO QUE CASI SE CUELA, Y NO ERA DE LÓGICA. La vista en vivo es
   `.circ-live` con z-index 9000 y el modal `.modal-overlay` con 100: sin
   una regla que lo suba, la escalera se abre DETRÁS de la pantalla negra
   y el botón parece no hacer nada. */
comprobar('vivo · el CSS sube el modal por encima de la vista viva',
  /body\.circ-live-open\s+\.modal-overlay\s*\{[^}]*z-index\s*:\s*9[0-9]{3}/.test(src),
  'falta la regla body.circ-live-open .modal-overlay{z-index:…}');
const zLive = (src.match(/\.circ-live\{[^}]*z-index\s*:\s*(\d+)/) || [])[1];
const zModalVivo = (src.match(/body\.circ-live-open\s+\.modal-overlay\s*\{[^}]*z-index\s*:\s*(\d+)/) || [])[1];
comprobar('vivo · y lo sube DE VERDAD por encima, no por poco',
  Number(zModalVivo) > Number(zLive), 'modal ' + zModalVivo + ' vs vista viva ' + zLive);

/* La lógica de la sesión, ejecutada. */
const moduloVivo = trozo('function rlPuedeEscalera(p){', 'window.rlToggle = function(){', 'la escalera de «En vivo»');
const puente2 = api.u19EscEscalera(puente)[0];
let repintados = 0, guardados = 0, avisosVivo = [];
const ctxVivo = {
  _rl: null, _rlFichas: null,
  rlFase: () => ctxVivo._rl.plan[ctxVivo._rl.i],
  rlPintar: () => { repintados++; },
  rlToggle: () => { ctxVivo._rl.corriendo = !ctxVivo._rl.corriendo; },
  getExercise: id => catalogo.find(e => e.id === id) || null,
  state: { routines: [] },
  saveState: () => { guardados++; },
  closeModal: () => {},
  toast: t => avisosVivo.push(t),
  u19ComoConstruir: () => {},
  window: {}, console, Math, JSON, String, Object, Array, Number,
};
ctxVivo.window = ctxVivo;
vm.createContext(ctxVivo);
vm.runInContext(moduloVivo, ctxVivo);

function sesionDePrueba() {
  const fila = { exerciseId: puente.id, sets: '3', reps: '12', weight: '20', rest: '90s' };
  const rutina = { name: 'De prueba', days: [{ day: 1, exercises: [fila] }] };
  const plan = [
    { tipo: 'serie', ex: fila, e: puente, serie: 1, series: 3, idx: 0, total: 1 },
    { tipo: 'descanso', ex: fila, e: puente, idx: 0, siguiente: { ex: fila, e: puente, serie: 2 } },
    { tipo: 'serie', ex: fila, e: puente, serie: 2, series: 3, idx: 0, total: 1 },
    { tipo: 'fin', dur: 0 },
  ];
  return { r: rutina, plan, i: 2, corriendo: false, fila };
}

ctxVivo._rl = sesionDePrueba();
comprobar('vivo · con una serie delante, el botón aparece',
  vm.runInContext('rlPuedeEscalera(rlFase())', ctxVivo));
ctxVivo._rl.i = 3;
comprobar('vivo · en la pantalla de «terminada» no aparece',
  !vm.runInContext('rlPuedeEscalera(rlFase())', ctxVivo));
ctxVivo._rl.i = 2;

/* EL SOCIO NO CAMBIA SU PROPIA RUTINA. Cuando llega por enlace
   compartido, `_rlFichas` trae las fichas del enlace: eso es modo
   lectura. */
ctxVivo._rlFichas = { [puente.id]: puente };
comprobar('vivo · en la vista del socio (rutina compartida) NO aparece',
  !vm.runInContext('rlPuedeEscalera(rlFase())', ctxVivo));
ctxVivo._rlFichas = null;

/* El cambio de peldaño no puede rehacer el plan: se perdería el
   cronómetro, la serie en curso y el progreso. */
const antesI = ctxVivo._rl.i, antesPlan = ctxVivo._rl.plan;
repintados = 0; guardados = 0; avisosVivo = [];
vm.runInContext('rlPonerEscalon(' + JSON.stringify(puente2.id) + ')', ctxVivo);
igual('vivo · la fila apunta al peldaño nuevo', ctxVivo._rl.fila.exerciseId, puente2.id);
igual('vivo · la serie en curso NO se pierde', ctxVivo._rl.i, antesI);
comprobar('vivo · el plan es el mismo objeto: no se rehace', ctxVivo._rl.plan === antesPlan);
comprobar('vivo · todas las fases de esa fila apuntan al ejercicio nuevo',
  ctxVivo._rl.plan.filter(f => f.ex === ctxVivo._rl.fila).every(f => f.e && f.e.id === puente2.id));
comprobar('vivo · y también el «siguiente» del descanso',
  ctxVivo._rl.plan[1].siguiente.e.id === puente2.id);
igual('vivo · se repinta una vez', repintados, 1);
igual('vivo · una rutina que no está guardada no toca el disco', guardados, 0);
comprobar('vivo · y avisa de lo que pasó', avisosVivo.some(a => /Ahora va/.test(String(a))));

/* Si la rutina SÍ es una de las guardadas, el cambio se queda. */
ctxVivo._rl = sesionDePrueba();
ctxVivo.state.routines = [ctxVivo._rl.r];
guardados = 0; avisosVivo = [];
vm.runInContext('rlPonerEscalon(' + JSON.stringify(puente2.id) + ')', ctxVivo);
igual('vivo · una rutina guardada sí se guarda', guardados, 1);
comprobar('vivo · y se dice, para que no sea una sorpresa el martes',
  avisosVivo.some(a => /queda guardado/.test(String(a))));

/* Un id que no existe no debe dejar la sesión a medias. */
ctxVivo._rl = sesionDePrueba();
ctxVivo.state.routines = [];
avisosVivo = [];
vm.runInContext('rlPonerEscalon("no-existe")', ctxVivo);
igual('vivo · un ejercicio inexistente no toca la fila', ctxVivo._rl.fila.exerciseId, puente.id);
comprobar('vivo · y lo dice', avisosVivo.some(a => /no encontrado/i.test(String(a))));

/* --- 14 · «Cómo entrena» en la ficha del cliente --------------------
   La idea 8 que Diego dejó apuntada el 7-sep, que solo ahora se puede
   contestar entera: qué patrones toca esa persona y en qué escalón. */

const moduloFicha = trozo('var FICHA_PATRONES', 'function fichaEntrenamiento(c){', 'el bloque «Cómo entrena»');

const ctxFicha = Object.create(null);
Object.assign(ctxFicha, {
  state: { routines: [], exercises: catalogo },
  getExercise: id => catalogo.find(e => e.id === id) || null,
  libTaxDe: ctx.libTaxDe,
  escapeHtml: esc,
  u19Bloque: (t, cuerpo) => '<BLOQUE t="' + t + '">' + cuerpo + '</BLOQUE>',
  console, Math, JSON, String, Object, Number, Array, RegExp, parseInt, Infinity,
});
ctxFicha.window = ctxFicha;
vm.createContext(ctxFicha);
/* Necesita la escalera al lado: de ahí saca el escalón. */
vm.runInContext(normalizador + '\n' + trozo('var U19_ESC_REGLAS', 'window.u19ComoConstruir', 'la escalera') + '\n' + moduloFicha, ctxFicha);

/* Cuántas veces se recorre el catálogo: la ficha memoriza por id porque
   `u19EscEscalera` recorre las 2.377 fichas en cada llamada. */
let vecesEscalera = 0;
vm.runInContext('u19EscEscalera_original = u19EscEscalera;', ctxFicha);
ctxFicha.u19EscEscalera_contada = function (e) { vecesEscalera++; return ctxFicha.u19EscEscalera_original(e); };
vm.runInContext('u19EscEscalera = u19EscEscalera_contada;', ctxFicha);

function fichaCon(rutinas) {
  ctxFicha.state.routines = rutinas;
  vecesEscalera = 0;
  return vm.runInContext('fichaComoEntrena({ id: "cl1" })', ctxFicha);
}
const exDe = (pat, n) => conFamilia.filter(e => e.pat === pat).slice(0, n);
const filaDe = (e, sets) => ({ exerciseId: e.id, sets: String(sets) });

igual('ficha · sin rutinas no pinta el bloque', fichaCon([]), '');
igual('ficha · una rutina archivada no cuenta',
  fichaCon([{ clientId: 'cl1', status: 'archived', days: [{ exercises: [filaDe(exDe('Empuje', 1)[0], 4)] }] }]), '');
igual('ficha · una rutina de OTRO cliente tampoco',
  fichaCon([{ clientId: 'otro', days: [{ exercises: [filaDe(exDe('Empuje', 1)[0], 4)] }] }]), '');
igual('ficha · filas que apuntan a ejercicios borrados no pintan ocho barras a cero',
  fichaCon([{ clientId: 'cl1', days: [{ exercises: [{ exerciseId: 'ya-no-existe', sets: '4' }] }] }]), '');

const emp = exDe('Empuje', 2), trac = exDe('Tracción', 1), core = exDe('Core', 1);
const rutina = [{ clientId: 'cl1', days: [
  { exercises: [filaDe(emp[0], 4), filaDe(emp[1], 3)] },
  { exercises: [filaDe(trac[0], 5), filaDe(core[0], 2)] },
]}];
const htmlFicha = fichaCon(rutina);
comprobar('ficha · con rutinas activas sí pinta el bloque', htmlFicha.indexOf('Cómo entrena') > 0);
comprobar('ficha · suma las series de los dos días', /14 series por semana/.test(htmlFicha),
  (htmlFicha.match(/\d+ series por semana/) || [])[0]);
comprobar('ficha · suma las series del mismo patrón (4+3 de empuje)', /7 ser\./.test(htmlFicha));
comprobar('ficha · nombra los patrones que se quedan en cero',
  /Sin series: <b>[^<]*Sentadilla[^<]*<\/b>/.test(htmlFicha),
  (htmlFicha.match(/Sin series: <b>[^<]*<\/b>/) || [])[0]);
comprobar('ficha · y no llama problema a lo que puede no serlo',
  /Puede estar bien/.test(htmlFicha));
comprobar('ficha · dice que es lo escrito, no lo reportado',
  /no lo que reportó/.test(htmlFicha));
comprobar('ficha · con cuatro ejercicios sale la barra de escalones',
  /En qué escalón entrena/.test(htmlFicha));

/* Memoización: sin ella, una ficha de 30 ejercicios recorrería 30 veces
   el catálogo entero. */
const repetido = [{ clientId: 'cl1', days: [{ exercises: [
  filaDe(emp[0], 3), filaDe(emp[0], 3), filaDe(emp[0], 3), filaDe(emp[0], 3), filaDe(trac[0], 3),
]}]}];
fichaCon(repetido);
igual('ficha · el catálogo se recorre una vez por ejercicio DISTINTO, no por fila', vecesEscalera, 2);

/* Con menos de tres ejercicios comparables no se dibuja una estadística
   que no significa nada. */
const soloUno = [{ clientId: 'cl1', days: [{ exercises: [filaDe(emp[0], 3)] }] }];
comprobar('ficha · con un solo ejercicio no se inventa un reparto de escalones',
  !/En qué escalón entrena/.test(fichaCon(soloUno)));

/* Cuánto del catálogo tiene escalera de verdad. Si una regla de familia
   se rompe, esto se desploma antes de que nadie lo note en la app. */
const conEsc = conFamilia.length;
const pctEsc = conEsc / noClips.length * 100;
comprobar('cobertura · la mayoría del catálogo tiene escalera (hoy 76 %)',
  pctEsc > 60, pctEsc.toFixed(1) + ' % de ' + noClips.length + ' ejercicios');

/* Vocabulario, otra vez: esto lo lee Diego pero vive en la misma ficha
   que el bloque clínico. */
const lineaMala = moduloFicha.split('\n').find(l => PROHIBIDAS.test(l));
comprobar('ficha · «Cómo entrena» no usa lenguaje clínico', !lineaMala, lineaMala && lineaMala.trim().slice(0, 110));

/* --- salida ---------------------------------------------------------- */

console.log('\nUS19-APP · escalera de ejercicios');
console.log('archivo: ' + ruta);
console.log('  · catálogo: ' + catalogo.length + ' ejercicios · reparto por escalón: '
  + [1, 2, 3, 4].map(b => b + ':' + (reparto[b] || 0)).join(' · '));
console.log('  · clips de técnica reconocidos: ' + totalClips
  + '  ·  con escalera: ' + conEsc + ' de ' + noClips.length + ' (' + pctEsc.toFixed(0) + ' %)');
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
