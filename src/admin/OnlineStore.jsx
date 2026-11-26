import React, { useState } from 'react';
import { Paintbrush, Plus, Copy, Trash2, Eye, Check, Code2 } from 'lucide-react';
import { useStore, fmtDate } from '../store.jsx';
import { themePresets, uid } from '../seed.js';
import { SECTIONS, PAGE_TEMPLATES } from '../sections/registry.jsx';
import { Card, Badge, PageHead, Tabs, Btn, LinkBtn, Field, Toggle, Soon } from '../ui.jsx';

export const newSection = type => ({ id: uid('s'), type, hidden: false, settings: structuredClone(SECTIONS[type].defaults) });
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const isDirty = p => JSON.stringify(p.sections) !== JSON.stringify(p.published?.sections);

export default function OnlineStore({ sub }) {
  const tab = sub || 'temas';
  return (
    <div className="page">
      <PageHead title="Tienda online" actions={<><LinkBtn icon={Eye} href="#/tienda" target="_blank">Ver tienda</LinkBtn><LinkBtn variant="primary" icon={Paintbrush} href="#/editor/home">Personalizar</LinkBtn></>} />
      <Tabs value={tab} onChange={t => (location.hash = '#/tienda-online/' + t)} tabs={[{ id: 'temas', label: 'Temas' }, { id: 'paginas', label: 'Páginas' }, { id: 'preferencias', label: 'Preferencias' }]} />
      {tab === 'temas' && <Themes />}
      {tab === 'paginas' && <Pages />}
      {tab === 'preferencias' && <Prefs />}
    </div>
  );
}

function Swatch({ t }) {
  return <div className="swatch" style={{ background: t.background, color: t.text, borderRadius: Math.min(t.radius, 12) }}>
    <div style={{ fontFamily: t.headingFont, fontSize: 22, fontWeight: 700 }}>Aa</div>
    <div className="row" style={{ gap: 4 }}>{[t.primary, t.accent, t.surface, t.text].map((c, i) => <i key={i} style={{ background: c }} />)}</div>
    <span style={{ background: t.primary, color: '#fff', borderRadius: Math.min(t.radius, 8) }}>Botón</span>
  </div>;
}

function Themes() {
  const { state, mutate } = useStore();
  const home = state.pages.find(p => p.kind === 'inicio');
  return (
    <div className="stack">
      <Card>
        <div className="theme-cur">
          <Swatch t={state.theme} />
          <div>
            <Badge tone="green">Tema actual</Badge>
            <h2 style={{ margin: '8px 0 4px' }}>{state.theme.name}</h2>
            <p className="muted">Última publicación: {home?.published?.at ? fmtDate(home.published.at) : '—'} {isDirty(home) && <Badge tone="yellow">Cambios sin publicar</Badge>}</p>
            <div className="row"><LinkBtn variant="primary" icon={Paintbrush} href="#/editor/home">Personalizar</LinkBtn><Btn icon={Code2} onClick={() => alert('El editor de código (HTML/CSS propio) llega en una próxima fase.')}>Editar código</Btn></div>
          </div>
        </div>
      </Card>
      <Card title="Biblioteca de temas" actions={<span className="muted sm">Cambiar de tema conserva tus secciones y contenido</span>}>
        <div className="themes">{themePresets.map(t => (
          <div key={t.name} className="theme-card">
            <Swatch t={t} />
            <div className="row between"><b>{t.name}</b>{state.theme.name === t.name ? <Badge tone="green"><Check size={12} /> En uso</Badge> : <Btn onClick={() => mutate(st => { st.theme = structuredClone(t); })}>Aplicar</Btn>}</div>
          </div>
        ))}</div>
      </Card>
      <Soon title="Tienda de temas y temas con IA" text="Genera un tema completo a partir de tu logo o de una descripción de tu marca." />
    </div>
  );
}

export function NewPageForm({ onDone }) {
  const { mutate } = useStore();
  const [title, setTitle] = useState('');
  const [tpl, setTpl] = useState('landing');
  const create = () => {
    if (!title.trim()) return;
    const id = uid('pg');
    const t = PAGE_TEMPLATES.find(x => x.id === tpl);
    const sections = t.sections.map(newSection);
    mutate(st => st.pages.push({ id, title: title.trim(), slug: slugify(title) || id, kind: 'pagina', seo: { title: title.trim(), description: '' }, sections, published: null, versions: [] }));
    onDone?.(id);
    location.hash = '#/editor/' + id;
  };
  return (
    <div className="stack">
      <Field label="Nombre de la página"><input className="input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Black Friday" /></Field>
      <div className="tpl-grid">{PAGE_TEMPLATES.map(t => (
        <button key={t.id} className={'tpl' + (tpl === t.id ? ' on' : '')} onClick={() => setTpl(t.id)}>
          <div className="tpl-mini">{t.sections.map((s, i) => <i key={i} className={'mini-' + s} />)}</div>
          <b>{t.name}</b><span className="muted sm">{t.sections.length} secciones</span>
        </button>
      ))}</div>
      <div className="row end"><Btn variant="primary" onClick={create} disabled={!title.trim()}>Crear y abrir en el editor</Btn></div>
    </div>
  );
}

function Pages() {
  const { state, mutate } = useStore();
  const [creating, setCreating] = useState(false);
  const dup = p => mutate(st => st.pages.push({ ...structuredClone(p), id: uid('pg'), title: p.title + ' (copia)', slug: (p.slug || 'inicio') + '-copia', kind: 'pagina', published: null, versions: [] }));
  return (
    <div className="stack">
      {creating ? <Card title="Nueva página"><NewPageForm /></Card> : null}
      <Card pad={false} title="Páginas" actions={<Btn variant="primary" icon={Plus} onClick={() => setCreating(!creating)}>{creating ? 'Cerrar' : 'Agregar página'}</Btn>}>
        <table className="table"><thead><tr><th>Página</th><th>Dirección</th><th>Estado</th><th>Secciones</th><th /></tr></thead>
          <tbody>{state.pages.map(p => (
            <tr key={p.id}>
              <td><b>{p.title}</b>{p.kind === 'inicio' && <Badge tone="blue">Inicio</Badge>}</td>
              <td className="muted mono">/{p.slug}</td>
              <td>{!p.published ? <Badge>Sin publicar</Badge> : isDirty(p) ? <Badge tone="yellow">Cambios sin publicar</Badge> : <Badge tone="green">Publicada</Badge>}</td>
              <td>{p.sections.length}</td>
              <td className="r"><div className="row end">
                <LinkBtn href={'#/editor/' + p.id} icon={Paintbrush}>Editar</LinkBtn>
                {p.published && <a className="icon-btn" href={p.kind === 'inicio' ? '#/tienda' : '#/tienda/p/' + p.slug} target="_blank" rel="noreferrer" title="Ver"><Eye size={16} /></a>}
                <button className="icon-btn" title="Duplicar" onClick={() => dup(p)}><Copy size={16} /></button>
                {p.kind !== 'inicio' && <button className="icon-btn" title="Eliminar" onClick={() => confirm(`¿Eliminar "${p.title}"?`) && mutate(st => { st.pages = st.pages.filter(x => x.id !== p.id); })}><Trash2 size={16} /></button>}
              </div></td>
            </tr>
          ))}</tbody></table>
      </Card>
    </div>
  );
}

function Prefs() {
  const { state, mutate } = useStore();
  const home = state.pages.find(p => p.kind === 'inicio');
  return (
    <div className="stack">
      <Card title="Título y descripción para buscadores">
        <Field label="Título de la página de inicio"><input className="input" value={home.seo.title} onChange={e => mutate(st => { st.pages.find(p => p.kind === 'inicio').seo.title = e.target.value; })} /></Field>
        <Field label="Descripción"><textarea className="input" rows={3} value={home.seo.description} onChange={e => mutate(st => { st.pages.find(p => p.kind === 'inicio').seo.description = e.target.value; })} /></Field>
      </Card>
      <Card title="Protección con contraseña"><div className="row between"><p className="muted">Mientras esté activa, solo quien tenga la contraseña ve la tienda. Útil antes de lanzar.</p><Toggle checked={state.settings.password} onChange={v => mutate(st => { st.settings.password = v; })} /></div></Card>
      <div className="grid-2">
        <Soon title="Píxeles y analítica" text="Meta Pixel, Google Analytics 4, TikTok Pixel." />
        <Soon title="Imagen para redes sociales" text="La imagen que sale al compartir tu tienda." />
      </div>
    </div>
  );
}
