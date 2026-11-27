import React, { useEffect, useRef, useState } from 'react';
import { useStore, money } from '../store.jsx';
import { RenderSection, ShopCtx, ProductCard, themeVars } from '../sections/registry.jsx';
import { priceCart, productTier, shippingQuote } from '../commerce/pricing.js';
import { ensureContact, createOrder, log } from '../crm/engine.js';
import { DEPARTAMENTOS } from '../seed2.js';
import GameHost from '../games/GameHost.jsx';
import ChatWidget from '../assistant/ChatWidget.jsx';

const CART_KEY = 'nexlora-shop-cart';
const UTM_KEY = 'nx-utm';
const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };

// Guarda las UTM del último clic en anuncio (?utm_source=meta…). Se atribuye si compra en 7 días.
function captureUtm() {
  try {
    const q = new URLSearchParams(location.search + '&' + (location.hash.split('?')[1] || ''));
    if (!q.get('utm_source')) return;
    localStorage.setItem(UTM_KEY, JSON.stringify({ source: q.get('utm_source'), medium: q.get('utm_medium') || '', campaign: q.get('utm_campaign') || '', content: q.get('utm_content') || '', at: new Date().toISOString() }));
  } catch { /* sin almacenamiento */ }
}
export function readUtm() {
  try { const u = JSON.parse(localStorage.getItem(UTM_KEY)); if (u && Date.now() - new Date(u.at).getTime() <= 7 * 864e5) return u; } catch { /* */ }
  return null;
}

export default function Storefront({ path, preview }) {
  const { state } = useStore();
  const [cart, setCart] = useState(readCart);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => { captureUtm(); }, []);
  useEffect(() => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* */ } }, [cart]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  const sectionsOf = page => (preview ? page.sections : page.published?.sections) || [];
  const home = state.pages.find(p => p.kind === 'inicio');
  const chrome = sectionsOf(home);
  const header = chrome.filter(s => ['announcement', 'header'].includes(s.type) && !s.hidden);
  const footer = chrome.filter(s => s.type === 'footer' && !s.hidden);

  const add = (p, qty = 1) => {
    setCart(c => { const ex = c.find(i => i.productId === p.id); return ex ? c.map(i => i.productId === p.id ? { ...i, qty: i.qty + qty } : i) : [...c, { productId: p.id, qty }]; });
    setToast(`Agregado: ${p.title}`);
    setDrawer(true);
  };
  const lines = cart.map(i => ({ ...i, p: state.products.find(p => p.id === i.productId) })).filter(i => i.p);
  const count = lines.reduce((s, i) => s + i.qty, 0);
  const qtyOf = id => lines.filter(l => l.p.collection === state.products.find(p => p.id === id)?.collection).reduce((s, l) => s + l.qty, 0);
  const shop = { add, count, open: () => setDrawer(true), qtyOf, lines, clear: () => setCart([]) };

  const parts = path.split('/').filter(Boolean);
  let body;
  if (!parts.length) body = sectionsOf(home).filter(s => !s.hidden).map(s => <LiveSection key={s.id} section={s} />);
  else if (parts[0] === 'p') {
    const page = state.pages.find(p => p.slug === parts[1]);
    body = page ? sectionsOf(page).filter(s => !s.hidden).map(s => <LiveSection key={s.id} section={s} />) : <NotFound />;
  } else {
    let inner;
    if (parts[0] === 'producto') inner = <ProductPage key={parts[1]} slug={parts[1]} add={add} />;
    else if (parts[0] === 'coleccion') inner = <CollectionPage id={parts[1]} />;
    else if (parts[0] === 'checkout') inner = <Checkout lines={lines} onDone={() => setCart([])} />;
    else if (parts[0] === 'gracias') inner = <Thanks number={parts[1]} />;
    else inner = <NotFound />;
    body = <>{header.map(s => <RenderSection key={s.id} section={s} />)}<div className="sf-wrap">{inner}</div>{footer.map(s => <RenderSection key={s.id} section={s} />)}</>;
  }

  if (state.settings.password && !preview && !sessionStorage.getItem('nx-pass')) return <PasswordPage />;
  const inCheckout = parts[0] === 'checkout';

  return (
    <ShopCtx.Provider value={shop}>
      <div className="sf" style={themeVars(state.theme)}>
        {body}
        {drawer && <CartDrawer lines={lines} setCart={setCart} close={() => setDrawer(false)} />}
        {toast && <div className="sf-toast">{toast}</div>}
        {!preview && !inCheckout && <GameHost path={path} />}
        {!preview && state.settings.assistant?.enabled && <ChatWidget />}
        <div className="sf-preview-bar">{preview ? 'Vista previa del borrador' : 'Tienda en vivo'} <a href="#/">Volver al panel</a></div>
      </div>
    </ShopCtx.Provider>
  );
}

function NotFound() { return <div className="sf-wrap center" style={{ padding: '120px 0' }}><h1 className="sf-h2">Página no encontrada</h1><a className="sf-btn" href="#/tienda">Ir al inicio</a></div>; }

function PasswordPage() {
  const [v, setV] = useState('');
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Inter' }}><form onSubmit={e => { e.preventDefault(); sessionStorage.setItem('nx-pass', '1'); location.reload(); }} style={{ textAlign: 'center' }}><h2>Muy pronto abrimos</h2><p>Esta tienda está protegida con contraseña.</p><input value={v} onChange={e => setV(e.target.value)} placeholder="Contraseña" style={{ padding: 10 }} /> <button>Entrar</button></form></div>;
}

// Tabla de escalones (1 / 2 / 3+) como en una preventa: se marca el escalón que ya alcanzó el carrito.
function TierTable({ d, units }) {
  return (
    <div className="sf-tiers">
      {d.tiers.map((t, i) => {
        const on = units >= t.qty && (!d.tiers[i + 1] || units < d.tiers[i + 1].qty);
        return <div key={t.qty} className={'sf-tier' + (on ? ' on' : '')}><b>{t.pct}%</b><span>{i === d.tiers.length - 1 ? `${t.qty} o más` : `${t.qty} ${t.qty === 1 ? 'unidad' : 'unidades'}`}</span></div>;
      })}
    </div>
  );
}

function ProductPage({ slug, add }) {
  const { state } = useStore();
  const shop = React.useContext(ShopCtx);
  const p = state.products.find(x => x.slug === slug);
  const [qty, setQty] = useState(1);
  if (!p) return <NotFound />;
  const inCart = shop.qtyOf(p.id);
  const tier = productTier(state, p, inCart + qty);
  const related = state.products.filter(x => x.collection === p.collection && x.id !== p.id && x.status === 'activo').slice(0, 4);
  const sub = state.products.find(x => x.collection === p.collection && x.id !== p.id && x.status === 'activo' && x.stock > 0);
  return (
    <>
      <div className="sf-product">
        <img src={p.image} alt={p.title} />
        <div>
          <p className="sf-eyebrow">{state.collections.find(c => c.id === p.collection)?.title}</p>
          <h1 className="sf-h2">{p.title}</h1>
          <div className="sf-price" style={{ fontSize: 24, margin: '8px 0 12px' }}>
            {tier?.tier ? <>{money(tier.price, state.settings)} <s>{money(p.price, state.settings)}</s></> : <>{money(p.price, state.settings)} {p.compareAt > p.price && <s>{money(p.compareAt, state.settings)}</s>}</>}
          </div>
          {tier && <>
            <p className="sf-muted" style={{ marginBottom: 8 }}>{tier.discount.title}: entre más llevas, más ahorras (se suman todos los productos de la promo).</p>
            <TierTable d={tier.discount} units={inCart + qty} />
            {tier.next && <p className="sf-tier-next">Lleva {tier.next.qty - (inCart + qty)} más y pagas {tier.next.pct}% menos en todos.</p>}
          </>}
          <p className="sf-lead" style={{ marginTop: 16 }}>{p.description}</p>
          <div className="sf-row" style={{ alignItems: 'center', marginBottom: 16 }}>
            <div className="sf-qty"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div>
            <button className="sf-btn" disabled={p.stock <= 0} onClick={() => add(p, qty)}>{p.stock <= 0 ? 'Agotado' : 'Agregar al carrito'}</button>
          </div>
          {p.stock > 0 && p.stock < 10 && <div className="sf-stockbar"><span>¡Quedan solo {p.stock}!</span><i style={{ width: `${Math.max(8, p.stock * 10)}%` }} /></div>}
          {p.stock > 9 && <p className="sf-muted">En stock · envío en 24-48 h</p>}
          {p.stock <= 0 && sub && <p className="sf-muted">Este se agotó. Te puede gustar <a className="sf-link" href={'#/tienda/producto/' + sub.slug}>{sub.title}</a>.</p>}
        </div>
      </div>
      {!!related.length && <><h2 className="sf-h2">También te puede gustar</h2><div className="sf-grid" style={{ '--cols': 4, paddingBottom: 80 }}>{related.map(r => <ProductCard key={r.id} p={r} />)}</div></>}
    </>
  );
}

function CollectionPage({ id }) {
  const { state } = useStore();
  const c = state.collections.find(x => x.id === id);
  const [sort, setSort] = useState('destacados');
  let list = state.products.filter(p => p.status === 'activo' && (!c || p.collection === id));
  if (sort === 'precio-asc') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'precio-desc') list = [...list].sort((a, b) => b.price - a.price);
  return (
    <div style={{ padding: '48px 0 80px' }}>
      <div className="sf-row" style={{ justifyContent: 'space-between', alignItems: 'end', marginBottom: 28 }}>
        <div><h1 className="sf-h2">{c?.title || 'Todos los productos'}</h1><p className="sf-muted">{c?.description}</p></div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="sf-cart-btn"><option value="destacados">Destacados</option><option value="precio-asc">Precio: menor a mayor</option><option value="precio-desc">Precio: mayor a menor</option></select>
      </div>
      <div className="sf-grid" style={{ '--cols': 4 }}>{list.map(p => <ProductCard key={p.id} p={p} />)}</div>
    </div>
  );
}

function CartDrawer({ lines, setCart, close }) {
  const { state } = useStore();
  const S = state.settings;
  const setQty = (id, q) => setCart(c => q <= 0 ? c.filter(i => i.productId !== id) : c.map(i => i.productId === id ? { ...i, qty: q } : i));
  const pr = priceCart(state, lines, {});
  const after = pr.subtotal - pr.discount;
  const free = S.shipping?.freeFrom;
  return (
    <>
      <div className="sf-drawer-bg" onClick={close} />
      <aside className="sf-drawer">
        <header><b>Tu carrito</b><button onClick={close} aria-label="Cerrar">×</button></header>
        {pr.tierInfo.map(t => (
          <div key={t.discount.id} className="sf-cart-tier">
            <div>{t.tier ? <>🎉 <b>{t.tier.pct}% de descuento</b> en {t.units} {t.units === 1 ? 'producto' : 'productos'} de la promo.</> : null} {t.next ? <>Agrega <b>{t.missing}</b> más y sube a <b>{t.next.pct}%</b>.</> : <b>¡Tienes el máximo descuento!</b>}</div>
            <div className="sf-progress"><i style={{ width: `${Math.min(100, (t.units / t.discount.tiers[t.discount.tiers.length - 1].qty) * 100)}%` }} /></div>
          </div>
        ))}
        {free && lines.length > 0 && <div className="sf-cart-ship">{after >= free ? '🚚 Tienes envío gratis' : `Te faltan ${money(free - after, S)} para envío gratis`}<div className="sf-progress"><i style={{ width: `${Math.min(100, (after / free) * 100)}%` }} /></div></div>}
        <div className="sf-drawer-items">
          {!lines.length && <p className="sf-muted" style={{ padding: '40px 0', textAlign: 'center' }}>Tu carrito está vacío.</p>}
          {lines.map(l => {
            const off = pr.tierLines[l.p.id] || 0;
            return (
              <div key={l.productId} className="sf-line">
                <img src={l.p.image} alt="" />
                <div><div style={{ fontWeight: 600, fontSize: 14 }}>{l.p.title}</div><div className="sf-qty" style={{ marginTop: 6 }}><button onClick={() => setQty(l.productId, l.qty - 1)} aria-label="Quitar uno">−</button><span>{l.qty}</span><button onClick={() => setQty(l.productId, l.qty + 1)} aria-label="Agregar uno">+</button></div></div>
                <div className="r"><b>{money(l.p.price * l.qty - off, S)}</b>{off > 0 && <div><s className="sf-muted" style={{ fontSize: 12 }}>{money(l.p.price * l.qty, S)}</s></div>}</div>
              </div>
            );
          })}
        </div>
        <footer>
          {pr.discount > 0 && <div className="sf-sumrow"><span>Ahorras</span><b style={{ color: 'var(--sf-primary)' }}>−{money(pr.discount, S)}</b></div>}
          <div className="sf-sumrow"><span>Subtotal</span><b>{money(after, S)}</b></div>
          <a className="sf-btn" href="#/tienda/checkout" onClick={close} style={lines.length ? {} : { pointerEvents: 'none', opacity: .5 }}>Finalizar compra</a>
        </footer>
      </aside>
    </>
  );
}

const PAY_LABEL = { contraentrega: 'Pago contra entrega', transferencia: 'Transferencia bancaria', whatsapp: 'Acordar por WhatsApp' };

function Checkout({ lines, onDone }) {
  const { state, mutate } = useStore();
  const S = state.settings;
  const ck = S.checkout || {};
  // Si ganó un código en un juego, ya viene puesto.
  const won = (() => { try { return sessionStorage.getItem('nx-code') || ''; } catch { return ''; } })();
  const [f, setF] = useState({ name: '', email: '', phone: '', department: 'Antioquia', city: '', address: '', method: 'envio', code: won, pay: 'contraentrega', notes: '' });
  const [code, setCode] = useState(won);
  const started = useRef(false);
  const pr = priceCart(state, lines, { code, department: f.department, method: f.method });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const payOptions = [{ id: 'contraentrega', ok: pr.cod.ok, why: pr.cod.why }, { id: 'transferencia', ok: true }];
  const pay = payOptions.find(o => o.id === f.pay)?.ok ? f.pay : 'transferencia';

  // Cuando ya dejó correo Y celular (o solo correo si el celular es opcional), el CRM lo conoce:
  // si no termina, entra al flujo de carrito abandonado. Se espera a tener ambos datos para no
  // crear dos contactos de la misma persona (uno con correo y otro con celular).
  const emailOk = /^\S+@\S+\.\S+$/.test(f.email);
  const phoneOk = f.phone.replace(/\D/g, '').length >= 10;
  const ready = emailOk && (phoneOk || !ck.requirePhone);
  useEffect(() => {
    if (started.current || !ready) return;
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      mutate(st => {
        const c = ensureContact(st, { name: f.name, email: f.email, phone: f.phone, city: f.city, source: 'Checkout', lead: false });
        log(st, 'checkout_iniciado', c.id, { productos: lines.map(l => l.p.title).join(', '), total: pr.total });
        log(st, 'carrito_abandonado', c.id, { producto: lines[0]?.p.title, enlace: location.href.split('#')[0] + '#/tienda/checkout' });
      });
    }, 1200);
    return () => clearTimeout(t);
  }, [ready, f.email, f.phone]);
  const captureContact = () => {};

  const submit = e => {
    e.preventDefault();
    if (!lines.length) return;
    const viaWa = e.nativeEvent?.submitter?.dataset?.wa === '1';
    const number = Math.max(1000, ...state.orders.map(o => o.number)) + 1; // createOrder usa la misma regla
    const utm = readUtm();
    if (viaWa) {
      // Se abre dentro del clic (si no, el navegador bloquea la ventana).
      const msg = [`Hola ${S.storeName}, quiero hacer el pedido #${number}:`, ...lines.map(l => `• ${l.qty} × ${l.p.title}`), pr.discount ? `Descuento: −${money(pr.discount, S)}` : '',
        `Envío: ${pr.shipping ? money(pr.shipping, S) : 'gratis'}`, `Total: ${money(pr.total, S)}`, `A nombre de ${f.name}, ${f.address}, ${f.city} (${f.department}).`, f.notes ? `Nota: ${f.notes}` : ''].filter(Boolean).join('\n');
      window.open(`https://wa.me/${(ck.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    }
    mutate(st => {
      const c = ensureContact(st, { name: f.name, email: f.email, phone: f.phone, city: f.city, source: utm ? `Anuncio ${utm.source}` : 'Tienda online', lead: false });
      createOrder(st, {
        contactId: c.id, items: lines.map(l => ({ productId: l.p.id, qty: l.qty })), department: f.department, city: f.city, address: f.address,
        paymentMethod: viaWa ? 'whatsapp' : pay, channel: viaWa ? 'WhatsApp' : 'Tienda online', code: pr.code?.code, notes: f.notes, utm,
      });
    });
    onDone();
    location.hash = '#/tienda/gracias/' + number;
  };

  if (!lines.length) return <div style={{ padding: '100px 0' }} className="center"><h1 className="sf-h2">Tu carrito está vacío</h1><a href="#/tienda" className="sf-btn">Seguir comprando</a></div>;
  return (
    <form className="sf-checkout" onSubmit={submit}>
      <div className="sf-form">
        <h1 className="sf-h2">Finalizar compra</h1>
        <h3>Contacto</h3>
        <input required placeholder="Nombre completo" value={f.name} onChange={set('name')} autoComplete="name" />
        <input required type="email" placeholder="Correo" value={f.email} onChange={set('email')} onBlur={captureContact} autoComplete="email" />
        <input required={!!ck.requirePhone} type="tel" placeholder={'Celular / WhatsApp' + (ck.requirePhone ? '' : ' (opcional)')} value={f.phone} onChange={set('phone')} onBlur={captureContact} autoComplete="tel" />
        <h3>Entrega</h3>
        <div className="sf-seg">
          <label className={f.method === 'envio' ? 'on' : ''}><input type="radio" name="m" checked={f.method === 'envio'} onChange={() => setF({ ...f, method: 'envio' })} />Envío a domicilio</label>
          {S.shipping?.pickup?.enabled && <label className={f.method === 'recoger' ? 'on' : ''}><input type="radio" name="m" checked={f.method === 'recoger'} onChange={() => setF({ ...f, method: 'recoger' })} />{S.shipping.pickup.name}</label>}
        </div>
        <select aria-label="Departamento" value={f.department} onChange={set('department')}>{DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}</select>
        <input required placeholder="Ciudad o municipio" value={f.city} onChange={set('city')} autoComplete="address-level2" />
        <input required={f.method === 'envio'} placeholder="Dirección (calle, número, barrio, apto)" value={f.address} onChange={set('address')} autoComplete="street-address" />
        <p className="sf-muted sf-small">{pr.ship.label} · {pr.ship.days}{pr.ship.free ? ' · envío gratis' : ''}</p>
        <h3>Pago</h3>
        {payOptions.map(o => (
          <label key={o.id} className={'sf-pay' + (pay === o.id ? ' on' : '') + (o.ok ? '' : ' off')}>
            <input type="radio" name="pay" disabled={!o.ok} checked={pay === o.id} onChange={() => setF({ ...f, pay: o.id })} />
            <span><b>{PAY_LABEL[o.id]}</b>{o.id === 'contraentrega' && (o.ok ? <small>Pagas al recibir. Te escribimos por WhatsApp para confirmar antes de despachar.</small> : <small>{o.why}</small>)}{o.id === 'transferencia' && <small>Te enviamos los datos y confirmamos el pago.</small>}</span>
          </label>
        ))}
        <label className="sf-pay off"><input type="radio" disabled /><span><b>Tarjeta, PSE, Nequi</b><small>Se activa al conectar una pasarela en Apps.</small></span></label>
        {ck.orderNotes && <textarea placeholder="Notas para el pedido (opcional)" value={f.notes} onChange={set('notes')} rows={2} className="sf-textarea" />}
        <button className="sf-btn">Confirmar pedido · {money(pr.total, S)}</button>
        {ck.whatsappOrder && ck.whatsapp && <button type="submit" data-wa="1" className="sf-btn sf-wa">Pedir por WhatsApp</button>}
        {ck.trustText && <p className="sf-trust">{ck.trustText}</p>}
      </div>
      <div className="sf-box">
        {lines.map(l => <div key={l.productId} className="sf-line"><img src={l.p.image} alt="" /><div style={{ fontSize: 14 }}>{l.p.title} × {l.qty}</div><b>{money(l.p.price * l.qty - (pr.tierLines[l.p.id] || 0), S)}</b></div>)}
        <div className="sf-row" style={{ margin: '16px 0 4px', flexWrap: 'nowrap' }}><input className="sf-input" placeholder="Código de descuento" value={f.code} onChange={set('code')} /><button type="button" className="sf-btn ghost" style={{ padding: '8px 14px' }} onClick={() => setCode(f.code.trim())}>Aplicar</button></div>
        {code && pr.codeError && <p className="sf-err">{pr.codeError}</p>}
        {code && pr.code && <p className="sf-ok" style={{ fontSize: 13 }}>Código {pr.code.code} aplicado</p>}
        {code && pr.codeNote && <p className="sf-muted sf-small">{pr.codeNote}</p>}
        <div className="sf-sumrow"><span>Subtotal</span><span>{money(pr.subtotal, S)}</span></div>
        {pr.tierDiscount > 0 && <div className="sf-sumrow"><span>{pr.tierInfo.find(t => t.tier)?.discount.title} ({pr.tierInfo.find(t => t.tier)?.tier.pct}%)</span><span>−{money(pr.tierDiscount, S)}</span></div>}
        {pr.codeDiscount > 0 && <div className="sf-sumrow"><span>Código {pr.code.code}</span><span>−{money(pr.codeDiscount, S)}</span></div>}
        <div className="sf-sumrow"><span>Envío</span><span>{pr.shipping ? money(pr.shipping, S) : 'Gratis'}</span></div>
        <div className="sf-sumrow" style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}><span>Total</span><span>{money(pr.total, S)}</span></div>
        {S.taxIncluded && <p className="sf-muted" style={{ fontSize: 12 }}>Incluye IVA ({S.taxRate}%)</p>}
      </div>
    </form>
  );
}

function Thanks({ number }) {
  const { state } = useStore();
  const o = state.orders.find(x => String(x.number) === String(number));
  const extra = state.settings.checkout?.thanksText;
  return (
    <div className="center" style={{ padding: '100px 0' }}>
      <div style={{ fontSize: 56 }}>✓</div>
      <h1 className="sf-h2">¡Gracias por tu compra!</h1>
      <p className="sf-muted">Tu pedido #{number} fue recibido. Ya aparece en el panel, en Pedidos.{extra ? ' ' + extra : ''}</p>
      {o?.paymentMethod === 'contraentrega' && <p className="sf-muted">Pagas al recibir. Te escribiremos por WhatsApp para confirmar antes de despachar.</p>}
      {o?.paymentMethod === 'transferencia' && <p className="sf-muted">Te enviamos los datos de la transferencia por WhatsApp y correo.</p>}
      <a className="sf-btn" href="#/tienda">Seguir comprando</a>
    </div>
  );
}

// Sección en vivo: si tiene prueba A/B, cada visitante ve siempre la misma variante
// y se cuentan vistas y clics de cada una.
const abBucket = id => {
  try {
    const k = 'nx-ab-' + id;
    let v = localStorage.getItem(k);
    if (v !== 'a' && v !== 'b') { v = Math.random() < 0.5 ? 'a' : 'b'; localStorage.setItem(k, v); }
    return v;
  } catch { return 'a'; }
};
function LiveSection({ section }) {
  const { mutate } = useStore();
  const testing = !!section.ab?.enabled;
  const [variant] = useState(() => (testing ? abBucket(section.id) : 'a'));
  const count = kind => mutate(st => {
    const x = (st.abStats ||= {})[section.id] ||= { a: { v: 0, c: 0 }, b: { v: 0, c: 0 } };
    x[variant][kind]++;
  });
  useEffect(() => {
    if (!testing) return;
    try { const k = 'nx-ab-seen-' + section.id; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { /* */ }
    count('v');
  }, [testing, section.id]);
  if (!testing) return <RenderSection section={section} />;
  return <div style={{ display: 'contents' }} onClickCapture={e => { if (e.target.closest('a,button')) count('c'); }}><RenderSection section={section} variant={variant} /></div>;
}
