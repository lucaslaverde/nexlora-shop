import React from 'react';
import { Sparkles } from 'lucide-react';

export const Card = ({ title, actions, children, pad = true, className = '' }) => (
  <div className={'card ' + className}>
    {(title || actions) && <div className="card-h"><h3>{title}</h3><div className="row">{actions}</div></div>}
    <div className={pad ? 'card-b' : ''}>{children}</div>
  </div>
);

export const Badge = ({ tone = 'gray', children }) => <span className={'badge ' + tone}>{children}</span>;

export const Btn = ({ variant = 'default', icon: Icon, children, ...p }) => (
  <button className={'btn ' + variant} {...p}>{Icon && <Icon size={16} />}{children}</button>
);

export const LinkBtn = ({ variant = 'default', icon: Icon, children, ...p }) => (
  <a className={'btn ' + variant} {...p}>{Icon && <Icon size={16} />}{children}</a>
);

export const Field = ({ label, hint, children }) => (
  <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
);

export const Toggle = ({ checked, onChange, disabled }) => (
  <button type="button" className={'toggle' + (checked ? ' on' : '')} disabled={disabled} onClick={() => onChange(!checked)} aria-pressed={checked}><i /></button>
);

export const PageHead = ({ title, subtitle, actions, back }) => (
  <div className="page-head">
    <div>{back && <a href={back} className="back">← Volver</a>}<h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
    <div className="row">{actions}</div>
  </div>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs">{tabs.map(t => <button key={t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>{t.label}{t.count != null && <em>{t.count}</em>}</button>)}</div>
);

export const Empty = ({ icon: Icon = Sparkles, title, text, action }) => (
  <div className="empty"><div className="empty-ic"><Icon size={26} /></div><h3>{title}</h3><p className="muted">{text}</p>{action}</div>
);

// Tarjeta para funciones que ya tienen su lugar pero se conectan más adelante.
export const Soon = ({ icon: Icon = Sparkles, title, text, tag = 'Próximamente' }) => (
  <div className="soon"><div className="soon-ic"><Icon size={20} /></div><div><b>{title}</b><p className="muted">{text}</p></div><Badge tone="purple">{tag}</Badge></div>
);

export const statusTone = s => ({ pagado: 'green', pendiente: 'yellow', reembolsado: 'gray', enviado: 'green', preparado: 'blue', 'sin preparar': 'yellow', activo: 'green', borrador: 'gray', archivado: 'gray' }[s] || 'gray');
