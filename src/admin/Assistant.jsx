import React, { useRef, useState } from 'react';
import { Bot, Plus, Trash2, Send, RotateCcw } from 'lucide-react';
import { useStore } from '../store.jsx';
import { think } from '../assistant/brain.js';
import { liveTierDiscounts } from '../commerce/pricing.js';
import { Card, Badge, PageHead, Btn, Field, Toggle } from '../ui.jsx';

export default function Assistant() {
  const { state, mutate } = useStore();
  const A = state.settings.assistant;
  const set = (k, v) => mutate(st => { st.settings.assistant[k] = v; });
  const active = state.products.filter(p => p.status === 'activo');
  return (
    <div className="page">
      <PageHead title={`Asistente de ventas · ${A.name}`} subtitle="Atiende el chat de la tienda (y luego WhatsApp e Instagram), vende en la conversación y arma el pedido." />
      <div className="grid-main">
        <div className="stack">
          <Card title="Cómo responde">
            <div className="row between setting-row"><div><b>Activo en la tienda</b><p className="muted sm">Muestra la burbuja de chat en la tienda.</p></div><Toggle checked={A.enabled} onChange={v => set('enabled', v)} /></div>
            <div className="grid-2">
              <Field label="Nombre"><input className="input" value={A.name} onChange={e => set('name', e.target.value)} /></Field>
              <Field label="Modo">
                <select className="input" value={A.mode} onChange={e => set('mode', e.target.value)}>
                  <option value="automatico">Piloto automático: responde solo</option>
                  <option value="sugerido">Sugerido: un asesor aprueba cada respuesta</option>
                  <option value="sugerido-de-dia">Sugerido de día, automático de noche</option>
                </select>
              </Field>
              {A.mode === 'sugerido-de-dia' && <><Field label="Hay asesores desde (hora)"><input className="input" type="number" min="0" max="23" value={A.dayStart} onChange={e => set('dayStart', +e.target.value)} /></Field><Field label="Hasta (hora)"><input className="input" type="number" min="1" max="24" value={A.dayEnd} onChange={e => set('dayEnd', +e.target.value)} /></Field></>}
            </div>
            {A.mode === 'sugerido' && <p className="tip">Ojo: en modo sugerido, si nadie aprueba de noche, el cliente espera hasta la mañana. «Sugerido de día, automático de noche» lo resuelve.</p>}
            <Field label="Saludo"><input className="input" value={A.greeting} onChange={e => set('greeting', e.target.value)} /></Field>
            <Field label="Cuando pasa a un asesor"><input className="input" value={A.handoff} onChange={e => set('handoff', e.target.value)} /></Field>
            <Field label="Datos para transferencia (los manda al cerrar un pedido)"><input className="input" value={state.settings.checkout?.bankInfo || ''} placeholder="Ej: Bancolombia ahorros 000-000000-00 a nombre de…" onChange={e => mutate(st => { st.settings.checkout.bankInfo = e.target.value; })} /></Field>
          </Card>
          <Card title="Reglas que sigue" actions={<Btn icon={Plus} onClick={() => mutate(st => { st.settings.assistant.rules.push('Nueva regla'); })}>Agregar</Btn>}>
            {A.rules.map((r, i) => <div key={i} className="row" style={{ flexWrap: 'nowrap', marginBottom: 8 }}><input className="input" value={r} onChange={e => mutate(st => { st.settings.assistant.rules[i] = e.target.value; })} aria-label={`Regla ${i + 1}`} /><button className="icon-btn" onClick={() => mutate(st => { st.settings.assistant.rules.splice(i, 1); })} aria-label="Quitar regla"><Trash2 size={15} /></button></div>)}
            <p className="muted sm">Las 5 primeras son el comportamiento base del motor local. Cuando se conecte un proveedor de IA, todas las reglas pasarán a su instrucción.</p>
          </Card>
          <Card title="Lo que sabe (base de conocimiento)">
            <ul className="kb">
              <li><b>{active.length} productos activos</b> con precio, stock y descripción, leídos <b>en vivo</b>. Cambias un precio y lo sabe al instante: nunca hay que resincronizar.</li>
              <li><b>Envíos por departamento</b>: {state.settings.shipping?.zones.length} zonas + resto del país{state.settings.shipping?.freeFrom ? `, gratis desde $${state.settings.shipping.freeFrom.toLocaleString('es-CO')}` : ''}.</li>
              <li><b>Promociones vivas</b>: {liveTierDiscounts(state).map(d => d.title).join(', ') || 'ninguna'}. Cuando una promo vence, deja de mencionarla sola (no hay que quitarla del prompt a mano).</li>
              <li><b>Pagos</b>: transferencia{state.settings.cod?.enabled ? ' y contra entrega (con sus límites)' : ''}.</li>
            </ul>
          </Card>
        </div>
        <Sandbox />
      </div>
    </div>
  );
}

// Probar al asistente sobre una COPIA del estado: no crea pedidos ni tareas de verdad.
function Sandbox() {
  const { state } = useStore();
  const [log, setLog] = useState([]);
  const [text, setText] = useState('');
  const sim = useRef(null);
  const reset = () => { sim.current = null; setLog([]); };
  const send = t => {
    t = (t ?? text).trim(); if (!t) return; setText('');
    if (!sim.current) {
      const st = structuredClone(state);
      const c = { id: 'prueba', name: 'Cliente de prueba', email: '', phone: '', city: '', tags: [], marketing: false };
      st.customers.push(c);
      const cv = { id: 'cv-prueba', contactId: 'prueba', channel: 'web', status: 'abierta', messages: [], updatedAt: new Date().toISOString() };
      st.conversations.push(cv);
      sim.current = st;
    }
    const st = sim.current; const cv = st.conversations.find(x => x.id === 'cv-prueba');
    const replies = think(st, cv, t);
    const extra = [];
    const task = st.tasks.find(x => x.contactId === 'prueba' && !x.seen); if (task) { task.seen = true; extra.push(`(Se crearía la tarea «${task.title}»)`); }
    const order = st.orders.find(o => o.customerId === 'prueba' && !o.seen); if (order) { order.seen = true; extra.push(`(Se crearía el pedido #${order.number})`); }
    setLog(l => [...l, { me: true, text: t }, ...replies.map(r => ({ text: r.text })), ...extra.map(x => ({ note: true, text: x }))]);
  };
  return (
    <Card title="Probar la conversación" actions={<Btn icon={RotateCcw} onClick={reset}>Reiniciar</Btn>}>
      <p className="muted sm" style={{ marginTop: 0 }}>Escribe como un cliente. Es una prueba: no crea pedidos ni tareas de verdad.</p>
      <div className="sandbox">
        {!log.length && <div className="muted sm center-t"><Bot size={22} /><br />Prueba: «¿Precio?», «¿cuánto vale el envío a Cali?», «quiero 2 blend espresso».</div>}
        {log.map((m, i) => <div key={i} className={'bubble ' + (m.me ? 'cliente' : m.note ? 'aviso' : 'asistente')}><span style={{ whiteSpace: 'pre-line' }}>{m.text}</span></div>)}
      </div>
      <div className="chips">{['¿Precio?', 'Hola, ¿tienen café de Nariño?', '¿Cuánto cuesta el envío a Bogotá?', '¿Tienen promociones?', 'Quiero 2 blend espresso', 'Soy Laura Gómez, 3001234567, Medellín, Calle 10 # 43-21', 'Contra entrega', '¿Tienen té matcha?'].map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>
      <div className="row" style={{ flexWrap: 'nowrap' }}><input className="input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Escribe como cliente…" aria-label="Mensaje de prueba" /><Btn icon={Send} variant="primary" onClick={() => send()}>Enviar</Btn></div>
      <p className="muted sm"><Badge tone="purple">Motor local</Badge> Entiende productos, cantidades, ciudades, envíos, promociones, pagos y datos de entrega. Con un proveedor de IA conectado, redactará con más naturalidad usando las mismas reglas.</p>
    </Card>
  );
}
