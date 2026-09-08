/* =====================================================================
 * US19-APP · Prueba de humo del ARRANQUE
 * ---------------------------------------------------------------
 * El banco de pruebas (tools/pruebas.js) no puede ver los fallos de
 * arranque: evalua trozos sueltos y eso aplana los bloques <script>.
 * El hoisting no cruza bloques, y ya dejo el Panel en blanco en
 * produccion una vez. Esto solo se ve abriendo la app de verdad.
 *
 * DOS FORMAS DE USARLO, las dos sin instalar nada en el proyecto:
 *
 *   A) A mano, 30 segundos:
 *        node tools/humo.js --pegar
 *      Imprime un trozo de codigo. Se abre la app, se pega en la
 *      consola del navegador (F12) y se lee el resultado.
 *
 *   B) Automatico, si tienes Playwright a mano:
 *        npm i -D playwright && npx playwright install chromium   (una sola vez)
 *        node tools/humo.js --auto
 *
 * Playwright NO es dependencia de la app: la app sigue sin build, sin
 * dependencias y sin servidor. Es solo una herramienta de escritorio.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const http = require('http');

const RAIZ = path.join(__dirname, '..');
const PUERTO = 8791;

/* --- Las comprobaciones, en un solo sitio ---------------------------
   Se usan igual pegadas en la consola que ejecutadas por Playwright. */
const COMPROBACIONES = function () {
  const out = { ok: [], fallos: [], info: {} };
  const di = function (c, txt) { (c ? out.ok : out.fallos).push(txt); };

  di(document.title.indexOf('Ultra-Sport') !== -1, 'el titulo es el de la app');
  di(typeof window.loadSettings === 'function', 'loadSettings existe en el arranque');
  di(document.body.innerHTML.length > 100000, 'el body tiene contenido');

  const botones = [].slice.call(document.querySelectorAll('button[data-tab]'));
  di(botones.length >= 9, 'hay al menos 9 pestanas (hay ' + botones.length + ')');

  const detalle = [];
  for (var i = 0; i < botones.length; i++) {
    var t = botones[i].getAttribute('data-tab');
    var err = null;
    try { botones[i].click(); } catch (e) { err = String(e); }
    var sec = document.getElementById('view-' + t);
    var vis = sec ? getComputedStyle(sec).display !== 'none' : false;
    var texto = sec ? (sec.innerText || '').trim().length : 0;
    detalle.push({ pestana: t, visible: vis, texto: texto, error: err });
    di(!!sec, 'existe la seccion view-' + t);
    di(vis, 'la pestana ' + t + ' se hace visible al pulsarla');
    /* Una pestana que abre pero sale vacia es justo el fallo que ya
       ocurrio en produccion: la seccion existe y no pinta nada. */
    di(texto > 200, 'la pestana ' + t + ' pinta contenido (' + texto + ' caracteres)');
    di(!err, 'pulsar ' + t + ' no lanza excepcion' + (err ? ': ' + err : ''));
  }
  out.info.pestanas = detalle;
  return out;
};

/* --- Modo A: imprimir para pegar ------------------------------------ */
function modoPegar() {
  console.log('');
  console.log('1. Abre la app en el navegador (doble clic en index.html o tu URL de GitHub Pages).');
  console.log('2. Abre la consola con F12 y pega esto entero:');
  console.log('');
  console.log('(' + COMPROBACIONES.toString() + ')()');
  console.log('');
  console.log('3. Mira "fallos": si esta vacio, el arranque esta sano.');
  console.log('');
}

/* --- Modo B: automatico con Playwright ------------------------------ */
async function modoAuto() {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) {
    console.log('');
    console.log('Playwright no esta disponible. Dos salidas:');
    console.log('  · npm i -D playwright && npx playwright install chromium   y vuelve a intentar');
    console.log('    (el `npx playwright install` a secas baja NAVEGADORES, no el modulo:');
    console.log('     por eso este require seguia fallando despues de correrlo)');
    console.log('  · node tools/humo.js --pegar   y lo haces a mano en 30 segundos');
    console.log('');
    process.exit(2);
  }

  const servidor = http.createServer(function (req, res) {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const abs = path.join(RAIZ, rel);
    if (abs.indexOf(RAIZ) !== 0 || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      res.writeHead(404); res.end('no'); return;
    }
    const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
                    '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
    res.writeHead(200, { 'Content-Type': tipos[path.extname(abs)] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  });
  await new Promise(function (r) { servidor.listen(PUERTO, '127.0.0.1', r); });

  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  const errores = [];
  pagina.on('console', function (m) { if (m.type() === 'error') errores.push(m.text()); });
  pagina.on('pageerror', function (e) { errores.push('pageerror: ' + e.message); });

  /* El candado del entrenador, abierto ANTES de que cargue nada.
     Sin esto, un perfil recien creado no lo tiene abierto: u19CandadoOk() da
     false, showView() sale por hideTrainerUI() y return, y la prueba fallaba
     en 20 comprobaciones que no tienen NADA que ver con el arranque. Es decir,
     la unica suite que ve los fallos de arranque llevaba tiempo en rojo por un
     motivo ajeno, y un rojo permanente no avisa de nada. */
  await pagina.addInitScript(function () {
    try { sessionStorage.setItem('us19_candado_ok', '1'); } catch (e) {}
  });

  await pagina.goto('http://127.0.0.1:' + PUERTO + '/index.html', { waitUntil: 'load' });
  await pagina.waitForTimeout(1500);
  const r = await pagina.evaluate(COMPROBACIONES);

  await navegador.close();
  servidor.close();

  informe(r, errores);
}

function informe(r, erroresConsola) {
  console.log('');
  console.log('US19-APP · prueba de humo del arranque');
  console.log('');
  (r.info.pestanas || []).forEach(function (p) {
    console.log('  ' + (p.visible && p.texto > 200 ? '✓' : '✗') + ' ' +
      p.pestana.padEnd(13) + p.texto + ' caracteres');
  });
  console.log('');

  /* El favicon.ico que falta en el servidor local no es un fallo de la app. */
  const reales = (erroresConsola || []).filter(function (e) { return e.indexOf('favicon.ico') === -1; });
  if (reales.length) {
    console.log('errores de consola (' + reales.length + '):');
    reales.forEach(function (e) { console.log('  ! ' + e.slice(0, 160)); });
    console.log('');
  }

  if (r.fallos.length || reales.length) {
    console.log('FALLOS (' + r.fallos.length + '):');
    r.fallos.forEach(function (f) { console.log('  ✗ ' + f); });
    console.log('');
    console.log('comprobaciones OK: ' + r.ok.length + '  ·  FALLIDAS: ' + r.fallos.length);
    process.exit(1);
  }
  console.log('comprobaciones OK: ' + r.ok.length + '  ·  arranque sano');
  process.exit(0);
}

const modo = process.argv[2] || '--pegar';
if (modo === '--auto') modoAuto();
else modoPegar();
