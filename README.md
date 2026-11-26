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
