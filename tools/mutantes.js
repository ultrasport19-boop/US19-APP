/* =====================================================================
 * US19-APP · pruebas de mutación
 *
 *   node tools/mutantes.js tools/mutantes_escalera.json
 *
 * Una prueba que no falla cuando devuelves el fallo no prueba nada. Esto
 * coge cada mutante de la lista, lo aplica y comprueba que la suite se
 * pone ROJA. El que pase en verde señala una comprobación decorativa.
 *
 * TRABAJA SOBRE UNA COPIA, y esa es la razón de que exista como
 * herramienta en vez de como script suelto. El 8-sep-2026 corrí los
 * mutantes con un script que editaba `index.html` directamente, tardó más
 * de dos minutos, se fue a segundo plano — y siguió mutando el archivo
 * mientras yo editaba encima. Cuando lo maté, su `finally` no llegó a
 * correr y el archivo se quedó con un `if (false)` dentro: durante un
 * rato el código de Diego tenía un trozo desactivado por una prueba.
 * Aquí el original no se toca nunca.
 *
 * El formato de la lista:
 *   { "suite": "tools/escalera.js",
 *     "mutantes": [ { "nombre": "...", "de": "...", "a": "..." } ] }
 * ===================================================================== */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const listaRuta = process.argv[2];
if (!listaRuta) {
  console.log('\nFalta la lista de mutantes.\n  node tools/mutantes.js tools/mutantes_escalera.json\n');
  process.exit(1);
}

const lista = JSON.parse(fs.readFileSync(path.resolve(listaRuta), 'utf8'));
const suite = path.join(raiz, lista.suite);
const fuente = path.join(raiz, lista.fuente || 'index.html');
if (!fs.existsSync(suite)) { console.log('\n  ✗ no encuentro la suite: ' + suite + '\n'); process.exit(1); }

const original = fs.readFileSync(fuente, 'utf8');
const copia = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'us19-mut-')), path.basename(fuente));
/* Si la suite lee algo mas del lado de su archivo, se lo lleva a la copia.
   Por defecto, el catalogo: escalera.js lo busca junto a index.html. */
const acompana = lista.acompana || ['us19_catalogo.json'];
acompana.forEach(function (rel) {
  const de = path.join(raiz, rel);
  if (fs.existsSync(de)) fs.copyFileSync(de, path.join(path.dirname(copia), path.basename(rel)));
});

function corre() {
  try { execFileSync('node', [suite, copia], { stdio: 'pipe', encoding: 'utf8' }); return { rojo: false, salida: '' }; }
  catch (e) { return { rojo: true, salida: String(e.stdout || '') }; }
}

console.log('\nUS19-APP · pruebas de mutación');
console.log('suite:  ' + lista.suite);
console.log('fuente: ' + path.basename(fuente) + '  (se trabaja sobre una copia; el original no se toca)\n');

/* Antes de nada: en verde sin mutar. Si no, lo que venga después no dice nada. */
fs.writeFileSync(copia, original);
if (corre().rojo) {
  console.log('  ✗ la suite ya falla SIN mutar: arregla eso primero\n');
  fs.rmSync(path.dirname(copia), { recursive: true, force: true });
  process.exit(1);
}

const escapan = [];
lista.mutantes.forEach((m, i) => {
  const n = original.split(m.de).length - 1;
  if (n !== 1) {
    console.log('  ✗ ANCLA  ' + m.nombre + '  (' + n + ' coincidencias, esperaba 1)');
    escapan.push(m.nombre + ' [ancla]');
    return;
  }
  fs.writeFileSync(copia, original.replace(m.de, m.a));
  const r = corre();
  console.log((r.rojo ? '  ok     ' : '  ESCAPA ') + m.nombre);
  if (r.rojo) {
    const linea = r.salida.split('\n').find(l => l.trim().startsWith('✗'));
    if (linea) console.log('           lo caza: ' + linea.trim().slice(0, 110));
  } else {
    escapan.push(m.nombre);
  }
});

fs.rmSync(path.dirname(copia), { recursive: true, force: true });
console.log('');
if (escapan.length) {
  console.log('MUTANTES QUE ESCAPAN (' + escapan.length + '): esas comprobaciones no prueban nada');
  escapan.forEach(e => console.log('  · ' + e));
  console.log('');
  process.exit(1);
}
console.log('los ' + lista.mutantes.length + ' mutantes caen\n');
process.exit(0);
