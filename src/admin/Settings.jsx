import React from 'react';
import { Store, CreditCard, Truck, Receipt, Globe, Languages, Users, Bell, FileText, Gem, Plus, Trash2, RotateCcw, ShoppingCart, HandCoins, Calculator } from 'lucide-react';
import { DEPARTAMENTOS } from '../seed2.js';
import { useStore, money } from '../store.jsx';
import { uid } from '../seed.js';
import { Card, PageHead, Field, Toggle, Btn, Soon } from '../ui.jsx';

const TABS = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'pagos', label: 'Pagos', icon: CreditCard },
  { id: 'checkout', label: 'Checkout', icon: ShoppingCart },
  { id: 'envios', label: 'Envíos por departamento', icon: Truck },
  { id: 'contraentrega', label: 'Contra entrega', icon: HandCoins },
  { id: 'rentabilidad', label: 'Rentabilidad', icon: Calculator },
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
        <div className="row between setting-row"><div><b>Pago contra entrega</b><p className="muted sm">{S.cod?.enabled ? 'Activo. Las reglas están en «Contra entrega».' : 'Apagado'}</p></div><a className="btn" href="#/configuracion/contraentrega">Configurar</a></div>
        <div className="row between setting-row"><div><b>Transferencia bancaria</b><p className="muted sm">Activo en el checkout</p></div><Toggle checked onChange={() => {}} /></div>
        <Soon icon={CreditCard} title="Tarjetas, PSE, Nequi, PayPal" text="Se activan conectando una pasarela desde Apps e integraciones." />
      </Card>
    ); break;
    case 'checkout': {
      const ck = S.checkout || {};
      const setCk = (k, v) => mutate(st => { st.settings.checkout = { ...(st.settings.checkout || {}), [k]: v }; });
      body = (
        <>
          <Card title="Checkout a tu medida">
            <p className="muted sm">En otras plataformas personalizar el checkout suele exigir el plan más caro. Aquí viene incluido para todos.</p>
            <div className="row between setting-row"><div><b>Pedir por WhatsApp</b><p className="muted sm">Botón verde en el checkout: el pedido queda registrado en el panel y se abre el chat con el resumen listo.</p></div><Toggle checked={!!ck.whatsappOrder} onChange={v => setCk('whatsappOrder', v)} /></div>
            <Field label="Número de WhatsApp de la tienda (con indicativo, solo números)"><input className="input" value={ck.whatsapp || ''} onChange={e => setCk('whatsapp', e.target.value.replace(/[^\d]/g, ''))} placeholder="573001234567" /></Field>
            <div className="row between setting-row"><div><b>Teléfono obligatorio</b><p className="muted sm">Para coordinar la entrega.</p></div><Toggle checked={!!ck.requirePhone} onChange={v => setCk('requirePhone', v)} /></div>
            <div className="row between setting-row"><div><b>Notas del pedido</b><p className="muted sm">El cliente puede dejar indicaciones (portería, horario, regalo…).</p></div><Toggle checked={!!ck.orderNotes} onChange={v => setCk('orderNotes', v)} /></div>
            <Field label="Mensaje de confianza bajo el botón"><input className="input" value={ck.trustText || ''} onChange={e => setCk('trustText', e.target.value)} /></Field>
            <Field label="Texto extra en la página de gracias"><input className="input" value={ck.thanksText || ''} onChange={e => setCk('thanksText', e.target.value)} /></Field>
            <a className="link" href="#/tienda/checkout" target="_blank" rel="noreferrer">Ver el checkout →</a>
          </Card>
          <Soon icon={ShoppingCart} title="Campos personalizados y venta adicional en el checkout" text="Pide datos extra (NIT, fecha de entrega) y ofrece un producto más antes de pagar." />
        </>
      );
      break;
    }
    case 'envios': {
      const sh = S.shipping;
      const setSh = fn => mutate(st => fn(st.settings.shipping));
      const used = new Set(sh.zones.flatMap(z => z.departments));
      body = (
        <>
          <Card title="Envío por departamento" actions={<Btn icon={Plus} onClick={() => setSh(x => x.zones.push({ id: uid('z'), name: 'Nueva zona', departments: [], price: 15000, days: '2-4 días' }))}>Agregar zona</Btn>}>
            <p className="muted sm" style={{ marginTop: 0 }}>La tienda, el carrito, el checkout y el asistente de chat cobran exactamente lo mismo, porque leen esta misma tabla. Cambias una tarifa aquí y cambia en todas partes.</p>
            {sh.zones.map((z, i) => (
              <div key={z.id} className="zone">
                <div className="zone-h">
                  <input className="input" value={z.name} onChange={e => setSh(x => { x.zones[i].name = e.target.value; })} aria-label="Nombre de la zona" />
                  <input className="input" type="number" value={z.price} onChange={e => setSh(x => { x.zones[i].price = +e.target.value; })} aria-label="Precio" />
                  <input className="input" value={z.days} onChange={e => setSh(x => { x.zones[i].days = e.target.value; })} aria-label="Tiempo de entrega" />
                  <button className="icon-btn" onClick={() => setSh(x => { x.zones.splice(i, 1); })} aria-label="Quitar zona"><Trash2 size={15} /></button>
                </div>
                <div className="chips" style={{ margin: '6px 0 0' }}>{DEPARTAMENTOS.filter(d => z.departments.includes(d) || !used.has(d)).map(d => <button key={d} className={z.departments.includes(d) ? 'on' : ''} onClick={() => setSh(x => { const zz = x.zones[i]; zz.departments = zz.departments.includes(d) ? zz.departments.filter(y => y !== d) : [...zz.departments, d]; })}>{d}</button>)}</div>
              </div>
            ))}
            <div className="grid-3" style={{ marginTop: 12 }}>
              <Field label="Resto del país"><input className="input" type="number" value={sh.restPrice} onChange={e => setSh(x => { x.restPrice = +e.target.value; })} /></Field>
              <Field label="Tiempo resto del país"><input className="input" value={sh.restDays} onChange={e => setSh(x => { x.restDays = e.target.value; })} /></Field>
              <Field label="Envío gratis desde (vacío = nunca)"><input className="input" type="number" value={sh.freeFrom || ''} onChange={e => setSh(x => { x.freeFrom = e.target.value ? +e.target.value : null; })} /></Field>
            </div>
            <div className="row between setting-row"><div><b>Recoger en tienda</b><p className="muted sm">{sh.pickup?.name}</p></div><Toggle checked={!!sh.pickup?.enabled} onChange={v => setSh(x => { x.pickup.enabled = v; })} /></div>
          </Card>
          <Soon icon={Truck} title="Guías con transportadoras" text="Cotización en vivo y guía automática (Coordinadora, Servientrega, Interrapidísimo…)." />
        </>
      );
      break;
    }
    case 'contraentrega': {
      const c = S.cod;
      const setC = fn => mutate(st => fn(st.settings.cod));
      body = (
        <Card title="Pago contra entrega">
          <div className="row between setting-row"><div><b>Ofrecer contra entrega</b><p className="muted sm">Cada pedido entra como «por confirmar», con su nivel de riesgo, y el flujo le manda la plantilla de confirmación.</p></div><Toggle checked={c.enabled} onChange={v => setC(x => { x.enabled = v; })} /></div>
          <div className="grid-2">
            <Field label="Monto máximo del pedido"><input className="input" type="number" value={c.maxTotal || ''} onChange={e => setC(x => { x.maxTotal = +e.target.value || null; })} /></Field>
            <Field label="Lo que te cobra la transportadora por recaudar"><input className="input" type="number" value={c.feeToStore} onChange={e => setC(x => { x.feeToStore = +e.target.value; })} /></Field>
          </div>
          <Field label="Departamentos SIN contra entrega">
            <div className="chips" style={{ margin: 0 }}>{DEPARTAMENTOS.map(d => <button key={d} className={c.blockedDepartments.includes(d) ? 'on' : ''} onClick={() => setC(x => { x.blockedDepartments = x.blockedDepartments.includes(d) ? x.blockedDepartments.filter(y => y !== d) : [...x.blockedDepartments, d]; })}>{d}</button>)}</div>
          </Field>
          <Field label="Mensaje para confirmar por WhatsApp" hint="Variables: {{nombre}} {{tienda}} {{pedido}} {{total}} {{ciudad}}"><textarea className="input" rows={3} value={c.confirmTemplate} onChange={e => setC(x => { x.confirmTemplate = e.target.value; })} /></Field>
          <p className="muted sm">Confirmar antes de despachar es lo que más baja las devoluciones. El riesgo de cada pedido sale de señales simples: cliente nuevo, rechazos anteriores, celular o dirección incompletos, monto muy alto y hora del pedido.</p>
        </Card>
      );
      break;
    }
    case 'rentabilidad': {
      const P = S.profit;
      const setP = (k, v) => mutate(st => { st.settings.profit[k] = v; });
      body = (
        <Card title="Supuestos para calcular la ganancia real">
          <p className="muted sm" style={{ marginTop: 0 }}>Cada pedido muestra su ganancia: venta − costo de productos − envío que asumes − pasarela − recaudo − devoluciones esperadas.</p>
          <div className="grid-2">
            <Field label="Comisión de la pasarela (%)"><input className="input" type="number" step="0.01" value={P.gatewayPct} onChange={e => setP('gatewayPct', +e.target.value)} /></Field>
            <Field label="Comisión fija por transacción"><input className="input" type="number" value={P.gatewayFixed} onChange={e => setP('gatewayFixed', +e.target.value)} /></Field>
            <Field label="% de devoluciones en contra entrega"><input className="input" type="number" value={P.returnRatePct} onChange={e => setP('returnRatePct', +e.target.value)} /></Field>
            <Field label="Costo del flete de devolución"><input className="input" type="number" value={P.returnShippingCost} onChange={e => setP('returnShippingCost', +e.target.value)} /></Field>
          </div>
          <p className="muted sm">Las tarifas cambian: revísalas cada trimestre. La ganancia por pedido se ve en el detalle de cada pedido y el total en Medición.</p>
        </Card>
      );
      break;
    }
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
