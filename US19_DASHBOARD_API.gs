/**
 * US19_DASHBOARD_API.gs — puente entre Notion y la app Ultra-Sport 19.
 *
 * Los nombres de propiedad estan tomados de la base real
 * "👥 Clientes - Base Unificada" (data source 545559de-0423-4016-9823-ae3c654aa12e),
 * leida el 2026-09-02. Si renombras una propiedad en Notion, cambiala aqui.
 *
 * COMO USARLO
 *   1. Apps Script → pega este archivo.
 *   2. Propiedades del script: NOTION_TOKEN y NOTION_DB (ver abajo).
 *   3. Implementar → Aplicacion web → Ejecutar como: yo · Acceso: Cualquiera.
 *   4. Copia la URL /exec y pegala en la app: Finanzas → Conexion con Notion.
 *
 * ENDPOINTS
 *   ?tipo=clientes    roster completo, un objeto por cliente
 *   ?tipo=historial   serie mensual, si la mantienes en otra base
 *   (sin tipo)        resumen agregado: clientes, ticket, ingresos, mix
 */

var PROPS = PropertiesService.getScriptProperties();
var NOTION_TOKEN = PROPS.getProperty('NOTION_TOKEN');   // secret_xxx del integration
var NOTION_DB    = PROPS.getProperty('NOTION_DB') || '545559de-0423-4016-9823-ae3c654aa12e';
var NOTION_VER   = '2022-06-28';

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
  var tipo = (e && e.parameter && e.parameter.tipo) || '';
  try {
    if (tipo === 'clientes')  return _json(rosterClientes());
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
  var tipo = (e && e.parameter && e.parameter.tipo) || '';
  try {
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

var BIO_DB = PROPS.getProperty('NOTION_BIO_DB') || 'd1d97762-3fcc-4f99-b5ad-1cb2bc45207e';

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
