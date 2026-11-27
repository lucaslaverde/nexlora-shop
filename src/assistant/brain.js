// Asistente de ventas por chat (motor local, sin proveedor de IA todavía).
// Reglas tomadas de cómo trabajan Isabella (Devier) y Ana (POP KIDS):
// · Buscar SIEMPRE en el catálogo; nunca negar un producto: si no aparece, pasa a un asesor.
// · Agotado → ofrecer un sustituto de la misma colección.
// · Vender en el chat: armar el pedido aquí mismo.
// · "¿Precio?" de un anuncio sin producto → preguntar cuál vio.
// · Pago por transferencia → tarea "💳 Validar pago y crear pedido" (el pedido se crea al validarlo).
// La base de conocimiento ES el catálogo en vivo: nunca se desactualiza.
import { money } from '../store.jsx';
import { norm, priceCart, productTier, shippingQuote, codAvailability, liveTierDiscounts } from '../commerce/pricing.js';
import { DEPARTAMENTOS } from '../seed2.js';
import { createTask, moveDeal, createOrder, log, addTag } from '../crm/engine.js';

const CITY_TO_DEP = {
  medellin: 'Antioquia', envigado: 'Antioquia', itagui: 'Antioquia', bello: 'Antioquia', sabaneta: 'Antioquia', rionegro: 'Antioquia',
  bogota: 'Bogotá D.C.', soacha: 'Cundinamarca', chia: 'Cundinamarca', zipaquira: 'Cundinamarca', cali: 'Valle del Cauca', palmira: 'Valle del Cauca',
  barranquilla: 'Atlántico', cartagena: 'Bolívar', 'santa marta': 'Magdalena', bucaramanga: 'Santander', pereira: 'Risaralda', manizales: 'Caldas',
  armenia: 'Quindío', cucuta: 'Norte de Santander', ibague: 'Tolima', neiva: 'Huila', pasto: 'Nariño', villavicencio: 'Meta', monteria: 'Córdoba',
  valledupar: 'Cesar', popayan: 'Cauca', tunja: 'Boyacá', sincelejo: 'Sucre', riohacha: 'La Guajira', quibdo: 'Chocó', 'san andres': 'San Andrés y Providencia', leticia: 'Amazonas',
};
const STOP = new Set('de la el los las un una unos unas y o a en con para por que me te se mi tu su es son hay tienen tiene quiero precio cuanto cuesta vale valen del al lo le como ese esa este esta favor porfa hola buenas gracias si no ya'.split(' '));

export function findPlace(text) {
  const t = norm(text);
  for (const [city, dep] of Object.entries(CITY_TO_DEP)) if (new RegExp(`\\b${city}\\b`).test(t)) return { city: city.replace(/\b\w/g, c => c.toUpperCase()), department: dep };
  for (const d of DEPARTAMENTOS) if (t.includes(norm(d))) return { city: '', department: d };
  return null;
}

export function searchProducts(state, text) {
  const words = norm(text).split(/[^a-z0-9ñ]+/).filter(w => w.length > 2 && !STOP.has(w));
  if (!words.length) return [];
  const scored = state.products.filter(p => p.status === 'activo').map(p => {
    const col = state.collections.find(c => c.id === p.collection)?.title || '';
    const hay = norm([p.title, p.description, (p.tags || []).join(' '), col, p.sku].join(' '));
    const title = norm(p.title);
    let s = 0;
    for (const w of words) { if (title.includes(w)) s += 3; else if (hay.includes(w)) s += 1; else if (w.length > 4 && hay.includes(w.slice(0, -1))) s += 1; }
    return { p, s };
  }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length) return [];
  const top = scored[0].s;
  return scored.filter(x => x.s >= Math.max(2, top - 1)).slice(0, 3).map(x => x.p);
}

const qtyIn = text => { const m = norm(text).match(/\b(\d{1,2})\b|\b(una?|dos|tres|cuatro|cinco)\b/); if (!m) return 1; if (m[1]) return Math.max(1, +m[1]); return { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 }[m[2]] || 1; };
const phoneIn = text => { const d = String(text).replace(/[^\d]/g, ' ').split(/\s+/).find(x => /^(57)?3\d{9}$/.test(x)); return d ? d.replace(/^57/, '') : ''; };
const addressIn = text => { const m = String(text).match(/((calle|cl|carrera|cra|kr|cr|avenida|av|diagonal|dg|transversal|tv|circular)\.?\s*[\w\s#\-–]+?\d+[\w\s#\-–]*)/i); return m ? m[1].trim().replace(/[,.]$/, '') : ''; };

export function assistantMode(st) {
  const a = st.settings.assistant || {};
  if (a.mode === 'sugerido-de-dia') { const h = new Date().getHours(); return h >= a.dayStart && h < a.dayEnd ? 'sugerido' : 'automatico'; }
  return a.mode || 'automatico';
}

// Recibe el estado mutable, la conversación y el texto del cliente. Devuelve respuestas
// [{ text, products? }] y puede crear tareas, pedidos y mover pipelines.
export function think(st, cv, text) {
  const S = st.settings; const A = S.assistant || {};
  const t = norm(text);
  const ses = (cv.session ||= { cart: [], data: {}, step: 'idle' });
  const contact = st.customers.find(c => c.id === cv.contactId);
  const out = [];
  const say = (txt, extra = {}) => out.push({ text: txt, ...extra });
  const lines = () => ses.cart.map(i => ({ p: st.products.find(p => p.id === i.productId), qty: i.qty })).filter(l => l.p);
  const priceLine = p => { const tr = productTier(st, p, 1); return tr?.tier ? `${money(tr.price, S)} (antes ${money(p.price, S)})` : money(p.price, S); };

  // --- Datos del pedido en curso ---
  if (ses.step === 'datos' || ses.step === 'pago') {
    const d = ses.data;
    const ph = phoneIn(text); if (ph) d.phone = ph;
    const pl = findPlace(text); if (pl) { d.department = pl.department; if (pl.city) d.city = pl.city; }
    const ad = addressIn(text); if (ad) d.address = ad;
    if (!d.name) { const m = text.match(/(?:soy|me llamo|nombre(?: es)?:?)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i) || (!ph && !ad && !pl && text.trim().split(/\s+/).length <= 4 && /^[a-záéíóúñ\s]+$/i.test(text.trim()) && [, text.trim()]); if (m) d.name = m[1].replace(/\b\w/g, c => c.toUpperCase()); }
    if (ses.step === 'pago') {
      if (/contra|entrega|efectivo|al recibir/.test(t)) d.pay = 'contraentrega';
      else if (/transfer|bancolombia|consign|nequi|daviplata/.test(t)) d.pay = 'transferencia';
    }
    const missing = [!d.name && 'tu nombre', !d.phone && 'tu celular', !d.department && 'la ciudad', !d.address && 'la dirección (calle y número)'].filter(Boolean);
    if (missing.length) { say(`Perfecto 🙌 Solo me falta ${missing.join(', ').replace(/, ([^,]*)$/, ' y $1')}.`); ses.step = 'datos'; return out; }
    const pr = priceCart(st, lines(), { department: d.department });
    if (!d.pay) {
      ses.step = 'pago';
      say(`¡Listo, ${d.name.split(' ')[0]}! Tu pedido queda en ${money(pr.total, S)} con envío a ${d.city || d.department} (${pr.shipping ? money(pr.shipping, S) : 'gratis'}). ¿Cómo prefieres pagar? ${pr.cod.ok ? '💵 Contra entrega o 🏦 transferencia.' : `🏦 Transferencia (${pr.cod.why.toLowerCase()})`}`);
      return out;
    }
    if (d.pay === 'contraentrega' && !pr.cod.ok) { d.pay = null; say(`${pr.cod.why} ¿Te sirve por transferencia?`); ses.step = 'pago'; return out; }
    // Cerrar el pedido
    if (contact) { if (!contact.phone) contact.phone = d.phone; if (contact.name.startsWith('Visitante') || contact.name.startsWith('Usuario')) contact.name = d.name; contact.city ||= d.city; }
    const draft = { items: ses.cart.map(i => ({ ...i })), department: d.department, city: d.city, address: d.address, paymentMethod: d.pay, channel: cv.channel === 'web' ? 'Chat web' : cv.channel === 'instagram' ? 'Instagram' : 'WhatsApp', convChannel: cv.channel };
    if (d.pay === 'contraentrega') {
      const o = createOrder(st, { contactId: cv.contactId, ...draft, notes: 'Pedido armado por el asistente de chat' });
      moveDeal(st, { pipelineId: 'chat', stageId: 'esperando-pago', contactId: cv.contactId, title: `Pedido #${o.number} (contra entrega)`, value: o.total, orderId: o.id });
      say(`✅ Pedido #${o.number} creado por ${money(o.total, S)}, pago contra entrega. Antes de despachar te confirmamos por WhatsApp. ¡Gracias!`);
    } else {
      const deal = moveDeal(st, { pipelineId: 'chat', stageId: 'esperando-pago', contactId: cv.contactId, title: `Pedido por chat · ${lines().map(l => `${l.qty} × ${l.p.title}`).join(', ')}`, value: pr.total });
      createTask(st, { kind: 'validar-pago', title: '💳 Validar pago y crear pedido', contactId: cv.contactId, dealId: deal.id, draft, due: new Date(Date.now() + 4 * 36e5).toISOString() });
      say(`Te dejo los datos para la transferencia de ${money(pr.total, S)}: ${S.checkout?.bankInfo || 'Bancolombia ahorros · a nombre de ' + S.storeName}. Envía el comprobante por aquí y en cuanto un asesor lo valide creamos tu pedido ✅`);
      addTag(st, cv.contactId, 'pago-por-validar');
    }
    cv.session = { cart: [], data: {}, step: 'idle' };
    return out;
  }

  // --- Intenciones ---
  const products = searchProducts(st, text);
  const isGreeting = /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal)\b/.test(t) && t.split(' ').length <= 4 && !products.length;
  const adQuestion = /^¿?(precio|cual es el precio|info|informacion|opciones de envio|me interesa|disponible|mas informacion)\??$/.test(t.replace(/[¿?!.]/g, '').trim());
  const wantsShipping = /envi|domicilio|llega|despach|flete/.test(t);
  const wantsPromo = /promo|descuento|oferta|codigo|cupon|rebaja|black/.test(t);
  const wantsPay = /pago|pagar|contra ?entrega|transfer|nequi|tarjeta|addi|cuotas/.test(t);
  const wantsBuy = /quiero|comprar|pedir|pedido|me lo llevo|lo llevo|lo quiero|separa|encarg/.test(t);
  const wantsHuman = /asesor|humano|persona|hablar con/.test(t);

  if (wantsHuman) { cv.status = 'humano'; say(A.handoff || 'Te paso con un asesor.'); log(st, 'chat_recibido', cv.contactId, { canal: cv.channel, texto: text, pide: 'asesor' }); return out; }
  if (adQuestion && !ses.lastProductId) {
    addTag(st, cv.contactId, 'anuncio-sin-producto');
    say('¡Hola! 😊 Con gusto te paso el precio. ¿Cuál producto viste en el anuncio? Si quieres, mándame una captura o el nombre.');
    return out;
  }
  if (isGreeting && !wantsBuy) { say(A.greeting || '¡Hola! ¿En qué te ayudo?'); return out; }

  if (wantsShipping) {
    const pl = findPlace(text) || (ses.data.department && { department: ses.data.department, city: ses.data.city });
    if (!pl) { say('¿A qué ciudad o municipio te lo enviamos? Así te digo el valor exacto.'); ses.asked = 'envio'; return out; }
    ses.data.department = pl.department; if (pl.city) ses.data.city = pl.city;
    const q = shippingQuote(st, pl.department, 0);
    say(`El envío a ${pl.city || pl.department} cuesta ${money(q.base, S)} y llega en ${q.days}.${S.shipping?.freeFrom ? ` Es gratis desde ${money(S.shipping.freeFrom, S)}.` : ''}${codAvailability(st, pl.department, 0).ok ? ' Allí puedes pagar contra entrega.' : ''}`);
    if (!wantsBuy && !products.length) return out;
  }
  if (ses.asked === 'envio' && findPlace(text)) { ses.asked = null; return think(st, cv, 'envio a ' + text); }

  if (wantsPromo) {
    const tiers = liveTierDiscounts(st);
    const parts = tiers.map(d => `🔥 ${d.title}: ${d.tiers.map(x => `${x.qty}${x === d.tiers[d.tiers.length - 1] ? '+' : ''} = ${x.pct}%`).join(' · ')} (hasta el ${new Date(d.endsAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}).`);
    if (S.shipping?.freeFrom) parts.push(`🚚 Envío gratis desde ${money(S.shipping.freeFrom, S)}.`);
    if ((st.games || []).some(g => g.active)) parts.push('🎁 En la tienda web puedes ganar un código extra en el juego de bienvenida.');
    say(parts.length ? parts.join('\n') : 'Ahora mismo no tenemos promociones activas, pero te ayudo a elegir 😊');
    if (!products.length && !wantsBuy) return out;
  }
  if (wantsPay && !wantsBuy) {
    const cod = codAvailability(st, ses.data.department, 0);
    say(`Puedes pagar por transferencia${S.cod?.enabled ? `, o contra entrega${S.cod.maxTotal ? ` en pedidos hasta ${money(S.cod.maxTotal, S)}` : ''}${cod.ok ? '' : ` (${cod.why.toLowerCase()})`}` : ''}. Tarjeta y PSE muy pronto.`);
    if (!products.length) return out;
  }

  if (products.length) {
    const p = products[0];
    ses.lastProductId = p.id;
    if (wantsBuy) {
      if (p.stock <= 0) {
        const sub = st.products.find(x => x.collection === p.collection && x.id !== p.id && x.stock > 0 && x.status === 'activo');
        say(`${p.title} se nos agotó 😔${sub ? ` Te puede encantar ${sub.title} a ${priceLine(sub)}. ¿Te lo separo?` : ' Te aviso apenas vuelva.'}`, { products: sub ? [sub.id] : [] });
        if (sub) ses.lastProductId = sub.id;
        return out;
      }
      const q = qtyIn(text);
      const ex = ses.cart.find(i => i.productId === p.id);
      if (ex) ex.qty += q; else ses.cart.push({ productId: p.id, qty: q });
      const pr = priceCart(st, lines(), {});
      const tier = pr.tierInfo.find(x => x.tier);
      say(`Agregué ${q} × ${p.title} ✅ Llevas ${money(pr.subtotal - pr.discount, S)}${tier ? ` con ${tier.tier.pct}% de descuento` : ''}.${tier?.next ? ` Si llevas ${tier.missing} más, pagas ${tier.next.pct}% menos en todos.` : ''}\nPara despacharlo necesito tu nombre, celular, ciudad y dirección.`);
      ses.step = 'datos';
      if (ses.data.department || ses.data.city) { /* ya los tenía */ }
      moveDeal(st, { pipelineId: 'chat', stageId: 'nuevo', contactId: cv.contactId, title: `Interesado en ${p.title}` });
      return out;
    }
    const list = products.map(x => `• ${x.title}: ${priceLine(x)}${x.stock <= 0 ? ' — agotado' : x.stock < 10 ? ` — ¡quedan ${x.stock}!` : ''}`).join('\n');
    say(`${products.length > 1 ? 'Esto es lo que tenemos:' : 'Sí lo tenemos 😊'}\n${list}\n¿Te lo separo? Dime cuántos.`, { products: products.map(x => x.id) });
    return out;
  }
  if (wantsBuy && ses.lastProductId) return think(st, cv, `quiero ${qtyIn(text)} ${st.products.find(x => x.id === ses.lastProductId)?.title}`);

  // No entendí o no lo encuentro: nunca negar el producto, pasar a un asesor.
  if (!wantsShipping && !wantsPromo && !wantsPay) {
    cv.status = 'humano';
    addTag(st, cv.contactId, 'necesita-asesor');
    say(`No lo encuentro en el catálogo ahora mismo, pero no te quiero dar una respuesta equivocada. ${A.handoff || 'Te paso con un asesor.'}`);
  }
  return out;
}
