/* Service worker Ultra-Sport 19 - red primero, cache de respaldo (offline).
 *
 * La version anterior guardaba copia de TODO lo que pasara por aqui, sin
 * limite ni caducidad. Con ~444 MB de GIFs en videos/, abrir suficientes
 * ejercicios podia llenar la cuota del navegador; cuando eso ocurre el
 * origen entero deja de poder escribir y la app pierde la capacidad de
 * guardar. Ahora la media pesada no se cachea y el resto tiene tope.
 */
var CACHE = "us19-cache-v2";
var CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

/* Cuantas entradas guardamos como maximo fuera del nucleo. */
var MAX_ENTRADAS = 60;

/* Lo que NO se guarda: pesa mucho, cambia poco y se sirve bien desde la red. */
function esMediaPesada(url) {
  if (/(^|\/)videos\//i.test(url.pathname)) return true;
  return /\.(mp4|webm|mov|gif|png|jpe?g|webp|avif|m4v|ogg|mp3|wav)$/i.test(url.pathname);
}

/* El catalogo pesa ~1,3 MB pero hace falta sin conexion: es nucleo. */
function esNucleo(url) {
  return /(^|\/)(index\.html|manifest\.json|us19_catalogo\.json|icon-\d+\.png)$/i.test(url.pathname)
    || /\/$/.test(url.pathname);
}

/* Poda por antiguedad de insercion: la Cache API conserva el orden de
   escritura, asi que las primeras claves son las mas viejas. */
function podar(cache) {
  return cache.keys().then(function (keys) {
    var sueltas = keys.filter(function (k) { return !esNucleo(new URL(k.url)); });
    var sobran = sueltas.length - MAX_ENTRADAS;
    if (sobran <= 0) return;
    return Promise.all(sueltas.slice(0, sobran).map(function (k) { return cache.delete(k); }));
  }).catch(function () {});
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; /* no interceptar Apps Script ni fuentes */

  /* La media va directa a la red, sin dejar copia. Sin conexion se vera el
     hueco del GIF: preferible a quedarse sin cuota y no poder guardar.
     El nucleo manda: los iconos son .png pero deben seguir cacheados. */
  if (!esNucleo(url) && esMediaPesada(url)) return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) {
          return c.put(e.request, copy).then(function () {
            if (!esNucleo(url)) return podar(c);
          });
        }).catch(function () { /* cuota llena: seguimos sirviendo de red */ });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) { return hit || caches.match("./index.html"); });
    })
  );
});
