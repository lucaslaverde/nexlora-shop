import React, { useState } from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { uid } from '../seed.js';
import { Card, Badge, PageHead, Btn, Field, Toggle, Tabs, Empty } from '../ui.jsx';

const label = (d, S) => d.type === 'escalonado' ? d.tiers.map(t => `${t.qty}${t === d.tiers[d.tiers.length - 1] ? '+' : ''} = ${t.pct}%`).join(' · ') : d.type === 'porcentaje' ? `${d.value}% de descuento` : d.type === 'fijo' ? `${money(d.value, S)} de descuento` : 'Envío gratis';
const live = d => d.active && (!d.startsAt || new Date(d.startsAt) <= new Date()) && (!d.endsAt || new Date(d.endsAt) >= new Date());
const toLocal = iso => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';

export default function Discounts() {
  const { state } = useStore();
  const [tab, setTab] = useState('escalonados');
  const personal = state.discounts.filter(d => d.personal);
  return (
    <div className="page">
      <PageHead title="Descuentos" subtitle="Todo lo que se muestra en la tienda es lo mismo que se cobra: un solo cálculo para tienda, carrito, checkout y chat." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'escalonados', label: 'Escalonados (automáticos)', count: state.discounts.filter(d => d.type === 'escalonado').length }, { id: 'codigos', label: 'Códigos', count: state.discounts.filter(d => !d.personal && d.type !== 'escalonado').length }, { id: 'personales', label: 'Códigos personales', count: personal.length }]} />
      {tab === 'escalonados' && <Tiered />}
      {tab === 'codigos' && <Codes />}
      {tab === 'personales' && <Personal />}
    </div>
  );
}

function Tiered() {
  const { state, mutate } = useStore();
  const list = state.discounts.filter(d => d.type === 'escalonado');
  const add = () => mutate(st => st.discounts.unshift({ id: uid('d'), code: '', title: 'Nuevo escalonado', type: 'escalonado', automatic: true, active: false, collections: [state.collections[0]?.id], tiers: [{ qty: 1, pct: 10 }, { qty: 2, pct: 15 }, { qty: 3, pct: 20 }], startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 7 * 864e5).toISOString(), combinable: false, uses: 0, limit: null, minSubtotal: 0, value: 0 }));
  return (
    <div className="stack">
      <Card><p className="muted sm" style={{ margin: 0 }}><Layers size={14} /> Como una preventa: entre más unidades de las colecciones elegidas, más descuento en <b>todas</b>. La tienda muestra el precio con descuento, la tabla de escalones y la barra «agrega 1 más» en tarjetas, ficha y carrito, y el checkout lo cobra igual. No usa el precio de comparación, así nunca hay doble descuento. Al vencer, todo vuelve solo a la normalidad.</p></Card>
      <div className="row end"><Btn variant="primary" icon={Plus} onClick={add}>Crear escalonado</Btn></div>
      {list.map(d => {
        const edit = fn => mutate(st => fn(st.discounts.find(x => x.id === d.id)));
        return (
          <Card key={d.id} title={d.title} actions={<>{live(d) ? <Badge tone="green">en vivo</Badge> : d.active ? <Badge tone="yellow">programado / vencido</Badge> : <Badge>apagado</Badge>}<Toggle checked={d.active} onChange={v => edit(x => { x.active = v; })} /></>}>
            <div className="grid-2">
              <Field label="Nombre (se muestra en la tienda)"><input className="input" value={d.title} onChange={e => edit(x => { x.title = e.target.value; })} /></Field>
              <Field label="Colecciones incluidas">
                <div className="chips" style={{ margin: 0 }}>{state.collections.map(c => <button key={c.id} className={d.collections.includes(c.id) ? 'on' : ''} onClick={() => edit(x => { x.collections = x.collections.includes(c.id) ? x.collections.filter(y => y !== c.id) : [...x.collections, c.id]; })}>{c.title}</button>)}</div>
              </Field>
              <Field label="Empieza"><input className="input" type="datetime-local" value={toLocal(d.startsAt)} onChange={e => edit(x => { x.startsAt = new Date(e.target.value).toISOString(); })} /></Field>
              <Field label="Termina (se apaga solo)"><input className="input" type="datetime-local" value={toLocal(d.endsAt)} onChange={e => edit(x => { x.endsAt = new Date(e.target.value).toISOString(); })} /></Field>
            </div>
            <Field label="Escalones">
              <div className="tiers-edit">{d.tiers.map((t, i) => (
                <div key={i} className="tier-edit"><span>Desde</span><input className="input" type="number" min="1" value={t.qty} onChange={e => edit(x => { x.tiers[i].qty = Math.max(1, +e.target.value); x.tiers.sort((a, b) => a.qty - b.qty); })} aria-label="Unidades" /><span>unid. →</span><input className="input" type="number" min="1" max="90" value={t.pct} onChange={e => edit(x => { x.tiers[i].pct = +e.target.value; })} aria-label="Porcentaje" /><span>%</span><button className="icon-btn" onClick={() => edit(x => { x.tiers.splice(i, 1); })} aria-label="Quitar escalón"><Trash2 size={14} /></button></div>
              ))}<Btn icon={Plus} onClick={() => edit(x => { const last = x.tiers[x.tiers.length - 1]; x.tiers.push({ qty: (last?.qty || 0) + 1, pct: (last?.pct || 5) + 5 }); })}>Escalón</Btn></div>
            </Field>
            <div className="row between setting-row"><div><b>Se combina con códigos</b><p className="muted sm">Apagado (recomendado): un código no se suma encima de un producto que ya tiene escalonado.</p></div><Toggle checked={d.combinable} onChange={v => edit(x => { x.combinable = v; })} /></div>
            <p className="muted sm">Usado en {d.uses || 0} pedidos. <button className="linkish" onClick={() => mutate(st => { st.discounts = st.discounts.filter(x => x.id !== d.id); })}>Eliminar</button></p>
          </Card>
        );
      })}
    </div>
  );
}

function Codes() {
  const { state, mutate } = useStore();
  const [f, setF] = useState(null);
  const S = state.settings;
  const save = () => {
    if (!f.code.trim()) return;
    mutate(st => st.discounts.unshift({ ...f, id: uid('d'), code: f.code.trim().toUpperCase(), value: Number(f.value) || 0, minSubtotal: Number(f.minSubtotal) || 0, limit: f.limit ? Number(f.limit) : null, uses: 0, active: true, endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null }));
    setF(null);
  };
  const list = state.discounts.filter(d => !d.personal && d.type !== 'escalonado');
  return (
    <div className="stack">
      <div className="row end"><Btn variant="primary" icon={Plus} onClick={() => setF({ code: '', type: 'porcentaje', value: 10, minSubtotal: 0, limit: '', endsAt: '' })}>Crear código</Btn></div>
      {f && (
        <Card title="Nuevo código">
          <div className="grid-3">
            <Field label="Código"><input className="input" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="VERANO20" /></Field>
            <Field label="Tipo"><select className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="fijo">Monto fijo</option><option value="envio">Envío gratis</option></select></Field>
            {f.type !== 'envio' && <Field label="Valor"><input className="input" type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></Field>}
            <Field label="Compra mínima"><input className="input" type="number" value={f.minSubtotal} onChange={e => setF({ ...f, minSubtotal: e.target.value })} /></Field>
            <Field label="Límite de usos (vacío = sin límite)"><input className="input" type="number" value={f.limit} onChange={e => setF({ ...f, limit: e.target.value })} /></Field>
            <Field label="Vence (opcional)"><input className="input" type="datetime-local" value={f.endsAt} onChange={e => setF({ ...f, endsAt: e.target.value })} /></Field>
          </div>
          <div className="row end"><Btn onClick={() => setF(null)}>Cancelar</Btn><Btn variant="primary" onClick={save}>Guardar</Btn></div>
        </Card>
      )}
      <Card pad={false}>
        <table className="table"><thead><tr><th>Código</th><th>Descuento</th><th>Condición</th><th>Usos</th><th>Activo</th><th /></tr></thead>
          <tbody>{list.map(d => (
            <tr key={d.id}>
              <td><b className="mono">{d.code}</b></td><td>{label(d, S)}</td><td className="muted">{d.minSubtotal ? `Desde ${money(d.minSubtotal, S)}` : 'Sin mínimo'}{d.endsAt ? ` · vence ${fmtDate(d.endsAt)}` : ''}</td>
              <td>{d.uses}{d.limit ? ` / ${d.limit}` : ''}</td>
              <td><Toggle checked={d.active} onChange={v => mutate(st => { st.discounts.find(x => x.id === d.id).active = v; })} /></td>
              <td className="r"><button className="icon-btn" aria-label="Eliminar" onClick={() => mutate(st => { st.discounts = st.discounts.filter(x => x.id !== d.id); })}><Trash2 size={16} /></button></td>
            </tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

function Personal() {
  const { state } = useStore();
  const S = state.settings;
  const list = state.discounts.filter(d => d.personal);
  if (!list.length) return <Card><Empty title="Sin códigos personales todavía" text="Se crean solos cuando alguien gana en un juego o pasa por un flujo con el paso «Crear código único». Cada uno es de un solo uso." /></Card>;
  const origin = o => o?.startsWith('juego:') ? `Juego: ${state.games.find(g => g.id === o.slice(6))?.name}` : o?.startsWith('flujo:') ? `Flujo: ${state.workflows.find(w => w.id === o.slice(6))?.name}` : '—';
  return (
    <Card pad={false}>
      <table className="table"><thead><tr><th>Código</th><th>Premio</th><th>De dónde salió</th><th>Para</th><th>Estado</th></tr></thead>
        <tbody>{list.map(d => (
          <tr key={d.id}><td><b className="mono">{d.code}</b></td><td>{label(d, S)}</td><td className="muted sm">{origin(d.origin)}</td><td>{state.customers.find(c => c.id === d.contactId)?.name || 'Sin contacto'}</td>
            <td>{d.uses ? <Badge tone="green">canjeado</Badge> : new Date(d.endsAt) < new Date() ? <Badge>vencido</Badge> : <Badge tone="blue">vigente hasta {new Date(d.endsAt).toLocaleDateString('es-CO')}</Badge>}</td></tr>
        ))}</tbody></table>
    </Card>
  );
}
