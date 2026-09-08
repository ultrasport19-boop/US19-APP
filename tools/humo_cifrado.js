/* =====================================================================
 * US19-APP · La caja fuerte, en el navegador de verdad
 * ---------------------------------------------------------------
 * tools/cifrado.js ejecuta el modulo con un IndexedDB de mentira. Eso
 * cubre la logica, pero no responde a la unica pregunta que importa el
 * dia que pasa algo:
 *
 *     en ESTE navegador, ¿esta la llave donde tiene que estar?
 *
 * Esto lo comprueba sobre los datos reales y SIN TOCAR NADA: solo lee
 * localStorage e IndexedDB, y el unico cifrado que hace es de una
 * cadena de prueba que no se guarda en ningun sitio.
 *
 *     node tools/humo_cifrado.js
 *
 * Imprime un trozo de codigo. Se abre la app, se pega en la consola
 * (F12) y se lee el resultado.
 * ===================================================================== */

const COMPROBACIONES = async function () {
  const ok = [], mal = [], nota = [];
  const di = function (c, txt) { (c ? ok : mal).push(txt); };
  const L = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* --- 1 · Que la app sea la de hoy ---------------------------------- */
  di(typeof window.encUnlocked === 'function', 'el modulo de cifrado esta cargado');
  di(typeof window._encGuardarMK === 'function' || typeof window.encDesbloquearConPin === 'function',
     'esta la version v2 de la caja fuerte (si falla, el navegador sirve una copia vieja: Ctrl+F5)');

  /* --- 2 · La llave en claro tiene que haber desaparecido ------------- */
  const claro = L('ultrasport19_mk');
  const envuelta = L('ultrasport19_mk2');
  di(!claro, 'la master key YA NO esta en claro en localStorage'
     + (claro ? ' (sigue ahi: la migracion no ha corrido, recarga con la app desbloqueada)' : ''));
  di(!!envuelta, 'existe la master key envuelta (ultrasport19_mk2)');
  let blob = null;
  try { blob = JSON.parse(envuelta || 'null'); } catch (e) {}
  di(!!blob && blob.v === 2, 'el envoltorio va marcado como v2');
  nota.push('segundo factor (PIN): ' + (blob && blob.pin ? 'SI' : 'no'));

  /* --- 3 · La llave del dispositivo, dentro de IndexedDB ------------- */
  let llave = null;
  try { llave = await u19IdbLeer('us19_llave_dispositivo'); } catch (e) {}
  di(!!llave, 'la llave del dispositivo esta en IndexedDB');
  di(!!llave && llave.extractable === false, 'y esta marcada como NO exportable');
  if (llave) {
    let exporto = false;
    try { await crypto.subtle.exportKey('raw', llave); exporto = true; } catch (e) {}
    di(!exporto, 'el navegador se niega a exportarla (nadie puede copiarla)');
  }

  /* --- 4 · Nada legible por ahi suelto -------------------------------- */
  let sospechosas = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (/mk|key|llave|secret/i.test(k) && k !== 'ultrasport19_mk2') sospechosas.push(k);
    }
  } catch (e) {}
  di(sospechosas.length === 0, 'no hay otras claves con pinta de llave en localStorage'
     + (sospechosas.length ? ': ' + sospechosas.join(', ') : ''));

  /* --- 5 · Que de verdad cifre y descifre ----------------------------- */
  nota.push('estado: ' + (encUnlocked() ? 'desbloqueado' : (window._encFaltaPin ? 'esperando el PIN' : 'bloqueado')));
  if (encUnlocked()) {
    const prueba = 'prueba de humo ' + Date.now() + ' · ñ á «100 %»';
    try {
      const sobre = await encEncryptPayload(JSON.stringify({ x: prueba }));
      const txt = JSON.stringify(sobre);
      di(txt.indexOf(prueba) < 0, 'lo cifrado no deja el texto a la vista');
      const vuelta = JSON.parse(await encDecryptPayload(sobre));
      di(vuelta.x === prueba, 'cifrar y descifrar devuelve exactamente lo mismo');
    } catch (e) { di(false, 'cifrar/descifrar reventó: ' + (e && e.message)); }
  } else {
    nota.push('no se probo el ida y vuelta: la app esta bloqueada');
  }

  /* --- 6 · Ajustes y respaldos --------------------------------------- */
  nota.push('cierre automatico: ' + (settings.encPinRequerido
    ? ((Number(settings.encAutoLockMin) || 0) ? settings.encAutoLockMin + ' min' : 'nunca')
    : 'apagado (necesita el PIN como segundo factor)'));
  const ts = Number(L('us19_resp_ts') || 0);
  const lb = Number(L((window.APP_KEY || 'ultrasport19_v1') + '_lastbackup') || 0);
  const dias = function (t) { return t ? Math.floor((Date.now() - t) / 86400000) + ' d' : 'nunca'; };
  nota.push('respaldo cifrado: ' + dias(ts) + '  ·  copia simple: ' + dias(lb));
  if (!ts) mal.push('NUNCA has hecho un respaldo cifrado: Ajustes › Datos y respaldos');

  console.log('%cUS19 · caja fuerte del dispositivo', 'font-weight:bold;font-size:14px');
  nota.forEach(function (n) { console.log('   · ' + n); });
  ok.forEach(function (t) { console.log('%c ✓ ' + t, 'color:#16a34a'); });
  mal.forEach(function (t) { console.log('%c ✗ ' + t, 'color:#dc2626'); });
  console.log(mal.length ? '%c' + mal.length + ' cosa(s) que mirar' : '%ctodo en orden (' + ok.length + ' comprobaciones)',
              'font-weight:bold;color:' + (mal.length ? '#dc2626' : '#16a34a'));
  return { ok: ok.length, fallos: mal.length };
};

console.log('');
console.log('1. Abre la app en el navegador y desbloquea el cifrado si te lo pide.');
console.log('2. Abre la consola con F12 y pega esto entero:');
console.log('');
console.log('(' + COMPROBACIONES.toString() + ')();');
console.log('');
console.log('3. Lee las lineas verdes y rojas. No cambia nada: solo lee.');
console.log('');
