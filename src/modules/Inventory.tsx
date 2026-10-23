import { useEffect, useState } from 'react';
import { cop, num, pct } from '../engine/format';
import { GUIDES } from '../erp/meta';
import { adjustStock, available, saveProduct, type ProductInput } from '../erp/ops';
import { navigate, run, useRoute } from '../erp/store';
import type { ErpState, Product } from '../erp/types';
import { Icon } from '../ui/icons';
import { Chip, DataTable, Drawer, Empty, Facts, FormGrid, ModuleGuide, NumberInput, PageHeader, SelectField, SubNav, TextField } from '../ui/kit';

type View = 'productos' | 'kardex';

export function InventoryModule({ s }: { s: ErpState }) {
  const route = useRoute();
  const view = (route.view === 'kardex' ? 'kardex' : 'productos') as View;
  const [detail, setDetail] = useState<string | null>(route.id ?? null);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (route.id) setDetail(route.id);
  }, [route.id]);
  const value = s.products.reduce((a, p) => a + p.stock * p.cost, 0);
  const current = detail ? s.products.find((p) => p.id === detail) : null;
  const sup = (id: string) => s.suppliers.find((x) => x.id === id)?.name ?? '';

  return (
    <div className="page">
      <PageHeader
        title="Inventario"
        crumbs={['Operaciones', 'Inventario']}
        subtitle={`${s.products.filter((p) => p.active).length} productos activos · valor del inventario ${cop(value)}`}
        actions={
          <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Nuevo producto
          </button>
        }
      />
      <ModuleGuide id="inventario" {...GUIDES.inventario!} />
      <SubNav<View>
        value={view}
        onChange={(v) => navigate({ module: 'inventario', view: v })}
        items={[
          { id: 'productos', label: 'Productos' },
          { id: 'kardex', label: 'Kardex' },
        ]}
      />
      {view === 'productos' ? (
        <DataTable<Product>
          caption="Productos"
          rows={s.products}
          searchText={(p) => `${p.sku} ${p.name} ${p.category}`}
          onRowClick={(p) => setDetail(p.id)}
          columns={[
            { key: 'sku', header: 'SKU', render: (p) => <strong>{p.sku}</strong>, sortValue: (p) => p.sku },
            { key: 'name', header: 'Producto', render: (p) => p.name, sortValue: (p) => p.name },
            { key: 'stock', header: 'Stock', align: 'right', render: (p) => num(p.stock), sortValue: (p) => p.stock },
            { key: 'res', header: 'Reservado', align: 'right', render: (p) => num(p.reserved), hideSm: true },
            {
              key: 'disp',
              header: 'Disponible',
              align: 'right',
              sortValue: (p) => available(p),
              render: (p) => {
                const a = available(p);
                return <span className={a < 0 ? 'bad-text' : p.reorderPoint > 0 && a <= p.reorderPoint ? 'warn-text' : ''}>{num(a)}</span>;
              },
            },
            { key: 'rp', header: 'Pto. reorden', align: 'right', render: (p) => (p.reorderPoint ? num(p.reorderPoint) : '—'), hideSm: true },
            { key: 'cost', header: 'Costo prom.', align: 'right', render: (p) => cop(p.cost), sortValue: (p) => p.cost, hideSm: true },
            { key: 'price', header: 'Precio', align: 'right', render: (p) => cop(p.price), sortValue: (p) => p.price },
            { key: 'mg', header: 'Margen', align: 'right', render: (p) => pct(1 - p.cost / p.price, 0), sortValue: (p) => 1 - p.cost / p.price, hideSm: true },
            {
              key: 'st',
              header: 'Estado',
              render: (p) =>
                !p.active ? <Chip status="anulado" label="Inactivo" /> : available(p) < 0 ? <Chip status="abierto" label="Faltante" /> : p.reorderPoint > 0 && available(p) <= p.reorderPoint ? <Chip status="despachado" label="Reordenar" /> : <Chip status="pagado" label="OK" />,
            },
          ]}
        />
      ) : (
        <Kardex s={s} productId={route.id ?? s.products[0]?.id} />
      )}
      {creating ? <ProductForm s={s} onClose={() => setCreating(false)} /> : null}
      {current && view === 'productos' ? (
        <ProductDetail
          s={s}
          p={current}
          supplier={sup(current.supplierId)}
          onClose={() => {
            setDetail(null);
            navigate({ module: 'inventario' });
          }}
        />
      ) : null}
    </div>
  );
}

function ProductDetail({ s, p, supplier, onClose }: { s: ErpState; p: Product; supplier: string; onClose: () => void }) {
  const [tab, setTab] = useState<'datos' | 'editar' | 'ajuste'>('datos');
  const [counted, setCounted] = useState(p.stock);
  const [reason, setReason] = useState('');
  return (
    <Drawer open wide title={`${p.sku} · ${p.name}`} subtitle={`${p.category} · proveedor ${supplier}`} onClose={onClose}>
      <SubNav<'datos' | 'editar' | 'ajuste'>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'datos', label: 'Resumen' },
          { id: 'editar', label: 'Editar ficha' },
          { id: 'ajuste', label: 'Ajuste por conteo' },
        ]}
      />
      {tab === 'datos' ? (
        <>
          <Facts
            items={[
              ['Stock físico', `${num(p.stock)} ${p.unit}`],
              ['Reservado', num(p.reserved)],
              ['Disponible', num(available(p))],
              ['Costo promedio', cop(p.cost)],
              ['Precio de venta', cop(p.price)],
              ['Margen bruto', pct(1 - p.cost / p.price)],
              ['Punto de reorden', p.reorderPoint ? num(p.reorderPoint) : 'Sin definir'],
              ['Cantidad de reposición', p.reorderQty ? num(p.reorderQty) : 'Sin definir'],
              ['Valor en inventario', cop(p.stock * p.cost)],
              ['Tienda virtual', p.webPublished ? 'Publicado' : 'No publicado'],
            ]}
          />
          <button type="button" className="btn-secondary mt" onClick={() => navigate({ module: 'inventario', view: 'kardex', id: p.id })}>
            Ver kardex del producto
          </button>
        </>
      ) : null}
      {tab === 'editar' ? <ProductFormBody s={s} initial={p} onDone={() => setTab('datos')} /> : null}
      {tab === 'ajuste' ? (
        <div>
          <p className="muted">
            Registra el resultado del conteo físico. Si hay diferencia, el ERP crea el movimiento en el kardex y el asiento: un faltante va al gasto 5195 y un sobrante a recuperaciones 4250.
          </p>
          <FormGrid>
            <NumberInput label="Unidades contadas" value={counted} onChange={(v) => setCounted(Math.round(v))} help={`El sistema registra ${p.stock}. Diferencia: ${counted - p.stock}.`} />
            <TextField label="Motivo del ajuste" value={reason} onChange={setReason} required placeholder="Conteo físico mensual" />
          </FormGrid>
          <button type="button" className="btn-primary" onClick={() => run((x) => adjustStock(x, p.id, counted, reason), 'Ajuste registrado') && setTab('datos')}>
            Registrar ajuste
          </button>
        </div>
      ) : null}
    </Drawer>
  );
}

function ProductFormBody({ s, initial, onDone }: { s: ErpState; initial?: Product; onDone: () => void }) {
  const [f, setF] = useState<ProductInput>(
    initial
      ? { id: initial.id, sku: initial.sku, name: initial.name, category: initial.category, unit: initial.unit, price: initial.price, reorderPoint: initial.reorderPoint, reorderQty: initial.reorderQty, supplierId: initial.supplierId, active: initial.active }
      : { sku: '', name: '', category: '', unit: 'und', price: 0, cost: 0, reorderPoint: 0, reorderQty: 0, supplierId: s.suppliers[0]?.id ?? '' },
  );
  const set = (p: Partial<ProductInput>) => setF({ ...f, ...p });
  const sup = s.suppliers.find((x) => x.id === f.supplierId);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (run((x) => saveProduct(x, f), initial ? 'Producto actualizado' : 'Producto creado')) onDone();
      }}
    >
      <FormGrid>
        <TextField label="SKU" value={f.sku} onChange={(v) => set({ sku: v.toUpperCase() })} required help="Código único: letras, números y guiones." />
        <TextField label="Nombre" value={f.name} onChange={(v) => set({ name: v })} required />
        <TextField label="Categoría" value={f.category} onChange={(v) => set({ category: v })} />
        <TextField label="Unidad de medida" value={f.unit} onChange={(v) => set({ unit: v })} />
        {initial ? null : <NumberInput label="Costo unitario inicial" value={f.cost ?? 0} onChange={(v) => set({ cost: v })} step={1000} suffix="COP" required />}
        <NumberInput label="Precio de venta (sin IVA)" value={f.price} onChange={(v) => set({ price: v })} step={1000} suffix="COP" required />
        <SelectField label="Proveedor principal" value={f.supplierId} onChange={(v) => set({ supplierId: v })} options={s.suppliers.filter((x) => x.active).map((x) => ({ value: x.id, label: x.name }))} help={sup ? `Tiempo de entrega: ${sup.leadTimeDays} días` : undefined} />
        <NumberInput label="Punto de reorden" value={f.reorderPoint} onChange={(v) => set({ reorderPoint: Math.round(v) })} help="Demanda diaria × días de entrega + stock de seguridad." />
        <NumberInput label="Cantidad de reposición" value={f.reorderQty} onChange={(v) => set({ reorderQty: Math.round(v) })} />
      </FormGrid>
      <button type="submit" className="btn-primary">
        Guardar producto
      </button>
    </form>
  );
}

function ProductForm({ s, onClose }: { s: ErpState; onClose: () => void }) {
  return (
    <Drawer open title="Nuevo producto" onClose={onClose}>
      <ProductFormBody s={s} onDone={onClose} />
    </Drawer>
  );
}

function Kardex({ s, productId }: { s: ErpState; productId?: string }) {
  const [pid, setPid] = useState(productId ?? '');
  useEffect(() => {
    if (productId) setPid(productId);
  }, [productId]);
  const p = s.products.find((x) => x.id === pid);
  const moves = s.moves.filter((m) => m.productId === pid);
  return (
    <section className="panel">
      <div className="toolbar">
        <SelectField label="Producto" value={pid} onChange={(v) => navigate({ module: 'inventario', view: 'kardex', id: v })} options={s.products.map((x) => ({ value: x.id, label: `${x.sku} · ${x.name}` }))} />
        {p ? (
          <span className="muted small">
            Saldo {num(p.stock)} · costo promedio {cop(p.cost)} · valor {cop(p.stock * p.cost)}
          </span>
        ) : null}
      </div>
      {moves.length === 0 ? (
        <Empty title="Sin movimientos" />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <caption className="sr-only">Kardex de {p?.name}</caption>
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Tipo</th>
                <th scope="col">Documento</th>
                <th scope="col" className="al-right">Entrada</th>
                <th scope="col" className="al-right">Salida</th>
                <th scope="col" className="al-right">Saldo</th>
                <th scope="col" className="al-right">Costo unit.</th>
                <th scope="col" className="al-right">Valor mov.</th>
              </tr>
            </thead>
            <tbody>
              {[...moves].reverse().map((m) => (
                <tr key={m.id}>
                  <th scope="row">{m.day}</th>
                  <td>{m.type === 'entrada' ? 'Entrada' : m.type === 'salida' ? 'Salida' : 'Ajuste'}</td>
                  <td>
                    {m.ref}
                    <span className="muted small"> · {m.note}</span>
                  </td>
                  <td className="al-right">{m.qty > 0 ? num(m.qty) : ''}</td>
                  <td className="al-right">{m.qty < 0 ? num(-m.qty) : ''}</td>
                  <td className="al-right">{num(m.balance)}</td>
                  <td className="al-right">{cop(m.unitCost)}</td>
                  <td className="al-right">{cop(Math.abs(m.qty) * m.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
