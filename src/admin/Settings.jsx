import React from 'react';
import { Store, CreditCard, Truck, Receipt, Globe, Languages, Users, Bell, FileText, Gem, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useStore, money } from '../store.jsx';
import { uid } from '../seed.js';
import { Card, PageHead, Field, Toggle, Btn, Soon } from '../ui.jsx';

const TABS = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'pagos', label: 'Pagos', icon: CreditCard },
  { id: 'envios', label: 'Envíos y entregas', icon: Truck },
  { id: 'impuestos', label: 'Impuestos', icon: Receipt },
  { id: 'dominios', label: 'Dominios', icon: Globe },
  { id: 'mercados', label: 'Mercados e idiomas', icon: Languages },
  { id: 'usuarios', label: 'Usuarios y permisos', icon: Users },
  { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  { id: 'politicas', label: 'Políticas', icon: FileText },
  { id: 'plan', label: 'Plan', icon: Gem },
];

export default function SettingsPage({ tab }) {
  const { state, mutate, reset } = useStore();
  const S = state.settings;
  const set = (k, v) => mutate(st => { st.settings[k] = v; });
  let body;
  switch (tab) {
    case 'general': body = (
      <>
        <Card title="Datos de la tienda">
          <div className="grid-2">
            <Field label="Nombre de la tienda"><input className="input" value={S.storeName} onChange={e => set('storeName', e.target.value)} /></Field>
            <Field label="Correo de contacto"><input className="input" value={S.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Moneda"><select className="input" value={S.currency} onChange={e => set('currency', e.target.value)}>{['COP', 'USD', 'MXN', 'EUR', 'ARS', 'CLP', 'PEN'].map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Zona horaria"><select className="input" value={S.timezone} onChange={e => set('timezone', e.target.value)}>{['America/Bogota', 'America/Mexico_City', 'America/New_York', 'Europe/Madrid', 'America/Argentina/Buenos_Aires'].map(c => <option key={c}>{c}</option>)}</select></Field>
          </div>
        </Card>
        <Card title="Datos de prueba"><div className="row between"><p className="muted">Vuelve a cargar la tienda de prueba Café Aurora. Borra todo lo que hayas cambiado.</p><Btn icon={RotateCcw} variant="danger" onClick={() => confirm('¿Restablecer todos los datos de prueba?') && reset()}>Restablecer</Btn></div></Card>
      </>
    ); break;
    case 'pagos': body = (
      <Card title="Métodos de pago">
        <div className="row between setting-row"><div><b>Pago contra entrega</b><p className="muted sm">Activo en el checkout</p></div><Toggle checked onChange={() => {}} /></div>
        <div className="row between setting-row"><div><b>Transferencia bancaria</b><p className="muted sm">Activo en el checkout</p></div><Toggle checked onChange={() => {}} /></div>
        <Soon icon={CreditCard} title="Tarjetas, PSE, Nequi, PayPal" text="Se activan conectando una pasarela desde Apps e integraciones." />
      </Card>
    ); break;
    case 'envios': body = (
      <Card title="Tarifas de envío" actions={<Btn icon={Plus} onClick={() => mutate(st => st.settings.shippingRates.push({ id: uid('r'), name: 'Nueva tarifa', price: 10000, freeFrom: null }))}>Agregar tarifa</Btn>}>
        {S.shippingRates.map((r, i) => (
          <div key={r.id} className="menu-row">
            <input className="input" value={r.name} onChange={e => mutate(st => { st.settings.shippingRates[i].name = e.target.value; })} />
            <input className="input" type="number" value={r.price} onChange={e => mutate(st => { st.settings.shippingRates[i].price = Number(e.target.value); })} title="Precio" />
            <input className="input" type="number" value={r.freeFrom || ''} placeholder="Gratis desde…" onChange={e => mutate(st => { st.settings.shippingRates[i].freeFrom = e.target.value ? Number(e.target.value) : null; })} />
            <button className="icon-btn" onClick={() => mutate(st => { st.settings.shippingRates.splice(i, 1); })}><Trash2 size={16} /></button>
          </div>
        ))}
        <p className="muted sm">Columnas: nombre · precio · gratis desde (subtotal). Ej: {money(150000, S)}.</p>
        <Soon icon={Truck} title="Zonas y transportadoras" text="Tarifas por ciudad y cotización en vivo." />
      </Card>
    ); break;
    case 'impuestos': body = (
      <Card title="Impuestos">
        <Field label="Tasa de IVA (%)"><input className="input" type="number" value={S.taxRate} onChange={e => set('taxRate', Number(e.target.value))} /></Field>
        <div className="row between setting-row"><div><b>Precios con impuestos incluidos</b><p className="muted sm">Se muestra "Incluye IVA" en el checkout</p></div><Toggle checked={S.taxIncluded} onChange={v => set('taxIncluded', v)} /></div>
      </Card>
    ); break;
    case 'politicas': body = (
      <Card title="Políticas de la tienda">
        {Object.entries(S.policies).map(([k, v]) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><textarea className="input" rows={3} value={v} onChange={e => mutate(st => { st.settings.policies[k] = e.target.value; })} /></Field>)}
        <Soon title="Generar políticas con IA" text="Textos legales base según tu país." />
      </Card>
    ); break;
    case 'usuarios': body = (
      <Card title="Usuarios y permisos">
        {S.staff.map((u, i) => <div key={i} className="row between setting-row"><b>{u.name}</b><span className="muted">{u.role}</span></div>)}
        <Soon icon={Users} title="Invitar equipo" text="Roles con permisos por sección (pedidos, productos, editor)." />
      </Card>
    ); break;
    case 'dominios': body = <Card title="Dominios"><p className="muted">Dirección actual: la de GitHub Pages de esta prueba.</p><Soon icon={Globe} title="Conectar o comprar un dominio" text="tutienda.com con certificado SSL automático." /></Card>; break;
    case 'mercados': body = <Card title="Mercados e idiomas"><Soon icon={Languages} title="Vender en varios países" text="Precios por país, monedas y tienda traducida." /></Card>; break;
    case 'notificaciones': body = <Card title="Notificaciones"><Soon icon={Bell} title="Correos y WhatsApp automáticos" text="Confirmación de pedido, envío y entrega, con plantillas editables." /></Card>; break;
    case 'plan': body = <Card title="Plan"><p>Estás en el <b>plan de prueba</b>. Los planes y cobros se definen más adelante.</p></Card>; break;
    default: body = null;
  }
  return (
    <div className="page">
      <PageHead title="Configuración" />
      <div className="settings">
        <nav className="settings-nav">{TABS.map(t => <a key={t.id} href={'#/configuracion/' + t.id} className={tab === t.id ? 'on' : ''}><t.icon size={16} />{t.label}</a>)}</nav>
        <div className="stack">{body}</div>
      </div>
    </div>
  );
}
