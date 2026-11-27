import React, { useState } from 'react';
import { Gift, Plus, Trash2, Eye, RotateCcw } from 'lucide-react';
import { useStore, money } from '../store.jsx';
import { uid } from '../seed.js';
import { GamePlayer, GAME_TYPES } from '../games/GameHost.jsx';
import { themeVars } from '../sections/registry.jsx';
import { Card, Badge, PageHead, Btn, Field, Toggle, Empty } from '../ui.jsx';

const TRIGGER_NAMES = { tiempo: 'A los X segundos', salida: 'Cuando va a salir', scroll: 'Al bajar la mitad de la página' };
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export default function Games({ id }) {
  if (id) return <GameEditor id={id} />;
  return <GameList />;
}

function Funnel({ g, S }) {
  const s = g.stats;
  const steps = [['Lo vieron', s.views], ['Jugaron', s.plays], ['Dejaron contacto', s.leads], ['Canjearon el código', s.redeemed]];
  return (
    <div className="funnel">
      {steps.map(([l, v], i) => <div key={l} className="funnel-step"><b>{v}</b><span>{l}</span>{i > 0 && <small>{pct(v, steps[i - 1][1])} %</small>}</div>)}
      <div className="funnel-step money"><b>{money(s.revenue, S)}</b><span>Ventas con sus códigos</span><small>{s.views ? money(s.revenue / s.views, S) : '—'} por visitante</small></div>
    </div>
  );
}

function GameList() {
  const { state, mutate } = useStore();
  const S = state.settings;
  const add = type => { const id = uid('g'); mutate(st => st.games.push({ id, type, name: GAME_TYPES[type] + ' nueva', active: false, trigger: { type: 'tiempo', seconds: 8 }, position: 'centro', pages: 'todas', frequency: 'una-vez', ask: 'despues', texts: { title: '¡Juega y gana!', subtitle: '', cta: 'Jugar', win: '¡Ganaste {{premio}}!', lose: 'Esta vez no salió.', claim: 'Recibir mi código' }, prizes: [{ id: 'p1', label: '10 % OFF', kind: 'porcentaje', value: 10, weight: 70, color: '#7a3e1d' }, { id: 'p2', label: 'Envío gratis', kind: 'envio', value: 0, weight: 30, color: '#e9b872' }], question: type === 'quiz' ? { options: [{ label: 'Opción 1', tag: 'opcion-1' }, { label: 'Opción 2', tag: 'opcion-2' }] } : undefined, codeDays: 7, minSubtotal: 0, stats: { views: 0, plays: 0, wins: 0, leads: 0, redeemed: 0, revenue: 0 } })); location.hash = '#/juegos/' + id; };
  return (
    <div className="page">
      <PageHead title="Juegos y premios" subtitle="Ruleta, raspa y gana, caja misteriosa y cuestionarios que entregan códigos únicos de verdad. Sin apps." />
      <Card>
        <p className="muted sm" style={{ margin: 0 }}>💡 Los juegos suelen convertir unas 2 veces más que un popup normal, pero un estudio de 2026 vio que a veces traen clics y no clientes. Por eso aquí cada juego mide <b>ventas por visitante</b>, y no solo cuánta gente juega. El correo o WhatsApp se pide <b>al final</b>, cuando ya ganó, porque así se registra más gente.</p>
      </Card>
      <div className="row">{Object.entries(GAME_TYPES).map(([k, v]) => <Btn key={k} icon={Plus} onClick={() => add(k)}>{v}</Btn>)}</div>
      {state.games.map(g => (
        <Card key={g.id}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <div><a className="link" href={'#/juegos/' + g.id}><b>{g.name}</b></a> <Badge>{GAME_TYPES[g.type]}</Badge> {g.active ? <Badge tone="green">activo</Badge> : <Badge>pausado</Badge>}
              <div className="muted sm">{TRIGGER_NAMES[g.trigger.type]}{g.trigger.type === 'tiempo' ? ` (${g.trigger.seconds} s)` : ''} · {g.prizes.length} premios · el código dura {g.codeDays} días</div></div>
            <Toggle checked={g.active} onChange={v => mutate(st => { for (const x of st.games) if (v && x.id !== g.id) x.active = false; st.games.find(x => x.id === g.id).active = v; })} />
          </div>
          <Funnel g={g} S={S} />
        </Card>
      ))}
      <p className="muted sm">Solo un juego activo a la vez, para no saturar al visitante. Las cifras de la ruleta son de ejemplo; las de los demás arrancan en cero.</p>
    </div>
  );
}

function GameEditor({ id }) {
  const { state, mutate } = useStore();
  const g = state.games.find(x => x.id === id);
  const [prev, setPrev] = useState(0);
  if (!g) return <div className="page"><Empty title="Juego no encontrado" /></div>;
  const S = state.settings;
  const edit = fn => mutate(st => fn(st.games.find(x => x.id === id)));
  const totalW = g.prizes.reduce((s, p) => s + (+p.weight || 0), 0);
  const tx = (k, label) => <Field label={label}><input className="input" value={g.texts[k] || ''} onChange={e => edit(x => { x.texts[k] = e.target.value; })} /></Field>;
  return (
    <div className="page">
      <PageHead back="#/juegos" title={g.name} subtitle={GAME_TYPES[g.type]} actions={<><Btn icon={RotateCcw} onClick={() => { try { localStorage.removeItem('nx-game-' + g.id); } catch { /* */ } }}>Volver a mostrarlo en mi navegador</Btn><Btn icon={Eye} variant="primary" onClick={() => setPrev(prev + 1)}>Probar aquí</Btn></>} />
      <div className="grid-main">
        <div className="stack">
          <Card title="General">
            <div className="grid-2">
              <Field label="Nombre interno"><input className="input" value={g.name} onChange={e => edit(x => { x.name = e.target.value; })} /></Field>
              <Field label="Cuándo aparece"><select className="input" value={g.trigger.type} onChange={e => edit(x => { x.trigger.type = e.target.value; })}>{Object.entries(TRIGGER_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              {g.trigger.type === 'tiempo' && <Field label="Segundos"><input className="input" type="number" min="0" value={g.trigger.seconds} onChange={e => edit(x => { x.trigger.seconds = +e.target.value; })} /></Field>}
              <Field label="Dónde se ve"><select className="input" value={g.position} onChange={e => edit(x => { x.position = e.target.value; })}><option value="centro">Centrado (ventana)</option><option value="derecha">Tarjeta a la derecha</option><option value="abajo">Hoja desde abajo</option></select></Field>
              <Field label="Pedir WhatsApp o correo"><select className="input" value={g.ask} onChange={e => edit(x => { x.ask = e.target.value; })}><option value="despues">Al final, para entregar el código (recomendado)</option><option value="nunca">No pedir (código directo)</option></select></Field>
              <Field label="El código dura (días)"><input className="input" type="number" min="1" value={g.codeDays} onChange={e => edit(x => { x.codeDays = +e.target.value; })} /></Field>
              <Field label="Compra mínima para usarlo"><input className="input" type="number" min="0" value={g.minSubtotal} onChange={e => edit(x => { x.minSubtotal = +e.target.value; })} /></Field>
            </div>
          </Card>
          <Card title="Textos">
            <div className="grid-2">{tx('title', 'Título')}{tx('subtitle', 'Subtítulo')}{g.type === 'ruleta' && tx('cta', 'Botón para jugar')}{tx('win', 'Si gana ({{premio}})')}{tx('lose', 'Si no gana')}{tx('claim', 'Botón para recibir el código')}</div>
          </Card>
          {g.type === 'quiz' && (
            <Card title="Respuestas (cada una pone una etiqueta al contacto)">
              {g.question.options.map((o, i) => (
                <div key={i} className="menu-row three">
                  <input className="input" value={o.label} onChange={e => edit(x => { x.question.options[i].label = e.target.value; })} aria-label="Respuesta" />
                  <input className="input mono" value={o.tag} onChange={e => edit(x => { x.question.options[i].tag = e.target.value; })} aria-label="Etiqueta" />
                  <select className="input" value={o.productId || ''} onChange={e => edit(x => { x.question.options[i].productId = e.target.value; })} aria-label="Producto recomendado"><option value="">Sin recomendación</option>{state.products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
                </div>
              ))}
              <Btn icon={Plus} onClick={() => edit(x => { x.question.options.push({ label: 'Nueva respuesta', tag: 'respuesta' }); })}>Agregar respuesta</Btn>
            </Card>
          )}
          <Card title="Premios y probabilidades" actions={<span className="muted sm">El premio se decide antes de animar, como en un CRM.</span>}>
            {g.prizes.map((p, i) => (
              <div key={p.id} className="prize-row">
                <input type="color" value={p.color} onChange={e => edit(x => { x.prizes[i].color = e.target.value; })} aria-label="Color" />
                <input className="input" value={p.label} onChange={e => edit(x => { x.prizes[i].label = e.target.value; })} aria-label="Texto del premio" />
                <select className="input" value={p.kind} onChange={e => edit(x => { x.prizes[i].kind = e.target.value; })} aria-label="Tipo"><option value="porcentaje">% de descuento</option><option value="fijo">$ de descuento</option><option value="envio">Envío gratis</option><option value="nada">Sin premio</option></select>
                <input className="input" type="number" value={p.value} disabled={p.kind === 'envio' || p.kind === 'nada'} onChange={e => edit(x => { x.prizes[i].value = +e.target.value; })} aria-label="Valor" />
                <input className="input" type="number" min="0" value={p.weight} onChange={e => edit(x => { x.prizes[i].weight = +e.target.value; })} aria-label="Peso" />
                <span className="muted sm">{pct(+p.weight || 0, totalW)} %</span>
                <button className="icon-btn" onClick={() => edit(x => { x.prizes.splice(i, 1); })} aria-label="Quitar premio"><Trash2 size={15} /></button>
              </div>
            ))}
            <Btn icon={Plus} onClick={() => edit(x => { x.prizes.push({ id: uid('p'), label: 'Nuevo premio', kind: 'porcentaje', value: 5, weight: 10, color: '#888888' }); })}>Agregar premio</Btn>
            <p className="muted sm">Cada premio entregado es un código único, de un solo uso y personal. Si se canjea, la venta cuenta para este juego.</p>
          </Card>
          <Card title="Resultados"><Funnel g={g} S={S} /></Card>
        </div>
        <div className="stack">
          <Card title="Vista previa">
            <div className="sf game-prev" style={themeVars(state.theme)}>{prev > 0 ? <GamePlayer key={prev} game={g} preview onClose={() => setPrev(0)} /> : <div className="center muted" style={{ padding: 30 }}><Gift size={28} /><p>Pulsa «Probar aquí» para jugarlo (no cuenta en las cifras).</p></div>}</div>
          </Card>
          <Card><div className="row between"><b>Activo en la tienda</b><Toggle checked={g.active} onChange={v => mutate(st => { for (const x of st.games) if (v && x.id !== g.id) x.active = false; st.games.find(x => x.id === g.id).active = v; })} /></div></Card>
        </div>
      </div>
    </div>
  );
}
