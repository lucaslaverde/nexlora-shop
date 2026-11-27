// Datos de prueba de la fase 3: comercio en Colombia, CRM, juegos con premio y automatizaciones.
// Todo es ficticio (tienda Café Aurora). Los patrones vienen de cómo se trabaja con Shopify + GHL + Solitics.

const ago = (d, h = 10) => { const t = new Date(); t.setDate(t.getDate() - d); t.setHours(h, 20, 0, 0); return t.toISOString(); };
const ahead = d => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(23, 59, 0, 0); return t.toISOString(); };

// Envíos por departamento (Shopify Basic no deja tarifas por ciudad; aquí se cobra por departamento).
export const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];

export const seedShipping = {
  mode: 'departamento',
  freeFrom: 150000,
  zones: [
    { id: 'z1', name: 'Antioquia', departments: ['Antioquia'], price: 12000, days: '1-2 días' },
    { id: 'z2', name: 'Bogotá y Cundinamarca', departments: ['Bogotá D.C.', 'Cundinamarca'], price: 15000, days: '1-3 días' },
    { id: 'z3', name: 'Eje cafetero y Valle', departments: ['Caldas', 'Risaralda', 'Quindío', 'Valle del Cauca'], price: 16000, days: '2-3 días' },
    { id: 'z4', name: 'Costa Caribe', departments: ['Atlántico', 'Bolívar', 'Magdalena', 'Córdoba', 'Sucre', 'Cesar', 'La Guajira'], price: 20000, days: '2-4 días' },
    { id: 'z5', name: 'Zonas remotas', departments: ['San Andrés y Providencia', 'Amazonas', 'Vaupés', 'Guainía', 'Vichada', 'Guaviare'], price: 38000, days: '5-8 días' },
  ],
  restPrice: 22000,
  restDays: '3-5 días',
  pickup: { enabled: true, name: 'Recoger en la tostadora (Medellín)' },
};

// Contraentrega: dónde se ofrece, hasta qué monto y cómo se confirma antes de despachar.
export const seedCod = {
  enabled: true,
  maxTotal: 400000,
  blockedDepartments: ['San Andrés y Providencia', 'Amazonas', 'Vaupés', 'Guainía', 'Vichada'],
  requireConfirmation: true,
  feeToStore: 6000, // costo extra que cobra la transportadora por recaudar
  confirmTemplate: 'Hola {{nombre}} 👋 Te escribimos de {{tienda}} para confirmar tu pedido #{{pedido}} por {{total}}, pago contra entrega en {{ciudad}}. ¿Lo confirmas? Responde SÍ y lo despachamos hoy.',
};

// Supuestos para calcular la ganancia real de cada pedido.
export const seedProfit = { gatewayPct: 3.49, gatewayFixed: 900, returnRatePct: 12, returnShippingCost: 14000, adCostPerOrder: 0 };

// Descuento escalonado por colección (como una preventa de Black Days): 1 = 10 %, 2 = 15 %, 3 o más = 20 %.
export const seedTierDiscount = {
  id: 'd-esc', code: '', title: 'Preventa escalonada de cafés', type: 'escalonado', automatic: true, active: true,
  collections: ['cafes'], tiers: [{ qty: 1, pct: 10 }, { qty: 2, pct: 15 }, { qty: 3, pct: 20 }],
  startsAt: ago(2, 0), endsAt: ahead(10), combinable: false, uses: 9, limit: null, minSubtotal: 0, value: 0,
};

export const seedAdSpend = [
  { id: 'g1', channel: 'Meta', month: new Date().toISOString().slice(0, 7), amount: 420000 },
  { id: 'g2', channel: 'Google', month: new Date().toISOString().slice(0, 7), amount: 180000 },
];

// UTM y forma de pago para los pedidos de ejemplo (por número de pedido).
export const orderExtras = {
  1001: { department: 'Antioquia', city: 'Medellín', paymentMethod: 'transferencia', utm: { source: 'meta', medium: 'paid', campaign: 'Prospección noviembre', at: ago(13) } },
  1002: { department: 'Antioquia', city: 'Medellín', paymentMethod: 'contraentrega', codStatus: 'confirmado' },
  1003: { department: 'Valle del Cauca', city: 'Cali', paymentMethod: 'transferencia' },
  1004: { department: 'Atlántico', city: 'Barranquilla', paymentMethod: 'contraentrega', codStatus: 'confirmado', utm: { source: 'google', medium: 'cpc', campaign: 'Búsqueda marca', at: ago(7) } },
  1005: { department: 'Bogotá D.C.', city: 'Bogotá', paymentMethod: 'transferencia', utm: { source: 'meta', medium: 'paid', campaign: 'Remarketing', at: ago(5) } },
  1006: { department: 'Antioquia', city: 'Medellín', paymentMethod: 'contraentrega', codStatus: 'por-confirmar' },
  1007: { department: 'Atlántico', city: 'Barranquilla', paymentMethod: 'transferencia', utm: { source: 'meta', medium: 'paid', campaign: 'Remarketing', at: ago(1) } },
  1008: { department: 'Valle del Cauca', city: 'Cali', paymentMethod: 'contraentrega', codStatus: 'por-confirmar' },
};

export const contactExtras = {
  c1: { source: 'Tienda online', createdAt: ago(40) },
  c2: { source: 'Anuncio Meta', createdAt: ago(20) },
  c3: { source: 'WhatsApp', createdAt: ago(30) },
  c4: { source: 'Google', createdAt: ago(10) },
};

export const seedLeads = [
  { id: 'c5', name: 'Valentina Ríos', email: '', phone: '+57 300 000 0005', city: 'Medellín', tags: ['lead', 'juego-ruleta'], marketing: true, source: 'Ruleta de bienvenida', createdAt: ago(2) },
  { id: 'c6', name: 'Usuario de Instagram', email: '', phone: '', city: '', tags: ['lead', 'anuncio-sin-producto'], marketing: false, source: 'Anuncio Meta · Instagram', createdAt: ago(0, 9), handle: '@cafeteando.co' },
];

// ---------- CRM ----------
export const seedPipelines = [
  { id: 'chat', name: 'Ventas por chat', stages: [{ id: 'nuevo', name: 'Nuevo chat' }, { id: 'esperando-pago', name: 'Esperando pago' }, { id: 'pagado', name: 'Pagado' }, { id: 'perdido', name: 'Perdido' }] },
  { id: 'leads', name: 'Leads de anuncios y juegos', stages: [{ id: 'nuevo', name: 'Nuevo lead' }, { id: 'contactado', name: 'Contactado' }, { id: 'compro', name: 'Compró' }] },
  { id: 'post', name: 'Postventa y recompra', stages: [{ id: 'entregado', name: 'Pedido pagado' }, { id: 'resena', name: 'Pedir reseña' }, { id: 'recompra', name: 'Invitar a recomprar' }, { id: 'recompro', name: 'Recompró' }] },
];

export const seedDeals = [
  { id: 'dl1', pipelineId: 'chat', stageId: 'esperando-pago', contactId: 'c3', title: 'Pedido por chat · 2 × Blend Espresso', value: 148600, createdAt: ago(0, 11), updatedAt: ago(0, 11) },
  { id: 'dl2', pipelineId: 'leads', stageId: 'nuevo', contactId: 'c5', title: 'Ganó 15 % en la ruleta', value: 0, createdAt: ago(2), updatedAt: ago(2) },
  { id: 'dl3', pipelineId: 'leads', stageId: 'nuevo', contactId: 'c6', title: 'Chat de anuncio sin producto', value: 0, createdAt: ago(0, 9), updatedAt: ago(0, 9) },
  { id: 'dl4', pipelineId: 'post', stageId: 'resena', contactId: 'c1', title: 'Pedido #1001', value: 179000, createdAt: ago(13), updatedAt: ago(6) },
  { id: 'dl5', pipelineId: 'post', stageId: 'entregado', contactId: 'c4', title: 'Pedido #1007', value: 162000, createdAt: ago(1), updatedAt: ago(1) },
];

export const seedConversations = [
  {
    id: 'cv1', contactId: 'c3', channel: 'whatsapp', status: 'abierta', unread: 0, updatedAt: ago(0, 11),
    messages: [
      { from: 'cliente', text: 'Hola, quiero 2 Blend Espresso para la oficina', at: ago(0, 11) },
      { from: 'asistente', text: '¡Hola Camila! 2 × Blend Espresso Aurora 1 kg. Con la preventa escalonada llevas 15 % de descuento: $132.600. El envío a Cali es de $16.000. ¿Te armo el pedido?', at: ago(0, 11) },
      { from: 'cliente', text: 'Sí, por favor. Pago por transferencia', at: ago(0, 11) },
      { from: 'asistente', text: 'Listo ✅ Te envío los datos para la transferencia. En cuanto un asesor confirme el pago, creamos tu pedido.', at: ago(0, 11) },
    ],
  },
  {
    id: 'cv2', contactId: 'c6', channel: 'instagram', status: 'abierta', unread: 1, updatedAt: ago(0, 9),
    messages: [{ from: 'cliente', text: '¿Precio?', at: ago(0, 9) }],
  },
];

export const seedTasks = [
  {
    id: 't1', kind: 'validar-pago', title: '💳 Validar pago y crear pedido', contactId: 'c3', dealId: 'dl1', due: ahead(0), done: false, createdAt: ago(0, 11),
    draft: { items: [{ productId: 'p3', qty: 2 }], department: 'Valle del Cauca', city: 'Cali', address: 'Cra 100 # 11-20', paymentMethod: 'transferencia', channel: 'WhatsApp', convChannel: 'whatsapp' },
  },
];

// Plantillas de WhatsApp (las de marketing necesitan aprobación de Meta).
export const seedTemplates = [
  { id: 'wt1', name: 'bienvenida_primera_compra', category: 'Marketing', status: 'aprobada', body: 'Hola {{nombre}} ☕ Gracias por escribirnos. Tu primera compra tiene 10 % con el código {{codigo}}. Válido 7 días.' },
  { id: 'wt2', name: 'carrito_abandonado', category: 'Marketing', status: 'aprobada', body: '{{nombre}}, dejaste {{producto}} en el carrito. Te lo guardamos hasta hoy: {{enlace}}' },
  { id: 'wt3', name: 'confirmar_contraentrega', category: 'Utilidad', status: 'aprobada', body: 'Hola {{nombre}}, confirma tu pedido #{{pedido}} por {{total}} (pago contra entrega). Responde SÍ para despacharlo hoy.' },
  { id: 'wt4', name: 'pedir_resena', category: 'Marketing', status: 'pendiente', body: '{{nombre}}, ¿qué tal tu café? Cuéntanos en 1 minuto y te regalamos envío gratis en tu próxima compra.' },
  { id: 'wt5', name: 'recompra_30_dias', category: 'Marketing', status: 'aprobada', body: '{{nombre}}, tu café de hace un mes ya se debe estar acabando. Pide hoy con {{codigo}} y te llega en 48 h.' },
];

// Automatizaciones (como los workflows de GHL, pero se crean aquí mismo y sin API).
export const seedWorkflows = [
  {
    id: 'wf1', name: 'Primera compra (30 días)', active: true, trigger: 'lead_creado', exitOn: 'compra',
    description: 'A los leads que todavía no compran: código de bienvenida y recordatorios. Sale del flujo cuando compra.',
    steps: [
      { id: 's1', type: 'descuento', pct: 10, days: 7, label: 'Crear código único de 10 %' },
      { id: 's2', type: 'whatsapp', template: 'wt1' },
      { id: 's3', type: 'esperar', hours: 48 },
      { id: 's4', type: 'email', subject: '¿Ya elegiste tu café?', body: 'Tu código {{codigo}} sigue activo.' },
      { id: 's5', type: 'esperar', hours: 120 },
      { id: 's6', type: 'whatsapp', template: 'wt1' },
    ],
  },
  {
    id: 'wf2', name: 'Carrito abandonado', active: true, trigger: 'carrito_abandonado', exitOn: 'compra',
    description: 'Si deja el checkout con datos de contacto y no compra en 1 hora.',
    steps: [{ id: 's1', type: 'esperar', hours: 1 }, { id: 's2', type: 'whatsapp', template: 'wt2' }, { id: 's3', type: 'esperar', hours: 23 }, { id: 's4', type: 'email', subject: 'Tu carrito te espera', body: 'Lo guardamos para ti.' }],
  },
  {
    id: 'wf3', name: 'Contraentrega: confirmar antes de despachar', active: true, trigger: 'pedido_contraentrega', exitOn: null,
    description: 'Cada pedido contra entrega recibe la plantilla de confirmación y se crea una tarea si tiene riesgo alto.',
    steps: [{ id: 's1', type: 'whatsapp', template: 'wt3' }, { id: 's2', type: 'tarea_si_riesgo', title: '📞 Llamar para confirmar (riesgo alto)' }],
  },
  {
    id: 'wf4', name: 'Postventa y recompra', active: true, trigger: 'pedido_pagado', exitOn: null,
    description: 'Mueve al pipeline de postventa, pide reseña a los 7 días e invita a recomprar a los 30.',
    steps: [
      { id: 's1', type: 'etapa', pipelineId: 'post', stageId: 'entregado' },
      { id: 's2', type: 'esperar', hours: 168 }, { id: 's3', type: 'whatsapp', template: 'wt4' }, { id: 's4', type: 'etapa', pipelineId: 'post', stageId: 'resena' },
      { id: 's5', type: 'esperar', hours: 552 }, { id: 's6', type: 'descuento', pct: 10, days: 10, label: 'Código de recompra' }, { id: 's7', type: 'whatsapp', template: 'wt5' }, { id: 's8', type: 'etapa', pipelineId: 'post', stageId: 'recompra' },
    ],
  },
];

// ---------- Juegos con premio (lo aprendido de los widgets de Solitics) ----------
// El premio se decide ANTES de animar (como el winningOption que manda el CRM) y el código
// se entrega solo cuando la persona deja su WhatsApp o correo, al final (eso duplica los registros).
export const seedGames = [
  {
    id: 'g1', type: 'ruleta', name: 'Ruleta de bienvenida', active: true,
    trigger: { type: 'tiempo', seconds: 6 }, position: 'centro', pages: 'todas', frequency: 'una-vez', ask: 'despues',
    texts: { title: 'Gira y gana', subtitle: 'Un premio seguro para tu primera compra', cta: 'Girar la ruleta', win: '¡Ganaste {{premio}}!', lose: 'Esta vez no salió. Igual tienes envío gratis desde $150.000.', claim: 'Recibir mi código' },
    prizes: [
      { id: 'p1', label: '10 % OFF', kind: 'porcentaje', value: 10, weight: 30, color: '#7a3e1d' },
      { id: 'p2', label: 'Envío gratis', kind: 'envio', value: 0, weight: 25, color: '#e9b872' },
      { id: 'p3', label: '5 % OFF', kind: 'porcentaje', value: 5, weight: 30, color: '#a0522d' },
      { id: 'p4', label: '15 % OFF', kind: 'porcentaje', value: 15, weight: 10, color: '#2b1d14' },
      { id: 'p5', label: '$20.000', kind: 'fijo', value: 20000, weight: 5, color: '#c98b4a' },
    ],
    codeDays: 7, minSubtotal: 0,
    stats: { views: 412, plays: 168, wins: 168, leads: 121, redeemed: 23, revenue: 2780000 },
  },
  {
    id: 'g2', type: 'raspa', name: 'Raspa y gana de temporada', active: false,
    trigger: { type: 'salida' }, position: 'centro', pages: 'todas', frequency: 'una-vez', ask: 'despues',
    texts: { title: 'Raspa y descubre tu premio', subtitle: 'Pasa el dedo o el mouse sobre la tarjeta', cta: '', win: '¡Te salió {{premio}}!', lose: 'Sin premio esta vez.', claim: 'Guardar mi premio' },
    prizes: [{ id: 'p1', label: '12 % OFF', kind: 'porcentaje', value: 12, weight: 60, color: '#7a3e1d' }, { id: 'p2', label: 'Envío gratis', kind: 'envio', value: 0, weight: 40, color: '#e9b872' }],
    codeDays: 5, minSubtotal: 0, stats: { views: 0, plays: 0, wins: 0, leads: 0, redeemed: 0, revenue: 0 },
  },
  {
    id: 'g3', type: 'caja', name: 'Caja misteriosa', active: false,
    trigger: { type: 'tiempo', seconds: 10 }, position: 'abajo', pages: 'todas', frequency: 'una-vez', ask: 'despues',
    texts: { title: 'Elige una caja', subtitle: 'Una de ellas tiene tu regalo', cta: '', win: 'Adentro había: {{premio}}', lose: 'Vacía… ¡pero te regalamos envío gratis!', claim: 'Quiero mi regalo' },
    prizes: [{ id: 'p1', label: '10 % OFF', kind: 'porcentaje', value: 10, weight: 50, color: '#7a3e1d' }, { id: 'p2', label: '$15.000', kind: 'fijo', value: 15000, weight: 50, color: '#e9b872' }],
    codeDays: 7, minSubtotal: 60000, stats: { views: 0, plays: 0, wins: 0, leads: 0, redeemed: 0, revenue: 0 },
  },
  {
    id: 'g4', type: 'quiz', name: '¿Cómo preparas tu café?', active: false,
    trigger: { type: 'tiempo', seconds: 15 }, position: 'derecha', pages: 'todas', frequency: 'una-vez', ask: 'despues',
    texts: { title: '¿Cómo preparas tu café?', subtitle: 'Te recomendamos el ideal y te damos un regalo', cta: '', win: 'Para ti: {{recomendacion}}. Y tu regalo: {{premio}}', lose: '', claim: 'Ver mi recomendación' },
    question: { options: [{ label: 'Espresso', tag: 'prefiere-espresso', productId: 'p3' }, { label: 'Filtrado (V60, Chemex)', tag: 'prefiere-filtrado', productId: 'p1' }, { label: 'Prensa francesa', tag: 'prefiere-prensa', productId: 'p2' }] },
    prizes: [{ id: 'p1', label: '5 % OFF', kind: 'porcentaje', value: 5, weight: 100, color: '#7a3e1d' }],
    codeDays: 7, minSubtotal: 0, stats: { views: 0, plays: 0, wins: 0, leads: 0, redeemed: 0, revenue: 0 },
  },
];

export const seedAssistant = {
  enabled: true,
  name: 'Lía',
  mode: 'automatico', // automatico | sugerido | sugerido-de-dia
  dayStart: 7, dayEnd: 19,
  greeting: '¡Hola! Soy Lía, de Café Aurora ☕ ¿Qué café buscas hoy?',
  rules: [
    'Buscar SIEMPRE en el catálogo antes de responder. Nunca decir que un producto no existe: si no se encuentra, pasar a un asesor.',
    'Si algo está agotado, ofrecer un sustituto de la misma colección.',
    'Vender en el chat: armar el pedido aquí mismo, sin mandar al cliente a la web salvo que lo pida.',
    'Envíos y promociones salen de la configuración de la tienda (nunca inventar promociones).',
    'Si el chat empieza con una pregunta automática de anuncio ("¿Precio?") sin producto, preguntar cuál vio.',
  ],
  handoff: 'Te paso con un asesor humano 🙌 Te responde en minutos.',
};

export const seedEvents = [
  { id: 'e1', at: ago(2), type: 'juego_jugado', contactId: 'c5', data: { game: 'Ruleta de bienvenida', premio: '15 % OFF' } },
  { id: 'e2', at: ago(2), type: 'lead_creado', contactId: 'c5', data: { fuente: 'Ruleta de bienvenida' } },
  { id: 'e3', at: ago(0, 9), type: 'chat_recibido', contactId: 'c6', data: { canal: 'instagram', texto: '¿Precio?' } },
  { id: 'e4', at: ago(0, 11), type: 'chat_recibido', contactId: 'c3', data: { canal: 'whatsapp', texto: 'Quiero 2 Blend Espresso' } },
];

// Página de lanzamiento de ejemplo (patrón de las landings a medida, pero armada con secciones).
const sec = (id, type, settings) => ({ id, type, hidden: false, settings });
const U = (id, w, h) => `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=75`;
export const seedLaunchPage = {
  id: 'preventa', title: 'Preventa Nueva Cosecha', slug: 'preventa', kind: 'pagina',
  seo: { title: 'Preventa Nueva Cosecha — Café Aurora', description: 'Preventa escalonada de la nueva cosecha: entre más bolsas llevas, más ahorras. Tostado a pedido y envío a todo Colombia.' },
  sections: [
    sec('pv1', 'announcement', { text: 'Preventa por pocos días · envío gratis desde $150.000' }),
    sec('pv2', 'header', { logo: 'Café Aurora', sticky: true }),
    sec('pv3', 'hero', { eyebrow: 'Nueva cosecha 2026', title: 'La cosecha que esperabas, a precio de preventa', subtitle: 'Reserva hoy y la tostamos para ti la próxima semana.', button: 'Ver los cafés', link: '#/tienda/coleccion/cafes', button2: '', link2: '', image: U('1447933601403-0c6688de566e', 1800, 1000), align: 'centro', height: 'medio', overlay: 50 }),
    sec('pv4', 'tier-promo', { eyebrow: 'Preventa escalonada', title: 'Entre más bolsas, más ahorras', text: 'El descuento sube con cada bolsa y se aplica a todos los cafés de la preventa.', button: 'Armar mi pedido', link: '#/tienda/coleccion/cafes', whenOff: 'ocultar' }),
    sec('pv5', 'pyramid', { eyebrow: 'Perfil de taza · Huila', title: 'Lo que vas a sentir', items: [{ level: 'Al oler', notes: 'Panela, flores blancas' }, { level: 'En boca', notes: 'Durazno, caramelo, cacao' }, { level: 'Al final', notes: 'Chocolate amargo, nuez' }] }),
    sec('pv6', 'steps', { title: 'Así funciona la preventa', items: [{ title: 'Reservas hoy', text: 'Pagas por transferencia o contra entrega.' }, { title: 'Tostamos el lunes', text: 'Solo lo que se reservó: nada de café viejo.' }, { title: 'Te llega en 24-48 h', text: 'Te avisamos por WhatsApp cuando sale.' }] }),
    sec('pv7', 'featured', { title: 'Cafés de la preventa', subtitle: 'Todos suman para el descuento', collection: 'cafes', count: 3, columns: 3 }),
    sec('pv8', 'store-card', { image: U('1501339847302-ac426a4a7cbb', 1000, 800), title: 'Tostadora Aurora · Medellín', address: 'Cra 43 # 10-21, El Poblado (dirección de ejemplo)', hours: 'Lunes a sábado · 8:00 a. m. – 7:00 p. m.\nDomingo · 10:00 a. m. – 4:00 p. m.', phone: '573000000000', map: 'https://maps.google.com' }),
    sec('pv9', 'faq-cats', { title: 'Preguntas de la preventa', subtitle: 'Si no encuentras tu respuesta, escríbele a Lía en el chat.', items: [{ cat: 'Preventa', q: '¿Cuándo me llega?', a: 'La tostamos el lunes siguiente y te llega en 24-48 horas.' }, { cat: 'Preventa', q: '¿El descuento se suma con mi código?', a: 'No en los cafés de la preventa: ya tienen su descuento. El código aplica al resto.' }, { cat: 'Pagos', q: '¿Puedo pagar contra entrega?', a: 'Sí, en la mayoría del país, en pedidos de hasta $400.000. Te confirmamos por WhatsApp antes de despachar.' }, { cat: 'Envíos', q: '¿Cuánto cuesta el envío?', a: 'Depende del departamento y lo ves exacto en el checkout. Es gratis desde $150.000.' }] }),
    sec('pv10', 'footer', { text: 'Café Aurora · Tienda de prueba creada con Nexlora Shop', columns: [] }),
  ],
};
