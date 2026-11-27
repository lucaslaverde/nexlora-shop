// Motor comercial: UNA sola fuente de verdad para precios, descuentos, envío, contraentrega,
// riesgo y ganancia. Lo usan la tienda, el carrito, el checkout, el asistente de chat y el CRM.
// Lección aplicada: "mostrar y cobrar son dos sistemas" en Shopify; aquí es el mismo cálculo.

export const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const isLive = (d, now = Date.now()) => d.active && (!d.startsAt || new Date(d.startsAt).getTime() <= now) && (!d.endsAt || new Date(d.endsAt).getTime() >= now);

// ---------- Descuento escalonado (automático, por colección) ----------
export function liveTierDiscounts(state, now = Date.now()) {
  return (state.discounts || []).filter(d => d.type === 'escalonado' && isLive(d, now));
}
export function tierFor(d, qty) {
  let best = null;
  for (const t of [...(d.tiers || [])].sort((a, b) => a.qty - b.qty)) if (qty >= t.qty) best = t;
  return best;
}
export function nextTier(d, qty) {
  return [...(d.tiers || [])].sort((a, b) => a.qty - b.qty).find(t => t.qty > qty) || null;
}
// Para tarjetas y ficha: qué descuento tendría este producto si se lleva `qty` (sumando lo que ya hay en el carrito).
export function productTier(state, product, qtyInCart = 0) {
  const d = liveTierDiscounts(state).find(x => (x.collections || []).includes(product.collection));
  if (!d) return null;
  const qty = Math.max(1, qtyInCart);
  const t = tierFor(d, qty);
  const n = nextTier(d, qtyInCart);
  return { discount: d, tier: t, next: n, price: t ? Math.round(product.price * (1 - t.pct / 100)) : product.price, best: Math.max(...d.tiers.map(x => x.pct)) };
}

// ---------- Envío por departamento ----------
export function shippingQuote(state, department, subtotalAfterDiscounts, method = 'envio') {
  const sh = state.settings.shipping;
  if (!sh) { const r = state.settings.shippingRates?.[0]; return { price: r ? (r.freeFrom && subtotalAfterDiscounts >= r.freeFrom ? 0 : r.price) : 0, label: r?.name || 'Envío', days: '' }; }
  if (method === 'recoger' && sh.pickup?.enabled) return { price: 0, label: sh.pickup.name, days: 'Listo en 24 h', zone: null };
  const zone = sh.zones.find(z => z.departments.includes(department));
  const base = zone ? zone.price : sh.restPrice;
  const free = sh.freeFrom && subtotalAfterDiscounts >= sh.freeFrom;
  return { price: free ? 0 : base, base, free, label: zone ? zone.name : 'Resto del país', days: zone ? zone.days : sh.restDays, zone };
}

// ---------- Contraentrega ----------
export function codAvailability(state, department, total) {
  const c = state.settings.cod;
  if (!c?.enabled) return { ok: false, why: 'La tienda no ofrece pago contra entrega.' };
  if (department && c.blockedDepartments?.includes(department)) return { ok: false, why: `No hay pago contra entrega en ${department}.` };
  if (c.maxTotal && total > c.maxTotal) return { ok: false, why: `Contra entrega solo hasta ${fmt(c.maxTotal)}.` };
  return { ok: true };
}
const fmt = n => '$' + Math.round(n).toLocaleString('es-CO');

// ---------- Código de descuento ----------
export function findCode(state, code) {
  const c = norm(code).toUpperCase();
  return (state.discounts || []).find(d => d.code && d.code.toUpperCase() === c);
}
export function validateCode(state, d, { subtotal, contactId } = {}) {
  if (!d) return 'Código no válido';
  if (!d.active) return 'Este código ya no está activo';
  if (d.endsAt && new Date(d.endsAt).getTime() < Date.now()) return 'Este código ya venció';
  if (d.startsAt && new Date(d.startsAt).getTime() > Date.now()) return 'Este código todavía no empieza';
  if (subtotal < (d.minSubtotal || 0)) return `Mínimo de compra ${fmt(d.minSubtotal)}`;
  if (d.limit && d.uses >= d.limit) return 'Este código ya se usó';
  if (d.contactId && contactId && d.contactId !== contactId) return 'Este código es personal de otra persona';
  return null;
}

// ---------- Precio del carrito (todo junto) ----------
// lines: [{ p: producto, qty }]  ·  opts: { code, department, method, pay }
export function priceCart(state, lines, opts = {}) {
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  // 1) Escalonado: cuenta las unidades de TODAS las colecciones del descuento juntas.
  let tierDiscount = 0; const tierLines = {}; const tierInfo = [];
  for (const d of liveTierDiscounts(state)) {
    const elig = lines.filter(l => d.collections.includes(l.p.collection));
    const units = elig.reduce((s, l) => s + l.qty, 0);
    if (!units) continue;
    const t = tierFor(d, units); const n = nextTier(d, units);
    tierInfo.push({ discount: d, units, tier: t, next: n, missing: n ? n.qty - units : 0 });
    if (!t) continue;
    for (const l of elig) {
      const off = Math.round(l.p.price * l.qty * t.pct / 100);
      if (off > (tierLines[l.p.id] || 0)) { tierDiscount += off - (tierLines[l.p.id] || 0); tierLines[l.p.id] = off; }
    }
  }
  // 2) Código: si el escalonado no es combinable, el código solo aplica a líneas SIN escalonado
  //    (así no pasa lo de "el código se suma encima del precio rebajado").
  let codeDiscount = 0; let codeError = null; let freeShipping = false; let code = null; let codeNote = '';
  if (opts.code) {
    code = findCode(state, opts.code);
    codeError = validateCode(state, code, { subtotal, contactId: opts.contactId });
    if (!codeError) {
      const anyNonCombinable = tierInfo.some(x => x.tier && !x.discount.combinable);
      const base = anyNonCombinable ? lines.filter(l => !tierLines[l.p.id]).reduce((s, l) => s + l.p.price * l.qty, 0) : subtotal - tierDiscount;
      if (anyNonCombinable && base < subtotal - tierDiscount) codeNote = 'El código no se suma a los productos que ya tienen descuento escalonado.';
      if (code.type === 'porcentaje') codeDiscount = Math.round(base * code.value / 100);
      if (code.type === 'fijo') codeDiscount = Math.min(base, code.value);
      if (code.type === 'envio') freeShipping = true;
      if (code.type !== 'envio' && codeDiscount === 0) codeNote = 'Este código no aplica a productos que ya tienen descuento.';
    }
  }
  const afterDiscounts = subtotal - tierDiscount - codeDiscount;
  const ship = shippingQuote(state, opts.department, afterDiscounts, opts.method);
  const shipping = freeShipping ? 0 : ship.price;
  const total = Math.max(0, afterDiscounts + shipping);
  const cod = codAvailability(state, opts.department, total);
  return { subtotal, tierDiscount, tierLines, tierInfo, codeDiscount, code: codeError ? null : code, codeError, codeNote, shipping, ship, total, cod, discount: tierDiscount + codeDiscount };
}

// ---------- Riesgo de un pedido contra entrega ----------
// Señales simples y explicables; cada una suma puntos. Bajo < 30 ≤ medio < 60 ≤ alto.
export function orderRisk(state, order) {
  const reasons = [];
  const add = (pts, why) => reasons.push({ pts, why });
  const c = state.customers.find(x => x.id === order.customerId);
  const others = state.orders.filter(o => o.customerId === order.customerId && o.id !== order.id);
  const paidBefore = others.filter(o => o.payment === 'pagado').length;
  if (!paidBefore) add(20, 'Cliente nuevo: sin compras pagadas antes');
  if (others.some(o => o.codStatus === 'rechazado')) add(40, 'Ya rechazó un pedido contra entrega');
  const digits = String(c?.phone || order.phone || '').replace(/\D/g, '');
  if (!/^(57)?3\d{9}$/.test(digits)) add(25, 'Celular incompleto o no colombiano');
  const addr = String(order.address || '');
  if (addr.length < 10 || !/\d/.test(addr)) add(15, 'Dirección corta o sin número');
  const avg = state.orders.length ? state.orders.reduce((s, o) => s + o.total, 0) / state.orders.length : 0;
  if (avg && order.total > avg * 2) add(15, 'Monto muy por encima del ticket promedio');
  const h = new Date(order.createdAt).getHours();
  if (h < 6) add(10, 'Pedido de madrugada');
  if (state.settings.cod?.blockedDepartments?.includes(order.department)) add(30, 'Departamento con entregas difíciles');
  const score = Math.min(100, reasons.reduce((s, r) => s + r.pts, 0));
  return { score, level: score >= 60 ? 'alto' : score >= 30 ? 'medio' : 'bajo', reasons };
}

// ---------- Ganancia real de un pedido ----------
// Ventas − costo de productos − envío que paga la tienda − pasarela − recaudo contraentrega − devoluciones esperadas.
export function orderProfit(state, order) {
  const P = state.settings.profit || {};
  const cost = order.items.reduce((s, i) => s + (state.products.find(p => p.id === i.productId)?.cost || 0) * i.qty, 0);
  const zoneShip = shippingQuote(state, order.department, 0).base ?? order.shipping;
  const shippingPaidByStore = Math.max(0, (zoneShip || 0) - (order.shipping || 0));
  const isCod = order.paymentMethod === 'contraentrega';
  const gateway = isCod ? 0 : Math.round(order.total * (P.gatewayPct || 0) / 100 + (P.gatewayFixed || 0));
  const codFee = isCod ? (state.settings.cod?.feeToStore || 0) : 0;
  const returns = isCod ? Math.round(((P.returnRatePct || 0) / 100) * ((zoneShip || 0) + (P.returnShippingCost || 0))) : 0;
  const revenue = order.total - (order.shipping || 0);
  const profit = revenue - cost - shippingPaidByStore - gateway - codFee - returns;
  return { revenue, cost, shippingPaidByStore, gateway, codFee, returns, profit, margin: revenue ? profit / revenue : 0 };
}

// ---------- Atribución (último clic en anuncio, 7 días) ----------
export const ATTRIBUTION_DAYS = 7;
export function attributedSource(order) {
  const u = order.utm;
  if (!u?.source) return null;
  const age = (new Date(order.createdAt) - new Date(u.at || order.createdAt)) / 864e5;
  return age <= ATTRIBUTION_DAYS ? u : null;
}
export const sourceLabel = s => ({ meta: 'Meta', facebook: 'Meta', instagram: 'Meta', ig: 'Meta', fb: 'Meta', google: 'Google', tiktok: 'TikTok', whatsapp: 'WhatsApp', email: 'Email' }[norm(s)] || (s ? s[0].toUpperCase() + s.slice(1) : 'Directo'));
