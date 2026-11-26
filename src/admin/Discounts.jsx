import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore, money } from '../store.jsx';
import { uid } from '../seed.js';
import { Card, Badge, PageHead, Btn, Field, Toggle, Soon } from '../ui.jsx';

const label = (d, S) => d.type === 'porcentaje' ? `${d.value}% de descuento` : d.type === 'fijo' ? `${money(d.value, S)} de descuento` : 'Envío gratis';

export default function Discounts() {
  const { state, mutate } = useStore();
  const [f, setF] = useState(null);
  const save = () => {
    if (!f.code.trim()) return;
    mutate(st => st.discounts.unshift({ ...f, id: uid('d'), code: f.code.trim().toUpperCase(), value: Number(f.value) || 0, minSubtotal: Number(f.minSubtotal) || 0, limit: f.limit ? Number(f.limit) : null, uses: 0, active: true }));
    setF(null);
  };
  const S = state.settings;
  return (
    <div className="page">
      <PageHead title="Descuentos" subtitle="Los códigos funcionan de verdad en el checkout de la tienda." actions={<Btn variant="primary" icon={Plus} onClick={() => setF({ code: '', type: 'porcentaje', value: 10, minSubtotal: 0, limit: '' })}>Crear descuento</Btn>} />
      {f && (
        <Card title="Nuevo código">
          <div className="grid-3">
            <Field label="Código"><input className="input" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="VERANO20" /></Field>
            <Field label="Tipo"><select className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="porcentaje">Porcentaje</option><option value="fijo">Monto fijo</option><option value="envio">Envío gratis</option></select></Field>
            {f.type !== 'envio' && <Field label="Valor"><input className="input" type="number" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></Field>}
            <Field label="Compra mínima"><input className="input" type="number" value={f.minSubtotal} onChange={e => setF({ ...f, minSubtotal: e.target.value })} /></Field>
            <Field label="Límite de usos (vacío = sin límite)"><input className="input" type="number" value={f.limit} onChange={e => setF({ ...f, limit: e.target.value })} /></Field>
          </div>
          <div className="row end"><Btn onClick={() => setF(null)}>Cancelar</Btn><Btn variant="primary" onClick={save}>Guardar</Btn></div>
        </Card>
      )}
      <Card pad={false}>
        <table className="table"><thead><tr><th>Código</th><th>Descuento</th><th>Condición</th><th>Usos</th><th>Activo</th><th /></tr></thead>
          <tbody>{state.discounts.map(d => (
            <tr key={d.id}>
              <td><b className="mono">{d.code}</b></td><td>{label(d, S)}</td><td className="muted">{d.minSubtotal ? `Desde ${money(d.minSubtotal, S)}` : 'Sin mínimo'}</td>
              <td>{d.uses}{d.limit ? ` / ${d.limit}` : ''}</td>
              <td><Toggle checked={d.active} onChange={v => mutate(st => { st.discounts.find(x => x.id === d.id).active = v; })} /></td>
              <td className="r"><button className="icon-btn" onClick={() => mutate(st => { st.discounts = st.discounts.filter(x => x.id !== d.id); })}><Trash2 size={16} /></button></td>
            </tr>
          ))}</tbody></table>
      </Card>
      <div className="grid-2">
        <Soon title="Descuentos automáticos" text="Sin código: 'lleva 3 paga 2', descuento por cantidad, regalo con la compra." />
        <Soon title="Descuentos por segmento" text="Solo para clientes VIP o mayoristas." />
      </div>
    </div>
  );
}
