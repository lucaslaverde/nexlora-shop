import React, { useState } from 'react';
import { ShoppingCart, FilePlus, Printer, MessageCircle, ShieldAlert, Check, X } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { orderRisk, orderProfit, attributedSource, sourceLabel } from '../commerce/pricing.js';
import { onOrderPaid, log, render } from '../crm/engine.js';
import { Card, Badge, PageHead, Tabs, Btn, Soon, Empty, statusTone } from '../ui.jsx';

export default function Orders({ id }) {
  if (id) return <OrderDetail id={id} />;
  return <OrderList />;
}

const riskTone = l => ({ bajo: 'green', medio: 'yellow', alto: 'red' }[l]);
export const PAY_NAMES = { contraentrega: 'Contra entrega', transferencia: 'Transferencia', whatsapp: 'Acordar por WhatsApp', tarjeta: 'Tarjeta' };

function waLink(state, o) {
  const c = state.customers.find(x => x.id === o.customerId);
  const S = state.settings;
  const text = render(S.cod?.confirmTemplate || 'Hola {{nombre}}, confirma tu pedido #{{pedido}}.', { nombre: (c?.name || '').split(' ')[0], tienda: S.storeName, pedido: o.number, total: money(o.total, S), ciudad: o.city || c?.city || '' });
  const phone = String(c?.phone || '').replace(/\D/g, '');
  return `https://wa.me/${phone.length === 10 ? '57' + phone : phone}?text=${encodeURIComponent(text)}`;
}

function OrderList() {
  const { state } = useStore();
  const q0 = new URLSearchParams(location.hash.split('?')[1] || '').get('f') || 'todos';
  const [tab, setTab] = useState(q0);
  const [q, setQ] = useState('');
  const [view, setView] = useState('pedidos');
  const filters = {
    todos: () => true,
    'por-confirmar': o => o.codStatus === 'por-confirmar',
    'sin-preparar': o => o.fulfillment === 'sin preparar' && o.codStatus !== 'por-confirmar' && o.codStatus !== 'rechazado',
    'sin-pagar': o => o.payment === 'pendiente' && o.paymentMethod !== 'contraentrega',
    preparados: o => o.fulfillment === 'preparado',
    enviados: o => o.fulfillment === 'enviado',
  };
  const cust = id => state.customers.find(c => c.id === id);
  const list = [...state.orders].filter(filters[tab] || filters.todos)
    .filter(o => !q || String(o.number).includes(q) || cust(o.customerId)?.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const porConfirmar = state.orders.filter(filters['por-confirmar']).length;

  return (
    <div className="page">
      <PageHead title="Pedidos" actions={<Btn icon={FilePlus} onClick={() => setView('borradores')}>Crear pedido</Btn>} />
      <Tabs value={view} onChange={setView} tabs={[{ id: 'pedidos', label: 'Pedidos', count: state.orders.length }, { id: 'borradores', label: 'Borradores' }, { id: 'abandonados', label: 'Checkouts sin terminar', count: (state.events || []).filter(e => e.type === 'checkout_iniciado').length }]} />
      {view === 'pedidos' && (
        <Card pad={false}>
          <div className="toolbar">
            <Tabs value={tab} onChange={setTab} tabs={[{ id: 'todos', label: 'Todos' }, { id: 'por-confirmar', label: 'Por confirmar (contra entrega)', count: porConfirmar }, { id: 'sin-preparar', label: 'Por preparar' }, { id: 'sin-pagar', label: 'Sin pagar' }, { id: 'preparados', label: 'Preparados' }, { id: 'enviados', label: 'Enviados' }]} />
            <input className="input" placeholder="Buscar por número o cliente" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {tab === 'por-confirmar' && <div className="card-b tip-row"><ShieldAlert size={16} /> Confirma por WhatsApp antes de despachar: es lo que más baja las devoluciones de contra entrega. Empieza por los de riesgo alto.</div>}
          {list.length ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Pago</th><th>Estado</th><th className="r">Total</th></tr></thead>
              <tbody>{list.map(o => {
                const r = o.paymentMethod === 'contraentrega' && o.codStatus === 'por-confirmar' ? orderRisk(state, o) : null;
                return (
                  <tr key={o.id} onClick={() => (location.hash = '#/pedidos/' + o.id)}>
                    <td><b>#{o.number}</b></td><td className="muted">{fmtDate(o.createdAt)}</td><td>{cust(o.customerId)?.name}</td>
                    <td className="muted">{o.channel}{attributedSource(o) && <div className="sm">vía {sourceLabel(o.utm.source)}</div>}</td>
                    <td>{o.paymentMethod === 'contraentrega' ? <Badge tone={o.codStatus === 'confirmado' ? 'green' : o.codStatus === 'rechazado' ? 'gray' : 'yellow'}>{o.codStatus === 'confirmado' ? 'contra entrega ✓' : o.codStatus === 'rechazado' ? 'rechazado' : 'por confirmar'}</Badge> : <Badge tone={statusTone(o.payment)}>{o.payment}</Badge>}</td>
                    <td>{r ? <Badge tone={riskTone(r.level)}>riesgo {r.level}</Badge> : <Badge tone={statusTone(o.fulfillment)}>{o.fulfillment}</Badge>}</td>
                    <td className="r">{money(o.total, state.settings)}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          ) : <Empty title="No hay pedidos aquí" text="Cuando entren pedidos con este estado aparecerán en esta lista." />}
        </Card>
      )}
      {view === 'borradores' && <Card><Soon icon={FilePlus} title="Pedidos manuales" text="Mientras tanto: los pedidos por chat se crean desde Conversaciones y la tarea «Validar pago»." /></Card>}
      {view === 'abandonados' && <Abandoned />}
    </div>
  );
}

function Abandoned() {
  const { state } = useStore();
  const evs = (state.events || []).filter(e => e.type === 'checkout_iniciado');
  if (!evs.length) return <Card><Empty icon={ShoppingCart} title="Sin checkouts abandonados" text="Cuando alguien deja su correo o celular en el checkout y no compra, aparece aquí y entra al flujo «Carrito abandonado»." /></Card>;
  return (
    <Card pad={false}><table className="table"><thead><tr><th>Cuándo</th><th>Contacto</th><th>Productos</th><th>Compró después</th></tr></thead>
      <tbody>{evs.map(e => { const c = state.customers.find(x => x.id === e.contactId); const bought = state.orders.some(o => o.customerId === e.contactId && o.createdAt > e.at); return (
        <tr key={e.id} onClick={() => (location.hash = '#/clientes/' + e.contactId)}><td className="muted">{fmtDate(e.at)}</td><td>{c?.name}<div className="muted sm">{c?.phone || c?.email}</div></td><td>{e.data.productos}</td><td>{bought ? <Badge tone="green">sí</Badge> : <Badge tone="yellow">en el flujo</Badge>}</td></tr>
      ); })}</tbody></table></Card>
  );
}

function OrderDetail({ id }) {
  const { state, mutate } = useStore();
  const o = state.orders.find(x => x.id === id);
  if (!o) return <div className="page"><Empty title="Pedido no encontrado" action={<a href="#/pedidos" className="btn">Volver</a>} /></div>;
  const c = state.customers.find(x => x.id === o.customerId);
  const S = state.settings;
  const set = patch => mutate(st => Object.assign(st.orders.find(x => x.id === id), patch));
  const markPaid = () => mutate(st => { const x = st.orders.find(y => y.id === id); x.payment = 'pagado'; onOrderPaid(st, x); });
  const cod = (status) => mutate(st => { const x = st.orders.find(y => y.id === id); x.codStatus = status; log(st, status === 'confirmado' ? 'contraentrega_confirmada' : 'contraentrega_rechazada', x.customerId, { pedido: x.number }); if (status === 'rechazado') x.fulfillment = 'cancelado'; });
  const risk = o.paymentMethod === 'contraentrega' ? orderRisk(state, o) : null;
  const pf = orderProfit(state, o);
  const att = attributedSource(o);
  return (
    <div className="page">
      <PageHead back="#/pedidos" title={`Pedido #${o.number}`} subtitle={`${fmtDate(o.createdAt)} · ${o.channel}${o.paymentMethod ? ' · ' + (PAY_NAMES[o.paymentMethod] || o.paymentMethod) : ''}`}
        actions={<><Btn icon={Printer} onClick={() => window.print()}>Imprimir</Btn>{c?.phone && <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/${c.phone.replace(/\D/g, '').replace(/^3/, '573')}?text=${encodeURIComponent(`Hola ${c.name.split(' ')[0]}, tu pedido #${o.number} está ${o.fulfillment}.`)}`}><MessageCircle size={16} />WhatsApp</a>}</>} />
      <div className="grid-main">
        <div className="stack">
          {risk && o.codStatus === 'por-confirmar' && (
            <Card title="Confirmar antes de despachar" actions={<Badge tone={riskTone(risk.level)}>riesgo {risk.level} · {risk.score}/100</Badge>}>
              {risk.reasons.length ? <ul className="reasons">{risk.reasons.map(r => <li key={r.why}><b>+{r.pts}</b> {r.why}</li>)}</ul> : <p className="muted">Sin señales de riesgo.</p>}
              <div className="row">
                <a className="btn primary" href={waLink(state, o)} target="_blank" rel="noreferrer"><MessageCircle size={16} />Confirmar por WhatsApp</a>
                <Btn icon={Check} onClick={() => cod('confirmado')}>Confirmó</Btn>
                <Btn icon={X} variant="danger" onClick={() => cod('rechazado')}>Rechazó / no contesta</Btn>
              </div>
            </Card>
          )}
          <Card title="Productos" actions={<Badge tone={statusTone(o.fulfillment)}>{o.fulfillment}</Badge>}>
            {o.items.map((i, k) => <div key={k} className="line"><img src={i.image} alt="" /><div><b>{i.title}</b><div className="muted sm">{money(i.price, S)} × {i.qty}{i.tierOff ? ` · escalonado −${money(i.tierOff, S)}` : ''}</div></div><b>{money(i.price * i.qty - (i.tierOff || 0), S)}</b></div>)}
            <div className="row end" style={{ marginTop: 12 }}>
              {o.fulfillment === 'sin preparar' && o.codStatus !== 'por-confirmar' && <Btn variant="primary" onClick={() => set({ fulfillment: 'preparado' })}>Marcar como preparado</Btn>}
              {o.fulfillment === 'sin preparar' && o.codStatus === 'por-confirmar' && <span className="muted sm">Primero confirma el pedido contra entrega.</span>}
              {o.fulfillment === 'preparado' && <Btn variant="primary" onClick={() => set({ fulfillment: 'enviado' })}>Marcar como enviado</Btn>}
            </div>
          </Card>
          <Card title="Pago" actions={<Badge tone={statusTone(o.payment)}>{o.payment}</Badge>}>
            <div className="sum"><span>Subtotal</span><span>{money(o.subtotal, S)}</span></div>
            {o.tierDiscount > 0 && <div className="sum"><span>Descuento escalonado</span><span>−{money(o.tierDiscount, S)}</span></div>}
            {(o.codeDiscount > 0 || (o.discount > 0 && !o.tierDiscount)) && <div className="sum"><span>Código {o.code}</span><span>−{money(o.codeDiscount ?? o.discount, S)}</span></div>}
            <div className="sum"><span>Envío{o.department ? ` (${o.department})` : ''}</span><span>{o.shipping ? money(o.shipping, S) : 'Gratis'}</span></div>
            <div className="sum total"><span>Total</span><span>{money(o.total, S)}</span></div>
            <div className="row end">{o.payment === 'pendiente' && <Btn variant="primary" onClick={markPaid}>{o.paymentMethod === 'contraentrega' ? 'Marcar como cobrado' : 'Marcar como pagado'}</Btn>}{o.payment === 'pagado' && <Btn onClick={() => set({ payment: 'reembolsado' })}>Reembolsar</Btn>}</div>
          </Card>
          <Card title="Ganancia real estimada" actions={<Badge tone={pf.profit > 0 ? 'green' : 'red'}>{Math.round(pf.margin * 100)} % de margen</Badge>}>
            <div className="sum"><span>Venta (sin envío)</span><span>{money(pf.revenue, S)}</span></div>
            <div className="sum"><span>Costo de productos</span><span>−{money(pf.cost, S)}</span></div>
            {pf.shippingPaidByStore > 0 && <div className="sum"><span>Envío que asume la tienda</span><span>−{money(pf.shippingPaidByStore, S)}</span></div>}
            {pf.gateway > 0 && <div className="sum"><span>Comisión de la pasarela</span><span>−{money(pf.gateway, S)}</span></div>}
            {pf.codFee > 0 && <div className="sum"><span>Recaudo contra entrega</span><span>−{money(pf.codFee, S)}</span></div>}
            {pf.returns > 0 && <div className="sum"><span>Devoluciones esperadas ({S.profit?.returnRatePct} %)</span><span>−{money(pf.returns, S)}</span></div>}
            <div className="sum total"><span>Ganancia</span><span>{money(pf.profit, S)}</span></div>
            <p className="muted sm">Los supuestos (comisión, % de devoluciones) se cambian en Configuración → Rentabilidad.</p>
          </Card>
        </div>
        <div className="stack">
          <Card title="Cliente">{c ? <><a className="link" href={'#/clientes/' + c.id}><b>{c.name}</b></a><p className="muted sm">{c.email}<br />{c.phone}<br />{o.address}<br />{o.city}{o.department ? `, ${o.department}` : ''}</p></> : '—'}</Card>
          <Card title="Origen">{att ? <p><Badge tone="blue">{sourceLabel(att.source)}</Badge> {att.campaign}<br /><span className="muted sm">Último clic en anuncio, {Math.round((new Date(o.createdAt) - new Date(att.at)) / 864e5)} días antes de comprar.</span></p> : <p className="muted sm">Sin anuncio en los 7 días previos (directo u orgánico).</p>}</Card>
          <Card title="Notas"><textarea className="input" rows={4} value={o.notes || ''} onChange={e => set({ notes: e.target.value })} placeholder="Notas internas del pedido" /></Card>
        </div>
      </div>
    </div>
  );
}
