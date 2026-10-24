import { useState } from 'react';
import { cop, dec, num, pct } from '../engine/format';
import { GUIDES } from '../erp/meta';
import { GATEWAY_FEE, available, saveCampaign, saveProduct, toggleCampaign, toggleWebPublish } from '../erp/ops';
import { getScenario } from '../engine/scenarios';
import { navigate, run, useRoute } from '../erp/store';
import type { Campaign, ErpState, Product } from '../erp/types';
import { Icon } from '../ui/icons';
import { Chip, DataTable, Drawer, Empty, FormGrid, Kpi, ModuleGuide, NumberInput, PageHeader, SelectField, SubNav, TextField } from '../ui/kit';

type View = 'catalogo' | 'campanas';

/** ROAS de equilibrio aproximado de un producto: 1 ÷ (margen después de la comisión de pasarela). */
const breakEven = (p: Product) => {
  const cm = 1 - p.cost / p.price - GATEWAY_FEE;
  return cm > 0 ? 1 / cm : null;
};

export function EcommerceModule({ s }: { s: ErpState }) {
  const route = useRoute();
  const view = (route.view === 'campanas' ? 'campanas' : 'catalogo') as View;
  const web = s.salesOrders.filter((o) => o.channel === 'web');
  const pending = web.filter((o) => o.status === 'confirmado' || o.status === 'despachado').length;
  return (
    <div className="page">
      <PageHeader title="Comercio electrónico" crumbs={['Comercial', 'Comercio electrónico']} subtitle="Catálogo de la tienda virtual, pauta digital y pedidos en línea." />
      <ModuleGuide id="ecommerce" {...GUIDES.ecommerce!} />
      <div className="kpi-grid">
        <Kpi label="Productos publicados" value={`${s.products.filter((p) => p.webPublished).length} / ${s.products.filter((p) => p.active).length}`} />
        <Kpi label="Pedidos web recibidos" value={num(web.length)} />
        <Kpi label="Pedidos web por atender" value={num(pending)} tone={pending > 5 ? 'warn' : undefined} onClick={() => navigate({ module: 'ventas', view: 'web' })} sub="Ir a Ventas" />
        <Kpi label="Inversión en pauta" value={cop(s.campaigns.reduce((a, c) => a + c.spend, 0))} />
      </div>
      <SubNav<View>
        value={view}
        onChange={(v) => navigate({ module: 'ecommerce', view: v })}
        items={[
          { id: 'catalogo', label: 'Catálogo de la tienda' },
          { id: 'campanas', label: 'Campañas de pauta', count: s.campaigns.filter((c) => c.active).length },
        ]}
      />
      {view === 'catalogo' ? <Catalog s={s} /> : <Campaigns s={s} />}
    </div>
  );
}

function Catalog({ s }: { s: ErpState }) {
  const [priceEdit, setPriceEdit] = useState<{ p: Product; price: number } | null>(null);
  return (
    <>
      <div className="catalog">
        {s.products
          .filter((p) => p.active)
          .map((p) => {
            const be = breakEven(p);
            const sold = s.salesOrders.filter((o) => o.channel === 'web' && o.status !== 'anulado').reduce((a, o) => a + (o.lines.find((l) => l.productId === p.id)?.qty ?? 0), 0);
            return (
              <article key={p.id} className={`product-card${p.webPublished ? ' is-live' : ''}`}>
                <div className="product-thumb" aria-hidden="true">
                  <span>{p.sku.slice(0, 3)}</span>
                </div>
                <div className="product-info">
                  <strong>{p.name}</strong>
                  <span className="muted small">
                    {p.sku} · {p.category}
                  </span>
                  <span className="product-price">{cop(p.price)}</span>
                  <span className="small">
                    Margen {pct(1 - p.cost / p.price, 0)} · disponible {num(available(p))} · vendidos web {num(sold)}
                  </span>
                  <span className="small muted">ROAS de equilibrio {be ? dec(be) : 'sin margen'}</span>
                </div>
                <div className="product-actions">
                  <Chip status={p.webPublished ? 'pagado' : 'anulado'} label={p.webPublished ? 'Publicado' : 'No publicado'} />
                  <button type="button" className={p.webPublished ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'} onClick={() => run((x) => toggleWebPublish(x, p.id), p.webPublished ? `${p.sku} retirado de la tienda` : `${p.sku} publicado`)}>
                    {p.webPublished ? 'Retirar' : 'Publicar'}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setPriceEdit({ p, price: p.price })}>
                    Cambiar precio
                  </button>
                </div>
              </article>
            );
          })}
      </div>
      {priceEdit ? (
        <Drawer
          open
          title={`Precio de ${priceEdit.p.name}`}
          onClose={() => setPriceEdit(null)}
          footer={
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                run((x) => saveProduct(x, { ...priceEdit.p, price: priceEdit.price }), 'Precio actualizado') && setPriceEdit(null)
              }
            >
              Guardar precio
            </button>
          }
        >
          <NumberInput label="Precio de venta (sin IVA)" value={priceEdit.price} onChange={(v) => setPriceEdit({ ...priceEdit, price: v })} step={1000} suffix="COP" />
          <p className="muted">
            Costo promedio {cop(priceEdit.p.cost)} · precio de referencia del mercado {cop(priceEdit.p.refPrice)} · margen con este precio{' '}
            <strong>{pct(1 - priceEdit.p.cost / Math.max(1, priceEdit.price))}</strong>.
          </p>
          <PriceImpact s={s} p={priceEdit.p} price={priceEdit.price} />
        </Drawer>
      ) : null}
    </>
  );
}

function Campaigns({ s }: { s: ErpState }) {
  const [editing, setEditing] = useState<{ id?: string; name: string; channel: Campaign['channel']; dailyBudget: number } | null>(null);
  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn-primary" onClick={() => setEditing({ name: '', channel: 'meta', dailyBudget: 100000 })}>
          <Icon name="plus" size={16} /> Nueva campaña
        </button>
        <span className="muted small">La pauta se cobra al cerrar cada día. El ROAS se mide sobre las ventas facturadas de los pedidos atribuidos a cada campaña.</span>
      </div>
      <DataTable<Campaign>
        caption="Campañas"
        rows={s.campaigns}
        onRowClick={(c) => setEditing({ ...c })}
        empty={<Empty title="Sin campañas" text="Crea una campaña para llevar tráfico pagado a la tienda virtual." />}
        columns={[
          { key: 'n', header: 'Campaña', render: (c) => <strong>{c.name}</strong> },
          { key: 'ch', header: 'Canal', render: (c) => (c.channel === 'meta' ? 'Meta Ads' : 'TikTok Ads') },
          { key: 'b', header: 'Diario', align: 'right', render: (c) => cop(c.dailyBudget), hideSm: true },
          { key: 'd', header: 'Días', align: 'right', render: (c) => c.daysRun },
          { key: 'sp', header: 'Inversión', align: 'right', render: (c) => cop(c.spend) },
          { key: 'cl', header: 'Clics', align: 'right', render: (c) => num(c.clicks), hideSm: true },
          { key: 'o', header: 'Pedidos', align: 'right', render: (c) => num(c.orders), hideSm: true },
          { key: 'r', header: 'Ventas', align: 'right', render: (c) => cop(c.revenue), hideSm: true },
          {
            key: 'roas',
            header: 'ROAS',
            align: 'right',
            render: (c) => {
              const r = c.spend ? c.revenue / c.spend : 0;
              return <strong className={c.spend && r < 2 ? 'bad-text' : r >= 2 ? 'good-text' : ''}>{c.spend ? dec(r) : '—'}</strong>;
            },
          },
          { key: 's', header: 'Estado', render: (c) => <Chip status={c.active ? 'activa' : 'pausada'} label={c.active ? 'Activa' : 'Pausada'} /> },
        ]}
        rowActions={(c) => (
          <button type="button" className="btn-secondary btn-sm" onClick={() => run((x) => toggleCampaign(x, c.id), c.active ? 'Campaña pausada' : 'Campaña reactivada')}>
            {c.active ? 'Pausar' : 'Reactivar'}
          </button>
        )}
      />
      {editing ? (
        <Drawer
          open
          title={editing.id ? 'Editar campaña' : 'Nueva campaña'}
          onClose={() => setEditing(null)}
          footer={
            <button type="button" className="btn-primary" onClick={() => run((x) => saveCampaign(x, editing), editing.id ? 'Campaña actualizada' : 'Campaña creada y activa') && setEditing(null)}>
              Guardar
            </button>
          }
        >
          <FormGrid>
            <TextField label="Nombre de la campaña" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} required placeholder="Temporada de regalos" />
            <SelectField
              label="Canal"
              value={editing.channel}
              onChange={(v) => setEditing({ ...editing, channel: v })}
              options={[
                { value: 'meta', label: 'Meta Ads (Facebook e Instagram)' },
                { value: 'tiktok', label: 'TikTok Ads' },
              ]}
              help={editing.channel === 'meta' ? 'Clic más costoso, mejor conversión.' : 'Clic más barato, menor conversión.'}
            />
            <NumberInput label="Presupuesto diario" value={editing.dailyBudget} onChange={(v) => setEditing({ ...editing, dailyBudget: v })} step={10000} suffix="COP" help="Entre $ 20.000 y $ 2.000.000. Los primeros pesos rinden más que los últimos." />
          </FormGrid>
        </Drawer>
      ) : null}
    </>
  );
}

/** Efecto esperado de un cambio de precio con elasticidad constante: demanda ∝ (precio de referencia ÷ precio)^e. */
function PriceImpact({ s, p, price }: { s: ErpState; p: Product; price: number }) {
  const e = getScenario(s.scenarioId).elasticity;
  if (!(price > 0)) return null;
  const demand = Math.pow(p.price / price, e);
  const unitNow = p.price * (1 - GATEWAY_FEE) - p.cost;
  const unitNew = price * (1 - GATEWAY_FEE) - p.cost;
  const profit = unitNow > 0 ? (unitNew * demand) / unitNow : null;
  const best = Math.round(((p.cost / (1 - GATEWAY_FEE)) * e) / (e - 1) / 1000) * 1000;
  const fmt = (x: number) => `${x >= 0 ? '+' : ''}${pct(x, 0)}`;
  return (
    <div className="impact">
      <h3>Efecto esperado del cambio</h3>
      <p className="muted small">Elasticidad precio del mercado: {dec(e)}. Por cada 1 % que sube el precio, la demanda baja cerca de {dec(e)} %.</p>
      <dl className="facts-grid">
        <div>
          <dt>Pedidos web esperados</dt>
          <dd className={demand < 1 ? 'bad-text' : 'good-text'}>{price === p.price ? 'Sin cambio' : fmt(demand - 1)}</dd>
        </div>
        <div>
          <dt>Margen por unidad (después de pasarela)</dt>
          <dd className={unitNew <= 0 ? 'bad-text' : ''}>{cop(unitNew)}</dd>
        </div>
        <div>
          <dt>Utilidad bruta esperada del producto</dt>
          <dd className={profit !== null && profit < 1 ? 'bad-text' : 'good-text'}>{price === p.price ? 'Sin cambio' : profit === null ? '—' : fmt(profit - 1)}</dd>
        </div>
        <div>
          <dt>Precio que maximiza la utilidad bruta</dt>
          <dd>{e > 1 ? cop(best) : '—'}</dd>
        </div>
      </dl>
      <p className="small muted">
        Estimación del modelo: costo ÷ (1 − comisión) × e ÷ (e − 1). En la práctica también cuentan el precio de la competencia, la satisfacción del cliente y la pauta.
      </p>
    </div>
  );
}
