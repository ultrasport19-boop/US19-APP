/* Prueba de la clasificación de ejercicios (tipo, patrón, nivel).
 *
 * Las reglas son expresiones regulares y ya mordieron tres veces el 6-sep-2026:
 * «pino» dentro de «supino», «tibial» dentro de «isquiotibial», «lat» dentro de
 * «lateral». Esta prueba fija veinte nombres conocidos y lo que deben dar; si
 * alguien toca LIB_RE o LIB_PAT_REGLAS y rompe uno, aquí se ve.
 *
 *   node tools/taxonomia.js [index.html]
 *
 * Extrae del index.html el motor (LIB_PATS … libTaxDe) y musNorm, y los evalúa
 * aislados. Igual que pruebas.js: si no encuentra lo que busca, falla, no pasa.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('taxonomia: no encuentro el inicio de ' + nombre + ' (' + inicio.slice(0, 40) + ')'); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('taxonomia: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}

const motor = tramo('var LIB_PATS = [', '\nfunction libCatIcono(cat){', 'el motor de clasificación');
const norm = tramo('function musNorm(s){', '\n}\n', 'musNorm') + '\n}\n';
let libTaxDe;
try {
  const f = new Function('var LIB_CATS=[["Fuerza","x"],["Movilidad","x"],["Pliometría","x"],["Halterofilia","x"],["Strongman","x"],["Cardio","x"]];\n'
    + norm + '\n' + motor + '\nreturn libTaxDe;');
  libTaxDe = f();
} catch (e) {
  console.error('taxonomia: el motor no evalúa aislado: ' + e.message);
  process.exit(1);
}

/* [nombre, grupo, tipo, patrón, nivel]. Un guion en un campo = no se comprueba. */
const casos = [
  ['Press de banca con barra',                 'Pecho',          'Fuerza',       'Empuje',     'Intermedio'],
  ['Curl femoral tumbado',                     'Isquiotibiales', 'Fuerza',       'Bisagra',    'Intermedio'],
  ['Curl de muñeca en polea',                  'Antebrazo',      'Fuerza',       'Accesorio',  'Principiante'],
  ['Dominadas agarre supino',                  'Espalda',        'Fuerza',       'Tracción',   'Intermedio'],   /* «pino» dentro de «supino» */
  ['Elevación glúteo-isquiotibial',            'Isquiotibiales', 'Fuerza',       'Bisagra',    'Avanzado'],     /* «tibial» dentro de «isquiotibial» */
  ['Elevación lateral en máquina',             'Hombros',        'Fuerza',       'Empuje',     'Principiante'], /* «lat» dentro de «lateral» */
  ['Sentadilla con bandas',                    'Pierna',         'Fuerza',       'Sentadilla', 'Avanzado'],     /* bandas de powerlifting */
  ['Sentadilla con banda elástica',            'Pierna',         'Fuerza',       'Sentadilla', 'Principiante'],
  ['Flexiones modificadas hasta antebrazos',   'Pecho',          'Fuerza',       'Empuje',     'Principiante'], /* «antebrazo» no manda sobre «flexiones» */
  ['Zancada con curl de bíceps con mancuernas','Pierna',         'Fuerza',       'Zancada',    '-'],
  ['Press Pallof',                             'Core',           'Fuerza',       'Core',       '-'],
  ['Estiramiento de isquiotibiales',           'Isquiotibiales', 'Movilidad',    '',           'Principiante'],
  ['Empuje de trineo',                         'Pierna',         'Strongman',    'Locomoción', 'Intermedio'],
  ['Arrancada',                                'Pierna',         'Halterofilia', 'Bisagra',    'Avanzado'],
  ['Salto al cajón',                           'Pierna',         'Pliometría',   'Sentadilla', 'Intermedio'],
  ['Carrera en cinta',                         'Cardio',         'Cardio',       'Locomoción', 'Principiante'],
  ['Abdominal bicicleta',                      'Core',           'Fuerza',       'Core',       '-'],            /* no es cardio */
  ['Rotación de tronco en diagonal baja',      'Core',           'Fuerza',       'Core',       '-'],            /* no es strongman */
  ['Peso muerto rumano con mancuernas',        'Isquiotibiales', 'Fuerza',       'Bisagra',    'Intermedio'],
  ['Press cubano con mancuernas',              'Hombros',        'Fuerza',       'Accesorio',  '-'],
  ['Remo en sentadilla con peso corporal',     'Espalda',        'Fuerza',       'Tracción',   '-'],
  ['Flexiones en pino',                        'Hombros',        'Fuerza',       'Empuje',     'Avanzado'],
  /* Los dos de abajo salieron el 10-sep-2026 al escribir los mutantes: dos
     reglas de verdad que ningun caso tocaba, o sea que se podian romper sin
     que saltara nada. */
  ['Plancha con arrastre de trineo',           'Core',           'Fuerza',       'Core',       '-'],            /* el veto de «plancha» manda sobre «trineo»: no es Strongman */
  ['Trabajo de isquiotibiales',                'Isquiotibiales', 'Fuerza',       'Bisagra',    '-'],            /* el nombre no dice el patron: lo decide el musculo */
];

let ok = 0; const fallos = [];
casos.forEach(function (c) {
  const t = libTaxDe({ name: c[0], muscle: c[1] });
  const esperado = { cat: c[2], pat: c[3], niv: c[4] };
  Object.keys(esperado).forEach(function (k) {
    if (esperado[k] === '-') return;
    if (t[k] === esperado[k]) ok++;
    else fallos.push('«' + c[0] + '» ' + k + ': esperaba ' + JSON.stringify(esperado[k]) + ', da ' + JSON.stringify(t[k]));
  });
});
/* Lo escrito manda sobre lo deducido. */
const fijo = libTaxDe({ name: 'Abdominal bicicleta', muscle: 'Core', cat: 'Cardio', pat: 'Locomoción', niv: 'Avanzado' });
if (fijo.cat === 'Cardio' && fijo.pat === 'Locomoción' && fijo.niv === 'Avanzado') ok++;
else fallos.push('lo escrito en la ficha no manda sobre lo deducido: ' + JSON.stringify(fijo));

console.log('\nUS19-APP · clasificación de ejercicios');
console.log('archivo: ' + ruta);
console.log('  comprobaciones OK: ' + ok + (fallos.length ? '  ·  FALLOS: ' + fallos.length : '  ·  sin fallos'));
fallos.forEach(function (f) { console.log('  ✗ ' + f); });
process.exit(fallos.length ? 1 : 0);
