import React, { useState } from 'react';
import { ShoppingCart, FilePlus, Printer, MessageCircle } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { Card, Badge, PageHead, Tabs, Btn, Soon, Empty, statusTone } from '../ui.jsx';

export default function Orders({ id }) {
  if (id) return <OrderDetail id={id} />;
  return <OrderList />;
}

function OrderList() {
  const { state } = useStore();
  const q0 = new URLSearchParams(location.hash.split('?')[1] || '').get('f') || 'todos';
  const [tab, setTab] = useState(q0);
  const [q, setQ] = useState('');
  const [view, setView] = useState('pedidos');
  const filters = {
    todos: () => true,
    'sin-preparar': o => o.fulfillment === 'sin preparar',
    'sin-pagar': o => o.payment === 'pendiente',
    preparados: o => o.fulfillment === 'preparado',
    enviados: o => o.fulfillment === 'enviado',
  };
  const cust = id => state.customers.find(c => c.id === id);
  const list = [...state.orders].filter(filters[tab] || filters.todos)
    .filter(o => !q || String(o.number).includes(q) || cust(o.customerId)?.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="page">
      <PageHead title="Pedidos" actions={<><Btn icon={FilePlus} onClick={() => setView('borradores')}>Crear pedido</Btn></>} />
      <Tabs value={view} onChange={setView} tabs={[{ id: 'pedidos', label: 'Pedidos', count: state.orders.length }, { id: 'borradores', label: 'Borradores' }, { id: 'abandonados', label: 'Carritos abandonados' }]} />
      {view === 'pedidos' && (
        <Card pad={false}>
          <div className="toolbar">
            <Tabs value={tab} onChange={setTab} tabs={[{ id: 'todos', label: 'Todos' }, { id: 'sin-preparar', label: 'Sin preparar' }, { id: 'sin-pagar', label: 'Sin pagar' }, { id: 'preparados', label: 'Preparados' }, { id: 'enviados', label: 'Enviados' }]} />
            <input className="input" placeholder="Buscar por número o cliente" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          {list.length ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Canal</th><th>Pago</th><th>Preparación</th><th className="r">Total</th></tr></thead>
              <tbody>{list.map(o => (
                <tr key={o.id} onClick={() => (location.hash = '#/pedidos/' + o.id)}>
                  <td><b>#{o.number}</b></td><td className="muted">{fmtDate(o.createdAt)}</td><td>{cust(o.customerId)?.name}</td><td className="muted">{o.channel}</td>
                  <td><Badge tone={statusTone(o.payment)}>{o.payment}</Badge></td><td><Badge tone={statusTone(o.fulfillment)}>{o.fulfillment}</Badge></td>
                  <td className="r">{money(o.total, state.settings)}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <Empty title="No hay pedidos aquí" text="Cuando entren pedidos con este estado aparecerán en esta lista." />}
        </Card>
      )}
      {view === 'borradores' && <Card><Soon icon={FilePlus} title="Pedidos manuales y borradores" text="Crea pedidos para ventas por WhatsApp o teléfono y envía el enlace de pago al cliente." /></Card>}
      {view === 'abandonados' && <Card><Soon icon={ShoppingCart} title="Recuperación de carritos" text="Lista de carritos que no terminaron la compra, con recordatorio automático por correo o WhatsApp." /></Card>}
    </div>
  );
}

function OrderDetail({ id }) {
  const { state, mutate } = useStore();
  const o = state.orders.find(x => x.id === id);
  if (!o) return <div className="page"><Empty title="Pedido no encontrado" action={<a href="#/pedidos" className="btn">Volver</a>} /></div>;
  const c = state.customers.find(x => x.id === o.customerId);
  const set = patch => mutate(st => Object.assign(st.orders.find(x => x.id === id), patch));
  const S = state.settings;
  return (
    <div className="page">
      <PageHead back="#/pedidos" title={`Pedido #${o.number}`} subtitle={`${fmtDate(o.createdAt)} · ${o.channel}`} actions={<><Btn icon={Printer} onClick={() => window.print()}>Imprimir</Btn>{c?.phone && <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${c.name}, tu pedido #${o.number} está ${o.fulfillment}.`)}`}><MessageCircle size={16} />WhatsApp</a>}</>} />
      <div className="grid-main">
        <div className="stack">
          <Card title="Productos" actions={<Badge tone={statusTone(o.fulfillment)}>{o.fulfillment}</Badge>}>
            {o.items.map((i, k) => <div key={k} className="line"><img src={i.image} alt="" /><div><b>{i.title}</b><div className="muted sm">{money(i.price, S)} × {i.qty}</div></div><b>{money(i.price * i.qty, S)}</b></div>)}
            <div className="row end" style={{ marginTop: 12 }}>
              {o.fulfillment === 'sin preparar' && <Btn variant="primary" onClick={() => set({ fulfillment: 'preparado' })}>Marcar como preparado</Btn>}
              {o.fulfillment === 'preparado' && <Btn variant="primary" onClick={() => set({ fulfillment: 'enviado' })}>Marcar como enviado</Btn>}
            </div>
          </Card>
          <Card title="Pago" actions={<Badge tone={statusTone(o.payment)}>{o.payment}</Badge>}>
            <div className="sum"><span>Subtotal</span><span>{money(o.subtotal, S)}</span></div>
            {o.discount > 0 && <div className="sum"><span>Descuento {o.code}</span><span>−{money(o.discount, S)}</span></div>}
            <div className="sum"><span>Envío</span><span>{o.shipping ? money(o.shipping, S) : 'Gratis'}</span></div>
            <div className="sum total"><span>Total</span><span>{money(o.total, S)}</span></div>
            <div className="row end">{o.payment === 'pendiente' && <Btn variant="primary" onClick={() => set({ payment: 'pagado' })}>Marcar como pagado</Btn>}{o.payment === 'pagado' && <Btn onClick={() => set({ payment: 'reembolsado' })}>Reembolsar</Btn>}</div>
          </Card>
        </div>
        <div className="stack">
          <Card title="Cliente">{c ? <><a className="link" href={'#/clientes/' + c.id}><b>{c.name}</b></a><p className="muted sm">{c.email}<br />{c.phone}<br />{c.city}</p></> : '—'}</Card>
          <Card title="Notas"><textarea className="input" rows={4} value={o.notes || ''} onChange={e => set({ notes: e.target.value })} placeholder="Notas internas del pedido" /></Card>
        </div>
      </div>
    </div>
  );
}
