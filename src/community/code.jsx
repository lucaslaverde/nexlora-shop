import React, { useEffect, useRef, useState } from 'react';

// ------------------------------------------------------------------
// Código de la comunidad: cualquier persona envía una sección (HTML + CSS),
// el revisor automático la analiza y luego el equipo de Nexlora la aprueba.
// Aun aprobada, se muestra dentro de un iframe con sandbox SIN scripts:
// no puede leer cookies, el carrito ni los datos del cliente.
// ------------------------------------------------------------------

const RULES = [
  { id: 'script', label: 'Sin JavaScript (<script>)', test: c => !/<\s*script\b/i.test(c.html), why: 'Las secciones no pueden ejecutar código: así nadie puede robar datos de los clientes.' },
  { id: 'events', label: 'Sin eventos en línea (onclick, onload…)', test: c => !/\son[a-z]+\s*=/i.test(c.html), why: 'Los atributos on… ejecutan JavaScript.' },
  { id: 'jsurl', label: 'Sin enlaces javascript:', test: c => !/javascript\s*:/i.test(c.html + c.css), why: 'Un enlace javascript: ejecuta código al hacer clic.' },
  { id: 'embeds', label: 'Sin iframe, object, embed ni formularios', test: c => !/<\s*(iframe|object|embed|form|input|base|meta|link)\b/i.test(c.html), why: 'Se usan para incrustar páginas falsas o pedir contraseñas.' },
  { id: 'http', label: 'Solo recursos seguros (https)', test: c => !/(src|href)\s*=\s*["']?\s*http:\/\//i.test(c.html) && !/url\(\s*["']?http:\/\//i.test(c.css), why: 'Los recursos http viajan sin cifrar.' },
  { id: 'import', label: 'CSS sin @import ni expression()', test: c => !/@import|expression\s*\(|behavior\s*:/i.test(c.css), why: 'Cargan código o estilos externos que nadie revisó.' },
  { id: 'size', label: 'Tamaño menor a 30 KB', test: c => (c.html.length + c.css.length) < 30000, why: 'Las secciones pesadas hacen lenta la tienda.' },
];
const WARNINGS = [
  { id: 'fixed', label: 'Usa position: fixed (puede tapar la página)', test: c => /position\s*:\s*fixed/i.test(c.css + c.html) },
  { id: 'external-img', label: 'Carga imágenes de otros sitios', test: c => /(src|url\()\s*=?\s*["']?https:\/\//i.test(c.html + c.css) },
  { id: 'important', label: 'Abusa de !important', test: c => ((c.css.match(/!important/g) || []).length > 5) },
];

export function scanCode(code) {
  const c = { html: code?.html || '', css: code?.css || '' };
  const checks = RULES.map(r => ({ id: r.id, label: r.label, ok: r.test(c), why: r.why }));
  const warnings = WARNINGS.filter(w => w.test(c)).map(w => ({ id: w.id, label: w.label }));
  const ok = checks.every(x => x.ok);
  return { ok, checks, warnings, score: Math.round((checks.filter(x => x.ok).length / checks.length) * 100) };
}

// Variables del tema disponibles para el código de la comunidad.
export const CODE_VARS = ['--primario', '--acento', '--fondo', '--superficie', '--texto', '--suave', '--radio', '--fuente-titulos', '--fuente-texto'];

export function buildSrcDoc(code, theme) {
  const t = theme || {};
  const vars = `:root{--primario:${t.primary};--acento:${t.accent};--fondo:${t.background};--superficie:${t.surface};--texto:${t.text};--suave:${t.muted};--radio:${t.radius}px;--fuente-titulos:'${t.headingFont}',serif;--fuente-texto:'${t.bodyFont}',system-ui,sans-serif}`;
  const base = `*{box-sizing:border-box}html,body{margin:0;background:transparent;color:var(--texto);font-family:var(--fuente-texto)}`;
  // CSP dentro del iframe: aunque algo se colara, no puede cargar scripts ni conectarse a nada.
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com">`;
  return `<!doctype html><html><head><meta charset="utf-8">${csp}<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@500;700&family=Space+Grotesk:wght@500;700&family=DM+Serif+Display&display=swap"><style>${vars}${base}${code.css || ''}</style></head><body>${code.html || ''}</body></html>`;
}

// Marco aislado. sandbox sin "allow-scripts": dentro no se ejecuta NADA de JavaScript,
// ni formularios ni ventanas. "allow-same-origin" solo deja que la tienda mida el alto
// del contenido (sin scripts adentro, el código no puede usarlo para tocar la tienda).
// height = alto mínimo; si el contenido es más alto, el marco crece solo.
export function CodeFrame({ code, theme, height = 320, blocked, fixed }) {
  const ref = useRef(null);
  const min = Number(height) || 120;
  const [h, setH] = useState(min);
  const doc = buildSrcDoc(code, theme);
  useEffect(() => {
    const f = ref.current;
    if (!f || fixed) return;
    const measure = () => {
      try {
        const d = f.contentDocument;
        if (d?.body) setH(Math.max(min, Math.ceil(d.documentElement.scrollHeight)));
      } catch { /* sin acceso: se queda con el mínimo */ }
    };
    f.addEventListener('load', measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(f);
    const t = setTimeout(measure, 600); // fuentes web que cargan tarde
    return () => { f.removeEventListener('load', measure); ro.disconnect(); clearTimeout(t); };
  }, [doc, min, fixed]);
  if (blocked) {
    return <div className="sf-wrap"><div className="sf-img-ph" style={{ minHeight: 140 }}>🔒 {blocked}</div></div>;
  }
  return (
    <iframe
      ref={ref}
      title="Sección de código verificado"
      className="sf-codeframe"
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={doc}
      scrolling="no"
      style={{ width: '100%', height: fixed ? min : h, border: 0, display: 'block', overflow: 'hidden' }}
    />
  );
}

export function ScanReport({ scan, compact }) {
  return (
    <div className="scan">
      <div className={'scan-head ' + (scan.ok ? 'ok' : 'bad')}>{scan.ok ? '✓ Pasa la revisión automática' : '✕ No pasa la revisión automática'} <b>{scan.score}%</b></div>
      {scan.checks.filter(c => !compact || !c.ok).map(c => (
        <div key={c.id} className={'scan-row ' + (c.ok ? 'ok' : 'bad')}><span>{c.ok ? '✓' : '✕'}</span><div>{c.label}{!c.ok && <small>{c.why}</small>}</div></div>
      ))}
      {scan.warnings.map(w => <div key={w.id} className="scan-row warn"><span>!</span><div>{w.label}</div></div>)}
    </div>
  );
}
