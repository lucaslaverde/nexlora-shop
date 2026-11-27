import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { moveDeal, completeTask, createTask } from '../crm/engine.js';
import { Card, Badge, PageHead, Tabs, Btn, Empty } from '../ui.jsx';

export default function Pipelines({ sub }) {
  const { state } = useStore();
  const tab = sub || state.pipelines?.[0]?.id || 'tareas';
  const open = (state.tasks || []).filter(t => !t.done).length;
  return (
    <div className="page wide">
      <PageHead title="Pipelines y tareas" subtitle="Las oportunidades se mueven solas con lo que pasa (chats, pedidos, pagos, juegos). También puedes arrastrarlas." />
      <Tabs value={tab} onChange={t => (location.hash = '#/pipelines/' + t)} tabs={[...(state.pipelines || []).map(p => ({ id: p.id, label: p.name, count: state.deals.filter(d => d.pipelineId === p.id).length })), { id: 'tareas', label: 'Tareas', count: open }]} />
      {tab === 'tareas' ? <Tasks /> : <Board pipelineId={tab} />}
    </div>
  );
}

function Board({ pipelineId }) {
  const { state, mutate } = useStore();
  const p = state.pipelines.find(x => x.id === pipelineId);
  const [drag, setDrag] = useState(null);
  if (!p) return <Empty title="Pipeline no encontrado" />;
  const S = state.settings;
  return (
    <div className="kanban">
      {p.stages.map(s => {
        const deals = state.deals.filter(d => d.pipelineId === p.id && d.stageId === s.id);
        const total = deals.reduce((a, d) => a + (d.value || 0), 0);
        return (
          <div key={s.id} className="kan-col" onDragOver={e => e.preventDefault()} onDrop={() => { if (drag) mutate(st => { const d = st.deals.find(x => x.id === drag); moveDeal(st, { pipelineId: p.id, stageId: s.id, contactId: d.contactId, orderId: d.orderId }); }); setDrag(null); }}>
            <div className="kan-h"><b>{s.name}</b><span className="muted sm">{deals.length} · {money(total, S)}</span></div>
            {deals.map(d => { const c = state.customers.find(x => x.id === d.contactId); return (
              <div key={d.id} className="kan-card" draggable onDragStart={() => setDrag(d.id)} onDragEnd={() => setDrag(null)}>
                <a className="link" href={'#/clientes/' + d.contactId}><b>{c?.name}</b></a>
                <div className="sm">{d.title}</div>
                <div className="row between"><span className="muted sm">{fmtDate(d.updatedAt)}</span>{d.value > 0 && <b className="sm">{money(d.value, S)}</b>}</div>
                <select className="input kan-move" aria-label="Mover a etapa" value={d.stageId} onChange={e => mutate(st => moveDeal(st, { pipelineId: p.id, stageId: e.target.value, contactId: d.contactId, orderId: d.orderId }))}>{p.stages.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </div>
            ); })}
            {!deals.length && <p className="muted sm pad">Vacío</p>}
          </div>
        );
      })}
    </div>
  );
}

function Tasks() {
  const { state, mutate } = useStore();
  const [show, setShow] = useState('abiertas');
  const [title, setTitle] = useState('');
  const S = state.settings;
  const list = (state.tasks || []).filter(t => (show === 'abiertas' ? !t.done : t.done));
  const done = id => mutate(st => completeTask(st, id));
  return (
    <div className="stack">
      <Card>
        <p className="muted sm" style={{ marginTop: 0 }}>Solo se crean tareas que piden una acción humana: validar un pago de chat o llamar a un pedido contra entrega de riesgo alto. Nada de tareas de ruido.</p>
        <div className="row"><input className="input" style={{ flex: 1 }} placeholder="Nueva tarea manual" value={title} onChange={e => setTitle(e.target.value)} /><Btn icon={Plus} onClick={() => { if (title.trim()) { mutate(st => createTask(st, { title: title.trim(), kind: 'general' })); setTitle(''); } }}>Agregar</Btn></div>
      </Card>
      <Tabs value={show} onChange={setShow} tabs={[{ id: 'abiertas', label: 'Pendientes', count: (state.tasks || []).filter(t => !t.done).length }, { id: 'hechas', label: 'Hechas' }]} />
      {list.length ? list.map(t => {
        const c = state.customers.find(x => x.id === t.contactId);
        const items = t.draft?.items?.map(i => ({ ...i, p: state.products.find(p => p.id === i.productId) })) || [];
        return (
          <Card key={t.id}>
            <div className="task">
              <button className="icon-btn" disabled={t.done} onClick={() => done(t.id)} aria-label="Completar">{t.done ? <CheckCircle2 size={20} color="var(--ok)" /> : <Circle size={20} />}</button>
              <div style={{ flex: 1 }}>
                <b>{t.title}</b>
                <div className="muted sm">{c ? <a className="link" href={'#/clientes/' + c.id}>{c.name}</a> : 'Sin contacto'} · vence {fmtDate(t.due)}{t.done ? ` · hecha ${fmtDate(t.doneAt)}` : ''}</div>
                {t.kind === 'validar-pago' && t.draft && (
                  <div className="task-draft">
                    {items.map(i => <div key={i.productId}>{i.qty} × {i.p?.title}</div>)}
                    <div className="muted sm">{t.draft.city}{t.draft.department ? `, ${t.draft.department}` : ''} · {t.draft.paymentMethod} · {t.draft.channel}</div>
                  </div>
                )}
              </div>
              {!t.done && t.kind === 'validar-pago' && <Btn variant="primary" onClick={() => done(t.id)}>Pago recibido: crear pedido</Btn>}
              {!t.done && t.orderId && <a className="btn" href={'#/pedidos/' + t.orderId}>Ver pedido</a>}
              {t.done && t.kind === 'validar-pago' && <Badge tone="green">pedido creado</Badge>}
            </div>
          </Card>
        );
      }) : <Card><Empty icon={CheckCircle2} title={show === 'abiertas' ? 'Nada pendiente' : 'Aún no hay tareas hechas'} /></Card>}
      <p className="muted sm">Al completar «Validar pago», el pedido se crea pagado con los precios y descuentos de la tienda, el cliente recibe la confirmación en su chat y la oportunidad pasa a «Pagado». Moneda: {S.currency}.</p>
    </div>
  );
}
