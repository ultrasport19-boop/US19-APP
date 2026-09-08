/* =====================================================================
 * El telefono de Diego, de verdad: sin token, contra la nube real.
 *
 *   node tools/telefono.js
 *
 * Monta el modulo de cifrado tal cual esta en index.html y lo pone en la
 * situacion exacta del telefono: SIN githubToken, SIN githubRepo en
 * ajustes, sin nada cacheado. Antes del arreglo eso terminaba en
 * «Contrasena o clave incorrecta» pasara lo que pasara, y por eso no
 * habia forma de saber que fallaba.
 *
 * Lo que se comprueba aqui NO es un secreto: se usa una frase
 * deliberadamente mala. Lo que importa es COMO falla. Si el error es de
 * cripto, el sobre se leyo — que es justo lo que no ocurria.
 * ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const IDX = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(IDX, 'utf8');
const modulo = src.slice(src.indexOf('var ENC_MK_KEY'), src.indexOf('function _syncPrepareContent'));

const store = {};
const ctx = {
  window: { crypto: webcrypto, TextEncoder: TextEncoder },
  u19IdbLeer: () => Promise.resolve(undefined),
  u19IdbGuardar: () => Promise.resolve(true),
  u19IdbBorrar: () => Promise.resolve(true),
  setTimeout, clearTimeout,
  navigator: { storage: { persist: () => Promise.resolve(true) } },
  toast: () => {},
  Number, isNaN, Array, parseInt,
  crypto: webcrypto, TextEncoder, TextDecoder, btoa, atob,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  /* EL TELEFONO: ni token ni repositorio escrito a mano. */
  settings: { encEnabled: true, githubToken: '', githubRepo: '' },
  saveSettings: () => {},
  document: { getElementById: () => null },
  DATA_BRANCH: 'data',
  SYNC_PATH: 'sync/state.json',
  /* Esto es lo unico que el telefono sabe, y lo saca de la URL en la que
     esta abierta la app: ultrasport19-boop.github.io/US19-APP/ */
  getDerivedRepo: () => 'ultrasport19-boop/US19-APP',
  getGitHubSyncUrl: () => null,
  getGitHubHeaders: () => ({}),
  fetch,                       // red de verdad
  console, Promise, Math, JSON, Error, Date,
  Uint8Array, ArrayBuffer, String, Object,
};
vm.createContext(ctx);
vm.runInContext(modulo, ctx);
const api = vm.runInContext('({ encFetchEnvelope, encUnlock, encNormalizarClaveRec })', ctx);

let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok   ' + t); } else { mal++; console.log('  FALLA ' + t); } };

(async () => {
  console.log('\nEl telefono, contra la nube real (sin token)\n');

  const sobre = await api.encFetchEnvelope();
  di(!!sobre, 'el sobre se lee sin token, por la via publica de la rama data');
  di(!!(sobre && sobre.pw && sobre.rec), 'trae las DOS mitades: contrasena y recuperacion');
  di(!!(sobre && sobre.rec && sobre.rec.salt && sobre.rec.iv && sobre.rec.ct),
     'la mitad de recuperacion viene completa (salt, iv, ct)');

  /* Frase mala a proposito. Lo que se mira es el TIPO de fallo. */
  let err = null;
  try { await api.encUnlock('esto no es la frase de nadie', false); }
  catch (e) { err = e; }
  di(!!err, 'una frase mala no abre (faltaria mas)');
  /* La distincion que importa: que el fallo sea de CRIPTO. Si el mensaje
     habla de no haber llave o de no poder leerla, es que el sobre nunca
     llego — que es exactamente lo que le pasaba en el telefono. */
  const deCripto = e => !!e && !e.encMotivo
    && !/datos cifrados|no pude leer|sincronizaci/i.test(String(e.message || ''));
  di(deCripto(err),
     'y falla por CRIPTO, no por no haber podido leer la llave  ←  esto es lo que estaba roto');
  if (err && !deCripto(err)) console.log('       en realidad fallo por: ' + (err.encMotivo || '-') + ' · ' + err.message);

  /* La clave de recuperacion tambien tiene que llegar hasta el descifrado. */
  err = null;
  try { await api.encUnlock('US19-22222-33333-44444-55555', true); }
  catch (e) { err = e; }
  di(deCripto(err),
     'con una clave de recuperacion inventada, tambien llega a intentar abrir el sobre');
  if (err && !deCripto(err)) console.log('       en realidad fallo por: ' + (err.encMotivo || '-') + ' · ' + err.message);

  console.log('\n  ' + ok + ' bien · ' + mal + ' mal\n');
  process.exit(mal ? 1 : 0);
})();
