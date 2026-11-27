import React, { useState } from 'react';
import { Plus, Trash2, Link2, Copy } from 'lucide-react';
import { useStore, money } from '../store.jsx';
import { uid } from '../seed.js';
import { orderProfit, attributedSource, sourceLabel, ATTRIBUTION_DAYS } from '../commerce/pricing.js';
import { Card, PageHead, Tabs, Btn, Field, Badge } from '../ui.jsx';
import { BarChart, salesByDay } from './Dashboard.jsx';

// Reglas de los números (las mismas de los tableros en GHL):
// · «Tienda ·» = pedidos de la tienda · «Anuncios ·» = lo que reportan/cuestan los anuncios · «Juntas ·» = mezcla de las dos.
// · Ventas reales = pagadas. Las vencidas (sin pagar) no se cancelan: quedan aparte hasta que se paguen.
// · Venta de anuncio = último clic en anuncio en los 7 días antes de comprar (por UTM).
export const isReal = o => o.payment === 'pagado';
const overdue = o => o.payment === 'pendiente' && o.codStatus !== 'rechazado' && (Date.now() - new Date(o.createdAt)) / 864e5 > 3;

export default function Analytics() {
  const [tab, setTab] = useState('tablero');
  return (
    <div className="page">
      <PageHead title="Medición" subtitle="Números honestos: cada tarjeta dice de dónde sale. Ventas reales = pagadas." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'tablero', label: 'Tablero principal' }, { id: 'anuncios', label: 'Anuncios y atribución' }, { id: 'crm', label: 'CRM, WhatsApp y juegos' }, { id: 'utm', label: 'Enlaces con UTM' }]} />
      {tab === 'tablero' && <Main />}
      {tab === 'anuncios' && <Ads />}
      {tab === 'crm' && <Crm />}
      {tab === 'utm' && <UtmBuilder />}
    </div>
  );
}

function Kpi({ prefix, label, value, note }) {
  return <div className="kpi"><span><em className={'pfx pfx-' + prefix.toLowerCase()}>{prefix} ·</em> {label}</span><b>{value}</b>{note && <small>{note}</small>}</div>;
}

function Main() {
  const { state } = useStore();
  const S = state.settings;
  const real = state.orders.filter(isReal);
  const realSum = real.reduce((s, o) => s + o.total, 0);
  const pend = state.orders.filter(o => o.payment === 'pendiente' && o.codStatus !== 'rechazado');
  const over = state.orders.filter(overdue);
  const profit = real.reduce((s, o) => s + orderProfit(state, o).profit, 0);
  const spend = (state.adSpend || []).reduce((s, g) => s + g.amount, 0);
  const byChannel = {};
  real.forEach(o => { byChannel[o.channel] = (byChannel[o.channel] || 0) + o.total; });
  const ch = Object.entries(byChannel).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...ch.map(c => c[1]));
  const byProduct = {};
  real.forEach(o => o.items.forEach(i => { byProduct[i.title] = (byProduct[i.title] || 0) + i.price * i.qty - (i.tierOff || 0); }));
  const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxP = Math.max(1, ...top.map(t => t[1]));
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi prefix="Tienda" label="Ventas reales (pagadas)" value={money(realSum, S)} note={`${real.length} pedidos`} />
        <Kpi prefix="Tienda" label="Por cobrar" value={money(pend.reduce((s, o) => s + o.total, 0), S)} note={`${pend.length} pedidos · ${over.length} vencidos (+3 días)`} />
        <Kpi prefix="Tienda" label="Ganancia real" value={money(profit, S)} note={realSum ? `${Math.round((profit / realSum) * 100)} % de las ventas reales` : ''} />
        <Kpi prefix="Juntas" label="ROAS total" value={spend ? (realSum / spend).toFixed(2) + 'x' : '—'} note={`ventas reales ÷ gasto en anuncios (${money(spend, S)})`} />
      </div>
      <Card title="Tienda · Ventas reales por día"><BarChart data={salesByDay(real, 30)} settings={S} height={190} /></Card>
      <div className="grid-2">
        <Card title="Tienda · Ventas reales por canal">{ch.map(([t, v]) => <div key={t} className="hbar"><span>{t}</span><div><i style={{ width: (v / max) * 100 + '%' }} /></div><b>{money(v, S)}</b></div>)}{!ch.length && <p className="muted">Sin ventas pagadas todavía.</p>}</Card>
        <Card title="Tienda · Productos que más venden">{top.map(([t, v]) => <div key={t} className="hbar"><span>{t}</span><div><i style={{ width: (v / maxP) * 100 + '%' }} /></div><b>{money(v, S)}</b></div>)}</Card>
      </div>
      {over.length > 0 && <Card title="Tienda · Ventas vencidas (sin pagar hace más de 3 días)"><p className="muted sm" style={{ marginTop: 0 }}>No se cancelan solas: quedan fuera de las ventas reales hasta que se paguen.</p>{over.map(o => <div key={o.id} className="row between"><a className="link" href={'#/pedidos/' + o.id}>#{o.number}</a><span>{money(o.total, S)}</span></div>)}</Card>}
    </div>
  );
}

function Ads() {
  const { state, mutate } = useStore();
  const S = state.settings;
  const real = state.orders.filter(isReal);
  const attributed = real.map(o => ({ o, u: attributedSource(o) }));
  const bySource = {};
  for (const { o, u } of attributed) { const k = u ? sourceLabel(u.source) : 'Sin anuncio'; (bySource[k] ||= { n: 0, v: 0, camps: {} }); bySource[k].n++; bySource[k].v += o.total; if (u) { const c = u.campaign || '(sin campaña)'; bySource[k].camps[c] = (bySource[k].camps[c] || 0) + o.total; } }
  const spendBy = ch => (state.adSpend || []).filter(g => g.channel === ch).reduce((s, g) => s + g.amount, 0);
  return (
    <div className="stack">
      <Card><p className="muted sm" style={{ margin: 0 }}>Una venta cuenta para un anuncio si hubo <b>clic en ese anuncio en los {ATTRIBUTION_DAYS} días anteriores a la compra</b> (último clic), leyendo las UTM de la visita. Es la misma regla de Meta, pero con ventas <b>pagadas</b>. Por eso nunca va a coincidir exacto con el Ads Manager, que cuenta checkouts sin pagar, vistas y otros dispositivos.</p></Card>
      <div className="kpis">
        {['Meta', 'Google'].map(ch => { const v = bySource[ch]?.v || 0; const sp = spendBy(ch); return <Kpi key={ch} prefix="Juntas" label={`ROAS ${ch}`} value={sp ? (v / sp).toFixed(2) + 'x' : '—'} note={`${money(v, S)} en ventas reales ÷ ${money(sp, S)} de gasto`} />; })}
        <Kpi prefix="Tienda" label="Ventas sin anuncio" value={money(bySource['Sin anuncio']?.v || 0, S)} note={`${bySource['Sin anuncio']?.n || 0} pedidos (directo u orgánico)`} />
      </div>
      <Card title="Tienda · Ventas reales por anuncio" pad={false}>
        <table className="table"><thead><tr><th>Origen</th><th>Campaña</th><th className="r">Ventas reales</th></tr></thead>
          <tbody>{Object.entries(bySource).filter(([k]) => k !== 'Sin anuncio').flatMap(([k, x]) => Object.entries(x.camps).map(([c, v]) => <tr key={k + c}><td><Badge tone="blue">{k}</Badge></td><td>{c}</td><td className="r">{money(v, S)}</td></tr>))}</tbody></table>
      </Card>
      <Card title="Anuncios · Gasto por mes" actions={<Btn icon={Plus} onClick={() => mutate(st => st.adSpend.push({ id: uid('g'), channel: 'Meta', month: new Date().toISOString().slice(0, 7), amount: 0 }))}>Agregar gasto</Btn>}>
        <p className="muted sm" style={{ marginTop: 0 }}>Mientras no se conecten las cuentas publicitarias, el gasto se anota aquí a mano (lo que diga cada plataforma).</p>
        {(state.adSpend || []).map((g, i) => (
          <div key={g.id} className="menu-row four">
            <select className="input" value={g.channel} onChange={e => mutate(st => { st.adSpend[i].channel = e.target.value; })} aria-label="Canal">{['Meta', 'Google', 'TikTok'].map(c => <option key={c}>{c}</option>)}</select>
            <input className="input" type="month" value={g.month} onChange={e => mutate(st => { st.adSpend[i].month = e.target.value; })} aria-label="Mes" />
            <input className="input" type="number" value={g.amount} onChange={e => mutate(st => { st.adSpend[i].amount = +e.target.value; })} aria-label="Gasto" />
            <button className="icon-btn" onClick={() => mutate(st => { st.adSpend.splice(i, 1); })} aria-label="Quitar"><Trash2 size={15} /></button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Crm() {
  const { state } = useStore();
  const S = state.settings;
  const ev = state.events || [];
  // Embudo de WhatsApp de los flujos: enviados → respondieron → compraron (7 días después del envío).
  const sent = ev.filter(e => e.type === 'whatsapp_enviado');
  const contactsSent = [...new Set(sent.map(e => e.contactId))];
  const firstSent = id => sent.filter(e => e.contactId === id).map(e => e.at).sort()[0];
  const replied = contactsSent.filter(id => ev.some(e => e.contactId === id && e.type === 'chat_recibido' && e.at > firstSent(id)));
  const bought = contactsSent.filter(id => state.orders.some(o => o.customerId === id && o.createdAt > firstSent(id) && (new Date(o.createdAt) - new Date(firstSent(id))) / 864e5 <= 7));
  const g = (state.games || []).reduce((a, x) => ({ views: a.views + x.stats.views, plays: a.plays + x.stats.plays, leads: a.leads + x.stats.leads, redeemed: a.redeemed + x.stats.redeemed, revenue: a.revenue + x.stats.revenue }), { views: 0, plays: 0, leads: 0, redeemed: 0, revenue: 0 });
  const cod = state.orders.filter(o => o.paymentMethod === 'contraentrega');
  const ok = cod.filter(o => o.codStatus === 'confirmado').length; const no = cod.filter(o => o.codStatus === 'rechazado').length;
  const chats = state.orders.filter(o => ['WhatsApp', 'Chat web', 'Instagram'].includes(o.channel));
  const Step = ({ v, l, base }) => <div className="funnel-step"><b>{v}</b><span>{l}</span>{base != null && <small>{base ? Math.round((v / base) * 100) : 0} %</small>}</div>;
  return (
    <div className="stack">
      <Card title="CRM · WhatsApp de los flujos"><div className="funnel"><Step v={contactsSent.length} l="Recibieron mensaje" /><Step v={replied.length} l="Respondieron" base={contactsSent.length} /><Step v={bought.length} l="Compraron en 7 días" base={contactsSent.length} /></div>
        <p className="muted sm">«Leyeron» y «clic» llegan cuando se conecte la API oficial de WhatsApp. Mientras tanto se mide lo que sí se sabe con certeza: respuestas y compras.</p></Card>
      <Card title="Tienda · Juegos con premio"><div className="funnel"><Step v={g.views} l="Vieron un juego" /><Step v={g.plays} l="Jugaron" base={g.views} /><Step v={g.leads} l="Dejaron contacto" base={g.plays} /><Step v={g.redeemed} l="Canjearon" base={g.leads} /><div className="funnel-step money"><b>{money(g.revenue, S)}</b><span>Ventas con códigos de juegos</span><small>{g.views ? money(g.revenue / g.views, S) : '—'} por visitante</small></div></div></Card>
      <div className="grid-2">
        <Card title="Tienda · Contra entrega"><div className="funnel"><Step v={cod.length} l="Pedidos" /><Step v={ok} l="Confirmados" base={cod.length} /><Step v={no} l="Rechazados" base={cod.length} /></div><p className="muted sm">Tasa de rechazo: {cod.length ? Math.round((no / cod.length) * 100) : 0} %. Si sube, revisa los departamentos permitidos y el monto máximo.</p></Card>
        <Card title="CRM · Ventas por chat"><div className="kpis two"><Kpi prefix="Tienda" label="Pedidos por chat" value={chats.length} /><Kpi prefix="Tienda" label="Ventas reales por chat" value={money(chats.filter(isReal).reduce((s, o) => s + o.total, 0), S)} /></div></Card>
      </div>
    </div>
  );
}

// Generador de enlaces con UTM (para que cada venta por anuncio se pueda medir).
function UtmBuilder() {
  const [f, setF] = useState({ url: location.href.split('#')[0], path: '#/tienda', source: 'meta', medium: 'paid', campaign: 'black-friday', content: '' });
  const [copied, setCopied] = useState(false);
  const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const q = new URLSearchParams({ utm_source: f.source, utm_medium: f.medium, utm_campaign: slug(f.campaign), ...(f.content ? { utm_content: slug(f.content) } : {}) });
  const link = `${f.url}?${q}${f.path}`;
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (
    <Card title="Enlaces con UTM para tus anuncios">
      <p className="muted sm" style={{ marginTop: 0 }}>Sin UTM, una venta de Google o de Meta se ve como «directa». Usa este enlace en el anuncio (o en la plantilla de seguimiento de Google Ads) y la venta quedará atribuida.</p>
      <div className="grid-3">
        <Field label="Plataforma"><select className="input" value={f.source} onChange={set('source')}><option value="meta">Meta (Facebook / Instagram)</option><option value="google">Google</option><option value="tiktok">TikTok</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></Field>
        <Field label="Tipo"><select className="input" value={f.medium} onChange={set('medium')}><option value="paid">Pago (anuncio)</option><option value="cpc">CPC (búsqueda)</option><option value="social">Orgánico en redes</option><option value="message">Mensaje</option></select></Field>
        <Field label="Página de destino"><select className="input" value={f.path} onChange={set('path')}><option value="#/tienda">Inicio</option><option value="#/tienda/coleccion/cafes">Colección Cafés</option><option value="#/tienda/coleccion/accesorios">Accesorios</option></select></Field>
        <Field label="Campaña"><input className="input" value={f.campaign} onChange={set('campaign')} /></Field>
        <Field label="Anuncio (opcional)"><input className="input" value={f.content} onChange={set('content')} placeholder="video-cosecha" /></Field>
      </div>
      <div className="utm-out"><Link2 size={16} /><code>{link}</code><Btn icon={Copy} onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copiado' : 'Copiar'}</Btn></div>
      {f.source === 'google' && <p className="muted sm">En Google Ads puedes ponerlo como plantilla de seguimiento: {'{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}'}</p>}
    </Card>
  );
}
