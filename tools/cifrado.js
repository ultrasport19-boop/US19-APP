/* =====================================================================
 * US19-APP · el cifrado de la sincronizacion, ejecutado de verdad
 *
 *   node tools/cifrado.js [ruta/index.html]
 *
 * Las otras suites LEEN el codigo. Esta lo EJECUTA: saca el modulo de
 * cifrado de index.html, le monta un navegador de mentira alrededor
 * (crypto, localStorage, document) y hace el viaje completo — activar,
 * cifrar, descifrar, desbloquear en otro equipo, abrir un sobre antiguo.
 *
 * Existe porque el cifrado paso de ser opcional a ser obligatorio: si
 * falla, Diego no se queda sin cifrado, se queda SIN SINCRONIZACION. Y
 * porque un error aqui no se ve hasta que hace falta, que es justo el
 * dia que se murio el telefono y solo queda la copia de la nube.
 *
 * Regla de oro, la misma que pruebas.js: si algo no se encuentra, esto
 * FALLA. Nunca pasa en verde por no haber mirado.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

let ok = 0, fallos = [], avisos = [];
function pasa() { ok++; }
function falla(nombre, detalle) { fallos.push(nombre + (detalle ? '  →  ' + detalle : '')); }
function aviso(t) { avisos.push(t); }
function comprobar(nombre, cond, detalle) { if (cond) pasa(); else falla(nombre, detalle); }
function igual(nombre, a, b) {
  if (a === b) pasa();
  else falla(nombre, 'esperaba ' + JSON.stringify(b) + ', obtuvo ' + JSON.stringify(a));
}

function abortar(motivo) {
  console.log('');
  console.log('US19-APP · cifrado de la sincronizacion');
  console.log('archivo: ' + ruta);
  console.log('');
  console.log('  ✗ ' + motivo);
  console.log('');
  console.log('comprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + (fallos.length + 1));
  process.exit(1);
}

/* --- 1 · Sacar el modulo del archivo --------------------------------
   Del primer marcador al segundo. Si cualquiera de los dos se mueve o
   se renombra, esto aborta en vez de probar un trozo equivocado. */

const INI = 'var ENC_MK_KEY';
const FIN = 'function _syncPrepareContent';
const iIni = src.indexOf(INI);
const iFin = src.indexOf(FIN);
if (iIni < 0) abortar('no encuentro "' + INI + '" en ' + path.basename(ruta) + ' (¿se movio el modulo de cifrado?)');
if (iFin < 0) abortar('no encuentro "' + FIN + '" en ' + path.basename(ruta));
if (iFin < iIni) abortar('los marcadores estan al reves: el modulo de cifrado no queda entre ellos');

const modulo = src.slice(iIni, iFin);

/* Que el trozo extraido sea de verdad el modulo, y no otra cosa que
   empiece igual. */
[
  'encSetup', 'encUnlock', 'encEncryptPayload', 'encDecryptPayload',
  '_encWrapMK', '_encUnwrapMK', '_encMigrarWrap', 'encGenRecoveryKey',
  '_encDevKeyGet', '_encGuardarMK', '_encCargarMKDe', 'encFuerzaFrase',
  'encDesbloquearConPin', 'encCambiarFrase',
].forEach(function (f) {
  if (modulo.indexOf('function ' + f) < 0) abortar('el modulo extraido no contiene ' + f + '()');
});

/* --- 2 · Un navegador de mentira ------------------------------------ */

function nuevoEntorno(store0, idb0) {
  /* Con semilla se simula un equipo al que se le copio algo: solo el
     localStorage, o el perfil entero (localStorage + IndexedDB). Esa
     distincion es justo lo que la v2 viene a defender. */
  const store = Object.assign({}, store0 || {});
  const idb = new Map(idb0 || []);
  const localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
  };
  const settings = { encEnabled: false };
  const ctx = {
    window: { crypto: crypto, TextEncoder: TextEncoder },
    /* IndexedDB de mentira. Clona igual que la de verdad (structuredClone
       admite CryptoKey y le conserva el extractable:false): asi, si algun
       dia se guardara ahi algo no clonable, esto reventaria aqui y no en
       el navegador de Diego. */
    u19IdbLeer: function (k) {
      if (!idb.has(k)) return Promise.resolve(undefined);
      return Promise.resolve(structuredClone(idb.get(k)));
    },
    u19IdbGuardar: function (k, v) {
      try { idb.set(k, structuredClone(v)); }
      catch (e) { return Promise.reject(new Error('IndexedDB no puede clonar eso: ' + e.message)); }
      return Promise.resolve(true);
    },
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    navigator: { storage: { persist: function () { return Promise.resolve(true); } } },
    toast: function () {},
    Number: Number, isNaN: isNaN, Array: Array, parseInt: parseInt,
    crypto: crypto,
    TextEncoder: TextEncoder,
    TextDecoder: TextDecoder,
    btoa: btoa,
    atob: atob,
    localStorage: localStorage,
    settings: settings,
    saveSettings: function () {},
    document: { getElementById: function () { return null; } },
    DATA_BRANCH: 'data',
    getGitHubSyncUrl: function () { return ''; },   // sin red: encFetchEnvelope cae a la cache
    getGitHubHeaders: function () { return {}; },
    fetch: function () { return Promise.reject(new Error('sin red en las pruebas')); },
    console: console,
    Promise: Promise, Math: Math, JSON: JSON, Error: Error, Date: Date,
    Uint8Array: Uint8Array, ArrayBuffer: ArrayBuffer, String: String, Object: Object,
  };
  vm.createContext(ctx);
  vm.runInContext(modulo + '\n;({ ' + [
    'encSetup', 'encUnlock', 'encEncryptPayload', 'encDecryptPayload',
    'encGenRecoveryKey', 'encRestoreFromCache', 'encForgetDevice', 'encUnlocked',
    '_encWrapMK', '_encUnwrapMK', '_encEnvelope', '_encMkRaw',
    'encFuerzaFrase', 'encPinActivar', 'encPinDesactivar', 'encDesbloquearConPin',
    'encCambiarFrase', 'encRegenerarRecuperacion', 'encNormalizarClaveRec',
  ].join(', ') + ' })', ctx);
  const api = vm.runInContext('({ encSetup:encSetup, encUnlock:encUnlock, encEncryptPayload:encEncryptPayload,'
    + ' encDecryptPayload:encDecryptPayload, encGenRecoveryKey:encGenRecoveryKey,'
    + ' encRestoreFromCache:encRestoreFromCache, encForgetDevice:encForgetDevice,'
    + ' encUnlocked:encUnlocked, _encWrapMK:_encWrapMK, _encUnwrapMK:_encUnwrapMK,'
    + ' encFuerzaFrase:encFuerzaFrase, encPinActivar:encPinActivar,'
    + ' encPinDesactivar:encPinDesactivar, encDesbloquearConPin:encDesbloquearConPin,'
    + ' encCambiarFrase:encCambiarFrase, encRegenerarRecuperacion:encRegenerarRecuperacion,'
    + ' encNormalizarClaveRec:encNormalizarClaveRec })', ctx);
  return { api: api, ctx: ctx, store: store, idb: idb, settings: settings, localStorage: localStorage };
}

/* --- 3 · El viaje completo ------------------------------------------ */

const FRASE = 'una frase larga de Diego para US19 · 2026';
const ESTADO = JSON.stringify({
  app: 'ultrasport19', v: 1,
  clients: [{ name: 'Socia de ejemplo', phone: '+56 9 0000 0000', goal: 'fuerza general' }],
  circuitos: [{ id: 'c1', nombre: 'Circuito de prueba' }],
  acentos: 'ñ á é í ó ú ü · 100 % · «comillas»',
});

async function principal() {

  /* a) Activar el cifrado en el equipo de Diego -------------------- */

  const A = nuevoEntorno();
  let recovery;
  try {
    recovery = await A.api.encSetup(FRASE);
  } catch (e) {
    abortar('encSetup() reventó al activar el cifrado: ' + e.message);
  }

  comprobar('activar · devuelve una clave de recuperacion', typeof recovery === 'string' && recovery.length > 0);
  comprobar('activar · la clave tiene el formato US19 + cuatro grupos de cinco',
    /^US19(-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}){4}$/.test(recovery || ''),
    'obtuve ' + JSON.stringify(recovery));
  comprobar('activar · la clave no trae caracteres que se confundan al copiarla',
    !/[ILO01]/.test((recovery || '').slice(5)),
    'el alfabeto excluye I, L, O, 0 y 1 a proposito');
  igual('activar · settings.encEnabled queda en true', A.settings.encEnabled, true);
  igual('activar · el cifrado queda desbloqueado', A.api.encUnlocked(), true);
  comprobar('activar · la master key YA NO queda en claro en localStorage',
    !A.store['ultrasport19_mk'],
    'era el agujero de la v1: la llave, legible, al alcance de la consola');
  comprobar('activar · queda la master key ENVUELTA', !!A.store['ultrasport19_mk2']);
  comprobar('activar · el envoltorio va marcado como v2',
    JSON.parse(A.store['ultrasport19_mk2'] || '{}').v === 2);
  comprobar('activar · el sobre de llaves queda cacheado', !!A.store['ultrasport19_env']);

  const sobreLlaves = JSON.parse(A.store['ultrasport19_env'] || '{}');
  comprobar('activar · el sobre trae las dos mitades (frase y recuperacion)', !!(sobreLlaves.pw && sobreLlaves.rec));
  igual('activar · la mitad de la frase se cerro con 1.200.000 vueltas', sobreLlaves.pw && sobreLlaves.pw.it, 1200000);
  igual('activar · la mitad de recuperacion tambien', sobreLlaves.rec && sobreLlaves.rec.it, 1200000);
  comprobar('activar · cada mitad lleva su propia sal',
    sobreLlaves.pw && sobreLlaves.rec && sobreLlaves.pw.salt !== sobreLlaves.rec.salt);

  /* b) Cifrar y descifrar el estado -------------------------------- */

  let sobre;
  try {
    sobre = await A.api.encEncryptPayload(ESTADO);
  } catch (e) {
    abortar('encEncryptPayload() reventó: ' + e.message);
  }

  igual('cifrar · el sobre va marcado como cifrado', sobre.enc, 1);
  comprobar('cifrar · el sobre lleva las llaves dentro', !!(sobre.keys && sobre.keys.pw && sobre.keys.rec));
  comprobar('cifrar · el sobre lleva iv y texto cifrado', !!(sobre.data && sobre.data.iv && sobre.data.ct));

  /* Lo que de verdad importa: que en el archivo que sube a la rama
     publica no quede nada legible. */
  const subido = JSON.stringify(sobre);
  comprobar('cifrar · el archivo subido NO contiene el telefono del socio',
    subido.indexOf('+56 9 0000 0000') < 0,
    'el dato viaja legible a un repositorio publico');
  comprobar('cifrar · el archivo subido NO contiene el nombre del socio',
    subido.indexOf('Socia de ejemplo') < 0);
  comprobar('cifrar · el archivo subido NO contiene el nombre del circuito',
    subido.indexOf('Circuito de prueba') < 0);

  const vuelta = await A.api.encDecryptPayload(sobre);
  igual('descifrar · vuelve exactamente el mismo JSON', vuelta, ESTADO);
  comprobar('descifrar · los acentos y la ñ sobreviven', vuelta.indexOf('ñ á é í ó ú ü') >= 0);

  /* Dos cifrados del mismo texto no pueden dar lo mismo: cada uno lleva
     su propio iv. Si coinciden, el iv se quedo fijo. */
  const sobre2 = await A.api.encEncryptPayload(ESTADO);
  comprobar('cifrar · dos cifrados del mismo estado dan resultados distintos',
    sobre.data.ct !== sobre2.data.ct && sobre.data.iv !== sobre2.data.iv,
    'un iv repetido en AES-GCM rompe la confidencialidad');

  /* c) Un sobre manipulado no debe abrirse ------------------------- */

  const manipulado = JSON.parse(JSON.stringify(sobre));
  const bytes = Buffer.from(manipulado.data.ct, 'base64');
  bytes[0] = bytes[0] ^ 0xff;
  manipulado.data.ct = bytes.toString('base64');
  let abrio = false;
  try { await A.api.encDecryptPayload(manipulado); abrio = true; } catch (e) { /* correcto */ }
  comprobar('integridad · un sobre alterado NO se abre', !abrio,
    'AES-GCM debe rechazarlo; si lo abre, alguien puede cambiar los datos de la nube');

  /* d) Desbloquear en el segundo equipo ---------------------------- */

  const B = nuevoEntorno();
  B.ctx._encEnvelope = null;
  vm.runInContext('_encEnvelope = ' + A.store['ultrasport19_env'] + ';', B.ctx);
  const apiB = vm.runInContext('({ encUnlock:encUnlock, encDecryptPayload:encDecryptPayload, encUnlocked:encUnlocked })', B.ctx);

  igual('segundo equipo · arranca bloqueado', apiB.encUnlocked(), false);

  let malaFallo = false;
  try { await apiB.encUnlock('la frase equivocada', false); }
  catch (e) { malaFallo = true; }
  comprobar('segundo equipo · una frase incorrecta NO desbloquea', malaFallo);
  igual('segundo equipo · sigue bloqueado tras el intento fallido', apiB.encUnlocked(), false);

  await apiB.encUnlock(FRASE, false);
  igual('segundo equipo · la frase correcta desbloquea', apiB.encUnlocked(), true);
  igual('segundo equipo · settings.encEnabled se contagia', B.settings.encEnabled, true);

  const vueltaB = await apiB.encDecryptPayload(sobre);
  igual('segundo equipo · lee el estado cifrado por el primero', vueltaB, ESTADO);

  /* e) La clave de recuperacion, que es la red de seguridad -------- */

  const C = nuevoEntorno();
  vm.runInContext('_encEnvelope = ' + A.store['ultrasport19_env'] + ';', C.ctx);
  const apiC = vm.runInContext('({ encUnlock:encUnlock, encDecryptPayload:encDecryptPayload, encUnlocked:encUnlocked })', C.ctx);
  await apiC.encUnlock(recovery, true);
  igual('recuperacion · la clave de recuperacion desbloquea', apiC.encUnlocked(), true);
  const vueltaC = await apiC.encDecryptPayload(sobre);
  igual('recuperacion · y da acceso al mismo estado', vueltaC, ESTADO);

  let recMalFallo = false;
  try { await nuevoEntornoConSobre(A).encUnlock('US19-AAAAA-BBBBB-CCCCC', true); }
  catch (e) { recMalFallo = true; }
  comprobar('recuperacion · una clave inventada NO desbloquea', recMalFallo);

  /* f) Un sobre de los antiguos (150.000 vueltas, sin `it`) --------- */

  const D = nuevoEntorno();
  const apiD = vm.runInContext('({ _encWrapMK:_encWrapMK, _encUnwrapMK:_encUnwrapMK, encUnlock:encUnlock,'
    + ' encUnlocked:encUnlocked, encDecryptPayload:encDecryptPayload })', D.ctx);

  /* Se fabrica a mano un sobre como los de antes: mismas piezas, pero
     cerrado con 150.000 vueltas y SIN el campo `it`. */
  const mkViejaB64 = vm.runInContext('_encB64(_encRand(32).buffer)', D.ctx);
  const legacy = await vm.runInContext(
    '(function(mkB64, secreto){'
    + ' var mk = _encUnb64(mkB64), salt=_encRand(16), iv=_encRand(12);'
    + ' return _encKEK(secreto, salt, ENC_PBKDF2_LEGACY).then(function(kek){'
    + '   return window.crypto.subtle.encrypt({name:"AES-GCM", iv:iv}, kek, mk);'
    + ' }).then(function(ct){ return { salt:_encB64(salt), iv:_encB64(iv), ct:_encB64(ct) }; });'
    + '})', D.ctx)(mkViejaB64, FRASE);

  comprobar('sobre antiguo · se fabrico sin el campo `it`', legacy.it === undefined);

  vm.runInContext('_encEnvelope = ' + JSON.stringify({ pw: legacy, rec: legacy }) + ';', D.ctx);
  let abrioViejo = true;
  try { await apiD.encUnlock(FRASE, false); }
  catch (e) { abrioViejo = false; falla('sobre antiguo · se abre con la frase de siempre', e.message); }
  if (abrioViejo) {
    pasa();
    igual('sobre antiguo · queda desbloqueado', apiD.encUnlocked(), true);
    /* Y lo importante: al abrirlo se vuelve a cerrar con las vueltas de hoy. */
    const migrado = vm.runInContext('_encEnvelope', D.ctx);
    igual('sobre antiguo · se migra solo a 1.200.000 vueltas', migrado.pw && migrado.pw.it, 1200000);
    comprobar('sobre antiguo · el sobre migrado es distinto del original',
      migrado.pw && migrado.pw.ct !== legacy.ct);
    comprobar('sobre antiguo · la mitad no usada se deja como estaba',
      migrado.rec && migrado.rec.it === undefined,
      'se migra solo la mitad cuyo secreto se acaba de comprobar');

    /* Y el sobre migrado tiene que abrir con la MISMA frase: si no, la
       migracion silenciosa dejaria los datos inaccesibles para siempre. */
    let reabre = false;
    try { await apiD._encUnwrapMK(migrado.pw, FRASE); reabre = true; } catch (e) {}
    comprobar('sobre antiguo · el sobre ya migrado vuelve a abrir con la misma frase', reabre,
      'si esto falla, la migracion deja los datos de la nube irrecuperables');
  }


  /* i) La llave del dispositivo -----------------------------------
     Lo que la v2 viene a arreglar: que copiar el localStorage —una
     captura, una extension, un respaldo, un vistazo a la consola— ya
     no baste para descifrar nada. */

  const llaveDev = A.idb.get('us19_llave_dispositivo');
  comprobar('dispositivo · la llave queda en IndexedDB, no en localStorage', !!llaveDev);
  igual('dispositivo · la llave es NO exportable', llaveDev ? llaveDev.extractable : null, false);
  let exporto = false;
  try { await crypto.subtle.exportKey('raw', llaveDev); exporto = true; } catch (e) { /* correcto */ }
  comprobar('dispositivo · el navegador se niega a exportarla', !exporto,
    'si se pudiera exportar, un XSS se la llevaria igual que antes');

  /* Copio SOLO el localStorage, como quien manda una captura o vuelca
     la pestana de Aplicacion del inspector. */
  const soloLS = nuevoEntorno(A.store, null);
  await soloLS.api.encRestoreFromCache();
  igual('dispositivo · con SOLO el localStorage copiado NO se abre', soloLS.api.encUnlocked(), false);
  let leyoLS = false;
  try { await soloLS.api.encDecryptPayload(sobre); leyoLS = true; } catch (e) { /* correcto */ }
  comprobar('dispositivo · y por tanto no puede leer el estado de la nube', !leyoLS,
    'este es el escenario real: alguien se lleva el contenido de localStorage');

  /* El perfil entero (localStorage + IndexedDB) si abre: es el mismo
     equipo. La defensa contra ESO es el PIN, que va justo debajo. */
  const perfil = nuevoEntorno(A.store, A.idb);
  await perfil.api.encRestoreFromCache();
  igual('dispositivo · con el perfil entero copiado si abre (mismo equipo)', perfil.api.encUnlocked(), true);
  igual('dispositivo · y lee el estado', await perfil.api.encDecryptPayload(sobre), ESTADO);

  /* ii) El equipo que venia de la v1, con la llave en claro -------- */

  const V1 = nuevoEntorno();
  const mkPlano = vm.runInContext('_encB64(_encRand(32).buffer)', V1.ctx);
  V1.store['ultrasport19_mk'] = mkPlano;
  V1.store['ultrasport19_env'] = A.store['ultrasport19_env'];
  await V1.api.encRestoreFromCache();
  igual('migracion · el equipo de la v1 arranca desbloqueado igual que antes', V1.api.encUnlocked(), true);
  comprobar('migracion · la llave en claro se retira de localStorage', !V1.store['ultrasport19_mk'],
    'si no se retira, la v2 no sirve de nada en los equipos que ya existian');
  comprobar('migracion · y queda envuelta', !!V1.store['ultrasport19_mk2']);
  comprobar('migracion · el envoltorio NO contiene los bytes de la llave',
    (V1.store['ultrasport19_mk2'] || '').indexOf(mkPlano.slice(0, 20)) < 0);

  /* Y sobre todo: que siga siendo la MISMA llave, o la migracion
     dejaria la nube ilegible sin avisar. */
  const V1b = nuevoEntorno(V1.store, V1.idb);
  await V1b.api.encRestoreFromCache();
  const mkTrasMigrar = vm.runInContext('_encB64(_encMkRaw)', V1b.ctx);
  igual('migracion · la llave sigue siendo exactamente la misma', mkTrasMigrar, mkPlano);

  /* iii) El PIN como segundo factor -------------------------------- */

  const P = nuevoEntorno();
  await P.api.encSetup(FRASE);
  const sobreP = await P.api.encEncryptPayload(ESTADO);
  await P.api.encPinActivar('4721');
  igual('pin · queda marcado en los ajustes', P.settings.encPinRequerido, true);
  comprobar('pin · el envoltorio guarda su sal y sus vueltas',
    !!(JSON.parse(P.store['ultrasport19_mk2'] || '{}').pin || {}).salt);

  const robado = nuevoEntorno(P.store, P.idb);   // perfil entero copiado
  await robado.api.encRestoreFromCache();
  igual('pin · el perfil entero copiado YA NO abre solo', robado.api.encUnlocked(), false);

  let pinMalo = false;
  try { await robado.api.encDesbloquearConPin('0000'); }
  catch (e) { pinMalo = true; }
  comprobar('pin · un PIN equivocado no abre', pinMalo);
  igual('pin · y sigue cerrado', robado.api.encUnlocked(), false);

  await robado.api.encDesbloquearConPin('4721');
  igual('pin · el PIN correcto abre', robado.api.encUnlocked(), true);
  igual('pin · y lee el estado', await robado.api.encDecryptPayload(sobreP), ESTADO);

  await P.api.encPinDesactivar();
  const sinPin = nuevoEntorno(P.store, P.idb);
  await sinPin.api.encRestoreFromCache();
  igual('pin · al quitarlo, el equipo vuelve a abrir solo', sinPin.api.encUnlocked(), true);

  /* iv) La fuerza de la contrasena --------------------------------- */

  const F = A.api.encFuerzaFrase;
  igual('frase · ocho caracteres ya no valen', F('abcd1234').ok, false);
  igual('frase · doce pero todo minusculas tampoco', F('abcdefghijkl').ok, false);
  igual('frase · el nombre del gimnasio no vale', F('ultrasport19gym').ok, false);
  igual('frase · un caracter repetido no vale', F('aaaaaaaaaaaaaa').ok, false);
  igual('frase · corta no vale ni con mayusculas, numeros y simbolos', F('Ab1!x').ok, false);
  igual('frase · doce con mezcla si vale', F('Rocaverde2026!').ok, true);
  igual('frase · una frase larga sin mezcla tambien vale', F('caballo verde de la sierra').ok, true);
  comprobar('frase · la larga puntua mas que la justa',
    F('caballo verde de la sierra').nivel > F('Abcdefghijk1').nivel);

  let cortaFallo = false;
  try { await nuevoEntorno().api.encSetup('corta123'); }
  catch (e) { cortaFallo = true; }
  comprobar('frase · encSetup rechaza una contrasena debil', cortaFallo,
    'sin esto el aviso de la interfaz se salta llamando a la funcion directamente');

  /* v) Cambiar la contrasena sin regenerar la master key ------------ */

  const C2 = nuevoEntorno();
  await C2.api.encSetup(FRASE);
  const sobreC2 = await C2.api.encEncryptPayload(ESTADO);
  const NUEVA = 'otra frase larga y distinta 2026';
  await C2.api.encCambiarFrase(NUEVA);

  igual('cambiar frase · lo cifrado ANTES se sigue leyendo',
    await C2.api.encDecryptPayload(sobreC2), ESTADO);

  const tras = nuevoEntorno();
  vm.runInContext('_encEnvelope = ' + C2.store['ultrasport19_env'] + ';', tras.ctx);
  const apiTras = vm.runInContext('({ encUnlock:encUnlock, encUnlocked:encUnlocked, encDecryptPayload:encDecryptPayload })', tras.ctx);
  await apiTras.encUnlock(NUEVA, false);
  igual('cambiar frase · otro equipo entra con la nueva', apiTras.encUnlocked(), true);
  igual('cambiar frase · y llega al MISMO estado (la llave no cambio)',
    await apiTras.encDecryptPayload(sobreC2), ESTADO);

  let viejaFallo = false;
  try {
    const v = nuevoEntorno();
    vm.runInContext('_encEnvelope = ' + C2.store['ultrasport19_env'] + ';', v.ctx);
    await vm.runInContext('({ encUnlock:encUnlock })', v.ctx).encUnlock(FRASE, false);
  } catch (e) { viejaFallo = true; }
  comprobar('cambiar frase · la contrasena vieja deja de servir', viejaFallo);

  let debilFallo = false;
  try { await C2.api.encCambiarFrase('corta1'); } catch (e) { debilFallo = true; }
  comprobar('cambiar frase · tampoco acepta una debil', debilFallo);

  /* vi) Clave de recuperacion nueva -------------------------------- */

  const recNueva = await C2.api.encRegenerarRecuperacion();
  comprobar('recuperacion nueva · tiene el formato de hoy',
    /^US19(-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{5}){4}$/.test(recNueva || ''));
  const rn = nuevoEntorno();
  vm.runInContext('_encEnvelope = ' + C2.store['ultrasport19_env'] + ';', rn.ctx);
  const apiRn = vm.runInContext('({ encUnlock:encUnlock, encUnlocked:encUnlocked, encDecryptPayload:encDecryptPayload })', rn.ctx);
  await apiRn.encUnlock(recNueva, true);
  igual('recuperacion nueva · abre', apiRn.encUnlocked(), true);
  igual('recuperacion nueva · y da el mismo estado', await apiRn.encDecryptPayload(sobreC2), ESTADO);

  /* vii) Se dicta por telefono: minusculas y sin guiones ------------ */

  const norm = A.api.encNormalizarClaveRec;
  igual('dictado · minusculas y espacios se limpian',
    norm(' us19-abcde-fghjk-mnpqr-stvwx '), 'US19-ABCDE-FGHJK-MNPQR-STVWX');
  igual('dictado · sin guiones se reagrupa de cinco',
    norm('US19ABCDEFGHJKMNPQRSTVWX'), 'US19-ABCDE-FGHJK-MNPQR-STVWX');
  const dic = nuevoEntorno();
  vm.runInContext('_encEnvelope = ' + A.store['ultrasport19_env'] + ';', dic.ctx);
  const apiDic = vm.runInContext('({ encUnlock:encUnlock, encUnlocked:encUnlocked })', dic.ctx);
  await apiDic.encUnlock(recovery.toLowerCase().replace(/-/g, ''), true);
  igual('dictado · la clave escrita en minusculas y sin guiones abre igual', apiDic.encUnlocked(), true);

  /* viii) El sorteo de la clave, sin sesgo -------------------------- */

  const cuenta = {}, ALFA = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  let sueltos = 0;
  for (let i = 0; i < 3000; i++) {
    const k = A.api.encGenRecoveryKey().slice(5).replace(/-/g, '');
    for (const ch of k) { cuenta[ch] = (cuenta[ch] || 0) + 1; sueltos++; }
  }
  comprobar('sorteo · solo salen letras del alfabeto elegido',
    Object.keys(cuenta).every(function (c) { return ALFA.indexOf(c) >= 0; }),
    'salio ' + Object.keys(cuenta).filter(function (c) { return ALFA.indexOf(c) < 0; }).join(''));
  igual('sorteo · aparecen los 30 simbolos', Object.keys(cuenta).length, 30);
  /* Chi-cuadrado, que es lo que de verdad ve un sesgo. Con 29 grados de
     libertad, un sorteo limpio da ~29 y pasa de 80 una vez entre un millon;
     el sesgo del modulo (los primeros simbolos un 6 % mas frecuentes) da del
     orden de 200. La desviacion maxima a ojo no lo distinguia. */
  const esperado = sueltos / 30;
  const chi = ALFA.split('').reduce(function (acc, c) {
    const d = (cuenta[c] || 0) - esperado;
    return acc + d * d / esperado;
  }, 0);
  comprobar('sorteo · el reparto no tiene sesgo (chi-cuadrado)', chi < 80,
    'chi2 = ' + chi.toFixed(1) + ' sobre 29 esperados — un `%` sin descarte da ~200');

  /* ix) Freno a los intentos a lo bruto ---------------------------- */

  const T = nuevoEntorno();
  vm.runInContext('_encEnvelope = ' + A.store['ultrasport19_env'] + ';', T.ctx);
  const apiT = vm.runInContext('({ encUnlock:encUnlock, encUnlocked:encUnlocked })', T.ctx);
  for (let i = 0; i < 3; i++) {
    try { await apiT.encUnlock('no es la frase ' + i, false); } catch (e) {}
  }
  let frenado = '';
  try { await apiT.encUnlock('tampoco es', false); } catch (e) { frenado = e.message || ''; }
  comprobar('freno · tras tres fallos hay que esperar', /intentos/i.test(frenado),
    'obtuve ' + JSON.stringify(frenado));
  comprobar('freno · la espera queda anotada en localStorage', !!T.store['us19_enc_fallos']);
  /* Y el freno no debe encasquillarse: con la frase buena, en cuanto
     pasa la espera, se abre y el contador se limpia. */
  T.store['us19_enc_fallos'] = JSON.stringify({ n: 3, ts: 0 });
  await apiT.encUnlock(FRASE, false);
  igual('freno · pasada la espera, la frase buena abre', apiT.encUnlocked(), true);
  comprobar('freno · y el contador se borra', !T.store['us19_enc_fallos']);

  /* xi) El segundo factor no se cae solo --------------------------
     Escenario real: 2FA puesto, se recarga la pestana, el candado no
     vuelve a pedir el PIN (la sesion sigue abierta) y Diego entra con
     la contrasena maestra. Guardar la llave ahi SIN la capa del PIN
     rebajaria la seguridad en silencio y la copia siguiente del perfil
     ya abriria sola. */

  const S = nuevoEntorno();
  await S.api.encSetup(FRASE);
  await S.api.encPinActivar('9182');
  comprobar('2FA · el envoltorio nace con la capa del PIN',
    !!(JSON.parse(S.store['ultrasport19_mk2'] || '{}').pin));
  const antesDe = S.store['ultrasport19_mk2'];

  vm.runInContext('window._u19PinMem = ""; _encMkRaw = null;', S.ctx);
  await S.api.encUnlock(FRASE, false);
  igual('2FA · entrar con la contrasena maestra desbloquea igual', S.api.encUnlocked(), true);
  comprobar('2FA · pero NO rebaja el envoltorio a uno sin PIN',
    !!(JSON.parse(S.store['ultrasport19_mk2'] || '{}').pin),
    'si se rebaja, el segundo factor se apaga solo sin que nadie lo note');
  igual('2FA · de hecho no se toca lo que habia', S.store['ultrasport19_mk2'], antesDe);

  /* Y con el PIN de vuelta, se vuelve a guardar como debe. */
  await S.api.encPinActivar('9182');
  comprobar('2FA · con el PIN de vuelta se guarda otra vez',
    S.store['ultrasport19_mk2'] !== antesDe
    && !!(JSON.parse(S.store['ultrasport19_mk2'] || '{}').pin));

  /* x) Si el envoltorio no se puede volver a abrir, no se toca nada -
     Es la red que impide que un fallo al guardar deje el equipo sin
     llave Y sin copia. Se fuerza con una llave de dispositivo que cifra
     pero no descifra: el envoltorio sale, la verificacion falla, y lo
     que habia tiene que seguir donde estaba. */

  const coja = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const R = nuevoEntorno({ 'ultrasport19_mk': mkPlano,
                           'ultrasport19_env': A.store['ultrasport19_env'] },
                         [['us19_llave_dispositivo', coja]]);
  await R.api.encRestoreFromCache();
  comprobar('a prueba de fallos · si el envoltorio no se verifica, la llave en claro SE CONSERVA',
    R.store['ultrasport19_mk'] === mkPlano,
    'borrarla sin haber verificado deja el equipo sin llave y sin copia de la llave');
  comprobar('a prueba de fallos · y no se escribe un envoltorio que no abre',
    !R.store['ultrasport19_mk2']);
  igual('a prueba de fallos · la sesion en curso sigue funcionando', R.api.encUnlocked(), true);

  /* g) El estado de verdad, no uno de juguete ---------------------- */

  const grande = JSON.stringify({ clients: new Array(2000).fill(0).map(function (_, i) {
    return { id: 'c' + i, name: 'Socio ' + i, phone: '+56 9 0000 ' + i, notes: 'nota '.repeat(20) };
  }) });
  const t0 = process.hrtime.bigint();
  const sobreGrande = await A.api.encEncryptPayload(grande);
  const vueltaGrande = await A.api.encDecryptPayload(sobreGrande);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  igual('tamaño real · un estado de ' + Math.round(grande.length / 1024) + ' KB va y vuelve intacto', vueltaGrande, grande);
  aviso('cifrar + descifrar ' + Math.round(grande.length / 1024) + ' KB: ' + ms.toFixed(0) + ' ms');

  /* h) Lo que la app promete en el codigo -------------------------- */

  comprobar('parametros · PBKDF2 va a 1.200.000 vueltas', /ENC_PBKDF2_ITERS\s*=\s*1200000/.test(modulo));
  comprobar('parametros · se recuerdan las 150.000 de los sobres antiguos', /ENC_PBKDF2_LEGACY\s*=\s*150000/.test(modulo));
  comprobar('parametros · cada sobre escribe sus propias vueltas', /it:\s*ENC_PBKDF2_ITERS/.test(modulo));
  comprobar('parametros · antes de tirar un sobre viejo se comprueba que el nuevo abre',
    /_encUnwrapMK\(nuevo, secret\)/.test(modulo),
    'sin esta comprobacion, una migracion fallida deja los datos inaccesibles');
  comprobar('parametros · la llave del dispositivo se genera NO exportable',
    /generateKey\(\{\s*name:"AES-GCM", length:256\s*\}, false,/.test(modulo),
    'con extractable:true un XSS podria exportarla y volveriamos a la v1');
  comprobar('parametros · el envoltorio se verifica antes de borrar el rastro viejo',
    /_encCargarMKDe\(blob, pin\)[\s\S]{0,400}removeItem\(ENC_MK_KEY\)/.test(modulo),
    'sin verificar, un fallo al escribir dejaria el equipo sin llave y sin copia');
  comprobar('parametros · el PIN no se guarda en ningun sitio',
    modulo.indexOf('setItem(ENC_PIN') < 0 && !/localStorage\.setItem\([^)]*[Pp]in[^)]*,\s*(pin|String\(pin)/.test(modulo),
    'el PIN vive solo en memoria; en disco esta su SHA-256, que no descifra');
}

function nuevoEntornoConSobre(A) {
  const E = nuevoEntorno();
  vm.runInContext('_encEnvelope = ' + A.store['ultrasport19_env'] + ';', E.ctx);
  return vm.runInContext('({ encUnlock:encUnlock })', E.ctx);
}

principal().then(function () {
  console.log('');
  console.log('US19-APP · cifrado de la sincronizacion');
  console.log('archivo: ' + ruta);
  console.log('');
  avisos.forEach(function (a) { console.log('  · ' + a); });
  console.log('');
  if (fallos.length) {
    console.log('FALLOS (' + fallos.length + '):');
    fallos.forEach(function (f) { console.log('  ✗ ' + f); });
    console.log('');
    console.log('comprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + fallos.length);
    process.exit(1);
  }
  console.log('comprobaciones OK: ' + ok + '  ·  sin fallos');
  process.exit(0);
}).catch(function (e) {
  console.log('');
  console.log('  ✗ la suite reventó: ' + (e && e.stack || e));
  process.exit(1);
});
