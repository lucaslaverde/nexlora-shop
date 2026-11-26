import React from 'react';
import { Activity, Eye } from 'lucide-react';
import { useStore, money } from '../store.jsx';
import { Card, PageHead, Soon } from '../ui.jsx';
import { BarChart, salesByDay } from './Dashboard.jsx';

export default function Analytics() {
  const { state } = useStore();
  const S = state.settings;
  const byProduct = {};
  const byChannel = {};
  state.orders.forEach(o => {
    byChannel[o.channel] = (byChannel[o.channel] || 0) + o.total;
    o.items.forEach(i => { byProduct[i.title] = (byProduct[i.title] || 0) + i.price * i.qty; });
  });
  const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1]);
  const maxP = Math.max(1, ...top.map(t => t[1]));
  const ch = Object.entries(byChannel).sort((a, b) => b[1] - a[1]);
  const total = ch.reduce((s, c) => s + c[1], 0) || 1;
  const units = state.orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const profit = state.orders.reduce((s, o) => s + o.items.reduce((a, i) => a + (i.price - (state.products.find(p => p.id === i.productId)?.cost || 0)) * i.qty, 0), 0);
  return (
    <div className="page">
      <PageHead title="Analíticas" subtitle="Últimos 30 días · calculado con los pedidos reales de la tienda" />
      <div className="kpis">
        <div className="kpi"><span>Ventas</span><b>{money(total, S)}</b></div>
        <div className="kpi"><span>Unidades vendidas</span><b>{units}</b></div>
        <div className="kpi"><span>Ganancia bruta</span><b>{money(profit, S)}</b><small>ventas − costo de productos</small></div>
        <div className="kpi"><span>Pedidos</span><b>{state.orders.length}</b></div>
      </div>
      <Card title="Ventas por día"><BarChart data={salesByDay(state.orders, 30)} settings={S} height={200} /></Card>
      <div className="grid-2">
        <Card title="Productos más vendidos">{top.map(([t, v]) => <div key={t} className="hbar"><span>{t}</span><div><i style={{ width: (v / maxP) * 100 + '%' }} /></div><b>{money(v, S)}</b></div>)}</Card>
        <Card title="Ventas por canal">{ch.map(([t, v]) => <div key={t} className="hbar"><span>{t}</span><div><i style={{ width: (v / total) * 100 + '%' }} /></div><b>{Math.round((v / total) * 100)}%</b></div>)}</Card>
      </div>
      <div className="grid-2">
        <Soon icon={Eye} title="Visitas y tasa de conversión" text="Sesiones, embudo (visita → carrito → compra) y fuentes de tráfico." />
        <Soon icon={Activity} title="Mapa de calor del editor" text="Ve dónde hacen clic tus clientes en cada sección." />
      </div>
    </div>
  );
}
