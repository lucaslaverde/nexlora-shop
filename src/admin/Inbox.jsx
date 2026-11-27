import React, { useState } from 'react';
import { MessageCircle, Instagram, Globe, Bot, UserCheck, Send, Check, Trash2, Sparkles } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { pushMessage, log } from '../crm/engine.js';
import { think, assistantMode } from '../assistant/brain.js';
import { Card, Badge, PageHead, Tabs, Btn, Empty } from '../ui.jsx';

const CH = { whatsapp: { icon: MessageCircle, label: 'WhatsApp' }, instagram: { icon: Instagram, label: 'Instagram' }, web: { icon: Globe, label: 'Chat web' } };

export default function Inbox({ id }) {
  const { state, mutate } = useStore();
  const [filter, setFilter] = useState('todas');
  const convs = [...(state.conversations || [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter(c => filter === 'todas' || (filter === 'sugerencias' ? c.messages.some(m => m.from === 'sugerencia') : filter === 'humano' ? c.status === 'humano' : c.channel === filter));
  const sel = (state.conversations || []).find(c => c.id === id) || convs[0];
  const pending = (state.conversations || []).filter(c => c.messages.some(m => m.from === 'sugerencia')).length;
  const mode = assistantMode(state);
  return (
    <div className="page wide">
      <PageHead title="Conversaciones" subtitle={`WhatsApp, Instagram y el chat de la tienda en un solo lugar. Asistente ${state.settings.assistant?.name}: ${mode === 'automatico' ? 'responde solo' : 'sugiere y tú apruebas'}.`}
        actions={<a className="btn" href="#/asistente"><Bot size={16} />Configurar asistente</a>} />
      <Tabs value={filter} onChange={setFilter} tabs={[{ id: 'todas', label: 'Todas' }, { id: 'sugerencias', label: 'Por aprobar', count: pending }, { id: 'humano', label: 'Con asesor' }, { id: 'whatsapp', label: 'WhatsApp' }, { id: 'instagram', label: 'Instagram' }, { id: 'web', label: 'Web' }]} />
      <div className="inbox">
        <div className="inbox-list">
          {convs.map(c => {
            const ct = state.customers.find(x => x.id === c.contactId); const last = c.messages[c.messages.length - 1]; const I = CH[c.channel]?.icon || MessageCircle;
            return (
              <a key={c.id} href={'#/conversaciones/' + c.id} className={'inbox-item' + (sel?.id === c.id ? ' on' : '')} onClick={() => mutate(st => { const x = st.conversations.find(y => y.id === c.id); if (x) x.unread = 0; })}>
                <I size={16} /><div><b>{ct?.name || 'Contacto'}</b><span>{last?.text?.slice(0, 60) || '—'}</span></div>
                <div className="inbox-meta">{c.unread > 0 && <em>{c.unread}</em>}{c.messages.some(m => m.from === 'sugerencia') && <Badge tone="purple">aprobar</Badge>}{c.status === 'humano' && <Badge tone="blue">asesor</Badge>}</div>
              </a>
            );
          })}
          {!convs.length && <p className="muted pad">No hay conversaciones aquí.</p>}
        </div>
        {sel ? <Thread cv={sel} /> : <Empty title="Sin conversaciones" />}
      </div>
    </div>
  );
}

function Thread({ cv }) {
  const { state, mutate } = useStore();
  const [text, setText] = useState('');
  const ct = state.customers.find(x => x.id === cv.contactId);
  const S = state.settings;
  const tasks = (state.tasks || []).filter(t => t.contactId === cv.contactId && !t.done);
  const deals = (state.deals || []).filter(d => d.contactId === cv.contactId);
  const edit = fn => mutate(st => fn(st.conversations.find(x => x.id === cv.id), st));
  const reply = () => { const t = text.trim(); if (!t) return; setText(''); edit((c, st) => { pushMessage(st, c, 'asesor', t); c.status = 'humano'; log(st, 'chat_respondido', c.contactId, { canal: c.channel }); }); };
  // Pedirle al asistente que responda el último mensaje del cliente (sirve para probar y para chats viejos).
  const suggest = () => edit((c, st) => {
    const lastClient = [...c.messages].reverse().find(m => m.from === 'cliente');
    if (!lastClient) return;
    for (const r of think(st, c, lastClient.text)) pushMessage(st, c, 'sugerencia', r.text, { products: r.products });
  });
  const ses = cv.session;
  return (
    <div className="thread">
      <div className="thread-h">
        <div><b>{ct?.name}</b><span className="muted sm"> · {CH[cv.channel]?.label}{ct?.phone ? ` · ${ct.phone}` : ''}{ct?.handle ? ` · ${ct.handle}` : ''}</span></div>
        <div className="row">
          <a className="btn sm" href={'#/clientes/' + cv.contactId}>Ficha</a>
          {cv.status === 'humano' ? <Btn icon={Bot} onClick={() => edit(c => { c.status = 'abierta'; })}>Devolver al asistente</Btn> : <Btn icon={UserCheck} onClick={() => edit(c => { c.status = 'humano'; })}>Tomar el chat</Btn>}
        </div>
      </div>
      <div className="thread-msgs">
        {cv.messages.map((m, i) => (
          <div key={i} className={'bubble ' + m.from}>
            {m.from === 'sugerencia' && <div className="bubble-tag"><Sparkles size={12} /> Sugerencia del asistente</div>}
            {m.from === 'tienda' && m.template && <div className="bubble-tag">Plantilla {m.template}{m.workflow ? ` · ${m.workflow}` : ''}</div>}
            <span style={{ whiteSpace: 'pre-line' }}>{m.text}</span>
            {!!m.products?.length && <div className="bubble-prods">{m.products.map(pid => { const p = state.products.find(x => x.id === pid); return p && <span key={pid}>{p.title} · {money(p.price, S)}</span>; })}</div>}
            <small>{fmtDate(m.at)}{m.from === 'asistente' ? ' · asistente' : m.from === 'asesor' ? ' · asesor' : ''}</small>
            {m.from === 'sugerencia' && <div className="row"><Btn icon={Check} variant="primary" onClick={() => edit(c => { c.messages[i].from = 'asistente'; c.messages = c.messages.filter(x => x.from !== 'aviso'); })}>Enviar</Btn><Btn icon={Trash2} onClick={() => edit(c => { c.messages.splice(i, 1); })}>Descartar</Btn></div>}
          </div>
        ))}
      </div>
      <div className="thread-in">
        <input className="input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && reply()} placeholder="Responder como asesor…" aria-label="Respuesta" />
        <Btn icon={Send} variant="primary" onClick={reply}>Enviar</Btn>
        <Btn icon={Sparkles} onClick={suggest}>Sugerir respuesta</Btn>
      </div>
      <div className="thread-side">
        {ses?.cart?.length > 0 && <div className="tip"><b>Pedido en curso:</b> {ses.cart.map(i => `${i.qty} × ${state.products.find(p => p.id === i.productId)?.title}`).join(', ')}{ses.data?.city ? ` · ${ses.data.city}` : ''}</div>}
        {tasks.map(t => <div key={t.id} className="tip">📌 {t.title} · <a className="link" href="#/pipelines/tareas">ir a tareas</a></div>)}
        {deals.map(d => <span key={d.id} className="chip-s">{state.pipelines.find(p => p.id === d.pipelineId)?.name}: {state.pipelines.find(p => p.id === d.pipelineId)?.stages.find(s => s.id === d.stageId)?.name}</span>)}
        {ct?.tags?.map(t => <Badge key={t}>{t}</Badge>)}
      </div>
    </div>
  );
}
