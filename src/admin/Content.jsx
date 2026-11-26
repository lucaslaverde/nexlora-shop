import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Image, BookOpen, Database } from 'lucide-react';
import { useStore } from '../store.jsx';
import { Card, PageHead, Tabs, Btn, Soon, Empty } from '../ui.jsx';

export default function Content({ sub }) {
  const tab = sub || 'menus';
  return (
    <div className="page">
      <PageHead title="Contenido" />
      <Tabs value={tab} onChange={t => (location.hash = '#/contenido/' + t)} tabs={[{ id: 'menus', label: 'Menús' }, { id: 'archivos', label: 'Archivos' }, { id: 'blog', label: 'Blog' }, { id: 'metaobjetos', label: 'Metaobjetos' }]} />
      {tab === 'menus' && <Menus />}
      {tab === 'archivos' && <Files />}
      {tab === 'blog' && <Card><Soon icon={BookOpen} title="Blog de la tienda" text="Artículos con el mismo editor visual, con SEO y productos dentro del texto." /></Card>}
      {tab === 'metaobjetos' && <Card><Soon icon={Database} title="Metaobjetos y campos personalizados" text="Guarda datos propios (ficha técnica, ingredientes, tallas) y muéstralos en tus páginas." /></Card>}
    </div>
  );
}

function Menus() {
  const { state, mutate } = useStore();
  const menu = state.menus[0];
  const edit = fn => mutate(st => fn(st.menus[0].items));
  const links = [{ label: 'Inicio', link: '#/tienda' }, ...state.collections.map(c => ({ label: c.title, link: '#/tienda/coleccion/' + c.id })), ...state.pages.filter(p => p.slug).map(p => ({ label: p.title, link: '#/tienda/p/' + p.slug }))];
  return (
    <Card title={menu.title} actions={<Btn icon={Plus} onClick={() => edit(it => it.push({ label: 'Nuevo enlace', link: '#/tienda' }))}>Agregar enlace</Btn>}>
      <p className="muted sm">Este menú aparece en el encabezado de la tienda.</p>
      {menu.items.map((m, i) => (
        <div key={i} className="menu-row">
          <input className="input" value={m.label} onChange={e => edit(it => { it[i].label = e.target.value; })} />
          <select className="input" value={m.link} onChange={e => edit(it => { it[i].link = e.target.value; })}>
            {!links.find(l => l.link === m.link) && <option value={m.link}>{m.link}</option>}
            {links.map(l => <option key={l.link} value={l.link}>{l.label}</option>)}
          </select>
          <button className="icon-btn" disabled={i === 0} onClick={() => edit(it => { [it[i - 1], it[i]] = [it[i], it[i - 1]]; })}><ArrowUp size={16} /></button>
          <button className="icon-btn" disabled={i === menu.items.length - 1} onClick={() => edit(it => { [it[i + 1], it[i]] = [it[i], it[i + 1]]; })}><ArrowDown size={16} /></button>
          <button className="icon-btn" onClick={() => edit(it => { it.splice(i, 1); })}><Trash2 size={16} /></button>
        </div>
      ))}
    </Card>
  );
}

function Files() {
  const { state, mutate } = useStore();
  const [url, setUrl] = useState('');
  const add = () => { if (!url.trim()) return; mutate(st => st.files.unshift({ url: url.trim(), at: new Date().toISOString() })); setUrl(''); };
  const all = [...state.files.map(f => f.url), ...state.products.map(p => p.image).filter(Boolean)];
  return (
    <Card title="Biblioteca de archivos" actions={<div className="row"><input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="Pega la URL de una imagen" /><Btn icon={Plus} onClick={add}>Agregar</Btn></div>}>
      <p className="muted sm">Haz clic en una imagen para copiar su enlace. Subir archivos desde el equipo llega con el almacenamiento en la nube.</p>
      {all.length ? <div className="files">{[...new Set(all)].map(u => <button key={u} onClick={() => navigator.clipboard?.writeText(u)} title="Copiar enlace"><img src={u} alt="" /></button>)}</div> : <Empty icon={Image} title="Sin archivos" />}
    </Card>
  );
}
