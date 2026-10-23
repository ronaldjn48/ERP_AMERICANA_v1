import { COST_LABELS, analyzePeriod, periodSpeech } from '../engine/feedback';
import { MODULE_INFO } from '../engine/config';
import { cop, dec, num, pct } from '../engine/format';
import { MONTHS, getScenario } from '../engine/scenarios';
import type { CostBreakdown, Feedback, PeriodResult, SimConfig } from '../engine/types';
import { Meter, SpeakButton } from './ui';

const LEVEL_LABEL: Record<Feedback['level'], string> = {
  critico: 'Crítico',
  alerta: 'Alerta',
  logro: 'Logro',
  info: 'Sugerencia',
};

export function FeedbackList({ items, prefix }: { items: Feedback[]; prefix: string }) {
  if (items.length === 0) return <p className="muted">Sin observaciones para este mes.</p>;
  return (
    <ul className="feedback-list">
      {items.map((f) => (
        <li key={f.id} className={`feedback level-${f.level}`}>
          <div className="feedback-head">
            <span className={`badge badge-${f.level}`}>{LEVEL_LABEL[f.level]}</span>
            <span className="badge">{MODULE_INFO[f.module].short}</span>
            <SpeakButton text={`${f.title}. ${f.message}`} id={`${prefix}-${f.id}`} />
          </div>
          <h4>{f.title}</h4>
          <p>{f.message}</p>
          {f.concept ? (
            <p className="concept">
              Concepto clave: <strong>{f.concept}</strong>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ResultsPanel({ result, prev, config }: { result: PeriodResult | null; prev?: PeriodResult; config: SimConfig }) {
  if (!result) {
    return (
      <section className="card">
        <h2>Resultados del mes</h2>
        <p className="muted">Aquí verás el estado de resultados, la operación y la retroalimentación después de ejecutar el primer mes.</p>
      </section>
    );
  }
  const s = getScenario(config.scenarioId);
  const feedback = analyzePeriod(result, s, config, prev);
  const r = result;
  const costRows = (Object.keys(COST_LABELS) as Array<keyof CostBreakdown>).filter((k) => k !== 'cogs' && r.costs[k] !== 0);

  return (
    <div className="results">
      <section className="card">
        <div className="row between wrap">
          <div>
            <p className="eyebrow">
              Mes {r.period} · {MONTHS[r.month]}
            </p>
            <h2>Resultados del mes</h2>
          </div>
          <SpeakButton text={periodSpeech(r, s, feedback)} id={`resumen-${r.period}`} label="Escuchar resumen" />
        </div>
        <div className="score-row">
          <div className="score-big" aria-label={`Puntaje del mes ${r.score.total} de 100`}>
            <span>{Math.round(r.score.total)}</span>
            <small>/ 100</small>
          </div>
          <div className="score-meters">
            <Meter label="Finanzas" value={r.score.financial} max={40} />
            <Meter label="Clientes" value={r.score.customer} max={30} />
            <Meter label="Procesos" value={r.score.process} max={30} />
          </div>
        </div>
      </section>

      <section className="card" aria-labelledby="fb-title">
        <h3 id="fb-title">Retroalimentación</h3>
        <FeedbackList items={feedback} prefix={`fb-${r.period}`} />
      </section>

      <div className="grid-3">
        <section className="card">
          <h3>Estado de resultados</h3>
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">Ingresos por ventas</th>
                <td>{cop(r.revenue)}</td>
              </tr>
              <tr>
                <th scope="row">(−) Costo de ventas</th>
                <td>{cop(r.costs.cogs)}</td>
              </tr>
              <tr className="subtotal">
                <th scope="row">Utilidad bruta ({pct(r.kpis.grossMargin)})</th>
                <td>{cop(r.grossProfit)}</td>
              </tr>
              {costRows.map((k) => (
                <tr key={k}>
                  <th scope="row">(−) {COST_LABELS[k]}</th>
                  <td>{cop(r.costs[k])}</td>
                </tr>
              ))}
              <tr className="subtotal">
                <th scope="row">Utilidad antes de impuestos</th>
                <td>{cop(r.ebt)}</td>
              </tr>
              <tr>
                <th scope="row">(−) Impuesto de renta (35 %)</th>
                <td>{cop(r.tax)}</td>
              </tr>
              <tr className={`total ${r.netIncome < 0 ? 'bad-text' : 'good-text'}`}>
                <th scope="row">Utilidad neta ({pct(r.kpis.netMargin)})</th>
                <td>{cop(r.netIncome)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>Operación (ERP)</h3>
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">Demanda</th>
                <td>
                  {num(r.demandUnits)} {s.unitName}
                </td>
              </tr>
              <tr>
                <th scope="row">Vendidas</th>
                <td>{num(r.unitsSold)}</td>
              </tr>
              <tr>
                <th scope="row">Nivel de servicio</th>
                <td className={r.fillRate < 0.95 ? 'bad-text' : ''}>{pct(r.fillRate)}</td>
              </tr>
              <tr>
                <th scope="row">Compradas al proveedor local</th>
                <td>
                  {num(r.unitsPurchasedLocal)}
                  {r.autoReorderUnits > 0 ? ` (${num(r.autoReorderUnits)} automáticas)` : ''}
                </td>
              </tr>
              {r.unitsPurchasedImport > 0 ? (
                <tr>
                  <th scope="row">Importación en tránsito</th>
                  <td>{num(r.unitsPurchasedImport)}</td>
                </tr>
              ) : null}
              {r.arrivedUnits > 0 ? (
                <tr>
                  <th scope="row">Importación recibida</th>
                  <td>{num(r.arrivedUnits)}</td>
                </tr>
              ) : null}
              {r.delayedUnits > 0 ? (
                <tr>
                  <th scope="row">Importación retrasada</th>
                  <td className="bad-text">{num(r.delayedUnits)}</td>
                </tr>
              ) : null}
              {r.rejectedUnits > 0 ? (
                <tr>
                  <th scope="row">Compras rechazadas por falta de fondos</th>
                  <td className="bad-text">{num(r.rejectedUnits)}</td>
                </tr>
              ) : null}
              <tr>
                <th scope="row">Inventario final</th>
                <td>
                  {num(r.endInventory)} ({cop(r.inventoryValue)})
                </td>
              </tr>
              <tr>
                <th scope="row">Días de inventario</th>
                <td>{r.kpis.inventoryDays === null ? '—' : num(r.kpis.inventoryDays)}</td>
              </tr>
              <tr>
                <th scope="row">TRM del mes</th>
                <td>{num(r.trm)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>Clientes y canal digital</h3>
          <table className="table">
            <tbody>
              <tr>
                <th scope="row">Visitas orgánicas</th>
                <td>{num(r.organicVisits)}</td>
              </tr>
              <tr>
                <th scope="row">Clics Meta / TikTok</th>
                <td>
                  {num(r.metaClicks)} / {num(r.tiktokClicks)}
                </td>
              </tr>
              <tr>
                <th scope="row">Tasa de conversión</th>
                <td>{pct(r.conversionRate, 2)}</td>
              </tr>
              <tr>
                <th scope="row">Pedidos nuevos / recompra</th>
                <td>
                  {num(r.newOrders)} / {num(r.repeatOrders)}
                </td>
              </tr>
              <tr>
                <th scope="row">ROAS Meta · TikTok</th>
                <td>
                  {r.kpis.roasMeta === null ? '—' : dec(r.kpis.roasMeta)} · {r.kpis.roasTiktok === null ? '—' : dec(r.kpis.roasTiktok)}
                </td>
              </tr>
              <tr>
                <th scope="row">ROAS de equilibrio</th>
                <td>{r.kpis.breakEvenRoas === null ? '—' : dec(r.kpis.breakEvenRoas)}</td>
              </tr>
              <tr>
                <th scope="row">CAC por pauta</th>
                <td>{r.kpis.cac === null ? '—' : cop(r.kpis.cac)}</td>
              </tr>
              <tr>
                <th scope="row">Capacidad de atención</th>
                <td className={r.serviceRatio < 1 ? 'bad-text' : ''}>
                  {num(r.serviceCapacity)} pedidos ({pct(Math.min(r.serviceRatio, 9.99), 0)})
                </td>
              </tr>
              <tr>
                <th scope="row">Clientes: nuevos / perdidos</th>
                <td>
                  +{num(r.newCustomers)} / −{num(r.churnedCustomers)}
                </td>
              </tr>
              <tr>
                <th scope="row">Clientes activos</th>
                <td>{num(r.customers)}</td>
              </tr>
              <tr>
                <th scope="row">Satisfacción</th>
                <td>{num(r.satisfaction)} / 100</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
