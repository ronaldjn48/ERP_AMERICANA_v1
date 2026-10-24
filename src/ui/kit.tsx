import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { SpeakButton } from '../components/ui';
import { Icon } from './icons';

// ------------------------------------------------------------------ Encabezado de página

export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  crumbs?: string[];
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        {crumbs && crumbs.length ? (
          <nav aria-label="Ruta" className="crumbs">
            {crumbs.map((c, i) => (
              <span key={c}>
                {c}
                {i < crumbs.length - 1 ? <span aria-hidden="true"> / </span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

/** Guía plegable del módulo con lectura en voz alta. */
export function ModuleGuide({ id, title, text, steps }: { id: string; title: string; text: string; steps: string[] }) {
  return (
    <details className="guide">
      <summary>
        <Icon name="info" size={18} /> {title}
      </summary>
      <div className="guide-body">
        <p>{text}</p>
        <ol>
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <SpeakButton text={`${title}. ${text} ${steps.map((s, i) => `Paso ${i + 1}: ${s}`).join(' ')}`} id={`guia-${id}`} label="Escuchar guía" />
      </div>
    </details>
  );
}

// ------------------------------------------------------------------ Subnavegación

export function SubNav<T extends string>({ items, value, onChange }: { items: Array<{ id: T; label: string; count?: number }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className="subnav" role="tablist" aria-label="Vistas del módulo">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} className={value === it.id ? 'is-active' : ''} onClick={() => onChange(it.id)}>
          {it.label}
          {it.count ? <span className="count">{it.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Indicadores y estados

export function Kpi({ label, value, sub, tone, onClick }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'warn'; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`kpi${tone ? ` tone-${tone}` : ''}${onClick ? ' is-link' : ''}`} onClick={onClick}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </Tag>
  );
}

const CHIP: Record<string, string> = {
  cotizacion: 'neutral',
  borrador: 'neutral',
  confirmado: 'info',
  aprobada: 'info',
  despachado: 'warn',
  recibida: 'warn',
  facturado: 'accent',
  pagado: 'good',
  pagada: 'good',
  anulado: 'muted',
  anulada: 'muted',
  abierto: 'bad',
  en_proceso: 'warn',
  resuelto: 'good',
  alta: 'bad',
  media: 'warn',
  baja: 'neutral',
  activa: 'good',
  pausada: 'muted',
  vencida: 'bad',
  vigente: 'info',
};

const CHIP_LABEL: Record<string, string> = {
  cotizacion: 'Cotización',
  confirmado: 'Confirmado',
  despachado: 'Despachado',
  facturado: 'Facturado',
  pagado: 'Pagado',
  anulado: 'Anulado',
  borrador: 'Borrador',
  aprobada: 'Aprobada',
  recibida: 'Recibida',
  pagada: 'Pagada',
  anulada: 'Anulada',
  abierto: 'Abierto',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export function Chip({ status, label }: { status: string; label?: string }) {
  return <span className={`chip chip-${CHIP[status] ?? 'neutral'}`}>{label ?? CHIP_LABEL[status] ?? status}</span>;
}

/** Barra de pasos de un documento (pedido, orden de compra). */
export function Stepper({ steps, current, cancelled }: { steps: string[]; current: number; cancelled?: boolean }) {
  return (
    <ol className={`stepper${cancelled ? ' is-cancelled' : ''}`} aria-label="Estado del documento">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="dot">{i < current ? <Icon name="check" size={14} /> : i + 1}</span>
          <span className="label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {text ? <p className="muted">{text}</p> : null}
      {action}
    </div>
  );
}

// ------------------------------------------------------------------ Tabla de datos

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  align?: 'right' | 'center';
  /** Ocultar en pantallas angostas. */
  hideSm?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  empty,
  searchText,
  initialSort,
  pageSize = 12,
  caption,
  rowActions,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  /** Texto de búsqueda por fila: si se define, aparece el buscador. */
  searchText?: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  caption: string;
  rowActions?: (row: T) => ReactNode;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const id = useId();
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filtered = useMemo(() => {
    let r = rows;
    if (searchText && q.trim()) {
      const nq = norm(q.trim());
      r = r.filter((row) => norm(searchText(row)).includes(nq));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const sv = col.sortValue;
        r = [...r].sort((a, b) => {
          const va = sv(a);
          const vb = sv(b);
          const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return r;
  }, [rows, q, sort, columns, searchText]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const p = Math.min(page, pages - 1);
  const visible = filtered.slice(p * pageSize, (p + 1) * pageSize);

  return (
    <div className="datatable">
      {searchText ? (
        <div className="dt-tools">
          <label className="dt-search" htmlFor={`${id}-q`}>
            <Icon name="search" size={16} />
            <span className="sr-only">Buscar en {caption}</span>
            <input
              id={`${id}-q`}
              type="search"
              value={q}
              placeholder="Buscar…"
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <span className="muted small" role="status">
            {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
      ) : null}
      {filtered.length === 0 ? (
        empty ?? <Empty title="No hay registros" />
      ) : (
        <div className="table-scroll">
          <table className="table dt-table">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`${c.align ? `al-${c.align}` : ''}${c.hideSm ? ' hide-sm' : ''}`} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.sortValue ? (
                      <button
                        type="button"
                        className="th-sort"
                        onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'asc' }))}
                      >
                        {c.header}
                        <span aria-hidden="true">{sort?.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                ))}
                {rowActions ? (
                  <th scope="col" className="al-right">
                    <span className="sr-only">Acciones</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.id}
                  className={onRowClick ? 'is-clickable' : ''}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => (e.key === 'Enter' ? onRowClick(row) : undefined) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`${c.align ? `al-${c.align}` : ''}${c.hideSm ? ' hide-sm' : ''}`}>
                      {c.render(row)}
                    </td>
                  ))}
                  {rowActions ? (
                    <td className="al-right row-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <div className="dt-pager">
          <button type="button" className="btn-secondary btn-sm" disabled={p === 0} onClick={() => setPage(p - 1)}>
            Anterior
          </button>
          <span className="muted small">
            Página {p + 1} de {pages}
          </span>
          <button type="button" className="btn-secondary btn-sm" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>
            Siguiente
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ Panel lateral (registro)

export function Drawer({ open, title, subtitle, onClose, children, footer, wide }: { open: boolean; title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Referencia estable: el efecto solo corre al abrir o cerrar, no en cada renderizado (evita saltos de foco).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    // Foco inicial en el primer campo, solo si el usuario aún no está trabajando dentro del panel.
    const t = window.setTimeout(() => {
      if (ref.current && !ref.current.contains(document.activeElement)) ref.current.querySelector<HTMLElement>('input, select, textarea, button:not(.drawer-close)')?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]');
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('has-drawer');
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('has-drawer');
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="drawer-layer">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className={`drawer${wide ? ' is-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <header className="drawer-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <div className="muted small">{subtitle}</div> : null}
          </div>
          <button type="button" className="btn-icon drawer-close" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer ? <footer className="drawer-foot">{footer}</footer> : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Campos de formulario

export function TextField({ label, value, onChange, required, type = 'text', placeholder, help, maxLength, inputMode }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; placeholder?: string; help?: string; maxLength?: number; inputMode?: 'numeric' | 'text' | 'email' | 'tel' }) {
  const id = useId();
  return (
    <div className="ff">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      <input id={id} type={type} value={value} required={required} placeholder={placeholder} maxLength={maxLength} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      {help ? <small className="muted">{help}</small> : null}
    </div>
  );
}

export function NumberInput({ label, value, onChange, min = 0, max, step = 1, help, suffix, required }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; help?: ReactNode; suffix?: string; required?: boolean }) {
  const id = useId();
  return (
    <div className="ff">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      <div className="ff-num">
        <input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ''} min={min} max={max} step={step} onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
        {suffix ? <span className="ff-suffix">{suffix}</span> : null}
      </div>
      {help ? <small className="muted">{help}</small> : null}
    </div>
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, required, help }: { label: string; value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }>; required?: boolean; help?: string }) {
  const id = useId();
  return (
    <div className="ff">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help ? <small className="muted">{help}</small> : null}
    </div>
  );
}

export function TextArea({ label, value, onChange, rows = 3, required, help }: { label: string; value: string; onChange: (v: string) => void; rows?: number; required?: boolean; help?: string }) {
  const id = useId();
  return (
    <div className="ff">
      <label htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      {help ? <small className="muted">{help}</small> : null}
    </div>
  );
}

export function CheckField({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  const id = useId();
  return (
    <div className="ff ff-check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
      {help ? <small className="muted">{help}</small> : null}
    </div>
  );
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Lista clave–valor para fichas de registro. */
export function Facts({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="facts-grid">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
