import React, { useState } from 'react';
import { Code2, ShieldCheck, Send, Download, Check, X, Clock } from 'lucide-react';
import { useStore, fmtDate } from '../store.jsx';
import { uid } from '../seed.js';
import { scanCode, CodeFrame, ScanReport, CODE_VARS } from '../community/code.jsx';
import { newSection } from './OnlineStore.jsx';
import { Card, Badge, PageHead, Tabs, Btn, Field, Empty } from '../ui.jsx';

const tone = s => ({ aprobado: 'green', pendiente: 'yellow', rechazado: 'gray' }[s]);

export default function Community({ sub }) {
  const { state } = useStore();
  const tab = sub || 'explorar';
  const list = state.community || [];
  const pend = list.filter(c => c.status === 'pendiente').length;
  return (
    <div className="page">
      <PageHead title="Comunidad de código" subtitle="Cualquiera puede crear secciones y compartirlas. Nosotros las verificamos antes de que lleguen a una tienda." />
      <div className="how">
        <div><b>1</b><span><Send size={15} /> Alguien envía su sección (HTML + CSS)</span></div>
        <div><b>2</b><span><ShieldCheck size={15} /> El revisor automático busca código peligroso</span></div>
        <div><b>3</b><span><Check size={15} /> El equipo de Nexlora la prueba y la aprueba</span></div>
        <div><b>4</b><span><Code2 size={15} /> Corre aislada: no puede ver datos de la tienda ni de los clientes</span></div>
      </div>
      <Tabs value={tab} onChange={t => (location.hash = '#/comunidad/' + t)} tabs={[
        { id: 'explorar', label: 'Explorar', count: list.filter(c => c.status === 'aprobado').length },
        { id: 'enviar', label: 'Enviar código' },
        { id: 'envios', label: 'Envíos', count: list.length },
        { id: 'revision', label: 'Revisión del equipo', count: pend },
      ]} />
      {tab === 'explorar' && <Explore />}
      {tab === 'enviar' && <Submit />}
      {tab === 'envios' && <Submissions />}
      {tab === 'revision' && <Review />}
    </div>
  );
}

function Explore() {
  const { state, mutate } = useStore();
  const [target, setTarget] = useState(state.pages[0]?.id);
  const list = (state.community || []).filter(c => c.status === 'aprobado');
  const install = c => {
    mutate(st => {
      const p = st.pages.find(x => x.id === target);
      const s = newSection('community');
      s.settings.codeId = c.id; s.settings.height = c.height;
      const end = p.sections.length && p.sections[p.sections.length - 1].type === 'footer' ? p.sections.length - 1 : p.sections.length;
      p.sections.splice(end, 0, s);
      st.community.find(x => x.id === c.id).installs++;
    });
    location.hash = '#/editor/' + target;
  };
  return (
    <div className="stack">
      <div className="row"><span className="muted">Instalar en la página:</span><select className="input" style={{ width: 220 }} value={target} onChange={e => setTarget(e.target.value)}>{state.pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
      {list.length ? <div className="comm-grid">{list.map(c => (
        <Card key={c.id}>
          <div className="comm-prev"><CodeFrame code={c} theme={state.theme} height={c.height} /></div>
          <div className="row between" style={{ marginTop: 12 }}><b>{c.name}</b><span className="verified">✓ Verificado</span></div>
          <p className="muted sm">{c.description}</p>
          <p className="muted sm">Por {c.author} · {c.installs} usos · revisado por {c.review?.by}</p>
          <Btn variant="primary" icon={Download} onClick={() => install(c)}>Instalar</Btn>
        </Card>
      ))}</div> : <Empty title="Aún no hay secciones verificadas" />}
    </div>
  );
}

function Submit() {
  const { state, mutate } = useStore();
  const [f, setF] = useState({ name: '', author: '', description: '', category: 'Contenido', height: 240, html: '<div class="hola">\n  <h2>Mi sección</h2>\n  <p>Usa los colores del tema con var(--primario).</p>\n</div>', css: '.hola{padding:32px;text-align:center;background:var(--superficie);border-radius:var(--radio)}\n.hola h2{color:var(--primario);font-family:var(--fuente-titulos)}' });
  const [sent, setSent] = useState(null);
  const scan = scanCode(f);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const send = () => {
    const id = uid('cc');
    // Si falla la revisión automática se rechaza solo; si pasa, queda en la cola del equipo.
    mutate(st => st.community.unshift({ ...f, id, height: Number(f.height) || 240, installs: 0, submittedAt: new Date().toISOString(), status: scan.ok ? 'pendiente' : 'rechazado', review: scan.ok ? null : { by: 'Revisor automático', note: 'Rechazado: ' + scan.checks.filter(c => !c.ok).map(c => c.label.toLowerCase()).join('; '), at: new Date().toISOString() } }));
    setSent(scan.ok ? 'pendiente' : 'rechazado');
  };
  if (sent) return <Card><Empty icon={sent === 'pendiente' ? Clock : X} title={sent === 'pendiente' ? '¡Enviado! Está en la cola de revisión' : 'Rechazado por el revisor automático'} text={sent === 'pendiente' ? 'El equipo de Nexlora lo revisa y te avisamos. Puedes verlo en Envíos.' : 'Corrige lo que marca el revisor y vuelve a enviarlo.'} action={<Btn onClick={() => setSent(null)}>Enviar otro</Btn>} /></Card>;
  return (
    <div className="grid-main">
      <div className="stack">
        <Card title="Tu sección">
          <div className="grid-2">
            <Field label="Nombre"><input className="input" value={f.name} onChange={set('name')} placeholder="Ej: Banner de temporada" /></Field>
            <Field label="Tu nombre o usuario"><input className="input" value={f.author} onChange={set('author')} /></Field>
          </div>
          <Field label="¿Para qué sirve?"><input className="input" value={f.description} onChange={set('description')} /></Field>
          <div className="grid-2">
            <Field label="Categoría"><select className="input" value={f.category} onChange={set('category')}>{['Destacado', 'Productos', 'Contenido', 'Confianza', 'Marketing'].map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Alto mínimo (px)"><input className="input" type="number" value={f.height} onChange={set('height')} /></Field>
          </div>
          <Field label="HTML"><textarea className="input code" rows={8} spellCheck={false} value={f.html} onChange={set('html')} /></Field>
          <Field label="CSS" hint={'Variables del tema: ' + CODE_VARS.join(', ')}><textarea className="input code" rows={8} spellCheck={false} value={f.css} onChange={set('css')} /></Field>
        </Card>
        <Card title="Vista previa (aislada, igual que en la tienda)"><div className="comm-prev"><CodeFrame code={f} theme={state.theme} height={f.height} /></div></Card>
      </div>
      <div className="stack">
        <Card title="Revisión automática"><ScanReport scan={scan} /></Card>
        <Card>
          <p className="muted sm">Al enviar aceptas que el equipo de Nexlora revise tu código. Nunca se ejecuta JavaScript de la comunidad dentro de una tienda.</p>
          <Btn variant="primary" icon={Send} disabled={!f.name.trim() || !f.author.trim()} onClick={send}>{scan.ok ? 'Enviar a revisión' : 'Enviar de todos modos'}</Btn>
        </Card>
      </div>
    </div>
  );
}

function Submissions() {
  const { state } = useStore();
  return (
    <Card pad={false}>
      <table className="table"><thead><tr><th>Sección</th><th>Autor</th><th>Enviada</th><th>Estado</th><th>Nota de la revisión</th></tr></thead>
        <tbody>{(state.community || []).map(c => (
          <tr key={c.id}><td><b>{c.name}</b></td><td className="muted">{c.author}</td><td className="muted">{fmtDate(c.submittedAt)}</td><td><Badge tone={tone(c.status)}>{c.status}</Badge></td><td className="muted sm">{c.review?.note || 'Esperando al equipo'}</td></tr>
        ))}</tbody></table>
    </Card>
  );
}

function Review() {
  const { state, mutate } = useStore();
  const [notes, setNotes] = useState({});
  const queue = (state.community || []).filter(c => c.status === 'pendiente');
  const decide = (c, status) => mutate(st => {
    const x = st.community.find(y => y.id === c.id);
    x.status = status;
    x.review = { by: 'Equipo Nexlora', note: notes[c.id] || (status === 'aprobado' ? 'Aprobado.' : 'Rechazado.'), at: new Date().toISOString() };
  });
  if (!queue.length) return <Card><Empty icon={ShieldCheck} title="Nada pendiente" text="Cuando alguien envíe una sección, aparecerá aquí para revisarla." /></Card>;
  return (
    <div className="stack">
      <p className="muted sm">Aquí trabaja el equipo de verificación. Cuando haya cuentas reales, solo lo verán los revisores de Nexlora.</p>
      {queue.map(c => {
        const scan = scanCode(c);
        return (
          <Card key={c.id} title={c.name} actions={<Badge tone="yellow">pendiente</Badge>}>
            <div className="grid-main">
              <div className="stack">
                <p className="muted sm">Por {c.author} · {fmtDate(c.submittedAt)} · {c.description}</p>
                <div className="comm-prev"><CodeFrame code={c} theme={state.theme} height={Math.min(c.height, 260)} /></div>
                <details><summary className="link">Ver código</summary><pre className="code-view">{c.html}{'\n\n/* CSS */\n'}{c.css}</pre></details>
              </div>
              <div className="stack">
                <ScanReport scan={scan} />
                <textarea className="input" rows={2} placeholder="Nota para el autor" value={notes[c.id] || ''} onChange={e => setNotes({ ...notes, [c.id]: e.target.value })} />
                <div className="row"><Btn icon={X} onClick={() => decide(c, 'rechazado')}>Rechazar</Btn><Btn variant="primary" icon={Check} disabled={!scan.ok} onClick={() => decide(c, 'aprobado')}>Aprobar</Btn></div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
