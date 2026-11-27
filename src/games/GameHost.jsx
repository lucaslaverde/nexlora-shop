import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, money } from '../store.jsx';
import { ensureContact, issueCode, log, moveDeal, addTag } from '../crm/engine.js';

// ------------------------------------------------------------------
// Juegos con premio para la tienda (lo aprendido de 113 widgets de Solitics):
// · El premio se decide ANTES de animar (como el winningOption que inyecta el CRM).
// · El código se entrega al final, cuando deja WhatsApp o correo (pedirlo al final duplica registros).
// · Cada paso es un evento medible: vista → jugada → premio → registro → canje → venta.
// ------------------------------------------------------------------

export const GAME_TYPES = { ruleta: 'Ruleta', raspa: 'Raspa y gana', caja: 'Caja misteriosa', quiz: 'Cuestionario' };
const KEY = id => 'nx-game-' + id;

export function pickPrize(prizes) {
  const total = prizes.reduce((s, p) => s + Math.max(0, Number(p.weight) || 0), 0);
  let r = Math.random() * total;
  for (const p of prizes) { r -= Math.max(0, Number(p.weight) || 0); if (r <= 0) return p; }
  return prizes[prizes.length - 1];
}
export const prizeText = (p, S) => (p.kind === 'porcentaje' ? `${p.value} % de descuento` : p.kind === 'fijo' ? `${money(p.value, S)} de descuento` : p.kind === 'envio' ? 'envío gratis' : 'sin premio');

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.4, rot: Math.random() * 360, hue: [32, 18, 45, 8, 200][i % 5] })), []);
  return <div className="gm-confetti" aria-hidden="true">{bits.map((b, i) => <i key={i} style={{ left: b.left + '%', animationDelay: b.delay + 's', transform: `rotate(${b.rot}deg)`, background: `hsl(${b.hue} 80% 55%)` }} />)}</div>;
}

// ---------- Ruleta ----------
function Wheel({ game, prize, onDone, onStart }) {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const n = game.prizes.length; const seg = 360 / n;
  const idx = game.prizes.findIndex(p => p.id === prize.id);
  const spin = () => {
    if (spinning) return;
    onStart?.(); setSpinning(true);
    // El centro del premio elegido termina bajo la flecha (arriba).
    const target = 360 * 6 + (360 - (idx + 0.5) * seg) + (Math.random() - 0.5) * seg * 0.5;
    setAngle(target);
    setTimeout(onDone, 4700);
  };
  const r = 100;
  const arcs = game.prizes.map((p, i) => {
    const a0 = (i * seg - 90) * Math.PI / 180; const a1 = ((i + 1) * seg - 90) * Math.PI / 180;
    const large = seg > 180 ? 1 : 0;
    const d = `M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`;
    const mid = (i + 0.5) * seg;
    // En la mitad de abajo el texto se gira 180° para que nunca quede al revés.
    const flip = mid > 90 && mid < 270;
    return <g key={p.id}><path d={d} fill={p.color || '#888'} stroke="#fff" strokeWidth="1.5" /><text transform={`rotate(${mid}) translate(0 -62)${flip ? ' rotate(180)' : ''}`} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10.5" fontWeight="700" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.35)', strokeWidth: 2 }}>{p.label}</text></g>;
  });
  return (
    <div className="gm-wheel">
      <div className="gm-pointer" />
      <svg viewBox="-105 -105 210 210" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 4.6s cubic-bezier(.12,.67,.12,1)' : 'none' }} role="img" aria-label="Ruleta de premios">
        {arcs}<circle r="16" fill="#fff" /><circle r="9" fill={game.prizes[0]?.color || '#333'} />
      </svg>
      <button className="gm-btn" onClick={spin} disabled={spinning}>{spinning ? 'Girando…' : game.texts.cta || 'Girar'}</button>
    </div>
  );
}

// ---------- Raspa y gana (canvas, se revela al 38 % raspado) ----------
function Scratch({ game, prize, onDone, onStart }) {
  const ref = useRef(null); const done = useRef(false); const started = useRef(false);
  useEffect(() => {
    const cv = ref.current; const ctx = cv.getContext('2d');
    const w = cv.width = cv.offsetWidth * 2; const h = cv.height = cv.offsetHeight * 2;
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#b9b9b9'); g.addColorStop(.5, '#e6e6e6'); g.addColorStop(1, '#a9a9a9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#555'; ctx.font = `700 ${w / 13}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('Raspa aquí', w / 2, h / 2 + w / 40);
    let down = false; let moves = 0;
    const pos = e => { const r = cv.getBoundingClientRect(); const t = e.touches?.[0] || e; return [(t.clientX - r.left) * 2, (t.clientY - r.top) * 2]; };
    const check = () => {
      const data = ctx.getImageData(0, 0, w, h).data; let clear = 0; let total = 0;
      for (let i = 3; i < data.length; i += 4 * 16) { total++; if (data[i] === 0) clear++; }
      if (!done.current && clear / total >= 0.38) { done.current = true; cv.classList.add('gone'); setTimeout(onDone, 500); }
    };
    const draw = e => {
      if (!down || done.current) return; e.preventDefault();
      if (!started.current) { started.current = true; onStart?.(); }
      const [x, y] = pos(e); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, w / 11, 0, Math.PI * 2); ctx.fill();
      if (++moves % 6 === 0) check();
    };
    const on = e => { down = true; draw(e); }; const off = () => { down = false; check(); };
    cv.addEventListener('pointerdown', on); cv.addEventListener('pointermove', draw); window.addEventListener('pointerup', off);
    cv.addEventListener('touchstart', on, { passive: false }); cv.addEventListener('touchmove', draw, { passive: false });
    return () => { cv.removeEventListener('pointerdown', on); cv.removeEventListener('pointermove', draw); window.removeEventListener('pointerup', off); cv.removeEventListener('touchstart', on); cv.removeEventListener('touchmove', draw); };
  }, []);
  return (
    <div className="gm-scratch">
      <div className="gm-scratch-prize" style={{ background: prize.color }}>{prize.kind === 'nada' ? '😅' : '🎁'} <b>{prize.label}</b></div>
      <canvas ref={ref} aria-label="Tarjeta para raspar" />
      <button className="gm-link" onClick={() => { if (!done.current) { done.current = true; onStart?.(); ref.current.classList.add('gone'); setTimeout(onDone, 400); } }}>Revelar sin raspar</button>
    </div>
  );
}

// ---------- Caja misteriosa ----------
function Boxes({ prize, onDone, onStart }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="gm-boxes">
      {[0, 1, 2].map(i => (
        <button key={i} className={'gm-box' + (open === i ? ' open' : open != null ? ' dim' : '')} disabled={open != null} aria-label={`Caja ${i + 1}`}
          onClick={() => { onStart?.(); setOpen(i); setTimeout(onDone, 1100); }}>
          <span className="gm-lid" />{open === i ? <b>{prize.label}</b> : '?'}
        </button>
      ))}
    </div>
  );
}

// ---------- Cuestionario (preferencia → etiqueta + recomendación) ----------
function Quiz({ game, onDone, onStart }) {
  return (
    <div className="gm-quiz">
      {game.question.options.map(o => <button key={o.label} className="gm-opt" onClick={() => { onStart?.(); onDone(o); }}>{o.label}</button>)}
    </div>
  );
}

// ---------- El juego completo (sirve para la tienda y para la vista previa del panel) ----------
export function GamePlayer({ game, onClose, preview = false }) {
  const { state, mutate } = useStore();
  const S = state.settings;
  const prize = useMemo(() => pickPrize(game.prizes), [game.id]);
  const [phase, setPhase] = useState('play'); // play → result → done
  const [answer, setAnswer] = useState(null);
  const [form, setForm] = useState({ contact: '', name: '', ok: true });
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const counted = useRef(false);
  const start = () => { if (counted.current || preview) return; counted.current = true; mutate(st => { const g = st.games.find(x => x.id === game.id); if (g) g.stats.plays++; }); };
  const won = prize.kind !== 'nada';
  const rec = answer && state.products.find(p => p.id === answer.productId);
  const vars = s => (s || '').replace('{{premio}}', prizeText(prize, S)).replace('{{recomendacion}}', rec?.title || '');

  const finish = (contact) => {
    if (preview) { setCode('PREVIA-123'); setPhase('done'); return; }
    let issued = '';
    mutate(st => {
      const g = st.games.find(x => x.id === game.id);
      let c = null;
      if (contact) {
        const isMail = contact.includes('@');
        c = ensureContact(st, { name: form.name || (isMail ? contact.split('@')[0] : 'Jugador'), email: isMail ? contact : '', phone: isMail ? '' : contact, source: game.name, tags: ['juego-' + game.type], marketing: form.ok });
        if (answer?.tag) addTag(st, c.id, answer.tag);
        g.stats.leads++;
        log(st, 'juego_jugado', c.id, { juego: game.name, premio: won ? prize.label : 'sin premio', respuesta: answer?.label });
      }
      if (won) {
        issued = issueCode(st, { kind: prize.kind, value: prize.value, days: game.codeDays || 7, contactId: c?.id || null, origin: 'juego:' + game.id, minSubtotal: game.minSubtotal || 0, prefix: 'GANA' });
        g.stats.wins++;
        if (c) {
          log(st, 'premio_entregado', c.id, { juego: game.name, premio: prize.label, codigo: issued });
          moveDeal(st, { pipelineId: 'leads', stageId: 'nuevo', contactId: c.id, title: `Ganó ${prize.label} en «${game.name}»` });
        }
      }
    });
    setCode(issued);
    try { sessionStorage.setItem('nx-code', issued); } catch { /* */ }
    setPhase('done');
  };
  const submit = e => {
    e.preventDefault();
    const v = form.contact.trim();
    const okMail = /^\S+@\S+\.\S+$/.test(v); const okPhone = v.replace(/\D/g, '').length >= 10;
    if (!okMail && !okPhone) return setErr('Escribe un WhatsApp (10 dígitos) o un correo válido.');
    setErr(''); finish(v);
  };

  return (
    <div className="gm-card">
      <button className="gm-x" onClick={onClose} aria-label="Cerrar">×</button>
      {phase === 'play' && <>
        <h3 className="gm-title">{game.texts.title}</h3>
        {game.texts.subtitle && <p className="gm-sub">{game.texts.subtitle}</p>}
        {game.type === 'ruleta' && <Wheel game={game} prize={prize} onStart={start} onDone={() => setPhase('result')} />}
        {game.type === 'raspa' && <Scratch game={game} prize={prize} onStart={start} onDone={() => setPhase('result')} />}
        {game.type === 'caja' && <Boxes prize={prize} onStart={start} onDone={() => setPhase('result')} />}
        {game.type === 'quiz' && <Quiz game={game} onStart={start} onDone={o => { setAnswer(o); setPhase('result'); }} />}
      </>}
      {phase === 'result' && <>
        {won && <Confetti />}
        <div className="gm-big">{won ? '🎉' : '🙌'}</div>
        <h3 className="gm-title">{won ? vars(game.texts.win) : vars(game.texts.lose)}</h3>
        {won && game.minSubtotal > 0 && <p className="gm-sub">Válido en compras desde {money(game.minSubtotal, S)}.</p>}
        {(won || game.type === 'quiz') && game.ask !== 'nunca' ? (
          <form className="gm-form" onSubmit={submit}>
            <p className="gm-sub">¿A dónde te enviamos {won ? 'tu código' : 'la recomendación'}?</p>
            <input aria-label="Tu nombre" placeholder="Tu nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input aria-label="WhatsApp o correo" placeholder="WhatsApp o correo" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
            <label className="gm-check"><input type="checkbox" checked={form.ok} onChange={e => setForm({ ...form, ok: e.target.checked })} /> Acepto recibir ofertas (puedo darme de baja cuando quiera)</label>
            {err && <p className="gm-err">{err}</p>}
            <button className="gm-btn">{game.texts.claim || 'Recibir mi código'}</button>
          </form>
        ) : <button className="gm-btn" onClick={() => (won ? finish(null) : onClose())}>{won ? (game.texts.claim || 'Ver mi código') : 'Seguir comprando'}</button>}
      </>}
      {phase === 'done' && <>
        <div className="gm-big">✅</div>
        {code ? <>
          <h3 className="gm-title">Tu código: <span className="gm-code">{code}</span></h3>
          <p className="gm-sub">{prizeText(prize, S)} · válido {game.codeDays || 7} días{game.minSubtotal ? ` desde ${money(game.minSubtotal, S)}` : ''}. Ya quedó listo para tu checkout.</p>
          {rec && <p className="gm-sub">Te recomendamos <a className="sf-link" href={'#/tienda/producto/' + rec.slug} onClick={onClose}>{rec.title}</a>.</p>}
          <div className="gm-row"><button className="gm-btn ghost" onClick={() => navigator.clipboard?.writeText(code)}>Copiar</button><button className="gm-btn" onClick={onClose}>Ir a comprar</button></div>
        </> : <>
          <h3 className="gm-title">¡Listo!</h3>
          {rec && <p className="gm-sub">Para ti: <a className="sf-link" href={'#/tienda/producto/' + rec.slug} onClick={onClose}>{rec.title}</a></p>}
          <button className="gm-btn" onClick={onClose}>Seguir comprando</button>
        </>}
      </>}
    </div>
  );
}

// ---------- Anfitrión en la tienda: decide cuándo aparece cada juego ----------
export default function GameHost({ path }) {
  const { state, mutate } = useStore();
  const [open, setOpen] = useState(null);
  const game = (state.games || []).find(g => g.active && (() => { try { return !localStorage.getItem(KEY(g.id)); } catch { return true; } })());
  useEffect(() => {
    if (!game || open) return;
    const show = () => {
      setOpen(game.id);
      try { localStorage.setItem(KEY(game.id), new Date().toISOString()); } catch { /* */ }
      mutate(st => { const g = st.games.find(x => x.id === game.id); if (g) g.stats.views++; });
    };
    const t = game.trigger || {};
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    if (t.type === 'tiempo') { const id = setTimeout(show, (t.seconds ?? 6) * 1000); return () => clearTimeout(id); }
    if (t.type === 'scroll') { const f = () => { if (scrollY / Math.max(1, document.body.scrollHeight - innerHeight) > 0.5) show(); }; addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }
    if (t.type === 'salida') {
      // Intención de salida: en computador, el mouse sale por arriba; en teléfono, a los 25 s.
      if (mobile) { const id = setTimeout(show, 25000); return () => clearTimeout(id); }
      const f = e => { if (e.clientY <= 0) show(); }; document.addEventListener('mouseout', f); return () => document.removeEventListener('mouseout', f);
    }
  }, [game?.id, open]);
  const g = open && state.games.find(x => x.id === open);
  if (!g) return null;
  return (
    <div className={'gm-layer pos-' + (g.position || 'centro')} role="dialog" aria-modal="true" aria-label={g.name}>
      {g.position === 'centro' && <div className="gm-bg" onClick={() => setOpen(null)} />}
      <GamePlayer game={g} onClose={() => setOpen(null)} />
    </div>
  );
}
