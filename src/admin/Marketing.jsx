import React from 'react';
import { Mail, MessageCircle, Zap, Target, Share2, Gift, Star, Link2 } from 'lucide-react';
import { PageHead, Card, Soon } from '../ui.jsx';

export default function Marketing() {
  return (
    <div className="page">
      <PageHead title="Marketing" subtitle="Campañas, automatizaciones y canales. Esta sección queda lista para conectar más adelante." />
      <div className="grid-2">
        <Card title="Campañas">
          <div className="stack">
            <Soon icon={Mail} title="Campañas de correo" text="Editor de correos con los mismos bloques que el creador de páginas." />
            <Soon icon={MessageCircle} title="Campañas por WhatsApp" text="Mensajes a segmentos con plantillas aprobadas." />
            <Soon icon={Target} title="Anuncios en Meta, Google y TikTok" text="Crea anuncios con tus productos y mide el retorno." />
          </div>
        </Card>
        <Card title="Automatizaciones">
          <div className="stack">
            <Soon icon={Zap} title="Carrito abandonado" text="Recordatorio automático a la 1 h y a las 24 h." />
            <Soon icon={Gift} title="Bienvenida con cupón" text="Cupón automático al suscribirse al newsletter." />
            <Soon icon={Star} title="Pedir reseña" text="Mensaje 7 días después de la entrega." />
          </div>
        </Card>
      </div>
      <Card title="Más herramientas">
        <div className="grid-2">
          <Soon icon={Share2} title="Programa de afiliados" text="Links con comisión para creadores." />
          <Soon icon={Link2} title="Links con UTM" text="Mide qué publicación trae cada venta." />
        </div>
      </Card>
    </div>
  );
}
