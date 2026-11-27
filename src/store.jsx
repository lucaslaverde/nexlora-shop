import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as seed from './seed.js';
import * as s2 from './seed2.js';
import { runDue } from './crm/engine.js';

const KEY = 'nexlora-shop-v1';

export function initialState() {
  const pages = [...seed.seedPages, s2.seedLaunchPage].map(p => ({
    ...p,
    published: { sections: structuredClone(p.sections), at: new Date().toISOString() },
    versions: [],
  }));
  return {
    settings: { ...structuredClone(seed.seedSettings), checkout: structuredClone(seed.defaultCheckout), ...phase3Settings() },
    community: structuredClone(seed.seedCommunity),
    abStats: {},
    theme: structuredClone(seed.defaultTheme),
    products: structuredClone(seed.seedProducts),
    collections: structuredClone(seed.seedCollections),
    customers: [...seed.seedCustomers.map(c => ({ ...c, ...s2.contactExtras[c.id] })), ...s2.seedLeads].map(c => structuredClone(c)),
    orders: seed.seedOrders.map(o => structuredClone({ ...o, ...s2.orderExtras[o.number], address: 'Calle 10 # 43-21' })),
    discounts: [structuredClone(s2.seedTierDiscount), ...structuredClone(seed.seedDiscounts)],
    ...phase3Data(),
    menus: structuredClone(seed.seedMenus),
    pages,
    files: [],
    blog: [],
    integrations: {},
    abandoned: [],
  };
}

// Fase 3: comercio en Colombia, CRM, juegos y automatizaciones.
function phase3Settings() {
  return { shipping: structuredClone(s2.seedShipping), cod: structuredClone(s2.seedCod), profit: structuredClone(s2.seedProfit), assistant: structuredClone(s2.seedAssistant) };
}
function phase3Data() {
  return {
    pipelines: structuredClone(s2.seedPipelines), deals: structuredClone(s2.seedDeals), conversations: structuredClone(s2.seedConversations),
    tasks: structuredClone(s2.seedTasks), templates: structuredClone(s2.seedTemplates), workflows: structuredClone(s2.seedWorkflows).map(w => ({ ...w, stats: { enrolled: 0, sent: 0, completed: 0 } })),
    runs: [], games: structuredClone(s2.seedGames), adSpend: structuredClone(s2.seedAdSpend), events: structuredClone(s2.seedEvents),
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const st = { ...initialState(), ...JSON.parse(raw) };
      // Datos guardados por una versión anterior: completar lo nuevo sin borrar nada.
      if (!st.settings.checkout) st.settings.checkout = structuredClone(seed.defaultCheckout);
      for (const [k, v] of Object.entries(phase3Settings())) if (!st.settings[k]) st.settings[k] = v;
      return promoteScheduled(st);
    }
  } catch { /* sin almacenamiento */ }
  return initialState();
}

// Publicación programada: si ya llegó la hora, la versión programada pasa a estar en vivo.
export function promoteScheduled(st) {
  const now = Date.now();
  let changed = false;
  for (const p of st.pages) {
    if (p.scheduled && new Date(p.scheduled.at).getTime() <= now) {
      if (p.published) p.versions = [{ at: p.published.at, sections: p.published.sections }, ...(p.versions || [])].slice(0, 15);
      p.published = { sections: p.scheduled.sections, at: p.scheduled.at };
      delete p.scheduled;
      changed = true;
    }
  }
  return changed ? { ...st } : st;
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* lleno o bloqueado */ } }, 250);
    return () => clearTimeout(t);
  }, [state]);

  // mutate(fn): recibe una copia del estado y la modifica directamente.
  const mutate = useCallback(fn => setState(prev => { const next = structuredClone(prev); fn(next); return next; }), []);
  const reset = useCallback(() => setState(initialState()), []);
  // Cada 30 s: avanza las automatizaciones cuyas esperas ya vencieron.
  useEffect(() => {
    const t = setInterval(() => setState(prev => {
      if (!(prev.runs || []).some(r => r.status === 'activa' && new Date(r.nextAt).getTime() <= Date.now())) return prev;
      const next = structuredClone(prev); runDue(next); return next;
    }), 30000);
    return () => clearInterval(t);
  }, []);
  // Revisa cada 20 s si alguna publicación programada ya debe salir en vivo.
  useEffect(() => {
    const t = setInterval(() => setState(prev => {
      if (!prev.pages.some(p => p.scheduled && new Date(p.scheduled.at).getTime() <= Date.now())) return prev;
      return promoteScheduled(structuredClone(prev));
    }), 20000);
    return () => clearInterval(t);
  }, []);
  const value = useMemo(() => ({ state, mutate, reset, setState }), [state, mutate, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function money(n, settings) {
  const cur = settings?.currency || 'COP';
  try {
    return new Intl.NumberFormat(settings?.locale || 'es-CO', { style: 'currency', currency: cur, maximumFractionDigits: cur === 'COP' ? 0 : 2 }).format(n || 0);
  } catch { return '$' + Math.round(n || 0); }
}

export const fmtDate = iso => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
