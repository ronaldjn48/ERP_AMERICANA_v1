import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { narrator } from '../audio';
import { AudioBar } from '../components/AudioBar';
import { SpeakButton } from '../components/ui';
import { cop } from '../engine/format';
import { MODULE_LABEL, NAV, CORE_MODULES } from '../erp/meta';
import { MISSIONS, levelOf, missionProgress, objectiveDone } from '../erp/missions';
import { available, orderTotals } from '../erp/ops';
import { formatDay } from '../erp/seed';
import {
  closeDayAction,
  dismissToast,
  missionContext,
  navigate,
  run,
  useCelebration,
  useRoute,
  useToasts,
  celebrationStore,
  type Route,
} from '../erp/store';
import { markNotificationsRead } from '../erp/ops';
import type { ErpState, ModuleKey } from '../erp/types';
import { loadAudioPrefs, storeAudioPrefs, type AudioPrefs } from '../storage';
import { Icon } from '../ui/icons';

export function badgeCounts(s: ErpState): Partial<Record<ModuleKey, number>> {
  const quotes = s.salesOrders.filter((o) => o.status === 'cotizacion').length;
  const toShip = s.salesOrders.filter((o) => o.status === 'confirmado' || o.status === 'despachado').length;
  return {
    ventas: quotes + toShip,
    crm: s.cases.filter((c) => c.status !== 'resuelto').length,
    compras: s.purchaseOrders.filter((p) => (p.status === 'aprobada' && p.expectedDay <= s.day) || p.status === 'borrador').length,
    inventario: s.products.filter((p) => p.active && p.reorderPoint > 0 && available(p) <= p.reorderPoint).length,
    contabilidad: s.salesOrders.filter((o) => o.status === 'facturado' && o.dueDay !== null && o.dueDay < s.day).length,
    misiones: MISSIONS.filter((m) => s.gamification.completed[m.id] === undefined && m.requires.every((r) => s.gamification.completed[r] !== undefined)).length,
  };
}

function Sidebar({ s, route, open, onClose }: { s: ErpState; route: Route; open: boolean; onClose: () => void }) {
  const counts = badgeCounts(s);
  const enabled = (m: ModuleKey) => CORE_MODULES.includes(m) || s.settings.enabledModules[m] !== false;
  return (
    <>
      {open ? <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" /> : null}
      <nav className={`sidebar${open ? ' is-open' : ''}`} aria-label="Módulos del ERP">
        <div className="sidebar-brand">
          <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="var(--accent)" />
            <path d="M14 46V30h8v16zm14 0V20h8v26zm14 0V12h8v34z" fill="#fff" />
          </svg>
          <div>
            <strong>ERP Americana</strong>
            <small>{s.settings.companyName}</small>
          </div>
          <button type="button" className="btn-icon sidebar-close" onClick={onClose} aria-label="Cerrar menú">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="sidebar-scroll">
          {NAV.map((g) => {
            const items = g.items.filter(enabled);
            if (items.length === 0) return null;
            return (
              <div key={g.group} className="nav-group">
                <span className="nav-group-label">{g.group}</span>
                <ul>
                  {items.map((m) => (
                    <li key={m}>
                      <button
                        type="button"
                        className={`nav-item${route.module === m ? ' is-active' : ''}`}
                        aria-current={route.module === m ? 'page' : undefined}
                        onClick={() => {
                          navigate({ module: m });
                          onClose();
                        }}
                      >
                        <Icon name={m} size={19} />
                        <span>{MODULE_LABEL[m]}</span>
                        {counts[m] ? <span className="nav-count" aria-label={`${counts[m]} pendientes`}>{counts[m]}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function Notifications({ s }: { s: ErpState }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = s.notifications.filter((n) => !n.read).length;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="pop" ref={ref}>
      <button
        type="button"
        className="btn-icon top-icon"
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open && unread) window.setTimeout(() => run(markNotificationsRead), 1500);
        }}
      >
        <Icon name="bell" />
        {unread ? <span className="dot-count">{unread > 9 ? '9+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="pop-panel notif-panel" role="dialog" aria-label="Notificaciones">
          <h3>Notificaciones</h3>
          {s.notifications.length === 0 ? <p className="muted">Sin novedades.</p> : null}
          <ul>
            {s.notifications.slice(0, 15).map((n) => (
              <li key={n.id} className={`notif kind-${n.kind}${n.read ? '' : ' is-unread'}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (n.target) navigate(n.target);
                    setOpen(false);
                  }}
                >
                  <span className="notif-meta">
                    Día {n.day} · {MODULE_LABEL[n.module]}
                  </span>
                  <span>{n.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface SearchHit {
  id: string;
  label: string;
  sub: string;
  route: Route;
}

function searchAll(s: ErpState, q: string): SearchHit[] {
  const n = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nq = n(q.trim());
  if (!nq) return (Object.keys(MODULE_LABEL) as ModuleKey[]).map((m) => ({ id: `mod-${m}`, label: MODULE_LABEL[m], sub: 'Módulo', route: { module: m } }));
  const hits: SearchHit[] = [];
  for (const m of Object.keys(MODULE_LABEL) as ModuleKey[]) if (n(MODULE_LABEL[m]).includes(nq)) hits.push({ id: `mod-${m}`, label: MODULE_LABEL[m], sub: 'Módulo', route: { module: m } });
  for (const c of s.customers) if (n(`${c.name} ${c.docNumber} ${c.code}`).includes(nq)) hits.push({ id: c.id, label: c.name, sub: `Cliente ${c.code} · ${c.docType} ${c.docNumber}`, route: { module: 'crm', view: 'clientes', id: c.id } });
  for (const p of s.products) if (n(`${p.name} ${p.sku}`).includes(nq)) hits.push({ id: p.id, label: p.name, sub: `Producto ${p.sku} · disponible ${available(p)}`, route: { module: 'inventario', id: p.id } });
  for (const o of s.salesOrders) {
    const c = s.customers.find((x) => x.id === o.customerId);
    if (n(`${o.number} ${o.invoiceNumber ?? ''} ${c?.name ?? ''}`).includes(nq)) hits.push({ id: o.id, label: `${o.number}${o.invoiceNumber ? ` · ${o.invoiceNumber}` : ''}`, sub: `Pedido · ${c?.name ?? ''} · ${cop(orderTotals(o.lines, s.settings.ivaRate).total)}`, route: { module: 'ventas', id: o.id } });
  }
  for (const p of s.purchaseOrders) {
    const sup = s.suppliers.find((x) => x.id === p.supplierId);
    if (n(`${p.number} ${sup?.name ?? ''}`).includes(nq)) hits.push({ id: p.id, label: p.number, sub: `Orden de compra · ${sup?.name ?? ''}`, route: { module: 'compras', id: p.id } });
  }
  for (const sup of s.suppliers) if (n(`${sup.name} ${sup.nit}`).includes(nq)) hits.push({ id: sup.id, label: sup.name, sub: `Proveedor ${sup.code}`, route: { module: 'compras', view: 'proveedores', id: sup.id } });
  for (const c of s.cases) if (n(`${c.number} ${c.subject}`).includes(nq)) hits.push({ id: c.id, label: `${c.number} ${c.subject}`, sub: 'Caso de servicio', route: { module: 'crm', view: 'casos', id: c.id } });
  for (const o of s.opportunities) if (n(o.name).includes(nq)) hits.push({ id: o.id, label: o.name, sub: 'Oportunidad', route: { module: 'crm', view: 'oportunidades', id: o.id } });
  return hits.slice(0, 20);
}

function CommandPalette({ s, open, onClose }: { s: ErpState; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const hits = useMemo(() => (open ? searchAll(s, q) : []), [s, q, open]);
  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
    }
  }, [open]);
  if (!open) return null;
  const go = (h: SearchHit) => {
    navigate(h.route);
    onClose();
  };
  return (
    <div className="palette-layer" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Buscar en el ERP">
        <div className="palette-input">
          <Icon name="search" />
          <input
            autoFocus
            value={q}
            placeholder="Busca clientes, productos, pedidos, facturas o módulos…"
            aria-label="Buscar"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel((x) => Math.min(hits.length - 1, x + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel((x) => Math.max(0, x - 1));
              }
              if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" role="listbox" aria-label="Resultados">
          {hits.length === 0 ? <li className="muted palette-empty">Sin resultados para "{q}".</li> : null}
          {hits.map((h, i) => (
            <li key={h.id} role="option" aria-selected={i === sel}>
              <button type="button" className={i === sel ? 'is-sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => go(h)}>
                <strong>{h.label}</strong>
                <span className="muted small">{h.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MissionDock({ s }: { s: ErpState }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = window.localStorage.getItem('erp-americana:dock');
      // En celular empieza plegada para no tapar el área de trabajo.
      return saved === null ? window.innerWidth < 640 : saved === '1';
    } catch {
      return false;
    }
  });
  const m = MISSIONS.find((x) => x.id === s.gamification.activeMission);
  // Reserva espacio al final de la página para que el panel no tape los últimos botones.
  useEffect(() => {
    document.body.classList.toggle('dock-open', Boolean(m) && !collapsed);
    document.body.classList.toggle('dock-closed', Boolean(m) && collapsed);
    return () => document.body.classList.remove('dock-open', 'dock-closed');
  }, [m, collapsed]);
  if (!m) return null;
  const ctx = missionContext();
  const prog = missionProgress(s, m, ctx);
  const next = m.objectives.find((o) => !objectiveDone(s, m, o, ctx));
  const toggle = () => {
    setCollapsed(!collapsed);
    try {
      window.localStorage.setItem('erp-americana:dock', collapsed ? '0' : '1');
    } catch {
      /* sin acción */
    }
  };
  return (
    <aside className={`dock${collapsed ? ' is-collapsed' : ''}`} aria-label="Misión activa">
      <button type="button" className="dock-head" onClick={toggle} aria-expanded={!collapsed}>
        <Icon name="misiones" size={18} />
        <span className="dock-title">
          <small>Misión activa · {prog.done}/{prog.total}</small>
          <strong>{m.title}</strong>
        </span>
        <span aria-hidden="true">{collapsed ? '▴' : '▾'}</span>
      </button>
      {!collapsed ? (
        <div className="dock-body">
          <div className="xpbar" aria-hidden="true">
            <div style={{ width: `${prog.ratio * 100}%` }} />
          </div>
          <ul className="dock-objs">
            {m.objectives.map((o) => {
              const ok = objectiveDone(s, m, o, ctx);
              return (
                <li key={o.id} className={ok ? 'is-done' : ''}>
                  <span className="obj-mark" aria-hidden="true">{ok ? <Icon name="check" size={14} /> : null}</span>
                  <span>
                    {o.text}
                    <span className="sr-only">{ok ? ' (cumplido)' : ' (pendiente)'}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="row wrap">
            {next?.go ? (
              <button type="button" className="btn-primary btn-sm" onClick={() => navigate(next.go!)}>
                Ir a {MODULE_LABEL[next.go.module]}
              </button>
            ) : null}
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate({ module: 'misiones', id: m.id })}>
              Ver misión
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <Icon name={t.kind === 'error' ? 'alert' : t.kind === 'logro' ? 'trophy' : t.kind === 'exito' ? 'check' : 'info'} size={18} />
          <div>
            <strong>{t.title}</strong>
            {t.text ? <p>{t.text}</p> : null}
          </div>
          <button type="button" className="btn-icon" aria-label="Cerrar aviso" onClick={() => dismissToast(t.id)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Celebration() {
  const c = useCelebration();
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (c) window.setTimeout(() => btn.current?.focus(), 30);
  }, [c]);
  if (!c) return null;
  const close = () => celebrationStore.set(null);
  return (
    <div className="celebrate-layer" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="celebrate" role="dialog" aria-modal="true" aria-labelledby="cel-title" onKeyDown={(e) => e.key === 'Escape' && close()}>
        <div className="celebrate-icon" aria-hidden="true">
          <Icon name="trophy" size={44} />
        </div>
        <p className="eyebrow">Misión completada</p>
        <h2 id="cel-title">{c.title}</h2>
        <p className="celebrate-xp">+{c.xp} XP</p>
        <div className="takeaway">
          <strong>Regla de decisión</strong>
          <p>{c.takeaway}</p>
        </div>
        {c.badges.length ? <p>Nueva insignia: <strong>{c.badges.join(', ')}</strong></p> : null}
        {c.level ? <p className="notice notice-ok">Subiste de nivel: ahora eres <strong>{c.level}</strong>.</p> : null}
        <div className="row wrap center">
          <button type="button" className="btn-secondary" onClick={() => { close(); navigate({ module: 'misiones' }); }}>
            Ver misiones
          </button>
          <button type="button" className="btn-primary" ref={btn} onClick={close}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function TopBar({ s, onMenu, onSearch }: { s: ErpState; onMenu: () => void; onSearch: () => void }) {
  const [audio, setAudio] = useState<AudioPrefs>(() => loadAudioPrefs());
  const lvl = levelOf(s.gamification.xp);
  return (
    <header className="topbar">
      <button type="button" className="btn-icon top-icon menu-btn" onClick={onMenu} aria-label="Abrir menú de módulos">
        <Icon name="menu" />
      </button>
      <button type="button" className="top-search" onClick={onSearch} aria-label="Buscar en el ERP (Ctrl + K)">
        <Icon name="search" size={17} />
        <span>Buscar…</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="top-day" title="Día de operación">
        <span className="top-day-label">Día {s.day}</span>
        <span className="top-day-date">{formatDay(s, s.day)}</span>
      </div>
      <button type="button" className="btn-primary btn-sm close-day" onClick={() => closeDayAction()} aria-label="Cerrar día y avanzar al siguiente" title="Cerrar día y avanzar al siguiente">
        <Icon name="sun" size={16} /> <span>Cerrar día</span>
      </button>
      <div className="top-right">
        <AudioBar
          prefs={audio}
          onChange={(p) => {
            setAudio(p);
            storeAudioPrefs(p);
          }}
        />
        <Notifications s={s} />
        <button type="button" className="xp-chip" onClick={() => navigate({ module: 'misiones' })} aria-label={`Nivel ${lvl.name}, ${s.gamification.xp} puntos de experiencia`}>
          <span className="avatar" aria-hidden="true">{s.profile.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
          <span className="xp-text">
            <strong>{lvl.name}</strong>
            <span className="xpbar" aria-hidden="true">
              <span style={{ width: `${lvl.progress * 100}%` }} />
            </span>
            <small>{s.gamification.xp} XP</small>
          </span>
        </button>
      </div>
    </header>
  );
}

export function Shell({ s, children }: { s: ErpState; children: ReactNode }) {
  const route = useRoute();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.title = `${MODULE_LABEL[route.module]} · ${s.settings.companyName}`;
  }, [route.module, s.settings.companyName]);
  useEffect(() => () => narrator.stop(), []);
  return (
    <div className="erp-shell">
      <a href="#erp-main" className="skip-link">
        Saltar al contenido
      </a>
      <Sidebar s={s} route={route} open={menu} onClose={() => setMenu(false)} />
      <div className="erp-main-col">
        <TopBar s={s} onMenu={() => setMenu(true)} onSearch={() => setSearch(true)} />
        <main id="erp-main" className="erp-main" tabIndex={-1}>
          {children}
        </main>
      </div>
      <MissionDock s={s} />
      <CommandPalette s={s} open={search} onClose={() => setSearch(false)} />
      <Toasts />
      <Celebration />
    </div>
  );
}

export function MissionSpeak({ text, id }: { text: string; id: string }) {
  return <SpeakButton text={text} id={id} label="Escuchar misión" />;
}
