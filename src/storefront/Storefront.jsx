import React, { useEffect, useState } from 'react';
import { useStore, money } from '../store.jsx';
import { RenderSection, ShopCtx, ProductCard, themeVars } from '../sections/registry.jsx';
import { uid } from '../seed.js';

const CART_KEY = 'nexlora-shop-cart';
const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };

export default function Storefront({ path, preview }) {
  const { state, mutate } = useStore();
  const [cart, setCart] = useState(readCart);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState('');
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
  const subtotal = lines.reduce((s, i) => s + i.qty * i.p.price, 0);
  const shop = { add, count, open: () => setDrawer(true) };

  const parts = path.split('/').filter(Boolean);
  let body;
  if (!parts.length) body = sectionsOf(home).filter(s => !s.hidden).map(s => <RenderSection key={s.id} section={s} />);
  else if (parts[0] === 'p') {
    const page = state.pages.find(p => p.slug === parts[1]);
    body = page ? sectionsOf(page).filter(s => !s.hidden).map(s => <RenderSection key={s.id} section={s} />) : <NotFound />;
  } else {
    let inner;
    if (parts[0] === 'producto') inner = <ProductPage slug={parts[1]} add={add} />;
    else if (parts[0] === 'coleccion') inner = <CollectionPage id={parts[1]} />;
    else if (parts[0] === 'checkout') inner = <Checkout lines={lines} subtotal={subtotal} onDone={() => setCart([])} />;
    else if (parts[0] === 'gracias') inner = <Thanks number={parts[1]} />;
    else inner = <NotFound />;
    body = <>{header.map(s => <RenderSection key={s.id} section={s} />)}<div className="sf-wrap">{inner}</div>{footer.map(s => <RenderSection key={s.id} section={s} />)}</>;
  }

  if (state.settings.password && !preview && !sessionStorage.getItem('nx-pass')) {
    return <PasswordPage />;
  }

  return (
    <ShopCtx.Provider value={shop}>
      <div className="sf" style={themeVars(state.theme)}>
        {body}
        {drawer && <CartDrawer lines={lines} subtotal={subtotal} setCart={setCart} close={() => setDrawer(false)} />}
        {toast && <div className="sf-toast">{toast}</div>}
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

function ProductPage({ slug, add }) {
  const { state } = useStore();
  const p = state.products.find(x => x.slug === slug);
  const [qty, setQty] = useState(1);
  if (!p) return <NotFound />;
  const related = state.products.filter(x => x.collection === p.collection && x.id !== p.id && x.status === 'activo').slice(0, 4);
  return (
    <>
      <div className="sf-product">
        <img src={p.image} alt={p.title} />
        <div>
          <p className="sf-eyebrow">{state.collections.find(c => c.id === p.collection)?.title}</p>
          <h1 className="sf-h2">{p.title}</h1>
          <div className="sf-price" style={{ fontSize: 24, margin: '8px 0 20px' }}>{money(p.price, state.settings)} {p.compareAt > p.price && <s>{money(p.compareAt, state.settings)}</s>}</div>
          <p className="sf-lead">{p.description}</p>
          <div className="sf-row" style={{ alignItems: 'center', marginBottom: 16 }}>
            <div className="sf-qty"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div>
            <button className="sf-btn" disabled={p.stock <= 0} onClick={() => add(p, qty)}>{p.stock <= 0 ? 'Agotado' : 'Agregar al carrito'}</button>
          </div>
          <p className="sf-muted">{p.stock > 0 && p.stock < 10 ? `¡Quedan solo ${p.stock}!` : p.stock > 0 ? 'En stock · envío en 24-48 h' : ''}</p>
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

function CartDrawer({ lines, subtotal, setCart, close }) {
  const { state } = useStore();
  const setQty = (id, q) => setCart(c => q <= 0 ? c.filter(i => i.productId !== id) : c.map(i => i.productId === id ? { ...i, qty: q } : i));
  const free = state.settings.shippingRates[0]?.freeFrom;
  return (
    <>
      <div className="sf-drawer-bg" onClick={close} />
      <aside className="sf-drawer">
        <header><b>Tu carrito</b><button onClick={close}>×</button></header>
        {free && <div style={{ padding: '10px 20px', fontSize: 13, background: 'var(--sf-surface)' }}>{subtotal >= free ? '🎉 Tienes envío gratis' : `Te faltan ${money(free - subtotal, state.settings)} para envío gratis`}</div>}
        <div className="sf-drawer-items">
          {!lines.length && <p className="sf-muted" style={{ padding: '40px 0', textAlign: 'center' }}>Tu carrito está vacío.</p>}
          {lines.map(l => (
            <div key={l.productId} className="sf-line">
              <img src={l.p.image} alt="" />
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{l.p.title}</div><div className="sf-qty" style={{ marginTop: 6 }}><button onClick={() => setQty(l.productId, l.qty - 1)}>−</button><span>{l.qty}</span><button onClick={() => setQty(l.productId, l.qty + 1)}>+</button></div></div>
              <b>{money(l.p.price * l.qty, state.settings)}</b>
            </div>
          ))}
        </div>
        <footer>
          <div className="sf-sumrow"><span>Subtotal</span><b>{money(subtotal, state.settings)}</b></div>
          <a className="sf-btn" href="#/tienda/checkout" onClick={close} style={lines.length ? {} : { pointerEvents: 'none', opacity: .5 }}>Finalizar compra</a>
        </footer>
      </aside>
    </>
  );
}

function Checkout({ lines, subtotal, onDone }) {
  const { state, mutate } = useStore();
  const [f, setF] = useState({ name: '', email: '', phone: '', city: '', address: '', rate: state.settings.shippingRates[0]?.id, code: '', pay: 'contraentrega' });
  const [applied, setApplied] = useState(null);
  const [err, setErr] = useState('');
  const rate = state.settings.shippingRates.find(r => r.id === f.rate);
  let shipping = rate ? (rate.freeFrom && subtotal >= rate.freeFrom ? 0 : rate.price) : 0;
  let discount = 0;
  if (applied) {
    if (applied.type === 'porcentaje') discount = Math.round(subtotal * applied.value / 100);
    if (applied.type === 'fijo') discount = Math.min(subtotal, applied.value);
    if (applied.type === 'envio') shipping = 0;
  }
  const total = subtotal - discount + shipping;
  const apply = () => {
    const d = state.discounts.find(x => x.code.toUpperCase() === f.code.trim().toUpperCase() && x.active);
    if (!d) return setErr('Código no válido');
    if (subtotal < (d.minSubtotal || 0)) return setErr(`Mínimo de compra ${money(d.minSubtotal, state.settings)}`);
    if (d.limit && d.uses >= d.limit) return setErr('Este código ya se agotó');
    setErr(''); setApplied(d);
  };
  const submit = e => {
    e.preventDefault();
    if (!lines.length) return;
    const number = 1000 + state.orders.length + 1 + Math.floor(Math.random() * 5);
    mutate(st => {
      let c = st.customers.find(x => x.email.toLowerCase() === f.email.toLowerCase());
      if (!c) { c = { id: uid('c'), name: f.name, email: f.email, phone: f.phone, city: f.city, tags: [], marketing: false }; st.customers.push(c); }
      st.orders.push({ id: uid('o'), number, customerId: c.id, items: lines.map(l => ({ productId: l.p.id, title: l.p.title, price: l.p.price, qty: l.qty, image: l.p.image })), subtotal, shipping, discount, total, payment: 'pendiente', fulfillment: 'sin preparar', channel: 'Tienda online', createdAt: new Date().toISOString(), notes: `Pago: ${f.pay}. Dirección: ${f.address}, ${f.city}`, code: applied?.code || '' });
      lines.forEach(l => { const p = st.products.find(x => x.id === l.p.id); if (p) p.stock = Math.max(0, p.stock - l.qty); });
      if (applied) { const d = st.discounts.find(x => x.id === applied.id); if (d) d.uses++; }
    });
    onDone();
    location.hash = '#/tienda/gracias/' + number;
  };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  if (!lines.length) return <div style={{ padding: '100px 0' }} className="center"><h1 className="sf-h2">Tu carrito está vacío</h1><a href="#/tienda" className="sf-btn">Seguir comprando</a></div>;
  return (
    <form className="sf-checkout" onSubmit={submit}>
      <div className="sf-form">
        <h1 className="sf-h2">Finalizar compra</h1>
        <h3>Contacto</h3>
        <input required placeholder="Nombre completo" value={f.name} onChange={set('name')} />
        <input required type="email" placeholder="Correo" value={f.email} onChange={set('email')} />
        <input placeholder="Teléfono / WhatsApp" value={f.phone} onChange={set('phone')} />
        <h3>Entrega</h3>
        <input required placeholder="Dirección" value={f.address} onChange={set('address')} />
        <input required placeholder="Ciudad" value={f.city} onChange={set('city')} />
        <select value={f.rate} onChange={set('rate')}>{state.settings.shippingRates.map(r => <option key={r.id} value={r.id}>{r.name} — {r.price ? money(r.price, state.settings) : 'Gratis'}</option>)}</select>
        <h3>Pago</h3>
        <select value={f.pay} onChange={set('pay')}>
          <option value="contraentrega">Pago contra entrega</option>
          <option value="transferencia">Transferencia bancaria</option>
          <option value="tarjeta" disabled>Tarjeta (se activa al conectar una pasarela en Apps)</option>
        </select>
        <button className="sf-btn">Confirmar pedido · {money(total, state.settings)}</button>
      </div>
      <div className="sf-box">
        {lines.map(l => <div key={l.productId} className="sf-line"><img src={l.p.image} alt="" /><div style={{ fontSize: 14 }}>{l.p.title} × {l.qty}</div><b>{money(l.p.price * l.qty, state.settings)}</b></div>)}
        <div className="sf-row" style={{ margin: '16px 0 4px', flexWrap: 'nowrap' }}><input className="sf-news-in" style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #ccc', minWidth: 0 }} placeholder="Código de descuento" value={f.code} onChange={set('code')} /><button type="button" className="sf-btn ghost" style={{ padding: '8px 14px' }} onClick={apply}>Aplicar</button></div>
        {err && <p style={{ color: '#c0392b', fontSize: 13 }}>{err}</p>}
        {applied && <p className="sf-ok" style={{ fontSize: 13 }}>Código {applied.code} aplicado</p>}
        <div className="sf-sumrow"><span>Subtotal</span><span>{money(subtotal, state.settings)}</span></div>
        {discount > 0 && <div className="sf-sumrow"><span>Descuento</span><span>−{money(discount, state.settings)}</span></div>}
        <div className="sf-sumrow"><span>Envío</span><span>{shipping ? money(shipping, state.settings) : 'Gratis'}</span></div>
        <div className="sf-sumrow" style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}><span>Total</span><span>{money(total, state.settings)}</span></div>
        {state.settings.taxIncluded && <p className="sf-muted" style={{ fontSize: 12 }}>Incluye IVA ({state.settings.taxRate}%)</p>}
      </div>
    </form>
  );
}

function Thanks({ number }) {
  return <div className="center" style={{ padding: '100px 0' }}><div style={{ fontSize: 56 }}>✓</div><h1 className="sf-h2">¡Gracias por tu compra!</h1><p className="sf-muted">Tu pedido #{number} fue recibido. Ya aparece en el panel, en Pedidos.</p><a className="sf-btn" href="#/tienda">Seguir comprando</a></div>;
}
