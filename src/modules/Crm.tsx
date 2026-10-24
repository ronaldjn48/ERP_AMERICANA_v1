import { useEffect, useState } from 'react';
import { cop, num } from '../engine/format';
import { GUIDES } from '../erp/meta';
import {
  STAGES,
  moveOpportunity,
  orderTotals,
  receivableOf,
  resolveCase,
  saveCase,
  saveCustomer,
  saveOpportunity,
  startCase,
  type CaseInput,
  type CustomerInput,
  type OpportunityInput,
} from '../erp/ops';
import { navigate, run, useRoute } from '../erp/store';
import type { Customer, ErpState, Opportunity, OpportunityStage, ServiceCase } from '../erp/types';
import { Icon } from '../ui/icons';
import { CheckField, Chip, DataTable, Drawer, Empty, Facts, FormGrid, ModuleGuide, NumberInput, PageHeader, SelectField, SubNav, TextArea, TextField } from '../ui/kit';
import { SalesOrderDrawer } from './Sales';

type View = 'clientes' | 'oportunidades' | 'casos';

export function CrmModule({ s }: { s: ErpState }) {
  const route = useRoute();
  const view = (['clientes', 'oportunidades', 'casos'].includes(route.view ?? '') ? route.view : 'clientes') as View;
  const g = GUIDES.crm!;
  return (
    <div className="page">
      <PageHeader title="CRM" crumbs={['Comercial', 'CRM']} subtitle="Clientes, embudo de oportunidades y servicio al cliente." />
      <ModuleGuide id="crm" {...g} />
      <SubNav<View>
        value={view}
        onChange={(v) => navigate({ module: 'crm', view: v })}
        items={[
          { id: 'clientes', label: 'Clientes', count: s.customers.filter((c) => c.active).length },
          { id: 'oportunidades', label: 'Oportunidades', count: s.opportunities.filter((o) => o.stage !== 'ganada' && o.stage !== 'perdida').length },
          { id: 'casos', label: 'Casos de servicio', count: s.cases.filter((c) => c.status !== 'resuelto').length },
        ]}
      />
      {view === 'clientes' ? <Customers s={s} openId={route.view === 'clientes' ? route.id : undefined} /> : null}
      {view === 'oportunidades' ? <Pipeline s={s} openId={route.id} /> : null}
      {view === 'casos' ? <Cases s={s} openId={route.id} /> : null}
    </div>
  );
}

// ------------------------------------------------------------------ Clientes

const emptyCustomer = (): CustomerInput => ({ name: '', docType: 'NIT', docNumber: '', city: 'Barranquilla', segment: 'Corporativo', email: '', phone: '', creditLimit: 0, paymentTerm: 30 });

function Customers({ s, openId }: { s: ErpState; openId?: string }) {
  const [editing, setEditing] = useState<CustomerInput | null>(null);
  const [detail, setDetail] = useState<string | null>(openId ?? null);
  const [showInactive, setShowInactive] = useState(false);
  useEffect(() => {
    if (openId) setDetail(openId);
  }, [openId]);
  const rows = s.customers.filter((c) => showInactive || c.active);
  const current = detail ? s.customers.find((c) => c.id === detail) : null;

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn-primary" onClick={() => setEditing(emptyCustomer())}>
          <Icon name="plus" size={16} /> Nuevo cliente
        </button>
        <CheckField label="Mostrar inactivos" checked={showInactive} onChange={setShowInactive} />
      </div>
      <DataTable<Customer>
        caption="Clientes"
        rows={[...rows].reverse()}
        searchText={(c) => `${c.code} ${c.name} ${c.docNumber} ${c.city} ${c.segment} ${c.email}`}
        onRowClick={(c) => setDetail(c.id)}
        columns={[
          { key: 'code', header: 'Código', render: (c) => c.code, sortValue: (c) => c.code },
          { key: 'name', header: 'Cliente', render: (c) => <strong>{c.name}</strong>, sortValue: (c) => c.name },
          { key: 'doc', header: 'Documento', render: (c) => `${c.docType} ${c.docNumber}`, hideSm: true },
          { key: 'seg', header: 'Segmento', render: (c) => c.segment, sortValue: (c) => c.segment },
          { key: 'city', header: 'Ciudad', render: (c) => c.city, hideSm: true, sortValue: (c) => c.city },
          { key: 'cupo', header: 'Cupo', align: 'right', render: (c) => (c.creditLimit ? cop(c.creditLimit) : 'Contado'), sortValue: (c) => c.creditLimit },
          { key: 'cartera', header: 'Cartera', align: 'right', render: (c) => cop(receivableOf(s, c.id)), sortValue: (c) => receivableOf(s, c.id) },
        ]}
      />
      {current ? (
        <Drawer
          open
          title={current.name}
          subtitle={`${current.code} · ${current.segment}${current.active ? '' : ' · Inactivo'}`}
          onClose={() => {
            setDetail(null);
            navigate({ module: 'crm', view: 'clientes' });
          }}
          wide
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => run((st) => saveCustomer(st, { ...current, active: !current.active }), current.active ? 'Cliente inactivado' : 'Cliente activado')}>
                {current.active ? 'Inactivar' : 'Activar'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setEditing({ ...current });
                  setDetail(null);
                }}
              >
                <Icon name="edit" size={16} /> Editar
              </button>
            </>
          }
        >
          <CustomerDetail s={s} c={current} />
        </Drawer>
      ) : null}
      {editing ? <CustomerForm value={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

function CustomerDetail({ s, c }: { s: ErpState; c: Customer }) {
  const orders = s.salesOrders.filter((o) => o.customerId === c.id);
  const cases = s.cases.filter((x) => x.customerId === c.id);
  const used = receivableOf(s, c.id);
  return (
    <>
      <Facts
        items={[
          ['Documento', `${c.docType} ${c.docNumber}`],
          ['Ciudad', c.city || '—'],
          ['Correo', c.email || '—'],
          ['Teléfono', c.phone || '—'],
          ['Cupo de crédito', c.creditLimit ? cop(c.creditLimit) : 'Solo contado'],
          ['Plazo de pago', c.paymentTerm ? `${c.paymentTerm} días` : 'Contado'],
          ['Cartera actual', cop(used)],
          ['Cupo disponible', c.creditLimit ? cop(Math.max(0, c.creditLimit - used)) : '—'],
        ]}
      />
      <h3 className="mt">Pedidos ({orders.length})</h3>
      {orders.length === 0 ? (
        <p className="muted">Sin pedidos.</p>
      ) : (
        <ul className="mini-list">
          {orders.slice(-8).reverse().map((o) => (
            <li key={o.id}>
              <button type="button" className="link" onClick={() => navigate({ module: 'ventas', id: o.id })}>
                {o.number}
              </button>
              <span>{o.day < 1 ? 'Apertura' : `Día ${o.day}`}</span>
              <Chip status={o.status} />
              <span className="num">{cop(orderTotals(o.lines, s.settings.ivaRate).total)}</span>
            </li>
          ))}
        </ul>
      )}
      <h3 className="mt">Casos ({cases.length})</h3>
      {cases.length === 0 ? (
        <p className="muted">Sin casos.</p>
      ) : (
        <ul className="mini-list">
          {cases.slice(-6).reverse().map((x) => (
            <li key={x.id}>
              <span>{x.number}</span>
              <span className="grow">{x.subject}</span>
              <Chip status={x.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CustomerForm({ value, onClose }: { value: CustomerInput; onClose: () => void }) {
  const [f, setF] = useState<CustomerInput>(value);
  const set = (p: Partial<CustomerInput>) => setF({ ...f, ...p });
  const save = () => {
    if (run((st) => saveCustomer(st, f), f.id ? 'Cliente actualizado' : 'Cliente creado')) onClose();
  };
  return (
    <Drawer
      open
      title={f.id ? 'Editar cliente' : 'Nuevo cliente'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <FormGrid>
          <TextField label="Nombre o razón social" value={f.name} onChange={(v) => set({ name: v })} required />
          <SelectField label="Tipo de documento" value={f.docType} onChange={(v) => set({ docType: v })} options={[{ value: 'NIT', label: 'NIT (empresa)' }, { value: 'CC', label: 'Cédula de ciudadanía' }]} />
          <TextField label="Número de documento" value={f.docNumber} onChange={(v) => set({ docNumber: v.replace(/[^\d-]/g, '') })} required inputMode="numeric" help={f.docType === 'NIT' ? '9 dígitos, por ejemplo 901234567' : 'Entre 6 y 10 dígitos'} />
          <SelectField label="Segmento" value={f.segment} onChange={(v) => set({ segment: v })} options={[{ value: 'Minorista', label: 'Minorista' }, { value: 'Mayorista', label: 'Mayorista' }, { value: 'Corporativo', label: 'Corporativo' }]} />
          <TextField label="Ciudad" value={f.city} onChange={(v) => set({ city: v })} />
          <TextField label="Correo electrónico" value={f.email} onChange={(v) => set({ email: v })} type="email" inputMode="email" />
          <TextField label="Teléfono" value={f.phone} onChange={(v) => set({ phone: v })} inputMode="tel" />
          <NumberInput label="Cupo de crédito" value={f.creditLimit} onChange={(v) => set({ creditLimit: v })} step={500000} suffix="COP" help="0 = solo ventas de contado" />
          <NumberInput label="Plazo de pago" value={f.paymentTerm} onChange={(v) => set({ paymentTerm: v })} max={120} suffix="días" />
        </FormGrid>
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}

// ------------------------------------------------------------------ Oportunidades

const OPEN_STAGES: OpportunityStage[] = ['prospecto', 'calificado', 'propuesta', 'negociacion'];

function Pipeline({ s, openId }: { s: ErpState; openId?: string }) {
  const [editing, setEditing] = useState<OpportunityInput | null>(null);
  const [order, setOrder] = useState<{ customerId: string; opportunityId: string } | null>(null);
  const [closed, setClosed] = useState(false);
  const open = s.opportunities.filter((o) => OPEN_STAGES.includes(o.stage));
  const weighted = open.reduce((a, o) => a + o.value * (STAGES.find((x) => x.id === o.stage)?.probability ?? 0), 0);
  const won = s.opportunities.filter((o) => o.stage === 'ganada');
  const lost = s.opportunities.filter((o) => o.stage === 'perdida');
  const name = (o: Opportunity) => (o.customerId ? s.customers.find((c) => c.id === o.customerId)?.name : o.contactName) ?? '';

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn-primary" onClick={() => setEditing({ name: '', customerId: null, contactName: '', value: 1000000, source: 'llamada', notes: '' })}>
          <Icon name="plus" size={16} /> Nueva oportunidad
        </button>
        <span className="muted small">
          Embudo abierto: <strong>{cop(open.reduce((a, o) => a + o.value, 0))}</strong> · Pronóstico ponderado: <strong>{cop(weighted)}</strong> · Tasa de cierre:{' '}
          <strong>{won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0} %</strong>
        </span>
      </div>
      <div className="kanban" role="list" aria-label="Embudo de oportunidades">
        {OPEN_STAGES.map((st, si) => {
          const items = open.filter((o) => o.stage === st);
          const meta = STAGES.find((x) => x.id === st)!;
          return (
            <section key={st} className="kanban-col" role="listitem" aria-label={meta.label}>
              <header>
                <strong>{meta.label}</strong>
                <span className="muted small">
                  {items.length} · {Math.round(meta.probability * 100)} %
                </span>
              </header>
              {items.length === 0 ? <p className="muted small kanban-empty">Sin oportunidades</p> : null}
              {items.map((o) => (
                <article key={o.id} className={`kcard${openId === o.id ? ' is-focus' : ''}`}>
                  <strong>{o.name}</strong>
                  <span className="muted small">{name(o)}</span>
                  <span className="kcard-value">{cop(o.value)}</span>
                  <span className="muted small">Origen: {o.source} · día {o.createdDay}</span>
                  <div className="kcard-actions">
                    <button type="button" className="btn-icon" disabled={si === 0} aria-label={`Mover ${o.name} a la etapa anterior`} onClick={() => run((x) => moveOpportunity(x, o.id, OPEN_STAGES[si - 1]))}>
                      <Icon name="arrowLeft" size={16} />
                    </button>
                    <button type="button" className="btn-icon" disabled={si === OPEN_STAGES.length - 1} aria-label={`Mover ${o.name} a la etapa siguiente`} onClick={() => run((x) => moveOpportunity(x, o.id, OPEN_STAGES[si + 1]))}>
                      <Icon name="arrowRight" size={16} />
                    </button>
                    <button type="button" className="btn-icon" aria-label={`Editar ${o.name}`} onClick={() => setEditing({ ...o })}>
                      <Icon name="edit" size={16} />
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => run((x) => moveOpportunity(x, o.id, 'ganada'), 'Oportunidad ganada')}>
                      Ganar
                    </button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => run((x) => moveOpportunity(x, o.id, 'perdida'), 'Oportunidad marcada como perdida')}>
                      Perder
                    </button>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>Oportunidades ganadas</h2>
          <CheckField label="Ver también las perdidas" checked={closed} onChange={setClosed} />
        </header>
        {won.length + (closed ? lost.length : 0) === 0 ? (
          <Empty title="Aún no hay oportunidades cerradas" text="Usa el botón Ganar cuando el cliente acepte la propuesta." />
        ) : (
          <ul className="mini-list">
            {[...won, ...(closed ? lost : [])].map((o) => (
              <li key={o.id}>
                <span className="grow">
                  <strong>{o.name}</strong> · {name(o)}
                </span>
                <span className="num">{cop(o.value)}</span>
                <Chip status={o.stage === 'ganada' ? 'pagado' : 'anulado'} label={o.stage === 'ganada' ? 'Ganada' : 'Perdida'} />
                {o.stage === 'ganada' ? (
                  o.salesOrderId ? (
                    <button type="button" className="link" onClick={() => navigate({ module: 'ventas', id: o.salesOrderId! })}>
                      Ver pedido
                    </button>
                  ) : (
                    <button type="button" className="btn-primary btn-sm" onClick={() => setOrder({ customerId: o.customerId!, opportunityId: o.id })}>
                      Crear cotización
                    </button>
                  )
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {editing ? <OpportunityForm s={s} value={editing} onClose={() => setEditing(null)} /> : null}
      {order ? <SalesOrderDrawer s={s} preset={order} onClose={() => setOrder(null)} /> : null}
    </>
  );
}

function OpportunityForm({ s, value, onClose }: { s: ErpState; value: OpportunityInput; onClose: () => void }) {
  const [f, setF] = useState<OpportunityInput>(value);
  const set = (p: Partial<OpportunityInput>) => setF({ ...f, ...p });
  const save = () => run((st) => saveOpportunity(st, f), f.id ? 'Oportunidad actualizada' : 'Oportunidad creada') && onClose();
  return (
    <Drawer
      open
      title={f.id ? 'Editar oportunidad' : 'Nueva oportunidad'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Nombre de la oportunidad" value={f.name} onChange={(v) => set({ name: v })} required />
        <SelectField
          label="Cliente registrado"
          value={f.customerId ?? ''}
          onChange={(v) => set({ customerId: v || null })}
          options={[{ value: '', label: 'Sin cliente (prospecto)' }, ...s.customers.filter((c) => c.active && c.segment !== 'Minorista').map((c) => ({ value: c.id, label: c.name }))]}
          help="Para ganar la oportunidad el prospecto debe estar registrado como cliente."
        />
        <TextField label="Contacto" value={f.contactName} onChange={(v) => set({ contactName: v })} />
        <NumberInput label="Valor estimado" value={f.value} onChange={(v) => set({ value: v })} step={100000} suffix="COP" required />
        <SelectField
          label="Origen"
          value={f.source}
          onChange={(v) => set({ source: v })}
          options={[
            { value: 'web', label: 'Formulario web' },
            { value: 'referido', label: 'Referido' },
            { value: 'feria', label: 'Feria comercial' },
            { value: 'redes', label: 'Redes sociales' },
            { value: 'llamada', label: 'Llamada' },
          ]}
        />
        <TextArea label="Notas" value={f.notes} onChange={(v) => set({ notes: v })} />
      </FormGrid>
    </Drawer>
  );
}

// ------------------------------------------------------------------ Casos

function Cases({ s, openId }: { s: ErpState; openId?: string }) {
  const [filter, setFilter] = useState<'abiertos' | 'todos'>('abiertos');
  const [detail, setDetail] = useState<string | null>(openId ?? null);
  const [creating, setCreating] = useState<CaseInput | null>(null);
  const [resolution, setResolution] = useState('');
  useEffect(() => {
    if (openId) setDetail(openId);
  }, [openId]);
  const rows = s.cases.filter((c) => filter === 'todos' || c.status !== 'resuelto');
  const current = detail ? s.cases.find((c) => c.id === detail) : null;
  const cname = (id: string) => s.customers.find((c) => c.id === id)?.name ?? '';
  const prio = { alta: 0, media: 1, baja: 2 };

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn-primary" onClick={() => setCreating({ customerId: s.customers[0]?.id ?? '', subject: '', priority: 'media', channel: 'telefono' })}>
          <Icon name="plus" size={16} /> Registrar caso
        </button>
        <SelectField<'abiertos' | 'todos'> label="Mostrar" value={filter} onChange={setFilter} options={[{ value: 'abiertos', label: 'Casos abiertos' }, { value: 'todos', label: 'Todos los casos' }]} />
      </div>
      <DataTable<ServiceCase>
        caption="Casos de servicio"
        rows={rows}
        initialSort={{ key: 'prio', dir: 'asc' }}
        searchText={(c) => `${c.number} ${c.subject} ${cname(c.customerId)}`}
        onRowClick={(c) => {
          setDetail(c.id);
          setResolution('');
        }}
        empty={<Empty title="Sin casos abiertos" text="Buen trabajo: el servicio al cliente está al día." />}
        columns={[
          { key: 'num', header: 'Caso', render: (c) => c.number, sortValue: (c) => c.number },
          { key: 'subj', header: 'Asunto', render: (c) => c.subject },
          { key: 'cli', header: 'Cliente', render: (c) => cname(c.customerId), hideSm: true },
          { key: 'prio', header: 'Prioridad', render: (c) => <Chip status={c.priority} />, sortValue: (c) => prio[c.priority] * 1000 - (s.day - c.openedDay) },
          { key: 'age', header: 'Antigüedad', align: 'right', render: (c) => `${(c.resolvedDay ?? s.day) - c.openedDay} d`, sortValue: (c) => s.day - c.openedDay },
          { key: 'st', header: 'Estado', render: (c) => <Chip status={c.status} /> },
        ]}
      />
      {current ? (
        <Drawer
          open
          title={`${current.number} · ${current.subject}`}
          subtitle={`${cname(current.customerId)} · canal ${current.channel} · abierto el día ${current.openedDay}`}
          onClose={() => {
            setDetail(null);
            navigate({ module: 'crm', view: 'casos' });
          }}
          footer={
            current.status === 'resuelto' ? null : (
              <>
                {current.status === 'abierto' ? (
                  <button type="button" className="btn-secondary" onClick={() => run((x) => startCase(x, current.id), 'Caso en proceso')}>
                    Tomar caso
                  </button>
                ) : null}
                <button type="button" className="btn-primary" onClick={() => run((x) => resolveCase(x, current.id, resolution), 'Caso resuelto') && setDetail(null)}>
                  Resolver
                </button>
              </>
            )
          }
        >
          <Facts
            items={[
              ['Estado', <Chip key="s" status={current.status} />],
              ['Prioridad', <Chip key="p" status={current.priority} />],
              ['Días abierto', num((current.resolvedDay ?? s.day) - current.openedDay)],
              ['Cliente', cname(current.customerId)],
            ]}
          />
          {current.status === 'resuelto' ? (
            <p className="notice notice-ok mt">
              <strong>Solución:</strong> {current.resolution}
            </p>
          ) : (
            <TextArea label="Solución dada al cliente" value={resolution} onChange={setResolution} rows={4} required help="Mínimo 10 caracteres. Queda en el historial del cliente." />
          )}
        </Drawer>
      ) : null}
      {creating ? (
        <CaseForm s={s} value={creating} onClose={() => setCreating(null)} />
      ) : null}
    </>
  );
}

function CaseForm({ s, value, onClose }: { s: ErpState; value: CaseInput; onClose: () => void }) {
  const [f, setF] = useState(value);
  const set = (p: Partial<CaseInput>) => setF({ ...f, ...p });
  return (
    <Drawer
      open
      title="Registrar caso"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => run((x) => saveCase(x, f), 'Caso registrado') && onClose()}>
            Guardar
          </button>
        </>
      }
    >
      <FormGrid>
        <SelectField label="Cliente" value={f.customerId} onChange={(v) => set({ customerId: v })} options={s.customers.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name }))} />
        <TextField label="Asunto" value={f.subject} onChange={(v) => set({ subject: v })} required />
        <SelectField label="Prioridad" value={f.priority} onChange={(v) => set({ priority: v })} options={[{ value: 'baja', label: 'Baja' }, { value: 'media', label: 'Media' }, { value: 'alta', label: 'Alta' }]} />
        <SelectField label="Canal" value={f.channel} onChange={(v) => set({ channel: v })} options={[{ value: 'telefono', label: 'Teléfono' }, { value: 'correo', label: 'Correo' }, { value: 'whatsapp', label: 'WhatsApp' }, { value: 'web', label: 'Web' }]} />
      </FormGrid>
    </Drawer>
  );
}
