/* Ultra-Sport 19 — Service Worker (shell offline de la PWA)
 *
 * CRÍTICO: NUNCA intercepta ni cachea api.github.com ni raw.githubusercontent.com.
 * El sync de datos (subida PUT y bajada raw) SIEMPRE va directo a la red.
 *
 * Estrategia:
 *   - Sync GitHub y cualquier otro origen (fuentes, jsdelivr, calendly...) -> passthrough a la red.
 *   - Navegación (abrir la app)  -> network-first con fallback al shell cacheado (offline).
 *   - Assets estáticos mismo-origen (íconos, manifest, css/js) -> cache-first.
 *
 * Actualización: al subir una versión nueva, sube CACHE_VERSION. El nuevo SW borra
 * los caches viejos en 'activate' y toma control (skipWaiting + clients.claim).
 */

var CACHE_VERSION = 'v1';
var CACHE_NAME = 'us19-shell-' + CACHE_VERSION;

/* App shell precacheado. Rutas relativas al scope (p.ej. /APP-RUTINAS11/). */
var PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // addAll es atómico; si un asset falta, no rompe la instalación de los demás.
      return Promise.all(PRECACHE.map(function(url){
        return cache.add(url).catch(function(){ /* ignora faltantes */ });
      }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Hosts que NUNCA se interceptan: el sync de datos siempre a la red. */
function isSyncHost(url){
  return url.hostname === 'api.github.com' ||
         url.hostname === 'raw.githubusercontent.com';
}

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;                 // solo GET

  var url;
  try { url = new URL(req.url); } catch(e){ return; }

  // Sync a GitHub -> passthrough (red directa, sin caché). NO tocar.
  if (isSyncHost(url)) return;
  // Cualquier otro origen (fuentes Google, jsDelivr, Calendly, Bitly...) -> red directa.
  if (url.origin !== self.location.origin) return;

  // Navegación (abrir la app): network-first, fallback al shell cacheado si no hay red.
  if (req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(req, copy); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(m){
          if (m) return m;
          return caches.match('./index.html').then(function(m2){
            return m2 || caches.match('./');
          });
        });
      })
    );
    return;
  }

  // Assets estáticos mismo-origen: cache-first.
  event.respondWith(
    caches.match(req).then(function(cached){
      if (cached) return cached;
      return fetch(req).then(function(res){
        if (res && res.ok && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(req, copy); }).catch(function(){});
        }
        return res;
      });
    })
  );
});
