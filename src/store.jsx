import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as seed from './seed.js';

const KEY = 'nexlora-shop-v1';

export function initialState() {
  const pages = seed.seedPages.map(p => ({
    ...p,
    published: { sections: structuredClone(p.sections), at: new Date().toISOString() },
    versions: [],
  }));
  return {
    settings: { ...structuredClone(seed.seedSettings), checkout: structuredClone(seed.defaultCheckout) },
    community: structuredClone(seed.seedCommunity),
    abStats: {},
    theme: structuredClone(seed.defaultTheme),
    products: structuredClone(seed.seedProducts),
    collections: structuredClone(seed.seedCollections),
    customers: structuredClone(seed.seedCustomers),
    orders: structuredClone(seed.seedOrders),
    discounts: structuredClone(seed.seedDiscounts),
    menus: structuredClone(seed.seedMenus),
    pages,
    files: [],
    blog: [],
    integrations: {},
    abandoned: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const st = { ...initialState(), ...JSON.parse(raw) };
      // Datos guardados por una versión anterior: completar lo nuevo sin borrar nada.
      if (!st.settings.checkout) st.settings.checkout = structuredClone(seed.defaultCheckout);
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
