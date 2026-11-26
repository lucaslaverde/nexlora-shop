import React, { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { useStore } from '../store.jsx';
import { SECTIONS } from '../sections/registry.jsx';
import { scanCode } from '../community/code.jsx';

// ---------- Prueba A/B de una sección (sin código) ----------
export function AbPanel({ s, variant, setVariant, setSection }) {
  const { state, mutate } = useStore();
  const st = state.abStats?.[s.id] || { a: { v: 0, c: 0 }, b: { v: 0, c: 0 } };
  const rate = x => (x.v ? (x.c / x.v) * 100 : 0);
  const enough = st.a.v >= 30 && st.b.v >= 30;
  const lead = rate(st.b) > rate(st.a) ? 'b' : 'a';
  const resetStats = () => mutate(x => { if (x.abStats) delete x.abStats[s.id]; });
  if (!s.ab) {
    return (
      <div className="stack">
        <div className="tip"><b>Prueba A/B sin programar.</b> Crea una segunda versión de esta sección (otro título, otra foto, otro botón). La mitad de tus visitantes verá la A y la otra mitad la B, y aquí verás cuál consigue más clics.</div>
        <button className="btn primary" onClick={() => { setSection(sec => { sec.ab = { enabled: true, b: structuredClone(sec.settings), started: new Date().toISOString() }; }); setVariant('b'); }}><FlaskConical size={16} />Crear variante B</button>
        <p className="muted sm">La prueba empieza cuando publicas la página.</p>
      </div>
    );
  }
  return (
    <div className="stack">
      <div className="ab-switch"><span>Editando:</span>{['a', 'b'].map(v => <button key={v} className={variant === v ? 'on' : ''} onClick={() => setVariant(v)}>Variante {v.toUpperCase()}</button>)}</div>
      <table className="ab-table"><thead><tr><th /><th>Visitas</th><th>Clics</th><th>% clic</th></tr></thead>
        <tbody>{['a', 'b'].map(v => <tr key={v} className={enough && lead === v ? 'win' : ''}><td><b>{v.toUpperCase()}</b></td><td>{st[v].v}</td><td>{st[v].c}</td><td>{rate(st[v]).toFixed(1)}%</td></tr>)}</tbody></table>
      <p className="muted sm">{enough ? `Va ganando la variante ${lead.toUpperCase()}.` : 'Todavía hay pocos datos: espera al menos 30 visitas por variante antes de decidir.'} Se cuentan los clics en botones y enlaces de esta sección.</p>
      <div className="row">
        <button className="btn" onClick={() => setSection(sec => { sec.ab.enabled = !sec.ab.enabled; })}>{s.ab.enabled ? 'Pausar prueba' : 'Reanudar prueba'}</button>
        <button className="btn" onClick={() => { setSection(sec => { delete sec.ab; }); setVariant('a'); resetStats(); }}>Quedarme con A</button>
        <button className="btn primary" onClick={() => { setSection(sec => { sec.settings = sec.ab.b; delete sec.ab; }); setVariant('a'); resetStats(); }}>Quedarme con B</button>
      </div>
      <p className="muted sm">Para que el cambio llegue a la tienda, publica la página.</p>
    </div>
  );
}

// ---------- Publicación programada ----------
export function SchedulePop({ onSave, close }) {
  const local = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const [at, setAt] = useState(() => local(new Date(Date.now() + 3600e3)));
  return (
    <div className="sched-pop" onClick={e => e.stopPropagation()}>
      <b>Programar publicación</b>
      <p className="muted sm">El borrador actual saldrá en vivo solo, a esta hora. Ideal para lanzamientos y ofertas.</p>
      <input className="input" type="datetime-local" value={at} onChange={e => setAt(e.target.value)} />
      <div className="row end"><button className="btn" onClick={close}>Cancelar</button><button className="btn primary" onClick={() => onSave(at)}>Programar</button></div>
    </div>
  );
}

// ---------- Revisión de calidad de la página ----------
const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const x = hex(a), y = hex(b); if (!x || !y) return 21; const [l1, l2] = [lum(x), lum(y)].sort((p, q) => q - p); return (l1 + 0.05) / (l2 + 0.05); };

export function auditPage(page, state) {
  const out = [];
  const add = (ok, label, detail, sectionId, level = 'error') => out.push({ ok, label, detail, sectionId, level });
  const secs = page.sections.filter(s => !s.hidden);
  const t = page.seo?.title || '';
  const d = page.seo?.description || '';
  add(t.length >= 10 && t.length <= 60, 'Título para buscadores de 10 a 60 caracteres', `Ahora tiene ${t.length}.`);
  add(d.length >= 50 && d.length <= 160, 'Descripción para buscadores de 50 a 160 caracteres', `Ahora tiene ${d.length}.`, null, 'warn');
  add(secs.some(s => s.type === 'header'), 'Tiene encabezado con menú', 'Sin encabezado el visitante no puede navegar.');
  add(secs.some(s => s.type === 'footer'), 'Tiene pie de página', 'El pie da confianza (políticas, contacto).', null, 'warn');
  add(secs.filter(s => s.type === 'hero').length <= 1, 'Una sola portada (un solo título principal)', 'Dos portadas confunden a Google y al visitante.');
  add(secs.length <= 14, 'Página ágil (14 secciones o menos)', `Tiene ${secs.length}. Muchas secciones hacen lenta la carga en el teléfono.`, null, 'warn');
  for (const s of secs) {
    const def = SECTIONS[s.type];
    if (!def) continue;
    const st = s.settings;
    const name = def.name;
    for (const [b, l] of [['button', 'link'], ['button2', 'link2']]) {
      // Solo botones que son enlaces (el de la newsletter envía el formulario, no necesita destino).
      if (def.fields.some(f => f.key === l) && st[b] && (!st[l] || st[l] === '#')) add(false, `Botón sin destino en «${name}»`, `El botón «${st[b]}» no lleva a ninguna parte.`, s.id);
    }
    for (const f of def.fields) if (f.type === 'image' && !st[f.key]) add(false, `Falta imagen en «${name}»`, f.label, s.id, 'warn');
    if (st._bg) {
      const c = contrast(st._color || state.theme.text, st._bg);
      if (c < 4.5) add(false, `Texto difícil de leer en «${name}»`, `Contraste ${c.toFixed(1)}:1 (mínimo recomendado 4,5:1).`, s.id);
    }
    if (s.type === 'custom-code' && !scanCode(st).ok) add(false, `Código inseguro en «${name}»`, 'No pasa la revisión automática: no se podrá publicar.', s.id);
    if (s.type === 'community') {
      const c = (state.community || []).find(x => x.id === st.codeId);
      if (!c || c.status !== 'aprobado') add(false, 'Sección de la comunidad sin verificar', 'No se mostrará hasta que el equipo la apruebe.', s.id);
    }
    if (s.type === 'video' && !st.url) add(false, 'Video sin enlace', 'Pega un enlace de YouTube.', s.id, 'warn');
    if (s.type === 'countdown' && new Date(st.date).getTime() < Date.now()) add(false, 'La cuenta regresiva ya terminó', 'Muestra 00:00:00: cambia la fecha o quítala.', s.id);
    if (st._hideMobile && st._hideDesktop) add(false, `«${name}» no se ve en ningún dispositivo`, 'Está oculta en móvil y en escritorio.', s.id, 'warn');
  }
  const errors = out.filter(x => !x.ok && x.level === 'error').length;
  const warns = out.filter(x => !x.ok && x.level === 'warn').length;
  return { items: out, score: Math.max(0, 100 - errors * 12 - warns * 5), errors, warns };
}

export function AuditPanel({ page, onSelect }) {
  const { state } = useStore();
  const a = auditPage(page, state);
  const color = a.score >= 85 ? 'var(--ok)' : a.score >= 60 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div className="pad stack">
      <div className="audit-score" style={{ '--c': color }}><b>{a.score}</b><span>/100</span></div>
      <p className="muted sm center-t">{a.errors} problemas · {a.warns} sugerencias. Se revisan el SEO, la legibilidad, los enlaces rotos, las imágenes, la seguridad del código y la velocidad.</p>
      {a.items.filter(x => !x.ok).map((x, i) => (
        <button key={i} className={'audit-row ' + x.level} onClick={() => x.sectionId && onSelect(x.sectionId)}>
          <span>{x.level === 'error' ? '✕' : '!'}</span><div><b>{x.label}</b><small>{x.detail}</small></div>
        </button>
      ))}
      {a.items.filter(x => x.ok).map((x, i) => <div key={'ok' + i} className="audit-row ok"><span>✓</span><div><b>{x.label}</b></div></div>)}
    </div>
  );
}
