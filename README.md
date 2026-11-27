# Nexlora Shop

Plataforma para crear y administrar tiendas online, con un creador de páginas visual. Toma la idea de Shopify y la mejora.

**Demo en vivo:** https://lucaslaverde.github.io/nexlora-shop/

La demo trae una tienda de prueba ficticia, **Café Aurora**, con productos, pedidos, clientes y dos páginas.

## Qué hay hoy (fase 1)

**Panel de administración**
- **Inicio:** ventas, pedidos, ticket promedio, gráfica por día, pendientes y guía para configurar la tienda.
- **Pedidos:** filtros por estado, búsqueda, detalle, marcar como pagado, preparado o enviado, aviso por WhatsApp y notas internas.
- **Productos:** lista con acciones en lote, crear y editar (precio, precio tachado, costo y margen, SKU, stock, SEO con vista previa de Google), colecciones, inventario y exportar a CSV.
- **Clientes:** lista, ficha con historial y segmentos sugeridos.
- **Descuentos:** códigos por porcentaje, monto fijo o envío gratis, con compra mínima y límite de usos. **Funcionan de verdad en el checkout.**
- **Contenido:** editor del menú de la tienda y biblioteca de imágenes.
- **Analíticas:** ventas, unidades, ganancia bruta, productos más vendidos y ventas por canal.
- **Tienda online:** temas (4 estilos), páginas (crear desde plantilla, duplicar, eliminar, ver estado) y preferencias (SEO, tienda protegida con contraseña).
- **Configuración:** datos generales, moneda, pagos, tarifas de envío, impuestos, políticas, usuarios y plan.
- **Búsqueda global** de productos, pedidos, clientes y páginas.

**Creador de páginas (lo que lo hace mejor)**
- Se edita **directo sobre la vista previa**: haces clic en cualquier texto y escribes.
- 16 secciones: anuncio, encabezado, portada, productos destacados, imagen con texto, beneficios, testimonios, preguntas frecuentes, newsletter, cuenta regresiva, llamado a la acción, galería, logos, texto, video y pie de página.
- Cada sección tiene **Contenido y Estilo** (fondo, color, espacios, animación, ocultar en móvil o en escritorio).
- Para reordenar, arrastras y sueltas o usas los botones sobre la vista previa. Hay un "+" entre secciones para insertar una.
- Vista de **escritorio, tablet y móvil** que responde igual que un teléfono real (container queries).
- **Deshacer y rehacer ilimitados**, con atajos de teclado (Ctrl+Z, Ctrl+Shift+Z, Ctrl+D, Supr, Ctrl+S).
- El **borrador se guarda solo**. Nada sale en vivo hasta que pulsas **Publicar**.
- **Historial de versiones**: guarda las últimas 15 publicaciones y se puede restaurar cualquiera.
- **Plantillas de página completas**: landing, promoción, sobre nosotros y contacto.
- Panel de **tema global**: colores, tipografías, bordes y ancho, con estilos rápidos.
- **Modo enfoque**, y en el teléfono se edita con paneles deslizables.

**Tienda pública**
- Inicio, páginas, colecciones con orden, ficha de producto con cantidad y relacionados, carrito lateral con barra de envío gratis, checkout con códigos de descuento y página de gracias.
- **Cada compra crea el pedido en el panel**, descuenta el stock y crea el cliente.

## Fase 2: lo que Shopify no tiene

- **Comunidad de código verificado.** Cualquiera envía una sección (HTML + CSS). Un revisor automático rechaza lo peligroso (scripts, eventos, `javascript:`, iframes, formularios, recursos http, `@import`) y el equipo de Nexlora aprueba el resto. Ya instalada, la sección corre en un iframe con sandbox **sin scripts** y con su propia CSP, así que no puede leer datos de la tienda ni de los clientes. Hay un probador que confirma que un `<script>` o un `onerror` que se colara no se ejecuta.
- **Código propio en el editor**, con la misma revisión. Si un bloque no la pasa, la página no se publica.
- **Pruebas A/B por sección sin programar.** Se crea la variante B y se edita en la vista previa. Cada visitante ve siempre la misma variante y se cuentan las vistas y los clics de cada una. Con un botón te quedas con la ganadora. (Shopify Rollouts exige programar un tema completo.)
- **Publicación programada.** El borrador sale en vivo solo a la hora elegida, sin apps.
- **Checkout personalizable incluido en todos los planes**: pedido por WhatsApp (queda registrado en el panel y abre el chat con el resumen), teléfono obligatorio, notas del pedido, mensaje de confianza y texto de gracias. (En Shopify, personalizar el checkout a fondo es de Shopify Plus.)
- **Revisión de calidad de 0 a 100** antes de publicar. Revisa el SEO, el contraste (WCAG 4,5:1), los botones sin destino, las imágenes que faltan, el código inseguro, las cuentas regresivas vencidas y el número de secciones.

## Fase 3: comercio de verdad + CRM (lo que hoy se arma a mano con Shopify + GHL + Solitics)

Hecha a partir del trabajo real de e-commerce y CRM (Devier, POP KIDS, los widgets de Hondubet/Sivarbet), sin copiar código de temas comerciales.

- **Un solo motor comercial** (`src/commerce/pricing.js`): precios, descuentos, envío, contra entrega, riesgo y ganancia. Tienda, carrito, checkout y chat usan **el mismo cálculo**. En Shopify «mostrar y cobrar son dos sistemas»; aquí no.
- **Descuento escalonado automático** (1 = 10 %, 2 = 15 %, 3+ = 20 % por colección, con fechas). Se ve en tarjetas, ficha (tabla de escalones), carrito («agrega 1 más») y checkout. No usa el precio de comparación, así que no hay doble descuento, y se apaga solo al vencer. Los códigos no se suman encima, salvo que se marque como combinable.
- **Envío por departamento** (zonas, gratis desde X, recoger en tienda).
- **Contra entrega con confirmación**: departamentos sin contra entrega, monto máximo, pestaña «Por confirmar», **riesgo explicable** (cliente nuevo, rechazos anteriores, celular o dirección incompletos, monto alto, hora), botón para confirmar por WhatsApp y **ganancia real por pedido** (pasarela, recaudo y devoluciones esperadas).
- **CRM**: contactos con origen, etiquetas y línea de tiempo; **pipelines** que se mueven solos (Ventas por chat, Leads, Postventa) y se pueden arrastrar; **tareas** solo cuando piden acción humana.
- **Conversaciones** (WhatsApp, Instagram y web en una bandeja): modo sugerido con aprobación, tomar el chat y respuestas sugeridas.
- **Asistente de ventas «Lía»** (motor local): busca siempre en el catálogo en vivo, nunca niega un producto (pasa a un asesor), ofrece sustitutos de lo agotado, responde envíos, promociones y pagos, y ante un «¿Precio?» de anuncio pregunta cuál producto vio. **Arma el pedido en el chat**: con contra entrega crea el pedido; con transferencia crea la tarea «💳 Validar pago y crear pedido», y al completarla el pedido queda pagado y el cliente recibe la confirmación en su chat. Tiene un modo «sugerido de día, automático de noche».
- **Automatizaciones** sin API externa: Primera compra (30 días), Carrito abandonado, Confirmar contra entrega y Postventa y recompra. Cada una tiene disparadores, pasos (esperar, WhatsApp, email, código único, etiqueta, etapa, tarea, tarea si el riesgo es alto), salida al comprar, un registro por contacto y «Probar ahora». Las plantillas de WhatsApp tienen estado de aprobación de Meta.
- **Juegos con premio** (lo aprendido de 113 widgets de Solitics): ruleta, raspa y gana (canvas, se revela al 38 %), caja misteriosa y cuestionario de preferencia (pone etiqueta y recomienda un producto). El premio se decide **antes** de animar, el código es **único, personal y de un solo uso**, y el contacto se pide **al final**. El embudo mide vistas → jugadas → registros → canjes → **ventas por visitante**.
- **Medición honesta**: prefijos «Tienda ·», «Anuncios ·» y «Juntas ·»; ventas reales = pagadas; vencidas aparte; **atribución por UTM, último clic en anuncio en 7 días**; ROAS por canal con el gasto anotado; embudos de WhatsApp, juegos y contra entrega; generador de enlaces con UTM.
- **Secciones de landing**: preventa escalonada en vivo (lee el descuento real y desaparece al vencer), pirámide de notas, pasos, tienda física, FAQ por categorías y juego dentro de la página. Plantilla «Lanzamiento con preventa» y página de ejemplo `/tienda/p/preventa`.

## Lo que queda listo para conectar (próximamente)

Los lugares ya existen en el panel, en **Apps e integraciones** y en cada sección:
proveedores y dropshipping, pasarelas de pago (Stripe, Mercado Pago, Wompi/PSE, PayPal), transportadoras, chatbot IA para la tienda, asistente IA del panel y del editor, WhatsApp Business, email marketing, Meta y Google Shopping, reseñas, píxeles, facturación electrónica, dominio propio, variantes, campañas y automatizaciones, carritos abandonados, blog y metaobjetos.

## Cómo funciona por dentro

- React 18 + Vite y estilos propios, sin frameworks de UI.
- Los datos se guardan en el navegador (`localStorage`), así que cada visitante de la demo tiene su propia copia. En **Configuración → General → Restablecer** se vuelve a la tienda de prueba.
- `src/sections/registry.jsx` es el registro de secciones. Para agregar una sección nueva basta con una entrada (nombre, campos, valores por defecto y componente), y el editor la muestra sola.

```bash
npm install
npm run dev      # desarrollo
npm run build    # genera dist/
```

## Próximas fases

1. Base de datos y cuentas reales (varias tiendas por usuario).
2. Subida de imágenes.
3. Pagos reales.
4. Asistente IA en el editor.
5. Variantes.
6. Dominio propio.

Fotos de la demo: [Unsplash](https://unsplash.com) (licencia libre).
