/* Prueba de las fichas de socios que la app escribe en Notion (11-sep-2026).
 *
 *   node tools/fichas.js [index.html]
 *
 * Diego pidio dar de alta y actualizar socios desde la app en vez de
 * escribir a mano en Notion. La app no escribe en Notion: se lo pide al
 * asistente, que tiene la lista blanca y las reglas (y su propio banco de
 * pruebas). Lo que se prueba AQUI es lo que decide la app:
 *
 *   - QUE manda: en una ficha que ya existe, solo lo que cambio. Mandarlo
 *     todo pisaria la fecha de termino que el asistente alarga con un pago.
 *   - A QUIEN: la importacion enlaza cada fila de Notion con su cliente de
 *     la app. Desde que la app escribe por ese enlace, enlazar mal es
 *     escribir en la ficha de otra persona. La revision del 11-sep-2026
 *     encontro que el importador viejo YA habia dejado enlaces cruzados en
 *     las familias que comparten telefono: aqui se ejecuta la importacion
 *     entera con esas familias.
 *   - QUE NO PISA: lo que se cambio en la app y aun no llego a Notion; y
 *     solo eso: una renovacion que llega de Notion si tiene que llegar.
 *
 * Casi todo se EJECUTA con un mundo de mentira (fetch, estado, modales), no
 * se busca como texto: la revision encontro comprobaciones de texto que un
 * cambio real se saltaba. Si no encuentra lo que busca, FALLA.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ruta = process.argv[2] || path.join(__dirname, '..', 'index.html');
const src = fs.readFileSync(ruta, 'utf8');

function tramo(inicio, fin, nombre) {
  const i = src.indexOf(inicio);
  if (i < 0) { console.error('fichas: no encuentro el inicio de ' + nombre); process.exit(1); }
  const j = src.indexOf(fin, i + inicio.length);
  if (j < 0) { console.error('fichas: no encuentro el fin de ' + nombre); process.exit(1); }
  return src.slice(i, j);
}
function fn(nombre) { return tramo('function ' + nombre + '(', '\n}\n', nombre) + '\n}\n'; }
function lineaVar(n) {
  const i = src.indexOf('\nvar ' + n + ' = ');
  if (i < 0) { console.error('fichas: no encuentro ' + n); process.exit(1); }
  return src.slice(i + 1, src.indexOf('\n', i + 1)) + '\n';
}

const NOMBRES = ['fichaPayload_', 'fichaPendMezclar_', 'fichaCuerpo_', 'fichaLeerRespuesta_', 'fichaPedir_', 'fichaSeccionHtml_',
  'fichaTipoCambia_', 'fichaLeerFormulario_', 'fichaTrasGuardar_', 'fichaNotionSubir', 'fichaVistaPrevia_', 'fichaEnlazar_', 'fichaEscribir_',
  '_impNom', '_impPrimer', '_impTel8', '_impBuscar', '_impReparar', '_impPendCampos', 'fichaAplicar_',
  '_impCampo', '_impNum', '_impFechaISO', '_impTelFmt', '_impEnriquecer', 'u19ReactResultadoHTML'];
const LISTAS = ['FICHA_MEMBRESIAS', 'FICHA_PLANES', 'FICHA_CANALES', 'FICHA_MEDIOS', 'FICHA_CONOCIO', 'FICHA_CAMPOS', '_fichaDups'].map(lineaVar).join('');
const IMPORTAR = tramo('window.importClientesNotion = async function(', '\n};\n', 'importClientesNotion') + '\n};\n';

/* Un mundo de mentira: el estado, el puente, los modales y el DOM que tocan
   estas funciones. Cada prueba arma el suyo, limpio. */
const CODIGO = [
  'var state = { clients: [] };',
  'var settings = { dashApiUrl: "https://puente/exec", dashClave: "k" };',
  'var __t__ = [], __modales__ = [], __roster__ = null, __pedidos__ = [], __resp__ = { ok: true, cambios: [] }, __dom__ = {}, __n__ = 0, __confirmar__ = true;',
  'function toast(t){ __t__.push(String(t)); }',
  'function u19DashUrl(t){ return "https://puente/exec?tipo=" + t; }',
  'function fetch(url, o){ __pedidos__.push({ url: url, body: o && o.body ? JSON.parse(o.body) : null });',
  '  if (/tipo=clientes/.test(url)) return Promise.resolve({ json: function(){ return Promise.resolve(__roster__); } });',
  '  return Promise.resolve({ text: function(){ return Promise.resolve(JSON.stringify(__resp__)); } }); }',
  'function genId(){ return "loc" + (++__n__); }',
  'function saveState(){} function renderClients(){} function u19AutoImportRepintar(){} var _clientFilter = "";',
  'function openClientForm(){}',
  'var localStorage = { setItem: function(){}, getItem: function(){ return null; } };',
  'function openModal(o){ __modales__.push(o); } function closeModal(){}',
  'function getClient(id){ for (var i = 0; i < state.clients.length; i++) if (state.clients[i].id === id) return state.clients[i]; return null; }',
  'function escapeHtml(s){ return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }',
  'function escapeAttr(s){ return escapeHtml(s); }',
  'function u19Arr(x){ return Array.isArray(x) ? x : []; }',
  'function u19Lista(x){ return Array.isArray(x) ? x.filter(function(e){ return e !== null && e !== undefined; }) : []; }',
  'function getClientType(c){ return (c && c.type === "rehab") ? "rehab" : "gym"; }',
  'function formField(l, h){ return "<label>" + escapeHtml(l) + "</label>" + h; }',
  'var window = { confirm: function(){ return __confirmar__; } };',
  'var console = { warn: function(){}, log: function(){}, error: function(){} };',
  'var document = { getElementById: function(id){ return __dom__[id] || null; } };',
  LISTAS,
  NOMBRES.map(fn).join('\n'),
  IMPORTAR,
  'return { state: state, window: window, fn: { ' + NOMBRES.map(n => n + ':' + n).join(',') + ' },',
  '  importar: function(r, silencioso){ __roster__ = r; return window.importClientesNotion(silencioso === undefined ? true : silencioso); },',
  '  set resp(v){ __resp__ = v; }, set confirmar(v){ __confirmar__ = v; }, set dom(v){ __dom__ = v; },',
  '  get pedidos(){ return __pedidos__; }, get modales(){ return __modales__; }, get toasts(){ return __t__; },',
  '  FICHA_CAMPOS: FICHA_CAMPOS, FICHA_MEMBRESIAS: FICHA_MEMBRESIAS };'
].join('\n');
function mundo() {
  try { return new Function(CODIGO)(); }
  catch (e) { console.error('fichas: el código no evalúa aislado: ' + e.message); process.exit(1); }
}
const M = mundo().fn;
const tic = () => new Promise(r => setTimeout(r, 0));
const ticks = async (n) => { for (let i = 0; i < (n || 6); i++) await tic(); };

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

(async () => {

/* --- 1 · Qué se manda ------------------------------------------------ */
{
  const P = M.fichaPayload_;
  const nueva = { name: ' Ana Soto ', phone: '+56 9 1234 5678', email: '', planPrice: 35000, planEndDate: '2026-10-15',
    notionEstado: 'Potencial ingreso', notionPlan: 'Plan 3x/semana', goal: 'fuerza', notes: 'lesión de hombro', rut: '1-9' };
  const d = P({}, nueva, true);
  igual('nueva · manda el nombre, sin espacios de sobra', d.nombre, 'Ana Soto');
  igual('nueva · el monto como texto de número', d.monto, '35000');
  igual('nueva · la membresía', d.membresia, 'Potencial ingreso');
  comprobar('nueva · lo vacío no viaja', !('email' in d), 'desde la app no se borra nada en Notion');
  comprobar('nueva · y lo que no es de la ficha de Notion tampoco: notas y RUT se quedan en la app', !('notes' in d) && !('rut' in d) && !('notas' in d),
    'las notas de la app son de salud; no se suben a la base del gimnasio');
  const conAntes = P({ name: 'Ana', phone: '1' }, { name: 'Ana', phone: '2', notionPlan: 'Plan 2x/semana' }, true);
  comprobar('nueva · una ficha aún sin Notion manda TODO aunque haya un «antes»', conAntes.nombre === 'Ana' && conAntes.whatsapp === '2' && conAntes.plan === 'Plan 2x/semana',
    'crear con solo lo cambiado dejaría la ficha nueva sin nombre');

  /* EL CASO QUE IMPORTA: la app tiene la fecha de término de la última
     importación; el asistente la alargó después, con un pago. Diego cambia
     solo el teléfono. Si se mandara todo, Notion volvería a la fecha vieja. */
  const antes = { name: 'Ana Soto', phone: '+56912345678', planEndDate: '2026-09-15', planPrice: 35000, notionPlan: 'Plan 3x/semana' };
  const e = P(antes, Object.assign({}, antes, { phone: '+56987654321' }), false);
  igual('edición · solo viaja lo que cambió', Object.keys(e).join(), 'whatsapp');
  comprobar('edición · la fecha de término vieja NO viaja', !('termino' in e), 'pisaría en Notion la fecha que el asistente alargó con un pago');
  igual('edición · un número y su texto son lo mismo', Object.keys(P({ planPrice: 35000 }, { planPrice: '35000' }, false)).length, 0);
  igual('edición · lo que se vació no viaja: no se borra en Notion', Object.keys(P({ email: 'a@b.cl' }, { email: '' }, false)).length, 0);

  const ap = M.fichaAplicar_({ planEndDate: '2026-10-11', phone: '1', name: 'Ana' }, { planEndDate: '2026-09-11', phone: '2', name: 'Ana' }, { planEndDate: '2026-09-11', phone: '1', name: 'Ana' });
  comprobar('edición · en la app se aplica solo lo que cambió el formulario: la renovación que llegó con él abierto se queda',
    ap.planEndDate === '2026-10-11' && ap.phone === '2', JSON.stringify(ap));
  aviso('qué se manda · diez casos');
}

/* --- 2 · Lo pendiente y el cuerpo ------------------------------------ */
{
  const Mz = M.fichaPendMezclar_;
  const a = Mz(null, { telefono: '1' }, 100);
  const b = Mz(a, { termino: '2026-10-01' }, 200);
  igual('pendiente · dos ediciones sin subir se suman: la primera no se pierde', Object.keys(b.datos).sort().join() + '|' + b.datos.telefono, 'telefono,termino|1');
  igual('pendiente · y la más nueva gana campo a campo', Mz(a, { telefono: '2' }, 300).datos.telefono, '2');
  igual('pendiente · con la hora de la última', b.ts, 200);
  comprobar('pendiente · no toca lo que había (copia, no referencia)', a.datos.telefono === '1');
  const C = M.fichaCuerpo_;
  const c1 = C({ notionPend: { datos: { nombre: 'Ana' } } });
  igual('cuerpo · sin enlace a Notion, se crea', c1.op, 'crear');
  const c2 = C({ notionId: 'N1', notionPend: { datos: { termino: '2026-10-01' } } });
  igual('cuerpo · enlazada, se actualiza por su id', c2.op + '|' + c2.id, 'actualizar|N1');
  comprobar('cuerpo · crear aunque se parezca solo si se dice', !('forzar' in c1) && C({ notionPend: { datos: {} } }, { forzar: true }).forzar === true);
  const pend = { datos: { nombre: 'Ana' } };
  C({ notionPend: pend }).datos.nombre = 'otra';
  igual('cuerpo · los datos van copiados', pend.datos.nombre, 'Ana');
  comprobar('cuerpo · nunca manda «simular» ni «aceptoAvisos» por su cuenta', !('simular' in c1) && !('aceptoAvisos' in c1));
  aviso('pendiente y cuerpo · nueve casos');
}

/* --- 3 · ¿Contestó el asistente de verdad? --------------------------- */
{
  const L = M.fichaLeerRespuesta_;
  const lanza = (t) => { try { L(t); return ''; } catch (e) { return e.message; } };
  igual('respuesta · la de verdad pasa', L('{"ok":true,"cambios":[]}').ok, true);
  igual('respuesta · un «no» también es respuesta', L('{"ok":false,"error":"x"}').ok, false);
  comprobar('respuesta · un asistente viejo contesta {status:ok}: NO es un éxito', /no sabe de fichas/.test(lanza('{"status":"ok"}')));
  comprobar('respuesta · la clave mala se dice como clave mala', /clave/.test(lanza('{"error":"clave_invalida"}')));
  comprobar('respuesta · una página de error de Google no se lee como JSON', /no contestó con datos/.test(lanza('<html>Error</html>')));
  const cuota = lanza('{"error":"Exception: Service invoked too many times"}');
  comprobar('respuesta · si el asistente falló por dentro se dice SU error, no «falta desplegarlo»',
    /Service invoked/.test(cuota) && !/desplegar/.test(cuota), cuota);
  aviso('respuesta · seis casos');
}

/* --- 4 · A quién se enlaza cada fila de Notion ------------------------ */
{
  const B = M._impBuscar;
  const madre = { id: 'a', name: 'María Soto', phone: '+56912345678', notionId: 'N-MADRE' };
  const hijo = { id: 'b', name: 'Pedro Soto', phone: '+56912345678', notionId: 'N-HIJO' };
  const suelta = { id: 'c', name: 'Luis Rojas', phone: '', notionId: '' };
  const lista = [madre, hijo, suelta];
  const vivos = { 'N-MADRE': true, 'N-HIJO': true };
  igual('enlace · por su id de Notion, aunque otra comparta el teléfono', (B(lista, { id: 'N-HIJO', nombre: 'Pedro Soto', whatsapp: '+56912345678' }, vivos) || {}).id, 'b');
  igual('enlace · una fila nueva de la familia NO se queda con la ficha de otro', B(lista, { id: 'N-TIA', nombre: 'Rosa Soto', whatsapp: '+56912345678' }, vivos), null);
  igual('enlace · ni aunque comparta el primer nombre: una ficha ya enlazada a otra viva no está libre',
    B(lista, { id: 'N-MP', nombre: 'María Paz Soto', whatsapp: '+56912345678' }, vivos), null,
    'la ficha de la madre se iría con la de su hija');
  igual('enlace · una ficha sin enlace y OTRO nombre no se enlaza solo por teléfono (familias)',
    B([{ id: 'd', name: 'Carmen Soto', phone: '944442222' }], { id: 'N-ANA', nombre: 'Ana Soto', whatsapp: '+56944442222' }, {}), null);
  igual('enlace · con el mismo primer nombre, sí', (B([{ id: 'd', name: 'Ana Soto Pérez', phone: '944442222' }], { id: 'N-ANA', nombre: 'Ana Soto', whatsapp: '+56944442222' }, {}) || {}).id, 'd');
  igual('enlace · y si hay dos, gana la del nombre entero', (B([{ id: 'x', name: 'María José Soto', phone: '944442222' }, { id: 'y', name: 'Maria Paz Soto', phone: '944442222' }],
    { id: 'N-MP', nombre: 'María Paz Soto', whatsapp: '+56944442222' }, {}) || {}).id, 'y');
  igual('enlace · por nombre', (B(lista, { id: 'N-LUIS', nombre: 'luis rojas' }, vivos) || {}).id, 'c');
  igual('enlace · dos que se llaman igual con teléfonos distintos NO se enlazan',
    B([{ id: 'j1', name: 'Juan Perez', phone: '+56911111111', notionId: '' }], { id: 'N-J2', nombre: 'Juan Perez', whatsapp: '+56922222222' }, { 'N-J2': true }), null);
  igual('enlace · si su ficha de Notion ya no existe, se puede volver a enlazar',
    (B([{ id: 'e', name: 'Ana', phone: '+56911112222', notionId: 'N-BORRADA' }], { id: 'N-NUEVA', nombre: 'Ana', whatsapp: '+56911112222' }, { 'N-NUEVA': true }) || {}).id, 'e');
  igual('enlace · el id de Notion manda aunque en Notion hayan cambiado nombre y teléfono',
    (B([{ id: 'z', name: 'Nombre Viejo', phone: '+56900000001', notionId: 'N-Z' }], { id: 'N-Z', nombre: 'Nombre Nuevo', whatsapp: '+56900000002' }, { 'N-Z': true }) || {}).id, 'z');
  igual('enlace · nadie: null', B(lista, { id: 'N-X', nombre: 'Nadie', whatsapp: '+56900000000' }, vivos), null);
  igual('enlace · con basura no revienta', B(null, { id: 'x' }, null), null);

  const R = M._impReparar;
  const axel = { id: 'a', name: 'Axel Ejemplo', phone: '+56911112222', notionId: 'N-OLIVER' };
  const roster = [{ id: 'N-AXEL', nombre: 'Axel Ejemplo', whatsapp: '+56911112222' }, { id: 'N-OLIVER', nombre: 'Oliver Ejemplo', whatsapp: '+56911112222' }];
  const mov = R([axel], roster);
  comprobar('reparar · el enlace cruzado que dejó el importador viejo se deshace', axel.notionId === 'N-AXEL' && mov.length === 1,
    'la ficha de Axel escribía en la de Oliver');
  const lucas = { id: 'l', name: 'Lucas Ejemplo', phone: '+56911112222', notionId: 'N-OLIVER' };
  const oliver = { id: 'o', name: 'Oliver Ejemplo', phone: '+56911112222', notionId: 'N-OLIVER2' };
  R([lucas, oliver], [{ id: 'N-OLIVER', nombre: 'Oliver Ejemplo', whatsapp: '+56911112222' }, { id: 'N-OLIVER2', nombre: 'Lucas Ejemplo', whatsapp: '+56911112222' }]);
  comprobar('reparar · solo lo inequívoco: si la fila que le corresponde ya la tiene otra ficha, no se toca', lucas.notionId === 'N-OLIVER' && oliver.notionId === 'N-OLIVER2');
  const renombrada = { id: 'r', name: 'Ana Maria', phone: '+56911112222', notionId: 'N-R' };
  R([renombrada], [{ id: 'N-R', nombre: 'Ana María Soto', whatsapp: '+56911112222' }]);
  igual('reparar · si nadie más se llama como ella, se queda con su enlace', renombrada.notionId, 'N-R');
  aviso('enlace y reparación · quince casos, las familias incluidas');
}

/* --- 5 · La importación entera, ejecutada ----------------------------- */
{
  const fila = (id, nombre, tel, extra) => Object.assign({ id: id, nombre: nombre, activo: true, whatsapp: tel, membresia_activa: 'Activo' }, extra || {});

  /* a · la familia Ejemplo, con el enlace cruzado heredado */
  let W = mundo();
  W.state.clients = [{ id: 'a', name: 'Axel Ejemplo', phone: '+56911112222', notionId: 'N-OLIVER', planEndDate: '2026-09-01', planPrice: 30000 }];
  await W.importar({ clientes: [fila('N-AXEL', 'Axel Ejemplo', '+56911112222', { termino_plan: '2026-10-01', monto: 25000 }),
    fila('N-LUCAS', 'Lucas Ejemplo', '+56911112222'), fila('N-OLIVER', 'Oliver Ejemplo', '+56911112222', { termino_plan: '2026-10-09', monto: 30000 })], total: 3, completo: true });
  const ax = W.state.clients.find(c => c.id === 'a');
  const ids = W.state.clients.map(c => c.notionId).filter(Boolean);
  comprobar('importar · Axel vuelve a su ficha de Notion, con SU término', ax.notionId === 'N-AXEL' && ax.planEndDate === '2026-10-01' && ax.planPrice === 25000,
    JSON.stringify(ax));
  comprobar('importar · Lucas y Oliver quedan cada uno con la suya, sin fichas compartidas', W.state.clients.length === 3 && new Set(ids).size === 3);
  comprobar('importar · y se dice', W.toasts.some(t => /enlace.*corregido/.test(t)), JSON.stringify(W.toasts));

  /* b · una ficha de readaptación sin enlace, y la familiar que entra en Notion */
  W = mundo();
  W.state.clients = [{ id: 'm', name: 'Carmen Soto', phone: '+56 9 4444 2222', type: 'rehab' }];
  await W.importar({ clientes: [fila('N-ANA', 'Ana Soto', '+56944442222', { termino_plan: '2026-10-01', monto: 38000 })], total: 1, completo: true });
  comprobar('importar · la familiar con el mismo teléfono NO se queda con la ficha de Carmen', !W.state.clients.find(c => c.id === 'm').notionId && W.state.clients.length === 2,
    'Carmen habría quedado con el plan, el precio y el enlace de Ana: cualquier edición escribiría en la ficha de Ana');

  /* c · lo pendiente se respeta, y SOLO eso */
  W = mundo();
  W.state.clients = [{ id: 'p', name: 'Lucía Pérez', phone: '+56911112222', notionId: 'N-L', planEndDate: '2026-09-01', planPrice: 30000, activo: true,
    notionPend: { datos: { whatsapp: '+56911110000' }, ts: 1 } }];
  await W.importar({ clientes: [fila('N-L', 'Lucía Pérez', '+56987654321', { termino_plan: '2026-10-11', monto: 35000 })], total: 1, completo: true });
  const lu = W.state.clients[0];
  comprobar('importar · con un cambio sin subir, la renovación de Notion SÍ llega', lu.planEndDate === '2026-10-11' && lu.planPrice === 35000,
    'antes se saltaba la ficha entera y Cobros seguía viendo vencido a quien ya había pagado');
  comprobar('importar · y lo pendiente sigue pendiente', !!lu.notionPend && lu.notionPend.datos.whatsapp === '+56911110000');

  W = mundo();
  W.state.clients = [{ id: 'q', name: 'Rosa Díaz', phone: '+56933334444', notionId: 'N-R', activo: false, notionEstado: 'Inactivo',
    notionPend: { datos: { membresia: 'Inactivo' }, ts: 1 } }, { id: 'r', name: 'Otra', notionId: 'N-OTRA', activo: true, notionPend: { datos: { membresia: 'Activo' }, ts: 1 } }];
  await W.importar({ clientes: [fila('N-R', 'Rosa Díaz', '+56933334444')], total: 1, completo: true });
  comprobar('importar · la membresía cambiada en la app no la revierte la importación', W.state.clients[0].activo === false,
    'Notion aún no tiene el cambio y lo pisaría con lo viejo');
  comprobar('importar · y el barrido de bajas no toca a quien tiene la membresía pendiente', W.state.clients[1].activo === true);

  /* c bis · lo pendiente, campo a campo, en las dos ramas */
  W = mundo();
  W.state.clients = [{ id: 't', name: 'Tomás Rojas', phone: '+56922223333', notionId: 'N-T', planEndDate: '2026-12-01', activo: true,
    notionPend: { datos: { termino: '2026-12-01' }, ts: 1 } }];
  await W.importar({ clientes: [fila('N-T', 'Tomás Rojas', '+56922223333', { termino_plan: '2026-10-11' })], total: 1, completo: true });
  igual('importar · el término que Diego cambió y aún no subió no lo pisa Notion', W.state.clients[0].planEndDate, '2026-12-01');
  W = mundo();
  W.state.clients = [{ id: 'u', name: 'Úrsula Díaz', phone: '+56944445555', notionId: 'N-U', activo: true, notionEstado: 'Activo',
    notionPend: { datos: { membresia: 'Activo' }, ts: 1 } }];
  await W.importar({ clientes: [fila('N-U', 'Úrsula Díaz', '+56944445555', { activo: false, membresia_activa: 'Inactivo' }),
    fila('N-ZZ', 'Otro Activo', '+56900001111')], total: 2, completo: true });
  comprobar('importar · la reactivación hecha en la app no la deshace una fila inactiva de Notion',
    W.state.clients[0].activo === true && W.state.clients[0].notionEstado === 'Activo');
  W = mundo();
  W.state.clients = [{ id: 'v', name: 'Vera Muñoz', phone: '+56955556666', notionId: 'N-V', planEndDate: '', activo: true,
    notionPend: { datos: { whatsapp: '+56955550000' }, ts: 1 } }];
  /* (la importación no hace nada si Notion no trae ningún activo: va uno cualquiera) */
  await W.importar({ clientes: [fila('N-V', 'Vera Muñoz', '+56955556666', { activo: false, membresia_activa: 'Inactivo', termino_plan: '2026-08-01' }),
    fila('N-ZZ', 'Otro Activo', '+56900001111')], total: 2, completo: true });
  const ve = W.state.clients[0];
  comprobar('importar · en un inactivo con algo pendiente, lo demás sí llega: la baja y el término',
    ve.activo === false && ve.notionEstado === 'Inactivo' && ve.planEndDate === '2026-08-01', JSON.stringify(ve));
  W = mundo();
  W.state.clients = [{ id: 'w', name: 'Walter Paz', phone: '+56966667777', notionId: 'N-W', activo: true }];
  await W.importar({ clientes: [fila('N-W', 'Walter Paz', '+56966667777', { activo: false, membresia_activa: 'Inactivo' }),
    fila('N-ZZ', 'Otro Activo', '+56900001111')], total: 2, completo: true });
  igual('importar · la membresía de los inactivos se lee donde el puente la manda', W.state.clients[0].notionEstado, 'Inactivo',
    'con x.estado, que no existe, quedaba vacía en cada importación');

  /* d · la lista a medias */
  W = mundo();
  W.state.clients = [{ id: 'x1', name: 'Socio Uno', notionId: 'N-1', activo: true }, { id: 'x2', name: 'Socio Dos', notionId: 'N-2', activo: true }];
  await W.importar({ clientes: [fila('N-1', 'Socio Uno', '')], total: 1, completo: false });
  comprobar('importar · con la lista a medias no se da de baja a nadie', W.state.clients.find(c => c.id === 'x2').activo === true,
    'una página de Notion que falla no dice que Socio Dos se fue');
  comprobar('importar · y se dice', W.toasts.some(t => /a medias/.test(t)));
  W = mundo();
  W.state.clients = [{ id: 'x2', name: 'Socio Dos', phone: '+56977778888', notionId: 'N-2', activo: true }];
  await W.importar({ clientes: [fila('N-3', 'Socio Dos Bis', '+56977778888')], total: 1, completo: false });
  igual('importar · con la lista a medias, una ficha cuya fila no llegó no queda libre para otra', W.state.clients[0].notionId, 'N-2',
    'Socio Dos se habría ido con la fila de otra persona solo porque la suya no vino');
  W = mundo();
  W.state.clients = [{ id: 'x1', name: 'Socio Uno', notionId: 'N-1', activo: true }, { id: 'x2', name: 'Socio Dos', notionId: 'N-2', activo: true }];
  await W.importar({ clientes: [fila('N-1', 'Socio Uno', '')], total: 1 });
  comprobar('importar · con el bot viejo (sin «completo») el barrido sigue como siempre', W.state.clients.find(c => c.id === 'x2').activo === false);
  aviso('importación · ocho casos, ejecutada entera');
}

/* --- 6 · El formulario ------------------------------------------------ */
{
  const W = mundo();
  const nueva = W.fn.fichaSeccionHtml_({ type: 'gym' }, false);
  comprobar('formulario · un alta de gimnasio sale con la casilla marcada y en Potencial ingreso',
    /id="cf-notion"[^>]* checked/.test(nueva) && /value="Potencial ingreso" selected/.test(nueva));
  comprobar('formulario · un alta de readaptación NO sale marcada: entraría en los ingresos por aprobar',
    !/id="cf-notion"[^>]* checked/.test(W.fn.fichaSeccionHtml_({ type: 'rehab' }, false)));
  comprobar('formulario · una ficha con algo pendiente sale marcada, para que «Corregir» llegue',
    /id="cf-notion"[^>]* checked/.test(W.fn.fichaSeccionHtml_({ type: 'gym', notionPend: { datos: { nombre: 'x' } } }, true)));
  const campo = (v, extra) => Object.assign({ value: v }, extra || {});
  W.dom = { 'cf-notion': campo('', { checked: false, disabled: false }), 'cf-n-mem': campo(''), 'cf-n-plan': campo('Plan 2x/semana'), 'cf-n-nota': campo('hola') };
  const f1 = W.fn.fichaLeerFormulario_(true);
  comprobar('formulario · sin la casilla no se sube', f1.subir === false);
  comprobar('formulario · en una edición, un desplegable en «—» no borra lo que había', !('notionEstado' in f1.campos) && f1.campos.notionPlan === 'Plan 2x/semana');
  W.dom = { 'cf-notion': campo('', { checked: true, disabled: true }) };
  igual('formulario · deshabilitada (sin puente) tampoco', W.fn.fichaLeerFormulario_(false).subir, false);

  const W2 = mundo();
  W2.state.clients = [{ id: 'c1', name: 'Ana', phone: '+56911112222' }];
  W2.resp = { ok: true, simulado: true, cambios: [], duplicados: [], avisos: [] };
  W2.fn.fichaTrasGuardar_(W2.state.clients[0], {}, { subir: true, nota: 'pagó en efectivo', campos: {} });
  await ticks();
  const ped = W2.pedidos.filter(p => /ficha_cliente/.test(p.url));
  comprobar('formulario · al guardar se simula primero, con la nota', ped.length === 1 && ped[0].body.simular === true && ped[0].body.datos.nota === 'pagó en efectivo' && ped[0].body.op === 'crear',
    JSON.stringify(ped.map(p => p.body)));
  const form = tramo('function openClientForm(', '\n}\n', 'openClientForm');
  comprobar('formulario · lo de antes se copia al ABRIR, antes que el modal',
    form.indexOf('var _fichaAntes = isEdit ? Object.assign({}, client) : {};') > 0 && form.indexOf('var _fichaAntes') < form.indexOf('openModal('),
    'copiado al guardar, lo que la importación trajo con el formulario abierto viajaba como un cambio');
  comprobar('formulario · y al guardar se aplica solo lo cambiado', form.indexOf('fichaAplicar_(client, data, _fichaAntes);') > 0 && form.indexOf('Object.assign(client, data);') < 0);
  comprobar('formulario · después de guardar, a Notion con lo de antes', form.indexOf('fichaTrasGuardar_(isEdit ? client : data, _fichaAntes, _fichaForm);') > 0);
  aviso('formulario · nueve casos');
}

/* --- 7 · La vista previa y la escritura, ejecutadas -------------------- */
{
  let W = mundo();
  W.state.clients = [{ id: 'c1', name: 'Ana Ejemplo', notionId: 'N1', notionPend: { datos: { monto: '30000' }, ts: 5 } }];
  const cuerpo = { op: 'actualizar', id: 'N1', datos: { monto: '30000' } };
  /* <u> y <s> no los usa la app en ningún sitio de la vista previa: si
     aparecen tal cual, entró HTML del asistente sin escapar. */
  W.fn.fichaVistaPrevia_('c1', cuerpo, 5, { ok: true, nombreNotion: 'Carla <u>Ejemplo</u>', cambios: [{ columna: 'Monto <s>', antes: '<u>35000', ahora: '<s>30000' }],
    avisos: ['<u>ojo</u>'], errores: [], duplicados: [] });
  const m1 = W.modales[W.modales.length - 1];
  comprobar('vista previa · todo lo que viene del asistente se escapa', !!m1 && m1.bodyHtml.indexOf('<u>') < 0 && m1.bodyHtml.indexOf('<s>') < 0 && m1.bodyHtml.indexOf('&lt;u&gt;') > 0,
    'nombres y notas escritos a mano entrarían como HTML');
  comprobar('vista previa · dice a QUÉ ficha de Notion se escribe, y avisa si no es la misma persona', /Ficha de Notion: Carla/.test(m1.bodyHtml) && /no se llama como en la app/.test(m1.bodyHtml),
    'un enlace cruzado escribía en la ficha de un familiar y la vista previa solo enseñaba el nombre de la app');
  W.confirmar = false;
  m1.footer[m1.footer.length - 1].onClick();
  await ticks();
  comprobar('vista previa · si Diego dice que no es la misma persona, no se escribe', W.pedidos.length === 0);
  W.confirmar = true;
  W.resp = { ok: true, op: 'actualizar', id: 'N1', cambios: [] };
  m1.footer[m1.footer.length - 1].onClick();
  await ticks();
  comprobar('vista previa · si lo confirma, se escribe con los avisos vistos', W.pedidos.length === 1 && W.pedidos[0].body.aceptoAvisos === true && !W.pedidos[0].body.simular);
  comprobar('escribir · con el «sí» de Notion, lo pendiente se va', !W.state.clients[0].notionPend);

  W = mundo();
  W.state.clients = [{ id: 'c2', name: 'Nueva', notionPend: { datos: { nombre: 'Nueva' }, ts: 7 } }];
  W.fn.fichaVistaPrevia_('c2', { op: 'crear', datos: { nombre: 'Nueva' } }, 7, { ok: true, cambios: [], avisos: [], errores: [],
    duplicados: [{ id: 'D1', nombre: '<img src=x onerror=alert(1)>', membresia: 'Activo', por: 'teléfono' }] });
  const m2 = W.modales[W.modales.length - 1];
  comprobar('vista previa · los duplicados se enseñan antes de crear, escapados', /podrían ser esta persona/.test(m2.bodyHtml) && m2.bodyHtml.indexOf('<img') < 0);
  W.fn.fichaVistaPrevia_('c2', { op: 'crear', datos: {} }, 7, { ok: false, errores: ['<b>mal</b>'], cambios: [], avisos: [], duplicados: [] });
  const m3 = W.modales[W.modales.length - 1];
  comprobar('vista previa · y los errores también', /Notion no aceptaría/.test(m3.bodyHtml) && m3.bodyHtml.indexOf('<b>mal') < 0);

  W = mundo();
  W.state.clients = [{ id: 'c3', name: 'Luis', notionPend: { datos: { nombre: 'Luis' }, ts: 9 } }];
  W.resp = { ok: false, error: 'Notion no aceptó el cambio' };
  W.fn.fichaEscribir_('c3', { op: 'crear', datos: { nombre: 'Luis' } }, 9);
  await ticks();
  comprobar('escribir · con un «no» de Notion, lo pendiente sigue y no se inventa un enlace', !!W.state.clients[0].notionPend && !W.state.clients[0].notionId);
  W.resp = { ok: true, op: 'crear', id: 'N-LUIS' };
  W.fn.fichaEscribir_('c3', { op: 'crear', datos: { nombre: 'Luis', membresia: 'Potencial ingreso' } }, 9);
  await ticks();
  const lu = W.state.clients[0];
  comprobar('escribir · con el «sí», queda enlazada, sin pendiente y fuera de los activos hasta que se active',
    lu.notionId === 'N-LUIS' && !lu.notionPend && lu.activo === false && lu.notionEstado === 'Potencial ingreso', JSON.stringify(lu));
  lu.notionPend = { datos: { email: 'x@y.cl' }, ts: 11 };
  W.fn.fichaEscribir_('c3', { op: 'actualizar', id: 'N-LUIS', datos: { email: 'x@y.cl' } }, 10);
  await ticks();
  comprobar('escribir · si se editó otra vez mientras se escribía, lo nuevo sigue pendiente', !!lu.notionPend && lu.notionPend.ts === 11);

  W = mundo();
  const nueva2 = { id: 'n', name: 'Ana Soto', notionPend: { datos: { nombre: 'Ana Soto', membresia: 'Potencial ingreso', termino: '2026-10-01' }, ts: 1 } };
  const vieja = { id: 'v', name: '📱 Anita', notionId: 'D9' };
  W.state.clients = [nueva2, vieja];
  W.resp = { ok: true, simulado: true, cambios: [], duplicados: [], avisos: [] };
  W.fn.fichaVistaPrevia_('n', { op: 'crear', datos: nueva2.notionPend.datos }, 1, { ok: true, cambios: [], avisos: [], errores: [],
    duplicados: [{ id: 'D9', nombre: '📱 Anita', membresia: 'Potencial ingreso', portero: true, por: 'teléfono' }] });
  W.fn.fichaEnlazar_('n', 0);
  await ticks();
  comprobar('completar · nunca quedan dos fichas de la app sobre una de Notion', nueva2.notionId === 'D9' && vieja.notionId === '',
    'la importación solo refrescaría la primera y la otra seguiría escribiendo');
  comprobar('completar · y la membresía por defecto no viaja a una ficha que ya existe', !('membresia' in nueva2.notionPend.datos));
  aviso('vista previa y escritura · catorce casos, ejecutadas');
}

/* --- 8 · Lo que pintan reactivar y marcar ------------------------------ */
{
  let h = '';
  try { h = M.u19ReactResultadoHTML({ hechos: ['p1', { id: 'p2', nombre: 'Ana', antes: { activa: 'Inactivo', termino: '2026-08-01' }, ahora: { activa: 'Activo', termino: '2026-10-15' } }], errores: ['texto suelto', { nombre: 'Luis', por: 'rechazado' }] }); }
  catch (e) { h = 'REVIENTA: ' + e.message; }
  comprobar('reactivar · un id suelto (asistente viejo) no revienta el resultado', h.indexOf('REVIENTA') < 0, h.slice(0, 120));
  comprobar('reactivar · y el hecho completo se pinta con antes y ahora', h.indexOf('Inactivo · 2026-08-01') > 0 && h.indexOf('Activo · 2026-10-15') > 0);
  comprobar('reactivar · los errores sueltos también se leen', h.indexOf('texto suelto') > 0 && h.indexOf('rechazado') > 0);
  comprobar('marcar · un error en texto suelto no sale como «?: »',
    src.indexOf("escapeHtml((x && typeof x === 'object') ? ((x.nombre || x.id || '?') + ': ' + (x.por || '')) : String(x || ''))") > 0);
  comprobar('tarjeta · se ve qué fichas tienen cambios sin subir', src.indexOf('onclick="fichaNotionSubir(') > 0 && src.indexOf('⏳ Notion pendiente') > 0);
  igual('formulario · los cuatro estados de Membresía Activa, con sus nombres de Notion', mundo().FICHA_MEMBRESIAS.join('|'), 'Potencial ingreso|Prueba|Activo|Inactivo');
  const campos = mundo().FICHA_CAMPOS.map(p => p[1]);
  comprobar('campos · cada dato sale de un campo que el cliente de la app tiene',
    ['name', 'phone', 'email', 'planPrice', 'planEndDate', 'goal', 'notionPlan', 'notionEstado'].every(k => campos.indexOf(k) >= 0));
}

/* --- 9 · Nada de lenguaje clínico en lo nuevo -------------------------- */
{
  const bloque = tramo('/* ===FICHA_NOTION===', '/* ===FICHA_NOTION_END=== */', 'bloque de fichas');
  const nuevas = ['seriesPayloadPersona_', 'seriesPayloadOrden_', 'seriesOrdenNombre_', 'seriesOrdenPreparar_',
    'seriesOrdenGuardarFoto_', 'seriesSincronizar', 'seriesOrdenPedir', 'seriesOrdenBarrer_'].map(n => tramo('function ' + n + '(', '\n}\n', n)).join('\n');
  const vetadas = /kinesiolog|kin[eé]sic|paciente|previsi[oó]n|fonasa|isapre/i;
  const m1 = bloque.match(vetadas), m2 = nuevas.match(vetadas);
  comprobar('vocabulario · el bloque de fichas no usa lenguaje clínico', !m1, m1 ? 'aparece «' + m1[0] + '»' : '');
  comprobar('vocabulario · la persona y la orden de las series tampoco', !m2, m2 ? 'aparece «' + m2[0] + '»' : '');
}

})().catch(e => { falla('las pruebas asíncronas reventaron', String(e && e.stack || e).slice(0, 300)); }).then(imprimir);

/* --- salida ---------------------------------------------------------- */
function imprimir() {
  console.log('\nUS19-APP · fichas de socios en Notion');
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
