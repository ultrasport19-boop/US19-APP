/* Lo que ve el socio de la readaptación.
 *
 *   node tools/socio.js [index.html]
 *
 * POR QUE EXISTE
 * La readaptación vive en la app de Diego y ahí se trabaja, pero nada de eso
 * se le menciona a un socio ni sale a lo publico (regla del 8-sep-2026,
 * precisada el 11-sep). El 11-sep salian SEIS cosas por los enlaces y los
 * documentos que recibe la gente: «Rutina terapeutica» en la cabecera, el
 * nombre de la condicion en las fases compartidas, el objetivo clinico de la
 * fase, «tu fase de rehabilitacion» en el WhatsApp, la columna «EVA» y
 * «Paciente en rehabilitacion» en el informe impreso. Ninguna suite miraba lo
 * que sale hacia el socio.
 *
 * Aqui se ejecutan de verdad las funciones que construyen lo que sale —con las
 * cinco plantillas base y las 22 condiciones del catalogo— y se barre cada
 * texto que el socio puede leer.
 *
 * Igual que series.js: si no encuentra lo que busca, FALLA.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

let ok = 0;
const fallos = [], avisos = [];
const pasa = () => { ok++; };
const falla = (n, d) => fallos.push(n + (d ? '  →  ' + d : ''));
const comprobar = (n, c, d) => { if (c) pasa(); else falla(n, d); };
const igual = (n, a, b) => {
  if (a === b) pasa();
  else falla(n, 'esperaba ' + JSON.stringify(b) + ', obtuvo ' + JSON.stringify(a));
};
const aviso = (t) => avisos.push(t);

/* --- Sacar codigo del index.html, contando llaves ---------------------
   Varias de estas funciones son de una linea (`function x(){ ... }`): cortar
   en el primer «\n}\n» se llevaria media pagina de mas. */
function fn(nombre) {
  const i = src.indexOf('\nfunction ' + nombre + '(');
  if (i < 0) { console.error('socio: no encuentro la funcion ' + nombre); process.exit(1); }
  const abre = src.indexOf('{', i);
  let d = 0;
  for (let k = abre; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i + 1, k + 1) + '\n'; }
  }
  console.error('socio: llaves sin cerrar en ' + nombre); process.exit(1);
}
function lista(nombre) {
  const i = src.indexOf('\nvar ' + nombre + ' = [');
  if (i < 0) { console.error('socio: no encuentro ' + nombre); process.exit(1); }
  const j = src.indexOf('\n];', i);
  return src.slice(i + 1, j + 3) + '\n';
}
function linea(inicio) {
  const i = src.indexOf('\n' + inicio);
  if (i < 0) { console.error('socio: no encuentro «' + inicio + '»'); process.exit(1); }
  return src.slice(i + 1, src.indexOf('\n', i + 1)) + '\n';
}
function cuerpo(nombre) { return fn(nombre); }

/* --- Montar lo que decide que sale ------------------------------------ */
let M;
const EXS = {};   // la biblioteca fingida: lo que devuelve getExercise
const AJUSTES = {}; // los ajustes fingidos: aqui se ponen llaves falsas
try {
  M = new Function('EXS', 'AJUSTES', [
    fn('escapeHtml'),
    linea('var U19_SOCIO_VETADAS'),
    lista('RC_PATOLOGIAS'),
    lista('RC_EJERCICIOS_BASE'),
    fn('u19EsRehabCat'), fn('u19Semanas'), fn('u19RutinaSensible'), fn('u19CompartirDestino'), fn('u19EnlaceSc'),
    fn('u19NombreParaSocio'), fn('u19BadgeSocio'), fn('u19MensajeFaseSocio'),
    fn('rcPe'), fn('rcPh'), fn('rcProto'), fn('rcProtocolosBase'),
    fn('buildShareData'), fn('buildPhaseShareData'), fn('routineShareIssues'),
    fn('u19Arr'), fn('maskToken'), fn('getGitHubConfig'), fn('u19BateriaLineaSocio'),
    linea('var DATA_BRANCH'),
    'var settings = AJUSTES;',
    'function getDerivedRepo(){ return ""; }',
    'function getAppBaseUrl(){ return "https://x.test/app/"; }',
    'function getClient(id){ return id ? { id: id, name: "Socia de prueba" } : null; }',
    'function getExercise(id){ return EXS[id] || null; }',
    'return { U19_SOCIO_VETADAS, RC_PATOLOGIAS, RC_EJERCICIOS_BASE, u19EsRehabCat, u19NombreParaSocio,',
    '  u19BadgeSocio, u19MensajeFaseSocio, rcProtocolosBase, buildShareData, buildPhaseShareData,',
    '  u19Semanas, u19RutinaSensible, u19CompartirDestino, u19EnlaceSc, routineShareIssues, maskToken,',
    '  u19BateriaLineaSocio };'
  ].join('\n'))(EXS, AJUSTES);
} catch (e) {
  console.error('socio: el codigo no evalua aislado: ' + e.message);
  process.exit(1);
}

/* La biblioteca: los ejercicios base de verdad, y el resto con su id por nombre
   (el catalogo grande no vive en index.html, y aqui importa lo que se ESCRIBE
   alrededor, no como se llama cada ejercicio). */
M.RC_EJERCICIOS_BASE.forEach(e => { EXS[e.id] = e; });
const BASE = M.rcProtocolosBase();
BASE.forEach(p => p.phases.forEach(ph => ph.exercises.forEach(x => {
  if (!EXS[x.exerciseId]) EXS[x.exerciseId] = { id: x.exerciseId, name: 'Ejercicio ' + x.exerciseId, desc: '' };
})));

/* --- Lo que un socio no puede leer ------------------------------------ */
const PROHIBIDO = /kinesiolog|kin[eé]sic|paciente|rehabilit|diagn[oó]stic|tratamiento|patolog|terap[eé]ut|terapia|lesi[oó]n|cl[ií]nic|fisioter|\bEVA\b/i;
const CONDICIONES = M.RC_PATOLOGIAS.map(p => String(p.nombre).toLowerCase())
  .concat(BASE.map(p => String(p.name).toLowerCase()));
function textoVetado(t) {
  const s = String(t == null ? '' : t);
  const m = PROHIBIDO.exec(s);
  if (m) return '«' + m[0] + '» en «' + s.slice(Math.max(0, m.index - 30), m.index + 40) + '»';
  const low = s.toLowerCase();
  const c = CONDICIONES.find(n => n && low.indexOf(n) >= 0);
  return c ? 'la condicion «' + c + '» en «' + s.slice(0, 80) + '»' : null;
}
/* Todos los textos de un objeto, recorridos. Las CLAVES no se leen (zonaTerap
   es un nombre de campo, no algo que el socio vea); los valores si. */
function textos(o, out) {
  out = out || [];
  if (o == null) return out;
  if (typeof o === 'string') out.push(o);
  else if (Array.isArray(o)) o.forEach(x => textos(x, out));
  else if (typeof o === 'object') Object.keys(o).forEach(k => textos(o[k], out));
  return out;
}
const sinEtiquetas = h => String(h).replace(/<[^>]*>/g, ' ');

/* --- 1 · El nombre de un programa, tal como lo ve el socio ------------ */
{
  comprobar('nombre · hay cinco plantillas base con que probar', BASE.length === 5, 'hay ' + BASE.length);
  BASE.forEach(p => {
    const n = M.u19NombreParaSocio(p);
    comprobar('nombre · «' + p.name + '» no sale tal cual', n !== p.name, 'sale igual');
    igual('nombre · «' + p.name + '» sale como programa de su zona', n, 'Programa de ' + String(p.region).toLowerCase());
  });
  let caen = 0;
  M.RC_PATOLOGIAS.forEach(pa => {
    const n = M.u19NombreParaSocio({ name: pa.nombre, region: pa.region });
    if (!textoVetado(n) && n.indexOf(pa.nombre) < 0) caen++;
    else falla('nombre · la condicion «' + pa.nombre + '» se neutraliza', 'sale «' + n + '»');
  });
  comprobar('nombre · las ' + M.RC_PATOLOGIAS.length + ' condiciones del catalogo se neutralizan', caen === M.RC_PATOLOGIAS.length && caen >= 20,
    caen + ' de ' + M.RC_PATOLOGIAS.length);
  /* Y una condicion que se AÑADA al catalogo con palabras que la expresion no
     conoce: la tiene que cazar el recorrido por RC_PATOLOGIAS. Hoy las 22 las
     caza tambien la expresion, asi que sin este caso el recorrido no se
     probaria nunca (un mutante que lo apagaba escapo). «Bursitis» no esta en
     la expresion a proposito. */
  M.RC_PATOLOGIAS.push({ id: 'prueba', nombre: 'Bursitis subacromial', region: 'Hombro' });
  igual('nombre · una condicion nueva del catalogo se caza aunque la expresion no la conozca',
    M.u19NombreParaSocio({ name: 'Plan bursitis subacromial de Ana', region: 'Hombro' }), 'Programa de hombro');
  comprobar('nombre · y la expresion de verdad no la conoce (si no, este caso no probaria el recorrido)',
    !M.U19_SOCIO_VETADAS.test('Plan bursitis subacromial de Ana'), 'la expresion ya la caza: cambiar el caso por otra palabra');
  M.RC_PATOLOGIAS.pop();
  igual('nombre · un nombre neutro se respeta', M.u19NombreParaSocio({ name: 'Programa hombro Juan', region: 'Hombro' }), 'Programa hombro Juan');
  igual('nombre · con zona «Otro» no inventa zona', M.u19NombreParaSocio({ name: 'Lesión de isquiotibiales', region: 'Otro' }), 'Programa de ejercicios');
  igual('nombre · sin nombre ni zona', M.u19NombreParaSocio({}), 'Programa de ejercicios');
  aviso('nombre · 5 plantillas base y ' + M.RC_PATOLOGIAS.length + ' condiciones, ejecutadas');
}

/* --- 2 · Una etapa compartida, de las cinco plantillas base ------------ */
{
  let etapas = 0;
  BASE.forEach(p => p.phases.forEach((ph, i) => {
    if (!ph.exercises || !ph.exercises.length) return;
    etapas++;
    const d = M.buildPhaseShareData(p, i);
    const quien = p.name + ' · fase ' + (i + 1);
    const malos = textos(d.routine).concat(textos(d.exercises)).map(textoVetado).filter(Boolean);
    comprobar('etapa · ' + quien + ': nada de lo que lee el socio esta vetado', malos.length === 0, malos.slice(0, 3).join('  |  '));
    igual('etapa · ' + quien + ': el titulo es «Etapa N»', d.routine.dayLabels[0], 'Etapa ' + (i + 1));
    igual('etapa · ' + quien + ': no viaja el objetivo de la fase', d.routine.notes, '');
    igual('etapa · ' + quien + ': el nombre es el neutro', d.routine.name, M.u19NombreParaSocio(p) + ' — Etapa ' + (i + 1));
  }));
  comprobar('etapa · se probaron las fases con ejercicios de las cinco plantillas', etapas >= 15, 'solo ' + etapas);
  aviso('etapa · ' + etapas + ' fases compartidas, construidas y barridas');
}

/* --- 3 · El WhatsApp de una etapa ------------------------------------- */
{
  BASE.forEach(p => {
    const t = M.u19MensajeFaseSocio(M.u19NombreParaSocio(p), 2, 'https://x.test/#r/abc');
    comprobar('whatsapp · «' + p.name + '»: nada vetado', !textoVetado(t), textoVetado(t));
  });
  const t = M.u19MensajeFaseSocio('Programa de rodilla', 3, 'https://x.test/#r/abc');
  comprobar('whatsapp · lleva el enlace', t.indexOf('https://x.test/#r/abc') >= 0, 'no aparece el enlace');
  comprobar('whatsapp · dice la etapa', t.indexOf('Etapa 3') >= 0, 'no dice «Etapa 3»');
  comprobar('whatsapp · pide la molestia de 0 a 10', /molestia/i.test(t) && /0 a 10/.test(t), 'no la pide');
  comprobar('whatsapp · firma como la marca', t.indexOf('Ultra-Sport 19') >= 0, 'sin firma');
}

/* --- 4 · El enlace de una rutina de readaptacion ----------------------- */
{
  EXS.e_sent = { id: 'e_sent', name: 'Sentadilla goblet', desc: 'Espalda neutra', terap: 'Pierna', pat: 'Sentadilla', niv: 'Principiante' };
  const rehab = { id: 'r1', name: 'Rutina de Ana', clientId: 'c1', category: 'rehabilitacion', enfoque: 'terap', zonaTerap: 'Pierna',
    days: [{ exercises: [{ exerciseId: 'e_sent', sets: '3', reps: '10' }] }] };
  const d = M.buildShareData(rehab);
  const ej = d.exercises.find(e => e.id === 'e_sent') || {};
  comprobar('enlace · la etiqueta terapeutica del ejercicio no viaja', !('terap' in ej), 'viaja terap=' + ej.terap);
  igual('enlace · la categoria de readaptacion no viaja', d.routine.category, '');
  igual('enlace · el enfoque terapeutico no viaja', d.routine.enfoque, '');
  /* 27-sep: Diego eligio la opcion A por Telegram (mensaje 2431): la zona a
     proteger YA NO viaja en el enlace, porque el archivo del enlace queda en
     la rama publica del repo. La cabecera del socio simplemente no la pinta. */
  igual('enlace · la zona a proteger ya no viaja (decision de Diego, 27-sep)', d.routine.zonaTerap, '');
  igual('enlace · y la otra categoria de readaptacion tampoco', M.buildShareData(Object.assign({}, rehab, { category: 'rehab' })).routine.category, '');
  const malos = textos(d).map(textoVetado).filter(Boolean);
  comprobar('enlace · nada de lo que lleva el enlace esta vetado', malos.length === 0, malos.slice(0, 3).join('  |  '));
  /* Que no se lleve por delante lo que NO es readaptacion. */
  const normal = M.buildShareData(Object.assign({}, rehab, { category: 'fuerza', enfoque: 'equilibrada', zonaTerap: '' }));
  igual('enlace · una rutina de fuerza conserva su categoria', normal.routine.category, 'fuerza');
  igual('enlace · y su enfoque', normal.routine.enfoque, 'equilibrada');
  comprobar('enlace · el patron y el nivel siguen viajando', ej.pat === 'Sentadilla' && ej.niv === 'Principiante', 'se perdieron');
  /* 29-sep-2026 (auditoria Fable, E23 y E24). El arreglo del 28-sep recorto el
     nombre del socio y nadie lo probaba; y el nombre de la rutina seguia
     viajando tal como se escribio. */
  igual('enlace · del socio viaja solo el nombre de pila y la inicial', d.client && d.client.name, 'Socia d.');
  igual('enlace · un nombre de rutina neutro se respeta', d.routine.name, 'Rutina de Ana');
  igual('enlace · el nombre de la rutina con una condicion sale neutro',
    M.buildShareData(Object.assign({}, rehab, { name: 'Rehabilitación de rodilla de Ana' })).routine.name, 'Programa de ejercicios');
  igual('enlace · una rutina sin nombre sigue sin nombre', M.buildShareData(Object.assign({}, rehab, { name: '' })).routine.name, '');
}

/* --- 5 · La cabecera de la rutina que abre el socio -------------------- */
{
  const b = M.u19BadgeSocio({ zonaTerap: 'Pierna' });
  comprobar('cabecera · dice la zona a proteger', sinEtiquetas(b).indexOf('Zona a proteger: Pierna') >= 0, b);
  comprobar('cabecera · y nada vetado', !textoVetado(sinEtiquetas(b)), textoVetado(sinEtiquetas(b)));
  igual('cabecera · sin zona no pinta nada', M.u19BadgeSocio({ category: 'rehabilitacion', enfoque: 'terap' }), '');
  comprobar('cabecera · la zona se escapa', M.u19BadgeSocio({ zonaTerap: '<img src=x onerror=alert(1)>' }).indexOf('<img') < 0, 'la zona entra cruda en el HTML');
  const vista = cuerpo('showClientView');
  comprobar('cabecera · la vista del socio pinta con u19BadgeSocio', vista.indexOf('u19BadgeSocio(r)') >= 0, 'showClientView ya no la usa');
  comprobar('cabecera · y no escribe «Rutina terapéutica» por su cuenta', !/Rutina terap[eé]utica/i.test(vista), 'vuelve la insignia vieja');
}

/* --- 6 · Lo que el socio lee en tablas y documentos -------------------- */
{
  ['buildExerciseBlock', 'showProgressReport', 'renderLivePlayer'].forEach(n => {
    const c = cuerpo(n);
    comprobar('tablas · ' + n + ' no rotula «EVA»', !/>EVA</.test(c), 'la columna vuelve a llamarse EVA');
  });
  const modal = cuerpo('openPhaseShareModal');
  comprobar('etapa · el WhatsApp sale de u19MensajeFaseSocio', modal.indexOf('u19MensajeFaseSocio(') >= 0, 'el modal arma su propio mensaje');
  comprobar('etapa · el PNG y el QR impreso llevan el nombre neutro',
    /downloadQrPng\(currentUrl, nombreSocio/.test(modal) && /printQr\(currentUrl, nombreSocio/.test(modal), 'vuelven a usar protocol.name');
  comprobar('etapa · buildPhaseShareData no manda el objetivo de la fase', cuerpo('buildPhaseShareData').indexOf('phase.objetivo') < 0, 'vuelve phase.objetivo');
  comprobar('bateria · el informe impreso no dice «Paciente en rehabilitación»', src.indexOf('Paciente en rehabilitación') < 0, 'vuelve la etiqueta');
}

/* --- 7 · El repositorio es publico ------------------------------------- */
{
  /* pruebas.js ya barre «kinesiologia». Esto cubre su adjetivo, que se colo
     el 11-sep en una etiqueta del formulario de la ficha. */
  const m = src.match(/kin[eé]sic[oa]s?/gi) || [];
  comprobar('publico · ni «kinésico» ni «kinésica» en el archivo', m.length === 0, m.length + ' vez/veces: ' + m.join(', '));
  /* 22-sep-2026 (auditoria de seguridad): los avisos al pie de los informes
     que recibe el socio decian «no constituye diagnóstico». Aunque sea para
     negarlo, la palabra llega al socio; la formula de la casa es la del bot. */
  const d = src.match(/constituyen? (un )?diagn[oó]stico/gi) || [];
  comprobar('publico · ningun informe del socio dice «no constituye diagnóstico»', d.length === 0, d.length + ' vez/veces');
  comprobar('publico · y el aviso de la casa esta en su sitio', (src.match(/no reemplaza la consulta con un profesional de la salud/gi) || []).length >= 8);
}

/* --- 8 · Una rutina con texto sensible no sale de este navegador -------
   29-sep-2026 (auditoria Fable, E23). El enlace corto deja copia en la rama
   publica del repositorio, y el de Bitly en un servicio de fuera. El nombre
   de la rutina y las notas viajaban tal como se escribieron. */
{
  const limpia = { id: 'r2', name: 'Fuerza de Ana', clientId: 'c1', category: 'fuerza', enfoque: 'equilibrada',
    notes: 'Sube la carga si sobran dos repeticiones', weekNotes: ['Semana de adaptacion', ''],
    days: [{ day: 1, exercises: [{ exerciseId: 'e_sent', sets: '3', reps: '10', notes: 'Espalda neutra' }] }] };
  const con = (extra) => Object.assign({}, limpia, extra);
  igual('sensible · una rutina de fuerza sin palabras vetadas no se marca', M.u19RutinaSensible(limpia).length, 0);
  [
    ['la nota general', { notes: 'Cuidado con la rodilla: sin dolor' }, 'dolor'],
    ['el nombre', { name: 'Post cirugía de hombro' }, 'cirug'],
    ['las notas por semana', { weekNotes: ['', 'Bajar carga si hay inflamación'] }, 'inflamaci'],
    ['los textos de los ejercicios', { days: [{ day: 1, exercises: [{ exerciseId: 'e_sent', sets: '3', reps: '10', notes: 'Rango sin dolor' }] }] }, 'dolor'],
    ['los textos de los ejercicios', { days: [{ day: 1, exercises: [{ exerciseId: 'e_sent', sets: '3', reps: 'hasta el dolor', notes: '' }] }] }, 'dolor'],
    ['el tipo de rutina', { category: 'rehabilitacion' }, 'readaptación'],
    ['el tipo de rutina', { category: 'rehab' }, 'readaptación'],
    ['el tipo de rutina', { enfoque: 'terap' }, 'readaptación'],
    ['el tipo de rutina', { zonaTerap: 'Hombro' }, 'readaptación'],
  ].forEach(c => {
    const r = M.u19RutinaSensible(con(c[1]));
    comprobar('sensible · se marca ' + c[0] + ' con ' + JSON.stringify(c[1]).slice(0, 60),
      r.length === 1 && r[0].donde === c[0] && r[0].palabra.toLowerCase() === c[2], JSON.stringify(r));
  });
  igual('sensible · dos textos, dos motivos', M.u19RutinaSensible(con({ name: 'Plan lesión', notes: 'sin dolor' })).length, 2);
  igual('sensible · el id de un ejercicio no cuenta como texto',
    M.u19RutinaSensible(con({ days: [{ day: 1, exercises: [{ exerciseId: 'dolor_lumbar_01', sets: '3', reps: '10', notes: '' }] }] })).length, 0);
  igual('sensible · sin rutina no revienta', M.u19RutinaSensible(null).length, 0);

  igual('destino · con texto sensible, enlace largo aunque haya Bitly y GitHub', M.u19CompartirDestino(true, true, true), 'largo');
  igual('destino · con texto sensible y solo GitHub, enlace largo', M.u19CompartirDestino(true, false, true), 'largo');
  igual('destino · sin texto sensible y con Bitly, Bitly', M.u19CompartirDestino(false, true, true), 'bitly');
  igual('destino · sin Bitly y con GitHub, GitHub', M.u19CompartirDestino(false, false, true), 'github');
  igual('destino · sin nada configurado, enlace largo', M.u19CompartirDestino(false, false, false), 'largo');

  const av = M.routineShareIssues(con({ notes: 'Sin dolor en la rodilla' }));
  comprobar('sensible · compartir avisa, dice donde y dice la palabra',
    av.warnings.some(w => /palabras sensibles en la nota general/.test(w) && /«dolor»/.test(w) && /no se guarda en GitHub ni en Bitly/.test(w)), JSON.stringify(av.warnings));
  comprobar('sensible · el aviso no bloquea', av.blocker === null, String(av.blocker));
  igual('sensible · una rutina limpia no avisa de nada', M.routineShareIssues(limpia).warnings.length, 0);

  const modal = cuerpo('openShareModal');
  comprobar('destino · el modal decide con u19CompartirDestino',
    modal.indexOf('u19CompartirDestino(_sens.length > 0, !!settings.bitlyToken, hasGitHub)') >= 0 && modal.indexOf('var _sens = u19RutinaSensible(r);') >= 0,
    'el modal ya no pregunta por donde sale el enlace');
  comprobar('destino · el modal solo acorta con Bitly si el destino es Bitly',
    modal.indexOf('if (settings.bitlyToken){') < 0 && modal.indexOf('} else if (_destino === "bitly"){') >= 0, 'vuelve a acortar sin mirar el destino');
  comprobar('destino · el modal solo sube a GitHub si el destino es GitHub',
    modal.indexOf('} else if (hasGitHub){') < 0 && modal.indexOf('} else if (_destino === "github"){') >= 0, 'vuelve a subir sin mirar el destino');
  comprobar('destino · el WhatsApp, el PNG y el QR impreso llevan el nombre neutro',
    !/\(r\.name\s*\|\|/.test(modal) && !/printQr\(currentUrl, r\.name/.test(modal) && (modal.match(/data\.routine\.name\s*\|\|/g) || []).length === 3, 'vuelve r.name');
  aviso('sensible · 9 formas de texto sensible, 5 destinos y el aviso, ejecutados');
}

/* --- 9 · Lo que se sube no lleva ninguna llave -------------------------
   29-sep-2026 (auditoria Fable, E24). La guarda de pruebas.js busca
   «maskToken(settings.»: con leer el token de otra parte seguia en verde. Aqui
   se EJECUTA lo que arma el archivo, con llaves falsas en los ajustes, y se
   busca la llave en todas sus formas. */
{
  /* Llaves falsas SIN forma de credencial: la barrera de secretos lee tambien este
     archivo y una cadena con forma de token cancela el commit. */
  const FALSA_G = 'LLAVE-FALSA-DE-GITHUB-0123456789', FALSA_B = 'LLAVE-FALSA-DE-BITLY-0123456789';
  AJUSTES.githubToken = FALSA_G; AJUSTES.githubRepo = 'alguien/repo'; AJUSTES.githubBranch = 'main';
  AJUSTES.bitlyToken = FALSA_B; AJUSTES.bitlyDomain = 'bit.ly'; AJUSTES.calendlyToken = 'cal_FALSA'; AJUSTES.claudeKey = 'sk-FALSA'; AJUSTES.dashClave = 'claveFALSA';
  const rutina = { id: 'r3', name: 'Fuerza de Ana', clientId: 'c1', category: 'fuerza',
    days: [{ day: 1, exercises: [{ exerciseId: 'e_sent', sets: '3', reps: '10', notes: '' }] }] };
  const sc = M.u19EnlaceSc();
  const sube = JSON.stringify(Object.assign({}, M.buildShareData(rutina), { sc: sc }));
  const alReves = t => t.split('').reverse().join('');
  [['tal cual', FALSA_G], ['enmascarada', M.maskToken(FALSA_G)], ['al reves', alReves(FALSA_G)],
   ['en base64', Buffer.from(FALSA_G).toString('base64')], ['en base64 al reves', Buffer.from(alReves(FALSA_G)).toString('base64')],
   ['la de Bitly', FALSA_B], ['la de Bitly enmascarada', M.maskToken(FALSA_B)], ['la de Calendly', 'cal_FALSA'],
   ['la de Claude', 'sk-FALSA'], ['la del panel', 'claveFALSA']
  ].forEach(f => comprobar('sube · la llave ' + f[0] + ' no va en el archivo', sube.indexOf(f[1]) < 0, 'una llave viaja a la rama publica'));
  comprobar('sube · la llave enmascarada de prueba no es la llave (si no, el caso no probaria nada)', M.maskToken(FALSA_G) !== FALSA_G && M.maskToken(FALSA_G).length > 10);
  igual('sube · dice el repositorio', sc.gr, 'alguien/repo');
  igual('sube · y la rama de datos', sc.gb, 'data');
  igual('sube · solo lleva las cuatro claves de siempre', Object.keys(sc).sort().join(','), 'bd,bu,gb,gr');
  ['openShareModal', 'openPhaseShareModal'].forEach(n =>
    comprobar('sube · ' + n + ' arma el archivo con u19EnlaceSc', cuerpo(n).indexOf('dataWithSc.sc = u19EnlaceSc();') >= 0, 'vuelve a armar sc a mano'));
  Object.keys(AJUSTES).forEach(k => { delete AJUSTES[k]; });
}

/* --- 10 · Las semanas que llegan en un enlace --------------------------
   29-sep-2026 (auditoria Fable, E1). La vista del socio pintaba «weeks» tal
   como venia en el enlace, y corre antes del PIN: un enlace fabricado metia
   HTML en la app. */
{
  [['4', 4], [4, 4], ['12 semanas', 12], ['4<script>alert(1)</script>', 4], ['<img src=x onerror=alert(1)>', 0], ['" onfocus="alert(1)', 0],
   ['', 0], [null, 0], [undefined, 0], [0, 0], [-3, 0], [9999, 0], [{}, 0], [[], 0], [3.9, 3]
  ].forEach(c => igual('semanas · ' + JSON.stringify(c[0]) + ' da ' + c[1], M.u19Semanas(c[0]), c[1]));
  const vista = cuerpo('showClientView');
  comprobar('semanas · la vista del socio las pasa a numero al entrar', vista.indexOf('r.weeks = u19Semanas(r.weeks);') >= 0, 'ya no las normaliza');
  comprobar('semanas · y no las pinta tal como llegan', !/\+\s*r\.weeks\s*\+/.test(vista), 'r.weeks vuelve a entrar crudo en el HTML');
  comprobar('semanas · la ficha tampoco', src.indexOf("(r.weeks || '—')") < 0 && cuerpo('fichaEntrenamiento').indexOf('u19Semanas(r.weeks)') >= 0, 'vuelve r.weeks crudo');
  const previa = cuerpo('previewTextImport');
  comprobar('semanas · ni la vista previa de una rutina importada', previa.indexOf("'+parsed.weeks+'") < 0 && previa.indexOf('u19Semanas(parsed.weeks)') >= 0, 'vuelve parsed.weeks crudo');
  comprobar('semanas · y el nombre de la rutina importada se escapa', previa.indexOf('(parsed.name||') < 0 && previa.indexOf('escapeHtml(parsed.name)') >= 0, 'vuelve parsed.name crudo');
  comprobar('semanas · el constructor de rutinas no las mete crudas en un atributo', src.indexOf("value=\"'+(r.weeks||4)+'\"") < 0, 'vuelve r.weeks crudo al atributo value');
}

/* --- 11 · Los informes que se lleva el socio ---------------------------
   29-sep-2026 (auditoria Fable, E25 y E26). El informe de la bateria decia
   «Readaptación», «no constituyen un diagnóstico» y «déficit … frente al lado
   sano»; el de composicion, «Para diagnóstico clínico» y «estándares
   clínicos». Y las portadas y los pies seguian con «·». */
{
  [['déficit de 12.5 % frente al lado sano (135°)', 'diferencia de 12.5 % con el otro lado (135°)'],
   ['deficit de 8 % frente al lado sano (120°)', 'diferencia de 8 % con el otro lado (120°)'],
   ['LSI 82 % · déficit lateral (izquierdo / sano)', 'LSI 82 % · asimetría marcada (izquierdo / otro lado)'],
   ['brecha activo/pasivo de 12°: falta control activo', 'brecha activo/pasivo de 12°'],
   ['comparado con el lado sano', 'comparado con el otro lado'],
   ['Déficit de fuerza', 'diferencia de fuerza'],
   ['LSI de toques 95 %', 'LSI de toques 95 %'],
   ['mantiene el 64 % del pico: fatiga marcada', 'mantiene el 64 % del pico: fatiga marcada']
  ].forEach(c => igual('bateria · «' + c[0] + '» se imprime en vocabulario de sala', M.u19BateriaLineaSocio(c[0]), c[1]));
  igual('bateria · una linea vacia no revienta', M.u19BateriaLineaSocio(null), '');
  comprobar('bateria · lo que se imprime pasa por el filtro',
    cuerpo('u19BateriaLectura').indexOf('lineas: u19Arr(d.lineas).map(u19BateriaLineaSocio)') >= 0, 'las lineas guardadas vuelven a imprimirse tal cual');
  const i0 = src.indexOf('\nwindow.u19BateriaInforme = function(clientId){');
  const i1 = i0 < 0 ? -1 : src.indexOf('\n};', i0);
  comprobar('bateria · encuentro el informe impreso', i0 >= 0 && i1 > i0, 'no encuentro window.u19BateriaInforme');
  const inf = i1 > i0 ? src.slice(i0, i1) : '';
  comprobar('bateria · el informe impreso usa la lectura filtrada', (inf.match(/u19BateriaLectura\(/g) || []).length >= 2, 'ya no llama a u19BateriaLectura');
  comprobar('bateria · el informe impreso no dice «Readaptación»', inf.length > 0 && !/readaptaci/i.test(inf), 'vuelve la palabra');
  comprobar('bateria · ni «diagnóstico»', inf.length > 0 && !/diagn[oó]stic/i.test(inf), 'vuelve la palabra');
  comprobar('bateria · y trae el aviso de la casa', inf.indexOf('no reemplaza la consulta con un profesional de la salud') >= 0, 'sin el aviso');
  const cat = lista('BAT_CATALOGO');
  comprobar('bateria · el catalogo no escribe «lado sano», «déficit de» ni «falta control»', cat.length > 2000 && !/lado sano|d[eé]ficit de |falta control/i.test(cat), 'vuelve el texto');

  const bio = cuerpo('infV2BuildReport');
  comprobar('composicion · el informe no dice «diagnóstico»', bio.length > 5000 && !/diagn[oó]stic/i.test(bio), 'vuelve la palabra');
  comprobar('composicion · ni «estándares clínicos»', !/est[aá]ndares cl[ií]nic/i.test(bio), 'vuelve la frase');
  comprobar('composicion · y trae el aviso de la casa', bio.indexOf('No reemplaza la consulta con un profesional de la salud') >= 0, 'sin el aviso');

  const re = /<(div|span) class="(pr-cover-tag|pr-cover-title|pr-ft-l|pr-ft-c)">([^\n]*?)<\/\1>/g;
  const porClase = {};
  let m;
  while ((m = re.exec(src)) !== null) (porClase[m[2]] = porClase[m[2]] || []).push(m[3]);
  ['pr-cover-tag', 'pr-cover-title', 'pr-ft-l', 'pr-ft-c'].forEach(c => {
    const v = porClase[c] || [];
    comprobar('informes · «' + c + '» esta en los dos informes', v.length === 2, 'hay ' + v.length);
    comprobar('informes · «' + c + '» no usa «·» de separador', v.length > 0 && v.every(t => t.indexOf('·') < 0), v.filter(t => t.indexOf('·') >= 0).join('  |  '));
  });
  comprobar('informes · la portada lleva el tagline oficial', (porClase['pr-cover-tag'] || []).every(t => t === 'Rendimiento | Velocidad | Resistencia'), (porClase['pr-cover-tag'] || []).join('  |  '));
}

console.log('\nUS19-APP · lo que ve el socio de la readaptación');
console.log('archivo: ' + ruta + '\n');
avisos.forEach(a => console.log('  · ' + a));
if (fallos.length) {
  console.log('\n  FALLOS (' + fallos.length + '):');
  fallos.forEach(f => console.log('    ✗ ' + f));
  console.log('\ncomprobaciones OK: ' + ok + '  ·  FALLIDAS: ' + fallos.length + '\n');
  process.exit(1);
}
console.log('\ncomprobaciones OK: ' + ok + '  ·  sin fallos\n');
