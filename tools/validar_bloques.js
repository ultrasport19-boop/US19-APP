/* Valida cada bloque <script> de index.html por separado con new Function.
   Igual que Apps Script no cruza archivos, el navegador no cruza bloques:
   un error de sintaxis en uno tumba solo ese bloque. Se comprueban uno a uno
   para saber cual y en que linea. Uso: node validar_bloques.js <ruta index.html> */
const fs = require('fs');
const path = require('path');
/* Los otros nueve tools del repo llevan este mismo valor por defecto. Este
   era el unico sin el, y sin argumento moria con la traza cruda de node
   («The "path" argument must be of type string... Received undefined»),
   que parece la herramienta rota y no lo estaba. */
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
if (!fs.existsSync(ruta)) {
  console.log('no encuentro ' + ruta);
  console.log('uso: node tools/validar_bloques.js [ruta del index.html]');
  process.exit(1);
}
const html = fs.readFileSync(ruta, 'utf8');
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m, n = 0, fallos = 0;
while ((m = re.exec(html)) !== null) {
  n++;
  const codigo = m[1];
  const lineaIni = html.slice(0, m.index).split('\n').length;
  const lineas = codigo.split('\n').length;
  try {
    new Function(codigo);
    console.log('bloque ' + n + '  lineas ' + lineaIni + '-' + (lineaIni + lineas) + '  OK');
  } catch (e) {
    fallos++;
    console.log('bloque ' + n + '  lineas ' + lineaIni + '-' + (lineaIni + lineas) + '  FALLA: ' + e.message);
  }
}
const funcs = html.match(/^function\s+[A-Za-z0-9_$]+/gm) || [];
const cnt = {};
funcs.forEach(f => { const k = f.replace(/^function\s+/, ''); cnt[k] = (cnt[k] || 0) + 1; });
const dup = Object.keys(cnt).filter(k => cnt[k] > 1);
console.log('bloques: ' + n + '  ·  funciones top-level: ' + funcs.length + '  ·  duplicadas: ' + (dup.length ? dup.join(', ') : 'ninguna'));
const raros = [...html].filter(c => c.charCodeAt(0) < 32 && c !== '\n' && c !== '\r' && c !== '\t').length;
console.log('caracteres de control sueltos: ' + raros);
process.exit(fallos || dup.length || raros ? 1 : 0);
