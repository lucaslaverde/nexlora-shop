import React, { useState } from 'react';
import { Users, Mail } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { Card, Badge, PageHead, Tabs, Soon, Empty, statusTone } from '../ui.jsx';

export default function Customers({ id }) {
  const { state } = useStore();
  const [tab, setTab] = useState('clientes');
  const [q, setQ] = useState('');
  const stats = c => { const os = state.orders.filter(o => o.customerId === c.id); return { n: os.length, spent: os.reduce((s, o) => s + o.total, 0), os }; };
  if (id) {
    const c = state.customers.find(x => x.id === id);
    if (!c) return <div className="page"><Empty title="Cliente no encontrado" /></div>;
    const st = stats(c);
    return (
      <div className="page">
        <PageHead back="#/clientes" title={c.name} subtitle={`${c.city} · cliente desde la tienda de prueba`} />
        <div className="kpis"><div className="kpi"><span>Pedidos</span><b>{st.n}</b></div><div className="kpi"><span>Total gastado</span><b>{money(st.spent, state.settings)}</b></div><div className="kpi"><span>Ticket promedio</span><b>{money(st.n ? st.spent / st.n : 0, state.settings)}</b></div></div>
        <div className="grid-main">
          <Card title="Pedidos" pad={false}><table className="table"><tbody>{st.os.map(o => <tr key={o.id} onClick={() => (location.hash = '#/pedidos/' + o.id)}><td><b>#{o.number}</b></td><td className="muted">{fmtDate(o.createdAt)}</td><td><Badge tone={statusTone(o.payment)}>{o.payment}</Badge></td><td className="r">{money(o.total, state.settings)}</td></tr>)}</tbody></table></Card>
          <Card title="Contacto"><p className="muted">{c.email}<br />{c.phone}</p><p>{c.marketing ? <Badge tone="green">Acepta marketing</Badge> : <Badge>No acepta marketing</Badge>} {c.tags.map(t => <Badge key={t} tone="blue">{t}</Badge>)}</p></Card>
        </div>
      </div>
    );
  }
  const list = state.customers.filter(c => (c.name + c.email + c.city).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page">
      <PageHead title="Clientes" subtitle={`${state.customers.length} clientes`} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'clientes', label: 'Clientes' }, { id: 'segmentos', label: 'Segmentos' }]} />
      {tab === 'clientes' ? (
        <Card pad={false}>
          <div className="toolbar"><input className="input" placeholder="Buscar clientes" value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Cliente</th><th>Ciudad</th><th>Marketing</th><th>Pedidos</th><th className="r">Gastado</th></tr></thead>
            <tbody>{list.map(c => { const s = stats(c); return (
              <tr key={c.id} onClick={() => (location.hash = '#/clientes/' + c.id)}><td><b>{c.name}</b><div className="muted sm">{c.email}</div></td><td>{c.city}</td><td>{c.marketing ? <Badge tone="green">Sí</Badge> : <Badge>No</Badge>}</td><td>{s.n}</td><td className="r">{money(s.spent, state.settings)}</td></tr>
            ); })}</tbody>
          </table></div>
        </Card>
      ) : (
        <div className="stack">
          <Card title="Segmentos sugeridos">
            {[['Compraron más de una vez', state.customers.filter(c => stats(c).n > 1).length], ['Aceptan marketing', state.customers.filter(c => c.marketing).length], ['VIP', state.customers.filter(c => c.tags.includes('vip')).length]].map(([l, n]) => <div key={l} className="todo"><b>{n}</b>{l}</div>)}
          </Card>
          <Soon icon={Users} title="Segmentos con reglas propias" text="Arma grupos con filtros (ciudad, gasto, última compra) y úsalos en campañas." />
          <Soon icon={Mail} title="Enviar campaña a un segmento" text="Correo y WhatsApp masivo desde aquí." />
        </div>
      )}
    </div>
  );
}
