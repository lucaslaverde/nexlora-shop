// Motor del CRM: todo lo que pasa en la tienda se registra como EVENTO de un contacto.
// Los eventos mueven pipelines, disparan automatizaciones y alimentan la medición.
// Todas las funciones reciben `st` (la copia mutable que entrega `mutate`) y la modifican.
import { uid } from '../seed.js';
import { priceCart, orderRisk, norm } from '../commerce/pricing.js';

export const EVENT_LABELS = {
  lead_creado: 'Nuevo contacto', juego_jugado: 'Jugó', premio_entregado: 'Recibió premio', chat_recibido: 'Escribió',
  chat_respondido: 'Le respondimos', checkout_iniciado: 'Empezó el checkout', pedido_creado: 'Hizo un pedido',
  pedido_contraentrega: 'Pedido contra entrega', contraentrega_confirmada: 'Confirmó contra entrega', contraentrega_rechazada: 'Rechazó contra entrega',
  pedido_pagado: 'Pagó', whatsapp_enviado: 'WhatsApp enviado', email_enviado: 'Email enviado', etiqueta: 'Etiqueta', etapa: 'Cambió de etapa', tarea_creada: 'Tarea creada', tarea_completada: 'Tarea completada',
};

export const TRIGGERS = {
  lead_creado: 'Nuevo contacto que aún no compra',
  carrito_abandonado: 'Checkout sin terminar (dejó sus datos)',
  pedido_creado: 'Hizo un pedido',
  pedido_pagado: 'Pedido pagado',
  pedido_contraentrega: 'Pedido contra entrega',
  premio_entregado: 'Ganó un premio en un juego',
  chat_recibido: 'Escribió por chat',
};

const digits = s => String(s || '').replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');

export function log(st, type, contactId, data = {}) {
  st.events ||= [];
  st.events.unshift({ id: uid('e'), at: new Date().toISOString(), type, contactId, data });
  if (st.events.length > 800) st.events.length = 800;
  fire(st, type, contactId, data);
}

// ---------- Contactos ----------
// Busca primero por correo Y celular, luego por celular (en Colombia el WhatsApp es la identidad
// principal) y por último por correo. Así no se duplica a la misma persona.
export function findContact(st, { email, phone }) {
  const e = norm(email); const p = digits(phone);
  const byE = c => e && norm(c.email) === e;
  const byP = c => p && p.length >= 7 && digits(c.phone) === p;
  return st.customers.find(c => byE(c) && byP(c)) || st.customers.find(byP) || st.customers.find(byE);
}
export function ensureContact(st, info) {
  let c = findContact(st, info);
  if (c) {
    if (info.name && (!c.name || c.name.startsWith('Usuario'))) c.name = info.name;
    if (info.email && !c.email) c.email = info.email;
    if (info.phone && !c.phone) c.phone = info.phone;
    if (info.city && !c.city) c.city = info.city;
    for (const t of info.tags || []) if (!c.tags.includes(t)) c.tags.push(t);
    if (info.marketing) c.marketing = true;
    return c;
  }
  c = { id: uid('c'), name: info.name || 'Sin nombre', email: info.email || '', phone: info.phone || '', city: info.city || '', tags: [...(info.tags || [])], marketing: !!info.marketing, source: info.source || 'Tienda online', createdAt: new Date().toISOString() };
  st.customers.push(c);
  if (info.lead !== false) log(st, 'lead_creado', c.id, { fuente: c.source });
  return c;
}
export const hasPurchased = (st, contactId) => st.orders.some(o => o.customerId === contactId);

export function addTag(st, contactId, tag) {
  const c = st.customers.find(x => x.id === contactId);
  if (c && !c.tags.includes(tag)) { c.tags.push(tag); st.events.unshift({ id: uid('e'), at: new Date().toISOString(), type: 'etiqueta', contactId, data: { etiqueta: tag } }); }
}

// ---------- Códigos únicos ----------
export function issueCode(st, { kind = 'porcentaje', value = 10, days = 7, contactId = null, origin = '', minSubtotal = 0, prefix = 'NX' }) {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = prefix + '-' + Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * letters.length)]).join(''); } while (st.discounts.some(d => d.code === code));
  const endsAt = new Date(Date.now() + days * 864e5).toISOString();
  st.discounts.unshift({ id: uid('d'), code, type: kind, value, minSubtotal, uses: 0, limit: 1, active: true, endsAt, contactId, origin, personal: true, createdAt: new Date().toISOString() });
  return code;
}

// ---------- Pipelines ----------
export function moveDeal(st, { pipelineId, stageId, contactId, title, value = 0, orderId = null }) {
  st.deals ||= [];
  const closed = ['pagado', 'perdido', 'compro', 'recompro'];
  let d = st.deals.find(x => x.pipelineId === pipelineId && x.contactId === contactId && (orderId ? x.orderId === orderId || !x.orderId : !closed.includes(x.stageId)));
  const now = new Date().toISOString();
  if (!d) { d = { id: uid('dl'), pipelineId, stageId, contactId, title: title || 'Oportunidad', value, orderId, createdAt: now, updatedAt: now }; st.deals.unshift(d); }
  else { d.stageId = stageId; d.updatedAt = now; if (title) d.title = title; if (value) d.value = value; if (orderId) d.orderId = orderId; }
  const p = st.pipelines?.find(x => x.id === pipelineId);
  st.events.unshift({ id: uid('e'), at: now, type: 'etapa', contactId, data: { pipeline: p?.name, etapa: p?.stages.find(s => s.id === stageId)?.name } });
  return d;
}

// ---------- Tareas ----------
export function createTask(st, t) {
  st.tasks ||= [];
  const task = { id: uid('t'), done: false, createdAt: new Date().toISOString(), due: new Date(Date.now() + 864e5).toISOString(), ...t };
  st.tasks.unshift(task);
  st.events.unshift({ id: uid('e'), at: task.createdAt, type: 'tarea_creada', contactId: t.contactId, data: { tarea: t.title } });
  return task;
}

// ---------- Conversaciones ----------
export function conversationFor(st, contactId, channel = 'whatsapp') {
  st.conversations ||= [];
  let cv = st.conversations.find(c => c.contactId === contactId && c.channel === channel);
  if (!cv) { cv = { id: uid('cv'), contactId, channel, status: 'abierta', unread: 0, messages: [], updatedAt: new Date().toISOString() }; st.conversations.unshift(cv); }
  return cv;
}
export function pushMessage(st, cv, from, text, extra = {}) {
  const at = new Date().toISOString();
  cv.messages.push({ from, text, at, ...extra });
  cv.updatedAt = at;
  if (from === 'cliente') cv.unread = (cv.unread || 0) + 1;
}

// ---------- Plantillas ----------
export function render(text, vars) {
  return String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] ?? m));
}
const varsFor = (st, contactId, ctx = {}) => {
  const c = st.customers.find(x => x.id === contactId) || {};
  return { nombre: (c.name || '').split(' ')[0] || 'Hola', tienda: st.settings.storeName, ciudad: c.city || '', ...ctx };
};

// ---------- Pedidos ----------
// Crear un pedido desde CUALQUIER canal (web, chat, tarea de pago) pasa por aquí.
export function createOrder(st, { contactId, items, department, city, address, paymentMethod, channel, code, notes, paid = false, utm = null }) {
  const lines = items.map(i => ({ p: st.products.find(p => p.id === i.productId), qty: i.qty })).filter(l => l.p);
  const pr = priceCart(st, lines, { code, department, contactId });
  const number = Math.max(1000, ...st.orders.map(o => o.number)) + 1;
  const isCod = paymentMethod === 'contraentrega';
  const order = {
    id: uid('o'), number, customerId: contactId,
    items: lines.map(l => ({ productId: l.p.id, title: l.p.title, price: l.p.price, qty: l.qty, image: l.p.image, tierOff: pr.tierLines[l.p.id] || 0 })),
    subtotal: pr.subtotal, shipping: pr.shipping, discount: pr.discount, tierDiscount: pr.tierDiscount, codeDiscount: pr.codeDiscount, total: pr.total,
    payment: paid ? 'pagado' : 'pendiente', fulfillment: 'sin preparar', channel, createdAt: new Date().toISOString(),
    department, city, address, paymentMethod, codStatus: isCod ? 'por-confirmar' : null, code: pr.code?.code || '', notes: notes || '', utm,
  };
  st.orders.push(order);
  for (const l of lines) l.p.stock = Math.max(0, l.p.stock - l.qty);
  if (pr.code) { const d = st.discounts.find(x => x.id === pr.code.id); if (d) d.uses++; }
  for (const t of pr.tierInfo) if (t.tier) t.discount.uses = (t.discount.uses || 0) + 1;
  onOrderCreated(st, order);
  if (paid) onOrderPaid(st, order);
  return order;
}

export function onOrderCreated(st, order) {
  const cid = order.customerId;
  log(st, 'pedido_creado', cid, { pedido: order.number, total: order.total, canal: order.channel });
  // Sale de los flujos que terminan cuando compra (primera compra, carrito abandonado).
  for (const r of st.runs || []) {
    const wf = st.workflows.find(w => w.id === r.workflowId);
    if (r.contactId === cid && r.status === 'activa' && wf?.exitOn === 'compra') { r.status = 'salió'; r.log.push({ at: new Date().toISOString(), text: `Salió del flujo: compró (#${order.number})` }); }
  }
  // Código de un juego canjeado: cuenta la venta para ese juego (medir ventas, no solo clics).
  const d = order.code && st.discounts.find(x => x.code === order.code);
  if (d?.origin?.startsWith('juego:')) {
    const g = st.games?.find(x => x.id === d.origin.slice(6));
    if (g) { g.stats.redeemed++; g.stats.revenue += order.total; }
  }
  if (st.deals?.some(x => x.pipelineId === 'leads' && x.contactId === cid && x.stageId !== 'compro')) moveDeal(st, { pipelineId: 'leads', stageId: 'compro', contactId: cid, value: order.total });
  if (order.paymentMethod === 'contraentrega') log(st, 'pedido_contraentrega', cid, { pedido: order.number, orderId: order.id });
}

export function onOrderPaid(st, order) {
  log(st, 'pedido_pagado', order.customerId, { pedido: order.number, total: order.total, orderId: order.id });
}

// ---------- Tarea "Validar pago y crear pedido" (pedidos por chat) ----------
export function completeTask(st, taskId) {
  const t = st.tasks.find(x => x.id === taskId);
  if (!t || t.done) return null;
  t.done = true; t.doneAt = new Date().toISOString();
  st.events.unshift({ id: uid('e'), at: t.doneAt, type: 'tarea_completada', contactId: t.contactId, data: { tarea: t.title } });
  if (t.kind !== 'validar-pago' || !t.draft) return null;
  const c = st.customers.find(x => x.id === t.contactId);
  const { convChannel, ...draft } = t.draft;
  const order = createOrder(st, { contactId: t.contactId, ...draft, paid: true, address: draft.address || '', notes: 'Pedido por chat · pago validado por un asesor' });
  if (t.dealId) moveDeal(st, { pipelineId: 'chat', stageId: 'pagado', contactId: t.contactId, value: order.total, orderId: order.id });
  const ch = t.draft.convChannel || ({ 'Chat web': 'web', Instagram: 'instagram' }[t.draft.channel] || 'whatsapp');
  const cv = conversationFor(st, t.contactId, ch);
  pushMessage(st, cv, 'tienda', `✅ ${c?.name?.split(' ')[0] || ''}, confirmamos tu pago. Tu pedido #${order.number} ya está en preparación.`);
  return order;
}

// ---------- Automatizaciones ----------
function fire(st, type, contactId, data) {
  for (const wf of st.workflows || []) {
    if (!wf.active) continue;
    let match = wf.trigger === type;
    if (wf.trigger === 'lead_creado' && type === 'lead_creado' && hasPurchased(st, contactId)) match = false;
    if (!match) continue;
    if (wf.trigger !== 'pedido_pagado' && wf.trigger !== 'pedido_contraentrega' && (st.runs || []).some(r => r.workflowId === wf.id && r.contactId === contactId && r.status === 'activa')) continue;
    enroll(st, wf, contactId, data);
  }
}
export function enroll(st, wf, contactId, ctx = {}) {
  st.runs ||= [];
  const run = { id: uid('r'), workflowId: wf.id, contactId, step: 0, nextAt: new Date().toISOString(), status: 'activa', ctx: { ...ctx }, log: [{ at: new Date().toISOString(), text: 'Entró al flujo' }] };
  st.runs.unshift(run);
  wf.stats ||= { enrolled: 0, sent: 0, completed: 0 };
  wf.stats.enrolled++;
  advance(st, run);
  return run;
}
// Ejecuta los pasos pendientes. fast = true salta las esperas (botón "Probar ahora").
export function advance(st, run, fast = false) {
  const wf = st.workflows.find(w => w.id === run.workflowId);
  if (!wf || run.status !== 'activa') return;
  let guard = 0;
  while (run.status === 'activa' && guard++ < 50) {
    if (!fast && new Date(run.nextAt).getTime() > Date.now()) return;
    const step = wf.steps[run.step];
    if (!step) { run.status = 'completada'; wf.stats.completed++; run.log.push({ at: new Date().toISOString(), text: 'Terminó el flujo' }); return; }
    const now = new Date().toISOString();
    const vars = varsFor(st, run.contactId, run.ctx);
    if (step.type === 'esperar') { run.nextAt = new Date(Date.now() + (fast ? 0 : step.hours * 36e5)).toISOString(); run.log.push({ at: now, text: `Espera ${step.hours} h` }); run.step++; if (!fast) return; continue; }
    if (step.type === 'whatsapp') {
      const tpl = st.templates.find(x => x.id === step.template);
      const c = st.customers.find(x => x.id === run.contactId);
      if (!tpl || tpl.status !== 'aprobada') run.log.push({ at: now, text: `No se envió: plantilla ${tpl?.name || '?'} sin aprobar por Meta` });
      else if (!c?.phone) run.log.push({ at: now, text: 'No se envió: el contacto no tiene WhatsApp' });
      else {
        const text = render(tpl.body, vars);
        pushMessage(st, conversationFor(st, run.contactId, 'whatsapp'), 'tienda', text, { template: tpl.name, workflow: wf.name });
        st.events.unshift({ id: uid('e'), at: now, type: 'whatsapp_enviado', contactId: run.contactId, data: { plantilla: tpl.name, flujo: wf.name } });
        wf.stats.sent++; run.log.push({ at: now, text: `WhatsApp: ${tpl.name}` });
      }
    }
    if (step.type === 'email') {
      st.events.unshift({ id: uid('e'), at: now, type: 'email_enviado', contactId: run.contactId, data: { asunto: render(step.subject, vars), flujo: wf.name } });
      wf.stats.sent++; run.log.push({ at: now, text: `Email: ${render(step.subject, vars)}` });
    }
    if (step.type === 'descuento') { run.ctx.codigo = issueCode(st, { value: step.pct, days: step.days, contactId: run.contactId, origin: 'flujo:' + wf.id }); run.log.push({ at: now, text: `Código ${run.ctx.codigo} (${step.pct} %, ${step.days} días)` }); }
    if (step.type === 'etiqueta') { addTag(st, run.contactId, step.tag); run.log.push({ at: now, text: `Etiqueta: ${step.tag}` }); }
    if (step.type === 'etapa') { moveDeal(st, { pipelineId: step.pipelineId, stageId: step.stageId, contactId: run.contactId, title: run.ctx.pedido ? `Pedido #${run.ctx.pedido}` : undefined, value: run.ctx.total || 0, orderId: run.ctx.orderId || null }); run.log.push({ at: now, text: 'Movido de etapa' }); }
    if (step.type === 'tarea') { createTask(st, { title: step.title, contactId: run.contactId, kind: 'general' }); run.log.push({ at: now, text: `Tarea: ${step.title}` }); }
    if (step.type === 'tarea_si_riesgo') {
      const o = st.orders.find(x => x.id === run.ctx.orderId);
      const r = o && orderRisk(st, o);
      if (r?.level === 'alto') { createTask(st, { title: `${step.title} · #${o.number}`, contactId: run.contactId, kind: 'confirmar', orderId: o.id }); run.log.push({ at: now, text: `Riesgo alto (${r.score}): tarea creada` }); }
      else run.log.push({ at: now, text: `Riesgo ${r?.level || 'desconocido'}: no hace falta llamar` });
    }
    run.step++;
  }
}
export function runDue(st) { for (const r of st.runs || []) if (r.status === 'activa') advance(st, r); }
export const STEP_LABELS = { esperar: 'Esperar', whatsapp: 'Enviar WhatsApp', email: 'Enviar email', descuento: 'Crear código único', etiqueta: 'Agregar etiqueta', etapa: 'Mover en pipeline', tarea: 'Crear tarea', tarea_si_riesgo: 'Tarea si el riesgo es alto' };
