import React, { useState } from 'react';
import { CreditCard, Truck, Bot, MessageCircle, Mail, BarChart3, Package, Boxes, Globe, Receipt, Star, Instagram, Search } from 'lucide-react';
import { PageHead, Card, Badge, Tabs } from '../ui.jsx';

// Catálogo de integraciones. Todas quedan visibles para conectarlas más adelante.
const APPS = [
  { cat: 'Proveedores', icon: Boxes, name: 'Proveedores y dropshipping', text: 'Importa catálogos de proveedores, sincroniza stock y envía pedidos automáticamente.' },
  { cat: 'Proveedores', icon: Package, name: 'Impresión bajo demanda', text: 'Camisetas, tazas y más sin inventario.' },
  { cat: 'Pagos', icon: CreditCard, name: 'Stripe', text: 'Tarjetas internacionales, Apple Pay y Google Pay.' },
  { cat: 'Pagos', icon: CreditCard, name: 'Mercado Pago', text: 'Pagos locales en Latinoamérica.' },
  { cat: 'Pagos', icon: CreditCard, name: 'Wompi / PSE', text: 'Pagos en Colombia: PSE, Nequi, tarjetas.' },
  { cat: 'Pagos', icon: CreditCard, name: 'PayPal', text: 'Pagos con cuenta PayPal.' },
  { cat: 'Envíos', icon: Truck, name: 'Transportadoras', text: 'Cotiza y genera guías con transportadoras nacionales.' },
  { cat: 'IA y chat', icon: Bot, name: 'Chatbot IA para la tienda', text: 'Responde preguntas, recomienda productos y cierra ventas 24/7.' },
  { cat: 'IA y chat', icon: Bot, name: 'Asistente IA del panel', text: 'Crea páginas, describe productos y analiza ventas hablando.' },
  { cat: 'IA y chat', icon: MessageCircle, name: 'WhatsApp Business', text: 'Botón de chat, catálogo y notificaciones de pedido.' },
  { cat: 'Marketing', icon: Mail, name: 'Email marketing', text: 'Campañas y automatizaciones de correo.' },
  { cat: 'Marketing', icon: Instagram, name: 'Instagram y Facebook Shop', text: 'Sincroniza tu catálogo con Meta.' },
  { cat: 'Marketing', icon: Search, name: 'Google Shopping', text: 'Tus productos en los resultados de Google.' },
  { cat: 'Marketing', icon: Star, name: 'Reseñas de productos', text: 'Reseñas con foto y estrellas en cada producto.' },
  { cat: 'Analítica', icon: BarChart3, name: 'Google Analytics y Meta Pixel', text: 'Mide visitas y conversiones.' },
  { cat: 'Operación', icon: Receipt, name: 'Facturación electrónica', text: 'Factura automática por cada pedido.' },
  { cat: 'Operación', icon: Globe, name: 'Dominio propio', text: 'Conecta tutienda.com.' },
];

export default function Apps() {
  const [cat, setCat] = useState('Todas');
  const cats = ['Todas', ...new Set(APPS.map(a => a.cat))];
  return (
    <div className="page">
      <PageHead title="Apps e integraciones" subtitle="Todo lo externo queda aquí, listo para conectar. Por ahora ninguna integración está activa." />
      <Tabs value={cat} onChange={setCat} tabs={cats.map(c => ({ id: c, label: c }))} />
      <div className="apps">{APPS.filter(a => cat === 'Todas' || a.cat === cat).map(a => (
        <Card key={a.name}>
          <div className="app-card">
            <div className="soon-ic"><a.icon size={20} /></div>
            <div><b>{a.name}</b><p className="muted sm">{a.text}</p></div>
          </div>
          <div className="row between"><span className="muted sm">{a.cat}</span><Badge tone="purple">Próximamente</Badge></div>
        </Card>
      ))}</div>
    </div>
  );
}
