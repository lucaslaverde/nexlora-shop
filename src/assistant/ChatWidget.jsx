import React, { useContext, useEffect, useRef, useState } from 'react';
import { useStore, money } from '../store.jsx';
import { ShopCtx } from '../sections/registry.jsx';
import { ensureContact, conversationFor, pushMessage, log, moveDeal } from '../crm/engine.js';
import { think, assistantMode } from './brain.js';
import { uid } from '../seed.js';

const KEY = 'nx-chat-contact';

// Burbuja de chat en la tienda: cada visitante es un contacto del CRM y su chat
// aparece en Conversaciones del panel (canal «web»).
export default function ChatWidget() {
  const { state, mutate } = useStore();
  const shop = useContext(ShopCtx);
  const A = state.settings.assistant;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [cid, setCid] = useState(() => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } });
  const boxRef = useRef(null);
  const cv = cid && (state.conversations || []).find(c => c.contactId === cid && c.channel === 'web');
  const msgs = cv?.messages || [];
  useEffect(() => { boxRef.current?.scrollTo(0, 1e9); }, [msgs.length, open]);

  const send = e => {
    e?.preventDefault();
    const t = text.trim(); if (!t) return;
    setText('');
    let newId = cid;
    mutate(st => {
      let c = cid && st.customers.find(x => x.id === cid);
      if (!c) {
        c = ensureContact(st, { name: 'Visitante web ' + uid('').slice(-4), source: 'Chat web', lead: false });
        newId = c.id;
      }
      const conv = conversationFor(st, c.id, 'web');
      pushMessage(st, conv, 'cliente', t);
      log(st, 'chat_recibido', c.id, { canal: 'web', texto: t });
      if (conv.messages.filter(m => m.from === 'cliente').length === 1) moveDeal(st, { pipelineId: 'chat', stageId: 'nuevo', contactId: c.id, title: 'Chat web' });
      if (conv.status === 'humano') return; // un asesor tomó el chat: el asistente no responde
      const replies = think(st, conv, t);
      const mode = assistantMode(st);
      for (const r of replies) {
        if (mode === 'sugerido') pushMessage(st, conv, 'sugerencia', r.text, { products: r.products });
        else pushMessage(st, conv, 'asistente', r.text, { products: r.products });
      }
      if (mode === 'sugerido' && replies.length && !conv.messages.some(m => m.from === 'aviso')) pushMessage(st, conv, 'aviso', 'Un asesor revisa tu mensaje y te responde en un momento 🙌');
      conv.unread = (conv.unread || 0);
    });
    if (newId !== cid) { setCid(newId); try { localStorage.setItem(KEY, newId); } catch { /* */ } }
  };

  if (!open) {
    return <button className="ch-bubble" onClick={() => setOpen(true)} aria-label={`Chatear con ${A.name}`}>💬<span>¿Te ayudo?</span></button>;
  }
  const visible = msgs.filter(m => m.from !== 'sugerencia');
  return (
    <div className="ch-panel" role="dialog" aria-label={`Chat con ${A.name}`}>
      <header><div className="ch-ava">{A.name[0]}</div><div><b>{A.name}</b><small>{state.settings.storeName} · responde al instante</small></div><button onClick={() => setOpen(false)} aria-label="Cerrar chat">×</button></header>
      <div className="ch-msgs" ref={boxRef}>
        <div className="ch-msg bot">{A.greeting}</div>
        {visible.map((m, i) => (
          <div key={i} className={'ch-msg ' + (m.from === 'cliente' ? 'me' : m.from === 'aviso' ? 'note' : 'bot')}>
            <span style={{ whiteSpace: 'pre-line' }}>{m.text}</span>
            {!!m.products?.length && <div className="ch-prods">{m.products.map(id => { const p = state.products.find(x => x.id === id); return p && (
              <div key={id} className="ch-prod"><img src={p.image} alt="" /><div><b>{p.title}</b><small>{money(p.price, state.settings)}</small></div>
                <button disabled={p.stock <= 0} onClick={() => shop.add(p)}>{p.stock <= 0 ? 'Agotado' : 'Agregar'}</button></div>
            ); })}</div>}
          </div>
        ))}
      </div>
      {!msgs.length && <div className="ch-quick">{['¿Qué café me recomiendas?', '¿Cuánto vale el envío a Bogotá?', '¿Tienen promociones?'].map(q => <button key={q} onClick={() => setText(q)}>{q}</button>)}</div>}
      <form onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} placeholder="Escribe tu mensaje…" aria-label="Mensaje" /><button aria-label="Enviar">➤</button></form>
    </div>
  );
}
