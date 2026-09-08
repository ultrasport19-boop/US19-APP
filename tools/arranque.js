/* =====================================================================
 * US19-APP · el arranque, sin navegador
 *
 *   node tools/arranque.js [ruta/index.html]
 *
 * EL FALLO QUE ESTE ARCHIVO EXISTE PARA IMPEDIR
 * El hoisting NO cruza bloques <script>. Una función declarada en el
 * bloque 3 no existe cuando corre el bloque 1. Eso ya dejó el Panel en
 * blanco en producción una vez, y ninguna suite lo vio: `pruebas.js`
 * evalúa trozos sueltos y `validar_bloques.js` comprueba cada bloque por
 * separado — los dos aplanan justo la diferencia que mata.
 *
 * Aquí los tres bloques se evalúan EN ORDEN y en el MISMO contexto, como
 * hace el navegador. Si alguno llama al cargar a algo que todavía no
 * existe, revienta con el nombre delante. Después se dispara
 * DOMContentLoaded, que es donde vive el arranque de verdad.
 *
 * NO sustituye a `humo.js` en un navegador: aquí no hay pintado, ni CSS,
 * ni layout. Lo que cubre es el orden de carga, que es lo que se rompe
 * al mover código de un bloque a otro.
 *
 * Regla de oro: si algo no se encuentra, esto FALLA.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

let ok = 0;
const fallos = [], avisos = [];
const pasa = () => ok++;
const falla = (n, d) => fallos.push(n + (d ? '  →  ' + d : ''));
const comprobar = (n, c, d) => { if (c) pasa(); else falla(n, d); };
const aviso = t => avisos.push(t);

/* Lo que revienta DENTRO de un setTimeout o de una promesa no lo atrapa
   ningún try de aquí: tumbaría el proceso y la suite moriría sin decir
   nada útil. Y es justo el sitio donde vive el arranque de esta app, así
   que se recogen y se cuentan como fallos. */
process.on('uncaughtException', e => {
  falla('arranque · algo revienta de forma asíncrona al cargar',
    String(e && e.stack || e).split('\n').slice(0, 3).join('  |  ').slice(0, 260));
});
process.on('unhandledRejection', e => {
  falla('arranque · una promesa del arranque queda rechazada sin recoger',
    String(e && e.message || e).slice(0, 200));
});

const bloques = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
if (bloques.length < 2) {
  console.log('\n  ✗ esperaba varios bloques <script> y encontré ' + bloques.length + '\n');
  process.exit(1);
}

/* --- Un navegador de mentira, lo justo para cargar ------------------- */

const noop = function () {};
const oyentes = { window: {}, document: {} };

function nuevoEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    innerHTML: '', textContent: '', value: '', id: '', className: '', href: '', hidden: false,
    checked: false, disabled: false, dataset: {}, children: [], childNodes: [], files: [],
    /* `style` no puede ser una bolsa vacía: el arranque llama a
       setProperty para fijar el alto de la cabecera, y como pasa dentro
       de un setTimeout, el error se escapaba del try y tumbaba el proceso
       entero en vez de contarse como fallo. */
    style: (function () {
      const props = {};
      return new Proxy({
        setProperty: (k, v) => { props[k] = v; },
        getPropertyValue: k => (props[k] || ''),
        removeProperty: k => { delete props[k]; },
      }, {
        get: (t, k) => (k in t ? t[k] : ''),
        set: () => true,
      });
    })(),
    classList: { add: noop, remove: noop, toggle: () => false, contains: () => false },
    addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
    appendChild: x => x, removeChild: x => x, insertBefore: x => x, remove: noop,
    setAttribute: noop, getAttribute: () => null, hasAttribute: () => false, removeAttribute: noop,
    querySelector: () => nuevoEl('div'), querySelectorAll: () => [],
    closest: () => null, focus: noop, blur: noop, click: noop, scrollIntoView: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    insertAdjacentHTML: noop, cloneNode: () => nuevoEl(tag), matches: () => false,
    play: () => Promise.resolve(), pause: noop, load: noop,
  };
  return el;
}

const documento = {
  readyState: 'loading',
  documentElement: nuevoEl('html'),
  body: nuevoEl('body'),
  head: nuevoEl('head'),
  getElementById: () => nuevoEl('div'),
  querySelector: () => nuevoEl('div'),
  querySelectorAll: () => [],
  getElementsByClassName: () => [],
  getElementsByTagName: () => [],
  createElement: t => nuevoEl(t),
  createTextNode: () => nuevoEl('#text'),
  createDocumentFragment: () => nuevoEl('#fragment'),
  addEventListener: (ev, fn) => { (oyentes.document[ev] = oyentes.document[ev] || []).push(fn); },
  removeEventListener: noop,
  dispatchEvent: noop,
  cookie: '',
  visibilityState: 'visible',
  hidden: false,
  execCommand: noop,
};

const almacen = {};
const localStorage = {
  getItem: k => (Object.prototype.hasOwnProperty.call(almacen, k) ? almacen[k] : null),
  setItem: (k, v) => { almacen[k] = String(v); },
  removeItem: k => { delete almacen[k]; },
  clear: () => { Object.keys(almacen).forEach(k => delete almacen[k]); },
  key: i => Object.keys(almacen)[i] || null,
  get length() { return Object.keys(almacen).length; },
};

const ctx = {
  console, JSON, Math, Date, RegExp, Error, Promise, Object, Array, String, Number, Boolean,
  parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, escape, unescape,
  Uint8Array, ArrayBuffer, Map, Set, WeakMap, Intl, Symbol, Proxy, Reflect,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  requestAnimationFrame: f => setTimeout(f, 0), cancelAnimationFrame: clearTimeout,
  document: documento, localStorage, sessionStorage: localStorage,
  navigator: {
    userAgent: 'node', language: 'es-CL', onLine: true, clipboard: { writeText: () => Promise.resolve() },
    storage: { persist: () => Promise.resolve(true), estimate: () => Promise.resolve({}) },
    serviceWorker: { register: () => Promise.resolve({ addEventListener: noop }), getRegistrations: () => Promise.resolve([]), addEventListener: noop },
    share: () => Promise.resolve(), vibrate: noop, wakeLock: { request: () => Promise.reject(new Error('no')) },
  },
  location: { href: 'https://ultrasport19-boop.github.io/US19-APP/', hash: '', host: 'ultrasport19-boop.github.io',
              hostname: 'ultrasport19-boop.github.io', pathname: '/US19-APP/', search: '', protocol: 'https:',
              origin: 'https://ultrasport19-boop.github.io', reload: noop, replace: noop, assign: noop },
  history: { replaceState: noop, pushState: noop, back: noop },
  fetch: () => Promise.reject(new Error('sin red en esta prueba')),
  crypto: require('crypto').webcrypto,
  TextEncoder, TextDecoder, btoa, atob, URL, URLSearchParams,
  Blob: function () { this.size = 0; }, File: function () {}, FileReader: function () { this.readAsText = noop; },
  Image: function () {}, Audio: function () { this.play = () => Promise.resolve(); },
  AbortController: function () { this.signal = {}; this.abort = noop; },
  IntersectionObserver: function () { this.observe = noop; this.unobserve = noop; this.disconnect = noop; },
  MutationObserver: function () { this.observe = noop; this.disconnect = noop; },
  ResizeObserver: function () { this.observe = noop; this.disconnect = noop; },
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  indexedDB: { open: () => ({ addEventListener: noop, onsuccess: null, onerror: null, onupgradeneeded: null }) },
  alert: noop, confirm: () => false, prompt: () => null, print: noop,
  scrollTo: noop, scrollBy: noop, getComputedStyle: () => ({ getPropertyValue: () => '' }),
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, scrollY: 0, scrollX: 0,
  addEventListener: (ev, fn) => { (oyentes.window[ev] = oyentes.window[ev] || []).push(fn); },
  removeEventListener: noop, dispatchEvent: noop,
  AudioContext: function () { this.createOscillator = () => ({ connect: noop, start: noop, stop: noop, frequency: { value: 0 } });
                              this.createGain = () => ({ connect: noop, gain: { value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop } });
                              this.destination = {}; this.currentTime = 0; this.close = noop; this.resume = () => Promise.resolve(); },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.top = ctx;
ctx.webkitAudioContext = ctx.AudioContext;
vm.createContext(ctx);

/* --- 1 · Los bloques, en orden y en el mismo contexto ---------------- */

bloques.forEach((b, i) => {
  try {
    vm.runInContext(b, ctx, { timeout: 15000, filename: 'bloque' + (i + 1) });
    pasa();
  } catch (e) {
    const msg = String(e && e.message || e);
    /* Si lo que falta es una funcion declarada en un bloque POSTERIOR, es
       exactamente el fallo documentado: se dice con todas las letras. */
    const m = /^(\w+) is not defined/.exec(msg);
    let extra = '';
    if (m) {
      for (let j = i + 1; j < bloques.length; j++) {
        if (new RegExp('(^|\\n)\\s*(function|var|let|const)\\s+' + m[1] + '\\b').test(bloques[j])) {
          extra = '  ←  ESTO ES EL FALLO DEL HOISTING: «' + m[1] + '» se declara en el bloque '
                + (j + 1) + ' y el bloque ' + (i + 1) + ' la usa al CARGAR. En el navegador esto deja la vista en blanco.';
          break;
        }
      }
    }
    falla('carga · el bloque ' + (i + 1) + ' se evalúa sin reventar', msg.slice(0, 200) + extra);
  }
});

/* --- 2 · DOMContentLoaded, que es donde vive el arranque ------------- */

const suscritos = (oyentes.document['DOMContentLoaded'] || []).length
                + (oyentes.window['DOMContentLoaded'] || []).length;
comprobar('arranque · alguien espera a DOMContentLoaded', suscritos > 0,
  'si nadie lo espera, el arranque corre al vuelo y vuelve a depender del orden de los bloques');
aviso('oyentes registrados al cargar: '
  + Object.keys(oyentes.document).map(k => 'document:' + k).concat(
      Object.keys(oyentes.window).map(k => 'window:' + k)).join(' · '));

documento.readyState = 'interactive';
const evento = { type: 'DOMContentLoaded', target: documento, preventDefault: noop, stopPropagation: noop };
[...(oyentes.document['DOMContentLoaded'] || []), ...(oyentes.window['DOMContentLoaded'] || [])]
  .forEach((fn, i) => {
    try { fn(evento); pasa(); }
    catch (e) { falla('arranque · el oyente ' + (i + 1) + ' de DOMContentLoaded corre sin reventar',
      String(e && e.message || e).slice(0, 200)); }
  });

/* --- 3 · Lo que tenía que quedar montado ---------------------------- */

const debenExistir = ['loadState', 'saveState', 'showView', 'renderClients', 'libTaxDe', 'u19Arr'];
debenExistir.forEach(f => {
  comprobar('montaje · ' + f + '() existe tras cargar los tres bloques',
    typeof vm.runInContext('typeof ' + f, ctx) === 'string' && vm.runInContext('typeof ' + f, ctx) === 'function');
});

/* Y que el estado se haya cargado de verdad, no que solo exista la
   funcion. El arranque lanza promesas —IndexedDB, el catalogo, la
   restauracion de la llave— asi que se le da un respiro: mirar en el
   mismo tick medía otra cosa y daba «0 ejercicios» con el catalogo bien. */
setTimeout(function () {
  try {
    const n = vm.runInContext('Array.isArray(state.exercises) ? state.exercises.length : -1', ctx);
    const c = vm.runInContext('Array.isArray(state.clients) ? state.clients.length : -1', ctx);
    comprobar('montaje · el estado arranca con el catálogo cargado', n > 0, n + ' ejercicios');
    comprobar('montaje · y con los clientes de la semilla', c > 0, c + ' clientes');
    aviso('tras el arranque: ' + n + ' ejercicios y ' + c + ' clientes en memoria');
  } catch (e) {
    falla('montaje · el estado existe tras el arranque', String(e && e.message || e).slice(0, 120));
  }
  salida();
}, 60);

/* --- salida ---------------------------------------------------------- */

function salida() {
console.log('\nUS19-APP · arranque sin navegador');
console.log('archivo: ' + ruta + '\n');
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
}
