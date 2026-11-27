import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Monitor, Tablet, Smartphone, Undo2, Redo2, Eye, Plus, GripVertical, EyeOff, Copy, Trash2, ChevronUp, ChevronDown, Layers, Palette, History, Sparkles, X, Search, Settings2, Check, Maximize2, Clock, ShieldCheck } from 'lucide-react';
import { useStore, fmtDate } from '../store.jsx';
import { SECTIONS, STYLE_FIELDS, RenderSection, EditCtx, ShopCtx, themeVars, sectionSettings } from '../sections/registry.jsx';
import { scanCode, ScanReport, CodeFrame, CODE_VARS } from '../community/code.jsx';
import { AbPanel, SchedulePop, AuditPanel } from './panels.jsx';
import { themePresets, uid } from '../seed.js';
import { newSection, isDirty, NewPageForm } from '../admin/OnlineStore.jsx';
import { Toggle } from '../ui.jsx';

const DEVICES = { escritorio: { w: '100%', icon: Monitor }, tablet: { w: 820, icon: Tablet }, movil: { w: 390, icon: Smartphone } };
const FONTS = ['Inter', 'Playfair Display', 'Space Grotesk', 'DM Serif Display', 'Georgia', 'system-ui'];

export default function Editor({ pageId }) {
  const { state, mutate } = useStore();
  const page = state.pages.find(p => p.id === pageId);
  const [sel, setSel] = useState(null);
  const [device, setDevice] = useState('escritorio');
  const [left, setLeft] = useState('secciones');
  const [adding, setAdding] = useState(null); // índice donde insertar
  const [toast, setToast] = useState('');
  const [mobilePanel, setMobilePanel] = useState(null); // en teléfono: 'izq' | 'der'
  const [focus, setFocus] = useState(false);
  const past = useRef([]); const future = useRef([]); const lastKey = useRef({ k: null, t: 0 });
  const [, force] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { past.current = []; future.current = []; setSel(null); }, [pageId]);

  const sections = page?.sections || [];
  const commit = useCallback((next, key) => {
    const now = Date.now();
    const merge = key && lastKey.current.k === key && now - lastKey.current.t < 900;
    if (!merge) { past.current.push(structuredClone(sections)); if (past.current.length > 80) past.current.shift(); }
    future.current = [];
    lastKey.current = { k: key, t: now };
    mutate(st => { st.pages.find(p => p.id === pageId).sections = next; });
    force(x => x + 1);
  }, [sections, pageId, mutate]);

  const undo = useCallback(() => { if (!past.current.length) return; future.current.push(structuredClone(sections)); const prev = past.current.pop(); mutate(st => { st.pages.find(p => p.id === pageId).sections = prev; }); lastKey.current = { k: null, t: 0 }; force(x => x + 1); }, [sections, pageId, mutate]);
  const redo = useCallback(() => { if (!future.current.length) return; past.current.push(structuredClone(sections)); const nx = future.current.pop(); mutate(st => { st.pages.find(p => p.id === pageId).sections = nx; }); force(x => x + 1); }, [sections, pageId, mutate]);

  // Qué variante se está editando en cada sección con prueba A/B ('a' por defecto).
  const [abEdit, setAbEdit] = useState({});
  const updateSetting = useCallback((id, path, value) => {
    const next = structuredClone(sections);
    const sec = next.find(s => s.id === id);
    let o = abEdit[id] === 'b' && sec.ab?.b ? sec.ab.b : sec.settings;
    for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
    o[path[path.length - 1]] = value;
    commit(next, id + (abEdit[id] || 'a') + path.join('.'));
  }, [sections, commit, abEdit]);
  const setSection = useCallback((id, fn) => { const next = structuredClone(sections); fn(next.find(s => s.id === id)); commit(next); }, [sections, commit]);

  const ops = {
    add: (type, at, settings) => { const s = newSection(type); if (settings) Object.assign(s.settings, settings); const next = [...sections]; next.splice(at ?? next.length, 0, s); commit(next); setSel(s.id); setAdding(null); setTimeout(() => scrollTo(s.id), 60); },
    move: (id, dir) => { const i = sections.findIndex(s => s.id === id); const j = i + dir; if (j < 0 || j >= sections.length) return; const next = [...sections]; [next[i], next[j]] = [next[j], next[i]]; commit(next); },
    moveTo: (from, to) => { if (from === to) return; const next = [...sections]; const [x] = next.splice(from, 1); next.splice(to > from ? to - 1 : to, 0, x); commit(next); },
    dup: id => { const i = sections.findIndex(s => s.id === id); const c = { ...structuredClone(sections[i]), id: uid('s') }; const next = [...sections]; next.splice(i + 1, 0, c); commit(next); setSel(c.id); },
    hide: id => commit(sections.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s)),
    del: id => { commit(sections.filter(s => s.id !== id)); if (sel === id) setSel(null); setToast('Sección eliminada · Ctrl+Z para deshacer'); },
  };

  // Nada sale en vivo si un bloque de código propio no pasa la revisión de seguridad.
  const unsafe = () => sections.find(s => s.type === 'custom-code' && !s.hidden && (!scanCode(s.settings).ok || (s.ab?.b && !scanCode(s.ab.b).ok)));
  const publish = () => {
    const bad = unsafe();
    if (bad) { setSel(bad.id); setToast('No se publicó: un bloque de código no pasa la revisión de seguridad.'); return; }
    mutate(st => {
      const p = st.pages.find(x => x.id === pageId);
      if (p.published) { p.versions = [{ at: p.published.at, sections: p.published.sections }, ...(p.versions || [])].slice(0, 15); }
      p.published = { sections: structuredClone(p.sections), at: new Date().toISOString() };
    });
    setToast('¡Publicado! Ya está en la tienda en vivo.');
  };
  const [scheduling, setScheduling] = useState(false);
  const schedule = at => {
    const bad = unsafe();
    if (bad) { setSel(bad.id); setToast('No se programó: un bloque de código no pasa la revisión de seguridad.'); return; }
    if (!at || new Date(at).getTime() <= Date.now()) { setToast('Elige una fecha y hora en el futuro.'); return; }
    mutate(st => { st.pages.find(x => x.id === pageId).scheduled = { at: new Date(at).toISOString(), sections: structuredClone(sections) }; });
    setScheduling(false);
    setToast('Programado. Saldrá en vivo solo, a la hora elegida.');
  };
  const unschedule = () => { mutate(st => { delete st.pages.find(x => x.id === pageId).scheduled; }); setToast('Programación cancelada.'); };

  // Atajos de teclado
  useEffect(() => {
    const onKey = e => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); publish(); }
      else if (mod && e.key.toLowerCase() === 'd' && sel && !typing) { e.preventDefault(); ops.dup(sel); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && sel && !typing) { e.preventDefault(); ops.del(sel); }
      else if (e.key === 'Escape') { setSel(null); setAdding(null); setFocus(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const scrollTo = id => canvasRef.current?.querySelector(`[data-ed="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const select = id => { setSel(id); if (window.innerWidth < 900) setMobilePanel('der'); };

  const editCtx = useMemo(() => ({ editing: true, onEdit: updateSetting }), [updateSetting]);
  const shopCtx = useMemo(() => ({ add: p => setToast(`(Editor) "${p.title}" se agregaría al carrito`), count: 2, open: () => setToast('En la tienda real esto abre el carrito') }), []);

  if (!page) return <div className="page"><p>Página no encontrada. <a href="#/tienda-online/paginas">Volver</a></p></div>;
  const selected = sections.find(s => s.id === sel);
  const dirty = isDirty(page);
  // Una sección nueva queda antes del pie de página, no debajo.
  const endIndex = sections.length && sections[sections.length - 1].type === 'footer' ? sections.length - 1 : sections.length;

  return (
    <div className={'editor' + (focus ? ' focus' : '')}>
      <header className="ed-top">
        <div className="row">
          <a className="icon-btn" href="#/tienda-online/paginas" title="Salir al panel"><ArrowLeft size={18} /></a>
          <select className="input ed-page-sel" value={pageId} onChange={e => { if (e.target.value === '__new') setLeft('nueva'); else location.hash = '#/editor/' + e.target.value; }}>
            {state.pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            <option value="__new">+ Nueva página…</option>
          </select>
          <span className={'ed-status ' + (dirty ? 'dirty' : '')}>{page.scheduled ? <>⏰ Programado: {fmtDate(page.scheduled.at)} · <button className="linkish" onClick={unschedule}>cancelar</button></> : dirty ? 'Cambios sin publicar · guardado como borrador' : 'Publicado'}</span>
        </div>
        <div className="row ed-devices">
          {Object.entries(DEVICES).map(([k, d]) => <button key={k} className={'icon-btn' + (device === k ? ' on' : '')} onClick={() => setDevice(k)} title={k}><d.icon size={18} /></button>)}
          <button className={'icon-btn' + (focus ? ' on' : '')} onClick={() => setFocus(!focus)} title="Modo enfoque (oculta paneles)"><Maximize2 size={18} /></button>
        </div>
        <div className="row">
          <button className="icon-btn" onClick={undo} disabled={!past.current.length} title="Deshacer (Ctrl+Z)"><Undo2 size={18} /></button>
          <button className="icon-btn" onClick={redo} disabled={!future.current.length} title="Rehacer (Ctrl+Shift+Z)"><Redo2 size={18} /></button>
          <a className="btn" href={'#/vista-previa' + (page.kind === 'inicio' ? '' : '/p/' + page.slug)} target="_blank" rel="noreferrer"><Eye size={16} /><span className="hide-sm">Vista previa</span></a>
          <div className="sched-wrap">
            <button className="icon-btn" title="Programar publicación" onClick={() => setScheduling(!scheduling)}><Clock size={18} /></button>
            {scheduling && <SchedulePop onSave={schedule} close={() => setScheduling(false)} />}
          </div>
          <button className="btn primary" onClick={publish} disabled={!dirty && !!page.published}>{!dirty && page.published ? <><Check size={16} />Publicado</> : 'Publicar'}</button>
        </div>
      </header>

      <div className="ed-body">
        <aside className={'ed-left' + (mobilePanel === 'izq' ? ' show' : '')}>
          <div className="ed-tabs">
            {[['secciones', Layers, 'Secciones'], ['tema', Palette, 'Tema'], ['revision', ShieldCheck, 'Revisión'], ['historial', History, 'Versiones'], ['ia', Sparkles, 'IA']].map(([k, I, l]) => <button key={k} className={left === k ? 'on' : ''} onClick={() => setLeft(k)} title={l}><I size={17} /><span>{l}</span></button>)}
          </div>
          <div className="ed-left-body">
            {left === 'secciones' && <SectionList sections={sections} sel={sel} onSelect={id => { select(id); scrollTo(id); }} ops={ops} onAdd={() => setAdding(endIndex)} />}
            {left === 'tema' && <ThemePanel />}
            {left === 'revision' && <AuditPanel page={page} onSelect={id => { select(id); scrollTo(id); }} />}
            {left === 'historial' && <Versions page={page} restore={v => { commit(structuredClone(v.sections)); setToast('Versión cargada en el borrador. Publica para aplicarla.'); }} />}
            {left === 'ia' && <AiPanel />}
            {left === 'nueva' && <div className="pad"><h4>Nueva página</h4><NewPageForm onDone={() => setLeft('secciones')} /></div>}
          </div>
        </aside>

        <div className="ed-canvas-wrap" onClick={() => setSel(null)}>
          <div className="ed-canvas" ref={canvasRef} style={{ width: DEVICES[device].w }} onClick={e => e.stopPropagation()}
            onClickCapture={e => { const a = e.target.closest('a'); if (a) e.preventDefault(); }}>
            <EditCtx.Provider value={editCtx}>
              <ShopCtx.Provider value={shopCtx}>
                <div className="sf" style={themeVars(state.theme)}>
                  {sections.map((s, i) => (
                    <div key={s.id} data-ed={s.id} className={'ed-sec' + (sel === s.id ? ' sel' : '') + (s.hidden ? ' is-hidden' : '')} onClick={e => { e.stopPropagation(); select(s.id); }}>
                      <div className="ed-sec-tag">{SECTIONS[s.type]?.name}{s.hidden && ' (oculta)'}{s.ab?.enabled && ` · A/B: editando ${(abEdit[s.id] || 'a').toUpperCase()}`}
                        <span className="ed-sec-tools" onClick={e => e.stopPropagation()}>
                          <button onClick={() => ops.move(s.id, -1)} title="Subir"><ChevronUp size={14} /></button>
                          <button onClick={() => ops.move(s.id, 1)} title="Bajar"><ChevronDown size={14} /></button>
                          <button onClick={() => ops.dup(s.id)} title="Duplicar"><Copy size={13} /></button>
                          <button onClick={() => ops.hide(s.id)} title="Ocultar"><EyeOff size={13} /></button>
                          <button onClick={() => ops.del(s.id)} title="Eliminar"><Trash2 size={13} /></button>
                        </span>
                      </div>
                      <button className="ed-insert" title="Agregar sección aquí" onClick={e => { e.stopPropagation(); setAdding(i + 1); }}><Plus size={14} /></button>
                      <RenderSection section={s} variant={abEdit[s.id]} />
                    </div>
                  ))}
                  {!sections.length && <div className="ed-empty"><h3>Página vacía</h3><button className="btn primary" onClick={() => setAdding(0)}><Plus size={16} />Agregar la primera sección</button></div>}
                </div>
              </ShopCtx.Provider>
            </EditCtx.Provider>
          </div>
          <p className="ed-hint">Haz clic en cualquier texto de la vista previa para escribir directamente. Atajos: Ctrl+Z deshacer · Ctrl+D duplicar · Supr eliminar · Ctrl+S publicar</p>
        </div>

        <aside className={'ed-right' + (mobilePanel === 'der' ? ' show' : '')}>
          {selected ? <Inspector key={selected.id} s={selected} variant={abEdit[selected.id] || 'a'} setVariant={v => setAbEdit({ ...abEdit, [selected.id]: v })}
              onChange={(path, v) => updateSetting(selected.id, path, v)} setSection={fn => setSection(selected.id, fn)} ops={ops} close={() => setSel(null)} />
            : <PageSettings page={page} />}
        </aside>
      </div>

      <div className="ed-mobile-bar">
        <button className={mobilePanel === 'izq' ? 'on' : ''} onClick={() => setMobilePanel(mobilePanel === 'izq' ? null : 'izq')}><Layers size={18} />Secciones</button>
        <button onClick={() => setAdding(endIndex)}><Plus size={18} />Agregar</button>
        <button className={mobilePanel === 'der' ? 'on' : ''} onClick={() => setMobilePanel(mobilePanel === 'der' ? null : 'der')}><Settings2 size={18} />Ajustes</button>
      </div>

      {adding != null && <AddSection onPick={(t, settings) => ops.add(t, adding, settings)} close={() => setAdding(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function SectionList({ sections, sel, onSelect, ops, onAdd }) {
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  return (
    <div className="sec-list">
      {sections.map((s, i) => (
        <div key={s.id}
          className={'sec-row' + (sel === s.id ? ' on' : '') + (s.hidden ? ' off' : '') + (over === i ? ' over' : '')}
          draggable onDragStart={() => setDrag(i)} onDragOver={e => { e.preventDefault(); setOver(i); }} onDragLeave={() => setOver(null)}
          onDrop={() => { if (drag != null) ops.moveTo(drag, i); setDrag(null); setOver(null); }} onDragEnd={() => { setDrag(null); setOver(null); }}
          onClick={() => onSelect(s.id)}>
          <GripVertical size={15} className="grip" />
          <span className="sec-name">{SECTIONS[s.type]?.name || s.type}</span>
          <span className="sec-acts" onClick={e => e.stopPropagation()}>
            <button onClick={() => ops.hide(s.id)} title={s.hidden ? 'Mostrar' : 'Ocultar'}>{s.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            <button onClick={() => ops.dup(s.id)} title="Duplicar"><Copy size={14} /></button>
            <button onClick={() => ops.del(s.id)} title="Eliminar"><Trash2 size={14} /></button>
          </span>
        </div>
      ))}
      <button className="btn add-sec" onClick={onAdd}><Plus size={16} />Agregar sección</button>
      <p className="muted sm pad">Arrastra para reordenar. Las secciones ocultas no salen en la tienda.</p>
    </div>
  );
}

function AddSection({ onPick, close }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Todas');
  const COM = 'Comunidad ✓';
  const entries = Object.entries(SECTIONS).filter(([, d]) => !d.hidden);
  const cats = ['Todas', ...new Set(entries.map(([, d]) => d.cat)), COM];
  const list = cat === COM ? [] : entries.filter(([, d]) => (cat === 'Todas' || d.cat === cat) && d.name.toLowerCase().includes(q.toLowerCase()));
  const verified = (state.community || []).filter(c => c.status === 'aprobado' && scanCode(c).ok && (cat === 'Todas' || cat === COM) && c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="modal-bg" onClick={close}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-h"><h3>Agregar sección</h3><button className="icon-btn" onClick={close}><X size={18} /></button></div>
        <div className="search in-modal"><Search size={16} /><input autoFocus placeholder="Buscar secciones…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <div className="chips">{cats.map(c => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="sec-lib">{list.map(([k, d]) => (
          <button key={k} className="sec-card" onClick={() => onPick(k)}>
            <div className={'sec-thumb mini-' + k}><i /><i /><i /></div>
            <b>{d.name}</b><span className="muted sm">{d.cat}</span>
          </button>
        ))}
          {verified.map(c => (
            <button key={c.id} className="sec-card" onClick={() => onPick('community', { codeId: c.id, height: c.height })}>
              <div className="sec-thumb code-thumb"><CodeFrame code={c} theme={state.theme} height={74} fixed /></div>
              <b>{c.name}</b><span className="muted sm"><span className="verified">✓ Verificado</span> · {c.installs} usos</span>
            </button>
          ))}</div>
        {cat === COM && <p className="muted sm" style={{ marginTop: 10 }}>Secciones creadas por la comunidad y revisadas por el equipo de Nexlora. Corren aisladas: no pueden ver tus datos ni los de tus clientes. <a className="link" href="#/comunidad">Enviar la tuya →</a></p>}
        <div className="soon-line"><Sparkles size={14} /> Próximamente: describe una sección y la IA la crea con tu marca.</div>
      </div>
    </div>
  );
}

function FieldInput({ f, value, onChange }) {
  const { state } = useStore();
  switch (f.type) {
    case 'textarea': return <textarea className="input" rows={4} value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'color': return <div className="row"><input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)} /><input className="input" value={value || ''} placeholder="Por defecto del tema" onChange={e => onChange(e.target.value)} />{value && <button className="icon-btn" onClick={() => onChange('')} title="Quitar"><X size={14} /></button>}</div>;
    case 'select': return <select className="input" value={value} onChange={e => onChange(e.target.value)}>{f.options.map(o => <option key={o}>{o}</option>)}</select>;
    case 'range': return <div className="row range"><input type="range" min={f.min} max={f.max} value={value ?? f.min} onChange={e => onChange(Number(e.target.value))} /><b>{value ?? '—'}</b></div>;
    case 'toggle': return <Toggle checked={!!value} onChange={onChange} />;
    case 'datetime': return <input className="input" type="datetime-local" value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'collection': return <select className="input" value={value} onChange={e => onChange(e.target.value)}><option value="todas">Todas</option>{state.collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>;
    case 'link': {
      const links = [['#/tienda', 'Inicio'], ...state.collections.map(c => ['#/tienda/coleccion/' + c.id, 'Colección: ' + c.title]), ...state.pages.filter(p => p.slug).map(p => ['#/tienda/p/' + p.slug, 'Página: ' + p.title]), ...state.products.map(p => ['#/tienda/producto/' + p.slug, 'Producto: ' + p.title])];
      return <><select className="input" value={links.find(l => l[0] === value) ? value : '__custom'} onChange={e => e.target.value !== '__custom' && onChange(e.target.value)}>{links.map(([v, l]) => <option key={v} value={v}>{l}</option>)}<option value="__custom">Enlace externo…</option></select>{!links.find(l => l[0] === value) && <input className="input" style={{ marginTop: 6 }} value={value || ''} placeholder="https://" onChange={e => onChange(e.target.value)} />}</>;
    }
    case 'image': {
      const imgs = [...new Set([...state.files.map(x => x.url), ...state.products.map(p => p.image)])].slice(0, 8);
      return <div className="img-field">{value ? <img src={value} alt="" /> : <div className="img-ph">Sin imagen</div>}<input className="input" value={value || ''} placeholder="URL de la imagen" onChange={e => onChange(e.target.value)} /><div className="img-pick">{imgs.map(u => <button key={u} onClick={() => onChange(u)}><img src={u} alt="" /></button>)}</div></div>;
    }
    case 'code': return <textarea className="input code" rows={8} spellCheck={false} value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'game': return <><select className="input" value={value || ''} onChange={e => onChange(e.target.value)}>{(state.games || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select><a className="link sm" href={'#/juegos/' + value} target="_blank" rel="noreferrer">Editar el juego →</a></>;
    default: return <input className="input" value={value || ''} onChange={e => onChange(e.target.value)} />;
  }
}

function ItemsField({ f, items = [], onChange }) {
  const [open, setOpen] = useState(0);
  const set = (i, k, v) => onChange(items.map((it, j) => j === i ? { ...it, [k]: v } : it));
  const mv = (i, d) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="items">
      {items.map((it, i) => (
        <div key={i} className={'item' + (open === i ? ' open' : '')}>
          <div className="item-h" onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{it[f.sub[0].key]?.toString().slice(0, 28) || `Elemento ${i + 1}`}</span>
            <span className="row" onClick={e => e.stopPropagation()}><button onClick={() => mv(i, -1)}><ChevronUp size={14} /></button><button onClick={() => mv(i, 1)}><ChevronDown size={14} /></button><button onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 size={14} /></button></span>
          </div>
          {open === i && <div className="item-b">{f.sub.map(sf => <label key={sf.key} className="field"><span>{sf.label}</span><FieldInput f={sf} value={it[sf.key]} onChange={v => set(i, sf.key, v)} /></label>)}</div>}
        </div>
      ))}
      <button className="btn sm" onClick={() => { onChange([...items, structuredClone(f.blank)]); setOpen(items.length); }}><Plus size={14} />Agregar</button>
    </div>
  );
}

function Inspector({ s, variant, setVariant, onChange, setSection, ops, close }) {
  const { state } = useStore();
  const def = SECTIONS[s.type];
  const [tab, setTab] = useState('contenido');
  const cur = sectionSettings(s, variant);
  const tabs = [['contenido', 'Contenido'], ['estilo', 'Estilo'], ['ab', 'A/B']];
  const com = s.type === 'community' ? (state.community || []).find(c => c.id === s.settings.codeId) : null;
  return (
    <div className="insp">
      <div className="insp-h"><div><span className="muted sm">Sección{s.ab?.enabled ? ` · editando variante ${variant.toUpperCase()}` : ''}</span><h3>{def.name}</h3></div><button className="icon-btn" onClick={close}><X size={18} /></button></div>
      <div className="seg three">{tabs.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k === 'ab' && s.ab?.enabled && ' ●'}</button>)}</div>
      <div className="insp-b">
        {tab !== 'ab' && s.ab?.enabled && (
          <div className="ab-switch"><span>Editando:</span>{['a', 'b'].map(v => <button key={v} className={variant === v ? 'on' : ''} onClick={() => setVariant(v)}>Variante {v.toUpperCase()}</button>)}</div>
        )}
        {tab !== 'ab' && (tab === 'contenido' ? def.fields : STYLE_FIELDS).map(f => (
          <div key={f.key} className={'field' + (f.type === 'toggle' ? ' inline' : '')}>
            <span>{f.label}</span>
            {f.type === 'items' ? <ItemsField f={f} items={cur[f.key]} onChange={v => onChange([f.key], v)} /> : <FieldInput f={f} value={cur[f.key]} onChange={v => onChange([f.key], v)} />}
          </div>
        ))}
        {tab === 'contenido' && s.type === 'custom-code' && <>
          <ScanReport scan={scanCode(cur)} compact />
          <p className="muted sm">Variables del tema: {CODE_VARS.join(', ')}. Corre aislado y sin JavaScript.</p>
        </>}
        {tab === 'contenido' && com && <div className="tip"><b>{com.name}</b> · por {com.author}<br />{com.status === 'aprobado' ? <span className="verified">✓ Verificado por {com.review?.by}</span> : `Estado: ${com.status}`}<br /><span className="muted sm">{com.description}</span></div>}
        {tab === 'estilo' && <p className="muted sm">Estos ajustes solo afectan a esta sección. Los colores y fuentes generales están en la pestaña Tema.</p>}
        {tab === 'ab' && <AbPanel s={s} variant={variant} setVariant={setVariant} setSection={setSection} />}
      </div>
      <div className="insp-f">
        <button className="btn" onClick={() => ops.dup(s.id)}><Copy size={15} />Duplicar</button>
        <button className="btn" onClick={() => ops.hide(s.id)}>{s.hidden ? <Eye size={15} /> : <EyeOff size={15} />}{s.hidden ? 'Mostrar' : 'Ocultar'}</button>
        <button className="btn danger" onClick={() => ops.del(s.id)}><Trash2 size={15} />Eliminar</button>
      </div>
    </div>
  );
}

function PageSettings({ page }) {
  const { mutate } = useStore();
  const set = (k, v) => mutate(st => { const p = st.pages.find(x => x.id === page.id); if (k === 'title' || k === 'slug') p[k] = v; else p.seo[k] = v; });
  return (
    <div className="insp">
      <div className="insp-h"><div><span className="muted sm">Página</span><h3>{page.title}</h3></div></div>
      <div className="insp-b">
        <label className="field"><span>Nombre</span><input className="input" value={page.title} onChange={e => set('title', e.target.value)} /></label>
        {page.kind !== 'inicio' && <label className="field"><span>Dirección (slug)</span><input className="input" value={page.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} /></label>}
        <label className="field"><span>Título SEO</span><input className="input" value={page.seo?.title || ''} onChange={e => mutate(st => { st.pages.find(x => x.id === page.id).seo.title = e.target.value; })} /></label>
        <label className="field"><span>Descripción SEO</span><textarea className="input" rows={3} value={page.seo?.description || ''} onChange={e => set('description', e.target.value)} /></label>
        <div className="serp"><div className="serp-t">{page.seo?.title || page.title}</div><div className="serp-u">tutienda.com/{page.slug}</div><div className="serp-d">{page.seo?.description}</div></div>
        <div className="tip"><b>Consejo:</b> selecciona una sección en la vista previa para editarla, o haz clic directamente en un texto para cambiarlo.</div>
      </div>
    </div>
  );
}

function ThemePanel() {
  const { state, mutate } = useStore();
  const t = state.theme;
  const set = (k, v) => mutate(st => { st.theme[k] = v; });
  const colors = [['primary', 'Color principal'], ['accent', 'Acento'], ['background', 'Fondo'], ['surface', 'Superficies (tarjetas)'], ['text', 'Texto'], ['muted', 'Texto secundario']];
  return (
    <div className="pad stack">
      <div><h4>Estilos rápidos</h4><div className="preset-row">{themePresets.map(p => <button key={p.name} title={p.name} className={t.name === p.name ? 'on' : ''} onClick={() => mutate(st => { st.theme = structuredClone(p); })} style={{ background: p.background }}><i style={{ background: p.primary }} /><i style={{ background: p.accent }} /><span style={{ color: p.text }}>{p.name}</span></button>)}</div></div>
      <div><h4>Colores</h4>{colors.map(([k, l]) => <label key={k} className="color-row"><input type="color" value={t[k]} onChange={e => set(k, e.target.value)} /><span>{l}</span><code>{t[k]}</code></label>)}</div>
      <div><h4>Tipografía</h4>
        <label className="field"><span>Títulos</span><select className="input" value={t.headingFont} onChange={e => set('headingFont', e.target.value)}>{FONTS.map(f => <option key={f}>{f}</option>)}</select></label>
        <label className="field"><span>Texto</span><select className="input" value={t.bodyFont} onChange={e => set('bodyFont', e.target.value)}>{FONTS.map(f => <option key={f}>{f}</option>)}</select></label>
      </div>
      <div><h4>Forma y tamaño</h4>
        <label className="field"><span>Bordes redondeados: {t.radius}px</span><input type="range" min={0} max={32} value={t.radius} onChange={e => set('radius', Number(e.target.value))} /></label>
        <label className="field"><span>Ancho máximo: {t.width}px</span><input type="range" min={960} max={1600} step={20} value={t.width} onChange={e => set('width', Number(e.target.value))} /></label>
      </div>
      <p className="muted sm">El tema se aplica a todas las páginas al instante.</p>
    </div>
  );
}

function Versions({ page, restore }) {
  const all = [...(page.published ? [{ ...page.published, current: true }] : []), ...(page.versions || [])];
  return (
    <div className="pad stack">
      <h4>Historial de publicaciones</h4>
      {!all.length && <p className="muted sm">Aún no has publicado esta página.</p>}
      {all.map((v, i) => (
        <div key={i} className="ver"><div><b>{fmtDate(v.at)}</b><div className="muted sm">{v.sections.length} secciones {v.current && '· en vivo'}</div></div><button className="btn sm" onClick={() => restore(v)}>Restaurar</button></div>
      ))}
      <p className="muted sm">Se guardan las últimas 15 publicaciones. Restaurar carga la versión como borrador; nada cambia en vivo hasta que publiques.</p>
    </div>
  );
}

function AiPanel() {
  return (
    <div className="pad stack">
      <h4>Asistente de diseño IA</h4>
      <textarea className="input" rows={4} disabled placeholder="Ej: 'Crea una sección de Black Friday con 3 productos y cuenta regresiva hasta el viernes'" />
      <button className="btn primary" disabled><Sparkles size={16} />Generar</button>
      <p className="muted sm">Se activa cuando conectemos el proveedor de IA en Apps e integraciones. Podrá crear secciones, páginas completas, textos y traducciones.</p>
    </div>
  );
}
