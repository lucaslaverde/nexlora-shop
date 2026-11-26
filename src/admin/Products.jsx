import React, { useState } from 'react';
import { Plus, Upload, Download, Gift, Truck, Sparkles, Trash2 } from 'lucide-react';
import { useStore, money } from '../store.jsx';
import { uid } from '../seed.js';
import { Card, Badge, PageHead, Tabs, Btn, LinkBtn, Field, Soon, Empty, statusTone } from '../ui.jsx';

const SUBTABS = [{ id: 'todos', label: 'Productos' }, { id: 'colecciones', label: 'Colecciones' }, { id: 'inventario', label: 'Inventario' }, { id: 'tarjetas', label: 'Tarjetas de regalo' }];
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function Products({ sub }) {
  if (sub && !['colecciones', 'inventario', 'tarjetas'].includes(sub)) return <ProductEdit id={sub} />;
  const tab = sub || 'todos';
  return (
    <div className="page">
      <PageHead title="Productos" actions={<><Btn icon={Upload} onClick={() => alert('Importar CSV llega en la próxima fase.')}>Importar</Btn><Btn icon={Download} onClick={() => exportCsv()}>Exportar</Btn><LinkBtn variant="primary" icon={Plus} href="#/productos/nuevo">Agregar producto</LinkBtn></>} />
      <Tabs value={tab} onChange={t => (location.hash = '#/productos' + (t === 'todos' ? '' : '/' + t))} tabs={SUBTABS} />
      {tab === 'todos' && <ProductList />}
      {tab === 'colecciones' && <Collections />}
      {tab === 'inventario' && <Inventory />}
      {tab === 'tarjetas' && <Card><Soon icon={Gift} title="Tarjetas de regalo" text="Vende saldo prepagado con código único y saldo consultable." /></Card>}
    </div>
  );
}

let exportCsv = () => {};

function ProductList() {
  const { state, mutate } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('todos');
  const [sel, setSel] = useState([]);
  exportCsv = () => {
    const rows = [['titulo', 'sku', 'precio', 'stock', 'estado'], ...state.products.map(p => [p.title, p.sku, p.price, p.stock, p.status])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = 'productos.csv'; a.click();
  };
  const list = state.products.filter(p => (status === 'todos' || p.status === status) && p.title.toLowerCase().includes(q.toLowerCase()));
  const bulk = st => { mutate(s => s.products.forEach(p => { if (sel.includes(p.id)) p.status = st; })); setSel([]); };
  return (
    <Card pad={false}>
      <div className="toolbar">
        <Tabs value={status} onChange={setStatus} tabs={[{ id: 'todos', label: 'Todos' }, { id: 'activo', label: 'Activos' }, { id: 'borrador', label: 'Borradores' }, { id: 'archivado', label: 'Archivados' }]} />
        <input className="input" placeholder="Buscar productos" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {sel.length > 0 && <div className="bulk">{sel.length} seleccionados <Btn onClick={() => bulk('activo')}>Activar</Btn><Btn onClick={() => bulk('borrador')}>Pasar a borrador</Btn><Btn onClick={() => bulk('archivado')}>Archivar</Btn></div>}
      {list.length ? (
        <div className="table-wrap"><table className="table">
          <thead><tr><th style={{ width: 32 }}><input type="checkbox" checked={sel.length === list.length} onChange={e => setSel(e.target.checked ? list.map(p => p.id) : [])} /></th><th>Producto</th><th>Estado</th><th>Inventario</th><th>Colección</th><th className="r">Precio</th></tr></thead>
          <tbody>{list.map(p => (
            <tr key={p.id} onClick={() => (location.hash = '#/productos/' + p.id)}>
              <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={sel.includes(p.id)} onChange={e => setSel(e.target.checked ? [...sel, p.id] : sel.filter(x => x !== p.id))} /></td>
              <td><div className="prod"><img src={p.image} alt="" /><b>{p.title}</b></div></td>
              <td><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
              <td className={p.stock < 10 ? 'warn' : ''}>{p.stock} en stock</td>
              <td className="muted">{state.collections.find(c => c.id === p.collection)?.title}</td>
              <td className="r">{money(p.price, state.settings)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      ) : <Empty title="Sin productos" text="Agrega tu primer producto para empezar a vender." action={<LinkBtn variant="primary" href="#/productos/nuevo">Agregar producto</LinkBtn>} />}
    </Card>
  );
}

function ProductEdit({ id }) {
  const { state, mutate } = useStore();
  const isNew = id === 'nuevo';
  const existing = state.products.find(p => p.id === id);
  const [p, setP] = useState(() => existing ? structuredClone(existing) : { id: uid('p'), title: '', slug: '', price: 0, compareAt: null, cost: 0, sku: '', stock: 0, status: 'borrador', collection: state.collections[0]?.id || '', tags: [], image: '', description: '', vendor: state.settings.storeName, seoTitle: '', seoDesc: '' });
  const [saved, setSaved] = useState(false);
  if (!isNew && !existing) return <div className="page"><Empty title="Producto no encontrado" /></div>;
  const set = (k, v) => { setP({ ...p, [k]: v }); setSaved(false); };
  const save = () => {
    const clean = { ...p, slug: p.slug || slugify(p.title), price: Number(p.price) || 0, compareAt: p.compareAt ? Number(p.compareAt) : null, cost: Number(p.cost) || 0, stock: Number(p.stock) || 0 };
    mutate(st => { const i = st.products.findIndex(x => x.id === clean.id); if (i >= 0) st.products[i] = clean; else st.products.unshift(clean); });
    setSaved(true);
    if (isNew) location.hash = '#/productos/' + clean.id;
  };
  const remove = () => { if (confirm('¿Eliminar este producto?')) { mutate(st => { st.products = st.products.filter(x => x.id !== p.id); }); location.hash = '#/productos'; } };
  const margin = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
  const S = state.settings;
  return (
    <div className="page">
      <PageHead back="#/productos" title={isNew ? 'Agregar producto' : p.title || 'Producto'} actions={<>{!isNew && <Btn icon={Trash2} variant="danger" onClick={remove}>Eliminar</Btn>}{!isNew && <LinkBtn href={'#/tienda/producto/' + p.slug} target="_blank">Ver en tienda</LinkBtn>}<Btn variant="primary" onClick={save} disabled={!p.title}>{saved ? 'Guardado ✓' : 'Guardar'}</Btn></>} />
      <div className="grid-main">
        <div className="stack">
          <Card>
            <Field label="Título"><input className="input" value={p.title} onChange={e => set('title', e.target.value)} placeholder="Camiseta de algodón" /></Field>
            <Field label="Descripción" hint="Pronto: escribir descripción con IA"><textarea className="input" rows={5} value={p.description} onChange={e => set('description', e.target.value)} /></Field>
            <Btn icon={Sparkles} onClick={() => alert('La generación con IA se activa al conectar el asistente en Apps.')}>Mejorar con IA</Btn>
          </Card>
          <Card title="Imagen">
            <div className="media-row">{p.image ? <img src={p.image} alt="" className="media" /> : <div className="media ph">Sin imagen</div>}<Field label="URL de la imagen" hint="Subida de archivos: próxima fase"><input className="input" value={p.image} onChange={e => set('image', e.target.value)} placeholder="https://…" /></Field></div>
          </Card>
          <Card title="Precio">
            <div className="grid-3">
              <Field label="Precio"><input className="input" type="number" value={p.price} onChange={e => set('price', e.target.value)} /></Field>
              <Field label="Precio antes (tachado)"><input className="input" type="number" value={p.compareAt || ''} onChange={e => set('compareAt', e.target.value)} /></Field>
              <Field label="Costo por artículo"><input className="input" type="number" value={p.cost} onChange={e => set('cost', e.target.value)} /></Field>
            </div>
            <p className="muted sm">Margen: <b>{margin}%</b> · Ganancia: <b>{money(p.price - p.cost, S)}</b></p>
          </Card>
          <Card title="Inventario">
            <div className="grid-3">
              <Field label="SKU"><input className="input" value={p.sku} onChange={e => set('sku', e.target.value)} /></Field>
              <Field label="Cantidad"><input className="input" type="number" value={p.stock} onChange={e => set('stock', e.target.value)} /></Field>
            </div>
          </Card>
          <Card title="Variantes"><Soon title="Tallas, colores y materiales" text="Combinaciones con precio, stock e imagen propios para cada variante." /></Card>
          <Card title="Envío"><Soon icon={Truck} title="Peso y dimensiones" text="Para calcular tarifas reales con transportadoras." /></Card>
          <Card title="Vista previa en buscadores">
            <div className="serp"><div className="serp-t">{p.seoTitle || p.title || 'Título del producto'}</div><div className="serp-u">tutienda.com/productos/{p.slug || slugify(p.title || 'producto')}</div><div className="serp-d">{p.seoDesc || p.description?.slice(0, 150)}</div></div>
            <Field label="Título SEO"><input className="input" value={p.seoTitle || ''} onChange={e => set('seoTitle', e.target.value)} /></Field>
            <Field label="Descripción SEO"><textarea className="input" rows={2} value={p.seoDesc || ''} onChange={e => set('seoDesc', e.target.value)} /></Field>
          </Card>
        </div>
        <div className="stack">
          <Card title="Estado"><select className="input" value={p.status} onChange={e => set('status', e.target.value)}><option value="activo">Activo</option><option value="borrador">Borrador</option><option value="archivado">Archivado</option></select></Card>
          <Card title="Organización">
            <Field label="Colección"><select className="input" value={p.collection} onChange={e => set('collection', e.target.value)}>{state.collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>
            <Field label="Proveedor"><input className="input" value={p.vendor} onChange={e => set('vendor', e.target.value)} /></Field>
            <Field label="Etiquetas (separadas por coma)"><input className="input" value={(p.tags || []).join(', ')} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} /></Field>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Collections() {
  const { state, mutate } = useStore();
  const [title, setTitle] = useState('');
  const add = () => { if (!title.trim()) return; mutate(st => st.collections.push({ id: slugify(title) || uid('col'), title: title.trim(), description: '' })); setTitle(''); };
  return (
    <Card pad={false}>
      <div className="toolbar"><input className="input" placeholder="Nombre de la nueva colección" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} /><Btn variant="primary" icon={Plus} onClick={add}>Crear colección</Btn></div>
      <table className="table"><thead><tr><th>Colección</th><th>Productos</th><th>Descripción</th><th /></tr></thead>
        <tbody>{state.collections.map(c => (
          <tr key={c.id}>
            <td><b>{c.title}</b></td><td>{state.products.filter(p => p.collection === c.id).length}</td>
            <td><input className="input" value={c.description} onChange={e => mutate(st => { st.collections.find(x => x.id === c.id).description = e.target.value; })} /></td>
            <td className="r"><a className="link" href={'#/tienda/coleccion/' + c.id} target="_blank" rel="noreferrer">Ver</a></td>
          </tr>
        ))}</tbody></table>
      <div className="card-b"><Soon title="Colecciones automáticas" text="Reglas como 'precio menor a X' o 'etiqueta = oferta' que se llenan solas." /></div>
    </Card>
  );
}

function Inventory() {
  const { state, mutate } = useStore();
  return (
    <Card pad={false}>
      <table className="table"><thead><tr><th>Producto</th><th>SKU</th><th>Disponible</th><th>Ajustar</th></tr></thead>
        <tbody>{state.products.map(p => (
          <tr key={p.id}>
            <td><div className="prod"><img src={p.image} alt="" /><b>{p.title}</b></div></td><td className="muted">{p.sku}</td>
            <td className={p.stock < 10 ? 'warn' : ''}><b>{p.stock}</b></td>
            <td><div className="row"><Btn onClick={() => mutate(st => { const x = st.products.find(y => y.id === p.id); x.stock = Math.max(0, x.stock - 1); })}>−1</Btn><Btn onClick={() => mutate(st => { st.products.find(y => y.id === p.id).stock += 1; })}>+1</Btn><Btn onClick={() => mutate(st => { st.products.find(y => y.id === p.id).stock += 10; })}>+10</Btn></div></td>
          </tr>
        ))}</tbody></table>
      <div className="card-b"><Soon title="Varias bodegas y proveedores" text="Stock por ubicación, órdenes de compra y sincronización con proveedores externos." /></div>
    </Card>
  );
}
