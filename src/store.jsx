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
    settings: structuredClone(seed.seedSettings),
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
    if (raw) return { ...initialState(), ...JSON.parse(raw) };
  } catch { /* sin almacenamiento */ }
  return initialState();
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
