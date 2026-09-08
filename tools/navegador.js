/* =====================================================================
 * US19-APP · la app en un navegador de verdad
 *
 *   node tools/navegador.js [ruta/index.html | https://…]
 *
 * `arranque.js` ejecuta la app en un navegador de mentira: sirve para el
 * hook porque es rápido y no depende de nada. Pero su DOM lo escribí yo,
 * y un fallo que solo aparezca en un navegador de verdad —una API que no
 * emulé, un `crypto.subtle` que no existe fuera de contexto seguro, un
 * `<script>` que el parser real corta antes— aquí no se ve.
 *
 * Esto abre Chrome sin ventana, deja correr el JavaScript doce segundos
 * y mira dos cosas: que la consola no traiga NI UN error, y que la app
 * haya pintado. Sin Playwright ni npm: solo el Chrome que ya está
 * instalado.
 *
 * NO va en el hook: tarda unos segundos y depende de que haya Chrome. Es
 * la comprobación de antes de dar algo por bueno.
 *
 * Regla de oro: si no encuentra Chrome, lo DICE. No pasa en verde.
 * ===================================================================== */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const destino = process.argv[2] || path.join(__dirname, '..', 'index.html');
const url = /^https?:\/\//.test(destino)
  ? destino
  : 'file:///' + path.resolve(destino).replace(/\\/g, '/');

let ok = 0;
const fallos = [], avisos = [];
const pasa = () => ok++;
const falla = (n, d) => fallos.push(n + (d ? '  →  ' + d : ''));
const comprobar = (n, c, d) => { if (c) pasa(); else falla(n, d); };
const aviso = t => avisos.push(t);

/* --- Encontrar Chrome ----------------------------------------------- */

const CANDIDATOS = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = CANDIDATOS.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });

if (!chrome) {
  console.log('\nUS19-APP · la app en un navegador de verdad\n');
  console.log('  ✗ no encuentro Chrome ni Edge. Con la variable CHROME se le puede dar la ruta:');
  console.log('      CHROME="C:/ruta/chrome.exe" node tools/navegador.js\n');
  process.exit(1);
}

/* --- Abrirla ---------------------------------------------------------- */

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'us19-nav-'));
const perfil = path.join(tmp, 'perfil');
let dom = '', consola = '';
try {
  dom = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + perfil,
    /* Deja correr el JS: sin esto vuelca el DOM antes de que la app arranque. */
    '--virtual-time-budget=12000',
    '--enable-logging=stderr', '--v=0',
    '--dump-dom', url,
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  pasa();
} catch (e) {
  dom = String(e.stdout || '');
  consola = String(e.stderr || '');
  falla('navegador · Chrome abre la página', String(e.message || e).slice(0, 160));
}
/* execFileSync no devuelve stderr cuando todo va bien: se relanza pidiendolo. */
if (!consola) {
  try {
    const r = require('child_process').spawnSync(chrome, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
      '--user-data-dir=' + perfil + '2', '--virtual-time-budget=12000',
      '--enable-logging=stderr', '--v=0', '--dump-dom', url,
    ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    consola = String(r.stderr || '');
    if (!dom) dom = String(r.stdout || '');
  } catch (e) { aviso('no pude recoger la consola: ' + String(e.message || e).slice(0, 80)); }
}

/* --- 1 · Ni un error en la consola ---------------------------------- */

const ERRORES = /(Uncaught|ReferenceError|TypeError|SyntaxError|is not defined|is not a function|Failed to execute)/;
const lineas = consola.split('\n')
  .filter(l => ERRORES.test(l))
  /* El service worker no se registra desde file://, y eso es normal. */
  .filter(l => !/service ?worker|sw\.js|Failed to register/i.test(l));
comprobar('consola · la app carga sin un solo error', lineas.length === 0,
  lineas.slice(0, 3).map(l => l.trim().slice(0, 130)).join('  |  '));
aviso('consola: ' + consola.split('\n').filter(Boolean).length + ' líneas, ' + lineas.length + ' con error');

/* --- 2 · Ha pintado algo -------------------------------------------- */

comprobar('dom · Chrome devuelve la página entera', dom.length > 100000, dom.length + ' bytes');
const cuerpo = dom.slice(Math.max(0, dom.indexOf('<body')))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ');
const texto = cuerpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
comprobar('dom · hay texto visible en la página', texto.length > 200, texto.length + ' caracteres');

/* Las pestañas son del HTML, así que salen aunque el JS falle: sirven
   para saber que la página es la que creemos, no que la app arrancó. */
['Panel', 'Clientes', 'Biblioteca'].forEach(t => {
  comprobar('dom · la pestaña «' + t + '» está en la página', texto.indexOf(t) >= 0);
});

/* --- 3 · Lo que solo aparece si el JavaScript CORRIÓ ---------------- */
/* En un perfil recién creado no hay ni token ni puente, así que para la
   app este navegador es el de un desconocido y el candado enseña su
   pantalla. Ese texto lo escribe el JS: si aparece, el arranque llegó
   hasta el final. Si el candado dejara de funcionar, también se ve. */

const DEL_CANDADO = /Si eres socio, abre el enlace que te mandaron/i;
comprobar('arranque · el JavaScript corrió de verdad (el candado pintó su pantalla)',
  DEL_CANDADO.test(texto),
  'sin ese texto, o el candado cambió o la app no llegó a arrancar');

if (/^file:/.test(url)) {
  comprobar('local · la app avisa de que está abierta como archivo',
    /Archivo local/i.test(texto),
    'ese aviso lo pinta el JS al detectar file://; si falta, algo se paró antes');
}

/* --- limpieza y salida ---------------------------------------------- */

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}

console.log('\nUS19-APP · la app en un navegador de verdad');
console.log('navegador: ' + chrome);
console.log('abrió:     ' + url + '\n');
avisos.forEach(a => console.log('  · ' + a));
console.log('');
if (fallos.length) {
  console.log('FALLOS (' + fallos.length + '):');
  fallos.forEach(f => console.log('  ✗ ' + f));
  console.log('\ncomprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + fallos.length);
  process.exit(1);
}
console.log('comprobaciones OK: ' + ok + '  ·  sin fallos');
process.exit(0);
