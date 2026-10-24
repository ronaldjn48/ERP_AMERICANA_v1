import { useEffect, useMemo, useState } from 'react';
import { cop, num, pct } from '../engine/format';
import { accountName } from '../erp/accounts';
import { GUIDES } from '../erp/meta';
import {
  available,
  cancelSalesOrder,
  confirmSalesOrder,
  createSalesOrder,
  dispatchSalesOrder,
  invoiceSalesOrder,
  orderTotals,
  registerPayment,
  sendReminder,
  updateSalesOrder,
} from '../erp/ops';
import { navigate, run, useRoute } from '../erp/store';
import type { ErpState, OrderLine, SalesOrder } from '../erp/types';
import { Icon } from '../ui/icons';
import { Chip, DataTable, Drawer, Empty, Facts, ModuleGuide, NumberInput, PageHeader, SelectField, Stepper, SubNav, TextArea } from '../ui/kit';
import { ConfirmAction } from '../components/ui';

type View = 'todos' | 'cotizaciones' | 'despachar' | 'facturar' | 'web' | 'facturas';

const FLOW = ['Cotización', 'Confirmado', 'Despachado', 'Facturado', 'Pagado'];
const STEP: Record<SalesOrder['status'], number> = { cotizacion: 0, confirmado: 1, despachado: 2, facturado: 3, pagado: 4, anulado: 0 };
const CHANNEL = { directo: 'Directo', web: 'Tienda web', crm: 'CRM' };

export function SalesModule({ s }: { s: ErpState }) {
  const route = useRoute();
  const views: View[] = ['todos', 'cotizaciones', 'despachar', 'facturar', 'web', 'facturas'];
  const view = (views.includes(route.view as View) ? route.view : 'todos') as View;
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<string | null>(route.id ?? null);
  useEffect(() => {
    if (route.id) setDetail(route.id);
  }, [route.id]);

  const so = s.salesOrders;
  const filters: Record<View, (o: SalesOrder) => boolean> = {
    todos: () => true,
    cotizaciones: (o) => o.status === 'cotizacion',
    despachar: (o) => o.status === 'confirmado',
    facturar: (o) => o.status === 'despachado',
    web: (o) => o.channel === 'web',
    facturas: (o) => Boolean(o.invoiceNumber),
  };
  const rows = [...so].filter(filters[view]).reverse();
  const cname = (id: string) => s.customers.find((c) => c.id === id)?.name ?? '';
  const current = detail ? so.find((o) => o.id === detail) : null;
  const ready = so.filter((o) => o.status === 'confirmado' && o.lines.every((l) => (s.products.find((p) => p.id === l.productId)?.stock ?? 0) >= l.qty));

  return (
    <div className="page">
      <PageHeader
        title="Ventas"
        crumbs={['Comercial', 'Ventas']}
        subtitle="Cotizaciones, pedidos, despachos, facturación electrónica y recaudo."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Nueva cotización
          </button>
        }
      />
      <ModuleGuide id="ventas" {...GUIDES.ventas!} />
      <SubNav<View>
        value={view}
        onChange={(v) => navigate({ module: 'ventas', view: v })}
        items={[
          { id: 'todos', label: 'Todos' },
          { id: 'cotizaciones', label: 'Por confirmar', count: so.filter(filters.cotizaciones).length },
          { id: 'despachar', label: 'Por despachar', count: so.filter(filters.despachar).length },
          { id: 'facturar', label: 'Por facturar', count: so.filter(filters.facturar).length },
          { id: 'web', label: 'Pedidos web' },
          { id: 'facturas', label: 'Facturas' },
        ]}
      />
      {view === 'despachar' && ready.length > 1 ? (
        <p className="notice">
          {ready.length} pedidos tienen inventario para despachar. Despáchalos uno por uno o automatiza esta tarea en el módulo de Automatización.
        </p>
      ) : null}
      <DataTable<SalesOrder>
        caption="Pedidos de venta"
        rows={rows}
        searchText={(o) => `${o.number} ${o.invoiceNumber ?? ''} ${cname(o.customerId)} ${o.status}`}
        onRowClick={(o) => setDetail(o.id)}
        empty={<Empty title="No hay pedidos en esta vista" text="Cierra el día para recibir pedidos de la tienda virtual o crea una cotización." />}
        columns={[
          { key: 'n', header: 'Pedido', render: (o) => <strong>{o.number}</strong>, sortValue: (o) => o.number },
          { key: 'd', header: 'Día', render: (o) => (o.day < 1 ? 'Apertura' : o.day), sortValue: (o) => o.day, align: 'right' },
          { key: 'c', header: 'Cliente', render: (o) => cname(o.customerId), sortValue: (o) => cname(o.customerId) },
          { key: 'ch', header: 'Canal', render: (o) => CHANNEL[o.channel], hideSm: true },
          { key: 'f', header: 'Factura', render: (o) => o.invoiceNumber ?? '—', hideSm: true },
          { key: 't', header: 'Total', align: 'right', render: (o) => cop(orderTotals(o.lines, s.settings.ivaRate).total), sortValue: (o) => orderTotals(o.lines, s.settings.ivaRate).total },
          { key: 's', header: 'Estado', render: (o) => <Chip status={o.status} /> },
        ]}
        rowActions={(o) => <QuickAction s={s} o={o} />}
      />
      {creating ? <SalesOrderDrawer s={s} onClose={() => setCreating(false)} /> : null}
      {current ? (
        <OrderDetail
          s={s}
          o={current}
          onClose={() => {
            setDetail(null);
            navigate({ module: 'ventas', view });
          }}
        />
      ) : null}
    </div>
  );
}

function QuickAction({ s, o }: { s: ErpState; o: SalesOrder }) {
  const label = { cotizacion: 'Confirmar', confirmado: 'Despachar', despachado: 'Facturar', facturado: 'Registrar pago' } as const;
  const action = {
    cotizacion: confirmSalesOrder,
    confirmado: dispatchSalesOrder,
    despachado: invoiceSalesOrder,
    facturado: registerPayment,
  } as const;
  if (!(o.status in action)) return null;
  const st = o.status as keyof typeof action;
  void s;
  return (
    <button type="button" className="btn-secondary btn-sm" onClick={() => run((x) => action[st](x, o.id), `${o.number}: ${label[st].toLowerCase()} listo`)}>
      {label[st]}
    </button>
  );
}

function OrderDetail({ s, o, onClose }: { s: ErpState; o: SalesOrder; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const c = s.customers.find((x) => x.id === o.customerId);
  const t = orderTotals(o.lines, s.settings.ivaRate);
  const entries = s.journal.filter((e) => e.ref === o.number || (o.invoiceNumber && e.ref === o.invoiceNumber));
  const overdue = o.status === 'facturado' && o.dueDay !== null && o.dueDay < s.day;
  if (editing) return <SalesOrderDrawer s={s} order={o} onClose={() => setEditing(false)} />;
  return (
    <Drawer
      open
      wide
      title={`Pedido ${o.number}`}
      subtitle={`${c?.name ?? ''} · ${CHANNEL[o.channel]} · ${o.day < 1 ? 'antes de la apertura del sistema' : `día ${o.day}`}`}
      onClose={onClose}
      footer={
        <>
          {o.status === 'cotizacion' || o.status === 'confirmado' ? (
            <ConfirmAction label="Anular" question={`¿Anular el pedido ${o.number}?`} confirmLabel="Sí, anular" onConfirm={() => run((x) => cancelSalesOrder(x, o.id), 'Pedido anulado')} />
          ) : null}
          {o.status === 'cotizacion' ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                <Icon name="edit" size={16} /> Editar
              </button>
              <button type="button" className="btn-primary" onClick={() => run((x) => confirmSalesOrder(x, o.id), 'Pedido confirmado')}>
                Confirmar pedido
              </button>
            </>
          ) : null}
          {o.status === 'confirmado' ? (
            <button type="button" className="btn-primary" onClick={() => run((x) => dispatchSalesOrder(x, o.id), 'Pedido despachado')}>
              Despachar
            </button>
          ) : null}
          {o.status === 'despachado' ? (
            <button type="button" className="btn-primary" onClick={() => run((x) => invoiceSalesOrder(x, o.id), 'Factura electrónica emitida')}>
              Emitir factura electrónica
            </button>
          ) : null}
          {o.status === 'facturado' ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => run((x) => sendReminder(x, o.id), 'Recordatorio enviado')}>
                Enviar recordatorio
              </button>
              <button type="button" className="btn-primary" onClick={() => run((x) => registerPayment(x, o.id), 'Pago registrado')}>
                Registrar pago
              </button>
            </>
          ) : null}
        </>
      }
    >
      {o.status === 'anulado' ? <p className="notice notice-bad">Pedido anulado.</p> : <Stepper steps={FLOW} current={STEP[o.status]} />}
      <ShortageNotice s={s} o={o} />
      <Facts
        items={[
          ['Cliente', c?.name ?? '—'],
          ['Factura', o.invoiceNumber ? `${o.invoiceNumber} (${(o.invoiceDay ?? 0) < 1 ? 'antes de la apertura' : `día ${o.invoiceDay}`})` : '—'],
          ['Vencimiento', o.dueDay !== null ? `Día ${o.dueDay}${overdue ? ' · vencida' : ''}` : '—'],
          ['Pago', o.paidDay !== null ? `Día ${o.paidDay}` : '—'],
          ['Recordatorios', num(o.reminders)],
          ['Notas', o.notes || '—'],
        ]}
      />
      <h3 className="mt">Productos</h3>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col" className="al-right">Cant.</th>
              <th scope="col" className="al-right">Precio</th>
              <th scope="col" className="al-right">Desc.</th>
              <th scope="col" className="al-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {o.lines.map((l) => {
              const p = s.products.find((x) => x.id === l.productId);
              return (
                <tr key={l.productId}>
                  <th scope="row">
                    {p?.sku} · {p?.name}
                  </th>
                  <td className="al-right">{l.qty}</td>
                  <td className="al-right">{cop(l.price)}</td>
                  <td className="al-right">{pct(l.discount, 0)}</td>
                  <td className="al-right">{cop(l.qty * l.price * (1 - l.discount))}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4}>Subtotal</th>
              <td className="al-right">{cop(t.subtotal)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={4}>IVA ({pct(s.settings.ivaRate, 0)})</th>
              <td className="al-right">{cop(t.iva)}</td>
            </tr>
            <tr className="total">
              <th scope="row" colSpan={4}>Total</th>
              <td className="al-right">{cop(t.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <h3 className="mt">Asientos contables generados</h3>
      {entries.length === 0 ? (
        <p className="muted">Este pedido aún no genera asientos: la contabilidad se mueve al despachar y al facturar.</p>
      ) : (
        entries.map((e) => (
          <div key={e.id} className="entry">
            <p className="small">
              <strong>{e.number}</strong> · día {e.day} · {e.description}
            </p>
            <div className="table-scroll">
              <table className="table">
                <tbody>
                  {e.lines.map((l, i) => (
                    <tr key={i}>
                      <th scope="row">
                        {l.account} {accountName(l.account)}
                      </th>
                      <td className="al-right">{l.debit ? cop(l.debit) : ''}</td>
                      <td className="al-right">{l.credit ? cop(l.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </Drawer>
  );
}

/** Faltantes del pedido: explica la consecuencia y lleva a crear la orden de compra ya diligenciada. */
function ShortageNotice({ s, o }: { s: ErpState; o: SalesOrder }) {
  if (o.status !== 'cotizacion' && o.status !== 'confirmado') return null;
  const short = o.lines
    .map((l) => {
      const p = s.products.find((x) => x.id === l.productId);
      if (!p) return null;
      const have = o.status === 'confirmado' ? p.stock : available(p);
      return have < l.qty ? { p, missing: l.qty - Math.max(0, have) } : null;
    })
    .filter((x): x is { p: (typeof s.products)[number]; missing: number } => x !== null);
  if (short.length === 0) return null;
  const sup = s.suppliers.find((x) => x.id === short[0].p.supplierId);
  return (
    <div className="notice notice-warn">
      <p>
        <strong>Inventario insuficiente:</strong> faltan {short.map((x) => `${x.missing} ${x.p.unit} de ${x.p.sku}`).join(', ')}. Sin mercancía no puedes despachar: el
        cliente espera y, después de dos días, puede abrir un reclamo. Compra al proveedor{sup ? ` (entrega en ${sup.leadTimeDays} días)` : ''} o ajusta la cotización.
      </p>
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => navigate({ module: 'compras', view: 'nueva', id: short.map((x) => `${x.p.id}:${x.missing}`).join(',') })}
      >
        Crear orden de compra por el faltante
      </button>
    </div>
  );
}

/** Formulario de cotización: crea o edita, con disponibilidad y margen en tiempo real. */
export function SalesOrderDrawer({
  s,
  order,
  preset,
  onClose,
}: {
  s: ErpState;
  order?: SalesOrder;
  preset?: { customerId: string; opportunityId: string };
  onClose: () => void;
}) {
  const products = s.products.filter((p) => p.active);
  const [customerId, setCustomerId] = useState(order?.customerId ?? preset?.customerId ?? s.customers.find((c) => c.segment !== 'Minorista')?.id ?? s.customers[0]?.id ?? '');
  const [lines, setLines] = useState<OrderLine[]>(order?.lines ?? [{ productId: products[0]?.id ?? '', qty: 1, price: products[0]?.price ?? 0, discount: 0 }]);
  const [notes, setNotes] = useState(order?.notes ?? '');
  const customer = s.customers.find((c) => c.id === customerId);
  const t = orderTotals(lines, s.settings.ivaRate);
  const cost = lines.reduce((a, l) => a + l.qty * (s.products.find((p) => p.id === l.productId)?.cost ?? 0), 0);
  const margin = t.subtotal > 0 ? (t.subtotal - cost) / t.subtotal : 0;
  const setLine = (i: number, p: Partial<OrderLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const usedProducts = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);

  const save = () => {
    const input = { customerId, lines, notes, opportunityId: preset?.opportunityId ?? order?.opportunityId ?? null };
    const ok = order ? run((x) => updateSalesOrder(x, order.id, input), 'Cotización actualizada') : run((x) => createSalesOrder(x, input), 'Cotización creada');
    if (ok) onClose();
  };

  return (
    <Drawer
      open
      wide
      title={order ? `Editar ${order.number}` : 'Nueva cotización'}
      subtitle={preset ? 'Generada desde una oportunidad ganada del CRM' : undefined}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Guardar cotización
          </button>
        </>
      }
    >
      <SelectField
        label="Cliente"
        value={customerId}
        onChange={setCustomerId}
        options={s.customers.filter((c) => c.active).map((c) => ({ value: c.id, label: `${c.name} (${c.segment})` }))}
        help={customer ? (customer.creditLimit ? `Cupo ${cop(customer.creditLimit)} · plazo ${customer.paymentTerm} días` : 'Cliente de contado') : undefined}
      />
      <h3 className="mt">Productos</h3>
      <div className="lines">
        {lines.map((l, i) => {
          const p = s.products.find((x) => x.id === l.productId);
          const short = p ? available(p) < l.qty : false;
          return (
            <div key={i} className="line-row">
              <SelectField
                label={`Producto ${i + 1}`}
                value={l.productId}
                onChange={(v) => {
                  const np = s.products.find((x) => x.id === v);
                  setLine(i, { productId: v, price: np?.price ?? l.price });
                }}
                options={products.filter((x) => x.id === l.productId || !usedProducts.has(x.id)).map((x) => ({ value: x.id, label: `${x.sku} · ${x.name}` }))}
              />
              <NumberInput label="Cantidad" value={l.qty} onChange={(v) => setLine(i, { qty: Math.max(0, Math.round(v)) })} min={1} />
              <NumberInput label="Precio unitario" value={l.price} onChange={(v) => setLine(i, { price: v })} step={1000} />
              <NumberInput label="Descuento" value={Math.round(l.discount * 100)} onChange={(v) => setLine(i, { discount: Math.min(50, Math.max(0, v)) / 100 })} max={50} suffix="%" />
              <div className="line-meta">
                {p ? (
                  <span className={short ? 'bad-text small' : 'muted small'}>
                    Disponible {available(p)} · costo {cop(p.cost)}
                  </span>
                ) : null}
                {lines.length > 1 ? (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                    Quitar
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {lines.length < products.length ? (
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => {
            const np = products.find((x) => !usedProducts.has(x.id));
            if (np) setLines([...lines, { productId: np.id, qty: 1, price: np.price, discount: 0 }]);
          }}
        >
          <Icon name="plus" size={14} /> Agregar producto
        </button>
      ) : null}
      <TextArea label="Notas" value={notes} onChange={setNotes} rows={2} />
      <div className="totals-box">
        <div>
          <span>Subtotal</span>
          <strong>{cop(t.subtotal)}</strong>
        </div>
        <div>
          <span>IVA {pct(s.settings.ivaRate, 0)}</span>
          <strong>{cop(t.iva)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{cop(t.total)}</strong>
        </div>
        <div className={margin < 0.25 ? 'warn' : 'good'}>
          <span>Margen bruto</span>
          <strong>{pct(margin)}</strong>
        </div>
      </div>
      {margin < 0.25 ? <p className="notice notice-warn">El margen bruto está por debajo de 25 %, el mínimo de la política comercial.</p> : null}
    </Drawer>
  );
}
