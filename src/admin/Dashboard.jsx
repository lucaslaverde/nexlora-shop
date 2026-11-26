import React from 'react';
import { Paintbrush, Package, CreditCard, Truck, Globe, CheckCircle2, Circle } from 'lucide-react';
import { useStore, money, fmtDate } from '../store.jsx';
import { Card, Badge, PageHead, LinkBtn, statusTone } from '../ui.jsx';

export function salesByDay(orders, days = 14) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const total = orders.filter(o => new Date(o.createdAt).toDateString() === key).reduce((s, o) => s + o.total, 0);
    out.push({ label: d.getDate() + '/' + (d.getMonth() + 1), total });
  }
  return out;
}

export function BarChart({ data, settings, height = 180 }) {
  const max = Math.max(1, ...data.map(d => d.total));
  return (
    <div className="bars" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="bar-col" title={`${d.label}: ${money(d.total, settings)}`}>
          <div className="bar" style={{ height: `${(d.total / max) * 100}%` }} />
          <span>{i % 2 === 0 || data.length <= 8 ? d.label : ''}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { state } = useStore();
  const { orders, settings } = state;
  const total = orders.reduce((s, o) => s + o.total, 0);
  const paid = orders.filter(o => o.payment === 'pagado');
  const avg = orders.length ? total / orders.length : 0;
  const toShip = orders.filter(o => o.fulfillment === 'sin preparar');
  const toPay = orders.filter(o => o.payment === 'pendiente');
  const lowStock = state.products.filter(p => p.status === 'activo' && p.stock < 10);
  const home = state.pages.find(p => p.kind === 'inicio');

  const steps = [
    { done: state.products.length > 0, label: 'Agrega tu primer producto', to: '#/productos/nuevo', icon: Package },
    { done: (home?.versions?.length || 0) > 0, label: 'Personaliza y publica tu página de inicio', to: '#/editor/home', icon: Paintbrush },
    { done: false, label: 'Conecta una pasarela de pago', to: '#/apps', icon: CreditCard },
    { done: settings.shippingRates.length > 0, label: 'Configura tus envíos', to: '#/configuracion/envios', icon: Truck },
    { done: false, label: 'Conecta tu dominio', to: '#/configuracion/dominios', icon: Globe },
  ];

  return (
    <div className="page">
      <PageHead title={`Hola 👋 Así va ${settings.storeName}`} subtitle="Resumen de los últimos 14 días (datos de la tienda de prueba)" actions={<><LinkBtn href="#/tienda" target="_blank">Ver tienda</LinkBtn><LinkBtn variant="primary" icon={Paintbrush} href="#/editor/home">Editar página</LinkBtn></>} />
      <Card title="Lo que Nexlora tiene y Shopify no" actions={<Badge tone="purple">Nuevo</Badge>}>
        <div className="diff">
          <a href="#/comunidad"><b>🧩 Comunidad de código verificado</b><span>Cualquiera crea secciones, nosotros las revisamos y corren aisladas.</span></a>
          <a href="#/editor/home"><b>🧪 Pruebas A/B por sección</b><span>Sin programar un tema entero: pestaña A/B en cualquier sección.</span></a>
          <a href="#/editor/home"><b>⏰ Publicación programada</b><span>Deja lista la oferta y sale sola a la hora exacta. Sin apps.</span></a>
          <a href="#/configuracion/checkout"><b>💬 Checkout libre y pedido por WhatsApp</b><span>Incluido en todos los planes.</span></a>
          <a href="#/editor/home"><b>✅ Revisión de calidad 0-100</b><span>SEO, contraste, enlaces rotos y seguridad antes de publicar.</span></a>
          <a href="#/editor/home"><b>✍️ Edición directa sobre la página</b><span>Haces clic en el texto y escribes.</span></a>
        </div>
      </Card>
      <div className="kpis">
        <div className="kpi"><span>Ventas totales</span><b>{money(total, settings)}</b><small className="up">Datos de prueba</small></div>
        <div className="kpi"><span>Pedidos</span><b>{orders.length}</b><small>{paid.length} pagados</small></div>
        <div className="kpi"><span>Ticket promedio</span><b>{money(avg, settings)}</b><small>por pedido</small></div>
        <div className="kpi"><span>Clientes</span><b>{state.customers.length}</b><small>{state.customers.filter(c => c.marketing).length} aceptan marketing</small></div>
      </div>
      <div className="grid-2">
        <Card title="Ventas por día"><BarChart data={salesByDay(orders)} settings={settings} /></Card>
        <Card title="Pendientes de hoy">
          <a className="todo" href="#/pedidos?f=sin-preparar"><b>{toShip.length}</b> pedidos por preparar</a>
          <a className="todo" href="#/pedidos?f=sin-pagar"><b>{toPay.length}</b> pagos pendientes</a>
          <a className="todo" href="#/productos/inventario"><b>{lowStock.length}</b> productos con poco stock</a>
        </Card>
      </div>
      <div className="grid-2">
        <Card title="Configura tu tienda" actions={<Badge tone="blue">{steps.filter(s => s.done).length}/{steps.length}</Badge>}>
          {steps.map((s, i) => (
            <a key={i} href={s.to} className={'step' + (s.done ? ' done' : '')}>{s.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}<s.icon size={16} />{s.label}</a>
          ))}
        </Card>
        <Card title="Últimos pedidos" pad={false} actions={<a href="#/pedidos" className="link">Ver todos</a>}>
          <table className="table"><tbody>
            {[...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(o => (
              <tr key={o.id} onClick={() => (location.hash = '#/pedidos/' + o.id)}>
                <td><b>#{o.number}</b><div className="muted sm">{fmtDate(o.createdAt)}</div></td>
                <td>{state.customers.find(c => c.id === o.customerId)?.name}</td>
                <td><Badge tone={statusTone(o.payment)}>{o.payment}</Badge></td>
                <td className="r">{money(o.total, settings)}</td>
              </tr>
            ))}
          </tbody></table>
        </Card>
      </div>
    </div>
  );
}
