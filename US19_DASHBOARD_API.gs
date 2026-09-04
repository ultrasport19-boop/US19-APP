/**
 * US19_DASHBOARD_API.gs — puente entre Notion y la app Ultra-Sport 19.
 *
 * Los nombres de propiedad estan tomados de la base real
 * "👥 Clientes - Base Unificada" (data source 545559de-0423-4016-9823-ae3c654aa12e),
 * leida el 2026-09-02. Si renombras una propiedad en Notion, cambiala aqui.
 *
 * DIAGNOSTICO
 *   Ejecuta US19_DIAGNOSTICO() desde el editor tras cada despliegue.
 *   Solo lee. Comprueba llaves, acceso a las dos bases, nombres de
 *   columna e interruptores, y dice en una linea que falta.
 *
 * COMO USARLO
 *   1. Apps Script → pega este archivo.
 *   2. Propiedades del script: NOTION_TOKEN, NOTION_DB y API_CLAVE.
 *      API_CLAVE es una cadena larga que inventas tu. SIN ELLA EL PUENTE
 *      NO RESPONDE A NADIE: preferimos que se caiga a dejarlo abierto.
 *   3. Implementar → Aplicacion web → Ejecutar como: yo · Acceso: Cualquiera.
 *      ("Cualquiera" sigue siendo necesario para que el navegador pueda
 *      llamarlo sin sesion de Google; quien controla el acceso es la clave.)
 *   4. Copia la URL /exec y pegala en la app, y la clave en su campo
 *      aparte: Finanzas → Conexion con Notion.
 *
 * POR QUE LA CLAVE VA APARTE DE LA URL
 *   Si la clave viajara pegada a la /exec, ensenar la URL en una captura
 *   o pegarla en un chat regalaria el acceso completo. Separadas, filtrar
 *   una no basta.
 *
 * ENDPOINTS
 *   ?tipo=clientes    roster completo, un objeto por cliente
 *   POST ?tipo=cliente_estado
 *                     reactiva y renueva. Solo ids explicitos, maximo 25,
 *                     y devuelve el valor anterior de cada uno.
 *   Tope de 500 peticiones al dia por si la clave se filtra. El uso
 *   normal ronda las 50, asi que no deberia notarse.
 *   ?tipo=pendientes  lo que espera tu visto bueno, con su costo en WhatsApp
 *   POST ?tipo=marcar  marca una casilla que el bot vigila. La app NO
 *                      envia mensajes: los envia el bot al ver la casilla.
 *   ?tipo=estado      salud de cada automatismo, deducida de su rastro
 *   ?tipo=hoy         quien entrena hoy, que vence y quien entrena sin pagar
 *   ?tipo=bio&cliente=NOMBRE[&n=2]
 *                     ultimas evaluaciones de bioimpedancia, ya en el
 *                     formato JSON que la app sabe leer
 *   ?tipo=historial   serie mensual, si la mantienes en otra base
 *   (sin tipo)        resumen agregado: clientes, ticket, ingresos, mix
 */

var PROPS = PropertiesService.getScriptProperties();
var NOTION_TOKEN = PROPS.getProperty('NOTION_TOKEN');   // secret_xxx del integration
var NOTION_DB    = PROPS.getProperty('NOTION_DB') || '545559de-0423-4016-9823-ae3c654aa12e';
var NOTION_VER   = '2022-06-28';
var API_CLAVE    = PROPS.getProperty('API_CLAVE');

/**
 * Nadie entra sin clave. Si API_CLAVE no esta configurada, el puente deja
 * de atender: mas vale que la app se queje a que la base de clientes siga
 * al alcance de cualquiera que adivine o herede la URL.
 */
function _autorizado(e) {
  if (!API_CLAVE) return false;
  var k = (e && e.parameter && e.parameter.k) || '';
  if (!k && e && e.postData) {
    try { k = JSON.parse(e.postData.contents).k || ''; } catch (_e) {}
  }
  return _clavesIguales(String(k), String(API_CLAVE));
}

/* Comparacion de tiempo constante: no le cuenta al que prueba cuantos
   caracteres lleva acertados. */
function _clavesIguales(a, b) {
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* Una sola respuesta para todo lo que no pasa el filtro: no distingue
   entre "falta la clave", "clave mala" y "endpoint que no existe". */
function _noAutorizado() {
  return _json({ error: 'no autorizado' });
}

/* ---------- tope diario ----------
   La clave protege de quien no la tiene; esto acota el dano si alguien la
   consigue. El contador vive en el cache del script, que se vacia solo.
   El limite es alto a proposito: el uso normal ronda las 50 al dia. */
var TOPE_DIA = 500;

function _dentroDelTope() {
  try {
    var cache = CacheService.getScriptCache();
    var clave = 'us19_reqs_' + Utilities.formatDate(new Date(), 'America/Santiago', 'yyyyMMdd');
    var n = Number(cache.get(clave) || 0) + 1;
    /* 6 h es el maximo que admite el cache de Apps Script; con la clave
       por dia basta, porque al cambiar de dia cambia la clave. */
    cache.put(clave, String(n), 21600);
    return n <= TOPE_DIA;
  } catch (e) {
    /* Si el cache falla, se deja pasar: preferimos que el negocio siga
       funcionando a bloquearlo por un contador. */
    return true;
  }
}

function _topeSuperado() {
  return _json({ error: 'tope diario de peticiones alcanzado' });
}

/* Nombres exactos de las propiedades en Notion. */
var P = {
  nombre:      'Cliente',
  estado:      'Membresía Activa',
  plan:        'Plan',
  monto:       'Monto membresía',
  termino:     'Término Plan',
  whatsapp:    'WhatsApp (tel)',
  email:       'Email',
  reservas:    'Reservas 30 días',
  noshows:     'No-shows 30 d',
  ultReserva:  'Última reserva',
  proxReserva: 'Próxima reserva',
  ultBio:      'Última bioimpedancia (fecha)',
  nps:         'NPS nota',
  npsFecha:    'NPS fecha',
  ultContacto: 'Último contacto reactivación',
  estadoReact: 'Estado reactivación',
  msgReact:    'Mensaje reactivación',
  aprobarReact:'✅ Aprobar reactivación',
  aprobarIng:  '✅ Aprobar ingreso',
  comprobante: '📤 Enviar comprobante',
  sinPromos:   'Sin promos',
  objetivo:    'Objetivo',
  antecedentes:'Antecedentes mórbidos',
  medioPago:   'Medio de pago',
  canal:       'Canal agenda',
  comoConocio: 'Cómo nos conoció',
  nacimiento:  'Fecha de nacimiento',
  archivado:   'Archivado por inactividad',
  notas:       'Notas'
};

function doGet(e) {
  if (!_autorizado(e)) return _noAutorizado();
  if (!_dentroDelTope()) return _topeSuperado();
  var tipo = (e && e.parameter && e.parameter.tipo) || '';
  try {
    if (tipo === 'clientes')  return _json(rosterClientes());
    if (tipo === 'estado')    return _json(estadoSistema());
    if (tipo === 'pendientes') return _json(pendientes());
    if (tipo === 'hoy')       return _json(panelHoy());
    if (tipo === 'bio')       return _json(bioDeCliente(
                                  (e.parameter && e.parameter.cliente) || '',
                                  e.parameter && e.parameter.n));
    if (tipo === 'historial') return _json({ historial: [] });   // rellena si llevas historico
    return _json(resumen());
  } catch (err) {
    return _json({ error: String(err && err.message ? err.message : err) });
  }
}

/**
 * ?tipo=claude — puente hacia la API de Claude.
 *
 * La app manda el cuerpo del mensaje ya armado y este script le pone la
 * clave. Asi ANTHROPIC_KEY vive en las propiedades del script y nunca
 * baja al navegador, que es la diferencia con llamar en directo.
 *
 * Requiere una propiedad de script ANTHROPIC_KEY con tu sk-ant-...
 */
function doPost(e) {
  if (!_autorizado(e)) return _noAutorizado();
  if (!_dentroDelTope()) return _topeSuperado();
  var tipo = (e && e.parameter && e.parameter.tipo) || '';
  try {
    if (tipo === 'marcar')
      return _json(marcarCasillas(JSON.parse(e.postData.contents)));
    if (tipo === 'cliente_estado')
      return _json(cambiarEstadoClientes(JSON.parse(e.postData.contents)));
    if (tipo === 'notion_bio') return _json(escribirBioimpedancia(JSON.parse(e.postData.contents)));
    if (tipo !== 'claude') return _json({ error: 'tipo no reconocido: ' + tipo });
    var key = PROPS.getProperty('ANTHROPIC_KEY');
    if (!key) return _json({ error: 'Falta la propiedad de script ANTHROPIC_KEY' });

    var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      payload: e.postData.contents
    });
    var txt = res.getContentText();
    if (res.getResponseCode() !== 200) {
      var err = {};
      try { err = JSON.parse(txt); } catch (_e) {}
      return _json({ error: (err.error && err.error.message) || ('Anthropic ' + res.getResponseCode()) });
    }
    return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return _json({ error: String(err && err.message ? err.message : err) });
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- lectura de Notion ---------- */

function _query(cursor) {
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/databases/' + NOTION_DB + '/query', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + NOTION_TOKEN,
      'Notion-Version': NOTION_VER
    },
    payload: JSON.stringify(cursor ? { page_size: 100, start_cursor: cursor } : { page_size: 100 })
  });
  var body = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error(body.message || 'Notion ' + res.getResponseCode());
  return body;
}

function _todas() {
  var filas = [], cursor = null;
  do {
    var b = _query(cursor);
    filas = filas.concat(b.results || []);
    cursor = b.has_more ? b.next_cursor : null;
  } while (cursor);
  return filas;
}

/* Saca el valor plano de una propiedad, sea del tipo que sea. */
function _val(props, nombre) {
  var p = props[nombre];
  if (!p) return null;
  switch (p.type) {
    case 'title':        return _texto(p.title);
    case 'rich_text':    return _texto(p.rich_text);
    case 'number':       return (p.number === null || p.number === undefined) ? null : p.number;
    case 'select':       return p.select ? p.select.name : null;
    case 'status':       return p.status ? p.status.name : null;
    case 'date':         return p.date ? p.date.start : null;
    case 'checkbox':     return !!p.checkbox;
    case 'email':        return p.email || null;
    case 'phone_number': return p.phone_number || null;
    case 'formula':
      var f = p.formula || {};
      return f.string !== undefined ? f.string
           : f.number !== undefined ? f.number
           : f.boolean !== undefined ? f.boolean
           : (f.date && f.date.start) || null;
    case 'rollup':
      var r = p.rollup || {};
      return r.number !== undefined ? r.number : ((r.date && r.date.start) || null);
    default: return null;
  }
}
function _texto(arr) {
  if (!arr || !arr.length) return null;
  return arr.map(function (t) { return t.plain_text || ''; }).join('').trim() || null;
}

/* ---------- diagnostico ----------
   Se corre a mano desde el editor. Solo lee: no escribe, no envia, no
   gasta cupo de nada. Devuelve el resultado en el registro. */

function US19_DIAGNOSTICO() {
  var L = [];
  function ok(t)   { L.push('  OK    ' + t); }
  function mal(t)  { L.push('  FALLA ' + t); }
  function nota(t) { L.push('        ' + t); }

  L.push('DIAGNOSTICO DEL PUENTE US19 - ' + new Date().toLocaleString());
  L.push('');

  /* --- 1. Las llaves --- */
  L.push('1. Propiedades del script');
  if (API_CLAVE) ok('API_CLAVE configurada (' + String(API_CLAVE).length + ' caracteres)');
  else {
    mal('API_CLAVE NO configurada');
    nota('Sin ella el puente no responde a NADIE. Es a proposito: preferimos');
    nota('que se caiga a que quede abierto. Ponla en Configuracion del proyecto.');
  }
  if (NOTION_TOKEN) ok('NOTION_TOKEN configurado');
  else mal('NOTION_TOKEN NO configurado: nada de Notion va a funcionar');
  if (PROPS.getProperty('ANTHROPIC_KEY')) ok('ANTHROPIC_KEY configurada');
  else nota('ANTHROPIC_KEY sin configurar (solo hace falta si usas el proxy de Claude)');
  L.push('');

  /* --- 2. Las dos bases, con sus columnas --- */
  var bases = [
    { nombre: 'Clientes - Base Unificada', id: NOTION_DB, mapa: P,
      omitir: ['estadoReact', 'msgReact', 'aprobarReact', 'aprobarIng', 'comprobante', 'sinPromos'] },
    { nombre: 'Resultados Bioimpedancia', id: BIO_DB, mapa: PB, omitir: [] }
  ];

  bases.forEach(function (b) {
    L.push('2. ' + b.nombre);
    nota('id: ' + b.id);
    var db;
    try { db = _notion('databases/' + b.id, 'get'); }
    catch (e) {
      mal('no se pudo leer: ' + e.message);
      if (String(e.message).indexOf('Could not find database') >= 0) {
        nota('OJO: este error PARECE de permisos y casi nunca lo es.');
        nota('Notion muestra dos identificadores por tabla y la API solo');
        nota('acepta el de la BASE DE DATOS, no el de la fuente de datos.');
      }
      L.push('');
      return;
    }
    ok('accesible');

    /* Los nombres de columna: si renombras una en Notion, el puente deja
       de leerla y no avisa. Aqui si avisa. */
    var reales = {};
    Object.keys(db.properties || {}).forEach(function (k) { reales[k] = true; });
    var faltan = [];
    Object.keys(b.mapa).forEach(function (clave) {
      if (b.omitir.indexOf(clave) >= 0) return;
      if (!reales[b.mapa[clave]]) faltan.push(b.mapa[clave]);
    });
    if (!faltan.length) ok('las ' + Object.keys(b.mapa).length + ' columnas esperadas existen');
    else {
      mal(faltan.length + ' columna(s) que el codigo espera y Notion no tiene:');
      faltan.forEach(function (f) { nota('- "' + f + '"'); });
      nota('Si la renombraste en Notion, cambiala tambien en el mapa P o PB.');
    }
    L.push('');
  });

  /* --- 3. Que de verdad devuelve datos --- */
  L.push('3. Lectura real');
  try {
    var r = rosterClientes();
    var n = (r && r.clientes) ? r.clientes.length : 0;
    if (n > 0) ok('el roster devuelve ' + n + ' clientes activos');
    else mal('el roster devuelve 0 clientes: revisa el filtro "Membresia Activa"');
  } catch (e) { mal('el roster fallo: ' + e.message); }

  try {
    var est = estadoSistema();
    var rotas = est.senales.filter(function (x) { return x.estado !== 'ok'; });
    ok('el tablero responde (' + est.activos + ' activos)');
    if (rotas.length) {
      nota(rotas.length + ' automatismo(s) con problema:');
      rotas.forEach(function (x) { nota('- ' + x.nombre + ': ' + x.detalle); });
    }
  } catch (e) { mal('el tablero fallo: ' + e.message); }
  L.push('');

  /* --- 4. Los interruptores --- */
  L.push('4. Interruptores');
  var vis = PROPS.getProperty('VISION_SIMULACION');
  if (vis === 'false') ok('VISION_SIMULACION = false (lector de comprobantes en produccion)');
  else {
    mal('VISION_SIMULACION = ' + (vis === null ? 'SIN DEFINIR' : vis));
    nota('Vale TRUE por defecto si no existe. Con TRUE los comprobantes no');
    nota('se escriben en Notion y las activaciones dejan de registrarse.');
  }
  L.push('');

  var fallas = L.filter(function (x) { return x.indexOf('FALLA') === 0; }).length;
  L.push(fallas ? '=> ' + fallas + ' problema(s). Mira las lineas FALLA.'
                : '=> Todo en orden. El puente esta listo.');

  var txt = L.join('\n');
  Logger.log(txt);
  return txt;
}

/* ---------- el tablero de mando ----------
   Ninguna de estas senales pide cambios en el asistente: todas salen de
   mirar que dejo escrito en Notion y cuando. */

function _hoyISO() {
  return Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd');
}
function _diasDesde(iso) {
  if (!iso) return null;
  var a = new Date(_hoyISO() + 'T00:00:00Z').getTime();
  var b = new Date(String(iso).slice(0, 10) + 'T00:00:00Z').getTime();
  if (isNaN(b)) return null;
  return Math.round((a - b) / 86400000);
}

/* Salud de cada automatismo, deducida de su rastro.
   `tolera` son los dias que puede pasar sin escribir antes de preocupar. */
var SENALES = [
  { id: 'reservas',  nombre: 'Escritor de \u00faltima reserva',
    campo: 'ultReserva',  tolera: 2,
    que: 'Cada noche anota cuando vino cada cliente. Sin el, el aviso de fuga es ciego.' },
  { id: 'agenda',    nombre: 'Sincronizaci\u00f3n de Calendly',
    campo: 'proxReserva', tolera: 3, futuro: true,
    que: 'Trae las horas ya tomadas. Sin el, no sabes qui\u00e9n entrena ma\u00f1ana.' },
  { id: 'noshows',   nombre: 'Escritor de no-shows',
    campo: 'noshows',     tolera: 2, cuenta: true,
    que: 'Deber\u00eda anotar cada noche qui\u00e9n falt\u00f3. Alimenta la alerta de cuidado.' },
  { id: 'nps',       nombre: 'Encuesta NPS',
    campo: 'npsFecha',    tolera: 21,
    que: 'Pregunta la nota por WhatsApp. Espaciada a proposito.' },
  { id: 'react',     nombre: 'Reactivaci\u00f3n',
    campo: 'ultContacto', tolera: 14,
    que: 'Propone mensajes a quien dejo de venir.' },
  { id: 'bio',       nombre: 'Bioimpedancias',
    campo: 'ultBio',      tolera: 45,
    que: 'Las escribe el modulo BIO desde las fotos de Fitdays.' }
];

function estadoSistema() {
  var todas = _todas();
  var hoy = _hoyISO();
  var acc = {}, activos = 0, conCuenta = {};

  todas.forEach(function (pg) {
    var p = pg.properties || {};
    if (_val(p, P.estado) !== 'Activo') return;
    activos++;
    SENALES.forEach(function (sn) {
      var v = _val(p, P[sn.campo]);
      if (sn.cuenta) { if (v !== null && v !== undefined) conCuenta[sn.id] = (conCuenta[sn.id] || 0) + 1; return; }
      if (!v) return;
      var d = String(v).slice(0, 10);
      /* Para la agenda interesa la fecha MAS FUTURA; para el resto, la
         escritura mas reciente que no sea del futuro. */
      if (sn.futuro) { if (!acc[sn.id] || d > acc[sn.id]) acc[sn.id] = d; }
      else if (d <= hoy && (!acc[sn.id] || d > acc[sn.id])) acc[sn.id] = d;
    });
  });

  var senales = SENALES.map(function (sn) {
    var o = { id: sn.id, nombre: sn.nombre, que: sn.que, tolera: sn.tolera };
    if (sn.cuenta) {
      o.cobertura = conCuenta[sn.id] || 0;
      o.total = activos;
      o.estado = o.cobertura === 0 ? 'muerto' : (o.cobertura < activos / 2 ? 'atrasado' : 'ok');
      o.detalle = o.cobertura + ' de ' + activos + ' fichas con dato';
      return o;
    }
    o.ultima = acc[sn.id] || null;
    o.dias = sn.futuro ? null : _diasDesde(o.ultima);
    if (!o.ultima) { o.estado = 'muerto'; o.detalle = 'nunca ha escrito'; }
    else if (sn.futuro) { o.estado = o.ultima >= hoy ? 'ok' : 'atrasado';
                          o.detalle = 'hasta el ' + o.ultima; }
    else if (o.dias <= sn.tolera) { o.estado = 'ok'; o.detalle = o.dias === 0 ? 'hoy' : 'hace ' + o.dias + ' d'; }
    else { o.estado = 'atrasado'; o.detalle = 'hace ' + o.dias + ' d'; }
    return o;
  });

  return { hoy: hoy, activos: activos, senales: senales };
}

/* Lo que pasa hoy, y la fuga de plata que nadie ve: gente marcada
   Inactivo que sigue entrenando. */
function panelHoy() {
  var todas = _todas();
  var hoy = _hoyISO();
  var en7 = Utilities.formatDate(new Date(Date.now() + 7 * 86400000), 'America/Santiago', 'yyyy-MM-dd');
  var r = { hoy: hoy, entrenanHoy: [], vencen: [], vencidos: [], cobrables: [], mrr: 0, activos: 0 };

  todas.forEach(function (pg) {
    var p = pg.properties || {};
    var nombre = _val(p, P.nombre) || 'Sin nombre';
    var estado = _val(p, P.estado);
    var monto = _val(p, P.monto) || 0;
    var term = _val(p, P.termino);
    term = term ? String(term).slice(0, 10) : null;
    var prox = _val(p, P.proxReserva);
    prox = prox ? String(prox).slice(0, 10) : null;
    var r30 = _val(p, P.reservas) || 0;

    if (estado === 'Activo') {
      r.activos++; r.mrr += monto;
      if (prox === hoy) r.entrenanHoy.push({ nombre: nombre });
      if (term && term < hoy) r.vencidos.push({ id: pg.id, nombre: nombre, clp: monto, term: term });
      else if (term && term <= en7) r.vencen.push({ id: pg.id, nombre: nombre, clp: monto, term: term });
    } else if (estado === 'Inactivo' && r30 > 0) {
      /* Sigue viniendo pero ya no se le cobra. */
      r.cobrables.push({ id: pg.id, nombre: nombre, clp: monto, r30: r30, term: term,
                         ult: (_val(p, P.ultReserva) || '').slice(0, 10) });
    }
  });

  r.cobrables.sort(function (a, b) { return b.r30 - a.r30; });
  r.vencen.sort(function (a, b) { return String(a.term) < String(b.term) ? -1 : 1; });
  r.cobrablesCLP = r.cobrables.reduce(function (a, c) { return a + (c.clp || 0); }, 0);
  return r;
}

/* ---------- acciones que esperan visto bueno ----------
   Solo estas cuatro casillas, y ninguna mas: son las que el bot vigila.
   Cualquier otra propiedad se rechaza aunque venga bien formada. */
var CASILLAS = {
  reactivacion: { prop: 'aprobarReact', que: 'El bot enviar\u00e1 el mensaje de reactivaci\u00f3n',
                  categoria: 'Marketing', clp: 78 },
  ingreso:      { prop: 'aprobarIng',   que: 'El bot enviar\u00e1 la bienvenida con los datos de pago',
                  categoria: 'Utility',   clp: 14 },
  comprobante:  { prop: 'comprobante',  que: 'El script te mandar\u00e1 el comprobante por correo',
                  categoria: 'ninguna',   clp: 0 },
  sinPromos:    { prop: 'sinPromos',    que: 'Este cliente dejar\u00e1 de recibir ofertas',
                  categoria: 'ninguna',   clp: 0 }
};
var MARCAS_MAX = 25;

/* Lo que esta esperando una decision tuya. */
function pendientes() {
  var todas = _todas();
  var r = { reactivacion: [], ingreso: [], costos: {} };

  todas.forEach(function (pg) {
    var p = pg.properties || {};
    var nombre = _val(p, P.nombre) || 'Sin nombre';
    var estado = _val(p, P.estado);
    var base = { id: pg.id, nombre: nombre, clp: _val(p, P.monto) || 0 };

    /* Propuesto por el bot y todavia sin aprobar. */
    if (_val(p, P.estadoReact) === 'Propuesto' && !_val(p, P.aprobarReact)) {
      var m = _val(p, P.msgReact);
      r.reactivacion.push({ id: base.id, nombre: nombre, clp: base.clp,
        mensaje: m ? String(m).slice(0, 400) : null,
        ult: (_val(p, P.ultReserva) || '').slice(0, 10) });
    }
    if (estado === 'Potencial ingreso' && !_val(p, P.aprobarIng)) {
      r.ingreso.push({ id: base.id, nombre: nombre, clp: base.clp,
        medio: _val(p, P.medioPago), plan: _val(p, P.plan) });
    }
  });

  /* Cuanto costaria decir que si a todo. Un boton que gasta plata tiene
     que decir cuanta antes, no despues. */
  r.costos = {
    reactivacion: r.reactivacion.length * CASILLAS.reactivacion.clp,
    ingreso: r.ingreso.length * CASILLAS.ingreso.clp
  };
  r.costos.total = r.costos.reactivacion + r.costos.ingreso;
  r.tarifas = { marketing: CASILLAS.reactivacion.clp, utility: CASILLAS.ingreso.clp };
  return r;
}

/* Marca una casilla de la lista blanca en fichas concretas. */
function marcarCasillas(datos) {
  var tipo = datos && datos.casilla;
  var ids = (datos && datos.ids) || [];
  var valor = !datos || datos.valor === undefined ? true : !!datos.valor;

  var def = CASILLAS[tipo];
  if (!def) return { error: 'casilla no permitida: ' + tipo };
  if (!ids.length) return { error: 'no se indico ninguna ficha' };
  if (ids.length > MARCAS_MAX)
    return { error: 'demasiadas de una vez (' + ids.length + ', maximo ' + MARCAS_MAX + ')' };

  var prop = P[def.prop];
  var hechos = [], errores = [];

  ids.forEach(function (id) {
    if (!id) { errores.push({ id: null, por: 'falta el id' }); return; }
    var antes;
    try { antes = _notion('pages/' + id, 'get'); }
    catch (e) { errores.push({ id: id, por: 'no se pudo leer la ficha' }); return; }
    var nombre = _val(antes.properties || {}, P.nombre);
    /* Si ya estaba marcada, no se vuelve a marcar: en las de envio eso
       podria significar un segundo mensaje pagado. */
    if (_val(antes.properties || {}, prop) === valor) {
      errores.push({ id: id, nombre: nombre, por: 'ya estaba as\u00ed' }); return;
    }
    var props = {};
    props[prop] = { checkbox: valor };
    try {
      _notion('pages/' + id, 'patch', { properties: props });
      hechos.push({ id: id, nombre: nombre });
    } catch (e) {
      errores.push({ id: id, nombre: nombre, por: 'Notion rechazo la escritura' });
    }
  });

  return { hechos: hechos, errores: errores, casilla: tipo,
           que: def.que, categoria: def.categoria,
           costoEstimado: hechos.length * def.clp };
}

/* ---------- escritura de estado de cliente ----------
   La app puede reactivar y renovar, pero SOLO sobre ids que ella misma
   acaba de leer, de uno en uno y con el valor anterior de vuelta. */

var ESTADOS_OK = ['Activo', 'Inactivo', 'Prueba', 'Potencial ingreso'];
var CAMBIOS_MAX = 25;

/* Una fecha de termino tiene que caer en un rango que tenga sentido para
   un plan mensual. Fuera de ahi es un error de tecleo, no una decision. */
function _fechaPlanValida(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f || ''))) return false;
  var t = new Date(f + 'T00:00:00Z').getTime();
  if (isNaN(t)) return false;
  var hoy = Date.now();
  return t > (hoy - 400 * 86400000) && t < (hoy + 400 * 86400000);
}

function cambiarEstadoClientes(datos) {
  var cambios = (datos && datos.cambios) || [];
  if (!cambios.length) return { error: 'no se pidio ningun cambio' };
  if (cambios.length > CAMBIOS_MAX)
    return { error: 'demasiados cambios de una vez (' + cambios.length + ', maximo ' + CAMBIOS_MAX + ')' };

  var hechos = [], errores = [];

  cambios.forEach(function (c) {
    var id = c && c.id;
    if (!id) { errores.push({ id: null, por: 'falta el id' }); return; }
    if (c.activa && ESTADOS_OK.indexOf(c.activa) < 0) {
      errores.push({ id: id, por: 'estado no valido: ' + c.activa }); return;
    }
    if (c.termino && !_fechaPlanValida(c.termino)) {
      errores.push({ id: id, por: 'fecha fuera de rango: ' + c.termino }); return;
    }
    if (!c.activa && !c.termino) { errores.push({ id: id, por: 'nada que cambiar' }); return; }

    /* Se lee ANTES de escribir: sin el valor previo no hay forma de
       revertir ni de mostrar que paso. */
    var antes;
    try { antes = _notion('pages/' + id, 'get'); }
    catch (e) { errores.push({ id: id, por: 'no se pudo leer la ficha' }); return; }
    if (!antes || !antes.properties) { errores.push({ id: id, por: 'ficha inexistente' }); return; }

    var pa = antes.properties;
    var previo = {
      nombre: _val(pa, P.nombre),
      activa: _val(pa, P.estado),
      termino: (_val(pa, P.termino) || '').slice(0, 10) || null
    };

    var props = {};
    if (c.activa)  props[P.estado]  = { status: { name: c.activa } };
    if (c.termino) props[P.termino] = { date: { start: c.termino } };

    try {
      var res = _notion('pages/' + id, 'patch', { properties: props });
      if (!res || res.object === 'error') throw new Error('rechazado');
      hechos.push({ id: id, nombre: previo.nombre, antes: previo,
                    ahora: { activa: c.activa || previo.activa,
                             termino: c.termino || previo.termino } });
    } catch (e) {
      errores.push({ id: id, nombre: previo.nombre, por: 'Notion rechazo la escritura' });
    }
  });

  return { hechos: hechos, errores: errores, total: cambios.length };
}

/* ---------- lectura de bioimpedancias ----------
   Nombres exactos de la base "Resultados Bioimpedancia". Si renombras una
   columna en Notion, cambiala aqui. */
var PB = {
  cliente:      'Cliente',
  fecha:        'Fecha evaluación',
  momento:      'Momento',
  edad:         'Edad',
  altura:       'Altura (cm)',
  peso:         'Peso (kg)',
  grasaKg:      'Grasa corporal (kg)',
  grasaPct:     'Grasa corporal (%)',
  musculo:      'Masa muscular (kg)',
  esqueletico:  'Músculo esquelético (kg)',
  proteina:     'Proteína (kg)',
  agua:         'Agua corporal (kg)',
  imc:          'IMC (kg/m²)',
  visceral:     'Grasa visceral (grado)',
  tmb:          'TMB (kcal)',
  libreGrasa:   'Masa libre de grasa (kg)',
  subcutanea:   'Grasa subcutánea (%)',
  smi:          'SMI (kg/m²)',
  edadCorporal: 'Edad corporal',
  puntuacion:   'Puntuación corporal',
  osea:         'Masa ósea (kg)',
  vo2:          'VO2 max (ml/kg/min)',
  hombro:       'Hombro (cm)',
  pecho:        'Pecho (cm)',
  cintura:      'Cintura (cm)',
  cadera:       'Cadera (cm)',
  brazoI:       'Brazo izq (cm)',
  brazoD:       'Brazo der (cm)',
  antebrazoI:   'Antebrazo izq (cm)',
  antebrazoD:   'Antebrazo der (cm)',
  musloI:       'Muslo izq (cm)',
  musloD:       'Muslo der (cm)',
  pantorrillaI: 'Pantorrilla izq (cm)',
  pantorrillaD: 'Pantorrilla der (cm)'
};

/* Redondea a un decimal sin convertir null en 0: la diferencia entre "no
   se midio" y "midio cero" importa en un informe clinico. */
function _n1(v) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : Math.round(n * 10) / 10;
}

/* Devuelve las ultimas evaluaciones de un cliente EN EL FORMATO QUE LA APP
   YA SABE LEER (el mismo JSON que produce la extraccion de Fitdays). Asi el
   motor de informes no cambia ni una linea. */
function bioDeCliente(nombre, limite) {
  if (!nombre) return { error: 'falta el nombre del cliente' };
  var n = Math.min(Math.max(Number(limite) || 2, 1), 10);

  function buscar(op) {
    var f = { property: PB.cliente, title: {} };
    f.title[op] = nombre;
    return _notion('databases/' + BIO_DB + '/query', 'post', {
      filter: f,
      sorts: [{ property: PB.fecha, direction: 'descending' }],
      page_size: n
    });
  }

  /* Primero exacto; si no hay nada, se prueba por coincidencia parcial,
     que es lo que salva los nombres escritos de dos formas distintas. */
  var r = buscar('equals');
  if (!r || !r.results || !r.results.length) r = buscar('contains');
  if (!r || !r.results) return { error: 'Notion no respondio como se esperaba' };
  if (!r.results.length) return { cliente: { nombre: nombre }, evaluaciones: [] };

  var cli = { nombre: nombre, genero: null, edad: null, estatura_cm: null };
  var evs = r.results.map(function (pg) {
    var p = pg.properties || {};
    var peso = _n1(_val(p, PB.peso));
    var agua = _n1(_val(p, PB.agua));
    var cintura = _n1(_val(p, PB.cintura));
    var cadera  = _n1(_val(p, PB.cadera));

    if (cli.edad == null)        cli.edad = _val(p, PB.edad);
    if (cli.estatura_cm == null) cli.estatura_cm = _n1(_val(p, PB.altura));
    var titulo = _val(p, PB.cliente);
    if (titulo) cli.nombre = titulo;

    return {
      fecha: _val(p, PB.fecha),
      momento: _val(p, PB.momento),
      bioimpedancia: {
        peso_kg: peso,
        grasa_kg: _n1(_val(p, PB.grasaKg)),
        grasa_pct: _n1(_val(p, PB.grasaPct)),
        musculo_kg: _n1(_val(p, PB.musculo)),
        masa_esqueletica_kg: _n1(_val(p, PB.esqueletico)),
        proteina_kg: _n1(_val(p, PB.proteina)),
        agua_kg: agua,
        /* Notion no guarda el %: se deriva del peso, que es exacto. */
        agua_pct: (agua != null && peso) ? Math.round(agua / peso * 1000) / 10 : null,
        imc: _n1(_val(p, PB.imc)),
        grasa_visceral_grado: _val(p, PB.visceral),
        tmb_kcal: _val(p, PB.tmb),
        peso_sin_grasa_kg: _n1(_val(p, PB.libreGrasa)),
        grasa_subcutanea_pct: _n1(_val(p, PB.subcutanea)),
        smi: _n1(_val(p, PB.smi)),
        edad_corporal_anios: _val(p, PB.edadCorporal),
        puntuacion_corporal: _val(p, PB.puntuacion),
        masa_osea_kg: _n1(_val(p, PB.osea)),
        vo2max: _n1(_val(p, PB.vo2)),
        whr: (cintura && cadera) ? Math.round(cintura / cadera * 100) / 100 : null
      },
      circunferencias_cm: {
        cuello: null,                 /* Fitdays lo mide, Notion no lo guarda */
        hombro: _n1(_val(p, PB.hombro)),
        pecho: _n1(_val(p, PB.pecho)),
        cintura: cintura,
        cadera: cadera,
        brazo_izq: _n1(_val(p, PB.brazoI)),
        brazo_der: _n1(_val(p, PB.brazoD)),
        antebrazo_izq: _n1(_val(p, PB.antebrazoI)),
        antebrazo_der: _n1(_val(p, PB.antebrazoD)),
        muslo_izq: _n1(_val(p, PB.musloI)),
        muslo_der: _n1(_val(p, PB.musloD)),
        pantorrilla_izq: _n1(_val(p, PB.pantorrillaI)),
        pantorrilla_der: _n1(_val(p, PB.pantorrillaD))
      }
    };
  });

  return { fuente: 'notion', cliente: cli, evaluaciones: evs };
}

/* ---------- el roster que consume la app ---------- */

function rosterClientes() {
  var filas = _todas();
  var out = filas.map(function (pg) {
    var pr = pg.properties || {};
    var estado = _val(pr, P.estado);
    return {
      id:        pg.id,
      nombre:    _val(pr, P.nombre) || '',
      /* La app filtra por `activo === true`. */
      activo:    (estado === 'Activo') && !_val(pr, P.archivado),
      estado:    estado,
      plan:      _val(pr, P.plan),
      monto:     _val(pr, P.monto),
      termino_plan: _val(pr, P.termino),
      whatsapp:  _val(pr, P.whatsapp),
      email:     _val(pr, P.email),

      /* Lo que la app no recibia y ahora sabe leer. */
      reservas_30d:  _val(pr, P.reservas),
      no_shows_30d:  _val(pr, P.noshows),
      ultima_reserva:  _val(pr, P.ultReserva),
      proxima_reserva: _val(pr, P.proxReserva),
      ultima_bioimpedancia: _val(pr, P.ultBio),
      nps:            _val(pr, P.nps),
      nps_fecha:      _val(pr, P.npsFecha),
      objetivo:       _val(pr, P.objetivo),
      antecedentes:   _val(pr, P.antecedentes),
      medio_pago:     _val(pr, P.medioPago),
      canal_agenda:   _val(pr, P.canal),
      como_conocio:   _val(pr, P.comoConocio),
      fecha_nacimiento: _val(pr, P.nacimiento),
      notas:          _val(pr, P.notas)
    };
  }).filter(function (c) { return c.nombre; });
  return { clientes: out, generado: new Date().toISOString() };
}

/* ---------- resumen agregado ---------- */

function resumen() {
  var r = rosterClientes().clientes;
  var act = r.filter(function (c) { return c.activo; });
  var conMonto = act.filter(function (c) { return typeof c.monto === 'number' && c.monto > 0; });
  var ingresos = conMonto.reduce(function (a, c) { return a + c.monto; }, 0);

  var porPlan = {};
  act.forEach(function (c) {
    var k = c.plan || 'Sin plan';
    if (!porPlan[k]) porPlan[k] = { nm: k, n: 0, sum: 0, cnt: 0 };
    porPlan[k].n++;
    if (typeof c.monto === 'number') { porPlan[k].sum += c.monto; porPlan[k].cnt++; }
  });

  return {
    clientes: act.length,
    ingresos: ingresos,
    ticket:   conMonto.length ? Math.round(ingresos / conMonto.length) : null,
    sinMonto: act.length - conMonto.length,
    mix: Object.keys(porPlan).map(function (k) {
      var g = porPlan[k];
      return { nm: g.nm, p: g.cnt ? Math.round(g.sum / g.cnt) : 0, n: g.n };
    }).sort(function (a, b) { return b.n - a.n; }),
    historial: []
  };
}

/* ============================================================
   ESCRITURA — «⚖️ Resultados Bioimpedancia»
   Recibe {filas:[{cliente,fecha,momento,peso,grasa,musculo}], notionId}
   y crea lo que falte. Es la vuelta del circuito: hasta ahora
   Notion mandaba datos a la app y nada regresaba.
   ============================================================ */

/* OJO: Notion muestra DOS identificadores para la misma tabla. La API
   v2022-06-28 solo acepta el de la BASE DE DATOS. Con el de la fuente de
   datos (collection://d1d97762-...) responde "Could not find database...
   make sure it's shared with your integration", que parece un problema de
   permisos y no lo es. */
var BIO_DB = PROPS.getProperty('NOTION_BIO_DB') || '7a5a1a7d-ad11-422c-aff3-b14ead225e5e';

function _notion(path, metodo, cuerpo) {
  var opt = {
    method: metodo || 'get',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + NOTION_TOKEN, 'Notion-Version': NOTION_VER }
  };
  if (cuerpo) opt.payload = JSON.stringify(cuerpo);
  var res = UrlFetchApp.fetch('https://api.notion.com/v1/' + path, opt);
  var body = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300) throw new Error(body.message || ('Notion ' + res.getResponseCode()));
  return body;
}

/* ¿Ya hay una fila para este cliente, fecha y momento? Sin esto,
   reenviar la misma evaluacion llenaria la tabla de duplicados. */
function _bioExiste(fila) {
  var y = [
    { property: 'Cliente', title: { equals: fila.cliente } },
    { property: 'Fecha evaluación', date: { equals: fila.fecha } }
  ];
  if (fila.momento) y.push({ property: 'Momento', select: { equals: fila.momento } });
  var r = _notion('databases/' + BIO_DB + '/query', 'post', { filter: { and: y }, page_size: 1 });
  return (r.results && r.results.length) ? r.results[0].id : null;
}

function escribirBioimpedancia(datos) {
  if (!NOTION_TOKEN) return { error: 'Falta la propiedad de script NOTION_TOKEN' };
  var filas = (datos && datos.filas) || [];
  if (!filas.length) return { error: 'No llegó ninguna fila' };

  var creadas = 0, duplicadas = 0, ids = [], errores = [];
  filas.forEach(function (f) {
    try {
      if (!f.cliente || !f.fecha) { errores.push('fila sin cliente o sin fecha'); return; }
      var ya = _bioExiste(f);
      if (ya) { duplicadas++; ids.push(ya); return; }

      var props = {
        'Cliente': { title: [{ text: { content: String(f.cliente) } }] },
        'Fecha evaluación': { date: { start: f.fecha } }
      };
      if (f.momento) props['Momento'] = { select: { name: f.momento } };
      if (f.peso != null)    props['Peso (kg)'] = { number: Number(f.peso) };
      if (f.grasa != null)   props['Grasa corporal (%)'] = { number: Number(f.grasa) };
      if (f.musculo != null) props['Masa muscular (kg)'] = { number: Number(f.musculo) };

      var pg = _notion('pages', 'post', { parent: { database_id: BIO_DB }, properties: props });
      creadas++; ids.push(pg.id);
    } catch (err) {
      errores.push(String(err && err.message ? err.message : err));
    }
  });

  /* Enlazar con la ficha del cliente. La relacion vive en la Base
     Unificada, asi que se añade alli sin borrar lo que ya hubiera. */
  if (datos.notionId && ids.length) {
    try {
      var actual = _notion('pages/' + datos.notionId).properties['Bioimpedancia'];
      var previas = (actual && actual.relation) ? actual.relation.map(function (r) { return r.id; }) : [];
      var todas = previas.slice();
      ids.forEach(function (id) { if (todas.indexOf(id) < 0) todas.push(id); });
      if (todas.length !== previas.length) {
        _notion('pages/' + datos.notionId, 'patch', {
          properties: { 'Bioimpedancia': { relation: todas.map(function (id) { return { id: id }; }) } }
        });
      }
    } catch (err) {
      errores.push('no se pudo enlazar con la ficha: ' + (err && err.message ? err.message : err));
    }
  }

  return { creadas: creadas, duplicadas: duplicadas, ids: ids,
           errores: errores.length ? errores : undefined };
}
