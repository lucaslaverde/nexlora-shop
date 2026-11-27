import React, { useState } from 'react';
import { Users, MessageCircle, X } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { EVENT_LABELS, addTag } from '../crm/engine.js';
import { Card, Badge, PageHead, Tabs, Empty, statusTone } from '../ui.jsx';

const evText = e => {
  const d = e.data || {};
  const bits = { pedido_creado: `#${d.pedido} · ${d.canal || ''}`, pedido_pagado: `#${d.pedido}`, juego_jugado: `${d.juego}: ${d.premio}${d.respuesta ? ` · respondió «${d.respuesta}»` : ''}`, premio_entregado: `${d.premio} · código ${d.codigo}`, chat_recibido: `${d.canal}: «${(d.texto || '').slice(0, 60)}»`, whatsapp_enviado: `${d.plantilla} (${d.flujo})`, email_enviado: `${d.asunto} (${d.flujo})`, etiqueta: d.etiqueta, etapa: `${d.pipeline} → ${d.etapa}`, tarea_creada: d.tarea, tarea_completada: d.tarea, lead_creado: d.fuente, checkout_iniciado: d.productos, carrito_abandonado: d.producto, pedido_contraentrega: `#${d.pedido}` };
  return bits[e.type] || '';
};

export default function Customers({ id }) {
  const { state, mutate } = useStore();
  const [tab, setTab] = useState('clientes');
  const [q, setQ] = useState('');
  const [tagF, setTagF] = useState('');
  const stats = c => { const os = state.orders.filter(o => o.customerId === c.id); const paid = os.filter(o => o.payment === 'pagado'); return { n: os.length, spent: paid.reduce((s, o) => s + o.total, 0), os }; };
  if (id) return <ContactDetail id={id} stats={stats} />;
  const allTags = [...new Set(state.customers.flatMap(c => c.tags))].sort();
  const list = state.customers.filter(c => (c.name + c.email + c.city + c.phone).toLowerCase().includes(q.toLowerCase()) && (!tagF || c.tags.includes(tagF)))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return (
    <div className="page">
      <PageHead title="Clientes y contactos" subtitle={`${state.customers.length} contactos · ${state.customers.filter(c => stats(c).n).length} con compras`} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'clientes', label: 'Contactos' }, { id: 'segmentos', label: 'Segmentos' }]} />
      {tab === 'clientes' ? (
        <Card pad={false}>
          <div className="toolbar"><input className="input" placeholder="Buscar por nombre, correo, celular o ciudad" value={q} onChange={e => setQ(e.target.value)} />
            <select className="input" style={{ maxWidth: 220 }} value={tagF} onChange={e => setTagF(e.target.value)} aria-label="Filtrar por etiqueta"><option value="">Todas las etiquetas</option>{allTags.map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Contacto</th><th>Origen</th><th>Etiquetas</th><th>Pedidos</th><th className="r">Pagado</th></tr></thead>
            <tbody>{list.map(c => { const s = stats(c); return (
              <tr key={c.id} onClick={() => (location.hash = '#/clientes/' + c.id)}><td><b>{c.name}</b><div className="muted sm">{c.phone || c.email || c.handle}</div></td><td className="muted sm">{c.source || '—'}</td><td>{c.tags.slice(0, 3).map(t => <Badge key={t}>{t}</Badge>)}</td><td>{s.n || <span className="muted">lead</span>}</td><td className="r">{money(s.spent, state.settings)}</td></tr>
            ); })}</tbody>
          </table></div>
        </Card>
      ) : (
        <div className="stack">
          <Card title="Segmentos listos">
            {[['Compraron más de una vez', c => stats(c).n > 1], ['Leads sin compra', c => !stats(c).n], ['Aceptan marketing', c => c.marketing], ['Vinieron de un juego', c => c.tags.some(t => t.startsWith('juego-'))], ['Prefieren espresso', c => c.tags.includes('prefiere-espresso')], ['Escribieron desde un anuncio sin decir el producto', c => c.tags.includes('anuncio-sin-producto')]].map(([l, f]) => (
              <div key={l} className="todo"><b>{state.customers.filter(f).length}</b>{l}</div>
            ))}
          </Card>
          <Card><div className="soon"><div className="soon-ic"><Users size={20} /></div><div><b>Úsalos en un flujo</b><p className="muted">En Automatizaciones, el paso «Agregar etiqueta» y los disparadores ya segmentan solos.</p></div></div></Card>
        </div>
      )}
    </div>
  );
}

function ContactDetail({ id, stats }) {
  const { state, mutate } = useStore();
  const [tag, setTag] = useState('');
  const c = state.customers.find(x => x.id === id);
  if (!c) return <div className="page"><Empty title="Contacto no encontrado" /></div>;
  const S = state.settings;
  const st = stats(c);
  const events = (state.events || []).filter(e => e.contactId === id).slice(0, 40);
  const deals = (state.deals || []).filter(d => d.contactId === id);
  const codes = state.discounts.filter(d => d.contactId === id);
  const convs = (state.conversations || []).filter(x => x.contactId === id);
  return (
    <div className="page">
      <PageHead back="#/clientes" title={c.name} subtitle={`${c.source || 'Contacto'} · desde ${c.createdAt ? fmtDate(c.createdAt) : '—'}`} actions={convs[0] && <a className="btn" href={'#/conversaciones/' + convs[0].id}><MessageCircle size={16} />Ver chat</a>} />
      <div className="kpis"><div className="kpi"><span>Pedidos</span><b>{st.n}</b></div><div className="kpi"><span>Total pagado</span><b>{money(st.spent, S)}</b></div><div className="kpi"><span>Ticket promedio</span><b>{money(st.n ? st.spent / st.n : 0, S)}</b></div><div className="kpi"><span>Actividad</span><b>{events.length}</b><small>eventos</small></div></div>
      <div className="grid-main">
        <div className="stack">
          <Card title="Línea de tiempo">
            {events.length ? <div className="timeline">{events.map(e => <div key={e.id} className="tl-item"><i /><div><b>{EVENT_LABELS[e.type] || e.type}</b> <span className="muted sm">{evText(e)}</span><div className="muted sm">{fmtDate(e.at)}</div></div></div>)}</div> : <p className="muted">Sin actividad registrada todavía.</p>}
          </Card>
          <Card title="Pedidos" pad={false}>{st.os.length ? <table className="table"><tbody>{st.os.map(o => <tr key={o.id} onClick={() => (location.hash = '#/pedidos/' + o.id)}><td><b>#{o.number}</b></td><td className="muted">{fmtDate(o.createdAt)}</td><td><Badge tone={statusTone(o.payment)}>{o.payment}</Badge></td><td className="r">{money(o.total, S)}</td></tr>)}</tbody></table> : <p className="muted pad">Todavía no compra.</p>}</Card>
        </div>
        <div className="stack">
          <Card title="Contacto"><p className="muted" style={{ margin: 0 }}>{c.email}<br />{c.phone}<br />{c.handle}<br />{c.city}</p><p>{c.marketing ? <Badge tone="green">Acepta marketing</Badge> : <Badge>No acepta marketing</Badge>}</p></Card>
          <Card title="Etiquetas">
            <div className="row">{c.tags.map(t => <span key={t} className="tag-x">{t}<button aria-label={`Quitar ${t}`} onClick={() => mutate(s => { const x = s.customers.find(y => y.id === id); x.tags = x.tags.filter(z => z !== t); })}><X size={12} /></button></span>)}</div>
            <div className="row" style={{ marginTop: 8, flexWrap: 'nowrap' }}><input className="input" value={tag} onChange={e => setTag(e.target.value)} placeholder="Nueva etiqueta" onKeyDown={e => { if (e.key === 'Enter' && tag.trim()) { mutate(s => addTag(s, id, tag.trim().toLowerCase().replace(/\s+/g, '-'))); setTag(''); } }} /></div>
          </Card>
          <Card title="Oportunidades">{deals.length ? deals.map(d => { const p = state.pipelines.find(x => x.id === d.pipelineId); return <div key={d.id} className="todo"><div><b>{p?.name}</b><div className="sm">{p?.stages.find(s => s.id === d.stageId)?.name} · {d.title}</div></div></div>; }) : <p className="muted">Ninguna.</p>}</Card>
          <Card title="Códigos personales">{codes.length ? codes.map(d => <div key={d.id} className="row between"><b className="mono">{d.code}</b><span className="muted sm">{d.type === 'porcentaje' ? d.value + ' %' : d.type === 'envio' ? 'envío gratis' : money(d.value, S)} · {d.uses ? 'usado' : 'sin usar'}</span></div>) : <p className="muted">Ninguno.</p>}</Card>
        </div>
      </div>
    </div>
  );
}
