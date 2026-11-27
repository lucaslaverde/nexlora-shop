import React, { useState } from 'react';
import { Zap, Plus, Trash2, ChevronUp, ChevronDown, Play, MessageCircle } from 'lucide-react';
import { useStore, fmtDate } from '../store.jsx';
import { uid } from '../seed.js';
import { TRIGGERS, STEP_LABELS, enroll, advance, render } from '../crm/engine.js';
import { Card, Badge, PageHead, Tabs, Btn, Field, Toggle, Empty } from '../ui.jsx';

export default function Automations({ sub }) {
  const tab = sub || 'flujos';
  return (
    <div className="page">
      <PageHead title="Automatizaciones" subtitle="Flujos que trabajan solos: bienvenida, carrito abandonado, confirmación de contra entrega, postventa y recompra." />
      <Tabs value={tab.startsWith('wf') ? 'flujos' : tab} onChange={t => (location.hash = '#/automatizaciones/' + t)} tabs={[{ id: 'flujos', label: 'Flujos' }, { id: 'plantillas', label: 'Plantillas de WhatsApp' }, { id: 'registro', label: 'Registro' }]} />
      {tab === 'plantillas' ? <Templates /> : tab === 'registro' ? <RunLog /> : tab.startsWith('wf') ? <Editor id={tab} /> : <List />}
    </div>
  );
}

function List() {
  const { state, mutate } = useStore();
  const add = () => { const id = uid('wf'); mutate(st => st.workflows.push({ id, name: 'Nuevo flujo', active: false, trigger: 'pedido_pagado', exitOn: null, description: '', steps: [], stats: { enrolled: 0, sent: 0, completed: 0 } })); location.hash = '#/automatizaciones/' + id; };
  return (
    <div className="stack">
      <div className="row end"><Btn variant="primary" icon={Plus} onClick={add}>Crear flujo</Btn></div>
      {state.workflows.map(w => {
        const active = (state.runs || []).filter(r => r.workflowId === w.id && r.status === 'activa').length;
        return (
          <Card key={w.id}>
            <div className="wf-row">
              <div className="soon-ic"><Zap size={18} /></div>
              <div style={{ flex: 1 }}>
                <a className="link" href={'#/automatizaciones/' + w.id}><b>{w.name}</b></a>
                <div className="muted sm">Cuando: {TRIGGERS[w.trigger]} · {w.steps.length} pasos{w.exitOn === 'compra' ? ' · sale al comprar' : ''}</div>
                <div className="wf-chips">{w.steps.map(s => <span key={s.id}>{STEP_LABELS[s.type]}{s.type === 'esperar' ? ` ${s.hours} h` : ''}</span>)}</div>
              </div>
              <div className="wf-stats"><div><b>{w.stats?.enrolled || 0}</b><span>entraron</span></div><div><b>{active}</b><span>en curso</span></div><div><b>{w.stats?.sent || 0}</b><span>mensajes</span></div></div>
              <Toggle checked={w.active} onChange={v => mutate(st => { st.workflows.find(x => x.id === w.id).active = v; })} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StepEditor({ s, onChange, templates, pipelines }) {
  const set = (k, v) => onChange({ ...s, [k]: v });
  return (
    <div className="grid-2">
      {s.type === 'esperar' && <Field label="Horas"><input className="input" type="number" min="1" value={s.hours} onChange={e => set('hours', Math.max(1, +e.target.value))} /></Field>}
      {s.type === 'whatsapp' && <Field label="Plantilla"><select className="input" value={s.template} onChange={e => set('template', e.target.value)}>{templates.map(t => <option key={t.id} value={t.id}>{t.name} {t.status !== 'aprobada' ? '(sin aprobar)' : ''}</option>)}</select></Field>}
      {s.type === 'email' && <><Field label="Asunto"><input className="input" value={s.subject} onChange={e => set('subject', e.target.value)} /></Field><Field label="Texto"><input className="input" value={s.body} onChange={e => set('body', e.target.value)} /></Field></>}
      {s.type === 'descuento' && <><Field label="% de descuento"><input className="input" type="number" value={s.pct} onChange={e => set('pct', +e.target.value)} /></Field><Field label="Válido (días)"><input className="input" type="number" value={s.days} onChange={e => set('days', +e.target.value)} /></Field></>}
      {s.type === 'etiqueta' && <Field label="Etiqueta"><input className="input" value={s.tag} onChange={e => set('tag', e.target.value)} /></Field>}
      {s.type === 'etapa' && <Field label="Pipeline y etapa"><select className="input" value={`${s.pipelineId}|${s.stageId}`} onChange={e => { const [a, b] = e.target.value.split('|'); onChange({ ...s, pipelineId: a, stageId: b }); }}>{pipelines.flatMap(p => p.stages.map(x => <option key={p.id + x.id} value={`${p.id}|${x.id}`}>{p.name} → {x.name}</option>))}</select></Field>}
      {(s.type === 'tarea' || s.type === 'tarea_si_riesgo') && <Field label="Título de la tarea"><input className="input" value={s.title} onChange={e => set('title', e.target.value)} /></Field>}
    </div>
  );
}

const NEW_STEP = { esperar: { hours: 24 }, whatsapp: { template: 'wt1' }, email: { subject: 'Asunto', body: '' }, descuento: { pct: 10, days: 7 }, etiqueta: { tag: 'nueva-etiqueta' }, etapa: { pipelineId: 'post', stageId: 'entregado' }, tarea: { title: 'Llamar al cliente' } };

function Editor({ id }) {
  const { state, mutate } = useStore();
  const w = state.workflows.find(x => x.id === id);
  const [testC, setTestC] = useState(state.customers.find(c => c.phone)?.id);
  const [msg, setMsg] = useState('');
  if (!w) return <Empty title="Flujo no encontrado" />;
  const edit = fn => mutate(st => fn(st.workflows.find(x => x.id === id), st));
  const runs = (state.runs || []).filter(r => r.workflowId === id).slice(0, 8);
  const test = () => {
    let out = '';
    mutate(st => { const wf = st.workflows.find(x => x.id === id); const r = enroll(st, wf, testC, { prueba: true }); advance(st, r, true); out = r.log.map(l => l.text).join(' → '); });
    setMsg('Prueba hecha (sin esperas). Revisa el registro abajo y la conversación del contacto.');
  };
  return (
    <div className="stack">
      <a className="back" href="#/automatizaciones">← Todos los flujos</a>
      <Card>
        <div className="grid-2">
          <Field label="Nombre"><input className="input" value={w.name} onChange={e => edit(x => { x.name = e.target.value; })} /></Field>
          <Field label="Cuando pase esto (disparador)"><select className="input" value={w.trigger} onChange={e => edit(x => { x.trigger = e.target.value; })}>{Object.entries(TRIGGERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        </div>
        <Field label="Descripción"><input className="input" value={w.description || ''} onChange={e => edit(x => { x.description = e.target.value; })} /></Field>
        <div className="row between setting-row"><div><b>Sale del flujo cuando compra</b><p className="muted sm">Recomendado en bienvenida y carrito abandonado.</p></div><Toggle checked={w.exitOn === 'compra'} onChange={v => edit(x => { x.exitOn = v ? 'compra' : null; })} /></div>
        <div className="row between setting-row"><div><b>Activo</b></div><Toggle checked={w.active} onChange={v => edit(x => { x.active = v; })} /></div>
      </Card>
      <Card title="Pasos">
        <div className="flow">
          <div className="flow-node trigger"><Zap size={15} /> {TRIGGERS[w.trigger]}</div>
          {w.steps.map((s, i) => (
            <div key={s.id} className="flow-step">
              <div className="flow-node">
                <div className="row between"><b>{i + 1}. {STEP_LABELS[s.type]}</b>
                  <span className="row"><button className="icon-btn" aria-label="Subir" onClick={() => edit(x => { if (i) [x.steps[i - 1], x.steps[i]] = [x.steps[i], x.steps[i - 1]]; })}><ChevronUp size={15} /></button><button className="icon-btn" aria-label="Bajar" onClick={() => edit(x => { if (i < x.steps.length - 1) [x.steps[i + 1], x.steps[i]] = [x.steps[i], x.steps[i + 1]]; })}><ChevronDown size={15} /></button><button className="icon-btn" aria-label="Eliminar paso" onClick={() => edit(x => { x.steps.splice(i, 1); })}><Trash2 size={15} /></button></span>
                </div>
                <StepEditor s={s} templates={state.templates} pipelines={state.pipelines} onChange={ns => edit(x => { x.steps[i] = ns; })} />
                {s.type === 'whatsapp' && <p className="muted sm">Vista: {render(state.templates.find(t => t.id === s.template)?.body, { nombre: 'Laura', tienda: state.settings.storeName, codigo: 'NX-AB12C', producto: 'Café Huila', enlace: 'tutienda.com/c', pedido: 1012, total: '$84.000' })}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="chips">{Object.keys(NEW_STEP).map(k => <button key={k} onClick={() => edit(x => { x.steps.push({ id: uid('s'), type: k, ...NEW_STEP[k] }); })}>+ {STEP_LABELS[k]}</button>)}</div>
      </Card>
      <Card title="Probar el flujo">
        <div className="row"><select className="input" style={{ width: 260 }} value={testC} onChange={e => setTestC(e.target.value)}>{state.customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? '' : ' (sin WhatsApp)'}</option>)}</select><Btn icon={Play} variant="primary" onClick={test}>Probar ahora (sin esperas)</Btn></div>
        {msg && <p className="muted sm">{msg}</p>}
      </Card>
      <Card title="Últimas ejecuciones" pad={false}>
        {runs.length ? <table className="table"><tbody>{runs.map(r => <tr key={r.id}><td>{state.customers.find(c => c.id === r.contactId)?.name}</td><td><Badge tone={r.status === 'activa' ? 'blue' : r.status === 'completada' ? 'green' : 'gray'}>{r.status}</Badge></td><td className="sm">{r.log.map(l => l.text).join(' → ')}</td></tr>)}</tbody></table> : <p className="muted pad">Todavía nadie entró a este flujo.</p>}
      </Card>
    </div>
  );
}

function Templates() {
  const { state, mutate } = useStore();
  const add = () => mutate(st => st.templates.push({ id: uid('wt'), name: 'nueva_plantilla', category: 'Marketing', status: 'pendiente', body: 'Hola {{nombre}}, …' }));
  return (
    <div className="stack">
      <Card><p className="muted sm" style={{ margin: 0 }}>Las plantillas de marketing las aprueba Meta antes de usarlas. Si el negocio no está verificado, WhatsApp limita a <b>250 conversaciones iniciadas por la empresa cada 24 h</b>. Variables: {'{{nombre}} {{codigo}} {{pedido}} {{total}} {{ciudad}} {{producto}} {{enlace}} {{tienda}}'}.</p></Card>
      <div className="row end"><Btn icon={Plus} onClick={add}>Nueva plantilla</Btn></div>
      {state.templates.map((t, i) => (
        <Card key={t.id}>
          <div className="grid-3">
            <Field label="Nombre"><input className="input mono" value={t.name} onChange={e => mutate(st => { st.templates[i].name = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'); })} /></Field>
            <Field label="Categoría"><select className="input" value={t.category} onChange={e => mutate(st => { st.templates[i].category = e.target.value; })}><option>Marketing</option><option>Utilidad</option></select></Field>
            <Field label="Estado en Meta"><select className="input" value={t.status} onChange={e => mutate(st => { st.templates[i].status = e.target.value; })}><option value="aprobada">Aprobada</option><option value="pendiente">Pendiente</option><option value="rechazada">Rechazada</option></select></Field>
          </div>
          <Field label="Texto"><textarea className="input" rows={2} value={t.body} onChange={e => mutate(st => { st.templates[i].body = e.target.value; })} /></Field>
          <div className="wa-preview"><MessageCircle size={14} /> {render(t.body, { nombre: 'Laura', tienda: state.settings.storeName, codigo: 'NX-AB12C', producto: 'Café Huila 500 g', enlace: 'tutienda.com/c', pedido: 1012, total: '$84.000', ciudad: 'Medellín' })}</div>
        </Card>
      ))}
    </div>
  );
}

function RunLog() {
  const { state } = useStore();
  const runs = (state.runs || []).slice(0, 40);
  if (!runs.length) return <Card><Empty icon={Zap} title="Aún no corre ningún flujo" text="Cuando alguien entre a un flujo (por ejemplo, al ganar en la ruleta o dejar el checkout) aparece aquí paso a paso." /></Card>;
  return (
    <Card pad={false}><table className="table"><thead><tr><th>Flujo</th><th>Contacto</th><th>Estado</th><th>Próximo paso</th><th>Recorrido</th></tr></thead>
      <tbody>{runs.map(r => <tr key={r.id}><td>{state.workflows.find(w => w.id === r.workflowId)?.name}</td><td>{state.customers.find(c => c.id === r.contactId)?.name}</td><td><Badge tone={r.status === 'activa' ? 'blue' : r.status === 'completada' ? 'green' : 'gray'}>{r.status}</Badge></td><td className="muted sm">{r.status === 'activa' ? fmtDate(r.nextAt) : '—'}</td><td className="sm">{r.log.map(l => l.text).join(' → ')}</td></tr>)}</tbody></table></Card>
  );
}
