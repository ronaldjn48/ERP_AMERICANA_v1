import { useEffect, useMemo, useState } from 'react';
import { ConfirmAction } from '../components/ui';
import { cop, num, pct } from '../engine/format';
import { accountName } from '../erp/accounts';
import { GUIDES } from '../erp/meta';
import {
  approvePurchaseOrder,
  available,
  cancelPurchaseOrder,
  createPurchaseOrder,
  payPurchaseOrder,
  purchaseTotals,
  receivePurchaseOrder,
  saveSupplier,
  type SupplierInput,
} from '../erp/ops';
import { navigate, run, useRoute } from '../erp/store';
import type { ErpState, PurchaseLine, PurchaseOrder, Supplier } from '../erp/types';
import { Icon } from '../ui/icons';
import { Chip, DataTable, Drawer, Empty, Facts, FormGrid, ModuleGuide, NumberInput, PageHeader, SelectField, Stepper, SubNav, TextArea, TextField } from '../ui/kit';

type View = 'ordenes' | 'proveedores';
const FLOW = ['Borrador', 'Aprobada', 'Recibida', 'Pagada'];
const STEP: Record<PurchaseOrder['status'], number> = { borrador: 0, aprobada: 1, recibida: 2, pagada: 3, anulada: 0 };

export function PurchasingModule({ s }: { s: ErpState }) {
  const route = useRoute();
  const view = (route.view === 'proveedores' ? 'proveedores' : 'ordenes') as View;
  const [creating, setCreating] = useState<PurchaseLine[] | null>(null);
  const [detail, setDetail] = useState<string | null>(route.id ?? null);
  useEffect(() => {
    if (route.id) setDetail(route.id);
  }, [route.id]);
  const low = s.products.filter((p) => p.active && p.reorderPoint > 0 && available(p) <= p.reorderPoint && !s.purchaseOrders.some((po) => (po.status === 'borrador' || po.status === 'aprobada') && po.lines.some((l) => l.productId === p.id)));
  const sname = (id: string) => s.suppliers.find((x) => x.id === id)?.name ?? '';
  const current = detail && view === 'ordenes' ? s.purchaseOrders.find((x) => x.id === detail) : null;

  return (
    <div className="page">
      <PageHeader
        title="Compras"
        crumbs={['Operaciones', 'Compras']}
        subtitle="Órdenes de compra, recepción de mercancía, pagos y proveedores."
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating([])}>
            <Icon name="plus" size={16} /> Nueva orden de compra
          </button>
        }
      />
      <ModuleGuide id="compras" {...GUIDES.compras!} />
      <SubNav<View>
        value={view}
        onChange={(v) => navigate({ module: 'compras', view: v })}
        items={[
          { id: 'ordenes', label: 'Órdenes de compra', count: s.purchaseOrders.filter((p) => p.status === 'borrador' || (p.status === 'aprobada' && p.expectedDay <= s.day)).length },
          { id: 'proveedores', label: 'Proveedores', count: s.suppliers.filter((x) => x.active).length },
        ]}
      />
      {view === 'ordenes' ? (
        <>
          {low.length ? (
            <div className="notice notice-warn row wrap between">
              <span>
                {low.length} producto(s) en o bajo el punto de reorden sin orden abierta: {low.map((p) => p.sku).join(', ')}.
              </span>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setCreating(low.filter((p) => p.supplierId === low[0].supplierId).map((p) => ({ productId: p.id, qty: p.reorderQty, cost: p.cost })))}>
                Sugerir orden
              </button>
            </div>
          ) : null}
          <DataTable<PurchaseOrder>
            caption="Órdenes de compra"
            rows={[...s.purchaseOrders].reverse()}
            searchText={(p) => `${p.number} ${sname(p.supplierId)} ${p.status}`}
            onRowClick={(p) => setDetail(p.id)}
            empty={<Empty title="Sin órdenes de compra" text="Crea una orden para reabastecer el inventario." />}
            columns={[
              { key: 'n', header: 'Orden', render: (p) => <strong>{p.number}</strong>, sortValue: (p) => p.number },
              { key: 'sup', header: 'Proveedor', render: (p) => sname(p.supplierId), sortValue: (p) => sname(p.supplierId) },
              { key: 'd', header: 'Creada', align: 'right', render: (p) => `Día ${p.day}`, hideSm: true },
              {
                key: 'e',
                header: 'Llegada',
                align: 'right',
                sortValue: (p) => p.expectedDay,
                render: (p) => (p.status === 'aprobada' ? <span className={p.expectedDay <= s.day ? 'good-text' : ''}>{p.expectedDay <= s.day ? 'En bodega' : `Día ${p.expectedDay}`}</span> : p.receivedDay ? `Día ${p.receivedDay}` : '—'),
              },
              { key: 't', header: 'Total', align: 'right', render: (p) => cop(purchaseTotals(p.lines, s.settings.ivaRate).total), sortValue: (p) => purchaseTotals(p.lines, s.settings.ivaRate).total },
              { key: 'o', header: 'Origen', render: (p) => (p.origin === 'automatizacion' ? 'Regla automática' : 'Manual'), hideSm: true },
              { key: 's', header: 'Estado', render: (p) => <Chip status={p.status} /> },
            ]}
          />
        </>
      ) : (
        <Suppliers s={s} openId={route.view === 'proveedores' ? route.id : undefined} />
      )}
      {creating ? <PurchaseForm s={s} initial={creating} onClose={() => setCreating(null)} /> : null}
      {current ? (
        <PoDetail
          s={s}
          po={current}
          onClose={() => {
            setDetail(null);
            navigate({ module: 'compras' });
          }}
        />
      ) : null}
    </div>
  );
}

function PoDetail({ s, po, onClose }: { s: ErpState; po: PurchaseOrder; onClose: () => void }) {
  const sup = s.suppliers.find((x) => x.id === po.supplierId);
  const t = purchaseTotals(po.lines, s.settings.ivaRate);
  const entries = s.journal.filter((e) => e.ref === po.number);
  return (
    <Drawer
      open
      wide
      title={`Orden ${po.number}`}
      subtitle={`${sup?.name ?? ''} · creada el día ${po.day}${po.origin === 'automatizacion' ? ' por una regla automática' : ''}`}
      onClose={onClose}
      footer={
        <>
          {po.status === 'borrador' || po.status === 'aprobada' ? (
            <ConfirmAction label="Anular" question={`¿Anular la orden ${po.number}?`} confirmLabel="Sí, anular" onConfirm={() => run((x) => cancelPurchaseOrder(x, po.id), 'Orden anulada')} />
          ) : null}
          {po.status === 'borrador' ? (
            <button type="button" className="btn-primary" onClick={() => run((x) => approvePurchaseOrder(x, po.id), 'Orden aprobada')}>
              Aprobar
            </button>
          ) : null}
          {po.status === 'aprobada' ? (
            <button type="button" className="btn-primary" disabled={s.day < po.expectedDay} onClick={() => run((x) => receivePurchaseOrder(x, po.id), 'Mercancía recibida')}>
              {s.day < po.expectedDay ? `Llega el día ${po.expectedDay}` : 'Recibir mercancía'}
            </button>
          ) : null}
          {po.status === 'recibida' ? (
            <button type="button" className="btn-primary" onClick={() => run((x) => payPurchaseOrder(x, po.id), 'Pago al proveedor registrado')}>
              Pagar al proveedor
            </button>
          ) : null}
        </>
      }
    >
      {po.status === 'anulada' ? <p className="notice notice-bad">Orden anulada.</p> : <Stepper steps={FLOW} current={STEP[po.status]} />}
      {po.status === 'borrador' && t.total > s.settings.poApprovalLimit ? (
        <p className="notice notice-warn">El total supera el límite de aprobación de {cop(s.settings.poApprovalLimit)}: requiere visto bueno de la gerencia.</p>
      ) : null}
      <Facts
        items={[
          ['Proveedor', sup?.name ?? '—'],
          ['Tiempo de entrega', sup ? `${sup.leadTimeDays} días` : '—'],
          ['Llegada esperada', `Día ${po.expectedDay}`],
          ['Recepción', po.receivedDay ? `Día ${po.receivedDay}` : '—'],
          ['Vencimiento del pago', po.dueDay ? `Día ${po.dueDay}` : '—'],
          ['Pago', po.paidDay ? `Día ${po.paidDay}` : '—'],
          ['Notas', po.notes || '—'],
        ]}
      />
      <div className="table-scroll mt">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col" className="al-right">Cantidad</th>
              <th scope="col" className="al-right">Costo</th>
              <th scope="col" className="al-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((l) => {
              const p = s.products.find((x) => x.id === l.productId);
              return (
                <tr key={l.productId}>
                  <th scope="row">
                    {p?.sku} · {p?.name}
                  </th>
                  <td className="al-right">{num(l.qty)}</td>
                  <td className="al-right">{cop(l.cost)}</td>
                  <td className="al-right">{cop(l.qty * l.cost)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>Subtotal</th>
              <td className="al-right">{cop(t.subtotal)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={3}>IVA descontable ({pct(s.settings.ivaRate, 0)})</th>
              <td className="al-right">{cop(t.iva)}</td>
            </tr>
            <tr className="total">
              <th scope="row" colSpan={3}>Total</th>
              <td className="al-right">{cop(t.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <h3 className="mt">Asientos contables</h3>
      {entries.length === 0 ? (
        <p className="muted">La contabilidad se mueve al recibir la mercancía y al pagar.</p>
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

function PurchaseForm({ s, initial, onClose }: { s: ErpState; initial: PurchaseLine[]; onClose: () => void }) {
  const first = initial[0] ? s.products.find((p) => p.id === initial[0].productId) : null;
  const [supplierId, setSupplierId] = useState(first?.supplierId ?? s.suppliers.find((x) => x.active)?.id ?? '');
  const [lines, setLines] = useState<PurchaseLine[]>(initial.length ? initial : [{ productId: s.products[0]?.id ?? '', qty: 10, cost: s.products[0]?.cost ?? 0 }]);
  const [notes, setNotes] = useState('');
  const sup = s.suppliers.find((x) => x.id === supplierId);
  const t = purchaseTotals(lines, s.settings.ivaRate);
  const used = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);
  const setLine = (i: number, p: Partial<PurchaseLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <Drawer
      open
      wide
      title="Nueva orden de compra"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => run((x) => createPurchaseOrder(x, { supplierId, lines, notes }), 'Orden de compra creada en borrador') && onClose()}>
            Guardar en borrador
          </button>
        </>
      }
    >
      <SelectField label="Proveedor" value={supplierId} onChange={setSupplierId} options={s.suppliers.filter((x) => x.active).map((x) => ({ value: x.id, label: x.name }))} help={sup ? `Entrega en ${sup.leadTimeDays} días · paga a ${sup.paymentTermDays} días` : undefined} />
      <h3 className="mt">Productos</h3>
      <div className="lines">
        {lines.map((l, i) => {
          const p = s.products.find((x) => x.id === l.productId);
          return (
            <div key={i} className="line-row line-row-3">
              <SelectField
                label={`Producto ${i + 1}`}
                value={l.productId}
                onChange={(v) => setLine(i, { productId: v, cost: s.products.find((x) => x.id === v)?.cost ?? l.cost })}
                options={s.products.filter((x) => x.id === l.productId || !used.has(x.id)).map((x) => ({ value: x.id, label: `${x.sku} · ${x.name}` }))}
              />
              <NumberInput label="Cantidad" value={l.qty} onChange={(v) => setLine(i, { qty: Math.max(0, Math.round(v)) })} min={1} />
              <NumberInput label="Costo unitario" value={l.cost} onChange={(v) => setLine(i, { cost: v })} step={500} />
              <div className="line-meta">
                {p ? <span className="muted small">Disponible {available(p)} · costo promedio {cop(p.cost)}</span> : null}
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
      {lines.length < s.products.length ? (
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => {
            const np = s.products.find((x) => !used.has(x.id));
            if (np) setLines([...lines, { productId: np.id, qty: 10, cost: np.cost }]);
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
          <span>IVA</span>
          <strong>{cop(t.iva)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{cop(t.total)}</strong>
        </div>
      </div>
    </Drawer>
  );
}

const emptySupplier = (): SupplierInput => ({ name: '', nit: '', city: 'Barranquilla', email: '', leadTimeDays: 3, paymentTermDays: 30 });

function Suppliers({ s, openId }: { s: ErpState; openId?: string }) {
  const [editing, setEditing] = useState<SupplierInput | null>(null);
  useEffect(() => {
    const x = openId ? s.suppliers.find((y) => y.id === openId) : null;
    if (x) setEditing({ ...x });
  }, [openId, s.suppliers]);
  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn-primary" onClick={() => setEditing(emptySupplier())}>
          <Icon name="plus" size={16} /> Nuevo proveedor
        </button>
      </div>
      <DataTable<Supplier>
        caption="Proveedores"
        rows={s.suppliers}
        searchText={(x) => `${x.code} ${x.name} ${x.nit} ${x.city}`}
        onRowClick={(x) => setEditing({ ...x })}
        columns={[
          { key: 'c', header: 'Código', render: (x) => x.code, sortValue: (x) => x.code },
          { key: 'n', header: 'Proveedor', render: (x) => <strong>{x.name}</strong>, sortValue: (x) => x.name },
          { key: 'nit', header: 'NIT', render: (x) => x.nit, hideSm: true },
          { key: 'city', header: 'Ciudad', render: (x) => x.city, hideSm: true },
          { key: 'lt', header: 'Entrega', align: 'right', render: (x) => `${x.leadTimeDays} d`, sortValue: (x) => x.leadTimeDays },
          { key: 'pt', header: 'Plazo de pago', align: 'right', render: (x) => `${x.paymentTermDays} d`, sortValue: (x) => x.paymentTermDays },
          { key: 's', header: 'Estado', render: (x) => <Chip status={x.active ? 'pagado' : 'anulado'} label={x.active ? 'Activo' : 'Inactivo'} /> },
        ]}
      />
      {editing ? <SupplierForm value={editing} onClose={() => { setEditing(null); navigate({ module: 'compras', view: 'proveedores' }); }} /> : null}
    </>
  );
}

function SupplierForm({ value, onClose }: { value: SupplierInput; onClose: () => void }) {
  const [f, setF] = useState(value);
  const set = (p: Partial<SupplierInput>) => setF({ ...f, ...p });
  return (
    <Drawer
      open
      title={f.id ? 'Editar proveedor' : 'Nuevo proveedor'}
      onClose={onClose}
      footer={
        <>
          {f.id ? (
            <button type="button" className="btn-secondary" onClick={() => run((x) => saveSupplier(x, { ...f, active: !f.active }), f.active ? 'Proveedor inactivado' : 'Proveedor activado') && onClose()}>
              {f.active ? 'Inactivar' : 'Activar'}
            </button>
          ) : null}
          <button type="button" className="btn-primary" onClick={() => run((x) => saveSupplier(x, f), f.id ? 'Proveedor actualizado' : 'Proveedor creado') && onClose()}>
            Guardar
          </button>
        </>
      }
    >
      <FormGrid>
        <TextField label="Razón social" value={f.name} onChange={(v) => set({ name: v })} required />
        <TextField label="NIT" value={f.nit} onChange={(v) => set({ nit: v.replace(/[^\d-]/g, '') })} required inputMode="numeric" help="9 dígitos, por ejemplo 900123456" />
        <TextField label="Ciudad" value={f.city} onChange={(v) => set({ city: v })} />
        <TextField label="Correo" value={f.email} onChange={(v) => set({ email: v })} type="email" />
        <NumberInput label="Tiempo de entrega" value={f.leadTimeDays} onChange={(v) => set({ leadTimeDays: Math.round(v) })} suffix="días" required />
        <NumberInput label="Plazo de pago" value={f.paymentTermDays} onChange={(v) => set({ paymentTermDays: Math.round(v) })} suffix="días" required />
      </FormGrid>
    </Drawer>
  );
}
