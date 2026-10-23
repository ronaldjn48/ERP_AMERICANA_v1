import { useState } from 'react';
import { cop } from '../engine/format';
import { ACCOUNTS, accountName, balanceSheet, incomeStatement, trialBalance } from '../erp/accounts';
import { GUIDES } from '../erp/meta';
import { manualEntry, orderTotals, payPurchaseOrder, purchaseTotals, registerPayment, sendReminder } from '../erp/ops';
import { navigate, run, useRoute } from '../erp/store';
import type { ErpState, JournalLine } from '../erp/types';
import { Icon } from '../ui/icons';
import { Chip, Drawer, Empty, Kpi, ModuleGuide, NumberInput, PageHeader, SelectField, SubNav, TextField } from '../ui/kit';

type View = 'diario' | 'balance' | 'estados' | 'cartera' | 'cuentas';

export function AccountingModule({ s }: { s: ErpState }) {
  const route = useRoute();
  const views: View[] = ['diario', 'balance', 'estados', 'cartera', 'cuentas'];
  const view = (views.includes(route.view as View) ? route.view : 'diario') as View;
  return (
    <div className="page">
      <PageHeader title="Contabilidad" crumbs={['Finanzas', 'Contabilidad']} subtitle="Partida doble con el plan único de cuentas (PUC) simplificado." />
      <ModuleGuide id="contabilidad" {...GUIDES.contabilidad!} />
      <SubNav<View>
        value={view}
        onChange={(v) => navigate({ module: 'contabilidad', view: v })}
        items={[
          { id: 'diario', label: 'Libro diario' },
          { id: 'balance', label: 'Balance de prueba' },
          { id: 'estados', label: 'Estados financieros' },
          { id: 'cartera', label: 'Cartera y pagos', count: s.salesOrders.filter((o) => o.status === 'facturado' && (o.dueDay ?? Infinity) < s.day).length },
          { id: 'cuentas', label: 'Plan de cuentas' },
        ]}
      />
      {view === 'diario' ? <Journal s={s} /> : null}
      {view === 'balance' ? <Trial s={s} /> : null}
      {view === 'estados' ? <Statements s={s} /> : null}
      {view === 'cartera' ? <Receivables s={s} /> : null}
      {view === 'cuentas' ? <Chart /> : null}
    </div>
  );
}

function Journal({ s }: { s: ErpState }) {
  const [q, setQ] = useState('');
  const [manual, setManual] = useState(false);
  const [limit, setLimit] = useState(25);
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rows = [...s.journal].reverse().filter((e) => !q || norm(`${e.number} ${e.description} ${e.ref} ${e.lines.map((l) => l.account).join(' ')}`).includes(norm(q)));
  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn-primary" onClick={() => setManual(true)}>
          <Icon name="plus" size={16} /> Asiento manual
        </button>
        <label className="dt-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Buscar asientos</span>
          <input type="search" placeholder="Buscar por número, descripción o cuenta…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="muted small">{rows.length} asientos</span>
      </div>
      {rows.length === 0 ? <Empty title="Sin asientos" /> : null}
      <div className="journal">
        {rows.slice(0, limit).map((e) => (
          <article key={e.id} className="entry">
            <header>
              <strong>{e.number}</strong>
              <span>Día {e.day}</span>
              <span className="grow">{e.description}</span>
              {e.manual ? <Chip status="confirmado" label="Manual" /> : <span className="muted small">{e.ref}</span>}
            </header>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Cuenta</th>
                    <th scope="col" className="al-right">Débito</th>
                    <th scope="col" className="al-right">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {e.lines.map((l, i) => (
                    <tr key={i}>
                      <th scope="row" className={l.credit ? 'indent' : ''}>
                        {l.account} {accountName(l.account)}
                      </th>
                      <td className="al-right">{l.debit ? cop(l.debit) : ''}</td>
                      <td className="al-right">{l.credit ? cop(l.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
      {rows.length > limit ? (
        <button type="button" className="btn-secondary" onClick={() => setLimit(limit + 25)}>
          Mostrar más asientos
        </button>
      ) : null}
      {manual ? <ManualEntry onClose={() => setManual(false)} /> : null}
    </>
  );
}

function ManualEntry({ onClose }: { onClose: () => void }) {
  const [desc, setDesc] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { account: '5135', debit: 0, credit: 0 },
    { account: '1110', debit: 0, credit: 0 },
  ]);
  const d = lines.reduce((a, l) => a + (l.debit || 0), 0);
  const c = lines.reduce((a, l) => a + (l.credit || 0), 0);
  const set = (i: number, p: Partial<JournalLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <Drawer
      open
      wide
      title="Asiento manual"
      subtitle="Ejemplo: pago de un servicio → débito 5135 Servicios, crédito 1110 Bancos."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={() => run((x) => manualEntry(x, { description: desc, lines }), 'Asiento registrado') && onClose()}>
            Registrar asiento
          </button>
        </>
      }
    >
      <TextField label="Descripción" value={desc} onChange={setDesc} required placeholder="Pago de mantenimiento de la página web" />
      <div className="lines">
        {lines.map((l, i) => (
          <div key={i} className="line-row line-row-3">
            <SelectField label={`Cuenta ${i + 1}`} value={l.account} onChange={(v) => set(i, { account: v })} options={ACCOUNTS.map((a) => ({ value: a.code, label: `${a.code} ${a.name}` }))} />
            <NumberInput label="Débito" value={l.debit} onChange={(v) => set(i, { debit: v, credit: v > 0 ? 0 : l.credit })} step={10000} />
            <NumberInput label="Crédito" value={l.credit} onChange={(v) => set(i, { credit: v, debit: v > 0 ? 0 : l.debit })} step={10000} />
            <div className="line-meta">
              {lines.length > 2 ? (
                <button type="button" className="btn-ghost btn-sm" onClick={() => setLines(lines.filter((_, j) => j !== i))}>
                  Quitar
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary btn-sm" onClick={() => setLines([...lines, { account: '1110', debit: 0, credit: 0 }])}>
        <Icon name="plus" size={14} /> Agregar línea
      </button>
      <div className="totals-box">
        <div>
          <span>Débitos</span>
          <strong>{cop(d)}</strong>
        </div>
        <div>
          <span>Créditos</span>
          <strong>{cop(c)}</strong>
        </div>
        <div className={Math.abs(d - c) < 1 && d > 0 ? 'good' : 'warn'}>
          <span>Diferencia</span>
          <strong>{cop(d - c)}</strong>
        </div>
      </div>
    </Drawer>
  );
}

function Trial({ s }: { s: ErpState }) {
  const tb = trialBalance(s.journal);
  const ok = Math.abs(tb.totals.debit - tb.totals.credit) < 1;
  return (
    <section className="panel">
      <p className={`notice ${ok ? 'notice-ok' : 'notice-bad'}`}>
        {ok ? 'Los libros cuadran: la suma de débitos es igual a la suma de créditos.' : 'Atención: los débitos y los créditos no cuadran.'}
      </p>
      <div className="table-scroll">
        <table className="table">
          <caption className="sr-only">Balance de prueba</caption>
          <thead>
            <tr>
              <th scope="col">Cuenta</th>
              <th scope="col" className="al-right">Débitos</th>
              <th scope="col" className="al-right">Créditos</th>
              <th scope="col" className="al-right">Saldo débito</th>
              <th scope="col" className="al-right">Saldo crédito</th>
            </tr>
          </thead>
          <tbody>
            {tb.rows.map((r) => (
              <tr key={r.code}>
                <th scope="row">
                  {r.code} {r.name}
                </th>
                <td className="al-right">{cop(r.debit)}</td>
                <td className="al-right">{cop(r.credit)}</td>
                <td className="al-right">{r.balanceD ? cop(r.balanceD) : ''}</td>
                <td className="al-right">{r.balanceC ? cop(r.balanceC) : ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total">
              <th scope="row">Totales</th>
              <td className="al-right">{cop(tb.totals.debit)}</td>
              <td className="al-right">{cop(tb.totals.credit)}</td>
              <td className="al-right">{cop(tb.rows.reduce((a, r) => a + r.balanceD, 0))}</td>
              <td className="al-right">{cop(tb.rows.reduce((a, r) => a + r.balanceC, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Statements({ s }: { s: ErpState }) {
  const [period, setPeriod] = useState<'mes' | 'acumulado'>('acumulado');
  const month0 = Math.floor((s.day - 1) / 30) * 30 + 1;
  const is = period === 'mes' ? incomeStatement(s.journal, month0, s.day) : incomeStatement(s.journal);
  const bs = balanceSheet(s.journal);
  return (
    <div className="grid-2">
      <section className="panel">
        <header className="panel-head">
          <h2>Estado de resultados</h2>
          <SelectField<'mes' | 'acumulado'> label="Periodo" value={period} onChange={setPeriod} options={[{ value: 'acumulado', label: 'Acumulado' }, { value: 'mes', label: `Mes en curso (desde el día ${month0})` }]} />
        </header>
        <table className="table">
          <tbody>
            <tr>
              <th scope="row">Ingresos operacionales (4135)</th>
              <td className="al-right">{cop(is.revenue)}</td>
            </tr>
            <tr>
              <th scope="row">(−) Costo de ventas (6135)</th>
              <td className="al-right">{cop(is.cogs)}</td>
            </tr>
            <tr className="subtotal">
              <th scope="row">Utilidad bruta</th>
              <td className="al-right">{cop(is.grossProfit)}</td>
            </tr>
            {is.otherIncome ? (
              <tr>
                <th scope="row">(+) Otros ingresos (4250)</th>
                <td className="al-right">{cop(is.otherIncome)}</td>
              </tr>
            ) : null}
            {is.expenses.map((x) => (
              <tr key={x.code}>
                <th scope="row">
                  (−) {x.name} ({x.code})
                </th>
                <td className="al-right">{cop(x.value)}</td>
              </tr>
            ))}
            <tr className={`total ${is.operatingProfit < 0 ? 'bad-text' : 'good-text'}`}>
              <th scope="row">Utilidad operacional</th>
              <td className="al-right">{cop(is.operatingProfit)}</td>
            </tr>
          </tbody>
        </table>
        <p className="muted small">El impuesto de renta se liquida al cierre del año fiscal; aquí se muestra la utilidad antes de impuestos.</p>
      </section>
      <section className="panel">
        <header className="panel-head">
          <h2>Balance general</h2>
        </header>
        <table className="table">
          <tbody>
            <tr className="subtotal">
              <th scope="row" colSpan={2}>Activos</th>
            </tr>
            {bs.assets.map((x) => (
              <tr key={x.code}>
                <th scope="row" className="indent">
                  {x.code} {x.name}
                </th>
                <td className="al-right">{cop(x.value)}</td>
              </tr>
            ))}
            <tr className="subtotal">
              <th scope="row">Total activos</th>
              <td className="al-right">{cop(bs.totalAssets)}</td>
            </tr>
            <tr className="subtotal">
              <th scope="row" colSpan={2}>Pasivos</th>
            </tr>
            {bs.liabilities.map((x) => (
              <tr key={x.code}>
                <th scope="row" className="indent">
                  {x.code} {x.name}
                </th>
                <td className="al-right">{cop(x.value)}</td>
              </tr>
            ))}
            <tr className="subtotal">
              <th scope="row">Total pasivos</th>
              <td className="al-right">{cop(bs.totalLiabilities)}</td>
            </tr>
            <tr className="subtotal">
              <th scope="row" colSpan={2}>Patrimonio</th>
            </tr>
            {bs.equity.map((x) => (
              <tr key={x.code}>
                <th scope="row" className="indent">
                  {x.code} {x.name}
                </th>
                <td className="al-right">{cop(x.value)}</td>
              </tr>
            ))}
            <tr className="total">
              <th scope="row">Pasivo + patrimonio</th>
              <td className="al-right">{cop(bs.totalLiabilities + bs.totalEquity)}</td>
            </tr>
          </tbody>
        </table>
        <p className={`notice ${Math.abs(bs.totalAssets - bs.totalLiabilities - bs.totalEquity) < 2 ? 'notice-ok' : 'notice-bad'}`}>
          Ecuación contable: activos = pasivos + patrimonio.
        </p>
      </section>
    </div>
  );
}

function Receivables({ s }: { s: ErpState }) {
  const open = s.salesOrders.filter((o) => o.status === 'facturado');
  const age = (due: number | null) => (due === null ? 0 : s.day - due);
  const buckets = [
    { label: 'Vigente', f: (d: number) => d <= 0 },
    { label: 'Vencida 1 a 15 días', f: (d: number) => d > 0 && d <= 15 },
    { label: 'Vencida más de 15 días', f: (d: number) => d > 15 },
  ];
  const payables = s.purchaseOrders.filter((p) => p.status === 'recibida');
  return (
    <>
      <div className="kpi-grid">
        {buckets.map((b) => (
          <Kpi
            key={b.label}
            label={b.label}
            value={cop(open.filter((o) => b.f(age(o.dueDay))).reduce((a, o) => a + orderTotals(o.lines, s.settings.ivaRate).total, 0))}
            tone={b.label.startsWith('Vencida') && open.some((o) => b.f(age(o.dueDay))) ? 'bad' : undefined}
          />
        ))}
        <Kpi label="Cuentas por pagar" value={cop(payables.reduce((a, p) => a + purchaseTotals(p.lines, s.settings.ivaRate).total, 0))} />
      </div>
      <section className="panel">
        <header className="panel-head">
          <h2>Cartera de clientes</h2>
        </header>
        {open.length === 0 ? (
          <Empty title="No hay facturas pendientes" text="Las facturas a crédito aparecen aquí hasta que el cliente pague." />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Factura</th>
                  <th scope="col">Cliente</th>
                  <th scope="col" className="al-right">Vence</th>
                  <th scope="col" className="al-right">Días vencida</th>
                  <th scope="col" className="al-right">Valor</th>
                  <th scope="col" className="al-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {[...open].sort((a, b) => (a.dueDay ?? 0) - (b.dueDay ?? 0)).map((o) => {
                  const d = age(o.dueDay);
                  return (
                    <tr key={o.id}>
                      <th scope="row">
                        <button type="button" className="link" onClick={() => navigate({ module: 'ventas', id: o.id })}>
                          {o.invoiceNumber}
                        </button>
                      </th>
                      <td>{s.customers.find((c) => c.id === o.customerId)?.name}</td>
                      <td className="al-right">Día {o.dueDay}</td>
                      <td className="al-right">{d > 0 ? <Chip status="vencida" label={`${d} d`} /> : <Chip status="vigente" label="Al día" />}</td>
                      <td className="al-right">{cop(orderTotals(o.lines, s.settings.ivaRate).total)}</td>
                      <td className="al-right row-actions">
                        <button type="button" className="btn-secondary btn-sm" onClick={() => run((x) => sendReminder(x, o.id), 'Recordatorio enviado')}>
                          Recordar ({o.reminders})
                        </button>
                        <button type="button" className="btn-primary btn-sm" onClick={() => run((x) => registerPayment(x, o.id), 'Pago registrado')}>
                          Registrar pago
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel">
        <header className="panel-head">
          <h2>Cuentas por pagar a proveedores</h2>
        </header>
        {payables.length === 0 ? (
          <Empty title="Sin cuentas por pagar" />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Orden</th>
                  <th scope="col">Proveedor</th>
                  <th scope="col" className="al-right">Vence</th>
                  <th scope="col" className="al-right">Valor</th>
                  <th scope="col" className="al-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {payables.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.number}</th>
                    <td>{s.suppliers.find((x) => x.id === p.supplierId)?.name}</td>
                    <td className="al-right">{p.dueDay !== null && p.dueDay < s.day ? <Chip status="vencida" label={`Día ${p.dueDay}`} /> : `Día ${p.dueDay}`}</td>
                    <td className="al-right">{cop(purchaseTotals(p.lines, s.settings.ivaRate).total)}</td>
                    <td className="al-right">
                      <button type="button" className="btn-primary btn-sm" onClick={() => run((x) => payPurchaseOrder(x, p.id), 'Pago registrado')}>
                        Pagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Chart() {
  const cls = { activo: 'Activo', pasivo: 'Pasivo', patrimonio: 'Patrimonio', ingreso: 'Ingreso', gasto: 'Gasto', costo: 'Costo' };
  return (
    <section className="panel">
      <div className="table-scroll">
        <table className="table">
          <caption className="sr-only">Plan de cuentas</caption>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Cuenta</th>
              <th scope="col">Clase</th>
              <th scope="col">Naturaleza</th>
            </tr>
          </thead>
          <tbody>
            {ACCOUNTS.map((a) => (
              <tr key={a.code}>
                <th scope="row">{a.code}</th>
                <td>{a.name}</td>
                <td>{cls[a.cls]}</td>
                <td>{a.nature === 'D' ? 'Débito' : 'Crédito'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
