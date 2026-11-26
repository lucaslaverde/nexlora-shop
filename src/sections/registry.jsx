import React, { createContext, useContext, useEffect, useState } from 'react';
import { useStore, money } from '../store.jsx';
import { CodeFrame, scanCode } from '../community/code.jsx';

// ---------- Contextos ----------
// EditCtx: si estamos en el editor, permite editar textos directamente sobre la vista previa.
export const EditCtx = createContext({ editing: false, onEdit: () => {} });
// ShopCtx: carrito de la tienda. En el editor es una versión simulada.
export const ShopCtx = createContext({ add: () => {}, count: 0, open: () => {} });

const SecCtx = createContext(null);

// Texto editable en línea: <T k="title" as="h2" /> o con path para listas.
export function T({ k, path, as: Tag = 'span', className, placeholder, ...rest }) {
  const { editing, onEdit } = useContext(EditCtx);
  const sec = useContext(SecCtx);
  const p = path || [k];
  let val = sec.settings;
  for (const part of p) val = val?.[part];
  if (!editing) return val ? <Tag className={className} {...rest}>{val}</Tag> : null;
  return (
    <Tag
      className={(className || '') + ' sf-editable'}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder || 'Escribe aquí…'}
      onBlur={e => { const v = e.currentTarget.innerText; if (v !== val) onEdit(sec.id, p, v); }}
      onKeyDown={e => { if (e.key === 'Enter' && !['P', 'DIV'].includes(e.currentTarget.tagName)) { e.preventDefault(); e.currentTarget.blur(); } }}
      {...rest}
    >{val || ''}</Tag>
  );
}

function Btn({ k, linkKey, variant }) {
  const sec = useContext(SecCtx);
  const { editing } = useContext(EditCtx);
  if (!sec.settings[k] && !editing) return null;
  return <a className={'sf-btn ' + (variant || '')} href={sec.settings[linkKey] || '#'}><T k={k} placeholder="Botón" /></a>;
}

function Img({ src, alt, className }) {
  if (!src) return <div className={'sf-img-ph ' + (className || '')}>Imagen</div>;
  return <img className={className} src={src} alt={alt || ''} loading="lazy" />;
}

// ---------- Secciones ----------
function Announcement() {
  return <div className="sf-announce"><T k="text" /></div>;
}

function Header({ s }) {
  const { state } = useStore();
  const shop = useContext(ShopCtx);
  const menu = state.menus[0]?.items || [];
  const [open, setOpen] = useState(false);
  return (
    <header className={'sf-header' + (s.sticky ? ' sticky' : '')}>
      <div className="sf-wrap sf-header-in">
        <button className="sf-burger" onClick={() => setOpen(!open)} aria-label="Menú">☰</button>
        <a href="#/tienda" className="sf-logo"><T k="logo" /></a>
        <nav className={'sf-nav' + (open ? ' open' : '')}>{menu.map((m, i) => <a key={i} href={m.link}>{m.label}</a>)}</nav>
        <button className="sf-cart-btn" onClick={shop.open}>Carrito <b>{shop.count}</b></button>
      </div>
    </header>
  );
}

function Hero({ s }) {
  const h = { bajo: '46vh', medio: '62vh', alto: '82vh' }[s.height] || '62vh';
  return (
    <div className={'sf-hero align-' + s.align} style={{ minHeight: `min(${h}, 760px)` }}>
      {s.image && <img className="sf-hero-bg" src={s.image} alt="" />}
      <div className="sf-hero-ov" style={{ opacity: (s.overlay ?? 40) / 100 }} />
      <div className="sf-wrap sf-hero-in">
        <T k="eyebrow" as="p" className="sf-eyebrow" />
        <T k="title" as="h1" className="sf-h1" />
        <T k="subtitle" as="p" className="sf-lead" />
        <div className="sf-row"><Btn k="button" linkKey="link" /><Btn k="button2" linkKey="link2" variant="ghost" /></div>
      </div>
    </div>
  );
}

export function ProductCard({ p }) {
  const { state } = useStore();
  const shop = useContext(ShopCtx);
  return (
    <div className="sf-card">
      <a href={'#/tienda/producto/' + p.slug} className="sf-card-img">
        <Img src={p.image} alt={p.title} />
        {p.compareAt > p.price && <span className="sf-badge">-{Math.round((1 - p.price / p.compareAt) * 100)}%</span>}
        {p.stock <= 0 && <span className="sf-badge out">Agotado</span>}
      </a>
      <a href={'#/tienda/producto/' + p.slug} className="sf-card-title">{p.title}</a>
      <div className="sf-price">{money(p.price, state.settings)} {p.compareAt > p.price && <s>{money(p.compareAt, state.settings)}</s>}</div>
      <button className="sf-btn sm" disabled={p.stock <= 0} onClick={() => shop.add(p)}>{p.stock <= 0 ? 'Agotado' : 'Agregar'}</button>
    </div>
  );
}

function Featured({ s }) {
  const { state } = useStore();
  let list = state.products.filter(p => p.status === 'activo');
  if (s.collection && s.collection !== 'todas') list = list.filter(p => p.collection === s.collection);
  list = list.slice(0, Number(s.count) || 4);
  return (
    <div className="sf-wrap">
      <div className="sf-head"><T k="title" as="h2" className="sf-h2" /><T k="subtitle" as="p" className="sf-muted" /></div>
      <div className="sf-grid" style={{ '--cols': s.columns || 4 }}>
        {list.map(p => <ProductCard key={p.id} p={p} />)}
        {!list.length && <p className="sf-muted">No hay productos activos en esta colección.</p>}
      </div>
    </div>
  );
}

function ImageText({ s }) {
  return (
    <div className={'sf-wrap sf-split' + (s.side === 'derecha' ? ' rev' : '')}>
      <Img src={s.image} className="sf-split-img" />
      <div className="sf-split-txt">
        <T k="title" as="h2" className="sf-h2" />
        <T k="text" as="p" className="sf-lead" />
        <div><Btn k="button" linkKey="link" /></div>
      </div>
    </div>
  );
}

function Features({ s }) {
  return (
    <div className="sf-wrap">
      <T k="title" as="h2" className="sf-h2 center" />
      <div className="sf-grid" style={{ '--cols': Math.min(4, s.items?.length || 3) }}>
        {(s.items || []).map((it, i) => (
          <div key={i} className="sf-feature">
            <T path={['items', i, 'icon']} className="sf-feature-ic" />
            <T path={['items', i, 'title']} as="h3" />
            <T path={['items', i, 'text']} as="p" className="sf-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Testimonials({ s }) {
  return (
    <div className="sf-wrap">
      <T k="title" as="h2" className="sf-h2 center" />
      <div className="sf-grid" style={{ '--cols': Math.min(3, s.items?.length || 3) }}>
        {(s.items || []).map((it, i) => (
          <figure key={i} className="sf-quote">
            <div className="sf-stars">★★★★★</div>
            <T path={['items', i, 'quote']} as="blockquote" />
            <T path={['items', i, 'author']} as="figcaption" />
          </figure>
        ))}
      </div>
    </div>
  );
}

function Faq({ s }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="sf-wrap sf-narrow">
      <T k="title" as="h2" className="sf-h2 center" />
      {(s.items || []).map((it, i) => (
        <div key={i} className={'sf-faq' + (open === i ? ' open' : '')}>
          <button onClick={() => setOpen(open === i ? -1 : i)}><T path={['items', i, 'q']} /><span>{open === i ? '−' : '+'}</span></button>
          {open === i && <T path={['items', i, 'a']} as="p" className="sf-muted" />}
        </div>
      ))}
    </div>
  );
}

function Newsletter() {
  const [done, setDone] = useState(false);
  return (
    <div className="sf-wrap sf-narrow center">
      <T k="title" as="h2" className="sf-h2" />
      <T k="text" as="p" className="sf-muted" />
      {done ? <p className="sf-ok">¡Gracias! Te escribiremos pronto.</p> : (
        <form className="sf-news" onSubmit={e => { e.preventDefault(); setDone(true); }}>
          <input type="email" required placeholder="tu@correo.com" />
          <button className="sf-btn"><T k="button" /></button>
        </form>
      )}
    </div>
  );
}

function Gallery({ s }) {
  return (
    <div className="sf-wrap">
      <T k="title" as="h2" className="sf-h2 center" />
      <div className="sf-grid" style={{ '--cols': Math.min(4, s.items?.length || 3) }}>
        {(s.items || []).map((it, i) => <Img key={i} src={it.image} className="sf-gal" />)}
      </div>
    </div>
  );
}

function Countdown({ s }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(s.date).getTime() - now);
  const parts = [[Math.floor(diff / 864e5), 'días'], [Math.floor(diff / 36e5) % 24, 'horas'], [Math.floor(diff / 6e4) % 60, 'min'], [Math.floor(diff / 1e3) % 60, 'seg']];
  return (
    <div className="sf-wrap center">
      <T k="title" as="h2" className="sf-h2" />
      <T k="text" as="p" className="sf-muted" />
      <div className="sf-count">{parts.map(([v, l]) => <div key={l}><b>{String(v).padStart(2, '0')}</b><span>{l}</span></div>)}</div>
      <Btn k="button" linkKey="link" />
    </div>
  );
}

function Logos({ s }) {
  return (
    <div className="sf-wrap center">
      <T k="title" as="p" className="sf-eyebrow" />
      <div className="sf-logos">{(s.items || []).map((it, i) => <T key={i} path={['items', i, 'text']} className="sf-logo-item" />)}</div>
    </div>
  );
}

function RichText({ s }) {
  return (
    <div className={'sf-wrap sf-narrow ' + (s.align === 'centro' ? 'center' : '')}>
      <T k="title" as="h2" className="sf-h2" />
      <T k="text" as="p" className="sf-lead" />
    </div>
  );
}

function Video({ s }) {
  const id = (s.url || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];
  return (
    <div className="sf-wrap">
      <T k="title" as="h2" className="sf-h2 center" />
      <div className="sf-video">{id ? <iframe src={`https://www.youtube.com/embed/${id}`} title="Video" allowFullScreen /> : <div className="sf-img-ph">Pega un enlace de YouTube en el panel derecho</div>}</div>
    </div>
  );
}

function Cta() {
  return (
    <div className="sf-wrap">
      <div className="sf-cta">
        <div><T k="title" as="h2" className="sf-h2" /><T k="text" as="p" /></div>
        <Btn k="button" linkKey="link" variant="light" />
      </div>
    </div>
  );
}

function Footer({ s }) {
  const { state } = useStore();
  return (
    <footer className="sf-footer">
      <div className="sf-wrap sf-footer-in">
        <div><b className="sf-logo">{state.settings.storeName}</b><T k="text" as="p" className="sf-muted" /></div>
        {(s.columns || []).map((c, i) => (
          <div key={i}><T path={['columns', i, 'title']} as="h4" /><p className="sf-muted">{(c.links || '').split(',').map(x => x.trim()).filter(Boolean).join(' · ')}</p></div>
        ))}
      </div>
      <div className="sf-wrap sf-copy">© {new Date().getFullYear()} {state.settings.storeName}</div>
    </footer>
  );
}

// ---------- Código: propio o de la comunidad (siempre aislado) ----------
// En el editor, una capa transparente encima del iframe permite seleccionar la sección con un clic.
function Framed({ children }) {
  const { editing } = useContext(EditCtx);
  return <div className="sf-framed">{children}{editing && <div className="sf-frame-cover" />}</div>;
}

function CustomCode({ s }) {
  const { state } = useStore();
  const scan = scanCode(s);
  return <Framed><CodeFrame code={s} theme={state.theme} height={s.height} blocked={scan.ok ? null : 'Este código no pasa la revisión de seguridad. Corrígelo en el panel derecho.'} /></Framed>;
}

function CommunityCode({ s }) {
  const { state } = useStore();
  const c = (state.community || []).find(x => x.id === s.codeId);
  let blocked = null;
  if (!c) blocked = 'Este código ya no existe en la comunidad.';
  else if (c.status !== 'aprobado') blocked = 'Pendiente de verificación por el equipo de Nexlora.';
  else if (!scanCode(c).ok) blocked = 'Bloqueado por el revisor de seguridad.';
  return <Framed><CodeFrame code={c || {}} theme={state.theme} height={s.height || c?.height} blocked={blocked} /></Framed>;
}

// ---------- Registro ----------
// Campos: text, textarea, image, color, select, number, range, toggle, link, items, code.
export const STYLE_FIELDS = [
  { key: '_bg', label: 'Fondo', type: 'color' },
  { key: '_color', label: 'Color de texto', type: 'color' },
  { key: '_pt', label: 'Espacio arriba', type: 'range', min: 0, max: 160 },
  { key: '_pb', label: 'Espacio abajo', type: 'range', min: 0, max: 160 },
  { key: '_anim', label: 'Animación al aparecer', type: 'select', options: ['ninguna', 'aparecer', 'subir', 'zoom'] },
  { key: '_hideMobile', label: 'Ocultar en móvil', type: 'toggle' },
  { key: '_hideDesktop', label: 'Ocultar en escritorio', type: 'toggle' },
];

export const SECTIONS = {
  announcement: { name: 'Barra de anuncio', cat: 'Encabezado', C: Announcement, pad: [0, 0], fields: [{ key: 'text', label: 'Texto', type: 'text' }], defaults: { text: 'Escribe tu anuncio aquí' } },
  header: { name: 'Encabezado', cat: 'Encabezado', C: Header, pad: [0, 0], fields: [{ key: 'logo', label: 'Logo (texto)', type: 'text' }, { key: 'sticky', label: 'Fijo al hacer scroll', type: 'toggle' }], defaults: { logo: 'Mi tienda', sticky: true } },
  hero: {
    name: 'Portada (hero)', cat: 'Destacado', C: Hero, pad: [0, 0],
    fields: [
      { key: 'eyebrow', label: 'Antetítulo', type: 'text' }, { key: 'title', label: 'Título', type: 'text' }, { key: 'subtitle', label: 'Subtítulo', type: 'textarea' },
      { key: 'button', label: 'Botón principal', type: 'text' }, { key: 'link', label: 'Enlace', type: 'link' },
      { key: 'button2', label: 'Botón secundario', type: 'text' }, { key: 'link2', label: 'Enlace secundario', type: 'link' },
      { key: 'image', label: 'Imagen de fondo', type: 'image' },
      { key: 'align', label: 'Alineación', type: 'select', options: ['izquierda', 'centro'] },
      { key: 'height', label: 'Alto', type: 'select', options: ['bajo', 'medio', 'alto'] },
      { key: 'overlay', label: 'Oscurecer imagen (%)', type: 'range', min: 0, max: 90 },
    ],
    defaults: { eyebrow: 'Nuevo', title: 'Un título que vende', subtitle: 'Explica en una frase por qué tu producto es diferente.', button: 'Comprar', link: '#/tienda', button2: '', link2: '', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1800&h=1000&fit=crop&auto=format&q=75', align: 'centro', height: 'medio', overlay: 40 },
  },
  featured: {
    name: 'Productos destacados', cat: 'Productos', C: Featured,
    fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'subtitle', label: 'Subtítulo', type: 'text' }, { key: 'collection', label: 'Colección', type: 'collection' }, { key: 'count', label: 'Cantidad', type: 'range', min: 1, max: 12 }, { key: 'columns', label: 'Columnas', type: 'range', min: 2, max: 5 }],
    defaults: { title: 'Productos destacados', subtitle: '', collection: 'todas', count: 4, columns: 4 },
  },
  'image-text': {
    name: 'Imagen con texto', cat: 'Contenido', C: ImageText,
    fields: [{ key: 'image', label: 'Imagen', type: 'image' }, { key: 'title', label: 'Título', type: 'text' }, { key: 'text', label: 'Texto', type: 'textarea' }, { key: 'button', label: 'Botón', type: 'text' }, { key: 'link', label: 'Enlace', type: 'link' }, { key: 'side', label: 'Imagen a la', type: 'select', options: ['izquierda', 'derecha'] }],
    defaults: { image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=1200&h=900&fit=crop&auto=format&q=75', title: 'Cuenta tu historia', text: 'Habla de tu marca, tu proceso o tu producto estrella.', button: 'Saber más', link: '#', side: 'izquierda' },
  },
  features: {
    name: 'Beneficios con iconos', cat: 'Contenido', C: Features,
    fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'items', label: 'Beneficios', type: 'items', sub: [{ key: 'icon', label: 'Icono (emoji)' }, { key: 'title', label: 'Título' }, { key: 'text', label: 'Texto' }], blank: { icon: '✨', title: 'Beneficio', text: 'Descripción corta' } }],
    defaults: { title: 'Por qué elegirnos', items: [{ icon: '🚚', title: 'Envío rápido', text: 'En 24-48 horas.' }, { icon: '🔒', title: 'Pago seguro', text: 'Tus datos protegidos.' }, { icon: '↩️', title: 'Devolución fácil', text: '30 días para cambiar.' }] },
  },
  testimonials: {
    name: 'Testimonios', cat: 'Confianza', C: Testimonials,
    fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'items', label: 'Testimonios', type: 'items', sub: [{ key: 'quote', label: 'Cita' }, { key: 'author', label: 'Autor' }], blank: { quote: 'Me encantó.', author: 'Cliente' } }],
    defaults: { title: 'Clientes felices', items: [{ quote: 'Excelente calidad.', author: 'Ana' }, { quote: 'Llegó súper rápido.', author: 'Luis' }, { quote: 'Volveré a comprar.', author: 'Marta' }] },
  },
  faq: {
    name: 'Preguntas frecuentes', cat: 'Confianza', C: Faq,
    fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'items', label: 'Preguntas', type: 'items', sub: [{ key: 'q', label: 'Pregunta' }, { key: 'a', label: 'Respuesta' }], blank: { q: '¿Nueva pregunta?', a: 'Respuesta.' } }],
    defaults: { title: 'Preguntas frecuentes', items: [{ q: '¿Hacen envíos?', a: 'Sí, a todo el país.' }] },
  },
  newsletter: { name: 'Suscripción (newsletter)', cat: 'Marketing', C: Newsletter, fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'text', label: 'Texto', type: 'text' }, { key: 'button', label: 'Botón', type: 'text' }], defaults: { title: 'Suscríbete', text: 'Recibe ofertas exclusivas.', button: 'Suscribirme' } },
  countdown: {
    name: 'Cuenta regresiva', cat: 'Marketing', C: Countdown,
    fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'text', label: 'Texto', type: 'text' }, { key: 'date', label: 'Termina el', type: 'datetime' }, { key: 'button', label: 'Botón', type: 'text' }, { key: 'link', label: 'Enlace', type: 'link' }],
    defaults: { title: 'La oferta termina en', text: 'No te lo pierdas.', date: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 16), button: 'Aprovechar', link: '#/tienda' },
  },
  cta: { name: 'Llamado a la acción', cat: 'Marketing', C: Cta, fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'text', label: 'Texto', type: 'text' }, { key: 'button', label: 'Botón', type: 'text' }, { key: 'link', label: 'Enlace', type: 'link' }], defaults: { title: '¿Listo para empezar?', text: 'Compra hoy y recibe mañana.', button: 'Comprar', link: '#/tienda' } },
  gallery: { name: 'Galería', cat: 'Contenido', C: Gallery, fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'items', label: 'Imágenes', type: 'items', sub: [{ key: 'image', label: 'URL de imagen', type: 'image' }], blank: { image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&h=800&fit=crop' } }], defaults: { title: 'Galería', items: [{ image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=800&fit=crop' }, { image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&h=800&fit=crop' }, { image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&h=800&fit=crop' }] } },
  logos: { name: 'Logos / prensa', cat: 'Confianza', C: Logos, fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'items', label: 'Marcas', type: 'items', sub: [{ key: 'text', label: 'Nombre' }], blank: { text: 'Marca' } }], defaults: { title: 'Confían en nosotros', items: [{ text: 'Marca 1' }, { text: 'Marca 2' }, { text: 'Marca 3' }] } },
  'rich-text': { name: 'Texto enriquecido', cat: 'Contenido', C: RichText, fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'text', label: 'Texto', type: 'textarea' }, { key: 'align', label: 'Alineación', type: 'select', options: ['izquierda', 'centro'] }], defaults: { title: 'Título', text: 'Escribe aquí tu contenido.', align: 'centro' } },
  video: { name: 'Video', cat: 'Contenido', C: Video, fields: [{ key: 'title', label: 'Título', type: 'text' }, { key: 'url', label: 'Enlace de YouTube', type: 'text' }], defaults: { title: 'Mira cómo funciona', url: '' } },
  footer: { name: 'Pie de página', cat: 'Pie', C: Footer, pad: [0, 0], fields: [{ key: 'text', label: 'Texto', type: 'text' }, { key: 'columns', label: 'Columnas', type: 'items', sub: [{ key: 'title', label: 'Título' }, { key: 'links', label: 'Enlaces (separados por coma)' }], blank: { title: 'Columna', links: 'Enlace 1, Enlace 2' } }], defaults: { text: 'Gracias por visitarnos.', columns: [] } },
  'custom-code': {
    name: 'Código propio (HTML + CSS)', cat: 'Avanzado', C: CustomCode, pad: [24, 24],
    fields: [{ key: 'html', label: 'HTML', type: 'code' }, { key: 'css', label: 'CSS', type: 'code' }, { key: 'height', label: 'Alto mínimo (px)', type: 'range', min: 80, max: 900 }],
    defaults: { html: '<div class="caja">\n  <h2>Hola 👋</h2>\n  <p>Escribe tu propio HTML y CSS. Usa var(--primario), var(--radio)…</p>\n</div>', css: '.caja{padding:32px;text-align:center;background:var(--superficie);border-radius:var(--radio)}\nh2{font-family:var(--fuente-titulos);color:var(--primario)}', height: 220 },
  },
  community: {
    name: 'Código de la comunidad', cat: 'Comunidad', C: CommunityCode, pad: [24, 24], hidden: true,
    fields: [{ key: 'height', label: 'Alto mínimo (px)', type: 'range', min: 80, max: 900 }],
    defaults: { codeId: null, height: null },
  },
};

// Plantillas de página completas: un clic y tienes la página armada.
export const PAGE_TEMPLATES = [
  { id: 'blank', name: 'En blanco', sections: ['header', 'rich-text', 'footer'] },
  { id: 'landing', name: 'Landing de producto', sections: ['announcement', 'header', 'hero', 'features', 'featured', 'testimonials', 'faq', 'cta', 'footer'] },
  { id: 'promo', name: 'Promoción con cuenta regresiva', sections: ['announcement', 'header', 'hero', 'countdown', 'featured', 'newsletter', 'footer'] },
  { id: 'about', name: 'Sobre nosotros', sections: ['header', 'rich-text', 'image-text', 'gallery', 'testimonials', 'footer'] },
  { id: 'contact', name: 'Contacto / FAQ', sections: ['header', 'rich-text', 'faq', 'newsletter', 'footer'] },
];

// ---------- Renderizador ----------
// variant: 'a' | 'b' — en una prueba A/B la variante B usa sus propios ajustes.
export const sectionSettings = (section, variant) => (variant === 'b' && section.ab?.b ? section.ab.b : section.settings);

export function RenderSection({ section, variant }) {
  const def = SECTIONS[section.type];
  if (!def) return null;
  const s = sectionSettings(section, variant);
  const [pt, pb] = def.pad || [64, 64];
  const style = {
    background: s._bg || undefined,
    color: s._color || undefined,
    paddingTop: (s._pt ?? pt) + 'px',
    paddingBottom: (s._pb ?? pb) + 'px',
  };
  const cls = ['sf-sec', 'sec-' + section.type, s._anim && s._anim !== 'ninguna' ? 'anim-' + s._anim : '', s._hideMobile ? 'hide-m' : '', s._hideDesktop ? 'hide-d' : ''].join(' ');
  return (
    <SecCtx.Provider value={{ id: section.id, settings: s }}>
      <section className={cls} style={style} data-sec={section.id}><def.C s={s} /></section>
    </SecCtx.Provider>
  );
}

export function themeVars(t) {
  return {
    '--sf-primary': t.primary, '--sf-accent': t.accent, '--sf-bg': t.background, '--sf-surface': t.surface,
    '--sf-text': t.text, '--sf-muted': t.muted, '--sf-radius': t.radius + 'px', '--sf-width': t.width + 'px',
    '--sf-hfont': `'${t.headingFont}', serif`, '--sf-bfont': `'${t.bodyFont}', system-ui, sans-serif`,
  };
}
