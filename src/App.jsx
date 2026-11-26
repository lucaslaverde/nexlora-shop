import React, { useEffect, useState } from 'react';
import { Home, ShoppingBag, Tag, Users, Megaphone, Percent, FileText, BarChart3, Store, Puzzle, Settings, Search, ExternalLink, Bot, Bell } from 'lucide-react';
import { useStore } from './store.jsx';
import Storefront from './storefront/Storefront.jsx';
import Editor from './editor/Editor.jsx';
import Dashboard from './admin/Dashboard.jsx';
import Orders from './admin/Orders.jsx';
import Products from './admin/Products.jsx';
import Customers from './admin/Customers.jsx';
import Marketing from './admin/Marketing.jsx';
import Discounts from './admin/Discounts.jsx';
import Content from './admin/Content.jsx';
import Analytics from './admin/Analytics.jsx';
import OnlineStore from './admin/OnlineStore.jsx';
import Apps from './admin/Apps.jsx';
import SettingsPage from './admin/Settings.jsx';

export function useHash() {
  const [h, setH] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return h;
}

const NAV = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag, badge: 'orders' },
  { to: '/productos', label: 'Productos', icon: Tag },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/descuentos', label: 'Descuentos', icon: Percent },
  { to: '/contenido', label: 'Contenido', icon: FileText },
  { to: '/analiticas', label: 'Analíticas', icon: BarChart3 },
  { sep: 'Canales de venta' },
  { to: '/tienda-online', label: 'Tienda online', icon: Store },
  { sep: 'Más' },
  { to: '/apps', label: 'Apps e integraciones', icon: Puzzle },
];

export default function App() {
  const hash = useHash();
  const [path] = hash.split('?');
  if (path.startsWith('/tienda/') || path === '/tienda') return <Storefront path={path.replace(/^\/tienda/, '')} />;
  if (path.startsWith('/vista-previa')) return <Storefront path={path.replace(/^\/vista-previa/, '')} preview />;
  if (path.startsWith('/editor/')) return <Editor pageId={path.split('/')[2]} />;
  return <AdminShell path={path} />;
}

function AdminShell({ path }) {
  const { state } = useStore();
  const [menu, setMenu] = useState(false);
  const seg = path.split('/').filter(Boolean);
  const pending = state.orders.filter(o => o.fulfillment === 'sin preparar').length;
  useEffect(() => setMenu(false), [path]);

  let page;
  switch (seg[0]) {
    case undefined: page = <Dashboard />; break;
    case 'pedidos': page = <Orders id={seg[1]} />; break;
    case 'productos': page = <Products sub={seg[1]} />; break;
    case 'clientes': page = <Customers id={seg[1]} />; break;
    case 'marketing': page = <Marketing />; break;
    case 'descuentos': page = <Discounts />; break;
    case 'contenido': page = <Content sub={seg[1]} />; break;
    case 'analiticas': page = <Analytics />; break;
    case 'tienda-online': page = <OnlineStore sub={seg[1]} />; break;
    case 'apps': page = <Apps />; break;
    case 'configuracion': page = <SettingsPage tab={seg[1] || 'general'} />; break;
    default: page = <Dashboard />;
  }
  const active = to => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <div className="shell">
      <header className="topbar">
        <button className="burger" onClick={() => setMenu(!menu)} aria-label="Menú">☰</button>
        <a href="#/" className="brand"><span className="brand-mark">N</span>Nexlora <b>Shop</b></a>
        <GlobalSearch />
        <div className="row top-actions">
          <a className="icon-btn" href="#/tienda" target="_blank" rel="noreferrer" title="Ver tienda"><ExternalLink size={18} /></a>
          <button className="icon-btn" title="Asistente IA (próximamente)" onClick={() => alert('El asistente IA se conecta más adelante desde Apps e integraciones.')}><Bot size={18} /></button>
          <button className="icon-btn" title="Notificaciones"><Bell size={18} />{pending > 0 && <i className="dot" />}</button>
          <div className="avatar">{state.settings.storeName.slice(0, 2).toUpperCase()}</div>
        </div>
      </header>
      <aside className={'sidebar' + (menu ? ' open' : '')}>
        <div className="store-pill"><b>{state.settings.storeName}</b><span>Plan Pro · prueba</span></div>
        <nav>
          {NAV.map((n, i) => n.sep ? <div key={i} className="nav-sep">{n.sep}</div> : (
            <a key={n.to} href={'#' + n.to} className={active(n.to) ? 'on' : ''}><n.icon size={18} />{n.label}{n.badge && pending > 0 && <em>{pending}</em>}</a>
          ))}
        </nav>
        <a href="#/configuracion" className={'nav-bottom' + (active('/configuracion') ? ' on' : '')}><Settings size={18} />Configuración</a>
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <main className="main">{page}</main>
    </div>
  );
}

function GlobalSearch() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const res = !t ? [] : [
    ...state.products.filter(p => p.title.toLowerCase().includes(t)).map(p => ({ k: 'Producto', label: p.title, to: '#/productos/' + p.id })),
    ...state.orders.filter(o => String(o.number).includes(t)).map(o => ({ k: 'Pedido', label: '#' + o.number, to: '#/pedidos/' + o.id })),
    ...state.customers.filter(c => c.name.toLowerCase().includes(t) || c.email.includes(t)).map(c => ({ k: 'Cliente', label: c.name, to: '#/clientes/' + c.id })),
    ...state.pages.filter(p => p.title.toLowerCase().includes(t)).map(p => ({ k: 'Página', label: p.title, to: '#/editor/' + p.id })),
  ].slice(0, 8);
  return (
    <div className="search">
      <Search size={16} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar productos, pedidos, clientes, páginas…" onBlur={() => setTimeout(() => setQ(''), 200)} />
      {res.length > 0 && <div className="search-res">{res.map((r, i) => <a key={i} href={r.to}><em>{r.k}</em>{r.label}</a>)}</div>}
    </div>
  );
}
